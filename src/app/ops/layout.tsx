import type { ReactNode } from "react";
import { OpsShell } from "@/components/ops-shell";
import { getOperatorTaskQueue, getPromiseBoardSnapshot } from "@/lib/promise-crm/server";

// Fetch the handful of live counts that make the sidebar a status board rather
// than a list of links. Guarded so a data hiccup degrades to a plain nav instead
// of breaking every /ops page.
async function getOpsNavCounts(): Promise<Record<string, number>> {
  try {
    const [board, tasks] = await Promise.all([
      getPromiseBoardSnapshot(),
      getOperatorTaskQueue(),
    ]);
    const metrics = board.metrics;
    return {
      "/ops/promises": metrics?.promisesWaiting ?? 0,
      "/ops/inbound": metrics?.newInbound ?? 0,
      "/ops/tomorrow": metrics?.tomorrowAtRisk ?? 0,
      "/ops/follow-through": metrics?.followThroughDue ?? 0,
      "/ops/jeff": tasks?.counts?.blocked ?? 0,
    };
  } catch {
    return {};
  }
}

export default async function OpsLayout({ children }: { children: ReactNode }) {
  const counts = await getOpsNavCounts();
  return <OpsShell counts={counts}>{children}</OpsShell>;
}
