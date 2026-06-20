"use client";

import { useState } from "react";

type QuoteSendActionFormProps = {
  promiseId: string;
  alreadySent: boolean;
  hasBlockers: boolean;
};

export function QuoteSendActionForm({
  promiseId,
  alreadySent,
  hasBlockers,
}: QuoteSendActionFormProps) {
  const [feedback, setFeedback] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(alreadySent);

  async function sendQuote() {
    setLoading(true);
    setFeedback("");

    try {
      const response = await fetch(`/api/al/wrenchready/promises/${promiseId}/send-quote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.success) {
        throw new Error(data?.error || "Unable to send the quote.");
      }

      setSent(true);
      setFeedback(
        "Quote sent. It is now live on the customer status page — reload to refresh the badge.",
      );
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Unable to send the quote.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-4 rounded-2xl border border-border bg-card/50 p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
        Quote approval
      </p>
      <p className="mt-2 text-sm text-muted-foreground">
        Review the customer-facing quote, then approve and send it so the customer sees the real
        number on their status page and can approve and pay through secure checkout.
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          className="inline-flex items-center justify-center rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-all hover:brightness-110 disabled:opacity-60"
          disabled={loading || sent || hasBlockers}
          onClick={sendQuote}
          type="button"
        >
          {sent ? "Quote sent" : loading ? "Sending..." : "Approve & send quote"}
        </button>

        {hasBlockers && !sent ? (
          <span className="text-xs text-amber-200">Resolve the quote blockers first.</span>
        ) : null}
      </div>

      {feedback ? <p className="mt-3 text-sm text-muted-foreground">{feedback}</p> : null}
    </div>
  );
}
