import type {
  PromiseFieldExecutionPacket,
  PromiseJobStage,
  PromisePaymentCollection,
  PromisePaymentMethod,
  PromiseRecurringAccountActivity,
  PromiseRecurringAccountActivityKind,
  PromiseRecurringAccount,
  PromiseRecord,
  PromiseWarrantyCase,
} from "@/lib/promise-crm/types";

const JOB_STAGE_PREFIX = "__job-stage::";
const FIELD_PACKET_PREFIX = "__field-packet::";
const PAYMENT_COLLECTION_PREFIX = "__payment-collection::";
const WARRANTY_CASE_PREFIX = "__warranty-case::";
const RECURRING_ACCOUNT_PREFIX = "__recurring-account::";

function parseJsonLine<T>(line: string, prefix: string): T | undefined {
  if (!line.startsWith(prefix)) return undefined;
  try {
    return JSON.parse(line.slice(prefix.length)) as T;
  } catch {
    return undefined;
  }
}

function toOptionalString(value: unknown) {
  return typeof value === "string" ? value.trim() || undefined : undefined;
}

function toOptionalNumber(value: unknown) {
  return typeof value === "number" && !Number.isNaN(value) ? value : undefined;
}

function normalizeStringList(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
    .filter(Boolean);
}

function normalizeRecurringActivityList(value: unknown) {
  if (!Array.isArray(value)) return [];

  return value
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null;
      const candidate = entry as Record<string, unknown>;
      const kind = candidate.kind;
      const actor = candidate.actor;
      const recordedAt = toOptionalString(candidate.recordedAt);
      const summary = toOptionalString(candidate.summary);

      const normalizedKind: PromiseRecurringAccountActivityKind | undefined =
        kind === "identified" ||
        kind === "outreach" ||
        kind === "proposal" ||
        kind === "trial-started" ||
        kind === "trial-check-in" ||
        kind === "activated" ||
        kind === "risk-flagged" ||
        kind === "note"
          ? kind
          : undefined;

      const normalizedActor =
        actor === "Dez" || actor === "Simon" || actor === "Unassigned" || actor === "System"
          ? actor
          : undefined;

      if (!normalizedKind || !normalizedActor || !recordedAt || !summary) return null;

      return {
        recordedAt,
        actor: normalizedActor,
        kind: normalizedKind,
        summary,
      } satisfies PromiseRecurringAccountActivity;
    })
    .filter((entry): entry is PromiseRecurringAccountActivity => Boolean(entry))
    .sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime());
}

export function normalizePromiseJobStage(value?: PromiseJobStage | null): PromiseJobStage {
  switch (value) {
    case "quoted":
    case "scheduled":
    case "confirmed":
    case "en-route":
    case "on-site":
    case "waiting-approval":
    case "completed":
    case "collected":
    case "warranty-issue":
      return value;
    default:
      return "triage-needed";
  }
}

export function normalizeFieldExecutionPacket(
  value?: PromiseFieldExecutionPacket | null,
): PromiseFieldExecutionPacket | undefined {
  if (!value) return undefined;

  const normalized: PromiseFieldExecutionPacket = {
    serviceGoal: toOptionalString(value.serviceGoal),
    partsChecklist: normalizeStringList(value.partsChecklist),
    photosRequired: normalizeStringList(value.photosRequired),
    inspectionChecklist: normalizeStringList(value.inspectionChecklist),
    notesTemplate: toOptionalString(value.notesTemplate),
    upsellFocus: normalizeStringList(value.upsellFocus),
    closeoutSteps: normalizeStringList(value.closeoutSteps),
  };

  const meaningful =
    normalized.serviceGoal ||
    normalized.partsChecklist.length > 0 ||
    normalized.photosRequired.length > 0 ||
    normalized.inspectionChecklist.length > 0 ||
    normalized.notesTemplate ||
    normalized.upsellFocus.length > 0 ||
    normalized.closeoutSteps.length > 0;

  return meaningful ? normalized : undefined;
}

export function mergeFieldExecutionPacket(
  current?: PromiseFieldExecutionPacket | null,
  updates?: Partial<PromiseFieldExecutionPacket> | null,
) {
  if (updates === undefined) return normalizeFieldExecutionPacket(current || undefined);
  if (updates === null) return undefined;

  return normalizeFieldExecutionPacket({
    serviceGoal: updates.serviceGoal ?? current?.serviceGoal,
    partsChecklist: updates.partsChecklist ?? current?.partsChecklist ?? [],
    photosRequired: updates.photosRequired ?? current?.photosRequired ?? [],
    inspectionChecklist: updates.inspectionChecklist ?? current?.inspectionChecklist ?? [],
    notesTemplate: updates.notesTemplate ?? current?.notesTemplate,
    upsellFocus: updates.upsellFocus ?? current?.upsellFocus ?? [],
    closeoutSteps: updates.closeoutSteps ?? current?.closeoutSteps ?? [],
  });
}

