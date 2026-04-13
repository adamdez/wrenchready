"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CheckCircle2, LoaderCircle } from "lucide-react";
import type { FollowThroughTask } from "@/lib/promise-crm/types";

type FollowThroughActionFormProps = {
  task: FollowThroughTask;
};

type ResolutionAction =
  | "scheduled-next-step"
  | "recap-sent"
  | "parked"
  | "review-sent"
  | "review-complete"
  | "reminder-scheduled";

function actionLabel(value: ResolutionAction) {
  if (value === "scheduled-next-step") return "Scheduled next step";
  if (value === "recap-sent") return "Recap sent";
  if (value === "review-sent") return "Review sent";
  if (value === "review-complete") return "Review complete";
  if (value === "reminder-scheduled") return "Reminder scheduled";
  return "Parked for later";
}

function defaultSummary(task: FollowThroughTask, action: ResolutionAction) {
  if (action === "scheduled-next-step") {
    return `Closed follow-through: scheduled next step for ${task.convertedService || task.serviceScope}.`;
  }
  if (action === "recap-sent") {
    return `Closed follow-through: sent recap and next-step summary for ${task.serviceScope}.`;
  }
  if (action === "review-sent") {
    return `Closed follow-through: review request sent for ${task.serviceScope}.`;
  }
  if (action === "review-complete") {
    return `Closed follow-through: customer review flow completed for ${task.serviceScope}.`;
  }
  if (action === "reminder-scheduled") {
    return `Closed follow-through: maintenance reminder scheduled for ${task.convertedService || task.serviceScope}.`;
  }
  return `Closed follow-through: parked until customer is ready to revisit ${task.convertedService || task.serviceScope}.`;
}

function getAvailableActions(task: FollowThroughTask): ResolutionAction[] {
  if (task.reason === "review-request") {
    return ["review-sent", "review-complete", "parked"];
  }

  if (task.reason === "maintenance-reminder") {
    return ["reminder-scheduled", "parked"];
  }

  return ["scheduled-next-step", "recap-sent", "parked"];
}

export function FollowThroughActionForm({ task }: FollowThroughActionFormProps) {
  const router = useRouter();
  const [summary, setSummary] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  async function resolve(action: ResolutionAction) {
    setStatus("saving");
    setMessage("");

    try {
      const noteToAdd = summary.trim() || defaultSummary(task, action);
      const response = await fetch(`/api/al/wrenchready/promises/${task.promiseId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          noteToAdd,
          followThroughDueAt: null,
          status: task.reason === "approved-next-step" ? "completed" : undefined,
          closeout:
            action === "review-sent"
              ? {
                  reviewRequest: {
                    status: "sent",
                    sentAt: new Date().toISOString(),
                    summary: noteToAdd,
                  },
                }
              : action === "review-complete"
                ? {
                    reviewRequest: {
                      status: "completed",
                      sentAt: new Date().toISOString(),
                      summary: noteToAdd,
                    },
                  }
                : action === "reminder-scheduled"
                  ? {
                      maintenanceReminder: {
                        status: "scheduled",
                        summary: noteToAdd,
                      },
                    }
                  : undefined,
          followThroughResolution: {
            resolvedBy: task.owner,
            action:
              action === "review-sent" || action === "review-complete"
                ? "recap-sent"
                : action === "reminder-scheduled"
                  ? "scheduled-next-step"
                  : action,
            reason: task.reason,
            summary: noteToAdd,
          },
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.error || "Could not resolve follow-through item.");
      }

      setStatus("success");
      setMessage(`${actionLabel(action)} recorded.`);
      setSummary("");
      router.refresh();
    } catch (error) {
      setStatus("error");
      setMessage(
        error instanceof Error ? error.message : "Could not resolve follow-through item.",
      );
    }
  }

  return (
    <div className="mt-4 rounded-xl border border-border/70 bg-card/50 p-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
        Resolve follow-through
      </p>
      <textarea
        className="form-textarea mt-3"
        onChange={(event) => setSummary(event.target.value)}
        placeholder="Optional close-the-loop note"
        value={summary}
      />

      {message ? (
        <div
          className={`mt-3 rounded-2xl border px-3 py-2 text-xs ${
            status === "success"
              ? "border-[--wr-teal]/20 bg-[--wr-teal]/10 text-[--wr-teal-soft]"
              : "border-red-500/20 bg-red-500/10 text-red-200"
          }`}
        >
          {message}
        </div>
      ) : null}

      <div className="mt-3 flex flex-wrap gap-2">
        {getAvailableActions(task).map((action) => (
          <button
            key={action}
            className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-2 text-xs font-medium text-foreground transition-all hover:bg-secondary disabled:opacity-50"
            disabled={status === "saving"}
            onClick={() => void resolve(action)}
            type="button"
          >
            {status === "saving" ? (
              <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <CheckCircle2 className="h-3.5 w-3.5" />
            )}
            {actionLabel(action)}
          </button>
        ))}
      </div>
    </div>
  );
}
