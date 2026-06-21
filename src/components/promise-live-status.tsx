"use client";

import { useEffect, useMemo, useState } from "react";
import { RefreshCw, Wifi, WifiOff } from "lucide-react";

type PromiseLiveStatusProps = {
  promiseId: string;
  loadedUpdatedAt: string;
};

type PollState = "checking" | "current" | "stale" | "offline";

function formatLoadedTime(value: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return value;

  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  }).format(date);
}

export function PromiseLiveStatus({
  promiseId,
  loadedUpdatedAt,
}: PromiseLiveStatusProps) {
  const [state, setState] = useState<PollState>("checking");
  const [latestUpdatedAt, setLatestUpdatedAt] = useState(loadedUpdatedAt);
  const [lastCheckedAt, setLastCheckedAt] = useState<string>();

  useEffect(() => {
    let cancelled = false;

    async function checkForUpdates() {
      if (document.visibilityState === "hidden") return;

      try {
        const response = await fetch(`/api/al/wrenchready/promises/${promiseId}`, {
          cache: "no-store",
          credentials: "same-origin",
        });

        if (!response.ok) {
          if (!cancelled) setState("offline");
          return;
        }

        const body = await response.json() as {
          promise?: { updatedAt?: string };
        };
        const updatedAt = body.promise?.updatedAt;

        if (!updatedAt) {
          if (!cancelled) setState("offline");
          return;
        }

        if (!cancelled) {
          setLatestUpdatedAt(updatedAt);
          setLastCheckedAt(new Date().toISOString());
          setState(updatedAt === loadedUpdatedAt ? "current" : "stale");
        }
      } catch {
        if (!cancelled) setState("offline");
      }
    }

    checkForUpdates();
    const interval = window.setInterval(checkForUpdates, 20000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [loadedUpdatedAt, promiseId]);

  const toneClass = useMemo(() => {
    if (state === "stale") return "border-[var(--wr-gold)]/30 bg-[var(--wr-gold)]/10 text-[var(--wr-gold-soft)]";
    if (state === "offline") return "border-red-500/30 bg-red-500/10 text-red-100";
    return "border-[var(--wr-teal)]/25 bg-[var(--wr-teal)]/10 text-[var(--wr-teal-soft)]";
  }, [state]);

  return (
    <div className={`mt-3 rounded-xl border px-3 py-2 text-xs sm:text-sm ${toneClass}`}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-2">
          {state === "offline" ? (
            <WifiOff className="h-4 w-4 shrink-0" />
          ) : (
            <Wifi className="h-4 w-4 shrink-0" />
          )}
          <p className="min-w-0">
            {state === "stale"
              ? `Update available. Loaded ${formatLoadedTime(loadedUpdatedAt)}, latest ${formatLoadedTime(latestUpdatedAt)}.`
              : state === "offline"
                ? `Live check failed. Loaded ${formatLoadedTime(loadedUpdatedAt)}.`
                : `Live record current. Loaded ${formatLoadedTime(loadedUpdatedAt)}${lastCheckedAt ? `, checked ${formatLoadedTime(lastCheckedAt)}` : ""}.`}
          </p>
        </div>
        <button
          className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-current/25 px-2.5 text-xs font-semibold transition-colors hover:bg-background/30"
          onClick={() => window.location.reload()}
          type="button"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </button>
      </div>
    </div>
  );
}
