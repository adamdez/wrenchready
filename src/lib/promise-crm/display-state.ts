import { resolvePromiseState } from "@/lib/promise-crm/promise-state";

// Single source of truth now lives in promise-state.ts. Re-exported here so existing
// importers of display-state keep working unchanged.
export { isQuoteScheduleReview } from "@/lib/promise-crm/promise-state";

export function promiseBoardStatusLabel(
  record: Parameters<typeof resolvePromiseState>[0],
) {
  return resolvePromiseState(record).label;
}
