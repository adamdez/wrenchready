import type {
  PromiseCloseout,
  PromiseProofAsset,
  PromiseProofCapture,
  PromiseNextProbableVisit,
  PromiseRecord,
  PromiseRecapItem,
} from "@/lib/promise-crm/types";
import { getGoogleReviewUrl } from "@/lib/review-destination";

const CLOSEOUT_PREFIX = "__closeout::";

function sanitizeNumber(value: unknown) {
  if (typeof value !== "number" || Number.isNaN(value)) return undefined;
  return value;
}

function normalizeRecapItem(value: unknown): PromiseRecapItem | undefined {
  if (!value || typeof value !== "object") return undefined;

  const candidate = value as Record<string, unknown>;
  const title = typeof candidate.title === "string" ? candidate.title.trim() : "";

  if (!title) return undefined;

  return {
    title,
    detail: typeof candidate.detail === "string" ? candidate.detail.trim() || undefined : undefined,
    estimatedAmount: sanitizeNumber(candidate.estimatedAmount),
  };
}

function normalizeRecapItems(value: unknown): PromiseRecapItem[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => normalizeRecapItem(entry))
    .filter((entry): entry is PromiseRecapItem => entry !== undefined);
}

function normalizeReviewRequest(value: unknown): PromiseCloseout["reviewRequest"] {
  if (!value || typeof value !== "object") return undefined;

  const candidate = value as Record<string, unknown>;
  const status =
    candidate.status === "ready" ||
    candidate.status === "sent" ||
    candidate.status === "completed"
      ? candidate.status
      : "not-ready";

  const normalized = {
    status,
    dueAt: typeof candidate.dueAt === "string" ? candidate.dueAt.trim() || undefined : undefined,
    sentAt: typeof candidate.sentAt === "string" ? candidate.sentAt.trim() || undefined : undefined,
    channel:
      candidate.channel === "email" || candidate.channel === "text"
        ? candidate.channel
        : undefined,
    summary: typeof candidate.summary === "string" ? candidate.summary.trim() || undefined : undefined,
    reviewUrl:
      typeof candidate.reviewUrl === "string"
        ? candidate.reviewUrl.trim() || undefined
        : getGoogleReviewUrl(),
  } as const;

  return normalized.status !== "not-ready" ||
    normalized.dueAt ||
    normalized.sentAt ||
    normalized.channel ||
    normalized.summary ||
    normalized.reviewUrl
    ? { ...normalized }
    : undefined;
}

function normalizeCustomerRecap(value: unknown): PromiseCloseout["customerRecap"] {
  if (!value || typeof value !== "object") return undefined;

  const candidate = value as Record<string, unknown>;
  const status =
    candidate.status === "ready" || candidate.status === "sent"
      ? candidate.status
      : "not-ready";

  const normalized = {
    status,
    sentAt: typeof candidate.sentAt === "string" ? candidate.sentAt.trim() || undefined : undefined,
    channel:
      candidate.channel === "email" || candidate.channel === "text"
        ? candidate.channel
        : undefined,
    summary: typeof candidate.summary === "string" ? candidate.summary.trim() || undefined : undefined,
  } as const;

  return normalized.status !== "not-ready" ||
    normalized.sentAt ||
    normalized.channel ||
    normalized.summary
    ? { ...normalized }
    : undefined;
}

function normalizeMaintenanceReminder(
  value: unknown,
): PromiseCloseout["maintenanceReminder"] {
  if (!value || typeof value !== "object") return undefined;

  const candidate = value as Record<string, unknown>;
  const service =
    typeof candidate.service === "string" ? candidate.service.trim() : "";

  const status =
    candidate.status === "seeded" || candidate.status === "scheduled"
      ? candidate.status
      : "not-seeded";

  const normalized = {
    status,
    service,
    dueLabel: typeof candidate.dueLabel === "string" ? candidate.dueLabel.trim() || undefined : undefined,
    dueAt: typeof candidate.dueAt === "string" ? candidate.dueAt.trim() || undefined : undefined,
    summary: typeof candidate.summary === "string" ? candidate.summary.trim() || undefined : undefined,
  } as const;

  return normalized.status !== "not-seeded" || normalized.service || normalized.dueLabel || normalized.dueAt || normalized.summary
    ? { ...normalized }
    : undefined;
}

function normalizeNextProbableVisit(
  value: unknown,
): PromiseNextProbableVisit | undefined {
  if (!value || typeof value !== "object") return undefined;

  const candidate = value as Record<string, unknown>;
  const service = typeof candidate.service === "string" ? candidate.service.trim() : "";
  const reason = typeof candidate.reason === "string" ? candidate.reason.trim() : "";

  if (!service && !reason) return undefined;

  return {
    service: service || "Recommended next visit",
    reason: reason || "Use the closeout recap to recommend the clearest next step.",
    timingLabel:
      typeof candidate.timingLabel === "string" ? candidate.timingLabel.trim() || undefined : undefined,
    estimatedAmount: sanitizeNumber(candidate.estimatedAmount),
  };
}

