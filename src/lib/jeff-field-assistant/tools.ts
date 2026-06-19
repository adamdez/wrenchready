import { timingSafeEqual } from "node:crypto";
import { getAppBaseUrl } from "@/lib/app-url";
import { getJeffEmailDeliveryStatus, getJeffEmailFrom, isJeffEmailSendingConfigured, sendJeffRecapEmail } from "@/lib/email";
import { readEnv } from "@/lib/env";
import {
  getGoogleWorkspaceIntegrationStatus,
  listGoogleCalendarEvents,
  listRecentGmailMessages,
  upsertGoogleCalendarEventByPrivateProperty,
} from "@/lib/google-workspace";
import {
  getJeffEmailIntegrationStatus,
  ingestJeffInboundEmail,
} from "@/lib/jeff-field-assistant/email-ingest";
import { getJeffCapabilityReport } from "@/lib/jeff-field-assistant/capabilities";
import { getJeffOperatingContextPacket } from "@/lib/jeff-field-assistant/operating-context";
import { getPromiseRecords, updatePromiseRecord, upsertPromiseQuoteDraftForReview } from "@/lib/promise-crm/server";
import { buildPromiseQuotePacket } from "@/lib/promise-crm/quote-packet";
import type { PromiseFieldExecutionPacket, PromisePartItem, PromisePaymentCollection, PromiseRecord } from "@/lib/promise-crm/types";
import { checkStripePaymentReferences, isStripeSecretConfigured, type StripePaymentStatusCheck } from "@/lib/stripe";
import schedulingEngine from "@/lib/scheduling/engine";
import type { AvailabilityRequest } from "@/lib/scheduling/types";
import { normalizePhone } from "@/lib/twilio";
import { jeffFieldJobFixtures } from "@/lib/jeff-field-assistant/fixtures";
import { findNearbyPartsStoresForSimon } from "@/lib/jeff-field-assistant/location";
import {
  isJeffEvaluationMemory,
  isJeffFieldSelectableJob,
  isJeffFieldThreadConversation,
} from "@/lib/jeff-field-assistant/conversation-filters";
import {
  getJeffPhotoImageUrl,
  persistJeffPhotoData,
  readPersistedJeffPhotos,
  upsertPersistedJeffPhotos,
} from "@/lib/jeff-field-assistant/photo-storage";
import {
  listPersistedJeffMedia,
  persistJeffMediaItems,
} from "@/lib/jeff-field-assistant/media";
import { jeffFieldAssistantSystemPrompt } from "@/lib/jeff-field-assistant/prompt";
import {
  attachPhotoToJeffLiveSession,
  resolveJeffLiveSession,
} from "@/lib/jeff-field-assistant/session";
import {
  listApprovedJeffDurableMemories,
  listPersistedJeffFieldEvents,
  listPersistedJeffDurableMemories,
  listPersistedJeffJobWorkspace,
  listUnresolvedJeffConversations,
  persistJeffConversationWorkspace,
  persistJeffDurableMemory,
  persistJeffFieldEvent,
  updateJeffDurableMemoryStatus,
} from "@/lib/jeff-field-assistant/persistence";
import type {
  JeffConversation,
  JeffConversationSummary,
  JeffFollowUpStatus,
  JeffDurableMemory,
  JeffDurableMemorySensitivity,
  JeffDurableMemoryStatus,
  JeffDurableMemorySubjectType,
  JeffDurableMemorySummary,
  JeffContextPacket,
  JeffExtractedFacts,
  JeffFieldChannel,
  JeffFieldConfidence,
  JeffFieldEvent,
  JeffFieldEventType,
  JeffFieldFile,
  JeffFieldJob,
  JeffFieldPhoto,
  JeffFieldPhotoAnalysis,
  JeffFieldPhotoSummary,
  JeffMediaItem,
  JeffMediaStorageStatus,
  JeffToolResult,
  JeffVapiToolSchema,
} from "@/lib/jeff-field-assistant/types";

type JeffRuntimeState = {
  events: JeffFieldEvent[];
  photoAnalyses: JeffFieldPhotoAnalysis[];
  photos: JeffFieldPhoto[];
};

type ActiveJobInput = {
  callerPhone?: string;
  customerName?: string;
  vehicle?: string;
  jobId?: string;
};

type RecordEventInput = {
  jobId: string;
  channel?: JeffFieldChannel;
  eventType?: JeffFieldEventType;
  sender?: JeffFieldEvent["sender"];
  summary: string;
  rawSourceReference?: string;
  extractedFacts?: JeffExtractedFacts;
  confidence?: JeffFieldConfidence;
  needsReview?: boolean;
};

type CoreMemoryInput = {
  jobId?: string;
  subjectType?: JeffDurableMemorySubjectType;
  subjectKey?: string;
  subjectLabel?: string;
  category?: string;
  memory?: string;
  evidence?: string;
  confidence?: JeffFieldConfidence;
  sensitivity?: JeffDurableMemorySensitivity;
  sourceChannel?: JeffFieldChannel;
};

type SimonRecapEmailInput = {
  conversationId?: string;
  callId?: string;
  sessionId?: string;
  subject?: string;
  body?: string;
  recipientEmail?: string;
  sendNow?: boolean;
};

type PhotoUploadInput = ActiveJobInput & {
  sessionId?: string;
  label?: string;
  note?: string;
  uploadedBy?: string;
  sourceChannel?: JeffFieldChannel;
  photos?: unknown[];
};

type PartsCartInput = ActiveJobInput & {
  partName?: string;
  requestedPart?: string;
  preferredVendor?: string;
  quantity?: number;
  latitude?: number;
  longitude?: number;
  maxLocationAgeMinutes?: number;
  sourceChannel?: JeffFieldChannel;
  spokenRequest?: string;
};

type StripePaymentCheckInput = ActiveJobInput & {
  stripeReference?: string;
  stripeReferences?: string[];
  checkoutSessionId?: string;
  checkoutSessionIds?: string[];
  paymentIntentId?: string;
  paymentIntentIds?: string[];
  invoiceId?: string;
  invoiceIds?: string[];
  paymentLinkUrl?: string;
  paymentLinkUrls?: string[];
  reconcile?: boolean;
  searchStripeByPromiseId?: boolean;
};

type PartsStoreCandidate = {
  name: string;
  address?: string;
  phone?: string;
  websiteUri?: string;
  googleMapsUri?: string;
  straightLineDistanceMiles?: number;
  route?: {
    durationMinutes?: number;
    distanceMiles?: number;
  };
};

type PartsFitmentReview = {
  status: "needs_vehicle_facts" | "vendor_fitment_required" | "fitment_verified";
  knownFacts: string[];
  missingFacts: string[];
  requiredFacts: string[];
  instructions: string[];
};

type BookingRisk = "low" | "medium" | "high";

type NormalizedPhotoInput = {
  fileName: string;
  contentType: string;
  sizeBytes: number;
  dataUrl?: string;
  url?: string;
};

type ToolAuthResult =
  | { authorized: true }
  | { authorized: false; status: number; message: string };

const CHANNELS: JeffFieldChannel[] = [
  "voice",
  "sms",
  "mms",
  "upload",
  "email",
  "vendor",
  "approval",
  "invoice",
  "payment",
  "system",
];

const EVENT_TYPES: JeffFieldEventType[] = [
  "voice_call_started",
  "voice_transcript_note",
  "sms_received",
  "mms_photo_received",
  "field_upload_received",
  "photo_analysis_completed",
  "diagnostic_email_received",
  "scan_report_parsed",
  "part_search_completed",
  "cart_prepared",
  "purchase_blocked",
  "approval_requested",
  "approval_received",
  "invoice_updated",
  "payment_link_ready",
  "closeout_started",
  "field_note_recorded",
  "conflict_flagged",
];

const MEMORY_SUBJECT_TYPES: JeffDurableMemorySubjectType[] = [
  "technician",
  "business",
  "customer",
  "vehicle",
  "vendor",
  "workflow",
  "job",
  "other",
];

const MEMORY_SENSITIVITIES: JeffDurableMemorySensitivity[] = [
  "low",
  "personal",
  "sensitive",
  "restricted",
];

const MEMORY_STATUSES: JeffDurableMemoryStatus[] = [
  "candidate",
  "approved",
  "rejected",
  "archived",
];

const BASE_ROUTE = "/api/al/wrenchready/jeff/tools";
const GENERAL_JEFF_REQUEST_JOB_ID = "jeff-general-requests";
const BLOCKED_REQUEST_SOURCE_PREFIX = "jeff-blocked-request:";
const PARTS_CART_SOURCE_PREFIX = "jeff-parts-cart:";
const MAX_PHOTOS_PER_UPLOAD = 8;
const MAX_RUNTIME_PHOTO_BYTES = 7 * 1024 * 1024;
const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";
const REASONING_EFFORTS = ["none", "minimal", "low", "medium", "high", "xhigh"] as const;

function getRuntimeState(): JeffRuntimeState {
  const globalState = globalThis as typeof globalThis & {
    __wrenchreadyJeffFieldState?: JeffRuntimeState;
  };

  if (!globalState.__wrenchreadyJeffFieldState) {
    globalState.__wrenchreadyJeffFieldState = {
      events: [],
      photoAnalyses: [],
      photos: readPersistedJeffPhotos(),
    };
  }

  globalState.__wrenchreadyJeffFieldState.photoAnalyses ||= [];
  globalState.__wrenchreadyJeffFieldState.photos ||= [];

  return globalState.__wrenchreadyJeffFieldState;
}

function nowIso() {
  return new Date().toISOString();
}

function makeId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function optionalString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function optionalNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function optionalBoolean(value: unknown) {
  return typeof value === "boolean" ? value : undefined;
}

function stringList(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
    .filter(Boolean);
}

function uniqueText(values: Array<string | undefined | null>) {
  return [...new Set(values.map((value) => value?.trim()).filter((value): value is string => Boolean(value)))];
}

function normalizeChannel(value: unknown): JeffFieldChannel {
  return CHANNELS.includes(value as JeffFieldChannel) ? (value as JeffFieldChannel) : "voice";
}

function normalizeEventType(value: unknown): JeffFieldEventType {
  return EVENT_TYPES.includes(value as JeffFieldEventType)
    ? (value as JeffFieldEventType)
    : "field_note_recorded";
}

function normalizeConfidence(value: unknown): JeffFieldConfidence {
  return value === "high" || value === "low" ? value : "medium";
}

function normalizeMemorySubjectType(value: unknown): JeffDurableMemorySubjectType | undefined {
  return MEMORY_SUBJECT_TYPES.includes(value as JeffDurableMemorySubjectType)
    ? (value as JeffDurableMemorySubjectType)
    : undefined;
}

function normalizeMemorySensitivity(value: unknown): JeffDurableMemorySensitivity {
  return MEMORY_SENSITIVITIES.includes(value as JeffDurableMemorySensitivity)
    ? (value as JeffDurableMemorySensitivity)
    : "low";
}

function normalizeMemoryStatus(value: unknown): JeffDurableMemoryStatus {
  return MEMORY_STATUSES.includes(value as JeffDurableMemoryStatus)
    ? (value as JeffDurableMemoryStatus)
    : "candidate";
}

function getSimonEmailAddress() {
  return readEnv("JEFF_SIMON_EMAIL") || readEnv("WR_JEFF_SIMON_EMAIL") || "simon@wrenchreadymobile.com";
}

function getJeffRecapCcEmails() {
  const value = readEnv("JEFF_RECAP_CC_EMAILS") || "adam@wrenchreadymobile.com";
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function safeConversationCallId(callId?: string) {
  return callId?.replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 120);
}

function recapLineGroup(title: string, lines: string[]) {
  const cleanLines = lines.map((line) => line.trim()).filter(Boolean);
  if (cleanLines.length === 0) return "";

  return [
    title,
    ...cleanLines.map((line) => `- ${line}`),
  ].join("\n");
}

function buildRecapSubject(summary?: JeffConversationSummary) {
  const subjectLabel = optionalString(summary?.metadata?.subjectLabel);
  if (subjectLabel) return `Jeff recap: ${subjectLabel}`;
  if (summary?.jobId) return `Jeff recap for job ${summary.jobId}`;
  return "Jeff recap";
}

function buildRecapBody(summary?: JeffConversationSummary, explicitBody?: string) {
  if (explicitBody) return explicitBody;
  if (!summary) return "";

  return [
    "Jeff recap",
    "",
    summary.recommendationSummary || summary.summary,
    "",
    recapLineGroup("Known facts", summary.knownFacts),
    recapLineGroup("Tests and readings", [...summary.testsPerformed, ...summary.readings]),
    recapLineGroup("Likely suspects", summary.suspectedIssues),
    recapLineGroup("Next tests", summary.nextActions),
    recapLineGroup("Proof still needed", summary.proofNeeded),
    recapLineGroup("Follow-ups requested", summary.requestedFollowUps),
  ]
    .filter((section) => section.trim())
    .join("\n\n");
}

function normalizeMemoryKey(value?: string) {
  if (!value) return undefined;
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9:_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120) || undefined;
}

function defaultMemorySubjectType(category: string, job?: JeffFieldJob): JeffDurableMemorySubjectType {
  const normalized = category.toLowerCase();
  if (normalized.includes("business") || normalized.includes("wrenchready") || normalized.includes("pricing")) {
    return "business";
  }
  if (normalized.includes("workflow") || normalized.includes("process") || normalized.includes("closeout")) {
    return "workflow";
  }
  if (job && (normalized.includes("vehicle") || normalized.includes("car"))) {
    return "vehicle";
  }
  if (job && normalized.includes("customer")) {
    return "customer";
  }
  return "technician";
}

function memorySubject(input: CoreMemoryInput, job?: JeffFieldJob) {
  const category = optionalString(input.category) || "operator-preference";
  const subjectType = normalizeMemorySubjectType(input.subjectType) || defaultMemorySubjectType(category, job);
  const explicitKey = normalizeMemoryKey(input.subjectKey);
  const explicitLabel = optionalString(input.subjectLabel);

  if (explicitKey && explicitLabel) {
    return { subjectType, subjectKey: explicitKey, subjectLabel: explicitLabel, category };
  }

  if (subjectType === "business") {
    return { subjectType, subjectKey: "wrenchready", subjectLabel: "WrenchReady", category };
  }
  if (subjectType === "workflow") {
    return { subjectType, subjectKey: explicitKey || "wrenchready-field-workflow", subjectLabel: explicitLabel || "WrenchReady field workflow", category };
  }
  if (subjectType === "vehicle" && job) {
    const label = vehicleLabel(job);
    return {
      subjectType,
      subjectKey: explicitKey || normalizeMemoryKey(`vehicle:${label}`) || job.id,
      subjectLabel: explicitLabel || label,
      category,
    };
  }
  if (subjectType === "customer" && job) {
    return {
      subjectType,
      subjectKey: explicitKey || normalizeMemoryKey(`customer:${job.customer.name}`) || job.id,
      subjectLabel: explicitLabel || job.customer.name,
      category,
    };
  }
  if (subjectType === "job" && job) {
    return {
      subjectType,
      subjectKey: explicitKey || job.id,
      subjectLabel: explicitLabel || `${job.customer.name} / ${vehicleLabel(job)}`,
      category,
    };
  }

  return {
    subjectType,
    subjectKey: explicitKey || "simon",
    subjectLabel: explicitLabel || "Simon",
    category,
  };
}

function summarizeDurableMemory(memory: JeffDurableMemory): JeffDurableMemorySummary {
  return {
    id: memory.id,
    subjectType: memory.subjectType,
    subjectKey: memory.subjectKey,
    subjectLabel: memory.subjectLabel,
    category: memory.category,
    memory: memory.memory,
    evidence: memory.evidence,
    sourceJobId: memory.sourceJobId,
    status: memory.status,
    confidence: memory.confidence,
    sensitivity: memory.sensitivity,
    updatedAt: memory.updatedAt,
  };
}

function getJeffReasoningEffort() {
  const effort = readEnv("JEFF_FIELD_REASONING_EFFORT") || "low";
  return REASONING_EFFORTS.includes(effort as (typeof REASONING_EFFORTS)[number])
    ? effort
    : "low";
}

function modelSupportsReasoning(model: string) {
  return /^gpt-5(?:\.|-|$)/i.test(model);
}

function isProductionRuntime() {
  return process.env.NODE_ENV === "production" || readEnv("VERCEL_ENV") === "production";
}

function secretsMatch(provided: string, expected: string) {
  const providedBuffer = Buffer.from(provided);
  const expectedBuffer = Buffer.from(expected);
  return providedBuffer.length === expectedBuffer.length && timingSafeEqual(providedBuffer, expectedBuffer);
}

function normalizeExtractedFacts(value: unknown): JeffExtractedFacts {
  if (!isObject(value)) return {};

  return {
    customerName: optionalString(value.customerName),
    vehicle: optionalString(value.vehicle),
    vin: optionalString(value.vin),
    odometer: optionalString(value.odometer),
    symptoms: stringList(value.symptoms),
    testsPerformed: stringList(value.testsPerformed),
    readings: stringList(value.readings),
    suspectedCause: optionalString(value.suspectedCause),
    partNeeded: optionalString(value.partNeeded),
    authorization: optionalString(value.authorization),
    invoiceReference: optionalString(value.invoiceReference),
    paymentStatus: optionalString(value.paymentStatus),
  };
}

function vehicleLabel(job: JeffFieldJob) {
  return `${job.vehicle.year || ""} ${job.vehicle.make} ${job.vehicle.model}`.trim();
}

function paymentStatusLabel(job: JeffFieldJob) {
  const payment = job.paymentCollection;
  if (!payment) return "Payment status is not recorded yet.";

  const parts = [
    `Payment status: ${payment.status}.`,
    payment.method ? `Method: ${payment.method}.` : undefined,
    payment.processor ? `Processor: ${payment.processor}.` : undefined,
    payment.depositPaidAt ? `Deposit paid at ${payment.depositPaidAt}.` : undefined,
    payment.balanceDueAmount !== undefined ? `Balance due: $${payment.balanceDueAmount}.` : undefined,
    payment.invoiceReference ? `Invoice reference: ${payment.invoiceReference}.` : undefined,
    payment.paymentSummary,
  ];

  return parts.filter(Boolean).join(" ");
}

function formatMoney(amount?: number) {
  if (amount === undefined || Number.isNaN(amount)) return undefined;
  return `$${amount.toFixed(2)}`;
}

function paymentCollectionReferences(payment?: JeffFieldJob["paymentCollection"]) {
  if (!payment) return [];

  return uniqueText([
    payment.depositSessionId,
    payment.depositCheckoutUrl,
    payment.balanceSessionId,
    payment.balanceCheckoutUrl,
    payment.lastPaymentReference,
    payment.invoiceReference,
  ]);
}

function explicitStripeReferences(input: StripePaymentCheckInput) {
  return uniqueText([
    input.stripeReference,
    ...(input.stripeReferences || []),
    input.checkoutSessionId,
    ...(input.checkoutSessionIds || []),
    input.paymentIntentId,
    ...(input.paymentIntentIds || []),
    input.invoiceId,
    ...(input.invoiceIds || []),
    input.paymentLinkUrl,
    ...(input.paymentLinkUrls || []),
  ]);
}

function jobStripeReferenceStrings(job?: JeffFieldJob) {
  if (!job) return [];

  return uniqueText([
    ...paymentCollectionReferences(job.paymentCollection),
    ...job.notes,
  ]);
}

function stripePaymentMatchesJob(match: StripePaymentStatusCheck["matches"][number], job: JeffFieldJob) {
  return match.promiseId === job.id ||
    paymentCollectionReferences(job.paymentCollection).some((reference) =>
      reference.includes(match.id) ||
      (match.checkoutSessionId && reference.includes(match.checkoutSessionId)) ||
      (match.paymentIntentId && reference.includes(match.paymentIntentId)) ||
      (match.invoiceId && reference.includes(match.invoiceId)) ||
      (match.paymentLinkId && reference.includes(match.paymentLinkId)),
    );
}

function stripeCheckCanReconcile(input: {
  job?: JeffFieldJob;
  explicitReferences: string[];
  check: StripePaymentStatusCheck;
  requestedReconcile: boolean;
}) {
  if (!input.requestedReconcile || !input.job || input.job.source !== "promise-crm") return false;
  if (input.check.paidMatches.some((match) => stripePaymentMatchesJob(match, input.job as JeffFieldJob))) return true;

  return input.explicitReferences.length === 0 &&
    input.check.paidMatches.some((match) => match.promiseId === input.job?.id);
}

function expectedPaymentTotal(job: JeffFieldJob) {
  return (
    job.paymentCollection?.balanceDueAmount ||
    job.paymentCollection?.depositRequestedAmount ||
    job.customerApproval.requestedAmount
  );
}

function reconcilePaymentCollectionFromStripe(
  job: JeffFieldJob,
  check: StripePaymentStatusCheck,
): PromisePaymentCollection | undefined {
  if (check.paidMatches.length === 0) return undefined;

  const existing = job.paymentCollection;
  const totalPaid = check.totalPaidAmount || existing?.amountCollected || 0;
  const expected = expectedPaymentTotal(job);
  const hasPaidBalance = check.paidMatches.some((match) => match.paymentType === "visit-balance");
  const hasPaidDeposit = check.paidMatches.some((match) => match.paymentType === "visit-deposit");
  const hasPaidInvoiceOrPaymentLink = check.paidMatches.some((match) =>
    match.kind === "invoice" || match.kind === "payment_link",
  );
  const paidInFull =
    hasPaidBalance ||
    hasPaidInvoiceOrPaymentLink ||
    (expected !== undefined && totalPaid >= expected - 0.01);
  const status: PromisePaymentCollection["status"] = paidInFull
    ? "paid"
    : hasPaidDeposit || totalPaid > 0
      ? "partial"
      : existing?.status || "awaiting-payment";
  const latestPaid = check.latestPaidAt || new Date().toISOString();
  const balanceDueAmount =
    expected !== undefined
      ? Math.max(expected - totalPaid, 0)
      : existing?.balanceDueAmount;
  const firstPaid = check.paidMatches[0];

  return {
    status,
    processor: "stripe",
    method: firstPaid.method || existing?.method || "card",
    depositRequestedAmount: existing?.depositRequestedAmount,
    depositRequestedAt: existing?.depositRequestedAt,
    depositSessionId:
      existing?.depositSessionId ||
      (hasPaidDeposit ? firstPaid.checkoutSessionId : undefined),
    depositCheckoutUrl: existing?.depositCheckoutUrl,
    depositPaidAt:
      existing?.depositPaidAt ||
      (hasPaidDeposit || status === "paid" ? latestPaid : undefined),
    balanceRequestedAt: existing?.balanceRequestedAt,
    balanceSessionId:
      existing?.balanceSessionId ||
      (hasPaidBalance ? firstPaid.checkoutSessionId : undefined),
    balanceCheckoutUrl: existing?.balanceCheckoutUrl,
    balancePaidAt:
      existing?.balancePaidAt ||
      (status === "paid" ? latestPaid : undefined),
    lastPaymentReference:
      firstPaid.paymentIntentId ||
      firstPaid.checkoutSessionId ||
      firstPaid.invoiceId ||
      firstPaid.paymentLinkId ||
      firstPaid.id ||
      existing?.lastPaymentReference,
    amountCollected: totalPaid || existing?.amountCollected,
    balanceDueAmount,
    collectedAt: latestPaid,
    invoiceReference:
      existing?.invoiceReference ||
      firstPaid.invoiceId ||
      firstPaid.hostedInvoiceUrl ||
      firstPaid.paymentLinkUrl ||
      firstPaid.checkoutSessionId,
    writeOffReason: existing?.writeOffReason,
    paymentSummary:
      status === "paid"
        ? `Stripe checked ${check.checkedAt}. Payment appears paid in Stripe${formatMoney(totalPaid) ? ` (${formatMoney(totalPaid)})` : ""}.`
        : `Stripe checked ${check.checkedAt}. Payment appears partially paid${formatMoney(totalPaid) ? ` (${formatMoney(totalPaid)})` : ""}; balance still needs review.`,
  };
}

