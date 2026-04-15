"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { PromiseCloseout, RecordOwner } from "@/lib/promise-crm/types";

type CloseoutQualityActionFormProps = {
  promiseId: string;
  owner: RecordOwner;
  closeout?: PromiseCloseout;
};

export function CloseoutQualityActionForm({
  promiseId,
  owner,
  closeout,
}: CloseoutQualityActionFormProps) {
  const router = useRouter();
  const [workPerformedSummary, setWorkPerformedSummary] = useState(
    closeout?.workPerformedSummary || "",
  );
  const [customerConditionSummary, setCustomerConditionSummary] = useState(
    closeout?.customerConditionSummary || "",
  );
  const [reviewStatus, setReviewStatus] = useState<"not-ready" | "ready" | "sent" | "completed">(
    closeout?.reviewRequest?.status || "ready",
  );
  const [reminderStatus, setReminderStatus] = useState<"not-seeded" | "seeded" | "scheduled">(
    closeout?.maintenanceReminder?.status || "seeded",
  );
  const [nextVisitService, setNextVisitService] = useState(
    closeout?.nextProbableVisit?.service || "",
  );
  const [feedback, setFeedback] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit() {
    setSaving(true);
    setFeedback("");

    try {
      const response = await fetch(`/api/al/wrenchready/promises/${promiseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          closeout: {
            workPerformedSummary: workPerformedSummary.trim() || undefined,
            customerConditionSummary: customerConditionSummary.trim() || undefined,
            reviewRequest: {
              ...closeout?.reviewRequest,
              status: reviewStatus,
            },
            maintenanceReminder: {
              ...closeout?.maintenanceReminder,
              status: reminderStatus,
              service: closeout?.maintenanceReminder?.service || nextVisitService.trim() || undefined,
            },
            nextProbableVisit: {
              ...closeout?.nextProbableVisit,
              service: nextVisitService.trim() || undefined,
              reason: closeout?.nextProbableVisit?.reason || "Keep the next visit visible from the recapture queue.",
            },
          },
          noteToAdd: `Closeout quality improved from recapture queue by ${owner}.`,
        }),
      });

      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.error || "Unable to update closeout quality.");
      }

      setFeedback("Saved.");
      router.refresh();
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Unable to update closeout quality.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-4 rounded-2xl border border-border bg-card/50 p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
        Queue action
      </p>
      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <label className="space-y-2">
          <span className="text-xs font-medium text-muted-foreground">Work performed summary</span>
          <textarea className="form-textarea" onChange={(e) => setWorkPerformedSummary(e.target.value)} value={workPerformedSummary} />
        </label>
        <label className="space-y-2">
          <span className="text-xs font-medium text-muted-foreground">Customer condition summary</span>
          <textarea className="form-textarea" onChange={(e) => setCustomerConditionSummary(e.target.value)} value={customerConditionSummary} />
        </label>
        <label className="space-y-2">
          <span className="text-xs font-medium text-muted-foreground">Review status</span>
          <select className="form-input" onChange={(e) => setReviewStatus(e.target.value as typeof reviewStatus)} value={reviewStatus}>
            <option value="not-ready">Not ready</option>
            <option value="ready">Ready</option>
            <option value="sent">Sent</option>
            <option value="completed">Completed</option>
          </select>
        </label>
        <label className="space-y-2">
          <span className="text-xs font-medium text-muted-foreground">Reminder status</span>
          <select className="form-input" onChange={(e) => setReminderStatus(e.target.value as typeof reminderStatus)} value={reminderStatus}>
            <option value="not-seeded">Not seeded</option>
            <option value="seeded">Seeded</option>
            <option value="scheduled">Scheduled</option>
          </select>
        </label>
        <label className="space-y-2 lg:col-span-2">
          <span className="text-xs font-medium text-muted-foreground">Next probable visit service</span>
          <input className="form-input" onChange={(e) => setNextVisitService(e.target.value)} value={nextVisitService} />
        </label>
      </div>
      {feedback ? <p className="mt-3 text-sm text-muted-foreground">{feedback}</p> : null}
      <button
        className="mt-4 inline-flex items-center justify-center rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-all hover:brightness-110 disabled:opacity-60"
        disabled={saving}
        onClick={submit}
        type="button"
      >
        {saving ? "Saving..." : "Save closeout quality"}
      </button>
    </div>
  );
}
