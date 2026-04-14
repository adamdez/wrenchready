import type {
  PromiseOutboundEvent,
  PromiseOutboundEventStatus,
  PromiseRecord,
} from "@/lib/promise-crm/types";

const OUTBOUND_HISTORY_PREFIX = "__outbound_history::";

function normalizeOutboundStatus(value: unknown): PromiseOutboundEventStatus | undefined {
  return value === "delivered" ||
    value === "responded" ||
    value === "converted" ||
    value === "failed"
    ? value
    : undefined;
}

function normalizeOutboundEvent(value: unknown): PromiseOutboundEvent | undefined {
  if (!value || typeof value !== "object") return undefined;

  const candidate = value as Record<string, unknown>;
  const status = normalizeOutboundStatus(candidate.status);
  const channelType =
    candidate.channelType === "review-ask" ||
    candidate.channelType === "maintenance-reminder" ||
    candidate.channelType === "closeout-recap"
      ? candidate.channelType
      : undefined;
  const channel =
    candidate.channel === "email" || candidate.channel === "text"
      ? candidate.channel
      : undefined;
  const recordedAt =
    typeof candidate.recordedAt === "string" ? candidate.recordedAt.trim() : "";
  const headline =
    typeof candidate.headline === "string" ? candidate.headline.trim() : "";
  const id = typeof candidate.id === "string" ? candidate.id.trim() : "";
  const actor =
    candidate.actor === "Dez" ||
    candidate.actor === "Simon" ||
    candidate.actor === "Unassigned" ||
    candidate.actor === "System"
      ? candidate.actor
      : "System";

  if (!status || !channelType || !channel || !recordedAt || !headline || !id) {
    return undefined;
  }

  return {
    id,
    recordedAt,
    channelType,
    status,
    channel,
    headline,
    actor,
    summary: typeof candidate.summary === "string" ? candidate.summary.trim() || undefined : undefined,
    conversionType:
      candidate.conversionType === "review-left" ||
      candidate.conversionType === "next-visit-requested" ||
      candidate.conversionType === "scheduled-next-visit" ||
      candidate.conversionType === "other"
        ? candidate.conversionType
        : undefined,
  };
}

function normalizeOutboundHistory(value: unknown): PromiseOutboundEvent[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((entry) => normalizeOutboundEvent(entry))
    .filter((entry): entry is PromiseOutboundEvent => entry !== undefined)
    .sort((a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime());
}

export function extractPromiseOutboundHistory(notes: string[]) {
  let outboundHistory: PromiseOutboundEvent[] = [];
  const visibleNotes: string[] = [];

  for (const note of notes) {
    if (note.startsWith(OUTBOUND_HISTORY_PREFIX)) {
      try {
        outboundHistory = normalizeOutboundHistory(
          JSON.parse(note.slice(OUTBOUND_HISTORY_PREFIX.length)),
        );
      } catch {
        // Ignore malformed hidden notes.
      }
      continue;
    }

    visibleNotes.push(note);
  }

  return { outboundHistory, visibleNotes };
}

export function mergePromiseNotesWithOutboundHistory(
  visibleNotes: string[],
  outboundHistory?: PromiseOutboundEvent[] | null,
) {
  const cleaned = visibleNotes.filter((note) => !note.startsWith(OUTBOUND_HISTORY_PREFIX));
  const normalized = normalizeOutboundHistory(outboundHistory || []);
  if (normalized.length === 0) return cleaned;
  return [...cleaned, `${OUTBOUND_HISTORY_PREFIX}${JSON.stringify(normalized)}`];
}

export function appendOutboundEvent(
  current: PromiseRecord["outboundHistory"],
  event?: PromiseOutboundEvent | null,
) {
  if (!event) return normalizeOutboundHistory(current || []);
  return normalizeOutboundHistory([...(current || []), event]);
}