function customerApprovalLabel(job: JeffFieldJob) {
  const approval = job.customerApproval;
  const parts = [
    `Approval status: ${approval.status}.`,
    approval.requestedService ? `Requested service: ${approval.requestedService}.` : undefined,
    approval.requestedAmount !== undefined ? `Requested amount: $${approval.requestedAmount}.` : undefined,
    approval.summary,
  ];

  return parts.filter(Boolean).join(" ");
}

function mapPromiseToFieldJob(record: PromiseRecord): JeffFieldJob {
  return {
    id: record.id,
    source: "promise-crm",
    customer: record.customer,
    vehicle: record.vehicle,
    location: record.location,
    serviceScope: record.serviceScope,
    owner: record.owner,
    jobStage: record.jobStage,
    scheduledWindow: record.scheduledWindow,
    readinessSummary: record.readinessSummary,
    nextAction: record.nextAction,
    topRisks: record.topRisks,
    notes: record.notes,
    customerApproval: record.customerApproval,
    fieldExecution: record.fieldExecution,
    paymentCollection: record.paymentCollection,
    updatedAt: record.updatedAt,
  };
}

function jeffFixturesEnabled() {
  return (
    readEnv("WR_ENABLE_JEFF_FIELD_DEMO_FIXTURES") === "true" ||
    readEnv("WR_ENABLE_PROMISE_CRM_DEMO_FALLBACK") === "true"
  );
}

async function getAllJobs() {
  const warnings: string[] = [];
  const jobs: JeffFieldJob[] = [];

  try {
    const promises = await getPromiseRecords();
    jobs.push(...promises.map(mapPromiseToFieldJob));
  } catch (error) {
    warnings.push(
      error instanceof Error
        ? error.message
        : "Promise CRM records were unavailable while loading Jeff field jobs.",
    );
  }

  if (jeffFixturesEnabled()) {
    jobs.push(...jeffFieldJobFixtures);
  }

  return { jobs, warnings };
}

async function findJob(jobId: string) {
  const { jobs, warnings } = await getAllJobs();
  return {
    job: jobs.find((candidate) => candidate.id === jobId),
    warnings,
  };
}

function searchableJobText(job: JeffFieldJob) {
  return [
    job.id,
    job.customer.name,
    job.customer.phone,
    vehicleLabel(job),
    job.serviceScope,
    job.location.label,
    job.readinessSummary,
    job.nextAction,
    job.topRisks.join(" "),
  ]
    .join(" ")
    .toLowerCase();
}

function scoreJob(job: JeffFieldJob, input: ActiveJobInput) {
  let score = 0;
  const text = searchableJobText(job);
  const callerPhone = normalizePhone(input.callerPhone || "");
  const jobPhone = normalizePhone(job.customer.phone);
  const customerName = input.customerName?.trim().toLowerCase();
  const vehicle = input.vehicle?.trim().toLowerCase();

  if (input.jobId && job.id === input.jobId) score += 100;
  if (callerPhone && jobPhone && callerPhone === jobPhone) score += 50;
  if (customerName && text.includes(customerName)) score += 25;
  if (vehicle) {
    const vehicleTerms = vehicle.split(/\s+/).filter(Boolean);
    score += vehicleTerms.filter((term) => text.includes(term)).length * 8;
  }
  if (job.owner === "Simon" && (job.jobStage === "on-site" || job.jobStage === "en-route")) score += 8;
  if (job.jobStage === "on-site") score += 6;

  return score;
}

