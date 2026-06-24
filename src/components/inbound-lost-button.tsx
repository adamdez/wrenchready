"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { XCircle } from "lucide-react";

const LOST_REASONS = [
  "Chose a competitor",
  "No response / ghosted",
  "Not qualified",
  "Price too high",
  "Bad fit / out of area",
  "Spam / not a real lead",
  "Other",
];

/**
 * Marks an inbound lead lost ("closed without a quote/job") right from the board card.
 * Sets qualificationStatus to "disqualified" so the lead drops off the New Requests
 * column, and records the reason as a note (noteToAdd) — no new DB column. Reuses the
 * existing inbound PATCH endpoint, which preserves every other field.
 */
export function InboundLostButton({ inboundId }: { inboundId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState(LOST_REASONS[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function markLost() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/al/wrenchready/inbound/${inboundId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          qualificationStatus: "disqualified",
          noteToAdd: `Lost lead — ${reason}`,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || "Unable to update the lead.");
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to update the lead.");
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:text-red-200"
      >
        <XCircle className="h-4 w-4" />
        Mark lost
      </button>
    );
  }

  return (
    <div className="w-full rounded-xl border border-red-500/30 bg-red-500/5 p-3">
      <p className="text-xs font-semibold text-foreground">Mark this lead lost?</p>
      <select
        value={reason}
        onChange={(event) => setReason(event.target.value)}
        className="mt-2 w-full rounded-lg border border-border bg-background/70 px-2.5 py-1.5 text-sm text-foreground"
      >
        {LOST_REASONS.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      {error ? <p className="mt-2 text-xs text-red-300">{error}</p> : null}
      <div className="mt-3 flex justify-end gap-2">
        <button
          type="button"
          onClick={() => setOpen(false)}
          disabled={loading}
          className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={markLost}
          disabled={loading}
          className="rounded-lg bg-red-500/90 px-2.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-red-500 disabled:opacity-60"
        >
          {loading ? "Saving…" : "Mark lost"}
        </button>
      </div>
    </div>
  );
}
