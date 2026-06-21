"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Archive, ArchiveRestore } from "lucide-react";

export function PromiseArchiveButton({
  promiseId,
  archived,
}: {
  promiseId: string;
  archived: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [isArchived, setIsArchived] = useState(archived);
  const [error, setError] = useState("");

  async function toggle() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/al/wrenchready/promises/${promiseId}/archive`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ archived: !isArchived }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || "Unable to update the archive state.");
      }
      setIsArchived(!isArchived);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to update the archive state.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="inline-flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={toggle}
        disabled={loading}
        className={
          isArchived
            ? "inline-flex h-9 items-center gap-2 rounded-full border border-[var(--wr-teal)]/30 bg-[var(--wr-teal)]/10 px-4 text-xs font-semibold text-[var(--wr-teal-soft)] transition-colors hover:bg-[var(--wr-teal)]/20 disabled:opacity-60"
            : "inline-flex h-9 items-center gap-2 rounded-full border border-border bg-card/60 px-4 text-xs font-semibold text-muted-foreground transition-colors hover:bg-[var(--wr-surface-bright)] hover:text-foreground disabled:opacity-60"
        }
      >
        {isArchived ? <ArchiveRestore className="h-3.5 w-3.5" /> : <Archive className="h-3.5 w-3.5" />}
        {loading ? "Saving…" : isArchived ? "Restore to active" : "Archive (junk / test)"}
      </button>
      {error ? <span className="text-xs text-[var(--wr-red)]">{error}</span> : null}
    </div>
  );
}
