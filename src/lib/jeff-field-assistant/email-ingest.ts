import { getAppBaseUrl } from "@/lib/app-url";
import { getJeffEmailAddress, getJeffEmailDeliveryStatus, getJeffEmailFrom } from "@/lib/email";
import { readEnv } from "@/lib/env";
import { persistJeffMediaItems } from "@/lib/jeff-field-assistant/media";
import { persistJeffConversationWorkspace } from "@/lib/jeff-field-assistant/persistence";
import { upsertOperatorTask } from "@/lib/promise-crm/operator-tasks";
import type {
  JeffConversation,
  JeffConversationCallType,
  JeffConversationSummary,
  JeffJobWorkspaceSnapshot,
  JeffMediaItem,
} from "@/lib/jeff-field-assistant/types";

type InboundEmailInput = {
  provider?: string;
  providerEventType?: string;
  providerMessageId?: string;
  from?: string;
  to?: string;
  subject?: string;
  text?: string;
  html?: string;
  receivedAt?: string;
  jobId?: string;
  jobLabel?: string;
  attachments?: Array<{
    fileName?: string;
    contentType?: string;
    sizeBytes?: number;
    url?: string;
  }>;
  raw?: Record<string, unknown>;
};

function nowIso() {
  return new Date().toISOString();
}

function makeId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function optionalString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function stringValue(input: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = optionalString(input[key]);
    if (value) return value;
  }
  return undefined;
}

function numberValue(input: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = input[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim()) {
      const numeric = Number(value);
      if (Number.isFinite(numeric)) return numeric;
    }
  }
  return undefined;
}

function objectValue(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined;
}

function normalizeAttachment(value: unknown) {
  const entry = objectValue(value);
  if (!entry) return undefined;

  return {
    fileName: stringValue(entry, ["fileName", "filename", "Filename", "Name", "name"]),
    contentType: stringValue(entry, ["contentType", "content_type", "ContentType", "type", "Type"]),
    sizeBytes: numberValue(entry, ["sizeBytes", "size_bytes", "SizeBytes", "size", "Size"]),
    url: stringValue(entry, ["url", "downloadUrl", "download_url", "DownloadUrl", "contentUrl", "ContentUrl"]),
  };
}

function isNormalizedAttachment(value: ReturnType<typeof normalizeAttachment>): value is NonNullable<ReturnType<typeof normalizeAttachment>> {
  return Boolean(value);
}

function parseMaybeJsonObject(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return undefined;
  try {
    return objectValue(JSON.parse(value));
  } catch {
    return undefined;
  }
}

function timestampToIso(value?: string) {
  if (!value) return undefined;
  const numeric = Number(value);
  if (Number.isFinite(numeric)) {
    const millis = numeric > 10_000_000_000 ? numeric : numeric * 1000;
    return new Date(millis).toISOString();
  }
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : value;
}

function stripHtml(value?: string) {
  if (!value) return undefined;
  return value
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function candidateObjects(payload: unknown) {
  const root = objectValue(payload) || {};
  const data = objectValue(root.data) || parseMaybeJsonObject(root.data) || {};
  const email = objectValue(root.email) || parseMaybeJsonObject(root.email) || {};
  const message = objectValue(root.message) || parseMaybeJsonObject(root.message) || {};
  const envelope = objectValue(root.envelope) || parseMaybeJsonObject(root.envelope) || {};
  const headers = objectValue(root.headers) || parseMaybeJsonObject(root.headers) || {};

  return {
    root,
    data,
    envelope,
    headers,
    merged: {
      ...root,
      ...email,
      ...message,
      ...data,
    },
  };
}

function stringValueFrom(objects: Array<Record<string, unknown>>, keys: string[]) {
  for (const object of objects) {
    const value = stringValue(object, keys);
    if (value) return value;
  }
  return undefined;
}

function arrayValueFrom(objects: Array<Record<string, unknown>>, keys: string[]) {
  for (const object of objects) {
    for (const key of keys) {
      const value = object[key];
      if (Array.isArray(value)) return value;
    }
  }
  return [];
}

function normalizeInboundEmailPayload(payload: unknown): InboundEmailInput {
  const { root, data, envelope, headers, merged } = candidateObjects(payload);
  const searchObjects = [merged, data, root, envelope, headers];
  const attachmentValues = arrayValueFrom(searchObjects, [
    "attachments",
    "Attachments",
    "attachment",
    "Attachment",
  ]);
  const attachments = attachmentValues.map(normalizeAttachment).filter(isNormalizedAttachment);
  const html = stringValueFrom(searchObjects, [
    "html",
    "Html",
    "htmlBody",
    "html_body",
    "HtmlBody",
    "body-html",
    "BodyHTML",
  ]);
  const text = stringValueFrom(searchObjects, [
    "text",
    "Text",
    "textBody",
    "text_body",
    "TextBody",
    "body",
    "plain",
    "body-plain",
    "stripped-text",
    "BodyPlain",
  ]) || stripHtml(html);
  const timestamp = stringValueFrom(searchObjects, [
    "receivedAt",
    "received_at",
    "created_at",
    "createdAt",
    "timestamp",
    "date",
    "Date",
  ]);

  return {
    provider: stringValueFrom(searchObjects, ["provider", "Provider", "source", "Source"]),
    providerEventType: stringValueFrom(searchObjects, ["eventType", "event_type", "type", "Type"]),
    providerMessageId: stringValueFrom(searchObjects, [
      "providerMessageId",
      "messageId",
      "message_id",
      "MessageID",
      "MessageId",
      "Message-Id",
      "email_id",
      "emailId",
      "id",
      "Id",
    ]),
    from: stringValueFrom(searchObjects, ["from", "From", "sender", "Sender", "fromEmail", "from_email"]),
    to: stringValueFrom(searchObjects, ["to", "To", "recipient", "Recipient", "recipientEmail", "recipient_email"]),
    subject: stringValueFrom(searchObjects, ["subject", "Subject", "title", "Title"]),
    text,
    html,
    receivedAt: timestampToIso(timestamp),
    jobId: stringValueFrom(searchObjects, ["jobId", "job_id", "job", "JobId"]),
    jobLabel: stringValueFrom(searchObjects, ["jobLabel", "job_label", "JobLabel"]),
    attachments,
    raw: root,
  };
}

function safeId(value?: string) {
  return value?.replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 120);
}