function getJobMatches(jobs: JeffFieldJob[], input: ActiveJobInput) {
  return jobs
    .map((job) => ({ job, score: scoreJob(job, input) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score);
}

function hasSpecificLookupHint(input: ActiveJobInput) {
  return Boolean(input.jobId || input.callerPhone || input.customerName || input.vehicle);
}

async function resolveFieldJob(input: ActiveJobInput) {
  const { jobs, warnings } = await getAllJobs();

  if (input.jobId) {
    return {
      job: jobs.find((candidate) => candidate.id === input.jobId),
      warnings,
      needsClarification: false,
      candidates: [],
    };
  }

  const matches = getJobMatches(jobs, input);
  const selected = matches[0]?.job;
  const ambiguous = matches.length > 1 && matches[0].score === matches[1].score;
  const weakMatch = !hasSpecificLookupHint(input) || (matches[0]?.score || 0) < 20;

  return {
    job: selected && !ambiguous && !weakMatch ? selected : undefined,
    warnings,
    needsClarification: !selected || ambiguous || weakMatch,
    candidates: (matches.length > 0 ? matches.map((match) => match.job) : jobs).slice(0, 5),
  };
}

function eventMatchesJob(event: JeffFieldEvent, job: JeffFieldJob) {
  if (event.jobId !== job.id) return false;
  return true;
}

function getEventsForJob(job: JeffFieldJob) {
  return getRuntimeState()
    .events.filter((event) => eventMatchesJob(event, job))
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

function mergeEvents(...eventGroups: JeffFieldEvent[][]) {
  const eventsById = new Map<string, JeffFieldEvent>();
  for (const event of eventGroups.flat()) {
    eventsById.set(event.id, event);
  }

  return [...eventsById.values()].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );
}

async function getStoredEventsForJob(job: JeffFieldJob) {
  const runtimeEvents = getEventsForJob(job);
  if (job.source !== "promise-crm") {
    return {
      events: runtimeEvents,
      warnings: [],
      storageStatus: "runtime-memory" as const,
    };
  }

  const persisted = await listPersistedJeffFieldEvents(job.id);
  return {
    events: mergeEvents(runtimeEvents, persisted.events),
    warnings: persisted.warnings,
    storageStatus: persisted.storageStatus,
  };
}

function getPhotosForJob(jobId: string) {
  return getRuntimeState()
    .photos.filter((photo) => photo.jobId === jobId)
    .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
}

function getPhotosForSession(sessionId: string) {
  return getRuntimeState()
    .photos.filter((photo) => photo.sessionId === sessionId)
    .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
}

function summarizePhoto(photo: JeffFieldPhoto): JeffFieldPhotoSummary {
  const { dataUrl, ...summary } = photo;
  return {
    ...summary,
    hasImageData: Boolean(dataUrl || photo.url || photo.storageKey || photo.driveFileId),
  };
}

function photoFromMedia(media: JeffMediaItem): JeffFieldPhoto {
  return {
    id: media.photoId || media.id,
    mediaId: media.id,
    jobId: media.jobId,
    sessionId: media.sessionId,
    uploadedAt: media.uploadedAt,
    uploadedBy: media.uploadedBy,
    sourceChannel: media.sourceChannel,
    fileName: media.fileName,
    contentType: media.contentType,
    sizeBytes: media.sizeBytes,
    label: media.label,
    note: media.note,
    url: media.externalUrl || media.driveWebViewLink || media.driveWebContentLink,
    storageKey: media.localStorageKey || media.driveFileId,
    driveFileId: media.driveFileId,
    driveWebViewLink: media.driveWebViewLink,
    driveWebContentLink: media.driveWebContentLink,
    storageStatus: media.storageProvider,
    attachmentStatus: media.jobId ? "job-attached" : "session-inbox",
    eventId: media.fieldEventId,
  };
}

function mergePhotos(...photoGroups: JeffFieldPhoto[][]) {
  const byId = new Map<string, JeffFieldPhoto>();

  for (const photo of photoGroups.flat()) {
    const existing = byId.get(photo.id);
    byId.set(photo.id, existing ? { ...photo, ...existing } : photo);
  }

  return [...byId.values()].sort(
    (a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime(),
  );
}

function mediaStorageStatusFromPhoto(photo: JeffFieldPhoto): JeffMediaStorageStatus {
  if (photo.storageStatus === "runtime-memory") return "temporary";
  if (photo.storageStatus === "metadata-only") return "metadata-only";
  return "available";
}

function mediaFromPhoto(photo: JeffFieldPhoto, metadata: Record<string, unknown> = {}): JeffMediaItem {
  const timestamp = nowIso();

  return {
    id: photo.mediaId || makeId("jeff-media"),
    jobId: photo.jobId,
    sessionId: photo.sessionId,
    fieldEventId: photo.eventId,
    photoId: photo.id,
    sourceChannel: photo.sourceChannel,
    uploadedAt: photo.uploadedAt,
    uploadedBy: photo.uploadedBy,
    fileName: photo.fileName,
    contentType: photo.contentType,
    sizeBytes: photo.sizeBytes,
    label: photo.label,
    note: photo.note,
    storageProvider: photo.storageStatus,
    storageStatus: mediaStorageStatusFromPhoto(photo),
    driveFileId: photo.driveFileId,
    driveWebViewLink: photo.driveWebViewLink,
    driveWebContentLink: photo.driveWebContentLink,
    externalUrl: photo.storageStatus === "external-url" ? photo.url : undefined,
    localStorageKey: photo.storageStatus === "local-file" ? photo.storageKey : undefined,
    parseStatus: "not-needed",
    reviewStatus: photo.jobId ? "accepted" : "needs-review",
    metadata: {
      source: "record_field_photo_upload",
      attachmentStatus: photo.attachmentStatus,
      ...metadata,
    },
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

function getMediaAndReports(
  events: JeffFieldEvent[],
  photos: JeffFieldPhotoSummary[],
  media: JeffMediaItem[] = [],
) {
  const eventMedia = events
    .filter((event) =>
      event.type === "mms_photo_received" ||
      event.type === "field_upload_received" ||
      event.type === "photo_analysis_completed" ||
      event.type === "diagnostic_email_received" ||
      event.type === "scan_report_parsed"
    )
    .map((event) => `${event.type}: ${event.summary}`)
    .slice(0, 5);

  const photoMedia = photos.slice(0, 5).map(photoMediaLine);
  const indexedMedia = media
    .slice(0, 5)
    .map((item) => {
      const label = item.label ? `${item.label}: ` : "";
      const location =
        item.storageProvider === "google-drive"
          ? "Drive"
          : item.storageProvider === "local-file"
            ? "local pilot store"
            : item.storageProvider;
      return `media ${item.id}: ${label}${item.fileName} (${location}).`;
    });

  return [...photoMedia, ...indexedMedia, ...eventMedia].slice(0, 8);
}

async function attachImageData(photo: JeffFieldPhoto): Promise<JeffFieldPhoto> {
  if (photo.dataUrl || photo.url) return photo;

  const imageData = await getJeffPhotoImageUrl(photo);
  return imageData.imageUrl ? { ...photo, dataUrl: imageData.imageUrl } : photo;
}

async function formatPhotoList(photos: JeffFieldPhoto[], includeImageData: boolean) {
  if (!includeImageData) return photos.map(summarizePhoto);
  return Promise.all(photos.map(attachImageData));
}

function normalizePhotoInput(value: unknown): NormalizedPhotoInput | null {
  if (!isObject(value)) return null;

  const fileName = optionalString(value.fileName) || optionalString(value.name) || "field-photo.jpg";
  const contentType = optionalString(value.contentType) || optionalString(value.type) || "image/jpeg";
  const sizeBytes = optionalNumber(value.sizeBytes) || optionalNumber(value.size) || 0;
  const dataUrl = optionalString(value.dataUrl);
  const url = optionalString(value.url);

  if (!contentType.toLowerCase().startsWith("image/")) return null;
  if (!dataUrl && !url) return null;
  if (sizeBytes > MAX_RUNTIME_PHOTO_BYTES) return null;
  if (dataUrl && !dataUrl.startsWith("data:image/")) return null;

  return {
    fileName,
    contentType,
    sizeBytes,
    dataUrl,
    url,
  };
}

function normalizePhotoInputs(value: unknown) {
  if (!Array.isArray(value)) return [];

  return value
    .slice(0, MAX_PHOTOS_PER_UPLOAD)
    .map(normalizePhotoInput)
    .filter((photo): photo is NormalizedPhotoInput => Boolean(photo));
}

async function buildStoredPhotos(input: {
  normalizedPhotos: NormalizedPhotoInput[];
  jobId?: string;
  sessionId?: string;
  uploadedBy?: string;
  sourceChannel?: JeffFieldChannel;
  label?: string;
  note?: string;
  attachmentStatus: JeffFieldPhoto["attachmentStatus"];
}) {
  const uploadedAt = nowIso();
  const warnings: string[] = [];
  const photos: JeffFieldPhoto[] = [];
  const media: JeffMediaItem[] = [];

  for (const normalizedPhoto of input.normalizedPhotos) {
    const photoId = makeId("jeff-photo");
    const mediaId = makeId("jeff-media");
    const stored = await persistJeffPhotoData({
      photoId,
      fileName: normalizedPhoto.fileName,
      contentType: normalizedPhoto.contentType,
      dataUrl: normalizedPhoto.dataUrl,
      url: normalizedPhoto.url,
    });

    if (stored.warning) warnings.push(stored.warning);

    const photo: JeffFieldPhoto = {
      id: photoId,
      mediaId,
      jobId: input.jobId,
      sessionId: input.sessionId,
      uploadedAt,
      uploadedBy: input.uploadedBy || "Simon",
      sourceChannel: input.sourceChannel || "upload",
      fileName: normalizedPhoto.fileName,
      contentType: normalizedPhoto.contentType,
      sizeBytes: normalizedPhoto.sizeBytes,
      label: input.label,
      note: input.note,
      url: stored.url,
      storageKey: stored.storageKey,
      dataUrl: stored.dataUrl,
      driveFileId: stored.driveFileId,
      driveWebViewLink: stored.driveWebViewLink,
      driveWebContentLink: stored.driveWebContentLink,
      storageStatus: stored.storageStatus,
      attachmentStatus: input.attachmentStatus,
    };

    photos.push(photo);
    media.push(mediaFromPhoto(photo));
  }

  const mediaStorage = await persistJeffMediaItems(media);
  if (mediaStorage.warning) warnings.push(mediaStorage.warning);

  return { photos, media, warnings, mediaStorage };
}

function normalizeBookingRisk(value: unknown): BookingRisk {
  return value === "low" || value === "medium" ? value : "high";
}

function getRequestedDate(input: Record<string, unknown>) {
  const requested = optionalString(input.targetDate) || optionalString(input.requestedDate);
  if (!requested) return undefined;

  const parsed = new Date(requested);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString().slice(0, 10);
}

function scheduleDateWindow(targetDate?: string) {
  const start = targetDate ? new Date(`${targetDate}T00:00:00-08:00`) : new Date();
  const end = new Date(start);
  end.setDate(end.getDate() + (targetDate ? 1 : 7));

  return {
    timeMin: start.toISOString(),
    timeMax: end.toISOString(),
  };
}

function scheduledDateLabel(record: PromiseRecord) {
  if (record.scheduledWindow.startIso) {
    return record.scheduledWindow.startIso.slice(0, 10);
  }

  return record.scheduledWindow.label;
}

function promiseScheduleItem(record: PromiseRecord) {
  return {
    jobId: record.id,
    customerName: record.customer.name,
    vehicle: `${record.vehicle.year || ""} ${record.vehicle.make} ${record.vehicle.model}`.trim(),
    serviceScope: record.serviceScope,
    owner: record.owner,
    status: record.status,
    jobStage: record.jobStage,
    scheduledWindow: record.scheduledWindow,
    dateLabel: scheduledDateLabel(record),
    readinessRisk: record.readinessRisk,
    topRisks: record.topRisks,
    partsStatus: record.fieldExecution?.partsChecklist || [],
  };
}

function bookingReviewReasons(input: {
  territorySupported: boolean;
  integrationsReady: boolean;
  missingIntegrations: string[];
  autoBook: boolean;
  uncertainty: BookingRisk;
  partsPickupRequired: boolean;
  existingSameDateJobs: number;
}) {
  const reasons: string[] = [];

  if (!input.territorySupported) reasons.push("Service area needs review.");
  if (!input.integrationsReady) {
    reasons.push(`Scheduling integrations are not complete: ${input.missingIntegrations.join(", ")}.`);
  }
  if (!input.autoBook) reasons.push("Requested service is not safe to auto-book.");
  if (input.uncertainty !== "low") reasons.push(`Job uncertainty is ${input.uncertainty}; add buffer or Dez review.`);
  if (input.partsPickupRequired) reasons.push("Parts pickup may consume schedule buffer.");
  if (input.existingSameDateJobs >= 2) reasons.push("There are already multiple jobs on that date.");

  return reasons;
}

function makeSchedulingRequest(input: Record<string, unknown>): AvailabilityRequest {
  return {
    service: optionalString(input.service) || optionalString(input.serviceScope) || "unknown",
    vehicle: optionalString(input.vehicle),
    notes: optionalString(input.notes),
    desiredDate: optionalString(input.requestedWindow) || optionalString(input.targetDate),
    address: {
      formatted: optionalString(input.address) || optionalString(input.formattedAddress) || "",
      city: optionalString(input.city) || optionalString(input.address) || "",
      state: optionalString(input.state) || "WA",
    },
  };
}

function photoMediaLine(photo: JeffFieldPhotoSummary) {
  const label = photo.label ? `${photo.label}: ` : "";
  const note = photo.note ? ` Note: ${photo.note}` : "";
  return `photo ${photo.id}: ${label}${photo.fileName} (${Math.round(photo.sizeBytes / 1024)} KB).${note}`;
}

function getStopPoints(job: JeffFieldJob) {
  const stopPoints = new Set<string>();

  if (job.customerApproval.status !== "approved" && job.customerApproval.status !== "not-needed") {
    stopPoints.add("Customer approval is required before extra work, replacement parts, or customer promises.");
  }
  if (job.topRisks.length > 0) {
    for (const risk of job.topRisks) stopPoints.add(risk);
  }
  if (job.serviceScope.toLowerCase().includes("diagnostic")) {
    stopPoints.add("Do not replace parts until the failed test is recorded.");
  }
  stopPoints.add("Exact service data, wiring diagrams, torque specs, and OEM procedures must be verified before precision work.");
  stopPoints.add("Parts purchasing is blocked in this MVP; Jeff may draft an escalation only.");

  return [...stopPoints];
}

function getLatestConcern(job: JeffFieldJob, events: JeffFieldEvent[]) {
  const eventConcern = events.find((event) => event.extractedFacts.symptoms?.length);
  if (eventConcern?.extractedFacts.symptoms?.length) {
    return eventConcern.extractedFacts.symptoms.join("; ");
  }

  return job.readinessSummary || job.serviceScope;
}

function getTestsAndReadings(job: JeffFieldJob, events: JeffFieldEvent[]) {
  const values = new Set<string>();

  for (const event of events) {
    for (const test of event.extractedFacts.testsPerformed || []) values.add(test);
    for (const reading of event.extractedFacts.readings || []) values.add(reading);
  }

  if (job.fieldExecution?.inspectionChecklist) {
    for (const item of job.fieldExecution.inspectionChecklist) values.add(`Planned check: ${item}`);
  }

  return [...values].slice(0, 10);
}

function getPartsStatus(job: JeffFieldJob, events: JeffFieldEvent[]) {
  const values = new Set<string>();
  for (const part of job.fieldExecution?.partsPlan || []) {
    values.add(
      `${part.label}: ${part.status}${part.vendor ? ` at ${part.vendor}` : ""}${
        part.fitmentNotes ? ` (${part.fitmentNotes})` : ""
      }`,
    );
  }
  for (const item of job.fieldExecution?.partsChecklist || []) values.add(item);
  for (const event of events) {
    if (event.extractedFacts.partNeeded) {
      values.add(`Spoken/requested part: ${event.extractedFacts.partNeeded}`);
    }
  }
  if (values.size === 0) values.add("No approved repair parts are recorded yet.");
  values.add("Purchasing is blocked in this MVP.");

  return [...values];
}

function factsConflictWithJob(job: JeffFieldJob, facts: JeffExtractedFacts) {
  const conflicts: string[] = [];
  const expectedVehicle = vehicleLabel(job).toLowerCase();

  if (facts.vehicle) {
    const factVehicle = facts.vehicle.toLowerCase();
    const expectedTokens = expectedVehicle.split(/\s+/).filter(Boolean);
    const matched = expectedTokens.filter((token) => factVehicle.includes(token)).length;
    if (matched < Math.min(expectedTokens.length, 2)) {
      conflicts.push(`Vehicle mismatch: field fact "${facts.vehicle}" does not match ${vehicleLabel(job)}.`);
    }
  }

  if (facts.customerName && !job.customer.name.toLowerCase().includes(facts.customerName.toLowerCase())) {
    conflicts.push(`Customer mismatch: field fact "${facts.customerName}" does not match ${job.customer.name}.`);
  }

  if (facts.authorization?.toLowerCase().includes("approved") && job.customerApproval.status !== "approved") {
    conflicts.push("Spoken approval conflicts with the job record; written approval is not recorded.");
  }

  return conflicts;
}

const COMMON_VEHICLE_MAKES = new Map([
  ["acura", "acura"],
  ["audi", "audi"],
  ["bmw", "bmw"],
  ["buick", "buick"],
  ["cadillac", "cadillac"],
  ["chevrolet", "chevrolet"],
  ["chevy", "chevrolet"],
  ["chrysler", "chrysler"],
  ["dodge", "dodge"],
  ["ford", "ford"],
  ["gmc", "gmc"],
  ["honda", "honda"],
  ["hyundai", "hyundai"],
  ["infiniti", "infiniti"],
  ["jeep", "jeep"],
  ["kia", "kia"],
  ["lexus", "lexus"],
  ["lincoln", "lincoln"],
  ["mazda", "mazda"],
  ["mercedes", "mercedes"],
  ["mercedes-benz", "mercedes"],
  ["mercury", "mercury"],
  ["nissan", "nissan"],
  ["pontiac", "pontiac"],
  ["ram", "ram"],
  ["saturn", "saturn"],
  ["subaru", "subaru"],
  ["toyota", "toyota"],
  ["volkswagen", "volkswagen"],
  ["vw", "volkswagen"],
  ["volvo", "volvo"],
]);

function normalizedVehicleMake(value?: string) {
  const make = value?.trim().toLowerCase();
  if (!make) return undefined;
  return COMMON_VEHICLE_MAKES.get(make) || make;
}

function mentionedVehicleMakes(text: string) {
  const normalized = text.toLowerCase();
  const makes = new Set<string>();

  for (const [alias, make] of COMMON_VEHICLE_MAKES) {
    const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (new RegExp(`\\b${escaped}\\b`, "i").test(normalized)) {
      makes.add(make);
    }
  }

  return makes;
}

function mentionedVehicleYears(text: string) {
  return new Set(
    [...text.matchAll(/\b(19|20)\d{2}\b/g)].map((match) => Number(match[0])),
  );
}

function jobReferenceConflict(input: {
  job: JeffFieldJob;
  customerName?: string;
  customerPhone?: string;
  vehicle?: string;
  referenceText?: string;
}) {
  const conflicts: string[] = [];
  const facts: JeffExtractedFacts = {
    customerName: input.customerName,
    vehicle: input.vehicle,
  };

  conflicts.push(...factsConflictWithJob(input.job, facts));

  const suppliedPhone = normalizePhone(input.customerPhone || "");
  const jobPhone = normalizePhone(input.job.customer.phone);
  if (suppliedPhone && jobPhone && suppliedPhone !== jobPhone) {
    conflicts.push(
      `Phone mismatch: supplied phone ${suppliedPhone} does not match ${input.job.customer.name}'s job phone ${jobPhone}.`,
    );
  }

  const referenceText = [
    input.referenceText,
    input.customerName,
    input.customerPhone,
    input.vehicle,
  ].filter(Boolean).join(" ");

  if (!referenceText.trim()) return conflicts;

  const lowerText = referenceText.toLowerCase();
  const expectedCustomerTokens = input.job.customer.name.toLowerCase().split(/\s+/).filter((token) => token.length > 2);
  if (/\btammy\b|\bwilson\b/i.test(lowerText) && !expectedCustomerTokens.some((token) => token === "tammy" || token === "wilson")) {
    conflicts.push(`Customer reference appears to be Tammy Wilson, not ${input.job.customer.name}.`);
  }

  const expectedMake = normalizedVehicleMake(input.job.vehicle.make);
  const makes = mentionedVehicleMakes(referenceText);
  if (makes.size > 0 && expectedMake && !makes.has(expectedMake)) {
    conflicts.push(
      `Vehicle make mismatch: request mentions ${[...makes].join(", ")} but selected job is ${vehicleLabel(input.job)}.`,
    );
  }

  const years = mentionedVehicleYears(referenceText);
  if (years.size > 0 && input.job.vehicle.year && !years.has(input.job.vehicle.year)) {
    conflicts.push(
      `Vehicle year mismatch: request mentions ${[...years].join(", ")} but selected job is ${vehicleLabel(input.job)}.`,
    );
  }

  return [...new Set(conflicts)];
}

function optionalMoneyAmount(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return undefined;
  const normalized = value.replace(/,/g, "").match(/-?\d+(?:\.\d+)?/);
  if (!normalized) return undefined;
  const amount = Number(normalized[0]);
  return Number.isFinite(amount) ? amount : undefined;
}

function optionalHourAmount(value: unknown) {
  const numeric = optionalMoneyAmount(value);
  if (numeric !== undefined) return numeric;
  if (typeof value !== "string") return undefined;
  const normalized = value.toLowerCase();
  if (/\btwo\b/.test(normalized)) return 2;
  if (/\bone\b/.test(normalized)) return 1;
  if (/\bthree\b/.test(normalized)) return 3;
  if (/\bfour\b/.test(normalized)) return 4;
  return undefined;
}

function normalizeQuoteDraftOwner(value: unknown): PromiseRecord["owner"] {
  return value === "Simon" || value === "Unassigned" ? value : "Dez";
}

function normalizeQuoteDraftRisk(value: unknown): PromiseRecord["readinessRisk"] {
  return value === "low" || value === "high" ? value : "medium";
}

function normalizeQuoteDraftContactPreference(value: unknown): PromiseRecord["customer"]["preferredContact"] {
  return value === "text" || value === "email" || value === "call" ? value : "call";
}

function hasCustomerPaymentSurface(payment: JeffFieldJob["paymentCollection"]) {
  if (!payment) return false;
  return Boolean(
    payment.depositRequestedAmount !== undefined ||
      payment.depositCheckoutUrl ||
      payment.balanceDueAmount !== undefined ||
      payment.balanceCheckoutUrl ||
      payment.amountCollected !== undefined ||
      payment.status === "deposit-requested" ||
      payment.status === "awaiting-payment" ||
      payment.status === "partial" ||
      payment.status === "paid",
  );
}

function quoteDraftReviewUrls(promise: PromiseRecord) {
  const baseUrl = getAppBaseUrl().replace(/\/+$/, "");
  return {
    opsReviewUrl: `${baseUrl}/ops/promises/${promise.id}`,
    customerStatusUrl: promise.customerAccess.sharePath.startsWith("http")
      ? promise.customerAccess.sharePath
      : `${baseUrl}${promise.customerAccess.sharePath}`,
  };
}

function buildQuoteDraftCustomerMessage(input: {
  serviceScope: string;
  quoteAmount?: number;
  caveats: string[];
}) {
  const caveats = input.caveats.length
    ? input.caveats
    : [
        "This does not include parts, module replacement, key/fob work, or repair labor beyond the quoted scope.",
        "If additional parts or repair time are needed, WrenchReady will explain that and get approval before moving forward.",
      ];

  return [
    `This quote is for ${input.serviceScope}.`,
    input.quoteAmount !== undefined ? `Quoted amount: $${input.quoteAmount}.` : undefined,
    ...caveats,
  ].filter(Boolean).join(" ");
}

function buildQuoteDraftExecutionPacket(input: {
  serviceScope: string;
  priorDiagnosticFacts: string[];
  diagnosticChecklist: string[];
  partsChecklist: string[];
  requiredTools: string[];
  mfgSpecs: string[];
  serviceDataChecks: string[];
  fitmentCautions: string[];
  photosRequired: string[];
  handoffChecklist: string[];
  notesTemplate?: string;
}): PromiseFieldExecutionPacket {
  return {
    serviceGoal: input.serviceScope,
    partsChecklist: input.partsChecklist.length
      ? input.partsChecklist
      : ["No parts are approved by this quote draft; quote or approve parts separately after diagnosis."],
    requiredTools: input.requiredTools,
    mfgSpecs: input.mfgSpecs,
    serviceDataChecks: input.serviceDataChecks,
    fitmentCautions: input.fitmentCautions,
    photosRequired: input.photosRequired.length
      ? input.photosRequired
      : ["Capture test evidence that supports the recommendation."],
    inspectionChecklist: input.diagnosticChecklist.length
      ? input.diagnosticChecklist
      : input.priorDiagnosticFacts.length
        ? input.priorDiagnosticFacts
        : ["Confirm customer complaint.", "Record before/after readings for the quoted diagnostic block."],
    handoffChecklist: input.handoffChecklist.length
      ? input.handoffChecklist
      : [
          "Confirm quote scope, caveats, amount, and arrival window before customer send.",
          "Confirm the customer understands parts or extra repair time require separate approval.",
        ],
    comebackPreventionSteps: ["State what is proven versus suspected before recommending parts."],
    notesTemplate: input.notesTemplate,
    upsellFocus: [],
    closeoutSteps: ["Save final diagnostic evidence.", "Prepare a customer recap before payment collection."],
  };
}

function summarizeQuoteDraftPromise(promise: PromiseRecord) {
  return {
    id: promise.id,
    customerName: promise.customer.name,
    customerPhone: promise.customer.phone,
    vehicle: `${promise.vehicle.year || ""} ${promise.vehicle.make} ${promise.vehicle.model}`.trim(),
    serviceScope: promise.serviceScope,
    scheduledWindow: promise.scheduledWindow,
    customerApproval: promise.customerApproval,
    paymentCollection: promise.paymentCollection,
    jobStage: promise.jobStage,
    readinessRisk: promise.readinessRisk,
    nextAction: promise.nextAction,
  };
}

export async function prepareQuoteDraftForReview(payload: unknown) {
  const input = isObject(payload) ? payload : {};
  const jobId = optionalString(input.jobId);
  const customerName = optionalString(input.customerName);
  const customerPhone = optionalString(input.customerPhone) || optionalString(input.phone);
  const customerEmail = optionalString(input.customerEmail) || optionalString(input.email);
  const vehicle = optionalString(input.vehicle) || optionalString(input.vehicleLabel);
  const address = optionalString(input.address);
  const requestedWindow =
    optionalString(input.requestedWindow) ||
    optionalString(input.scheduledWindowLabel) ||
    optionalString(input.targetWindow);
  const serviceScope =
    optionalString(input.serviceScope) ||
    optionalString(input.quoteScope) ||
    optionalString(input.requestedService) ||
    optionalString(input.serviceGoal);
  const quoteAmount =
    optionalMoneyAmount(input.quoteAmount) ??
    optionalMoneyAmount(input.requestedAmount) ??
    optionalMoneyAmount(input.amount);
  const laborHours =
    optionalHourAmount(input.laborHours) ||
    optionalHourAmount(input.quotedHours) ||
    optionalHourAmount(input.diagnosticHours);
  const partsCostAmount = optionalMoneyAmount(input.partsCostAmount);
  const caveats = [
    ...stringList(input.caveats),
    optionalString(input.customerPromiseImpact),
  ].filter((entry): entry is string => Boolean(entry));
  const priorDiagnosticFacts = stringList(input.priorDiagnosticFacts);
  const diagnosticChecklist = [
    ...stringList(input.diagnosticChecklist),
    ...stringList(input.nextTests),
  ];
  const partsChecklist = stringList(input.partsChecklist);
  const requiredTools = stringList(input.requiredTools);
  const mfgSpecs = [
    ...stringList(input.mfgSpecs),
    ...stringList(input.manufacturerSpecs),
    ...stringList(input.specs),
  ];
  const serviceDataChecks = [
    ...stringList(input.serviceDataChecks),
    ...stringList(input.serviceInfoChecks),
  ];
  const fitmentCautions = [
    ...stringList(input.fitmentCautions),
    ...stringList(input.partsFitmentCautions),
  ];
  const photosRequired = stringList(input.photosRequired);
  const handoffChecklist = stringList(input.handoffChecklist);
  const quoteSummary =
    optionalString(input.quoteSummary) ||
    [
      serviceScope,
      quoteAmount !== undefined ? `$${quoteAmount}` : undefined,
      requestedWindow,
    ].filter(Boolean).join(" / ");

  const missingFacts = [
    !serviceScope ? "service scope" : undefined,
    !customerName && !jobId ? "customer name or job id" : undefined,
    !vehicle && !jobId ? "vehicle or job id" : undefined,
  ].filter((fact): fact is string => Boolean(fact));

  if (missingFacts.length > 0) {
    return blocked(
      "prepare_quote_draft_for_review",
      `I need ${missingFacts.join(", ")} before I can create a real quote draft.`,
      {
        quoteDraftStatus: "blocked-missing-facts",
        missingFacts,
        paymentLinkCreated: false,
        customerSendStatus: "not-sent",
      },
    );
  }

  const lookup = jobId ? await findJob(jobId) : await resolveFieldJob({ customerName, callerPhone: customerPhone, vehicle });
  const warnings = [...lookup.warnings];
  const selectedJob = "job" in lookup ? lookup.job : undefined;
  const selectedJobConflicts = selectedJob
    ? jobReferenceConflict({
        job: selectedJob,
        customerName,
        customerPhone,
        vehicle,
        referenceText: [
          serviceScope,
          quoteSummary,
          address,
          requestedWindow,
          ...caveats,
          ...priorDiagnosticFacts,
        ].filter(Boolean).join(" "),
      })
    : [];
  const safeSelectedJob = selectedJob && selectedJobConflicts.length === 0 ? selectedJob : undefined;
  const selectedJobHasPaymentSurface = safeSelectedJob
    ? hasCustomerPaymentSurface(safeSelectedJob.paymentCollection)
    : false;
  const targetPromiseId =
    safeSelectedJob &&
    safeSelectedJob.source === "promise-crm" &&
    !selectedJobHasPaymentSurface
      ? safeSelectedJob.id
      : undefined;

  if (safeSelectedJob && safeSelectedJob.source !== "promise-crm") {
    warnings.push("Selected job is a fixture; created a real CRM quote draft instead of editing fixture data.");
  }
  if (safeSelectedJob && selectedJobHasPaymentSurface) {
    warnings.push("Selected job already has customer-facing payment state; created a separate quote draft to avoid mixing payment and quote review.");
  }

  const resolvedCustomerName = safeSelectedJob
    ? safeSelectedJob.customer.name
    : customerName;
  const resolvedVehicle = safeSelectedJob
    ? vehicleLabel(safeSelectedJob)
    : vehicle;

  if (!resolvedCustomerName || !resolvedVehicle || !serviceScope) {
    return blocked(
      "prepare_quote_draft_for_review",
      "I could not safely identify enough customer, vehicle, and scope detail to create the quote draft.",
      {
        quoteDraftStatus: "blocked-unsafe-identification",
        rejectedJobId: selectedJobConflicts.length > 0 ? selectedJob?.id : undefined,
        conflicts: selectedJobConflicts,
        paymentLinkCreated: false,
        customerSendStatus: "not-sent",
      },
      warnings,
    );
  }

  const fieldExecution = buildQuoteDraftExecutionPacket({
    serviceScope,
    priorDiagnosticFacts,
    diagnosticChecklist,
    partsChecklist,
    requiredTools,
    mfgSpecs,
    serviceDataChecks,
    fitmentCautions,
    photosRequired,
    handoffChecklist,
    notesTemplate: optionalString(input.notesTemplate),
  });
  const customerMessage =
    optionalString(input.customerMessage) ||
    buildQuoteDraftCustomerMessage({ serviceScope, quoteAmount, caveats });
  const notes = [
    ...priorDiagnosticFacts.map((fact) => `Prior diagnostic fact: ${fact}`),
    optionalString(input.sourceReference) ? `Source reference: ${optionalString(input.sourceReference)}` : undefined,
  ].filter((note): note is string => Boolean(note));

  let promise: PromiseRecord;
  try {
    promise = await upsertPromiseQuoteDraftForReview({
      promiseId: targetPromiseId,
      customerName: resolvedCustomerName,
      customerPhone: safeSelectedJob ? safeSelectedJob.customer.phone : customerPhone,
      customerEmail: safeSelectedJob ? safeSelectedJob.customer.email : customerEmail,
      preferredContact: normalizeQuoteDraftContactPreference(input.preferredContact),
      vehicleLabel: resolvedVehicle,
      address: safeSelectedJob ? safeSelectedJob.location.label : address,
      city: safeSelectedJob ? safeSelectedJob.location.city : optionalString(input.city),
      territory: safeSelectedJob ? safeSelectedJob.location.territory : optionalString(input.territory),
      accessNotes: safeSelectedJob ? safeSelectedJob.location.accessNotes : optionalString(input.accessNotes),
      serviceScope,
      scheduledWindowLabel: requestedWindow,
      scheduledWindowStartIso: optionalString(input.scheduledWindowStartIso),
      scheduledWindowEndIso: optionalString(input.scheduledWindowEndIso),
      quoteAmount,
      laborHours,
      partsCostAmount,
      customerMessage,
      quoteSummary,
      readinessSummary: optionalString(input.readinessSummary),
      nextAction: optionalString(input.nextAction),
      topRisks: [
        ...stringList(input.topRisks),
        ...caveats.map((caveat) => `Customer caveat: ${caveat}`),
      ],
      notes,
      fieldExecution,
      owner: normalizeQuoteDraftOwner(input.owner),
      readinessRisk: normalizeQuoteDraftRisk(input.readinessRisk),
      sourceLabel: optionalString(input.sourceLabel) || "Jeff field assistant",
    });
  } catch (error) {
    return blocked(
      "prepare_quote_draft_for_review",
      "I could not create the quote draft in the CRM. I did not send anything to the customer or create a payment link.",
      {
        quoteDraftStatus: "failed-crm-write",
        error: error instanceof Error ? error.message : "Unknown quote draft write failure.",
        paymentLinkCreated: false,
        customerSendStatus: "not-sent",
      },
      warnings,
    );
  }

  try {
    const quotePacket = buildPromiseQuotePacket(promise, {
      generatedBy: "Jeff",
      reviewOwner: "Dez",
    });
    promise = await updatePromiseRecord(promise.id, {
      quotePacket,
      noteToAdd:
        "Jeff generated WrenchReady quote packet v1: internal service plan plus customer quote draft.",
    });
  } catch (error) {
    return blocked(
      "prepare_quote_draft_for_review",
      "I created the CRM quote draft, but I could not generate the WrenchReady quote packet. I did not send anything to the customer or create a payment link.",
      {
        quoteDraftStatus: "blocked-packet-generation",
        promiseId: promise.id,
        error: error instanceof Error ? error.message : "Unknown quote packet failure.",
        paymentLinkCreated: false,
        customerSendStatus: "not-sent",
      },
      warnings,
    );
  }

  const draftJob = mapPromiseToFieldJob(promise);
  const { event, noteStatus, fieldEventStorage } = await saveEvent(
    {
      jobId: promise.id,
      channel: "approval",
      eventType: "approval_requested",
      sender: "Jeff",
      summary: `Quote draft prepared for human review: ${quoteSummary || serviceScope}`,
      extractedFacts: {
        customerName: promise.customer.name,
        vehicle: `${promise.vehicle.year || ""} ${promise.vehicle.make} ${promise.vehicle.model}`.trim(),
        authorization: "quote draft prepared; customer send and payment link not authorized",
        paymentStatus: "payment link not generated",
      },
      rawSourceReference: selectedJob?.id ? `selected-job:${selectedJob.id}` : optionalString(input.sourceReference),
      confidence: selectedJobConflicts.length > 0 ? "medium" : "high",
      needsReview: true,
    },
    draftJob,
  );
  const urls = quoteDraftReviewUrls(promise);
  const createdNewPromise = !targetPromiseId;

  return result(
    "prepare_quote_draft_for_review",
    createdNewPromise
      ? "I created a quote draft for human review. I did not send it to the customer or create a payment link."
      : "I updated the existing job with a quote draft for human review. I did not send it to the customer or create a payment link.",
    {
      quoteDraftStatus: "ready-for-human-review",
      promise: summarizeQuoteDraftPromise(promise),
      promiseId: promise.id,
      updatedExistingPromise: !createdNewPromise,
      createdNewPromise,
      customerApprovalStatus: promise.customerApproval.status,
      quoteAmount,
      quotePacket: promise.quotePacket,
      opsReviewUrl: urls.opsReviewUrl,
      customerStatusUrl: urls.customerStatusUrl,
      customerSendStatus: "not-sent",
      paymentLinkCreated: false,
      checkoutUrl: null,
      selectedJobId: selectedJob?.id,
      selectedJobConflict: selectedJobConflicts.length > 0,
      conflicts: selectedJobConflicts,
      rejectedJobId: selectedJobConflicts.length > 0 ? selectedJob?.id : undefined,
      event,
      jobRecordUpdateStatus: noteStatus,
      fieldEventStorageStatus: fieldEventStorage.status,
    },
    [...warnings, fieldEventStorage.warning].filter((warning): warning is string => Boolean(warning)),
  );
}

function getConflicts(job: JeffFieldJob, events: JeffFieldEvent[]) {
  const conflicts = new Set<string>();

  for (const event of events) {
    for (const conflict of factsConflictWithJob(job, event.extractedFacts)) {
      conflicts.add(conflict);
    }
    if (event.needsReview) {
      conflicts.add(`Needs review from ${event.channel}: ${event.summary}`);
    }
  }

  return [...conflicts];
}

function getOpenApprovalsAndBlockers(job: JeffFieldJob, conflicts: string[]) {
  const blockers = new Set<string>();

  if (job.customerApproval.status !== "approved" && job.customerApproval.status !== "not-needed") {
    blockers.add(customerApprovalLabel(job));
  }

  for (const risk of job.topRisks) blockers.add(risk);
  for (const conflict of conflicts) blockers.add(conflict);

  return [...blockers];
}

function getSafeNextActions(job: JeffFieldJob, conflicts: string[]) {
  if (conflicts.length > 0) {
    return [
      "Pause field advice that depends on the conflicting facts.",
      "Ask Simon to verify customer, vehicle, VIN, or approval before continuing.",
      "Record the correction as a field event.",
    ];
  }

  const actions = [
    job.nextAction,
    "Ask Simon what he sees, what changed, and which test result he already has.",
    "Log the field note before the call ends.",
  ];

  if (job.fieldExecution?.photosRequired?.length) {
    actions.push(`Capture proof: ${job.fieldExecution.photosRequired.slice(0, 3).join(", ")}.`);
  }

  if (job.paymentCollection?.status && job.paymentCollection.status !== "paid") {
    actions.push("Check invoice/payment readiness before customer handoff.");
  }

  return actions.filter(Boolean);
}

function buildContextPacket(
  job: JeffFieldJob,
  events = getEventsForJob(job),
  durableMemories: JeffDurableMemorySummary[] = [],
  latestConversationSummaries: JeffConversationSummary[] = [],
  latestWorkspaceSnapshot?: JeffContextPacket["latestWorkspaceSnapshot"],
  media: JeffMediaItem[] = [],
): JeffContextPacket {
  const latestPhotos = mergePhotos(
    getPhotosForJob(job.id),
    media.filter((item) => item.jobId === job.id).map(photoFromMedia),
  ).slice(0, 8).map(summarizePhoto);
  const conflicts = getConflicts(job, events);

  return {
    generatedAt: nowIso(),
    job,
    durableMemories,
    latestConversationSummaries,
    latestWorkspaceSnapshot,
    authorizedScope: job.serviceScope,
    stopPoints: getStopPoints(job),
    latestConcern: getLatestConcern(job, events),
    latestTestsAndReadings: getTestsAndReadings(job, events),
    latestMediaAndReports: getMediaAndReports(events, latestPhotos, media),
    latestPhotos,
    partsStatus: getPartsStatus(job, events),
    invoicePaymentStatus: paymentStatusLabel(job),
    openApprovalsAndBlockers: getOpenApprovalsAndBlockers(job, conflicts),
    latestEvents: events.slice(0, 10),
    conflicts,
    safeNextActions: getSafeNextActions(job, conflicts),
    authority: {
      diagnosticAdvice: "allowed",
      fieldNoteLogging: "allowed",
      escalationDrafts: "allowed",
      closeoutDrafts: "allowed",
      partsPurchasing: "blocked",
    },
  };
}

async function buildStoredContextPacket(job: JeffFieldJob) {
  const [storedEvents, durableMemory, workspace, persistedMedia] = await Promise.all([
    getStoredEventsForJob(job),
    listApprovedJeffDurableMemories(12),
    listPersistedJeffJobWorkspace(job.id),
    listPersistedJeffMedia({ jobId: job.id, limit: 50 }),
  ]);

  return {
    context: buildContextPacket(
      job,
      storedEvents.events,
      durableMemory.memories.map(summarizeDurableMemory),
      workspace.summaries.slice(0, 5),
      workspace.latestSnapshot,
      persistedMedia.media,
    ),
    warnings: [
      ...storedEvents.warnings,
      ...durableMemory.warnings,
      ...workspace.warnings,
      ...persistedMedia.warnings,
    ],
    eventStorageStatus: storedEvents.storageStatus,
    memoryStorageStatus: durableMemory.storageStatus,
    workspaceStorageStatus: workspace.storageStatus,
    mediaStorageStatus: persistedMedia.storageStatus,
    media: persistedMedia.media,
    workspace,
  };
}

function getPhotoStorageStatus(photos: JeffFieldPhotoSummary[]): JeffFieldFile["storage"]["photos"] {
  if (photos.length === 0) return "metadata-only";

  const statuses = new Set(photos.map((photo) => photo.storageStatus));
  if (statuses.size === 1) return photos[0].storageStatus;
  return "mixed";
}

async function buildJeffFieldFile(job: JeffFieldJob): Promise<JeffFieldFile> {
  const storedContext = await buildStoredContextPacket(job);
  const photos = mergePhotos(
    getPhotosForJob(job.id),
    storedContext.media.map(photoFromMedia),
  ).slice(0, 20).map(summarizePhoto);
  const fieldEventStorage =
    storedContext.eventStorageStatus === "supabase-field-event"
      ? "supabase-field-event"
      : storedContext.eventStorageStatus === "local-file"
        ? "local-file"
      : storedContext.eventStorageStatus === "failed"
        ? "failed"
        : storedContext.eventStorageStatus === "not-configured"
          ? "not-configured"
          : "runtime-memory";

  return {
    generatedAt: nowIso(),
    job,
    promiseNotes: job.notes,
    fieldEvents: storedContext.context.latestEvents,
    fieldPhotos: photos,
    media: storedContext.media,
    conversations: storedContext.workspace.conversations,
    conversationSummaries: storedContext.workspace.summaries,
    workspaceSnapshot: storedContext.workspace.latestSnapshot,
    context: storedContext.context,
    storage: {
      jobRecord: job.source,
      promiseNotes: job.source === "promise-crm" ? "promise-crm" : "fixture-only",
      fieldEvents: fieldEventStorage,
      conversations: storedContext.workspaceStorageStatus,
      photos: getPhotoStorageStatus(photos),
      media: storedContext.mediaStorageStatus,
    },
    warnings: storedContext.warnings,
  };
}

function result<T>(tool: string, assistantSay: string, data: T, warnings: string[] = []): JeffToolResult<T> {
  return {
    success: true,
    tool,
    assistantSay,
    data,
    warnings,
  };
}

function blocked<T>(tool: string, assistantSay: string, data: T, warnings: string[] = []): JeffToolResult<T> {
  return {
    success: false,
    tool,
    assistantSay,
    data,
    warnings,
  };
}

async function appendVisiblePromiseNote(job: JeffFieldJob, note: string) {
  if (job.source !== "promise-crm") {
    return "fixture-only";
  }

  try {
    await updatePromiseRecord(job.id, {
      noteToAdd: note,
    });
    return "updated";
  } catch {
    return "event-saved-note-update-failed";
  }
}

async function saveEvent(input: RecordEventInput, job?: JeffFieldJob) {
  const event: JeffFieldEvent = {
    id: makeId("jeff-event"),
    jobId: input.jobId,
    type: normalizeEventType(input.eventType),
    channel: normalizeChannel(input.channel),
    timestamp: nowIso(),
    sender: input.sender || "Simon",
    summary: input.summary.trim(),
    extractedFacts: normalizeExtractedFacts(input.extractedFacts),
    rawSourceReference: optionalString(input.rawSourceReference),
    confidence: normalizeConfidence(input.confidence),
    needsReview: Boolean(input.needsReview),
  };

  getRuntimeState().events = [event, ...getRuntimeState().events].slice(0, 500);

  const fieldEventStorage = await persistJeffFieldEvent(event);

  const noteStatus = job
    ? await appendVisiblePromiseNote(
        job,
        `Jeff field event (${event.channel}/${event.type}): ${event.summary}`,
      )
    : "job-not-loaded";

  return { event, noteStatus, fieldEventStorage };
}

function extractOpenAIText(value: unknown): string {
  if (!isObject(value)) return "";

  const outputText = optionalString(value.output_text);
  if (outputText) return outputText;

  const chunks: string[] = [];
  const output = Array.isArray(value.output) ? value.output : [];

  for (const item of output) {
    if (!isObject(item)) continue;
    const content = Array.isArray(item.content) ? item.content : [];
    for (const part of content) {
      if (!isObject(part)) continue;
      const text = optionalString(part.text);
      if (text) chunks.push(text);
    }
  }

  return chunks.join("\n").trim();
}

function extractOpenAIErrorMessage(value: unknown) {
  if (!isObject(value)) return undefined;

  const direct = optionalString(value.error) || optionalString(value.message);
  if (direct) return direct;

  if (isObject(value.error)) {
    return optionalString(value.error.message) || optionalString(value.error.code);
  }

  return undefined;
}

function buildPhotoAnalysisPrompt(job: JeffFieldJob, photo: JeffFieldPhoto, question?: string) {
  const context = buildContextPacket(job);
  return [
    "You are Jeff, WrenchReady's field assistant for Simon.",
    "Inspect the field photo for visible, mechanic-relevant evidence only.",
    "Do not claim certainty from the photo alone. Do not invent exact service data, wiring colors, torque specs, VINs, or part fitment.",
    "Return a concise field answer with: visible observations, possible relevance, what Simon should verify next, and whether a retake is needed.",
    `Job: ${job.customer.name}, ${vehicleLabel(job)}, scope: ${job.serviceScope}.`,
    `Current concern: ${context.latestConcern}.`,
    `Photo: ${photo.label || "unlabeled"} ${photo.fileName}. Note: ${photo.note || "none"}.`,
    question ? `Simon's question: ${question}` : undefined,
  ]
    .filter(Boolean)
    .join("\n");
}

async function analyzePhotoWithOpenAI(job: JeffFieldJob, photo: JeffFieldPhoto, question?: string) {
  const apiKey = readEnv("OPENAI_API_KEY");
  const model = readEnv("JEFF_FIELD_VISION_MODEL", "JEFF_FIELD_REASONING_MODEL") || "gpt-5.5";
  const imageData = await getJeffPhotoImageUrl(photo);
  const imageUrl = imageData.imageUrl;

  if (!apiKey) {
    return {
      ok: false,
      model,
      analysis: "",
      warning: "OPENAI_API_KEY is not configured, so Jeff cannot inspect field photos yet.",
    };
  }

  if (!imageUrl) {
    return {
      ok: false,
      model,
      analysis: "",
      warning: imageData.warning || "The selected photo has no image data or external URL available for analysis.",
    };
  }

  const requestBody: Record<string, unknown> = {
    model,
    input: [
      {
        role: "user",
        content: [
          { type: "input_text", text: buildPhotoAnalysisPrompt(job, photo, question) },
          { type: "input_image", image_url: imageUrl },
        ],
      },
    ],
  };

  if (modelSupportsReasoning(model)) {
    requestBody.reasoning = { effort: getJeffReasoningEffort() };
  }

  const response = await fetch(OPENAI_RESPONSES_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });

  const responseBody = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = extractOpenAIErrorMessage(responseBody);
    return {
      ok: false,
      model,
      analysis: "",
      warning: message || `OpenAI photo analysis failed with status ${response.status}.`,
    };
  }

  return {
    ok: true,
    model,
    analysis: extractOpenAIText(responseBody),
    warning: undefined,
  };
}

function buildSessionPhotoAnalysisPrompt(photo: JeffFieldPhoto, question?: string) {
  return [
    "You are Jeff, WrenchReady's field assistant for Simon.",
    "This is a live tutorial or unattached session photo, not a confirmed job photo.",
    "Inspect visible evidence only. Do not diagnose a vehicle, recommend a part, claim exact service data, or make a customer/job-specific call without vehicle and job context.",
    "Return a concise field answer with: what is visibly in the image, whether the image is clear enough, and what Simon should send or say next if this were a real job.",
    `Photo: ${photo.label || "unlabeled"} ${photo.fileName}. Note: ${photo.note || "none"}.`,
    question ? `Simon's question: ${question}` : undefined,
  ]
    .filter(Boolean)
    .join("\n");
}

async function analyzeSessionPhotoWithOpenAI(photo: JeffFieldPhoto, question?: string) {
  const apiKey = readEnv("OPENAI_API_KEY");
  const model = readEnv("JEFF_FIELD_VISION_MODEL", "JEFF_FIELD_REASONING_MODEL") || "gpt-5.5";
  const imageData = await getJeffPhotoImageUrl(photo);
  const imageUrl = imageData.imageUrl;

  if (!apiKey) {
    return {
      ok: false,
      model,
      analysis: "",
      warning: "OPENAI_API_KEY is not configured, so Jeff cannot inspect field photos yet.",
    };
  }

  if (!imageUrl) {
    return {
      ok: false,
      model,
      analysis: "",
      warning: imageData.warning || "The selected photo has no image data or external URL available for analysis.",
    };
  }

  const requestBody: Record<string, unknown> = {
    model,
    input: [
      {
        role: "user",
        content: [
          { type: "input_text", text: buildSessionPhotoAnalysisPrompt(photo, question) },
          { type: "input_image", image_url: imageUrl },
        ],
      },
    ],
  };

  if (modelSupportsReasoning(model)) {
    requestBody.reasoning = { effort: getJeffReasoningEffort() };
  }

  const response = await fetch(OPENAI_RESPONSES_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });

  const responseBody = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = extractOpenAIErrorMessage(responseBody);
    return {
      ok: false,
      model,
      analysis: "",
      warning: message || `OpenAI photo analysis failed with status ${response.status}.`,
    };
  }

  return {
    ok: true,
    model,
    analysis: extractOpenAIText(responseBody),
    warning: undefined,
  };
}

export function authorizeJeffToolRequest(request: Request): ToolAuthResult {
  const requiredSecret = readEnv("JEFF_FIELD_ASSISTANT_TOOL_SECRET");
  if (!requiredSecret) {
    return isProductionRuntime()
      ? {
          authorized: false,
          status: 503,
          message: "Jeff field assistant tool secret is not configured.",
        }
      : { authorized: true };
  }

  const authHeader = request.headers.get("authorization") || "";
  const bearer = authHeader.match(/^Bearer\s+(.+)$/i)?.[1];
  const provided =
    bearer ||
    request.headers.get("x-jeff-field-secret") ||
    request.headers.get("x-vapi-secret") ||
    "";

  if (provided && secretsMatch(provided, requiredSecret)) return { authorized: true };

  return {
    authorized: false,
    status: 401,
    message: "Jeff field assistant tool request is not authorized.",
  };
}

export async function getJeffFieldFile(jobId: string) {
  const { job, warnings } = await findJob(jobId);
  if (!job) {
    return {
      fieldFile: null,
      warnings,
    };
  }

  const fieldFile = await buildJeffFieldFile(job);
  return {
    fieldFile,
    warnings: [...warnings, ...fieldFile.warnings],
  };
}

export async function getJeffFieldFiles() {
  const { jobs, warnings } = await getAllJobs();
  const allowFixtures = jeffFixturesEnabled();
  const fieldFiles = await Promise.all(
    jobs
      .filter((job) => job.owner === "Simon" || job.source === "promise-crm")
      .filter((job) => isJeffFieldSelectableJob(job, allowFixtures))
      .slice(0, 30)
      .map(buildJeffFieldFile),
  );

  return {
    fieldFiles,
    warnings: [...warnings, ...fieldFiles.flatMap((file) => file.warnings)],
  };
}

export async function getJeffMemoryReviewQueue() {
  const memory = await listPersistedJeffDurableMemories({
    statuses: ["candidate", "approved"],
    limit: 100,
  });

  return {
    memories: memory.memories.filter((entry) => !isJeffEvaluationMemory(entry)),
    warnings: memory.warnings,
    storageStatus: memory.storageStatus,
  };
}

export async function getJeffWorkspaceReviewQueue() {
  const workspace = await listUnresolvedJeffConversations(25);

  return {
    conversations: workspace.conversations,
    summaries: workspace.summaries,
    warnings: workspace.warnings,
    storageStatus: workspace.storageStatus,
  };
}

export async function setJeffCoreMemoryStatus(input: {
  id: string;
  status: JeffDurableMemoryStatus | string;
  approvedBy?: string;
}) {
  const id = optionalString(input.id);
  if (!id) {
    throw new Error("Jeff memory status update requires a memory id.");
  }

  return updateJeffDurableMemoryStatus({
    id,
    status: normalizeMemoryStatus(input.status),
    approvedBy: input.approvedBy || "Dez",
  });
}

export async function setJeffConversationReviewStatus(payload: unknown) {
  const input = isObject(payload) ? payload : {};
  const conversationId = optionalString(input.conversationId);
  const reviewedBy = optionalString(input.reviewedBy) || "Dez";

  if (!conversationId) {
    return blocked(
      "set_jeff_conversation_review_status",
      "I need a Jeff conversation id before I can mark a call reviewed.",
      { conversationId },
    );
  }

  const workspace = await listPersistedJeffJobWorkspace();
  const conversation = workspace.conversations.find((entry) => entry.id === conversationId);
  const summary = workspace.summaries.find((entry) => entry.conversationId === conversationId);

  if (!conversation || !summary) {
    return blocked(
      "set_jeff_conversation_review_status",
      "I could not mark that call reviewed because the conversation or summary was not found.",
      { conversationId },
      workspace.warnings,
    );
  }

  const updatedAt = nowIso();
  const reviewedConversation: JeffConversation = {
    ...conversation,
    jobMatchStatus: conversation.jobId ? conversation.jobMatchStatus : "manual",
    needsReview: false,
    reviewReason: `Reviewed by ${reviewedBy}.`,
    updatedAt,
  };

  const storage = await persistJeffConversationWorkspace({
    conversation: reviewedConversation,
    summary: {
      ...summary,
      metadata: {
        ...summary.metadata,
        reviewedAt: updatedAt,
        reviewedBy,
      },
    },
  });

  return result(
    "set_jeff_conversation_review_status",
    "I marked that Jeff call reviewed.",
    {
      conversationId,
      reviewedAt: updatedAt,
      storageStatus: storage.status,
    },
    [...workspace.warnings, storage.warning].filter((warning): warning is string => Boolean(warning)),
  );
}

async function saveBlockedCapabilityRequest(input: {
  capabilityId?: string;
  capabilityLabel?: string;
  requestedAction: string;
  jobId?: string;
  sourceChannel?: JeffFieldChannel;
  requestedBy?: string;
  operatorAction?: string;
  missing?: string[];
}) {
  const requestedAction = input.requestedAction.trim().slice(0, 500);
  const capabilityId = (input.capabilityId || "unknown-capability").trim().slice(0, 80);
  const capabilityLabel = (input.capabilityLabel || capabilityId).trim().slice(0, 120);
  const jobId = input.jobId || GENERAL_JEFF_REQUEST_JOB_ID;
  const lookup = input.jobId ? await findJob(input.jobId) : { job: undefined, warnings: [] };
  const summary = `Blocked Jeff capability request (${capabilityLabel}): ${requestedAction}`;
  const missing = (input.missing || []).slice(0, 6);
  const { event, noteStatus, fieldEventStorage } = await saveEvent(
    {
      jobId,
      channel: input.sourceChannel || "system",
      eventType: capabilityId === "parts-purchase" ? "purchase_blocked" : "conflict_flagged",
      sender: input.requestedBy || "Simon",
      summary,
      rawSourceReference: `${BLOCKED_REQUEST_SOURCE_PREFIX}${capabilityId}`,
      extractedFacts: {
        authorization: input.operatorAction,
        partNeeded: capabilityId === "parts-purchase" ? requestedAction : undefined,
        paymentStatus: missing.length ? `missing: ${missing.join(", ")}` : undefined,
      },
      confidence: "high",
      needsReview: true,
    },
    lookup.job,
  );

  return {
    event,
    noteStatus,
    fieldEventStorage,
    warnings: lookup.warnings,
  };
}

export async function getJeffCapabilities(payload: unknown = {}) {
  const input = isObject(payload) ? payload : {};
  const requestedCapabilityId = optionalString(input.capabilityId);
  const report = await getJeffCapabilityReport();
  const requestedCapability = requestedCapabilityId
    ? report.capabilities.find((entry) => entry.id === requestedCapabilityId)
    : undefined;

  return result(
    "get_jeff_capabilities",
    requestedCapability
      ? `${requestedCapability.label} is ${requestedCapability.state}. ${requestedCapability.whatJeffShouldSay}`
      : `I checked my live WrenchReady setup: ${report.summary}`,
    {
      ...report,
      requestedCapability,
    },
    report.warnings,
  );
}

export async function getJeffOperatingContext(payload: unknown = {}) {
  const input = isObject(payload) ? payload : {};
  const focus = optionalString(input.focus);
  const context = getJeffOperatingContextPacket();
  const focusNote = focus
    ? ` Focus: ${focus}.`
    : "";

  return result(
    "get_jeff_operating_context",
    `WrenchReady operating context is loaded.${focusNote} Use it silently and answer like a practical field assistant.`,
    { context, focus },
  );
}

export async function logJeffBlockedRequest(payload: unknown) {
  const input = isObject(payload) ? payload : {};
  const capabilityId = optionalString(input.capabilityId);
  const requestedAction =
    optionalString(input.requestedAction) ||
    optionalString(input.spokenRequest) ||
    optionalString(input.request) ||
    optionalString(input.summary);

  if (!requestedAction) {
    return blocked(
      "log_jeff_blocked_request",
      "I need the requested action before I can log a blocked Jeff capability.",
      { event: null },
    );
  }

  const report = await getJeffCapabilityReport();
  const capability = capabilityId
    ? report.capabilities.find((entry) => entry.id === capabilityId)
    : report.capabilities.find((entry) => requestedAction.toLowerCase().includes(entry.label.toLowerCase()));

  const saved = await saveBlockedCapabilityRequest({
    capabilityId: capability?.id || capabilityId || "unknown-capability",
    capabilityLabel: capability?.label || optionalString(input.capabilityLabel),
    requestedAction,
    jobId: optionalString(input.jobId),
    sourceChannel: normalizeChannel(input.sourceChannel || input.channel),
    requestedBy: optionalString(input.requestedBy) || optionalString(input.sender) || "Simon",
    operatorAction: capability?.operatorAction || optionalString(input.operatorAction),
    missing: capability?.missing,
  });

  return result(
    "log_jeff_blocked_request",
    "I logged that blocked Jeff request for review.",
    {
      event: saved.event,
      capability: capability || null,
      jobRecordUpdateStatus: saved.noteStatus,
      fieldEventStorageStatus: saved.fieldEventStorage.status,
    },
    [...saved.warnings, saved.fieldEventStorage.warning].filter((warning): warning is string => Boolean(warning)),
  );
}

export async function getJeffBlockedRequestQueue(limit = 12) {
  const events = await listPersistedJeffFieldEvents("");
  const allowFixtures = jeffFixturesEnabled();
  const blockedRequests = events.events
    .filter((event) =>
      event.rawSourceReference?.startsWith(BLOCKED_REQUEST_SOURCE_PREFIX) ||
      event.summary.startsWith("Blocked Jeff capability request") ||
      event.type === "purchase_blocked"
    )
    .filter((event) => allowFixtures || !event.jobId.startsWith("jeff-fixture-"))
    .filter((event) => !/\b(red-team|webhook test|policy test|memo test|test body)\b/i.test(event.summary))
    .slice(0, Math.max(1, Math.min(limit, 50)));

  return {
    requests: blockedRequests,
    warnings: events.warnings,
    storageStatus: events.storageStatus,
  };
}

export async function getJeffPhotoDropJobs(options: { includeJobId?: string } = {}) {
  const { jobs, warnings } = await getAllJobs();
  const allowFixtures = jeffFixturesEnabled();
  const requestedJob = options.includeJobId
    ? jobs.find((job) => job.id === options.includeJobId && isJeffFieldSelectableJob(job, allowFixtures))
    : undefined;
  const activeJobs = jobs
    .filter((job) => isJeffFieldSelectableJob(job, allowFixtures))
    .filter((job) => job.owner === "Simon" || job.jobStage === "on-site" || job.jobStage === "en-route")
    .sort((a, b) => {
      const stageWeight = (job: JeffFieldJob) =>
        job.jobStage === "on-site" ? 3 : job.jobStage === "en-route" ? 2 : 1;
      return stageWeight(b) - stageWeight(a);
    })
    .filter((job) => job.id !== requestedJob?.id);
  const selectableJobs = requestedJob
    ? [requestedJob, ...activeJobs].slice(0, 12)
    : activeJobs.slice(0, 12);
  const mappedJobs = selectableJobs
    .map((job) => ({
      jobId: job.id,
      customerName: job.customer.name,
      vehicle: vehicleLabel(job),
      serviceScope: job.serviceScope,
      jobStage: job.jobStage,
      owner: job.owner,
    }));

  return {
    jobs: mappedJobs,
    warnings,
    uploadPinConfigured: Boolean(readEnv("JEFF_FIELD_PHOTO_UPLOAD_PIN")),
    maxPhotosPerUpload: MAX_PHOTOS_PER_UPLOAD,
    maxPhotoBytes: MAX_RUNTIME_PHOTO_BYTES,
  };
}

export async function getActiveFieldJob(payload: unknown) {
  const input = isObject(payload) ? payload : {};
  const body: ActiveJobInput = {
    callerPhone: optionalString(input.callerPhone),
    customerName: optionalString(input.customerName),
    vehicle: optionalString(input.vehicle),
    jobId: optionalString(input.jobId),
  };

  const { jobs, warnings } = await getAllJobs();
  const matches = getJobMatches(jobs, body);
  const selected = matches[0]?.job;
  const ambiguous = matches.length > 1 && matches[0].score === matches[1].score;
  const weakMatch = !hasSpecificLookupHint(body) || (matches[0]?.score || 0) < 20;

  if (!selected || ambiguous || weakMatch) {
    return result(
      "get_active_field_job",
      "I could not confidently find the active job. Keep helping Simon from the symptom/test facts he gives. Ask for customer, vehicle, or job id only before saving to a job file, checking approval/payment/schedule, pulling job history, or making customer-facing job-specific claims.",
      {
        job: null,
        candidates: (matches.length > 0 ? matches.map((match) => match.job) : jobs)
          .slice(0, 5)
          .map((job) => ({
            jobId: job.id,
            customerName: job.customer.name,
            vehicle: vehicleLabel(job),
            serviceScope: job.serviceScope,
            jobStage: job.jobStage,
          })),
        needsClarification: true,
      },
      warnings,
    );
  }

  const storedContext = await buildStoredContextPacket(selected);
  const context = storedContext.context;
  return result(
    "get_active_field_job",
    `I found ${selected.customer.name}'s ${vehicleLabel(selected)}. Scope: ${selected.serviceScope}. Next safe action: ${context.safeNextActions[0]}`,
    {
      job: selected,
      matchScore: matches[0].score,
      candidates: matches.slice(0, 3).map((match) => ({
        jobId: match.job.id,
        customerName: match.job.customer.name,
        vehicle: vehicleLabel(match.job),
        serviceScope: match.job.serviceScope,
        score: match.score,
      })),
      needsClarification: matches.length > 1 && matches[0].score === matches[1].score,
    },
    [...warnings, ...storedContext.warnings],
  );
}

export async function getCurrentFieldContext(payload: unknown) {
  const input = isObject(payload) ? payload : {};
  const jobId = optionalString(input.jobId);

  if (!jobId) {
    const active = await getActiveFieldJob({
      callerPhone: optionalString(input.callerPhone),
    });
    const activeData = active.data as { job: JeffFieldJob | null };
    if (!activeData.job) {
      return active;
    }
    const storedContext = await buildStoredContextPacket(activeData.job);
    const context = storedContext.context;
    return result(
      "get_current_field_context",
      `Current context is ready for ${activeData.job.customer.name}. ${context.conflicts.length ? "There are conflicts to verify before advising." : context.safeNextActions[0]}`,
      { context },
      [...active.warnings, ...storedContext.warnings],
    );
  }

  const { job, warnings } = await findJob(jobId);
  if (!job) {
    return blocked(
      "get_current_field_context",
      "I could not find that job id. Ask Simon to confirm the customer or vehicle.",
      { context: null },
      warnings,
    );
  }

  const storedContext = await buildStoredContextPacket(job);
  const context = storedContext.context;
  return result(
    "get_current_field_context",
    `Current context is ready for ${job.customer.name}. ${context.conflicts.length ? "There are conflicts to verify before advising." : context.safeNextActions[0]}`,
    { context },
    [...warnings, ...storedContext.warnings],
  );
}

export async function getRecentJeffMessages(payload: unknown) {
  const input = isObject(payload) ? payload : {};
  const limit = Math.min(Math.max(Number(input.limit) || 8, 1), 20);
  const workspace = await listPersistedJeffJobWorkspace();
  const summaryByConversation = new Map(
    workspace.summaries.map((summary) => [summary.conversationId, summary]),
  );
  const messages = workspace.conversations
    .filter(isJeffFieldThreadConversation)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit)
    .map((conversation) => {
      const source = isObject(conversation.sourcePayload) ? conversation.sourcePayload : {};
      const attachments = Array.isArray(source.attachments)
        ? source.attachments.flatMap((attachment) => {
            if (!isObject(attachment)) return [];
            const fileName = optionalString(attachment.fileName);
            if (!fileName) return [];

            return [{
              fileName,
              contentType: optionalString(attachment.contentType),
              sizeBytes: typeof attachment.sizeBytes === "number" ? attachment.sizeBytes : undefined,
              mediaId: optionalString(attachment.mediaId),
              driveFileId: optionalString(attachment.driveFileId),
              hasUrl: Boolean(optionalString(attachment.url)),
            }];
          })
        : [];
      const summary = summaryByConversation.get(conversation.id);

      return {
        conversationId: conversation.id,
        jobId: conversation.jobId,
        jobLabel: conversation.jobLabel,
        channel: conversation.channel,
        createdAt: conversation.createdAt,
        simonMessage: optionalString(source.userMessage),
        jeffReply: optionalString(source.assistantMessage) || summary?.recommendationSummary,
        fieldPhotoStatus: optionalString(source.fieldPhotoStatus),
        attachmentCount: attachments.length,
        attachments,
        warnings: [
          optionalString(source.warning),
          ...(summary?.blockers || []),
        ].filter((entry): entry is string => Boolean(entry)),
      };
    });

  return result(
    "get_recent_jeff_messages",
    messages.length
      ? `I found ${messages.length} recent Jeff app message${messages.length === 1 ? "" : "s"}.`
      : "I do not see any Jeff app messages yet.",
    {
      messages,
      storageStatus: workspace.storageStatus,
    },
    workspace.warnings,
  );
}