function normalizeProofAsset(value: unknown): PromiseProofAsset | undefined {
  if (!value || typeof value !== "object") return undefined;

  const candidate = value as Record<string, unknown>;
  const label = typeof candidate.label === "string" ? candidate.label.trim() : "";

  if (!label) return undefined;

  const kind =
    candidate.kind === "photo" ||
    candidate.kind === "testimonial" ||
    candidate.kind === "recap" ||
    candidate.kind === "review"
      ? candidate.kind
      : "recap";

  return {
    kind,
    label,
    url: typeof candidate.url === "string" ? candidate.url.trim() || undefined : undefined,
    note: typeof candidate.note === "string" ? candidate.note.trim() || undefined : undefined,
    permissionStatus:
      candidate.permissionStatus === "customer-approved" ||
      candidate.permissionStatus === "internal-only" ||
      candidate.permissionStatus === "unknown"
        ? candidate.permissionStatus
        : undefined,
  };
}

function normalizeProofAssets(value: unknown): PromiseProofAsset[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => normalizeProofAsset(entry))
    .filter((entry): entry is PromiseProofAsset => entry !== undefined);
}

function normalizeProofCapture(
  value: unknown,
): PromiseProofCapture | undefined {
  if (!value || typeof value !== "object") return undefined;

  const candidate = value as Record<string, unknown>;
  const normalized: PromiseProofCapture = {
    bookingReason:
      typeof candidate.bookingReason === "string"
        ? candidate.bookingReason.trim() || undefined
        : undefined,
    promiseThatMatteredMost:
      typeof candidate.promiseThatMatteredMost === "string"
        ? candidate.promiseThatMatteredMost.trim() || undefined
        : undefined,
    customerReliefQuote:
      typeof candidate.customerReliefQuote === "string"
        ? candidate.customerReliefQuote.trim() || undefined
        : undefined,
    proofNotes:
      typeof candidate.proofNotes === "string"
        ? candidate.proofNotes.trim() || undefined
        : undefined,
    assets: normalizeProofAssets(candidate.assets),
  };

  return normalized.bookingReason ||
    normalized.promiseThatMatteredMost ||
    normalized.customerReliefQuote ||
    normalized.proofNotes ||
    normalized.assets.length > 0
    ? normalized
    : undefined;
}

export function normalizePromiseCloseout(
  value?: PromiseCloseout | null,
): PromiseCloseout | undefined {
  if (!value) return undefined;

  const normalized: PromiseCloseout = {
    completedAt: value.completedAt?.trim() || undefined,
    workPerformedSummary: value.workPerformedSummary?.trim() || undefined,
    customerConditionSummary: value.customerConditionSummary?.trim() || undefined,
    now: normalizeRecapItems(value.now),
    soon: normalizeRecapItems(value.soon),
    monitor: normalizeRecapItems(value.monitor),
    customerRecap: normalizeCustomerRecap(value.customerRecap),
    reviewRequest: normalizeReviewRequest(value.reviewRequest),
    maintenanceReminder: normalizeMaintenanceReminder(value.maintenanceReminder),
    nextProbableVisit: normalizeNextProbableVisit(value.nextProbableVisit),
    proofCapture: normalizeProofCapture(value.proofCapture),
  };

  const meaningful =
    !!normalized.completedAt ||
    !!normalized.workPerformedSummary ||
    !!normalized.customerConditionSummary ||
    normalized.now.length > 0 ||
    normalized.soon.length > 0 ||
    normalized.monitor.length > 0 ||
    !!normalized.customerRecap ||
    !!normalized.reviewRequest ||
    !!normalized.maintenanceReminder ||
    !!normalized.nextProbableVisit ||
    !!normalized.proofCapture;

  return meaningful ? normalized : undefined;
}