export function normalizePaymentCollection(
  value?: PromisePaymentCollection | null,
): PromisePaymentCollection | undefined {
  if (!value) return undefined;

  const method =
    value.method === "card" ||
    value.method === "apple-pay" ||
    value.method === "google-pay" ||
    value.method === "cash-app-pay" ||
    value.method === "paypal" ||
    value.method === "venmo" ||
    value.method === "link" ||
    value.method === "invoice" ||
    value.method === "cash" ||
    value.method === "bnpl" ||
    value.method === "other"
      ? value.method
      : undefined;

  const status =
    value.status === "deposit-requested" ||
    value.status === "awaiting-payment" ||
    value.status === "partial" ||
    value.status === "paid" ||
    value.status === "written-off"
      ? value.status
      : "not-requested";

  const normalized: PromisePaymentCollection = {
    status,
    method,
    processor:
      value.processor === "stripe" || value.processor === "paypal" || value.processor === "manual"
        ? value.processor
        : undefined,
    depositRequestedAmount: toOptionalNumber(value.depositRequestedAmount),
    depositRequestedAt: toOptionalString(value.depositRequestedAt),
    depositSessionId: toOptionalString(value.depositSessionId),
    depositCheckoutUrl: toOptionalString(value.depositCheckoutUrl),
    depositPaidAt: toOptionalString(value.depositPaidAt),
    balanceRequestedAt: toOptionalString(value.balanceRequestedAt),
    balanceSessionId: toOptionalString(value.balanceSessionId),
    balanceCheckoutUrl: toOptionalString(value.balanceCheckoutUrl),
    balancePaidAt: toOptionalString(value.balancePaidAt),
    lastPaymentReference: toOptionalString(value.lastPaymentReference),
    amountCollected: toOptionalNumber(value.amountCollected),
    balanceDueAmount: toOptionalNumber(value.balanceDueAmount),
    collectedAt: toOptionalString(value.collectedAt),
    invoiceReference: toOptionalString(value.invoiceReference),
    writeOffReason: toOptionalString(value.writeOffReason),
    paymentSummary: toOptionalString(value.paymentSummary),
  };

  return normalized.status !== "not-requested" ||
    normalized.method ||
    normalized.processor ||
    normalized.depositRequestedAmount !== undefined ||
    normalized.depositRequestedAt ||
    normalized.depositSessionId ||
    normalized.depositCheckoutUrl ||
    normalized.depositPaidAt ||
    normalized.balanceRequestedAt ||
    normalized.balanceSessionId ||
    normalized.balanceCheckoutUrl ||
    normalized.balancePaidAt ||
    normalized.lastPaymentReference ||
    normalized.amountCollected !== undefined ||
    normalized.balanceDueAmount !== undefined ||
    normalized.collectedAt ||
    normalized.invoiceReference ||
    normalized.writeOffReason ||
    normalized.paymentSummary
    ? normalized
    : undefined;
}

export function mergePaymentCollection(
  current?: PromisePaymentCollection | null,
  updates?: Partial<PromisePaymentCollection> | null,
) {
  if (updates === undefined) return normalizePaymentCollection(current || undefined);
  if (updates === null) return undefined;

  return normalizePaymentCollection({
    status: updates.status ?? current?.status ?? "not-requested",
    method: (updates.method ?? current?.method) as PromisePaymentMethod | undefined,
    processor: updates.processor ?? current?.processor,
    depositRequestedAmount:
      updates.depositRequestedAmount ?? current?.depositRequestedAmount,
    depositRequestedAt: updates.depositRequestedAt ?? current?.depositRequestedAt,
    depositSessionId: updates.depositSessionId ?? current?.depositSessionId,
    depositCheckoutUrl: updates.depositCheckoutUrl ?? current?.depositCheckoutUrl,
    depositPaidAt: updates.depositPaidAt ?? current?.depositPaidAt,
    balanceRequestedAt: updates.balanceRequestedAt ?? current?.balanceRequestedAt,
    balanceSessionId: updates.balanceSessionId ?? current?.balanceSessionId,
    balanceCheckoutUrl: updates.balanceCheckoutUrl ?? current?.balanceCheckoutUrl,
    balancePaidAt: updates.balancePaidAt ?? current?.balancePaidAt,
    lastPaymentReference: updates.lastPaymentReference ?? current?.lastPaymentReference,
    amountCollected: updates.amountCollected ?? current?.amountCollected,
    balanceDueAmount: updates.balanceDueAmount ?? current?.balanceDueAmount,
    collectedAt: updates.collectedAt ?? current?.collectedAt,
    invoiceReference: updates.invoiceReference ?? current?.invoiceReference,
    writeOffReason: updates.writeOffReason ?? current?.writeOffReason,
    paymentSummary: updates.paymentSummary ?? current?.paymentSummary,
  });
}

