import type {
  FollowThroughReason,
  PromiseFollowThroughResolution,
  RecordOwner,
} from "@/lib/promise-crm/types";

const FOLLOW_THROUGH_RESOLUTION_PREFIX = "__followthrough::";

function normalizeResolver(value: unknown): RecordOwner {
  if (value === "Dez" || value === "Simon" || value === "Unassigned") {
    return value;
  }

  return "Unassigned";
}

function normalizeResolutionReason(value: unknown): FollowThroughReason | undefined {
  if (
    value === "approved-next-step" ||
    value === "deferred-work" ||
    value === "diagnostic-recap" ||
    value === "review-request" ||
    value === "maintenance-reminder" ||
    value === "open-follow-through"
  ) {
    return value;
  }

  return undefined;
}

export function normalizeFollowThroughResolution(
  value?: PromiseFollowThroughResolution | null,
): PromiseFollowThroughResolution | undefined {
  if (!value?.resolvedAt || !value?.action) return undefined;

  return {
    resolvedAt: value.resolvedAt,
    resolvedBy: normalizeResolver(value.resolvedBy),
    action: value.action,
    reason: normalizeResolutionReason(value.reason),
    summary: value.summary?.trim() || undefined,
  };
}

export function normalizeFollowThroughResolutionHistory(
  value?: PromiseFollowThroughResolution[] | null,
) {
  if (!Array.isArray(value)) return [];

  return value
    .map((entry) => normalizeFollowThroughResolution(entry))
    .filter((entry): entry is PromiseFollowThroughResolution => entry !== undefined);
}

export function getLatestFollowThroughResolution(
  history?: PromiseFollowThroughResolution[] | null,
) {
  const normalized = normalizeFollowThroughResolutionHistory(history);
  return normalized.at(-1);
}

export function mergeFollowThroughResolutionHistory(
  current?: PromiseFollowThroughResolution[] | null,
  update?: PromiseFollowThroughResolution | null,
) {
  const base = normalizeFollowThroughResolutionHistory(current);

  if (update === undefined || update === null) {
    return base;
  }

  const normalizedUpdate = normalizeFollowThroughResolution(update);
  if (!normalizedUpdate) return base;

  if (!normalizedUpdate.reason) {
    return [...base, normalizedUpdate];
  }

  return [
    ...base.filter((entry) => entry.reason !== normalizedUpdate.reason),
    normalizedUpdate,
  ];
}

export function encodeFollowThroughResolutionHistory(
  value?: PromiseFollowThroughResolution[] | null,
) {
  const normalized = normalizeFollowThroughResolutionHistory(value);
  if (normalized.length === 0) return null;
  return `${FOLLOW_THROUGH_RESOLUTION_PREFIX}${JSON.stringify(normalized)}`;
}

function normalizeFollowThroughResolutionPayload(
  value: unknown,
): PromiseFollowThroughResolution[] {
  if (Array.isArray(value)) {
    return normalizeFollowThroughResolutionHistory(
      value as PromiseFollowThroughResolution[],
    );
  }

  if (value && typeof value === "object") {
    const normalized = normalizeFollowThroughResolution(
      value as PromiseFollowThroughResolution,
    );
    return normalized ? [normalized] : [];
  }

  return [];
}

export function extractFollowThroughResolution(notes: string[]) {
  let followThroughHistory: PromiseFollowThroughResolution[] = [];
  const visibleNotes: string[] = [];

  for (const note of notes) {
    if (note.startsWith(FOLLOW_THROUGH_RESOLUTION_PREFIX)) {
      try {
        const parsed = JSON.parse(note.slice(FOLLOW_THROUGH_RESOLUTION_PREFIX.length));
        followThroughHistory = normalizeFollowThroughResolutionPayload(parsed);
      } catch {
        // Ignore malformed hidden notes.
      }
      continue;
    }

    visibleNotes.push(note);
  }

  return {
    followThroughHistory,
    followThroughResolution: getLatestFollowThroughResolution(followThroughHistory),
    visibleNotes,
  };
}

export function mergePromiseNotesWithFollowThroughResolution(
  visibleNotes: string[],
  followThroughHistory?: PromiseFollowThroughResolution[] | null,
) {
  const cleanedNotes = visibleNotes.filter(
    (note) => !note.startsWith(FOLLOW_THROUGH_RESOLUTION_PREFIX),
  );
  const encoded = encodeFollowThroughResolutionHistory(followThroughHistory);

  return encoded ? [...cleanedNotes, encoded] : cleanedNotes;
}