function emailBody(input: InboundEmailInput) {
  return (input.text || stripHtml(input.html) || "").replace(/\s+/g, " ").trim();
}

function callType(input: InboundEmailInput): JeffConversationCallType {
  const smokeText = `${input.providerMessageId || ""} ${input.subject || ""}`.toLowerCase();
  if (smokeText.includes("smoke-inbound") || smokeText.includes("jeff inbound smoke test")) return "test";
  if (input.jobId) return "job";
  const text = `${input.subject || ""} ${emailBody(input)}`.toLowerCase();
  if (text.includes("diagnostic") || text.includes("obd") || text.includes("scan") || text.includes("dtc")) {
    return "admin";
  }
  return "unknown";
}

function knownFactsFromEmail(input: InboundEmailInput) {
  return [
    input.from ? `From: ${input.from}` : undefined,
    input.to ? `To: ${input.to}` : undefined,
    input.subject ? `Subject: ${input.subject}` : undefined,
    input.provider ? `Provider: ${input.provider}` : undefined,
    input.providerEventType ? `Provider event: ${input.providerEventType}` : undefined,
    input.attachments?.length ? `Attachments: ${input.attachments.length}` : undefined,
  ].filter((entry): entry is string => Boolean(entry));
}

function nextActionsForEmail(input: InboundEmailInput) {
  if (callType(input) === "test") {
    return ["Confirm the inbound mailbox test landed in Jeff's workspace."];
  }

  if (input.jobId) {
    return [
      "Review the inbound email and add the useful diagnostic facts to the job.",
      "Ask Simon for any missing photos, VIN, scan report pages, or customer approval before acting.",
    ];
  }

  return [
    "Review this inbound Jeff email and attach it to the right job, personal workspace, or admin thread.",
    "Do not treat the email as job truth until it is attached and reviewed.",
  ];
}

function mediaProviderForEmailAttachment(attachment: NonNullable<InboundEmailInput["attachments"]>[number]): JeffMediaItem["storageProvider"] {
  if (attachment.url) return "external-url";
  return "metadata-only";
}

function mediaStorageStatusForEmailAttachment(attachment: NonNullable<InboundEmailInput["attachments"]>[number]): JeffMediaItem["storageStatus"] {
  if (attachment.url) return "available";
  return "metadata-only";
}

function parseStatusForEmailAttachment(attachment: NonNullable<InboundEmailInput["attachments"]>[number]): JeffMediaItem["parseStatus"] {
  const contentType = (attachment.contentType || "").toLowerCase();
  if (contentType.includes("pdf") || contentType.includes("text") || contentType.includes("csv")) return "pending";
  if (contentType.startsWith("image/")) return "not-needed";
  return "pending";
}

