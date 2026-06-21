import type { PromiseRecord } from "@/lib/promise-crm/types";

// Soft-archive markers. We ride the existing append-only note path instead of
// adding a new persisted status (which would require a DB CHECK-constraint
// migration). Archive appends ARCHIVE_NOTE; restore appends UNARCHIVE_NOTE.
// Whichever marker appears LAST wins, so archiving is fully reversible and
// nothing is ever deleted.
export const ARCHIVE_NOTE = "__archived__";
export const UNARCHIVE_NOTE = "__active__";

export function isPromiseArchived(promise: Pick<PromiseRecord, "notes">): boolean {
  let archived = false;
  for (const note of promise.notes) {
    const trimmed = note.trim();
    if (trimmed === ARCHIVE_NOTE) archived = true;
    else if (trimmed === UNARCHIVE_NOTE) archived = false;
  }
  return archived;
}

/** Notes with the internal archive markers stripped, for display. */
export function visiblePromiseNotes(notes: string[]): string[] {
  return notes.filter((note) => {
    const trimmed = note.trim();
    return trimmed !== ARCHIVE_NOTE && trimmed !== UNARCHIVE_NOTE;
  });
}

// Heuristic for obviously-test/pilot records, used by the bulk cleanup.
const TEST_PATTERN =
  /\b(test|tests|webhook|codex|audit|memo|demo|sample|example|placeholder|dummy|fixture|qa|lorem|asdf|tbd)\b/i;

export function isLikelyTestPromise(promise: PromiseRecord): boolean {
  // Match ONLY the customer name. Real records routinely have pilot-test words in
  // their notes/scope (e.g. "payment test lane"), so a broader match would wrongly
  // flag real customers. The customer name is the only reliable junk signal.
  return TEST_PATTERN.test(promise.customer.name);
}