export function normalizeWarrantyCase(
  value?: PromiseWarrantyCase | null,
): PromiseWarrantyCase | undefined {
  if (!value) return undefined;

  const status =
    value.status === "monitoring" ||
    value.status === "open" ||
    value.status === "resolved"
      ? value.status
      : "none";

  const normalized: PromiseWarrantyCase = {
    status,
    issueSummary: toOptionalString(value.issueSummary),
    callbackDueAt: toOptionalString(value.callbackDueAt),
    resolutionSummary: toOptionalString(value.resolutionSummary),
  };

  return normalized.status !== "none" ||
    normalized.issueSummary ||
    normalized.callbackDueAt ||
    normalized.resolutionSummary
    ? normalized
    : undefined;
}

export function mergeWarrantyCase(
  current?: PromiseWarrantyCase | null,
  updates?: Partial<PromiseWarrantyCase> | null,
) {
  if (updates === undefined) return normalizeWarrantyCase(current || undefined);
  if (updates === null) return undefined;

  return normalizeWarrantyCase({
    status: updates.status ?? current?.status ?? "none",
    issueSummary: updates.issueSummary ?? current?.issueSummary,
    callbackDueAt: updates.callbackDueAt ?? current?.callbackDueAt,
    resolutionSummary: updates.resolutionSummary ?? current?.resolutionSummary,
  });
}

export function normalizeRecurringAccount(
  value?: PromiseRecurringAccount | null,
): PromiseRecurringAccount | undefined {
  if (!value) return undefined;

  const status =
    value.status === "lead" ||
    value.status === "pitched" ||
    value.status === "trial-active" ||
    value.status === "active" ||
    value.status === "at-risk"
      ? value.status
      : "not-account";

  const normalized: PromiseRecurringAccount = {
    status,
    accountName: toOptionalString(value.accountName),
    primaryContactName: toOptionalString(value.primaryContactName),
    primaryContactRole: toOptionalString(value.primaryContactRole),
    contactEmail: toOptionalString(value.contactEmail),
    contactPhone: toOptionalString(value.contactPhone),
    vehicleCount: toOptionalNumber(value.vehicleCount),
    cadenceLabel: toOptionalString(value.cadenceLabel),
    billingTerms: toOptionalString(value.billingTerms),
    monthlyValueEstimate: toOptionalNumber(value.monthlyValueEstimate),
    lastTouchedAt: toOptionalString(value.lastTouchedAt),
    nextTouchDueAt: toOptionalString(value.nextTouchDueAt),
    nextStep: toOptionalString(value.nextStep),
    summary: toOptionalString(value.summary),
    activityHistory: normalizeRecurringActivityList(value.activityHistory),
  };

  return normalized.status !== "not-account" ||
    normalized.accountName ||
    normalized.primaryContactName ||
    normalized.primaryContactRole ||
    normalized.contactEmail ||
    normalized.contactPhone ||
    normalized.vehicleCount !== undefined ||
    normalized.cadenceLabel ||
    normalized.billingTerms ||
    normalized.monthlyValueEstimate !== undefined ||
    normalized.lastTouchedAt ||
    normalized.nextTouchDueAt ||
    normalized.nextStep ||
    normalized.summary ||
    (normalized.activityHistory?.length || 0) > 0
    ? normalized
    : undefined;
}

export function mergeRecurringAccount(
  current?: PromiseRecurringAccount | null,
  updates?: Partial<PromiseRecurringAccount> | null,
) {
  if (updates === undefined) return normalizeRecurringAccount(current || undefined);
  if (updates === null) return undefined;

  return normalizeRecurringAccount({
    status: updates.status ?? current?.status ?? "not-account",
    accountName: updates.accountName ?? current?.accountName,
    primaryContactName: updates.primaryContactName ?? current?.primaryContactName,
    primaryContactRole: updates.primaryContactRole ?? current?.primaryContactRole,
    contactEmail: updates.contactEmail ?? current?.contactEmail,
    contactPhone: updates.contactPhone ?? current?.contactPhone,
    vehicleCount: updates.vehicleCount ?? current?.vehicleCount,
    cadenceLabel: updates.cadenceLabel ?? current?.cadenceLabel,
    billingTerms: updates.billingTerms ?? current?.billingTerms,
    monthlyValueEstimate: updates.monthlyValueEstimate ?? current?.monthlyValueEstimate,
    lastTouchedAt: updates.lastTouchedAt ?? current?.lastTouchedAt,
    nextTouchDueAt: updates.nextTouchDueAt ?? current?.nextTouchDueAt,
    nextStep: updates.nextStep ?? current?.nextStep,
    summary: updates.summary ?? current?.summary,
    activityHistory: updates.activityHistory ?? current?.activityHistory ?? [],
  });
}

