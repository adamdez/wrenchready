import type { PromiseCommercialOutcome } from "@/lib/promise-crm/types";

const COMMERCIAL_OUTCOME_PREFIX = "__outcome::";

function sanitizeNumber(value: unknown) {
  if (typeof value !== "number" || Number.isNaN(value)) return undefined;
  return value;
}

export function normalizeCommercialOutcome(
  value?: PromiseCommercialOutcome | null,
): PromiseCommercialOutcome | undefined {
  if (!value) return undefined;

  const status = value.outcomeStatus || "unknown";
  const normalized: PromiseCommercialOutcome = {
    outcomeStatus: status,
    convertedService: value.convertedService?.trim() || undefined,
    deferredValueAmount: sanitizeNumber(value.deferredValueAmount),
    outcomeSummary: value.outcomeSummary?.trim() || undefined,
  };

  const meaningful =
    normalized.outcomeStatus !== "unknown" ||
    !!normalized.convertedService ||
    normalized.deferredValueAmount !== undefined ||
    !!normalized.outcomeSummary;

  return meaningful ? normalized : undefined;
}

export function encodeCommercialOutcome(value?: PromiseCommercialOutcome) {
  const normalized = normalizeCommercialOutcome(value);
  if (!normalized) return null;
  return `${COMMERCIAL_OUTCOME_PREFIX}${JSON.stringify(normalized)}`;
}

export function extractCommercialOutcome(notes: string[]) {
  let commercialOutcome: PromiseCommercialOutcome | undefined;
  const visibleNotes: string[] = [];

  for (const note of notes) {
    if (note.startsWith(COMMERCIAL_OUTCOME_PREFIX)) {
      try {
        const parsed = JSON.parse(note.slice(COMMERCIAL_OUTCOME_PREFIX.length));
        commercialOutcome = normalizeCommercialOutcome(parsed);
      } catch {
        // Ignore malformed hidden notes.
      }
      continue;
    }

    visibleNotes.push(note);
  }

  return { commercialOutcome, visibleNotes };
}

export function mergePromiseNotesWithCommercialOutcome(
  visibleNotes: string[],
  commercialOutcome?: PromiseCommercialOutcome | null,
) {
  const cleanedNotes = visibleNotes.filter((note) => !note.startsWith(COMMERCIAL_OUTCOME_PREFIX));
  const encoded = encodeCommercialOutcome(commercialOutcome || undefined);

  return encoded ? [...cleanedNotes, encoded] : cleanedNotes;
}

export function isConvertedWork(outcome?: PromiseCommercialOutcome) {
  if (!outcome) return false;
  return (
    outcome.outcomeStatus === "approved-repair" ||
    outcome.outcomeStatus === "completed-maintenance"
  );
}

export function isDeferredWork(outcome?: PromiseCommercialOutcome) {
  return outcome?.outcomeStatus === "deferred-work";
}

export function isDeclinedWork(outcome?: PromiseCommercialOutcome) {
  return outcome?.outcomeStatus === "declined";
}

export function isResolvedOutcome(outcome?: PromiseCommercialOutcome) {
  return !!outcome && outcome.outcomeStatus !== "unknown";
}
