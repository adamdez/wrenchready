import type {
  CustomerApprovalStatus,
  PromiseCustomerAccess,
  PromiseCustomerApproval,
} from "@/lib/promise-crm/types";

const CUSTOMER_ACCESS_PREFIX = "__customer_access::";
const CUSTOMER_APPROVAL_PREFIX = "__customer_approval::";

function sanitizeNumber(value: unknown) {
  if (typeof value !== "number" || Number.isNaN(value)) return undefined;
  return value;
}

function normalizeApprovalStatus(value: unknown): CustomerApprovalStatus {
  if (
    value === "not-needed" ||
    value === "awaiting-approval" ||
    value === "approved" ||
    value === "declined"
  ) {
    return value;
  }

  return "not-needed";
}

export function createPromiseCustomerAccess(): PromiseCustomerAccess {
  const token = `wr_${crypto.randomUUID().replace(/-/g, "")}`;
  return {
    token,
    sharePath: `/status/${token}`,
  };
}

export function buildLegacyPromiseCustomerAccess(promiseId: string): PromiseCustomerAccess {
  const token = `wr_legacy_${promiseId.replace(/-/g, "")}`;
  return {
    token,
    sharePath: `/status/${token}`,
  };
}

export function normalizePromiseCustomerAccess(
  value: unknown,
  promiseId?: string,
): PromiseCustomerAccess {
  if (value && typeof value === "object") {
    const candidate = value as Record<string, unknown>;
    const token = typeof candidate.token === "string" ? candidate.token.trim() : "";
    const sharePath =
      typeof candidate.sharePath === "string" && candidate.sharePath.trim()
        ? candidate.sharePath.trim()
        : token
          ? `/status/${token}`
          : "";

    if (token) {
      return {
        token,
        sharePath,
      };
    }
  }

  return promiseId
    ? buildLegacyPromiseCustomerAccess(promiseId)
    : createPromiseCustomerAccess();
}

export function normalizePromiseCustomerApproval(
  value?: PromiseCustomerApproval | null,
): PromiseCustomerApproval | undefined {
  if (!value) return undefined;

  const normalized: PromiseCustomerApproval = {
    status: normalizeApprovalStatus(value.status),
    requestedAt: value.requestedAt?.trim() || undefined,
    respondedAt: value.respondedAt?.trim() || undefined,
    requestedService: value.requestedService?.trim() || undefined,
    requestedAmount: sanitizeNumber(value.requestedAmount),
    summary: value.summary?.trim() || undefined,
    customerMessage: value.customerMessage?.trim() || undefined,
  };

  const meaningful =
    normalized.status !== "not-needed" ||
    !!normalized.requestedAt ||
    !!normalized.respondedAt ||
    !!normalized.requestedService ||
    normalized.requestedAmount !== undefined ||
    !!normalized.summary ||
    !!normalized.customerMessage;

  return meaningful ? normalized : undefined;
}

export function ensurePromiseCustomerApproval(
  value?: PromiseCustomerApproval,
): PromiseCustomerApproval {
  return (
    normalizePromiseCustomerApproval(value) || {
      status: "not-needed",
    }
  );
}

export function encodePromiseCustomerAccess(value: PromiseCustomerAccess) {
  return `${CUSTOMER_ACCESS_PREFIX}${JSON.stringify(value)}`;
}

export function encodePromiseCustomerApproval(value?: PromiseCustomerApproval | null) {
  const normalized = normalizePromiseCustomerApproval(value);
  if (!normalized) return null;
  return `${CUSTOMER_APPROVAL_PREFIX}${JSON.stringify(normalized)}`;
}

export function extractPromiseCustomerState(notes: string[], promiseId?: string) {
  let customerAccess: PromiseCustomerAccess | undefined;
  let customerApproval: PromiseCustomerApproval | undefined;
  const visibleNotes: string[] = [];

  for (const note of notes) {
    if (note.startsWith(CUSTOMER_ACCESS_PREFIX)) {
      try {
        const parsed = JSON.parse(note.slice(CUSTOMER_ACCESS_PREFIX.length));
        customerAccess = normalizePromiseCustomerAccess(parsed, promiseId);
      } catch {
        customerAccess = promiseId
          ? buildLegacyPromiseCustomerAccess(promiseId)
          : createPromiseCustomerAccess();
      }
      continue;
    }

    if (note.startsWith(CUSTOMER_APPROVAL_PREFIX)) {
      try {
        const parsed = JSON.parse(note.slice(CUSTOMER_APPROVAL_PREFIX.length));
        customerApproval = normalizePromiseCustomerApproval(parsed);
      } catch {
        // Ignore malformed hidden notes.
      }
      continue;
    }

    visibleNotes.push(note);
  }

  return {
    customerAccess:
      customerAccess || (promiseId ? buildLegacyPromiseCustomerAccess(promiseId) : createPromiseCustomerAccess()),
    customerApproval: ensurePromiseCustomerApproval(customerApproval),
    visibleNotes,
  };
}

export function mergePromiseNotesWithCustomerState(
  visibleNotes: string[],
  customerAccess: PromiseCustomerAccess,
  customerApproval?: PromiseCustomerApproval | null,
) {
  const cleanedNotes = visibleNotes.filter(
    (note) =>
      !note.startsWith(CUSTOMER_ACCESS_PREFIX) &&
      !note.startsWith(CUSTOMER_APPROVAL_PREFIX),
  );
  const encodedAccess = encodePromiseCustomerAccess(customerAccess);
  const encodedApproval = encodePromiseCustomerApproval(customerApproval);

  return encodedApproval
    ? [...cleanedNotes, encodedAccess, encodedApproval]
    : [...cleanedNotes, encodedAccess];
}