function buildEmailAttachmentMedia(input: InboundEmailInput, conversationId: string, receivedAt: string) {
  return (input.attachments || [])
    .filter((attachment) => attachment.fileName)
    .map((attachment): JeffMediaItem => ({
      id: makeId("jeff-media"),
      jobId: input.jobId,
      conversationId,
      sourceChannel: "email",
      uploadedAt: receivedAt,
      uploadedBy: input.from || "Jeff email",
      fileName: attachment.fileName || "email-attachment",
      contentType: attachment.contentType || "application/octet-stream",
      sizeBytes: attachment.sizeBytes || 0,
      label: "Inbound email",
      note: input.subject,
      storageProvider: mediaProviderForEmailAttachment(attachment),
      storageStatus: mediaStorageStatusForEmailAttachment(attachment),
      externalUrl: attachment.url,
      parseStatus: parseStatusForEmailAttachment(attachment),
      reviewStatus: input.jobId ? "accepted" : "needs-review",
      metadata: {
        source: "jeff-inbound-email",
        provider: input.provider,
        providerMessageId: input.providerMessageId,
      },
      createdAt: receivedAt,
      updatedAt: receivedAt,
    }));
}

async function upsertOperatorTasksFromEmail(input: InboundEmailInput, params: {
  conversation: JeffConversation;
  summary: JeffConversationSummary;
}) {
  const hasAttachments = Boolean(input.attachments?.length);
  const needsAction =
    params.conversation.needsReview ||
    params.summary.blockers.length > 0 ||
    params.summary.nextActions.length > 0 ||
    hasAttachments;

  if (!needsAction) return;

  await upsertOperatorTask({
    id: `operator-task-jeff-email-${params.conversation.id}-review`,
    title: `Review Jeff email: ${input.subject || params.conversation.subjectLabel || "inbound email"}`,
    detail:
      params.summary.nextActions[0] ||
      params.summary.blockers[0] ||
      params.summary.recommendationSummary ||
      params.summary.summary,
    type: hasAttachments ? "field-proof" : params.conversation.needsReview ? "jeff-review" : "customer-follow-up",
    priority: params.summary.blockers.length > 0 || params.conversation.needsReview ? "high" : "normal",
    owner: input.jobId ? "Adam" : "Ops",
    promiseId: input.jobId,
    customerName: input.jobLabel || input.from,
    vehicleLabel: input.jobLabel,
    sourceChannel: "email",
    sourceKind: "jeff-inbound-email",
    sourceId: params.conversation.id,
    sourceUrl: input.jobId ? `/ops/promises/${input.jobId}` : "/ops/field-assistant#jeff-call-workspace",
    blocker: params.summary.blockers[0],
    metadata: {
      provider: input.provider,
      providerMessageId: input.providerMessageId,
      from: input.from,
      to: input.to,
      attachmentCount: input.attachments?.length || 0,
    },
  });
}

export function getJeffInboundEmailSecret() {
  return readEnv("JEFF_INBOUND_EMAIL_SECRET");
}

export function getJeffInboundEmailAddress() {
  return readEnv("JEFF_INBOUND_EMAIL_ADDRESS") || getJeffEmailAddress();
}

export function getJeffInboundEmailEndpoint() {
  return `${getAppBaseUrl()}/api/al/wrenchready/jeff/email/inbound`;
}

export function getJeffEmailIntegrationStatus() {
  const outboundFrom = getJeffEmailFrom();
  const inboundSecret = getJeffInboundEmailSecret();
  const inboundProvider = readEnv("JEFF_INBOUND_EMAIL_PROVIDER");
  const simonEmail = readEnv("JEFF_SIMON_EMAIL", "WR_JEFF_SIMON_EMAIL") || "simon@wrenchreadymobile.com";
  const ccEmails = (readEnv("JEFF_RECAP_CC_EMAILS") || "adam@wrenchreadymobile.com")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
  const outboundIdentityReady = outboundFrom.toLowerCase().includes("jeff@wrenchreadymobile.com");
  const delivery = getJeffEmailDeliveryStatus();

  return {
    outbound: {
      address: getJeffEmailAddress(),
      from: outboundFrom,
      provider: delivery.provider,
      resendConfigured: delivery.resendReady,
      googleWorkspaceConfigured: delivery.googleWorkspaceReady,
      identityReady: outboundIdentityReady,
      simonEmailConfigured: Boolean(simonEmail),
      primaryRecipient: simonEmail,
      cc: ccEmails,
      ready: delivery.ready && outboundIdentityReady && Boolean(simonEmail),
      note: !delivery.ready
        ? "Jeff needs Google Workspace Gmail credentials or RESEND_API_KEY before he can send email."
        : !outboundIdentityReady
          ? "JEFF_EMAIL_FROM is not set to Jeff's wrenchreadymobile.com identity."
          : !simonEmail
            ? "JEFF_SIMON_EMAIL is missing, so Jeff can draft recaps but cannot send them to Simon yet."
            : delivery.provider === "google-workspace"
              ? "Outbound email can be sent through Jeff's Google Workspace Gmail mailbox."
              : "Outbound email can be sent through Resend to Simon. Domain verification still has to be valid in Resend.",
    },
    inbound: {
      address: getJeffInboundEmailAddress(),
      endpoint: getJeffInboundEmailEndpoint(),
      provider: inboundProvider || "not configured",
      secretConfigured: Boolean(inboundSecret),
      ready: Boolean(inboundSecret && inboundProvider),
      note: inboundSecret && inboundProvider
        ? "Inbound endpoint is configured. Provider forwarding must be pointed at the endpoint."
        : "Jeff cannot read received email until an inbound provider/mailbox forwards messages to this endpoint.",
    },
  };
}

