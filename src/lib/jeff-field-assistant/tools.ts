import { timingSafeEqual } from "node:crypto";
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
import { getPromiseRecords, updatePromiseRecord } from "@/lib/promise-crm/server";
import type { PromiseRecord } from "@/lib/promise-crm/types";
import schedulingEngine from "@/lib/scheduling/engine";
import type { AvailabilityRequest } from "@/lib/scheduling/types";
import { normalizePhone } from "@/lib/twilio";
import { jeffFieldJobFixtures } from "@/lib/jeff-field-assistant/fixtures";
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

export async function getJeffPhotoDropJobs() {
  const { jobs, warnings } = await getAllJobs();
  const allowFixtures = jeffFixturesEnabled();
  const activeJobs = jobs
    .filter((job) => isJeffFieldSelectableJob(job, allowFixtures))
    .filter((job) => job.owner === "Simon" || job.jobStage === "on-site" || job.jobStage === "en-route")
    .sort((a, b) => {
      const stageWeight = (job: JeffFieldJob) =>
        job.jobStage === "on-site" ? 3 : job.jobStage === "en-route" ? 2 : 1;
      return stageWeight(b) - stageWeight(a);
    })
    .slice(0, 12)
    .map((job) => ({
      jobId: job.id,
      customerName: job.customer.name,
      vehicle: vehicleLabel(job),
      serviceScope: job.serviceScope,
      jobStage: job.jobStage,
      owner: job.owner,
    }));

  return {
    jobs: activeJobs,
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

  const availability = schedulingEngine.evaluateAvailability({
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

  const availability = schedulingEngine.evaluateAvailability(request);
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

  if (!jobId || !reason) {
    return blocked(
      "request_approval_or_escalation",
      "I need a job id and escalation reason before I can draft the approval request.",
      { draft: null },
    );
  }

  const { job, warnings } = await findJob(jobId);
  if (!job) {
    return blocked("request_approval_or_escalation", "I could not find that job.", { draft: null }, warnings);
  }

  const moneyImpact = optionalString(input.moneyImpact);
  const partsImpact = optionalString(input.partsImpact);
  const customerPromiseImpact = optionalString(input.customerPromiseImpact);
  const recommendedMessageToDez =
    optionalString(input.recommendedMessageToDez) ||
    [
      `Jeff escalation for ${job.customer.name} (${vehicleLabel(job)}): ${reason}`,
      moneyImpact ? `Money impact: ${moneyImpact}` : undefined,
      partsImpact ? `Parts impact: ${partsImpact}` : undefined,
      customerPromiseImpact ? `Customer promise impact: ${customerPromiseImpact}` : undefined,
      "Please approve, revise, or decline before Simon proceeds.",
    ]
      .filter(Boolean)
      .join("\n");

  const { event, noteStatus } = await saveEvent(
    {
      jobId,
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
      name: "request_approval_or_escalation",
      description: "Draft a Dez escalation when approval, money, safety, fitment, or customer promise risk appears.",
      endpoint: `${BASE_ROUTE}/request-approval-or-escalation`,
      method: "POST",
      parameters: {
        type: "object",
        properties: {
          jobId: { type: "string" },
          reason: { type: "string" },
          moneyImpact: { type: "string" },
          partsImpact: { type: "string" },
          customerPromiseImpact: { type: "string" },
          recommendedMessageToDez: { type: "string" },
        },
        required: ["jobId", "reason"],
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
      name: "find_nearby_parts_stores",
      description: "Use Simon's fresh shared location and Google Maps to rank nearby auto parts stores by drive time and prepare the inventory-confirmation next step. Does not prove inventory and does not buy, reserve, or order parts.",
      endpoint: `${BASE_ROUTE}/find-nearby-parts-stores`,
      method: "POST",
      parameters: {
        type: "object",
        properties: {
          partName: { type: "string" },
          vehicle: { type: "string" },
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