export async function getFieldBrief(payload: unknown) {
  const input = isObject(payload) ? payload : {};
  const jobId = optionalString(input.jobId);

  if (!jobId) {
    return blocked(
      "get_field_brief",
      "I need the job id before I can read the field brief.",
      { brief: null },
    );
  }

  const { job, warnings } = await findJob(jobId);
  if (!job) {
    return blocked("get_field_brief", "I could not find that job id.", { brief: null }, warnings);
  }

  const storedContext = await buildStoredContextPacket(job);
  const context = storedContext.context;
  const brief = {
    customer: job.customer,
    vehicle: vehicleLabel(job),
    serviceScope: job.serviceScope,
    authorizedScope: context.authorizedScope,
    approval: customerApprovalLabel(job),
    stopPoints: context.stopPoints,
    diagnosticPath: job.fieldExecution?.inspectionChecklist || [],
    partsStatus: context.partsStatus,
    invoicePaymentStatus: context.invoicePaymentStatus,
    evidenceChecklist: job.fieldExecution?.photosRequired || [],
    nextAction: context.safeNextActions[0],
  };

  return result(
    "get_field_brief",
    `${job.customer.name}, ${vehicleLabel(job)}. ${job.serviceScope}. ${context.safeNextActions[0]}`,
    { brief },
    [...warnings, ...storedContext.warnings],
  );
}

