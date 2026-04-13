"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { PromiseCustomerApproval } from "@/lib/promise-crm/types";

type CustomerPromiseApprovalProps = {
  token: string;
  approval: PromiseCustomerApproval;
};

export function CustomerPromiseApproval({
  token,
  approval,
}: CustomerPromiseApprovalProps) {
  const router = useRouter();
  const [decision, setDecision] = useState<"approved" | "declined">("approved");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "success" | "error">("idle");
  const [feedback, setFeedback] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("saving");
    setFeedback("");

    try {
      const response = await fetch(`/api/wrenchready/status/${token}/approval`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          decision,
          customerMessage: message.trim() || undefined,
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.error || "Unable to send your response.");
      }

      setStatus("success");
      setFeedback(
        decision === "approved"
          ? "Thanks. WrenchReady has your approval and will follow up with the next step."
          : "Thanks. WrenchReady recorded your response and will follow up clearly.",
      );
      setMessage("");
      router.refresh();
    } catch (error) {
      setStatus("error");
      setFeedback(
        error instanceof Error ? error.message : "Unable to send your response.",
      );
    }
  }

  if (approval.status !== "awaiting-approval") {
    return null;
  }

  return (
    <div className="rounded-3xl border border-border bg-card/60 p-6">
      <h2 className="text-2xl font-bold text-foreground">Approve this next step</h2>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
        Review the recommendation below and tell WrenchReady whether you want to move forward.
      </p>

      {feedback ? (
        <div
          className={`mt-4 rounded-2xl border px-4 py-3 text-sm ${
            status === "success"
              ? "border-[--wr-teal]/20 bg-[--wr-teal]/10 text-[--wr-teal-soft]"
              : "border-red-500/20 bg-red-500/10 text-red-200"
          }`}
        >
          {feedback}
        </div>
      ) : null}

      <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
        <div className="grid gap-3 sm:grid-cols-2">
          <button
            className={`rounded-2xl border px-4 py-3 text-left transition-all ${
              decision === "approved"
                ? "border-primary/40 bg-primary/10 text-foreground"
                : "border-border bg-background/60 text-muted-foreground"
            }`}
            onClick={() => setDecision("approved")}
            type="button"
          >
            <span className="block text-sm font-semibold">Approve</span>
            <span className="mt-1 block text-xs">
              Move forward with the recommended work.
            </span>
          </button>

          <button
            className={`rounded-2xl border px-4 py-3 text-left transition-all ${
              decision === "declined"
                ? "border-primary/40 bg-primary/10 text-foreground"
                : "border-border bg-background/60 text-muted-foreground"
            }`}
            onClick={() => setDecision("declined")}
            type="button"
          >
            <span className="block text-sm font-semibold">Not now</span>
            <span className="mt-1 block text-xs">
              Decline for now and keep the recap on file.
            </span>
          </button>
        </div>

        <label className="block space-y-2">
          <span className="text-xs font-semibold uppercase tracking-widest text-primary">
            Optional note
          </span>
          <textarea
            className="form-textarea"
            onChange={(event) => setMessage(event.target.value)}
            placeholder="Add anything you want WrenchReady to know."
            value={message}
          />
        </label>

        <button
          className="inline-flex items-center justify-center rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-transform hover:-translate-y-0.5 disabled:opacity-70"
          disabled={status === "saving"}
          type="submit"
        >
          {status === "saving"
            ? "Sending..."
            : decision === "approved"
              ? "Approve next step"
              : "Send response"}
        </button>
      </form>
    </div>
  );
}
