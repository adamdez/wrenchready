"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RotateCcw, XCircle } from "lucide-react";

const LOST_REASONS = [
  "Chose a competitor",
  "No response / ghosted",
  "Not qualified",
  "Price too high",
  "Bad fit / out of area",
  "Other",
];

/**
 * Marks a lead lost (closed without a quote/job) or reopens it.
 * Reuses the existing PATCH endpoint with a partial commercialOutcome update:
 *   lost   -> { outcomeStatus: "declined", outcomeSummary: reason }
 *   reopen -> { outcomeStatus: "unknown" }
 * updatePromiseRecord preserves all other fields, so nothing else is touched.
 */
export function PromiseLostControls({
  promiseId,
  lost,
}: {
  promiseId: string;
  lost: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState(LOST_REASONS[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(outcomeStatus: "declined" | "unknown", outcomeSummary?: string) {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/al/wrenchready/promises/${promiseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commercialOutcome: { outcomeStatus, outcomeSummary } }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || "Unable to update the lead.");
      }
      setOpen(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to update the lead.");
    } finally {
      setLoading(false);
    }
  }

  if (lost) {
    return (
      <button
        type="button"
        onClick={() => submit("unknown")}
        disabled={loading}
        className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background/70 px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:opacity-60"
      >
        <RotateCcw className="h-4 w-4" />
        {loading ? "Reopening…" : "Reopen lead"}
      </button>
    );
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background/70 px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-200"
      >
        <XCircle className="h-4 w-4" />
        Mark lost
      </button>
      {open ? (
        <div className="absolute right-0 z-20 mt-2 w-64 rounded-xl border border-border bg-card p-3 text-left shadow-lg">
          <p className="text-xs font-semibold text-foreground">Why was this lost?</p>
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
              className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => submit("declined", reason)}
              disabled={loading}
              className="rounded-lg bg-red-500/90 px-2.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-red-500 disabled:opacity-60"
            >
              {loading ? "Saving…" : "Mark lost"}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