export async function recordFieldEvent(payload: unknown) {
  const input = isObject(payload) ? payload : {};
  const jobId = optionalString(input.jobId);
  const summary = optionalString(input.summary);

  if (!jobId || !summary) {
    return blocked(
      "record_field_event",
      "I need a job id and summary before I can save the field event.",
      { event: null },
    );
  }

  const { job, warnings } = await findJob(jobId);
  const extractedFacts = normalizeExtractedFacts(input.extractedFacts);
  const conflicts = job ? factsConflictWithJob(job, extractedFacts) : [];
  const { event, noteStatus, fieldEventStorage } = await saveEvent(
    {
      jobId,
      channel: normalizeChannel(input.channel),
      eventType: normalizeEventType(input.eventType),
      sender: optionalString(input.sender) || "Simon",
      summary,
      rawSourceReference: optionalString(input.rawSourceReference),
      extractedFacts,
      confidence: normalizeConfidence(input.confidence),
      needsReview: Boolean(input.needsReview) || conflicts.length > 0 || !job,
    },
    job,
  );

  return result(
    "record_field_event",
    conflicts.length
      ? "I saved the event and flagged a conflict for review."
      : "I saved that field event to the job context.",
    {
      event,
      conflicts,
      jobRecordUpdateStatus: noteStatus,
      fieldEventStorageStatus: fieldEventStorage.status,
    },
    [...warnings, fieldEventStorage.warning].filter((warning): warning is string => Boolean(warning)),
  );
}

export async function proposeCoreMemoryUpdate(payload: unknown) {
  const input = isObject(payload) ? payload : {};
  const jobId = optionalString(input.jobId);
  const memory = optionalString(input.memory);
  const category = optionalString(input.category) || "operator-preference";
  const evidence = optionalString(input.evidence);
  const sourceChannel = normalizeChannel(input.sourceChannel);

  if (!memory) {
    return blocked(
      "propose_core_memory_update",
      "I need the proposed memory before I can save it for Dez review.",
      { candidate: null },
    );
  }

  const { job, warnings } = jobId
    ? await findJob(jobId)
    : { job: null, warnings: [] as string[] };

  if (jobId && !job) {
    return blocked(
      "propose_core_memory_update",
      "I could not find that job, so I did not save the memory candidate.",
      { candidate: null },
      warnings,
    );
  }

  const subject = memorySubject(
    {
      jobId,
      subjectType: normalizeMemorySubjectType(input.subjectType),
      subjectKey: optionalString(input.subjectKey),
      subjectLabel: optionalString(input.subjectLabel),
      category,
      memory,
      evidence,
      confidence: normalizeConfidence(input.confidence),
      sensitivity: normalizeMemorySensitivity(input.sensitivity),
      sourceChannel,
    },
    job || undefined,
  );
  const createdAt = nowIso();
  let evidenceEventIds: string[] = [];
  let event: JeffFieldEvent | undefined;
  let noteStatus: string | undefined;
  let fieldEventStorageStatus: string | undefined;

  if (job) {
    const summary = [
      `Jeff durable memory candidate (${subject.category} / ${subject.subjectLabel}): ${memory}`,
      evidence ? `Evidence: ${evidence}` : undefined,
      "Status: pending Dez review; not approved for call context yet.",
    ]
      .filter(Boolean)
      .join(" ");

    const saved = await saveEvent(
      {
        jobId: job.id,
        channel: "system",
        eventType: "field_note_recorded",
        sender: "Jeff",
        summary,
        confidence: normalizeConfidence(input.confidence),
        needsReview: true,
      },
      job,
    );
    event = saved.event;
    noteStatus = saved.noteStatus;
    fieldEventStorageStatus = saved.fieldEventStorage.status;
    evidenceEventIds = [saved.event.id];
    if (saved.fieldEventStorage.warning) warnings.push(saved.fieldEventStorage.warning);
  }

  const candidate: JeffDurableMemory = {
    id: makeId("jeff-memory"),
    subjectType: subject.subjectType,
    subjectKey: subject.subjectKey,
    subjectLabel: subject.subjectLabel,
    category: subject.category,
    memory,
    evidence,
    evidenceEventIds,
    sourceJobId: job?.id,
    sourceChannel,
    status: "candidate",
    confidence: normalizeConfidence(input.confidence),
    sensitivity: normalizeMemorySensitivity(input.sensitivity),
    createdBy: "Jeff",
    createdAt,
    updatedAt: createdAt,
    metadata: {
      captureMode: "propose_core_memory_update",
      approvalRequired: true,
    },
  };
  const memoryStorage = await persistJeffDurableMemory(candidate);
  if (memoryStorage.warning) warnings.push(memoryStorage.warning);

  return result(
    "propose_core_memory_update",
    "I saved that as a durable memory candidate for Dez review. I will not use it in calls until it is approved.",
    {
      candidate: {
        id: candidate.id,
        subjectType: candidate.subjectType,
        subjectKey: candidate.subjectKey,
        subjectLabel: candidate.subjectLabel,
        category,
        memory,
        evidence,
        sensitivity: candidate.sensitivity,
        confidence: candidate.confidence,
        status: "candidate",
      },
      event,
      jobRecordUpdateStatus: noteStatus,
      fieldEventStorageStatus,
      memoryStorageStatus: memoryStorage.status,
    },
    warnings,
  );
}

export async function getScheduleContext(payload: unknown) {
  const input = isObject(payload) ? payload : {};
  const targetDate = getRequestedDate(input);
  const warnings: string[] = [];
  let promises: PromiseRecord[] = [];

  try {
    promises = await getPromiseRecords();
  } catch (error) {
    warnings.push(
      error instanceof Error
        ? error.message
        : "Promise CRM schedule records were unavailable.",
    );
  }

  const scheduleItems = promises
    .map(promiseScheduleItem)
    .filter((item) => !targetDate || item.dateLabel === targetDate || item.scheduledWindow.label.includes(targetDate))
    .slice(0, 20);
  const calendarWindow = scheduleDateWindow(targetDate);
  let googleCalendarEvents: Awaited<ReturnType<typeof listGoogleCalendarEvents>> = [];

  try {
    googleCalendarEvents = await listGoogleCalendarEvents({
      ...calendarWindow,
      maxResults: 50,
    });
  } catch (error) {
    warnings.push(
      error instanceof Error
        ? error.message
        : "Google Calendar events were unavailable.",
    );
  }

  const availability = await schedulingEngine.evaluateAvailability({
    service: optionalString(input.service) || "unknown",
    vehicle: optionalString(input.vehicle),
    notes: optionalString(input.notes),
    desiredDate: targetDate,
    address: {
      formatted: optionalString(input.address) || "",
      city: optionalString(input.city) || optionalString(input.address) || "",
      state: optionalString(input.state) || "WA",
    },
  });

  return result(
    "get_schedule_context",
    availability.requiredIntegrationsReady
      ? "Schedule context is loaded. Use it conservatively before offering a slot."
      : "Schedule context is partial because calendar/route integrations are not fully configured. Do not promise a slot.",
    {
      targetDate,
      scheduleItems,
      googleCalendarEvents,
      calendarWindow,
      schedulingIntegrationStatus: availability.requiredIntegrationsReady
        ? "ready"
        : "partial",
      missingIntegrations: availability.missingIntegrations,
      customerWindowSummary: availability.customerWindowSummary,
    },
    warnings,
  );
}

function promiseVehicleLabel(record: PromiseRecord) {
  return `${record.vehicle.year || ""} ${record.vehicle.make} ${record.vehicle.model}`.trim();
}

function shouldMirrorPromiseToCalendar(record: PromiseRecord) {
  return Boolean(
    record.status !== "completed" &&
    record.scheduledWindow.startIso &&
    record.scheduledWindow.endIso,
  );
}

function promiseCalendarSummary(record: PromiseRecord) {
  return `WR: ${record.customer.name} / ${promiseVehicleLabel(record)} / ${record.serviceScope}`;
}

function promiseCalendarDescription(record: PromiseRecord) {
  return [
    `WrenchReady CRM promise: ${record.id}`,
    `Owner: ${record.owner}`,
    `Stage: ${record.jobStage}`,
    `Status: ${record.status}`,
    `Customer: ${record.customer.name} / ${record.customer.phone}`,
    record.customer.email ? `Email: ${record.customer.email}` : undefined,
    `Vehicle: ${promiseVehicleLabel(record)}`,
    `Service: ${record.serviceScope}`,
    `Window: ${record.scheduledWindow.label}`,
    `Readiness: ${record.readinessSummary}`,
    `Next action: ${record.nextAction}`,
    record.location.accessNotes ? `Access: ${record.location.accessNotes}` : undefined,
    record.topRisks.length ? `Risks: ${record.topRisks.join("; ")}` : undefined,
  ]
    .filter(Boolean)
    .join("\n");
}

export async function syncJeffGmailInbox(payload: unknown) {
  const input = isObject(payload) ? payload : {};
  const query = optionalString(input.query);
  const maxResults = Math.max(1, Math.min(optionalNumber(input.maxResults) || 10, 25));
  const jobId = optionalString(input.jobId);
  const jobLabel = optionalString(input.jobLabel);
  const status = getGoogleWorkspaceIntegrationStatus();

  if (!status.gmail.canRead) {
    return blocked(
      "sync_jeff_gmail_inbox",
      "I cannot check Jeff's Gmail yet because Google Workspace Gmail is not connected.",
      {
        checked: 0,
        ingested: 0,
        gmailUser: status.gmail.user,
        missing: status.gmail.missing,
      },
    );
  }

  try {
    const messages = await listRecentGmailMessages({ query, maxResults });
    const ingested = await Promise.all(
      messages.map((message) =>
        ingestJeffInboundEmail({
          ...message,
          jobId,
          jobLabel,
        }),
      ),
    );

    return result(
      "sync_jeff_gmail_inbox",
      messages.length
        ? `I checked Jeff's Gmail and saved ${messages.length} message${messages.length === 1 ? "" : "s"} into the Jeff workspace.`
        : "I checked Jeff's Gmail and did not find matching new messages.",
      {
        provider: "google-workspace-gmail",
        query: query || `to:${status.gmail.user} newer_than:14d -in:sent`,
        checked: messages.length,
        ingested: ingested.length,
        conversations: ingested.map((entry) => ({
          conversationId: entry.conversation.id,
          subject: entry.conversation.subjectLabel,
          jobId: entry.conversation.jobId,
          needsReview: entry.conversation.needsReview,
          storageStatus: entry.storage.status,
        })),
      },
      ingested.flatMap((entry) => [
        entry.storage.warning,
        entry.mediaStorage.warning,
      ].filter((warning): warning is string => Boolean(warning))),
    );
  } catch (error) {
    return blocked(
      "sync_jeff_gmail_inbox",
      "I tried to check Jeff's Gmail, but Google returned an error.",
      {
        checked: 0,
        ingested: 0,
        error: error instanceof Error ? error.message : "Google Gmail sync failed.",
      },
    );
  }
}

export async function syncJeffCalendar(payload: unknown) {
  const input = isObject(payload) ? payload : {};
  const limit = Math.max(1, Math.min(optionalNumber(input.limit) || 25, 100));
  const dryRun = optionalBoolean(input.dryRun) || false;
  const status = getGoogleWorkspaceIntegrationStatus();

  let records: PromiseRecord[] = [];
  try {
    records = (await getPromiseRecords())
      .filter(shouldMirrorPromiseToCalendar)
      .slice(0, limit);
  } catch (error) {
    return blocked(
      "sync_jeff_calendar",
      "I could not read WrenchReady CRM jobs, so I cannot mirror the calendar yet.",
      {
        checked: 0,
        synced: [],
        error: error instanceof Error ? error.message : "Promise CRM records were unavailable.",
      },
    );
  }

  if (dryRun) {
    return result(
      "sync_jeff_calendar",
      `I found ${records.length} CRM job${records.length === 1 ? "" : "s"} that would mirror to Google Calendar.`,
      {
        sourceOfTruth: "wrenchready-promise-crm",
        mirroredTo: "google-calendar",
        dryRun: true,
        checked: records.length,
        candidates: records.map((record) => ({
          promiseId: record.id,
          summary: promiseCalendarSummary(record),
          window: record.scheduledWindow.label,
          owner: record.owner,
          status: record.status,
        })),
        calendarStatus: status.calendar,
      },
    );
  }

  if (!status.calendar.canWrite) {
    return blocked(
      "sync_jeff_calendar",
      "I can read the CRM schedule, but Google Calendar writes are not enabled yet.",
      {
        sourceOfTruth: "wrenchready-promise-crm",
        mirroredTo: "google-calendar",
        checked: records.length,
        synced: [],
        missing: status.calendar.missing.length
          ? status.calendar.missing
          : ["GOOGLE_WORKSPACE_ALLOW_CALENDAR_WRITES=true"],
        calendarStatus: status.calendar,
      },
    );
  }

  try {
    const synced = await Promise.all(
      records.map(async (record) => {
        const syncedEvent = await upsertGoogleCalendarEventByPrivateProperty({
          propertyKey: "wrenchreadyPromiseId",
          propertyValue: record.id,
          summary: promiseCalendarSummary(record),
          description: promiseCalendarDescription(record),
          location: `${record.location.label}, ${record.location.city}`,
          startIso: record.scheduledWindow.startIso || "",
          endIso: record.scheduledWindow.endIso || "",
          privateExtendedProperties: {
            wrenchreadySource: "promise-crm",
            wrenchreadyOwner: record.owner,
            wrenchreadyStatus: record.status,
          },
        });

        return {
          promiseId: record.id,
          action: syncedEvent.action,
          calendarEventId: syncedEvent.event.id,
          htmlLink: syncedEvent.event.htmlLink,
        };
      }),
    );

    return result(
      "sync_jeff_calendar",
      `I mirrored ${synced.length} WrenchReady CRM job${synced.length === 1 ? "" : "s"} to Google Calendar.`,
      {
        sourceOfTruth: "wrenchready-promise-crm",
        mirroredTo: "google-calendar",
        checked: records.length,
        synced,
      },
    );
  } catch (error) {
    return blocked(
      "sync_jeff_calendar",
      "I tried to mirror WrenchReady CRM to Google Calendar, but Google returned an error.",
      {
        checked: records.length,
        synced: [],
        error: error instanceof Error ? error.message : "Google Calendar sync failed.",
      },
    );
  }
}

export async function evaluateBookingRequest(payload: unknown) {
  const input = isObject(payload) ? payload : {};
  const request = makeSchedulingRequest(input);
  const uncertainty = normalizeBookingRisk(input.uncertaintyLevel);
  const partsPickupRequired = optionalBoolean(input.partsPickupRequired) || false;
  const targetDate = getRequestedDate(input);
  const scheduleContext = await getScheduleContext({
    ...input,
    targetDate,
    service: request.service,
    vehicle: request.vehicle,
    address: request.address.formatted,
    city: request.address.city,
    state: request.address.state,
  });
  const contextData = scheduleContext.data as {
    scheduleItems: Array<ReturnType<typeof promiseScheduleItem>>;
  };

  const availability = await schedulingEngine.evaluateAvailability(request);
  const reviewReasons = bookingReviewReasons({
    territorySupported: availability.territorySupported,
    integrationsReady: availability.requiredIntegrationsReady,
    missingIntegrations: availability.missingIntegrations,
    autoBook: availability.serviceEstimate.rules.autoBook,
    uncertainty,
    partsPickupRequired,
    existingSameDateJobs: contextData.scheduleItems.length,
  });

  const decision =
    reviewReasons.length === 0
      ? "safe-to-propose"
      : reviewReasons.some((reason) =>
          /not complete|not safe|Service area|multiple jobs|high/i.test(reason),
        )
        ? "dez-review-required"
        : "hold-recommended";

  return result(
    "evaluate_booking_request",
    decision === "safe-to-propose"
      ? "This looks safe to propose as an option, but still confirm before promising the customer."
      : "Do not promise this slot yet. Use a hold or Dez review first.",
    {
      decision,
      requestedService: request.service,
      normalizedService: availability.serviceEstimate.normalizedService,
      durationMinutes: availability.serviceEstimate.rules.durationMinutes,
      territorySupported: availability.territorySupported,
      schedulingIntegrationReady: availability.requiredIntegrationsReady,
      missingIntegrations: availability.missingIntegrations,
      candidateSlots: decision === "safe-to-propose" ? availability.candidateSlots : [],
      reviewReasons,
      currentScheduleItems: contextData.scheduleItems,
      policy: "Jeff may recommend or hold; Jeff may not hard-book or promise timing without verified calendar, route, duration, parts, and worksite checks.",
    },
    scheduleContext.warnings,
  );
}

export async function recordFieldPhotoUpload(payload: unknown) {
  const input = isObject(payload) ? payload : {};
  const body: PhotoUploadInput = {
    callerPhone: optionalString(input.callerPhone),
    customerName: optionalString(input.customerName),
    vehicle: optionalString(input.vehicle),
    jobId: optionalString(input.jobId),
    sessionId: optionalString(input.sessionId),
    label: optionalString(input.label),
    note: optionalString(input.note),
    uploadedBy: optionalString(input.uploadedBy),
    sourceChannel: normalizeChannel(input.sourceChannel || "upload"),
    photos: Array.isArray(input.photos) ? input.photos : [],
  };
  const liveSession = resolveJeffLiveSession(body.sessionId);
  if (!body.jobId && !body.customerName && !body.vehicle && liveSession?.activeJobId) {
    body.jobId = liveSession.activeJobId;
  }

  const normalizedPhotos = normalizePhotoInputs(body.photos);
  const uploadWarnings: string[] = [];
  if ((body.photos?.length || 0) > MAX_PHOTOS_PER_UPLOAD) {
    uploadWarnings.push(`Only the first ${MAX_PHOTOS_PER_UPLOAD} photos were accepted.`);
  }
  if ((body.photos?.length || 0) !== normalizedPhotos.length) {
    uploadWarnings.push("One or more photos were rejected because they were missing image data, oversized, or not an image.");
  }

  if (normalizedPhotos.length === 0) {
    return blocked(
      "record_field_photo_upload",
      "I did not receive a usable image. Ask Simon to retake it and send one clear photo.",
      { photos: [], event: null },
      uploadWarnings,
    );
  }

  const { job, warnings, candidates, needsClarification } = await resolveFieldJob(body);
  if (!job || needsClarification) {
    if (liveSession) {
      const storedPhotoSet = await buildStoredPhotos({
        normalizedPhotos,
        sessionId: liveSession.id,
        uploadedBy: body.uploadedBy || "Simon",
        sourceChannel: body.sourceChannel || "upload",
        label: body.label,
        note: body.note,
        attachmentStatus: "session-inbox",
      });
      const photos = storedPhotoSet.photos;

      getRuntimeState().photos = [...photos, ...getRuntimeState().photos].slice(0, 200);
      await upsertPersistedJeffPhotos(photos);
      attachPhotoToJeffLiveSession({
        sessionId: liveSession.id,
        photoIds: photos.map((photo) => photo.id),
      });

      return result(
        "record_field_photo_upload",
        "I got the photo in this Jeff session. I still need the customer, vehicle, or job before I use it for job-specific advice.",
        {
          event: null,
          job: null,
          session: {
            sessionId: liveSession.id,
            activeJobId: liveSession.activeJobId,
            attachmentStatus: "session-inbox",
          },
          photos: photos.map(summarizePhoto),
          media: storedPhotoSet.media,
          candidates: candidates.map((candidate) => ({
            jobId: candidate.id,
            customerName: candidate.customer.name,
            vehicle: vehicleLabel(candidate),
            serviceScope: candidate.serviceScope,
            jobStage: candidate.jobStage,
          })),
          fieldEventStorageStatus: "runtime-memory",
          mediaStorageStatus: storedPhotoSet.mediaStorage.status,
          storageNote:
            photos.some((photo) => photo.storageStatus === "runtime-memory")
              ? "Photo is in the live Jeff session inbox, but one or more images are only in runtime memory."
              : "Photo is saved in the live Jeff session inbox until Jeff or Simon confirms the job.",
        },
        [...warnings, ...uploadWarnings, ...storedPhotoSet.warnings],
      );
    }

    return blocked(
      "record_field_photo_upload",
      "I could not confidently attach those photos to a job. Ask Simon for the customer, vehicle, or job id.",
      {
        photos: [],
        event: null,
        candidates: candidates.map((candidate) => ({
          jobId: candidate.id,
          customerName: candidate.customer.name,
          vehicle: vehicleLabel(candidate),
          serviceScope: candidate.serviceScope,
          jobStage: candidate.jobStage,
        })),
      },
      [...warnings, ...uploadWarnings],
    );
  }

  const storedPhotoSet = await buildStoredPhotos({
    normalizedPhotos,
    jobId: job.id,
    sessionId: liveSession?.id,
    uploadedBy: body.uploadedBy || "Simon",
    sourceChannel: body.sourceChannel || "upload",
    label: body.label,
    note: body.note,
    attachmentStatus: "job-attached",
  });
  const photos = storedPhotoSet.photos;

  getRuntimeState().photos = [...photos, ...getRuntimeState().photos].slice(0, 200);

  const summary = [
    `${photos.length} field photo${photos.length === 1 ? "" : "s"} uploaded`,
    body.label ? `label: ${body.label}` : undefined,
    body.note ? `note: ${body.note}` : undefined,
  ]
    .filter(Boolean)
    .join("; ");

  const { event, noteStatus, fieldEventStorage } = await saveEvent(
    {
      jobId: job.id,
      channel: body.sourceChannel || "upload",
      eventType: "field_upload_received",
      sender: body.uploadedBy || "Simon",
      summary,
      rawSourceReference: photos.map((photo) => photo.id).join(", "),
      confidence: "high",
      needsReview: false,
    },
    job,
  );

  const photosWithEvent = photos.map((photo) => ({ ...photo, eventId: event.id }));
  const mediaWithEvent = storedPhotoSet.media.map((item) => ({
    ...item,
    jobId: job.id,
    fieldEventId: event.id,
    reviewStatus: "accepted" as const,
    metadata: {
      ...item.metadata,
      sourceEventId: event.id,
    },
    updatedAt: nowIso(),
  }));
  getRuntimeState().photos = getRuntimeState().photos.map((photo) =>
    photosWithEvent.find((uploadedPhoto) => uploadedPhoto.id === photo.id) || photo,
  );
  await upsertPersistedJeffPhotos(photosWithEvent);
  const mediaEventStorage = await persistJeffMediaItems(mediaWithEvent);
  if (liveSession) {
    attachPhotoToJeffLiveSession({
      sessionId: liveSession.id,
      photoIds: photos.map((photo) => photo.id),
      jobId: job.id,
      jobLabel: `${job.customer.name} / ${vehicleLabel(job)}`,
    });
  }

  return result(
    "record_field_photo_upload",
    `I attached ${photos.length} photo${photos.length === 1 ? "" : "s"} to ${job.customer.name}'s ${vehicleLabel(job)}. I can use them in the field context now.`,
    {
      event,
      job: {
        jobId: job.id,
        customerName: job.customer.name,
        vehicle: vehicleLabel(job),
      },
      session: liveSession
        ? {
            sessionId: liveSession.id,
            attachmentStatus: "job-attached",
          }
        : null,
      photos: photosWithEvent.map(summarizePhoto),
      media: mediaWithEvent,
      jobRecordUpdateStatus: noteStatus,
      fieldEventStorageStatus: fieldEventStorage.status,
      mediaStorageStatus: mediaEventStorage.status,
      storageNote:
        photos.some((photo) => photo.storageStatus === "runtime-memory")
          ? "One or more photos are only in runtime memory because local durable storage was unavailable."
          : photos.some((photo) => photo.storageStatus === "google-drive")
            ? "Photo attached to the job file, indexed for Jeff, and stored in Google Drive."
            : "Photo attached to the job file, indexed for Jeff, and stored outside runtime memory.",
    },
    [
      ...warnings,
      ...uploadWarnings,
      ...storedPhotoSet.warnings,
      fieldEventStorage.warning,
      mediaEventStorage.warning,
    ].filter(
      (warning): warning is string => Boolean(warning),
    ),
  );
}