export async function ingestJeffInboundEmail(payload: unknown) {
  const input = normalizeInboundEmailPayload(payload);
  const receivedAt = input.receivedAt || nowIso();
  const body = emailBody(input);
  const conversationId = input.providerMessageId
    ? `jeff-email-${safeId(input.providerMessageId)}`
    : makeId("jeff-email");
  const type = callType(input);
  const subject = input.subject || "Inbound Jeff email";
  const summaryText = body || subject;
  const needsReview = !input.jobId;
  const isSmokeTest = type === "test";
  const conversation: JeffConversation = {
    id: conversationId,
    jobId: input.jobId,
    jobLabel: input.jobLabel,
    jobMatchStatus: input.jobId ? "manual" : "unresolved",
    callType: type,
    subjectLabel: subject.slice(0, 140),
    channel: "email",
    callerPhone: input.from,
    endedAt: receivedAt,
    transcript: body || undefined,
    rawSummary: summaryText.slice(0, 700),
    followUpRequested: false,
    followUpStatus: "none",
    needsReview: isSmokeTest ? false : needsReview,
    reviewReason: isSmokeTest
      ? "Inbound email smoke test captured."
      : needsReview
      ? "Inbound Jeff email received; attach it to a job, personal workspace, or admin thread."
      : "Inbound Jeff email attached by provided job id; review extracted facts.",
    sourcePayload: {
      source: "jeff-inbound-email",
      provider: input.provider,
      providerEventType: input.providerEventType,
      providerMessageId: input.providerMessageId,
      from: input.from,
      to: input.to,
      subject,
      attachments: input.attachments,
    },
    createdAt: receivedAt,
    updatedAt: receivedAt,
  };
  const summary: JeffConversationSummary = {
    id: `${conversationId}-summary`,
    conversationId,
    jobId: input.jobId,
    summaryKind: input.jobId ? "after_call" : "unresolved_call",
    summary: summaryText.slice(0, 900),
    knownFacts: knownFactsFromEmail(input),
    testsPerformed: [],
    readings: [],
    suspectedIssues: [],
    unprovenAssumptions: [],
    proofNeeded: input.attachments?.length
      ? []
      : ["If this came from a diagnostic reader, verify whether the scan report or attachment was included."],
    nextActions: nextActionsForEmail(input),
    recommendationSummary: summaryText.slice(0, 500),
    requestedFollowUps: [],
    emailRequested: false,
    emailStatus: "none",
    blockers: needsReview && !isSmokeTest ? ["Inbound email is not attached to a confirmed job."] : [],
    customerSafeRecap: undefined,
    confidence: input.jobId ? "medium" : "low",
    createdAt: receivedAt,
    metadata: {
      source: "jeff-inbound-email",
      provider: input.provider,
      providerEventType: input.providerEventType,
      providerMessageId: input.providerMessageId,
      attachmentCount: input.attachments?.length || 0,
    },
  };
  const snapshot: JeffJobWorkspaceSnapshot | undefined = input.jobId
    ? {
        id: `${conversationId}-snapshot`,
        jobId: input.jobId,
        generatedAt: receivedAt,
        latestConversationId: conversationId,
        snapshotSummary: summary.summary,
        knownFacts: summary.knownFacts,
        latestTestsAndReadings: [],
        latestMediaAndReports: input.attachments?.map((attachment) => attachment.fileName || "email attachment") || [],
        openBlockers: summary.blockers,
        nextActions: summary.nextActions,
        missingProof: summary.proofNeeded,
        needsReview: isSmokeTest ? false : needsReview,
        sourceCounts: {
          inboundEmails: 1,
          attachments: input.attachments?.length || 0,
        },
        createdAt: receivedAt,
      }
    : undefined;
  const storage = await persistJeffConversationWorkspace({ conversation, summary, snapshot });
  const media = buildEmailAttachmentMedia(input, conversationId, receivedAt);
  const mediaStorage = await persistJeffMediaItems(media);
  await upsertOperatorTasksFromEmail(input, { conversation, summary });

  return {
    success: true,
    conversation,
    summary,
    snapshot,
    storage,
    media,
    mediaStorage,
  };
}