export function extractPromiseExecutionOps(notes: string[]) {
  let jobStage: PromiseJobStage = "triage-needed";
  let fieldExecution: PromiseFieldExecutionPacket | undefined;
  let paymentCollection: PromisePaymentCollection | undefined;
  let warrantyCase: PromiseWarrantyCase | undefined;
  let recurringAccount: PromiseRecurringAccount | undefined;

  const visibleNotes = notes.filter((note) => {
    const stage = parseJsonLine<PromiseJobStage>(note, JOB_STAGE_PREFIX);
    if (stage !== undefined) {
      jobStage = normalizePromiseJobStage(stage);
      return false;
    }

    const field = parseJsonLine<PromiseFieldExecutionPacket>(note, FIELD_PACKET_PREFIX);
    if (field !== undefined) {
      fieldExecution = normalizeFieldExecutionPacket(field);
      return false;
    }

    const payment = parseJsonLine<PromisePaymentCollection>(note, PAYMENT_COLLECTION_PREFIX);
    if (payment !== undefined) {
      paymentCollection = normalizePaymentCollection(payment);
      return false;
    }

    const warranty = parseJsonLine<PromiseWarrantyCase>(note, WARRANTY_CASE_PREFIX);
    if (warranty !== undefined) {
      warrantyCase = normalizeWarrantyCase(warranty);
      return false;
    }

    const recurring = parseJsonLine<PromiseRecurringAccount>(note, RECURRING_ACCOUNT_PREFIX);
    if (recurring !== undefined) {
      recurringAccount = normalizeRecurringAccount(recurring);
      return false;
    }

    return true;
  });

  return {
    jobStage,
    fieldExecution,
    paymentCollection,
    warrantyCase,
    recurringAccount,
    visibleNotes,
  };
}

export function mergePromiseNotesWithExecutionOps(
  notes: string[],
  jobStage: PromiseJobStage,
  fieldExecution?: PromiseFieldExecutionPacket,
  paymentCollection?: PromisePaymentCollection,
  warrantyCase?: PromiseWarrantyCase,
  recurringAccount?: PromiseRecurringAccount,
) {
  const withoutExecution = notes.filter(
    (note) =>
      !note.startsWith(JOB_STAGE_PREFIX) &&
      !note.startsWith(FIELD_PACKET_PREFIX) &&
      !note.startsWith(PAYMENT_COLLECTION_PREFIX) &&
      !note.startsWith(WARRANTY_CASE_PREFIX) &&
      !note.startsWith(RECURRING_ACCOUNT_PREFIX),
  );

  const merged = [
    `${JOB_STAGE_PREFIX}${JSON.stringify(normalizePromiseJobStage(jobStage))}`,
    fieldExecution
      ? `${FIELD_PACKET_PREFIX}${JSON.stringify(normalizeFieldExecutionPacket(fieldExecution))}`
      : undefined,
    paymentCollection
      ? `${PAYMENT_COLLECTION_PREFIX}${JSON.stringify(normalizePaymentCollection(paymentCollection))}`
      : undefined,
    warrantyCase
      ? `${WARRANTY_CASE_PREFIX}${JSON.stringify(normalizeWarrantyCase(warrantyCase))}`
      : undefined,
    recurringAccount
      ? `${RECURRING_ACCOUNT_PREFIX}${JSON.stringify(normalizeRecurringAccount(recurringAccount))}`
      : undefined,
    ...withoutExecution,
  ];

  return merged.filter((entry): entry is string => Boolean(entry));
}

export function getExecutionPacketCompleteness(promise: PromiseRecord) {
  const packet = promise.fieldExecution;

  return {
    missingPartsChecklist: !packet || packet.partsChecklist.length === 0,
    missingPhotosChecklist: !packet || packet.photosRequired.length === 0,
    missingInspectionChecklist: !packet || packet.inspectionChecklist.length === 0,
  };
}