export async function getFieldPhotos(payload: unknown) {
  const input = isObject(payload) ? payload : {};
  let jobId = optionalString(input.jobId);
  const sessionId = optionalString(input.sessionId);
  const includeImageData = optionalBoolean(input.includeImageData) || false;
  const liveSession = resolveJeffLiveSession(sessionId);
  if (!jobId && liveSession?.activeJobId) {
    jobId = liveSession.activeJobId;
  }

  if (!jobId) {
    if (liveSession) {
      const persistedMedia = await listPersistedJeffMedia({ sessionId: liveSession.id, limit: 20 });
      const photos = mergePhotos(
        getPhotosForSession(liveSession.id),
        persistedMedia.media.map(photoFromMedia),
      ).slice(0, 20);
      return result(
        "get_field_photos",
        photos.length
          ? `I found ${photos.length} photo${photos.length === 1 ? "" : "s"} in the current Jeff session, but they are not job-attached yet.`
          : "I do not see photos in the current Jeff session yet.",
        {
          photos: await formatPhotoList(photos, includeImageData),
          session: {
            sessionId: liveSession.id,
            activeJobId: liveSession.activeJobId,
            attachmentStatus: "session-inbox",
          },
          media: persistedMedia.media,
          mediaStorageStatus: persistedMedia.storageStatus,
        },
        persistedMedia.warnings,
      );
    }

    return blocked("get_field_photos", "I need a job id or live session before I can list field photos.", { photos: [] });
  }

  const { job, warnings } = await findJob(jobId);
  if (!job) {
    return blocked("get_field_photos", "I could not find that job id.", { photos: [] }, warnings);
  }

  const persistedMedia = await listPersistedJeffMedia({ jobId: job.id, limit: 20 });
  const photos = mergePhotos(
    getPhotosForJob(job.id),
    persistedMedia.media.map(photoFromMedia),
  ).slice(0, 20);
  return result(
    "get_field_photos",
    photos.length
      ? `I found ${photos.length} field photo${photos.length === 1 ? "" : "s"} for ${job.customer.name}.`
      : `I do not have field photos for ${job.customer.name} yet.`,
    {
      photos: await formatPhotoList(photos, includeImageData),
      session: liveSession
        ? {
            sessionId: liveSession.id,
            activeJobId: liveSession.activeJobId,
            attachmentStatus: "job-attached",
          }
        : null,
      media: persistedMedia.media,
      mediaStorageStatus: persistedMedia.storageStatus,
    },
    [...warnings, ...persistedMedia.warnings],
  );
}