export function mergePromiseCloseout(
  current?: PromiseCloseout | null,
  updates?: Partial<PromiseCloseout> | null,
) {
  if (updates === undefined) {
    return normalizePromiseCloseout(current || undefined);
  }

  if (updates === null) {
    return undefined;
  }

  const merged: PromiseCloseout = {
    completedAt: updates.completedAt ?? current?.completedAt,
    workPerformedSummary: updates.workPerformedSummary ?? current?.workPerformedSummary,
    customerConditionSummary:
      updates.customerConditionSummary ?? current?.customerConditionSummary,
    now: updates.now ?? current?.now ?? [],
    soon: updates.soon ?? current?.soon ?? [],
    monitor: updates.monitor ?? current?.monitor ?? [],
    customerRecap:
      updates.customerRecap === undefined
        ? current?.customerRecap
        : {
            ...(current?.customerRecap || { status: "not-ready" as const }),
            ...updates.customerRecap,
          },
    reviewRequest:
      updates.reviewRequest === undefined
        ? current?.reviewRequest
        : {
            ...(current?.reviewRequest || { status: "not-ready" as const }),
            ...updates.reviewRequest,
          },
    maintenanceReminder:
      updates.maintenanceReminder === undefined
        ? current?.maintenanceReminder
        : {
            ...(current?.maintenanceReminder || {
              status: "not-seeded" as const,
              service: "",
            }),
            ...updates.maintenanceReminder,
          },
    nextProbableVisit:
      updates.nextProbableVisit === undefined
        ? current?.nextProbableVisit
        : {
            ...(current?.nextProbableVisit || {
              service: "",
              reason: "",
            }),
            ...updates.nextProbableVisit,
          },
    proofCapture:
      updates.proofCapture === undefined
        ? current?.proofCapture
        : {
            ...(current?.proofCapture || {
              assets: [],
            }),
            ...updates.proofCapture,
            assets:
              updates.proofCapture.assets ?? current?.proofCapture?.assets ?? [],
          },
  };

  return normalizePromiseCloseout(merged);
}

export function encodePromiseCloseout(value?: PromiseCloseout | null) {
  const normalized = normalizePromiseCloseout(value);
  if (!normalized) return null;
  return `${CLOSEOUT_PREFIX}${JSON.stringify(normalized)}`;
}

export function extractPromiseCloseout(notes: string[]) {
  let closeout: PromiseCloseout | undefined;
  const visibleNotes: string[] = [];

  for (const note of notes) {
    if (note.startsWith(CLOSEOUT_PREFIX)) {
      try {
        closeout = normalizePromiseCloseout(
          JSON.parse(note.slice(CLOSEOUT_PREFIX.length)),
        );
      } catch {
        // Ignore malformed hidden notes.
      }
      continue;
    }

    visibleNotes.push(note);
  }

  return { closeout, visibleNotes };
}

export function mergePromiseNotesWithCloseout(
  visibleNotes: string[],
  closeout?: PromiseCloseout | null,
) {
  const cleanedNotes = visibleNotes.filter((note) => !note.startsWith(CLOSEOUT_PREFIX));
  const encoded = encodePromiseCloseout(closeout);

  return encoded ? [...cleanedNotes, encoded] : cleanedNotes;
}

export function getCloseoutRecapItems(closeout?: PromiseCloseout) {
  return {
    now: closeout?.now || [],
    soon: closeout?.soon || [],
    monitor: closeout?.monitor || [],
  };
}

export function hasDeferredWorkCaptured(closeout?: PromiseCloseout) {
  if (!closeout) return false;
  return closeout.now.length > 0 || closeout.soon.length > 0 || closeout.monitor.length > 0;
}

export function getNextProbableVisit(
  promise: PromiseRecord,
): PromiseNextProbableVisit | undefined {
  const explicit = normalizeNextProbableVisit(promise.closeout?.nextProbableVisit);
  if (explicit) return explicit;

  const firstNow = promise.closeout?.now?.[0];
  if (firstNow) {
    return {
      service: firstNow.title,
      reason:
        firstNow.detail ||
        "This is the clearest immediate next step coming out of the visit.",
      timingLabel: "Now",
      estimatedAmount: firstNow.estimatedAmount,
    };
  }

  const firstSoon = promise.closeout?.soon?.[0];
  if (firstSoon) {
    return {
      service: firstSoon.title,
      reason:
        firstSoon.detail ||
        "This is the most likely next visit once the immediate work is stable.",
      timingLabel: "Soon",
      estimatedAmount: firstSoon.estimatedAmount,
    };
  }

  const requestedService = promise.customerApproval.requestedService?.trim();
  if (requestedService) {
    return {
      service: requestedService,
      reason:
        promise.customerApproval.summary ||
        promise.customerApproval.customerMessage ||
        "This is the current next step already tied to the promise.",
      estimatedAmount: promise.customerApproval.requestedAmount,
    };
  }

  const convertedService = promise.commercialOutcome?.convertedService?.trim();
  if (convertedService) {
    return {
      service: convertedService,
      reason:
        promise.commercialOutcome?.outcomeSummary ||
        "This is the clearest next visit inferred from the visit outcome.",
      estimatedAmount: promise.commercialOutcome?.deferredValueAmount,
    };
  }

  return undefined;
}