export async function analyzeFieldPhoto(payload: unknown) {
  const input = isObject(payload) ? payload : {};
  let jobId = optionalString(input.jobId);
  const photoId = optionalString(input.photoId);
  const sessionId = optionalString(input.sessionId);
  const question = optionalString(input.question);
  const liveSession = resolveJeffLiveSession(sessionId);
  if (!jobId && liveSession?.activeJobId) {
    jobId = liveSession.activeJobId;
  }

  if (!jobId) {
    if (liveSession) {
      const persistedMedia = await listPersistedJeffMedia({ sessionId: liveSession.id, limit: 20 });
      const sessionPhoto = photoId
        ? mergePhotos(getPhotosForSession(liveSession.id), persistedMedia.media.map(photoFromMedia))
            .find((photo) => photo.id === photoId || photo.mediaId === photoId)
        : mergePhotos(getPhotosForSession(liveSession.id), persistedMedia.media.map(photoFromMedia))[0];
      if (!sessionPhoto) {
        return blocked(
          "analyze_field_photo",
          "I do not have a usable photo in this live Jeff session yet.",
          {
            analysis: null,
            photo: null,
            session: {
              sessionId: liveSession.id,
              activeJobId: liveSession.activeJobId,
              attachmentStatus: "session-inbox",
            },
          },
          persistedMedia.warnings,
        );
      }

      const analysisResult = await analyzeSessionPhotoWithOpenAI(sessionPhoto, question);
      if (!analysisResult.ok) {
        return blocked(
          "analyze_field_photo",
          analysisResult.warning || "I could not inspect that photo yet.",
          {
            analysis: null,
            photo: summarizePhoto(sessionPhoto),
            session: {
              sessionId: liveSession.id,
              activeJobId: liveSession.activeJobId,
              attachmentStatus: "session-inbox",
            },
            model: analysisResult.model,
          },
          [...persistedMedia.warnings, analysisResult.warning].filter(
            (warning): warning is string => Boolean(warning),
          ),
        );
      }

      return result(
        "analyze_field_photo",
        analysisResult.analysis || "I inspected the photo, but the model did not return a usable summary.",
        {
          analysis: {
            id: makeId("jeff-session-photo-analysis"),
            sessionId: liveSession.id,
            photoId: sessionPhoto.id,
            createdAt: nowIso(),
            model: analysisResult.model,
            prompt: buildSessionPhotoAnalysisPrompt(sessionPhoto, question),
            analysis: analysisResult.analysis,
            warnings: persistedMedia.warnings,
            attachmentStatus: "session-inbox",
          },
          photo: summarizePhoto(sessionPhoto),
          session: {
            sessionId: liveSession.id,
            activeJobId: liveSession.activeJobId,
            attachmentStatus: "session-inbox",
          },
        },
        persistedMedia.warnings,
      );
    }

    return blocked(
      "analyze_field_photo",
      "I need a job id or live session before I can inspect a field photo.",
      { analysis: null },
    );
  }

  const { job, warnings } = await findJob(jobId);
  if (!job) {
    return blocked("analyze_field_photo", "I could not find that job id.", { analysis: null }, warnings);
  }

  const persistedMedia = await listPersistedJeffMedia({ jobId: job.id, limit: 20 });
  const durablePhotos = mergePhotos(
    getPhotosForJob(job.id),
    persistedMedia.media.map(photoFromMedia),
  );
  const photo = photoId
    ? durablePhotos.find((candidate) => candidate.id === photoId || candidate.mediaId === photoId)
    : durablePhotos[0];
  if (!photo) {
    return blocked(
      "analyze_field_photo",
      "I do not have a field photo for this job yet. Ask Simon to use Jeff Photo Drop.",
      { analysis: null },
      [...warnings, ...persistedMedia.warnings],
    );
  }

  try {
    const analysisResult = await analyzePhotoWithOpenAI(job, photo, question);
    if (!analysisResult.ok) {
      return blocked(
        "analyze_field_photo",
        analysisResult.warning || "I could not inspect that photo yet.",
        {
          analysis: null,
          photo: summarizePhoto(photo),
          model: analysisResult.model,
        },
        [...warnings, ...persistedMedia.warnings, analysisResult.warning].filter(
          (warning): warning is string => Boolean(warning),
        ),
      );
    }

    const analysis: JeffFieldPhotoAnalysis = {
      id: makeId("jeff-photo-analysis"),
      jobId: job.id,
      photoId: photo.id,
      createdAt: nowIso(),
      model: analysisResult.model,
      prompt: buildPhotoAnalysisPrompt(job, photo, question),
      analysis: analysisResult.analysis,
      warnings,
    };
    getRuntimeState().photoAnalyses = [
      analysis,
      ...getRuntimeState().photoAnalyses,
    ].slice(0, 100);

    const savedAnalysisEvent = await saveEvent(
      {
        jobId: job.id,
        channel: "upload",
        eventType: "photo_analysis_completed",
        sender: "Jeff",
        summary: analysis.analysis.slice(0, 500) || "Photo analysis completed.",
        rawSourceReference: photo.id,
        confidence: "medium",
        needsReview: false,
      },
      job,
    );

    return result(
      "analyze_field_photo",
      analysis.analysis || "I inspected the photo, but the model did not return a usable summary.",
      {
        analysis,
        photo: summarizePhoto(photo),
        fieldEventStorageStatus: savedAnalysisEvent.fieldEventStorage.status,
      },
      [...warnings, ...persistedMedia.warnings, savedAnalysisEvent.fieldEventStorage.warning].filter(
        (warning): warning is string => Boolean(warning),
      ),
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Photo analysis failed unexpectedly.";
    return blocked(
      "analyze_field_photo",
      "I could not inspect that photo yet. Ask Simon to describe what he sees and keep the photo attached for review.",
      {
        analysis: null,
        photo: summarizePhoto(photo),
      },
      [...warnings, ...persistedMedia.warnings, message],
    );
  }
}

export async function recordFieldNote(payload: unknown) {
  const input = isObject(payload) ? payload : {};
  const jobId = optionalString(input.jobId);
  const note = optionalString(input.note);

  if (!jobId || !note) {
    return blocked(
      "record_field_note",
      "I need a job id and note before I can save Simon's field note.",
      { event: null },
    );
  }

  const { job, warnings } = await findJob(jobId);
  if (!job) {
    return blocked("record_field_note", "I could not find that job, so I did not save the note.", { event: null }, warnings);
  }

  const { event, noteStatus, fieldEventStorage } = await saveEvent(
    {
      jobId,
      channel: normalizeChannel(input.channel),
      eventType: "voice_transcript_note",
      sender: optionalString(input.sender) || "Simon",
      summary: note,
      extractedFacts: {
        symptoms: stringList(input.symptomsObserved),
        testsPerformed: stringList(input.testsPerformed),
        readings: stringList(input.readings),
        suspectedCause: optionalString(input.suspectedCause),
      },
      confidence: "medium",
      needsReview: false,
    },
    job,
  );

  const storedContext = await buildStoredContextPacket(job);
  const nextAction = optionalString(input.nextAction) || storedContext.context.safeNextActions[0];
  return result(
    "record_field_note",
    `Saved. Next safe action: ${nextAction}`,
    {
      event,
      jobRecordUpdateStatus: noteStatus,
      fieldEventStorageStatus: fieldEventStorage.status,
      nextAction,
    },
    [...warnings, ...storedContext.warnings, fieldEventStorage.warning].filter(
      (warning): warning is string => Boolean(warning),
    ),
  );
}

export async function requestApprovalOrEscalation(payload: unknown) {
  const input = isObject(payload) ? payload : {};
  const jobId = optionalString(input.jobId);
  const reason = optionalString(input.reason);

  if (!reason) {
    return blocked(
      "request_approval_or_escalation",
      "I need the escalation reason before I can draft the approval request.",
      { draft: null },
    );
  }

  const moneyImpact = optionalString(input.moneyImpact);
  const partsImpact = optionalString(input.partsImpact);
  const customerPromiseImpact = optionalString(input.customerPromiseImpact);
  const customerName = optionalString(input.customerName);
  const customerPhone = optionalString(input.customerPhone);
  const vehicle = optionalString(input.vehicle);
  const address = optionalString(input.address);
  const requestedWindow = optionalString(input.requestedWindow);
  const quoteScope = optionalString(input.quoteScope);

  const { job, warnings } = jobId
    ? await findJob(jobId)
    : { job: undefined, warnings: [] as string[] };

  if (jobId && !job) {
    const { event, fieldEventStorage } = await saveEvent({
      jobId: GENERAL_JEFF_REQUEST_JOB_ID,
      channel: "approval",
      eventType: "approval_requested",
      sender: "Jeff",
      summary: `Unassigned escalation because job id ${jobId} was not found: ${reason}`,
      extractedFacts: {
        customerName,
        vehicle,
        authorization: "approval requested; live job id not found",
      },
      confidence: "high",
      needsReview: true,
    });

    return result(
      "request_approval_or_escalation",
      "I saved that for Dez review as an unassigned request because the job id did not match a live job.",
      {
        draft: {
          to: "Dez",
          reason,
          customerName,
          customerPhone,
          vehicle,
          address,
          requestedWindow,
          quoteScope,
          moneyImpact,
          partsImpact,
          customerPromiseImpact,
          message: optionalString(input.recommendedMessageToDez) || reason,
        },
        event,
        jobRecordUpdateStatus: "unassigned-job-not-found",
        fieldEventStorageStatus: fieldEventStorage.status,
      },
      [...warnings, fieldEventStorage.warning].filter((warning): warning is string => Boolean(warning)),
    );
  }

  const recommendedMessageToDez =
    optionalString(input.recommendedMessageToDez) ||
    [
      job
        ? `Jeff escalation for ${job.customer.name} (${vehicleLabel(job)}): ${reason}`
        : `Jeff unassigned escalation: ${reason}`,
      customerName ? `Customer: ${customerName}` : undefined,
      customerPhone ? `Phone: ${customerPhone}` : undefined,
      vehicle ? `Vehicle: ${vehicle}` : undefined,
      address ? `Address: ${address}` : undefined,
      requestedWindow ? `Requested window: ${requestedWindow}` : undefined,
      quoteScope ? `Quote/scope: ${quoteScope}` : undefined,
      moneyImpact ? `Money impact: ${moneyImpact}` : undefined,
      partsImpact ? `Parts impact: ${partsImpact}` : undefined,
      customerPromiseImpact ? `Customer promise impact: ${customerPromiseImpact}` : undefined,
      job
        ? "Please approve, revise, or decline before Simon proceeds."
        : "Please create or attach the live CRM job before customer-facing scheduling, quote, or payment language goes out.",
    ]
      .filter(Boolean)
      .join("\n");

  if (!job) {
    const { event, fieldEventStorage } = await saveEvent({
      jobId: GENERAL_JEFF_REQUEST_JOB_ID,
      channel: "approval",
      eventType: "approval_requested",
      sender: "Jeff",
      summary: reason,
      extractedFacts: {
        customerName,
        vehicle,
        authorization: "approval requested; unassigned quote/schedule work item",
      },
      confidence: "high",
      needsReview: true,
    });

    return result(
      "request_approval_or_escalation",
      "I saved that for Dez review as an unassigned quote or schedule request. It is not attached to a customer job yet.",
      {
        draft: {
          to: "Dez",
          reason,
          customerName,
          customerPhone,
          vehicle,
          address,
          requestedWindow,
          quoteScope,
          moneyImpact,
          partsImpact,
          customerPromiseImpact,
          message: recommendedMessageToDez,
        },
        event,
        jobRecordUpdateStatus: "unassigned-review-item",
        fieldEventStorageStatus: fieldEventStorage.status,
      },
      [...warnings, fieldEventStorage.warning].filter((warning): warning is string => Boolean(warning)),
    );
  }

  const conflicts = jobReferenceConflict({
    job,
    customerName,
    customerPhone,
    vehicle,
    referenceText: [
      reason,
      moneyImpact,
      partsImpact,
      customerPromiseImpact,
      optionalString(input.recommendedMessageToDez),
      address,
      requestedWindow,
      quoteScope,
    ].filter(Boolean).join(" "),
  });

  if (conflicts.length > 0) {
    const { event, fieldEventStorage } = await saveEvent({
      jobId: GENERAL_JEFF_REQUEST_JOB_ID,
      channel: "approval",
      eventType: "approval_requested",
      sender: "Jeff",
      summary: `Unassigned escalation not attached to ${job.customer.name} because details conflict: ${reason}`,
      extractedFacts: {
        customerName,
        vehicle,
        authorization: `approval requested; selected job mismatch: ${conflicts.join(" ")}`,
      },
      confidence: "high",
      needsReview: true,
    });

    return result(
      "request_approval_or_escalation",
      "I saved that for Dez review, but I did not attach it to the selected job because the customer or vehicle details conflict.",
      {
        draft: {
          to: "Dez",
          reason,
          customerName,
          customerPhone,
          vehicle,
          address,
          requestedWindow,
          quoteScope,
          moneyImpact,
          partsImpact,
          customerPromiseImpact,
          message: recommendedMessageToDez,
        },
        event,
        conflicts,
        rejectedJobId: job.id,
        rejectedJobLabel: `${job.customer.name} / ${vehicleLabel(job)}`,
        jobRecordUpdateStatus: "unassigned-selected-job-conflict",
        fieldEventStorageStatus: fieldEventStorage.status,
      },
      [...warnings, fieldEventStorage.warning].filter((warning): warning is string => Boolean(warning)),
    );
  }

  const { event, noteStatus } = await saveEvent(
    {
      jobId: job.id,
      channel: "approval",
      eventType: "approval_requested",
      sender: "Jeff",
      summary: reason,
      extractedFacts: {
        authorization: "approval requested",
      },
      confidence: "high",
      needsReview: true,
    },
    job,
  );

  return result(
    "request_approval_or_escalation",
    "I drafted the escalation. Do not proceed until Dez or the customer approval path clears it.",
    {
      draft: {
        to: "Dez",
        reason,
        moneyImpact,
        partsImpact,
        customerPromiseImpact,
        message: recommendedMessageToDez,
      },
      event,
      jobRecordUpdateStatus: noteStatus,
    },
    warnings,
  );
}

export async function checkStripePaymentStatus(payload: unknown) {
  const input = isObject(payload) ? payload : {};
  const body: StripePaymentCheckInput = {
    callerPhone: optionalString(input.callerPhone),
    customerName: optionalString(input.customerName),
    vehicle: optionalString(input.vehicle),
    jobId: optionalString(input.jobId),
    stripeReference: optionalString(input.stripeReference),
    stripeReferences: stringList(input.stripeReferences),
    checkoutSessionId: optionalString(input.checkoutSessionId),
    checkoutSessionIds: stringList(input.checkoutSessionIds),
    paymentIntentId: optionalString(input.paymentIntentId),
    paymentIntentIds: stringList(input.paymentIntentIds),
    invoiceId: optionalString(input.invoiceId),
    invoiceIds: stringList(input.invoiceIds),
    paymentLinkUrl: optionalString(input.paymentLinkUrl),
    paymentLinkUrls: stringList(input.paymentLinkUrls),
    reconcile: optionalBoolean(input.reconcile),
    searchStripeByPromiseId: optionalBoolean(input.searchStripeByPromiseId),
  };

  const hasJobHint = Boolean(body.jobId || body.callerPhone || body.customerName || body.vehicle);
  const explicitReferences = explicitStripeReferences(body);
  const lookup = hasJobHint
    ? await resolveFieldJob(body)
    : { job: undefined, warnings: [] as string[], needsClarification: false, candidates: [] as JeffFieldJob[] };
  const job = lookup.job;
  const jobReferences = jobStripeReferenceStrings(job);
  const references = uniqueText([...explicitReferences, ...jobReferences]);
  const searchByPromiseId =
    body.searchStripeByPromiseId !== false &&
    Boolean(job && job.source === "promise-crm");

  if (!isStripeSecretConfigured()) {
    return blocked(
      "check_stripe_payment_status",
      "I cannot check Stripe yet because the Stripe secret key is not configured in this runtime.",
      {
        job: job
          ? {
              jobId: job.id,
              customerName: job.customer.name,
              vehicle: vehicleLabel(job),
            }
          : null,
        currentCrmPayment: job?.paymentCollection || null,
        stripe: null,
        reconciliation: {
          status: "blocked-missing-stripe-secret",
          crmUpdated: false,
        },
      },
      lookup.warnings,
    );
  }

  if (references.length === 0 && !searchByPromiseId) {
    return blocked(
      "check_stripe_payment_status",
      job
        ? "I found the job, but it does not have a Stripe session, invoice, payment link, or payment intent reference to check."
        : "I need a job or a Stripe payment reference before I can check payment status.",
      {
        job: job
          ? {
              jobId: job.id,
              customerName: job.customer.name,
              vehicle: vehicleLabel(job),
            }
          : null,
        currentCrmPayment: job?.paymentCollection || null,
        stripe: null,
        reconciliation: {
          status: "blocked-missing-stripe-reference",
          crmUpdated: false,
        },
        candidates: lookup.candidates.map((candidate) => ({
          jobId: candidate.id,
          customerName: candidate.customer.name,
          vehicle: vehicleLabel(candidate),
          serviceScope: candidate.serviceScope,
          jobStage: candidate.jobStage,
        })),
      },
      lookup.warnings,
    );
  }

  const stripe = await checkStripePaymentReferences({
    promiseId: job?.source === "promise-crm" ? job.id : optionalString(input.promiseId),
    references,
    checkoutSessionIds: uniqueText([body.checkoutSessionId, ...(body.checkoutSessionIds || [])]),
    paymentIntentIds: uniqueText([body.paymentIntentId, ...(body.paymentIntentIds || [])]),
    invoiceIds: uniqueText([body.invoiceId, ...(body.invoiceIds || [])]),
    paymentLinkUrls: uniqueText([body.paymentLinkUrl, ...(body.paymentLinkUrls || [])]),
    searchPaymentIntentsByPromiseId: searchByPromiseId,
  });
  const parsedStripeReferenceCount =
    stripe.references.checkoutSessionIds.length +
    stripe.references.paymentIntentIds.length +
    stripe.references.invoiceIds.length +
    stripe.references.paymentLinkIds.length +
    stripe.references.paymentLinkUrls.length;

  if (parsedStripeReferenceCount === 0 && !stripe.searchedByPromiseId) {
    return blocked(
      "check_stripe_payment_status",
      job
        ? "The job has payment notes, but I do not see a usable Stripe checkout session, payment intent, invoice id, or payment-link URL to verify."
        : "I need a usable Stripe checkout session, payment intent, invoice id, or payment-link URL before I can verify payment.",
      {
        job: job
          ? {
              jobId: job.id,
              customerName: job.customer.name,
              vehicle: vehicleLabel(job),
              serviceScope: job.serviceScope,
            }
          : null,
        currentCrmPayment: job?.paymentCollection || null,
        stripe,
        reconciliation: {
          status: "blocked-no-usable-stripe-reference",
          crmUpdated: false,
          requestedReconcile: body.reconcile !== false,
          safeToAutoReconcile: false,
          explicitReferenceCount: explicitReferences.length,
          storedReferenceCount: jobReferences.length,
          parsedStripeReferenceCount,
        },
      },
      [...lookup.warnings, ...stripe.warnings],
    );
  }

  const requestedReconcile = body.reconcile !== false;
  const canReconcile = stripeCheckCanReconcile({
    job,
    explicitReferences,
    check: stripe,
    requestedReconcile,
  });
  let updatedPromise: PromiseRecord | undefined;
  let event: JeffFieldEvent | undefined;
  let fieldEventStorageStatus: string | undefined;
  let jobRecordUpdateStatus = "not-updated";
  let reconciliationStatus =
    stripe.hasPaidStripePayment
      ? canReconcile
        ? "eligible"
        : "paid-in-stripe-not-auto-reconciled"
      : "no-paid-stripe-payment";

  if (canReconcile && job) {
    const paymentCollection = reconcilePaymentCollectionFromStripe(job, stripe);
    if (paymentCollection) {
      updatedPromise = await updatePromiseRecord(job.id, {
        paymentCollection,
        jobStage: paymentCollection.status === "paid" ? "collected" : job.jobStage,
        nextAction:
          paymentCollection.status === "paid"
            ? "Payment is confirmed in Stripe. Close the visit cleanly, save proof, and ask for the review."
            : "Stripe shows partial payment. Confirm remaining balance before treating the job as collected.",
        noteToAdd: `Jeff checked Stripe payment status. Result: ${paymentCollection.paymentSummary}`,
      });
      const updatedJob = mapPromiseToFieldJob(updatedPromise);
      const saved = await saveEvent(
        {
          jobId: updatedJob.id,
          channel: "payment",
          eventType: "invoice_updated",
          sender: "Jeff",
          summary: paymentCollection.paymentSummary || "Stripe payment status checked and reconciled.",
          extractedFacts: {
            paymentStatus: paymentCollection.status,
            invoiceReference: paymentCollection.invoiceReference,
          },
          rawSourceReference: paymentCollection.lastPaymentReference,
          confidence: "high",
          needsReview: paymentCollection.status !== "paid",
        },
        updatedJob,
      );
      event = saved.event;
      fieldEventStorageStatus = saved.fieldEventStorage.status;
      jobRecordUpdateStatus = saved.noteStatus;
      reconciliationStatus = paymentCollection.status === "paid" ? "crm-marked-paid" : "crm-marked-partial";
      if (saved.fieldEventStorage.warning) stripe.warnings.push(saved.fieldEventStorage.warning);
    }
  }

  const amount = formatMoney(stripe.totalPaidAmount);
  const assistantSay = stripe.hasPaidStripePayment
    ? updatedPromise
      ? `Stripe shows payment collected${amount ? ` (${amount})` : ""}. I updated the WrenchReady job payment status.`
      : `Stripe shows payment collected${amount ? ` (${amount})` : ""}. I did not change the job record because that Stripe reference is not safely tied to this CRM job.`
    : stripe.matches.length > 0
      ? "I checked Stripe. The matching Stripe payment is not paid yet."
      : "I checked Stripe but did not find a matching payment for the stored reference.";

  return result(
    "check_stripe_payment_status",
    assistantSay,
    {
      job: job
        ? {
            jobId: job.id,
            customerName: job.customer.name,
            vehicle: vehicleLabel(job),
            serviceScope: job.serviceScope,
          }
        : null,
      currentCrmPayment: job?.paymentCollection || null,
      updatedCrmPayment: updatedPromise?.paymentCollection || null,
      stripe,
      reconciliation: {
        status: reconciliationStatus,
        crmUpdated: Boolean(updatedPromise),
        requestedReconcile,
        safeToAutoReconcile: canReconcile,
        explicitReferenceCount: explicitReferences.length,
        storedReferenceCount: jobReferences.length,
        jobRecordUpdateStatus,
        fieldEventStorageStatus,
        event,
      },
    },
    [...lookup.warnings, ...stripe.warnings],
  );
}

export async function startCloseout(payload: unknown) {
  const input = isObject(payload) ? payload : {};
  const jobId = optionalString(input.jobId);

  if (!jobId) {
    return blocked(
      "start_closeout",
      "I need the job id before I can start closeout.",
      { closeout: null },
    );
  }

  const { job, warnings } = await findJob(jobId);
  if (!job) {
    return blocked("start_closeout", "I could not find that job.", { closeout: null }, warnings);
  }

  const workCompleted = optionalString(input.workCompleted);
  const partsUsed = stringList(input.partsUsed);
  const finalAmountIfKnown = optionalNumber(input.finalAmountIfKnown);
  const paymentStatus = optionalString(input.paymentStatus) || job.paymentCollection?.status;
  const missing = [
    workCompleted ? null : "work completed summary",
    job.fieldExecution?.photosRequired?.length ? "proof photos/status" : null,
    partsUsed.length || job.fieldExecution?.partsChecklist?.length === 0 ? null : "parts used or no-parts confirmation",
    finalAmountIfKnown !== undefined || job.paymentCollection?.balanceDueAmount !== undefined
      ? null
      : "final amount or balance due",
    paymentStatus ? null : "payment status",
  ].filter((entry): entry is string => Boolean(entry));

  const customerMessageDraft = workCompleted
    ? `WrenchReady closeout draft for ${job.customer.name}: ${workCompleted}. Payment status: ${paymentStatus || "needs confirmation"}.`
    : "Closeout draft is not customer-ready until Simon gives the final work completed summary.";

  const { event, noteStatus } = await saveEvent(
    {
      jobId,
      channel: "voice",
      eventType: "closeout_started",
      sender: "Jeff",
      summary: workCompleted || "Closeout started; final work summary still needed.",
      extractedFacts: {
        paymentStatus,
      },
      confidence: "medium",
      needsReview: missing.length > 0,
    },
    job,
  );

  return result(
    "start_closeout",
    missing.length
      ? `Closeout started, but it is missing: ${missing.join(", ")}.`
      : "Closeout draft is ready for Dez review before customer send.",
    {
      closeout: {
        workCompleted,
        partsUsed,
        finalAmountIfKnown,
        paymentStatus,
        missing,
        invoiceReadiness: missing.length === 0 ? "ready-for-review" : "blocked",
        paymentLinkReadiness:
          job.paymentCollection?.balanceCheckoutUrl || job.paymentCollection?.depositCheckoutUrl
            ? "link-present"
            : "needs-payment-link-or-manual-confirmation",
        customerMessageDraft,
      },
      event,
      jobRecordUpdateStatus: noteStatus,
    },
    warnings,
  );
}

export async function sendSimonRecapEmail(payload: unknown) {
  const input = isObject(payload) ? payload : {};
  const callId = optionalString(input.callId);
  const derivedConversationId = callId ? `jeff-conversation-${safeConversationCallId(callId)}` : undefined;
  const body: SimonRecapEmailInput = {
    conversationId: optionalString(input.conversationId) || derivedConversationId,
    callId,
    sessionId: optionalString(input.sessionId),
    subject: optionalString(input.subject),
    body: optionalString(input.body),
    recipientEmail: optionalString(input.recipientEmail),
    sendNow: optionalBoolean(input.sendNow),
  };
  const workspace = await listPersistedJeffJobWorkspace();
  const conversation = body.conversationId
    ? workspace.conversations.find((entry) => entry.id === body.conversationId)
    : undefined;
  const summary = body.conversationId
    ? workspace.summaries.find((entry) => entry.conversationId === body.conversationId)
    : workspace.summaries[0];
  const configuredEmail = getSimonEmailAddress();
  const requestedEmail = configuredEmail || body.recipientEmail;
  const ccEmails = getJeffRecapCcEmails();
  const subject = body.subject || buildRecapSubject(summary);
  const recapBody = buildRecapBody(summary, body.body);
  const shouldSend = body.sendNow !== false;
  const warnings = [...workspace.warnings];

  async function updateStatus(status: JeffFollowUpStatus, emailTo?: string, providerMessageId?: string) {
    const updatedAt = nowIso();
    const savedConversation = conversation || {
      id: body.conversationId || makeId("jeff-conversation"),
      callId: body.callId,
      sessionId: body.sessionId,
      jobMatchStatus: "unresolved" as const,
      callType: "unknown" as const,
      subjectLabel: subject.replace(/^Jeff recap:\s*/i, "").slice(0, 120) || undefined,
      channel: "voice" as const,
      endedAt: updatedAt,
      followUpRequested: true,
      followUpStatus: status,
      needsReview: status !== "sent",
      reviewReason:
        status === "sent"
          ? "Jeff recap email was sent before final transcript compaction."
          : "Jeff recap email needs review.",
      sourcePayload: {
        source: "send_simon_recap_email",
      },
      createdAt: updatedAt,
      updatedAt,
    };
    const savedSummary = summary || {
      id: `${savedConversation.id}-summary`,
      conversationId: savedConversation.id,
      summaryKind: "manual_compaction" as const,
      summary: recapBody || subject,
      knownFacts: [],
      testsPerformed: [],
      readings: [],
      suspectedIssues: [],
      unprovenAssumptions: [],
      proofNeeded: [],
      nextActions: [],
      recommendationSummary: recapBody || subject,
      requestedFollowUps: ["Email Simon a recap of the diagnostic notes and next tests."],
      emailRequested: true,
      emailStatus: status,
      emailTo,
      blockers: [],
      confidence: "medium" as const,
      createdAt: updatedAt,
      metadata: {
        source: "send_simon_recap_email",
      },
    };

    await persistJeffConversationWorkspace({
      conversation: {
        ...savedConversation,
        followUpRequested: true,
        followUpStatus: status,
        updatedAt,
      },
      summary: {
        ...savedSummary,
        requestedFollowUps: savedSummary.requestedFollowUps.length
          ? savedSummary.requestedFollowUps
          : ["Email Simon a recap of the diagnostic notes and next tests."],
        emailRequested: true,
        emailStatus: status,
        emailTo,
        metadata: {
          ...savedSummary.metadata,
          recapEmailSubject: subject,
          recapEmailProviderMessageId: providerMessageId,
        },
      },
    });
  }

  if (!recapBody) {
    await updateStatus("blocked", requestedEmail);
    return blocked(
      "send_simon_recap_email",
      "I could not send the email because I do not have recap body text yet.",
      {
        emailStatus: "blocked",
        to: requestedEmail,
        subject,
        draftBody: recapBody,
      },
      warnings,
    );
  }

  if (!requestedEmail) {
    await updateStatus("blocked");
    return blocked(
      "send_simon_recap_email",
      "I drafted the recap, but Simon's destination email is not configured yet.",
      {
        emailStatus: "blocked",
        missingEnv: "JEFF_SIMON_EMAIL",
        from: getJeffEmailFrom(),
        cc: ccEmails,
        subject,
        draftBody: recapBody,
      },
      warnings,
    );
  }

  if (!configuredEmail && shouldSend) {
    await updateStatus("blocked", requestedEmail);
    return blocked(
      "send_simon_recap_email",
      "I drafted the recap, but Simon's verified destination email is not configured yet.",
      {
        emailStatus: "blocked",
        missingEnv: "JEFF_SIMON_EMAIL",
        requestedRecipient: body.recipientEmail,
        from: getJeffEmailFrom(),
        cc: ccEmails,
        subject,
        draftBody: recapBody,
      },
      warnings,
    );
  }

  if (body.recipientEmail && configuredEmail && body.recipientEmail.toLowerCase() !== configuredEmail.toLowerCase()) {
    await updateStatus("blocked", requestedEmail);
    return blocked(
      "send_simon_recap_email",
      "I blocked that email because it was not Simon's configured Jeff email address.",
      {
        emailStatus: "blocked",
        configuredRecipient: configuredEmail,
        requestedRecipient: body.recipientEmail,
        cc: ccEmails,
        subject,
        draftBody: recapBody,
      },
      warnings,
    );
  }

  if (!shouldSend) {
    await updateStatus("drafted", requestedEmail);
    return result(
      "send_simon_recap_email",
      "I drafted the recap and marked it for review.",
      {
        emailStatus: "drafted",
        to: requestedEmail,
        from: getJeffEmailFrom(),
        cc: ccEmails,
        subject,
        draftBody: recapBody,
      },
      warnings,
    );
  }

  if (!isJeffEmailSendingConfigured()) {
    const delivery = getJeffEmailDeliveryStatus();
    await updateStatus("blocked", requestedEmail);
    return blocked(
      "send_simon_recap_email",
      "I drafted the recap, but Jeff's email transport is not configured so I cannot send it yet.",
      {
        emailStatus: "blocked",
        missingEnv: delivery.googleWorkspaceReady
          ? "RESEND_API_KEY"
          : "Google Workspace Gmail credentials or RESEND_API_KEY",
        to: requestedEmail,
        from: getJeffEmailFrom(),
        cc: ccEmails,
        subject,
        draftBody: recapBody,
      },
      warnings,
    );
  }

  try {
    const sent = await sendJeffRecapEmail({
      to: requestedEmail,
      cc: ccEmails,
      subject,
      body: recapBody,
      headline: subject,
      recipientName: "Simon",
      idempotencyKey: `jeff-recap-${body.conversationId || body.callId || subject}`
        .toLowerCase()
        .replace(/[^a-z0-9_-]+/g, "-")
        .slice(0, 120),
    });
    const providerMessageId = sent.data?.id;
    await updateStatus("sent", requestedEmail, providerMessageId);

    return result(
      "send_simon_recap_email",
      "I emailed Simon the recap.",
      {
        emailStatus: "sent",
        to: requestedEmail,
        from: getJeffEmailFrom(),
        cc: ccEmails,
        subject,
        providerMessageId,
      },
      warnings,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Jeff recap email failed.";
    await updateStatus("failed", requestedEmail);

    return blocked(
      "send_simon_recap_email",
      "I drafted the recap, but the email send failed.",
      {
        emailStatus: "failed",
        to: requestedEmail,
        from: getJeffEmailFrom(),
        cc: ccEmails,
        subject,
        draftBody: recapBody,
      },
      [...warnings, message],
    );
  }
}

function normalizePartsCartInput(payload: unknown): PartsCartInput {
  const input = isObject(payload) ? payload : {};

  return {
    jobId: optionalString(input.jobId),
    callerPhone: optionalString(input.callerPhone),
    customerName: optionalString(input.customerName),
    vehicle: optionalString(input.vehicle),
    partName: optionalString(input.partName) || optionalString(input.part) || optionalString(input.requestedPart),
    requestedPart: optionalString(input.requestedPart),
    preferredVendor: optionalString(input.preferredVendor) || optionalString(input.vendor) || "O'Reilly Auto Parts",
    quantity: optionalNumber(input.quantity),
    latitude: optionalNumber(input.latitude),
    longitude: optionalNumber(input.longitude),
    maxLocationAgeMinutes: optionalNumber(input.maxLocationAgeMinutes),
    sourceChannel: normalizeChannel(input.sourceChannel || input.channel || "sms"),
    spokenRequest: optionalString(input.spokenRequest) || optionalString(input.message) || optionalString(input.text),
  };
}

function storeFromValue(value: unknown): PartsStoreCandidate | null {
  if (!isObject(value)) return null;
  const name = optionalString(value.name);
  if (!name) return null;
  const route = isObject(value.route) ? value.route : {};

  return {
    name,
    address: optionalString(value.address),
    phone: optionalString(value.phone),
    websiteUri: optionalString(value.websiteUri),
    googleMapsUri: optionalString(value.googleMapsUri),
    straightLineDistanceMiles: optionalNumber(value.straightLineDistanceMiles),
    route: {
      durationMinutes: optionalNumber(route.durationMinutes),
      distanceMiles: optionalNumber(route.distanceMiles),
    },
  };
}

function storeListFromValue(value: unknown) {
  return Array.isArray(value)
    ? value.map(storeFromValue).filter((store): store is PartsStoreCandidate => Boolean(store))
    : [];
}

function normalizedStoreVendor(value: string) {
  return value
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function storeMatchesVendor(store: PartsStoreCandidate, preferredVendor: string) {
  const storeName = normalizedStoreVendor(store.name);
  const vendor = normalizedStoreVendor(preferredVendor);
  if (!vendor) return false;
  if (vendor.includes("oreilly")) return storeName.includes("oreilly");
  return storeName.includes(vendor);
}

function choosePartsCartStore(stores: PartsStoreCandidate[], preferredVendor: string) {
  if (stores.length === 0) return undefined;
  const nearest = stores[0];
  const preferred = stores.find((store) => storeMatchesVendor(store, preferredVendor));
  if (!preferred) return nearest;

  const nearestMinutes = nearest.route?.durationMinutes;
  const preferredMinutes = preferred.route?.durationMinutes;
  if (nearestMinutes !== undefined && preferredMinutes !== undefined) {
    return preferredMinutes <= nearestMinutes + 8 ? preferred : nearest;
  }

  const nearestMiles = nearest.route?.distanceMiles ?? nearest.straightLineDistanceMiles;
  const preferredMiles = preferred.route?.distanceMiles ?? preferred.straightLineDistanceMiles;
  if (nearestMiles !== undefined && preferredMiles !== undefined) {
    return preferredMiles <= nearestMiles + 5 ? preferred : nearest;
  }

  return preferred;
}

function buildVendorSearchUrl(input: {
  partName: string;
  vehicle?: string;
  preferredVendor: string;
  store?: PartsStoreCandidate;
}) {
  const query = [input.vehicle, input.partName].filter(Boolean).join(" ");
  if (
    normalizedStoreVendor(input.preferredVendor).includes("oreilly") ||
    (input.store && storeMatchesVendor(input.store, "oreilly"))
  ) {
    return `https://www.oreillyauto.com/search?q=${encodeURIComponent(query || input.partName)}`;
  }
  return input.store?.websiteUri || input.store?.googleMapsUri || `https://www.google.com/search?q=${encodeURIComponent(`${input.preferredVendor} ${query}`)}`;
}

function buildPartsCartFitmentNotes(input: {
  vehicle?: string;
  store?: PartsStoreCandidate;
  reviewPayUrl: string;
  fitment: PartsFitmentReview;
}) {
  return [
    input.vehicle ? `Vehicle/context: ${input.vehicle}.` : "Vehicle/context not fully confirmed.",
    input.store ? `Preferred pickup/store candidate: ${input.store.name}${input.store.address ? `, ${input.store.address}` : ""}.` : undefined,
    `Fitment status: ${input.fitment.status}.`,
    input.fitment.missingFacts.length ? `Missing fitment facts: ${input.fitment.missingFacts.join(", ")}.` : undefined,
    "Simon must verify exact fitment, availability, final price, and core charge in the vendor cart before paying.",
    `Review/pay link: ${input.reviewPayUrl}`,
  ].filter(Boolean).join(" ");
}

function knownFitmentFacts(vehicle?: string, explicitFacts: string[] = []) {
  const facts = new Set(explicitFacts.map((fact) => fact.trim()).filter(Boolean));
  const vehicleText = vehicle || "";
  const year = vehicleText.match(/\b(19|20)\d{2}\b/)?.[0];
  if (year) facts.add(`year:${year}`);
  const tokens = vehicleText
    .replace(/\b(19|20)\d{2}\b/g, "")
    .split(/\s+/)
    .map((token) => token.replace(/[^a-z0-9-]/gi, "").trim())
    .filter(Boolean);
  if (tokens[0]) facts.add(`make:${tokens[0]}`);
  if (tokens.length >= 2) facts.add(`model:${tokens.slice(1).join(" ")}`);
  if (/\b(v6|v8|i4|l4|flat[- ]?4|h4|h6|\d\.\d\s*l|diesel|hybrid|turbo)\b/i.test(vehicleText)) {
    facts.add("engine");
  }
  if (/\b(front|rear|left|right|driver|passenger)\b/i.test(vehicleText)) {
    facts.add("position");
  }
  if (/\b(awd|4wd|fwd|rwd)\b/i.test(vehicleText)) {
    facts.add("drivetrain");
  }
  if (/\b(group\s*\d+[a-z]?|agm|cca|terminal)\b/i.test(vehicleText)) {
    facts.add("battery-spec");
  }

  return [...facts];
}

function hasFitmentFact(facts: string[], fact: string) {
  return facts.some((entry) => entry === fact || entry.startsWith(`${fact}:`));
}

function requiredFitmentFacts(partName: string) {
  const normalized = partName.toLowerCase();
  const required = ["year", "make", "model"];

  if (/\b(starter|alternator|fuel pump|water pump|sensor|spark plug|spark plugs|coil|ignition coil|thermostat|belt|hose)\b/.test(normalized)) {
    required.push("engine");
  }
  if (/\b(brake|pad|pads|rotor|rotors|caliper|calipers|hub|bearing|axle|strut|shock)\b/.test(normalized)) {
    required.push("position");
  }
  if (/\b(cv axle|axle|transfer case|differential|wheel bearing|hub)\b/.test(normalized)) {
    required.push("drivetrain");
  }
  if (/\bbattery\b/.test(normalized)) {
    required.push("battery-spec");
  }

  return [...new Set(required)];
}

function buildFitmentReview(input: {
  partName: string;
  vehicle?: string;
  vendorFitmentConfirmed?: boolean;
  explicitFacts?: string[];
}): PartsFitmentReview {
  const knownFacts = knownFitmentFacts(input.vehicle, input.explicitFacts);
  const requiredFacts = requiredFitmentFacts(input.partName);
  const missingFacts = requiredFacts.filter((fact) => !hasFitmentFact(knownFacts, fact));

  if (input.vendorFitmentConfirmed && missingFacts.length === 0) {
    return {
      status: "fitment_verified",
      knownFacts,
      missingFacts,
      requiredFacts,
      instructions: [
        "Vendor fitment was marked confirmed for the known vehicle facts.",
        "Still compare part number, connector/terminal style, and any engine or position notes before paying.",
      ],
    };
  }

  if (missingFacts.length > 0) {
    return {
      status: "needs_vehicle_facts",
      knownFacts,
      missingFacts,
      requiredFacts,
      instructions: [
        `Get missing fitment facts before treating ${input.partName} as the right part: ${missingFacts.join(", ")}.`,
        "Use the vendor page fitment checker or call the store with VIN/year/make/model/engine and position details.",
      ],
    };
  }

  return {
    status: "vendor_fitment_required",
    knownFacts,
    missingFacts,
    requiredFacts,
    instructions: [
      "Vehicle facts are present enough to start vendor lookup.",
      "Open the link and use the vendor fitment checker before paying.",
      "Do not call this fit verified until O'Reilly or the counter confirms exact fitment.",
    ],
  };
}

function mergePartsCartItem(input: {
  current: PromisePartItem[];
  partName: string;
  quantity: number;
  store?: PartsStoreCandidate;
  reviewPayUrl: string;
  vehicle?: string;
  fitment: PartsFitmentReview;
}) {
  const now = nowIso();
  const normalizedPartName = input.partName.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const existingIndex = input.current.findIndex((part) => (
    part.label.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim() === normalizedPartName
  ));
  const fitmentNotes = buildPartsCartFitmentNotes({
    vehicle: input.vehicle,
    store: input.store,
    reviewPayUrl: input.reviewPayUrl,
    fitment: input.fitment,
  });
  const existing = existingIndex >= 0 ? input.current[existingIndex] : undefined;
  const nextItem: PromisePartItem = {
    label: existing?.label || input.partName,
    partNumber: existing?.partNumber,
    quantity: existing?.quantity || input.quantity,
    vendor: input.store?.name || existing?.vendor,
    vendorLocation: input.store?.address || existing?.vendorLocation,
    sourceUrl: input.reviewPayUrl,
    fitmentNotes,
    estimatedCost: existing?.estimatedCost,
    requiredForVisit: existing?.requiredForVisit ?? true,
    status: existing?.status && existing.status !== "research-needed" ? existing.status : "research-needed",
    notes: [
      existing?.notes,
      `Jeff prepared a Simon review/pay vendor handoff at ${now}. No purchase, reservation, or order was completed by Jeff.`,
      input.store?.phone ? `Store phone: ${input.store.phone}.` : undefined,
    ].filter(Boolean).join(" "),
  };

  if (existingIndex < 0) return [...input.current, nextItem];
  return input.current.map((part, index) => index === existingIndex ? nextItem : part);
}

export async function preparePartsCartForSimon(payload: unknown) {
  const input = normalizePartsCartInput(payload);
  const preferredVendor = input.preferredVendor || "O'Reilly Auto Parts";
  const partName = input.partName || input.requestedPart;
  const quantity = Math.max(1, Math.min(Math.round(input.quantity || 1), 12));

  if (!partName) {
    return blocked(
      "prepare_parts_cart",
      "I need the part Simon wants before I can prepare a parts-cart handoff.",
      { cartStatus: "needs_more_info", missing: ["partName"] },
    );
  }

  const resolved = input.jobId ? await findJob(input.jobId) : await resolveFieldJob(input);
  const job = resolved.job;
  const vehicle = input.vehicle || (job ? vehicleLabel(job) : undefined);
  const storeSearch = await findNearbyPartsStoresForSimon({
    partName,
    vehicle,
    preferredVendor,
    latitude: input.latitude,
    longitude: input.longitude,
    maxLocationAgeMinutes: input.maxLocationAgeMinutes,
  });
  const storeSearchData: Record<string, unknown> = isObject(storeSearch) ? storeSearch : {};
  const warnings = [
    ...resolved.warnings,
    ...(Array.isArray(storeSearchData.warnings)
      ? storeSearchData.warnings.filter((warning): warning is string => typeof warning === "string")
      : []),
  ];

  if (storeSearchData.success !== true) {
    return blocked(
      "prepare_parts_cart",
      optionalString(storeSearchData.assistantSay) ||
        "I could not prepare the cart handoff yet because the store search is blocked.",
      {
        cartStatus: storeSearchData.status || "blocked",
        partName,
        vehicle,
        preferredVendor,
        storeSearch,
      },
      warnings,
    );
  }

  const stores = storeListFromValue(storeSearchData.stores);
  const selectedStore = choosePartsCartStore(stores, preferredVendor);
  const reviewPayUrl = buildVendorSearchUrl({
    partName,
    vehicle,
    preferredVendor,
    store: selectedStore,
  });
  const fitment = buildFitmentReview({ partName, vehicle });
  const cartStatus =
    fitment.status === "needs_vehicle_facts"
      ? "needs_fitment_facts"
      : "ready_for_simon_review";
  const summary = [
    `Jeff prepared a parts-cart handoff for ${quantity} ${partName}.`,
    selectedStore ? `Store candidate: ${selectedStore.name}${selectedStore.address ? `, ${selectedStore.address}` : ""}.` : undefined,
    `Fitment status: ${fitment.status}.`,
    fitment.missingFacts.length ? `Missing fitment facts: ${fitment.missingFacts.join(", ")}.` : undefined,
    `Review/pay link: ${reviewPayUrl}.`,
    "Jeff did not purchase, reserve, or order the part.",
  ].filter(Boolean).join(" ");
  const { event, noteStatus, fieldEventStorage } = await saveEvent(
    {
      jobId: job?.id || input.jobId || GENERAL_JEFF_REQUEST_JOB_ID,
      channel: input.sourceChannel || "sms",
      eventType: "cart_prepared",
      sender: "Jeff",
      summary,
      rawSourceReference: `${PARTS_CART_SOURCE_PREFIX}${reviewPayUrl}`,
      extractedFacts: {
        vehicle,
        partNeeded: partName,
        authorization: `Simon must verify fitment and review/pay in vendor cart. Jeff did not purchase or reserve. Fitment status: ${fitment.status}.`,
      },
      confidence: "medium",
      needsReview: true,
    },
    job,
  );

  let partsPlanUpdateStatus: "updated" | "skipped-no-job" | "failed" = "skipped-no-job";
  let updatedPartsPlan: PromisePartItem[] | undefined;

  if (job?.source === "promise-crm") {
    updatedPartsPlan = mergePartsCartItem({
      current: job.fieldExecution?.partsPlan || [],
      partName,
      quantity,
      store: selectedStore,
      reviewPayUrl,
      vehicle,
      fitment,
    });

    try {
      await updatePromiseRecord(job.id, {
        fieldExecution: {
          serviceGoal: job.fieldExecution?.serviceGoal,
          partsChecklist: job.fieldExecution?.partsChecklist || [],
          partsPlan: updatedPartsPlan,
          partsRunPlan: job.fieldExecution?.partsRunPlan,
          requiredTools: job.fieldExecution?.requiredTools || [],
          mfgSpecs: job.fieldExecution?.mfgSpecs || [],
          serviceDataChecks: job.fieldExecution?.serviceDataChecks || [],
          fitmentCautions: job.fieldExecution?.fitmentCautions || [],
          photosRequired: job.fieldExecution?.photosRequired || [],
          inspectionChecklist: job.fieldExecution?.inspectionChecklist || [],
          handoffChecklist: job.fieldExecution?.handoffChecklist || [],
          comebackPreventionSteps: job.fieldExecution?.comebackPreventionSteps || [],
          notesTemplate: job.fieldExecution?.notesTemplate,
          upsellFocus: job.fieldExecution?.upsellFocus || [],
          closeoutSteps: job.fieldExecution?.closeoutSteps || [],
        },
        noteToAdd: `Jeff prepared parts-cart handoff for ${partName}: ${reviewPayUrl}`,
      });
      partsPlanUpdateStatus = "updated";
    } catch (error) {
      partsPlanUpdateStatus = "failed";
      warnings.push(error instanceof Error ? error.message : "Promise CRM parts plan update failed.");
    }
  }

  return result(
    "prepare_parts_cart",
    [
      selectedStore
        ? `I prepared a ${preferredVendor} parts-cart handoff for ${partName} at ${selectedStore.name}.`
        : `I prepared a ${preferredVendor} parts search handoff for ${partName}.`,
      `Simon can review and pay here: ${reviewPayUrl}`,
      "I did not purchase, reserve, or order it. Verify exact fitment, availability, final price, and core charge before paying.",
    ].join(" "),
    {
      cartStatus,
      fitmentStatus: fitment.status,
      fitment,
      partName,
      quantity,
      vehicle,
      preferredVendor,
      selectedStore,
      stores,
      reviewPayUrl,
      vendorSearchUrl: reviewPayUrl,
      storeMapUrl: selectedStore?.googleMapsUri,
      policy: "Jeff may prepare a vendor cart/search handoff and write the parts plan. Simon must click through, verify fitment/availability/price/core, and pay. Jeff does not purchase, reserve, or order.",
      event,
      fieldEventStorageStatus: fieldEventStorage.status,
      jobRecordUpdateStatus: noteStatus,
      partsPlanUpdateStatus,
      updatedPartsPlan,
    },
    [...warnings, fieldEventStorage.warning].filter((warning): warning is string => Boolean(warning)),
  );
}

export async function purchaseOrReservePartBlocked(payload: unknown) {
  const input = isObject(payload) ? payload : {};
  const jobId = optionalString(input.jobId);
  const { job, warnings } = jobId ? await findJob(jobId) : { job: undefined, warnings: [] };
  const blockedRequest = await saveBlockedCapabilityRequest({
    capabilityId: "parts-purchase",
    capabilityLabel: "Buy or reserve parts",
    requestedAction:
      optionalString(input.spokenRequest) ||
      `Purchase or reserve ${optionalString(input.requestedPart) || "requested part"}.`,
    jobId: job?.id || jobId,
    sourceChannel: normalizeChannel(input.sourceChannel || input.channel || "voice"),
    requestedBy: "Simon",
    operatorAction: "Build approval-gated parts inventory/order workflow before enabling this.",
    missing: [
      "verified fitment",
      "vendor/store and pickup timing",
      "price, tax/fees, and core charge",
      "customer authorization",
      "WrenchReady delegated authority",
      "readback before purchase",
      "job-record writeback after purchase",
    ],
  });

  return blocked(
    "purchase_or_reserve_part",
    "I cannot buy or reserve parts in this MVP. I can draft an escalation with the part, fitment questions, vendor, price, core charge, pickup timing, and required approval.",
    {
      purchaseStatus: "blocked",
      requestedPart: optionalString(input.requestedPart),
      vendor: optionalString(input.vendor),
      requiredBeforeFuturePurchase: [
        "verified fitment",
        "vendor/store and pickup timing",
        "price, tax/fees, and core charge",
        "customer authorization",
        "WrenchReady delegated authority",
        "readback before purchase",
        "job-record writeback after purchase",
      ],
      loggedRequestEventId: blockedRequest.event.id,
      fieldEventStorageStatus: blockedRequest.fieldEventStorage.status,
    },
    [...warnings, ...blockedRequest.warnings, blockedRequest.fieldEventStorage.warning].filter(
      (warning): warning is string => Boolean(warning),
    ),
  );
}

export function getJeffVapiToolSchemas(): JeffVapiToolSchema[] {
  return [
    {
      name: "get_jeff_capabilities",
      description: "Read Jeff's live capability status so Jeff can honestly say what works, what is partial, and what is blocked.",
      endpoint: `${BASE_ROUTE}/get-jeff-capabilities`,
      method: "POST",
      parameters: {
        type: "object",
        properties: {
          capabilityId: { type: "string" },
        },
      },
    },
    {
      name: "get_jeff_operating_context",
      description: "Read WrenchReady's forced Jeff SOP context for estimates, quote drafts, parts pricing, preferred parts vendor, worker/agent policy, and action-state rules.",
      endpoint: `${BASE_ROUTE}/get-jeff-operating-context`,
      method: "POST",
      parameters: {
        type: "object",
        properties: {
          focus: { type: "string" },
        },
      },
    },
    {
      name: "log_jeff_blocked_request",
      description: "Log a request Simon made for a Jeff capability that is blocked or not fully connected yet.",
      endpoint: `${BASE_ROUTE}/log-jeff-blocked-request`,
      method: "POST",
      parameters: {
        type: "object",
        properties: {
          capabilityId: { type: "string" },
          capabilityLabel: { type: "string" },
          requestedAction: { type: "string" },
          jobId: { type: "string" },
          sourceChannel: { type: "string", enum: CHANNELS },
          requestedBy: { type: "string" },
          operatorAction: { type: "string" },
        },
        required: ["requestedAction"],
      },
    },
    {
      name: "get_active_field_job",
      description: "Find Simon's active field job by caller phone, customer, vehicle, or job id.",
      endpoint: `${BASE_ROUTE}/get-active-field-job`,
      method: "POST",
      parameters: {
        type: "object",
        properties: {
          callerPhone: { type: "string" },
          customerName: { type: "string" },
          vehicle: { type: "string" },
          jobId: { type: "string" },
        },
      },
    },
    {
      name: "get_current_field_context",
      description: "Read the latest unified context packet for job-specific advice, saved notes, approvals, payments, scheduling, closeout, or job history. Do not require this for general diagnostic reasoning from Simon's spoken facts.",
      endpoint: `${BASE_ROUTE}/get-current-field-context`,
      method: "POST",
      parameters: {
        type: "object",
        properties: {
          jobId: { type: "string" },
          callerPhone: { type: "string" },
          activeChannel: { type: "string" },
        },
      },
    },
    {
      name: "get_recent_jeff_messages",
      description: "Read recent Message Jeff app thread activity so Jeff can confirm live texts, uploads, and tutorial demo messages while on a call.",
      endpoint: `${BASE_ROUTE}/get-recent-jeff-messages`,
      method: "POST",
      parameters: {
        type: "object",
        properties: {
          limit: { type: "number" },
        },
      },
    },
    {
      name: "get_field_brief",
      description: "Read a short field brief with scope, stop points, evidence, parts, and payment status.",
      endpoint: `${BASE_ROUTE}/get-field-brief`,
      method: "POST",
      parameters: {
        type: "object",
        properties: {
          jobId: { type: "string" },
        },
        required: ["jobId"],
      },
    },
    {
      name: "record_field_note",
      description: "Save Simon's spoken field note, tests, readings, suspected cause, and next action.",
      endpoint: `${BASE_ROUTE}/record-field-note`,
      method: "POST",
      parameters: {
        type: "object",
        properties: {
          jobId: { type: "string" },
          note: { type: "string" },
          symptomsObserved: { type: "array", items: { type: "string" } },
          testsPerformed: { type: "array", items: { type: "string" } },
          readings: { type: "array", items: { type: "string" } },
          suspectedCause: { type: "string" },
          nextAction: { type: "string" },
        },
        required: ["jobId", "note"],
      },
    },
    {
      name: "record_field_event",
      description: "Save any call, SMS, photo, email, report, approval, invoice, or payment event to the job timeline.",
      endpoint: `${BASE_ROUTE}/record-field-event`,
      method: "POST",
      parameters: {
        type: "object",
        properties: {
          jobId: { type: "string" },
          channel: { type: "string" },
          eventType: { type: "string" },
          sender: { type: "string" },
          summary: { type: "string" },
          rawSourceReference: { type: "string" },
          extractedFacts: { type: "object" },
          confidence: { type: "string" },
          needsReview: { type: "boolean" },
        },
        required: ["jobId", "summary"],
      },
    },
    {
      name: "propose_core_memory_update",
      description: "Save a candidate Simon/WrenchReady preference for Dez review without changing permanent memory.",
      endpoint: `${BASE_ROUTE}/propose-core-memory-update`,
      method: "POST",
      parameters: {
        type: "object",
        properties: {
          jobId: { type: "string" },
          subjectType: { type: "string" },
          subjectKey: { type: "string" },
          subjectLabel: { type: "string" },
          category: { type: "string" },
          memory: { type: "string" },
          evidence: { type: "string" },
          confidence: { type: "string" },
          sensitivity: { type: "string" },
          sourceChannel: { type: "string" },
        },
        required: ["memory"],
      },
    },
    {
      name: "record_field_photo_upload",
      description: "Attach Simon's field photos to the active job and timeline.",
      endpoint: `${BASE_ROUTE}/record-field-photo-upload`,
      method: "POST",
      parameters: {
        type: "object",
        properties: {
          jobId: { type: "string" },
          sessionId: { type: "string" },
          customerName: { type: "string" },
          vehicle: { type: "string" },
          label: { type: "string" },
          note: { type: "string" },
          uploadedBy: { type: "string" },
          photos: {
            type: "array",
            items: {
              type: "object",
              properties: {
                fileName: { type: "string" },
                contentType: { type: "string" },
                sizeBytes: { type: "number" },
                url: { type: "string" },
                dataUrl: { type: "string" },
              },
            },
          },
        },
      },
    },
    {
      name: "get_field_photos",
      description: "List the latest field photos attached to a job without returning large image data by default.",
      endpoint: `${BASE_ROUTE}/get-field-photos`,
      method: "POST",
      parameters: {
        type: "object",
        properties: {
          jobId: { type: "string" },
          sessionId: { type: "string" },
          includeImageData: { type: "boolean" },
        },
      },
    },
    {
      name: "analyze_field_photo",
      description: "Inspect the latest or selected field photo and return concise mechanic-relevant observations.",
      endpoint: `${BASE_ROUTE}/analyze-field-photo`,
      method: "POST",
      parameters: {
        type: "object",
        properties: {
          jobId: { type: "string" },
          sessionId: { type: "string" },
          photoId: { type: "string" },
          question: { type: "string" },
        },
      },
    },
    {
      name: "get_schedule_context",
      description: "Read current schedule context, candidate availability status, and missing scheduling integrations.",
      endpoint: `${BASE_ROUTE}/get-schedule-context`,
      method: "POST",
      parameters: {
        type: "object",
        properties: {
          targetDate: { type: "string" },
          requestedDate: { type: "string" },
          service: { type: "string" },
          vehicle: { type: "string" },
          address: { type: "string" },
          city: { type: "string" },
          state: { type: "string" },
          notes: { type: "string" },
        },
      },
    },
    {
      name: "evaluate_booking_request",
      description: "Evaluate whether Jeff may propose a schedule option or must hold for Dez review.",
      endpoint: `${BASE_ROUTE}/evaluate-booking-request`,
      method: "POST",
      parameters: {
        type: "object",
        properties: {
          service: { type: "string" },
          serviceScope: { type: "string" },
          vehicle: { type: "string" },
          requestedWindow: { type: "string" },
          targetDate: { type: "string" },
          address: { type: "string" },
          city: { type: "string" },
          state: { type: "string" },
          uncertaintyLevel: { type: "string", enum: ["low", "medium", "high"] },
          partsPickupRequired: { type: "boolean" },
          notes: { type: "string" },
        },
        required: ["service"],
      },
    },
    {
      name: "prepare_quote_draft_for_review",
      description: "Create or update a CRM quote draft for Adam/Dez review. Use for quote, estimate, follow-up diagnostic block, schedule/quote intake, or previous-customer quote work. This never sends to the customer and never creates a payment link.",
      endpoint: `${BASE_ROUTE}/prepare-quote-draft-for-review`,
      method: "POST",
      parameters: {
        type: "object",
        properties: {
          jobId: { type: "string" },
          customerName: { type: "string" },
          customerPhone: { type: "string" },
          customerEmail: { type: "string" },
          preferredContact: { type: "string", enum: ["call", "text", "email"] },
          vehicle: { type: "string" },
          address: { type: "string" },
          city: { type: "string" },
          territory: { type: "string" },
          accessNotes: { type: "string" },
          serviceScope: { type: "string" },
          quoteScope: { type: "string" },
          requestedWindow: { type: "string" },
          scheduledWindowStartIso: { type: "string" },
          scheduledWindowEndIso: { type: "string" },
          quoteAmount: { type: "number" },
          requestedAmount: { type: "number" },
          laborHours: { type: "number" },
          partsCostAmount: { type: "number" },
          customerMessage: { type: "string" },
          quoteSummary: { type: "string" },
          caveats: { type: "array", items: { type: "string" } },
          priorDiagnosticFacts: { type: "array", items: { type: "string" } },
          diagnosticChecklist: { type: "array", items: { type: "string" } },
          nextTests: { type: "array", items: { type: "string" } },
          partsChecklist: { type: "array", items: { type: "string" } },
          photosRequired: { type: "array", items: { type: "string" } },
          handoffChecklist: { type: "array", items: { type: "string" } },
          topRisks: { type: "array", items: { type: "string" } },
          readinessSummary: { type: "string" },
          nextAction: { type: "string" },
          notesTemplate: { type: "string" },
          sourceReference: { type: "string" },
          sourceLabel: { type: "string" },
          owner: { type: "string", enum: ["Dez", "Simon", "Unassigned"] },
          readinessRisk: { type: "string", enum: ["low", "medium", "high"] },
        },
        required: ["serviceScope"],
      },
    },
    {
      name: "request_approval_or_escalation",
      description: "Draft a Dez escalation when approval, money, quote, schedule, safety, fitment, or customer promise risk appears. Use without jobId when Simon gives a past customer or inactive job that is not in live CRM.",
      endpoint: `${BASE_ROUTE}/request-approval-or-escalation`,
      method: "POST",
      parameters: {
        type: "object",
        properties: {
          jobId: { type: "string" },
          reason: { type: "string" },
          customerName: { type: "string" },
          customerPhone: { type: "string" },
          vehicle: { type: "string" },
          address: { type: "string" },
          requestedWindow: { type: "string" },
          quoteScope: { type: "string" },
          moneyImpact: { type: "string" },
          partsImpact: { type: "string" },
          customerPromiseImpact: { type: "string" },
          recommendedMessageToDez: { type: "string" },
        },
        required: ["reason"],
      },
    },
    {
      name: "check_stripe_payment_status",
      description: "Check Stripe for a job payment, checkout session, payment intent, invoice, or payment-link URL, then reconcile the CRM only when the Stripe payment is safely tied to the current WrenchReady job.",
      endpoint: `${BASE_ROUTE}/check-stripe-payment-status`,
      method: "POST",
      parameters: {
        type: "object",
        properties: {
          jobId: { type: "string" },
          callerPhone: { type: "string" },
          customerName: { type: "string" },
          vehicle: { type: "string" },
          stripeReference: { type: "string" },
          stripeReferences: { type: "array", items: { type: "string" } },
          checkoutSessionId: { type: "string" },
          checkoutSessionIds: { type: "array", items: { type: "string" } },
          paymentIntentId: { type: "string" },
          paymentIntentIds: { type: "array", items: { type: "string" } },
          invoiceId: { type: "string" },
          invoiceIds: { type: "array", items: { type: "string" } },
          paymentLinkUrl: { type: "string" },
          paymentLinkUrls: { type: "array", items: { type: "string" } },
          reconcile: { type: "boolean" },
          searchStripeByPromiseId: { type: "boolean" },
        },
      },
    },
    {
      name: "sync_jeff_gmail_inbox",
      description: "Check Jeff's Google Workspace Gmail inbox and ingest matching emails or scan reports into Jeff's workspace.",
      endpoint: `${BASE_ROUTE}/sync-jeff-gmail-inbox`,
      method: "POST",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string" },
          maxResults: { type: "number" },
          jobId: { type: "string" },
          jobLabel: { type: "string" },
        },
      },
    },
    {
      name: "sync_jeff_calendar",
      description: "Mirror current WrenchReady CRM scheduled jobs to Google Calendar or report why calendar writes are blocked.",
      endpoint: `${BASE_ROUTE}/sync-jeff-calendar`,
      method: "POST",
      parameters: {
        type: "object",
        properties: {
          limit: { type: "number" },
          dryRun: { type: "boolean" },
        },
      },
    },
    {
      name: "send_simon_recap_email",
      description: "Send or draft a concise Jeff recap email to Simon. Only sends to the configured Simon email.",
      endpoint: `${BASE_ROUTE}/send-simon-recap-email`,
      method: "POST",
      parameters: {
        type: "object",
        properties: {
          conversationId: { type: "string" },
          callId: { type: "string" },
          sessionId: { type: "string" },
          subject: { type: "string" },
          body: { type: "string" },
          recipientEmail: { type: "string" },
          sendNow: { type: "boolean" },
        },
      },
    },
    {
      name: "start_closeout",
      description: "Start a field closeout draft and identify missing invoice, proof, parts, or payment facts.",
      endpoint: `${BASE_ROUTE}/start-closeout`,
      method: "POST",
      parameters: {
        type: "object",
        properties: {
          jobId: { type: "string" },
          workCompleted: { type: "string" },
          partsUsed: { type: "array", items: { type: "string" } },
          finalAmountIfKnown: { type: "number" },
          paymentStatus: { type: "string" },
        },
        required: ["jobId"],
      },
    },
    {
      name: "prepare_parts_cart",
      description: "Prepare a preferred O'Reilly parts-cart/search handoff for Simon, update the job parts plan, and return a review/pay URL. Does not purchase, reserve, or order.",
      endpoint: `${BASE_ROUTE}/prepare-parts-cart`,
      method: "POST",
      parameters: {
        type: "object",
        properties: {
          jobId: { type: "string" },
          partName: { type: "string" },
          requestedPart: { type: "string" },
          vehicle: { type: "string" },
          preferredVendor: { type: "string" },
          quantity: { type: "number" },
          latitude: { type: "number" },
          longitude: { type: "number" },
          maxLocationAgeMinutes: { type: "number" },
          sourceChannel: { type: "string", enum: CHANNELS },
          spokenRequest: { type: "string" },
        },
        required: ["partName"],
      },
    },
    {
      name: "find_nearby_parts_stores",
      description: "Use Simon's fresh shared location and Google Maps to rank nearby auto parts stores by drive time and prepare the inventory-confirmation next step. Does not prove inventory and does not buy, reserve, or order parts.",
      endpoint: `${BASE_ROUTE}/find-nearby-parts-stores`,
      method: "POST",
      parameters: {
        type: "object",
        properties: {
          partName: { type: "string" },
          vehicle: { type: "string" },
          preferredVendor: { type: "string" },
          latitude: { type: "number" },
          longitude: { type: "number" },
          maxLocationAgeMinutes: { type: "number" },
        },
      },
    },
    {
      name: "purchase_or_reserve_part",
      description: "Blocked in this MVP. Returns the safety requirements before future approval-gated purchasing.",
      endpoint: `${BASE_ROUTE}/purchase-or-reserve-part`,
      method: "POST",
      parameters: {
        type: "object",
        properties: {
          jobId: { type: "string" },
          requestedPart: { type: "string" },
          vendor: { type: "string" },
          spokenRequest: { type: "string" },
        },
      },
    },
  ];
}

export function getJeffAssistantConfig() {
  return {
    name: "WrenchReady Simon Tech Expert",
    phase: "MVP Phase 2",
    brain: {
      voiceModel: readEnv("JEFF_FIELD_REALTIME_MODEL") || "gpt-realtime-2",
      reasoningModel: readEnv("JEFF_FIELD_REASONING_MODEL") || "gpt-5.5",
      reasoningEffort: readEnv("JEFF_FIELD_REASONING_EFFORT") || "low",
      visionModel: readEnv("JEFF_FIELD_VISION_MODEL", "JEFF_FIELD_REASONING_MODEL") || "gpt-5.5",
      policy: "OpenAI is the assistant brain; Vapi/Twilio are treated as phone/audio transport.",
    },
    purchasing: "blocked",
    email: getJeffEmailIntegrationStatus(),
    photoDropPath: "/jeff/photo-drop",
    systemPrompt: jeffFieldAssistantSystemPrompt,
    tools: getJeffVapiToolSchemas(),
  };
}
