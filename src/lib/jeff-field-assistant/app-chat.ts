import { readEnv } from "@/lib/env";
import {
  dataUrlToGoogleDriveBuffer,
  getGoogleWorkspaceIntegrationStatus,
  uploadGoogleDriveFile,
} from "@/lib/google-workspace";
import {
  listApprovedJeffDurableMemories,
  listPersistedJeffJobWorkspace,
  persistJeffConversationWorkspace,
} from "@/lib/jeff-field-assistant/persistence";
import { resolveJeffLiveSession } from "@/lib/jeff-field-assistant/session";
import { persistJeffMediaItems } from "@/lib/jeff-field-assistant/media";
import { findNearbyPartsStoresForSimon } from "@/lib/jeff-field-assistant/location";
import {
  analyzeFieldPhoto,
  getFieldBrief,
  prepareQuoteDraftForReview,
  preparePartsCartForSimon,
  proposeCoreMemoryUpdate,
  purchaseOrReservePartBlocked,
  recordFieldNote,
  recordFieldPhotoUpload,
  searchWrenchReadyKnowledge,
  sendSimonRecapEmail,
  startCloseout,
  syncJeffCalendar,
  syncJeffGmailInbox,
} from "@/lib/jeff-field-assistant/tools";
import {
  buildJeffCapabilityPromptContext,
  getJeffCapabilityReport,
} from "@/lib/jeff-field-assistant/capabilities";
import { jeffFieldAssistantSystemPrompt } from "@/lib/jeff-field-assistant/prompt";
import {
  fieldSafeJeffNotice,
  isJeffFieldThreadConversation,
} from "@/lib/jeff-field-assistant/conversation-filters";
import { buildQuoteDraftPayloadFromText } from "@/lib/jeff-field-assistant/quote-intake";
import { upsertOperatorTask } from "@/lib/promise-crm/operator-tasks";
import type {
  JeffConversation,
  JeffConversationSummary,
  JeffFieldChannel,
  JeffFieldPhotoSummary,
  JeffMediaItem,
} from "@/lib/jeff-field-assistant/types";

type JeffAppAttachment = {
  fileName: string;
  contentType?: string;
  sizeBytes?: number;
  url?: string;
  driveFileId?: string;
  driveWebViewLink?: string;
  driveWebContentLink?: string;
  mediaId?: string;
};

type JeffAppMessageInput = {
  text?: string;
  jobId?: string;
  jobLabel?: string;
  selectedJobId?: string;
  selectedJobLabel?: string;
  contextMode?: JeffAppContextMode;
  inferredVehicle?: string;
  inferredPartName?: string;
  sender?: string;
  attachments?: JeffAppAttachment[];
  fieldPhotoStatus?: string;
};

type JeffAppContextMode =
  | "selected-job"
  | "different-job"
  | "personal"
  | "admin"
  | "parts-only"
  | "no-job";

type MessageToolAction = {
  tool: string;
  success: boolean;
  assistantSay?: string;
  warning?: string;
  data?: unknown;
};

type MessageFieldContext = {
  status: "loaded" | "skipped" | "blocked" | "error";
  text?: string;
  summary?: string;
  warning?: string;
};

export type JeffAppThreadMessage = {
  id: string;
  role: "simon" | "jeff" | "system";
  channel: JeffFieldChannel;
  text: string;
  timestamp: string;
  jobId?: string;
  jobLabel?: string;
  attachments?: JeffAppAttachment[];
};

const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";

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

  if (isObject(value.error)) {
    return optionalString(value.error.message) || optionalString(value.error.code);
  }

  return optionalString(value.error) || optionalString(value.message);
}

function normalizeAttachments(value: unknown): JeffAppAttachment[] {
  if (!Array.isArray(value)) return [];

  return value.slice(0, 6).flatMap((entry) => {
    if (!isObject(entry)) return [];
    const fileName = optionalString(entry.fileName) || optionalString(entry.name);
    if (!fileName) return [];
    const sizeValue = typeof entry.sizeBytes === "number"
      ? entry.sizeBytes
      : typeof entry.size === "number"
        ? entry.size
        : undefined;

    return [{
      fileName,
      contentType: optionalString(entry.contentType) || optionalString(entry.type),
      sizeBytes: sizeValue,
      url: optionalString(entry.url),
      driveFileId: optionalString(entry.driveFileId),
      driveWebViewLink: optionalString(entry.driveWebViewLink),
      driveWebContentLink: optionalString(entry.driveWebContentLink),
      mediaId: optionalString(entry.mediaId),
    }];
  });
}

function normalizeInput(payload: unknown): JeffAppMessageInput {
  const input = isObject(payload) ? payload : {};

  return {
    text: optionalString(input.text) || optionalString(input.message),
    jobId: optionalString(input.jobId),
    jobLabel: optionalString(input.jobLabel),
    sender: optionalString(input.sender) || "Simon",
    attachments: normalizeAttachments(input.attachments),
  };
}

function sourcePayload(conversation: JeffConversation) {
  return isObject(conversation.sourcePayload) ? conversation.sourcePayload : {};
}

function appThreadMessagesFromConversation(
  conversation: JeffConversation,
  summary?: JeffConversationSummary,
): JeffAppThreadMessage[] {
  const source = sourcePayload(conversation);
  const userText = optionalString(source.userMessage);
  const assistantText = optionalString(source.assistantMessage);
  const attachments = normalizeAttachments(source.attachments);

  if (source.source === "jeff-app-message" && (userText || assistantText)) {
    const messages: JeffAppThreadMessage[] = [];
    if (userText) {
      messages.push({
        id: `${conversation.id}-simon`,
        role: "simon",
        channel: conversation.channel,
        text: userText,
        timestamp: conversation.createdAt,
        jobId: conversation.jobId,
        jobLabel: conversation.jobLabel,
        attachments,
      });
    }
    if (assistantText) {
      messages.push({
        id: `${conversation.id}-jeff`,
        role: "jeff",
        channel: conversation.channel,
        text: assistantText,
        timestamp: conversation.endedAt,
        jobId: conversation.jobId,
        jobLabel: conversation.jobLabel,
      });
    }
    return messages;
  }

  const text = summary?.recommendationSummary || summary?.summary || conversation.rawSummary;
  if (!text) return [];

  return [{
    id: `${conversation.id}-system`,
    role: "system",
    channel: conversation.channel,
    text,
    timestamp: conversation.endedAt,
    jobId: conversation.jobId,
    jobLabel: conversation.jobLabel,
  }];
}

export async function listJeffAppThreadMessages(limit = 30) {
  const workspace = await listPersistedJeffJobWorkspace();
  const summaryByConversation = new Map(
    workspace.summaries.map((summary) => [summary.conversationId, summary]),
  );
  const messages = workspace.conversations
    .filter(isJeffFieldThreadConversation)
    .flatMap((conversation) => appThreadMessagesFromConversation(
      conversation,
      summaryByConversation.get(conversation.id),
    ))
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    .slice(-limit);

  return {
    messages,
    warnings: workspace.warnings.map(fieldSafeJeffNotice).filter(Boolean),
    storageStatus: workspace.storageStatus,
  };
}

function buildMemoryContext(memories: Awaited<ReturnType<typeof listApprovedJeffDurableMemories>>["memories"]) {
  return memories
    .slice(0, 12)
    .map((memory) => `- ${memory.subjectLabel}: ${memory.memory}`)
    .join("\n");
}

function buildRecentContext(messages: JeffAppThreadMessage[]) {
  return messages
    .slice(-10)
    .map((message) => `${message.role === "simon" ? "Simon" : message.role === "jeff" ? "Jeff" : "System"}: ${message.text}`)
    .join("\n");
}

async function saveAttachmentsToDrive(attachments: JeffAppAttachment[] = []) {
  const status = getGoogleWorkspaceIntegrationStatus();
  if (!status.drive.canUpload || attachments.length === 0) {
    return { attachments, warnings: [] as string[] };
  }

  const warnings: string[] = [];
  const savedAttachments: JeffAppAttachment[] = [];

  for (const attachment of attachments) {
    const upload = dataUrlToGoogleDriveBuffer(attachment.url);
    if (!upload) {
      savedAttachments.push(attachment);
      continue;
    }

    try {
      const driveFile = await uploadGoogleDriveFile({
        fileName: attachment.fileName,
        mimeType: attachment.contentType || upload.mimeType,
        data: upload.data,
      });
      savedAttachments.push({
        ...attachment,
        contentType: driveFile.mimeType || attachment.contentType,
        url: driveFile.webViewLink || driveFile.webContentLink || attachment.url,
        driveFileId: driveFile.id,
        driveWebViewLink: driveFile.webViewLink,
        driveWebContentLink: driveFile.webContentLink,
      });
    } catch (error) {
      warnings.push(error instanceof Error ? error.message : `Could not upload ${attachment.fileName} to Google Drive.`);
      savedAttachments.push(attachment);
    }
  }

  return { attachments: savedAttachments, warnings };
}

function messagePhotoInputs(attachments: JeffAppAttachment[] = []) {
  return attachments.flatMap((attachment) => {
    const contentType = attachment.contentType || "";
    const url = optionalString(attachment.url);
    if (!contentType.toLowerCase().startsWith("image/") || !url) return [];

    return [{
      fileName: attachment.fileName,
      contentType,
      sizeBytes: attachment.sizeBytes || 0,
      ...(url.startsWith("data:image/") ? { dataUrl: url } : { url }),
    }];
  });
}

async function registerMessagePhotos(input: JeffAppMessageInput) {
  const photos = messagePhotoInputs(input.attachments);
  if (photos.length === 0) {
    return { status: undefined, photos: [] as JeffFieldPhotoSummary[], media: [] as JeffMediaItem[], warnings: [] as string[] };
  }

  if (!input.jobId) {
    const liveSession = resolveJeffLiveSession();
    if (liveSession) {
      const response = await recordFieldPhotoUpload({
        sessionId: liveSession.id,
        label: "Message Jeff live demo",
        note: input.text,
        uploadedBy: input.sender || "Simon",
        sourceChannel: "mms",
        photos,
      });
      const result: Record<string, unknown> = isObject(response) ? response : {};
      const warnings = Array.isArray(result.warnings)
        ? result.warnings.filter((warning): warning is string => typeof warning === "string")
        : [];
      const assistantSay = optionalString(result.assistantSay);
      const data = isObject(result.data) ? result.data : {};
      const registeredPhotos = Array.isArray(data.photos)
        ? data.photos.filter((photo): photo is JeffFieldPhotoSummary => isObject(photo) && typeof photo.id === "string")
        : [];
      const media = Array.isArray(data.media)
        ? data.media.filter((item): item is JeffMediaItem => isObject(item) && typeof item.id === "string")
        : [];

      return {
        status: result.success === true
          ? assistantSay || `Registered ${photos.length} image attachment${photos.length === 1 ? "" : "s"} in the live Jeff session.`
          : assistantSay || "Image attachment stayed in the message thread but was not registered in the live Jeff session.",
        photos: registeredPhotos,
        media,
        warnings,
      };
    }

    return {
      status: "Image attachment stayed in the message thread because no job was selected.",
      photos: [] as JeffFieldPhotoSummary[],
      media: [] as JeffMediaItem[],
      warnings: ["Select a job before sending images if Jeff should treat them as field photos."],
    };
  }

  const response = await recordFieldPhotoUpload({
    jobId: input.jobId,
    label: "Message Jeff",
    note: input.text,
    uploadedBy: input.sender || "Simon",
    sourceChannel: "mms",
    photos,
  });

  const result: Record<string, unknown> = isObject(response) ? response : {};
  const warnings = Array.isArray(result.warnings)
    ? result.warnings.filter((warning): warning is string => typeof warning === "string")
    : [];
  const assistantSay = optionalString(result.assistantSay);
  const data = isObject(result.data) ? result.data : {};
  const registeredPhotos = Array.isArray(data.photos)
    ? data.photos.filter((photo): photo is JeffFieldPhotoSummary => isObject(photo) && typeof photo.id === "string")
    : [];
  const media = Array.isArray(data.media)
    ? data.media.filter((item): item is JeffMediaItem => isObject(item) && typeof item.id === "string")
    : [];

  return {
    status: result.success === true
      ? assistantSay || `Registered ${photos.length} image attachment${photos.length === 1 ? "" : "s"} as field photos.`
      : assistantSay || "Image attachment stayed in the message thread but was not registered as a field photo.",
    photos: registeredPhotos,
    media,
    warnings,
  };
}

function isImageAttachment(attachment: JeffAppAttachment) {
  return (attachment.contentType || "").toLowerCase().startsWith("image/");
}

function updateAttachmentsFromRegisteredPhotos(
  attachments: JeffAppAttachment[] = [],
  photos: JeffFieldPhotoSummary[] = [],
) {
  if (photos.length === 0) return attachments;
  const unmatchedPhotos = [...photos];

  return attachments.map((attachment) => {
    if (!isImageAttachment(attachment)) return attachment;
    const matchIndex = unmatchedPhotos.findIndex((photo) => photo.fileName === attachment.fileName);
    const photo = matchIndex >= 0 ? unmatchedPhotos.splice(matchIndex, 1)[0] : unmatchedPhotos.shift();
    if (!photo) return attachment;

    return {
      ...attachment,
      mediaId: photo.mediaId,
      driveFileId: photo.driveFileId,
      driveWebViewLink: photo.driveWebViewLink,
      driveWebContentLink: photo.driveWebContentLink,
      url: photo.driveWebViewLink || photo.driveWebContentLink || photo.url || attachment.url,
    };
  });
}

function mediaStorageStatusForAttachment(attachment: JeffAppAttachment): JeffMediaItem["storageStatus"] {
  if (attachment.driveFileId) return "available";
  if (attachment.url && !attachment.url.startsWith("data:")) return "available";
  if (attachment.url?.startsWith("data:")) return "temporary";
  return "metadata-only";
}

function mediaProviderForAttachment(attachment: JeffAppAttachment): JeffMediaItem["storageProvider"] {
  if (attachment.driveFileId) return "google-drive";
  if (attachment.url && !attachment.url.startsWith("data:")) return "external-url";
  if (attachment.url?.startsWith("data:")) return "runtime-memory";
  return "metadata-only";
}

function parseStatusForAttachment(attachment: JeffAppAttachment): JeffMediaItem["parseStatus"] {
  const contentType = (attachment.contentType || "").toLowerCase();
  if (contentType.startsWith("image/")) return "not-needed";
  if (contentType.includes("pdf") || contentType.includes("text") || contentType.includes("csv")) return "pending";
  return "not-needed";
}

function buildMessageAttachmentMedia(input: JeffAppMessageInput, conversationId: string) {
  const timestamp = nowIso();

  return (input.attachments || [])
    .filter((attachment) => !isImageAttachment(attachment))
    .map((attachment): JeffMediaItem => ({
      id: attachment.mediaId || makeId("jeff-media"),
      jobId: input.jobId,
      conversationId,
      sourceChannel: "mms",
      uploadedAt: timestamp,
      uploadedBy: input.sender || "Simon",
      fileName: attachment.fileName,
      contentType: attachment.contentType || "application/octet-stream",
      sizeBytes: attachment.sizeBytes || 0,
      label: "Message Jeff",
      note: input.text,
      storageProvider: mediaProviderForAttachment(attachment),
      storageStatus: mediaStorageStatusForAttachment(attachment),
      driveFileId: attachment.driveFileId,
      driveWebViewLink: attachment.driveWebViewLink,
      driveWebContentLink: attachment.driveWebContentLink,
      externalUrl: attachment.driveFileId ? undefined : attachment.url,
      parseStatus: parseStatusForAttachment(attachment),
      reviewStatus: input.jobId ? "accepted" : "needs-review",
      metadata: {
        source: "jeff-app-message",
        attachmentKind: "message-file",
      },
      createdAt: timestamp,
      updatedAt: timestamp,
    }));
}

function messageActionFromResult(result: unknown, fallbackTool = "jeff_tool"): MessageToolAction {
  const value = isObject(result) ? result : {};
  const warnings = Array.isArray(value.warnings)
    ? value.warnings.filter((warning): warning is string => typeof warning === "string")
    : [];

  return {
    tool: optionalString(value.tool) || fallbackTool,
    success: value.success === true,
    assistantSay: optionalString(value.assistantSay),
    warning: warnings[0],
    data: isObject(value.data) ? value.data : value,
  };
}

function hasAny(text: string, patterns: string[]) {
  const normalized = text.toLowerCase();
  return patterns.some((pattern) => normalized.includes(pattern));
}

function likelyWantsEmail(text: string) {
  return (
    /\b(send|email|mail)\b.{0,40}\b(recap|summary|me|simon)\b/i.test(text) ||
    /\b(recap|summary)\b.{0,40}\b(email|mail|send)\b/i.test(text) ||
    /\bsend it to me\b/i.test(text)
  );
}

function likelyWantsGmailSync(text: string) {
  return (
    /\b(check|read|look at|pull|sync)\b.{0,45}\b(email|gmail|inbox|scan report|diagnostic reader|scanner)\b/i.test(text) ||
    /\b(i|scanner|reader|diagnostic reader)\b.{0,35}\b(emailed|sent|forwarded)\b.{0,35}\b(you|jeff|scan|report|results)\b/i.test(text) ||
    /\bscan report\b.{0,35}\b(email|gmail|inbox|sent|forwarded)\b/i.test(text)
  );
}

function likelyWantsCalendarSync(text: string) {
  return /\b(sync|mirror|update|push)\b.{0,35}\b(calendar|schedule)\b/i.test(text);
}

function likelyWantsKnowledgeSearch(text: string) {
  if (/https?:\/\/\S+/i.test(text)) return true;

  return (
    /\b(sop|playbook|rule|policy|process|template|quote format|pricing rule|how do we|how should we|what do we charge|rate|diagnostic quote|customer quote|internal service plan)\b/i.test(text) ||
    /\b(parasitic draw|battery disconnect|remote disconnect|starter|alternator|fuel pump|no[- ]?start|battery diagnostic|oreilly|o'reilly|parts cart|invoice|payment link|reseller|commercial account)\b/i.test(text)
  );
}

function likelyWantsPhotoAnalysis(text: string, attachments: JeffAppAttachment[] = []) {
  return attachments.some(isImageAttachment) && /\b(photo|picture|image|look|see|analy[sz]e|what is this|what do you see)\b/i.test(text);
}

function likelyWantsPartStore(text: string) {
  return /\b(part|parts|starter|alternator|battery|sensor|spark plugs?|coil|brake|caliper|rotor|filter|fuel pump|pump)\b/i.test(text) &&
    /\b(find|near|close|closest|store|oreilly|o'reilly|autozone|napa|buy|order|reserve|cart|pickup|pick up|get|available|in stock|has one|have one)\b/i.test(text);
}

function likelyWantsPurchaseBlocked(text: string) {
  return /\b(buy|order|reserve|cart|purchase|pay for|checkout|pick up|pickup)\b/i.test(text);
}

function likelyWantsPartsCartPrep(text: string) {
  return (likelyWantsPartStore(text) || likelyPartsFollowUp(text)) &&
    (
      /\b(cart|checkout|review\/?pay|payment link)\b/i.test(text) ||
      /\b(add|put)\b.{0,45}\b(cart)\b/i.test(text)
    );
}

function likelyWantsFieldNote(text: string) {
  return /\b(log|note|save this|record this|customer said|tech note|field note)\b/i.test(text);
}

function likelyWantsMemory(text: string) {
  return /\b(remember|preference|from now on|simon likes|simon prefers)\b/i.test(text);
}

function likelyWantsCloseout(text: string) {
  return /\b(closeout|close out|wrap up|finish(ed)? job|done with|complete(d)?)\b/i.test(text);
}

function extractPartName(text: string) {
  const patterns = [
    /\b(?:find|buy|order|reserve|get|add)\s+(?:a|an|the)?\s*([a-z0-9][a-z0-9\s-]{2,80}?)(?:\s+(?:near|close|from|at|for|to|and|please|asap|right now|where)\b|$)/i,
    /\b(?:need|needs)\s+(?:to\s+buy\s+)?(?:a|an|the)?\s*([a-z0-9][a-z0-9\s-]{2,80}?)(?:\s+(?:near|close|from|at|for|to|and|please|asap|right now|where)\b|$)/i,
  ];

  const explicitFuelPump = text.match(/\b((?:fuel|water|power steering)\s+pump)\b/i)?.[1];
  if (explicitFuelPump) return explicitFuelPump.trim();

  for (const pattern of patterns) {
    const match = text.match(pattern)?.[1];
    if (match) {
      return match
        .replace(/\b(that|this|cart|part|parts|store|pickup|pick up|someone has one|where|i can go|asap|right now)\b/gi, "")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 80);
    }
  }

  const knownPart = text.match(/\b(fuel pump|starter|alternator|battery|spark plugs?|ignition coils?|sensor|brake pads?|caliper|rotor|oil filter|air filter)\b/i)?.[1];
  return knownPart?.trim();
}

function extractVehicleFromText(text: string) {
  const normalized = text.replace(/\s+/g, " ");
  const vehicle = normalized.match(
    /\b((?:19|20)\d{2}\s+(?:chevy|chevrolet|ford|subaru|dodge|ram|toyota|honda|nissan|jeep|gmc|chrysler|cadillac|buick|kia|hyundai|mazda|volkswagen|vw)\s+[a-z0-9][a-z0-9 -]{1,35})\b/i,
  )?.[1];
  if (vehicle) return vehicle.replace(/\bchevy\b/i, "Chevy").trim();

  const astro = normalized.match(/\bastro\s+van\b/i)?.[0];
  if (astro) return "Chevy Astro";

  return undefined;
}

function selectedJobAppearsDifferent(jobLabel: string | undefined, vehicle: string | undefined) {
  if (!jobLabel || !vehicle) return false;
  const job = jobLabel.toLowerCase();
  const candidate = vehicle.toLowerCase();
  const year = candidate.match(/\b(19|20)\d{2}\b/)?.[0];
  const words = candidate
    .replace(/\b(19|20)\d{2}\b/g, "")
    .split(/\s+/)
    .filter((word) => word.length > 2);

  if (year && !job.includes(year)) return true;
  return words.some((word) => !job.includes(word));
}

function likelyPartsFollowUp(text: string) {
  return (
    /\b(where|who|which|closest|near|close|buy|get|order|reserve|pickup|pick up|in stock|available|has one|have one|add|cart|checkout|review|pay)\b/i.test(text) &&
    /\b(one|it|that|this|part|pump|starter|alternator|battery|sensor|plug|coil|filter)\b/i.test(text)
  );
}

function inferRecentPartsContext(messages: JeffAppThreadMessage[]) {
  for (const message of [...messages].reverse().slice(0, 8)) {
    if (message.role !== "simon") continue;
    const vehicle = extractVehicleFromText(message.text);
    const partName = extractPartName(message.text);
    if (vehicle || partName) return { vehicle, partName };
  }

  return {};
}

function applyRecentPartsFollowUpContext(
  input: JeffAppMessageInput,
  recentMessages: JeffAppThreadMessage[],
): JeffAppMessageInput {
  if (!input.text || !likelyPartsFollowUp(input.text)) return input;
  if (input.inferredVehicle && input.inferredPartName) return input;

  const inferred = inferRecentPartsContext(recentMessages);
  const recentVehicleDiffers = selectedJobAppearsDifferent(input.jobLabel, inferred.vehicle);
  const shouldDetachFromSelectedJob =
    !input.jobId ||
    input.contextMode === "different-job" ||
    input.contextMode === "parts-only" ||
    input.contextMode === "no-job" ||
    recentVehicleDiffers;

  if (!shouldDetachFromSelectedJob) return input;

  return {
    ...input,
    jobId: undefined,
    jobLabel: undefined,
    contextMode: recentVehicleDiffers ? "different-job" : "parts-only",
    inferredVehicle: input.inferredVehicle || inferred.vehicle,
    inferredPartName: input.inferredPartName || inferred.partName,
  };
}

function detectMessageContextMode(input: JeffAppMessageInput): JeffAppContextMode {
  const text = input.text || "";
  const normalized = text.toLowerCase();
  const vehicle = extractVehicleFromText(text);

  if (hasAny(normalized, ["different job", "another job", "not this job", "not the selected job", "for a different customer"])) {
    return "different-job";
  }
  if (hasAny(normalized, ["for me personally", "personal vehicle", "my truck", "my car", "for myself"])) {
    return "personal";
  }
  if (likelyWantsPartStore(text) && selectedJobAppearsDifferent(input.jobLabel, vehicle)) {
    return "different-job";
  }
  if (likelyWantsPartStore(text) && !input.jobId) {
    return "parts-only";
  }
  if (!input.jobId) return "no-job";
  if (likelyWantsCalendarSync(text) || likelyWantsGmailSync(text)) return "admin";

  return "selected-job";
}

function applyMessageContext(input: JeffAppMessageInput): JeffAppMessageInput {
  const contextMode = detectMessageContextMode(input);
  const shouldDetachFromSelectedJob =
    contextMode === "different-job" ||
    contextMode === "personal" ||
    contextMode === "parts-only" ||
    contextMode === "no-job";

  return {
    ...input,
    selectedJobId: input.jobId,
    selectedJobLabel: input.jobLabel,
    jobId: shouldDetachFromSelectedJob ? undefined : input.jobId,
    jobLabel: shouldDetachFromSelectedJob ? undefined : input.jobLabel,
    contextMode,
    inferredVehicle: extractVehicleFromText(input.text || ""),
    inferredPartName: extractPartName(input.text || ""),
  };
}

async function runMessageActionTools(input: JeffAppMessageInput): Promise<MessageToolAction[]> {
  const text = input.text || "";
  if (!text.trim() && !input.attachments?.length) return [];

  const actions: MessageToolAction[] = [];

  if (likelyWantsKnowledgeSearch(text)) {
    actions.push(messageActionFromResult(await searchWrenchReadyKnowledge({
      query: [
        input.jobLabel ? `Job: ${input.jobLabel}` : undefined,
        input.inferredVehicle ? `Vehicle: ${input.inferredVehicle}` : undefined,
        input.inferredPartName ? `Part: ${input.inferredPartName}` : undefined,
        text,
      ].filter(Boolean).join("\n"),
      focus: input.contextMode,
      limit: 5,
    }), "search_wrenchready_knowledge"));
  }

  if (likelyWantsFieldNote(text) && input.jobId) {
    actions.push(messageActionFromResult(await recordFieldNote({
      jobId: input.jobId,
      note: text,
      channel: input.attachments?.length ? "mms" : "sms",
      sender: input.sender || "Simon",
    }), "record_field_note"));
  }

  if (likelyWantsPhotoAnalysis(text, input.attachments) && input.jobId) {
    actions.push(messageActionFromResult(await analyzeFieldPhoto({
      jobId: input.jobId,
      question: text,
    }), "analyze_field_photo"));
  }

  if (likelyWantsGmailSync(text)) {
    actions.push(messageActionFromResult(await syncJeffGmailInbox({
      jobId: input.jobId,
      jobLabel: input.jobLabel,
      maxResults: 10,
    }), "sync_jeff_gmail_inbox"));
  }

  if (likelyWantsCalendarSync(text)) {
    actions.push(messageActionFromResult(await syncJeffCalendar({
      limit: 25,
    }), "sync_jeff_calendar"));
  }

  const quoteDraftPayload = buildQuoteDraftPayloadFromText({
    text,
    jobId: input.jobId,
    jobLabel: input.jobLabel || input.inferredVehicle,
    sourceLabel: "Message Jeff",
    sourceReference: "message-jeff",
  });
  if (quoteDraftPayload) {
    actions.push(messageActionFromResult(await prepareQuoteDraftForReview({
      ...quoteDraftPayload,
    }), "prepare_quote_draft_for_review"));
  }

  const wantsPartsStore =
    likelyWantsPartStore(text) ||
    (likelyPartsFollowUp(text) && Boolean(input.inferredPartName || input.inferredVehicle));

  if (wantsPartsStore) {
    const partName = input.inferredPartName || extractPartName(text);
    const vehicle = input.inferredVehicle || input.jobLabel;
    if (likelyWantsPartsCartPrep(text)) {
      actions.push(messageActionFromResult(await preparePartsCartForSimon({
        jobId: input.jobId,
        partName,
        vehicle,
        preferredVendor: "O'Reilly Auto Parts",
        sourceChannel: input.attachments?.length ? "mms" : "sms",
        spokenRequest: text,
      }), "prepare_parts_cart"));
    } else {
      actions.push(messageActionFromResult(await findNearbyPartsStoresForSimon({
        partName,
        vehicle,
        preferredVendor: "O'Reilly Auto Parts",
      }), "find_nearby_parts_stores"));
    }
  }

  if (likelyWantsPurchaseBlocked(text) && !likelyWantsPartsCartPrep(text)) {
    actions.push(messageActionFromResult(await purchaseOrReservePartBlocked({
      jobId: input.jobId,
      requestedPart: extractPartName(text),
      spokenRequest: text,
    }), "purchase_or_reserve_part"));
  }

  if (likelyWantsCloseout(text) && input.jobId) {
    actions.push(messageActionFromResult(await startCloseout({
      jobId: input.jobId,
      workCompleted: text,
    }), "start_closeout"));
  }

  if (likelyWantsMemory(text)) {
    actions.push(messageActionFromResult(await proposeCoreMemoryUpdate({
      jobId: input.jobId,
      memory: text,
      evidence: "Simon sent this in Message Jeff.",
      sourceChannel: input.attachments?.length ? "mms" : "sms",
    }), "propose_core_memory_update"));
  }

  if (likelyWantsEmail(text)) {
    actions.push(messageActionFromResult(await sendSimonRecapEmail({
      subject: input.jobLabel ? `Jeff recap: ${input.jobLabel}` : "Jeff recap from Message Jeff",
      body: text,
      sendNow: true,
    }), "send_simon_recap_email"));
  }

  return actions;
}

function partsStoreActionSummary(data: unknown) {
  if (!isObject(data) || !Array.isArray(data.stores)) return undefined;
  const question = optionalString(data.inventoryQuestion);
  const rows = data.stores.slice(0, 3).flatMap((store, index) => {
    if (!isObject(store)) return [];
    const route = isObject(store.route) ? store.route : {};
    const name = optionalString(store.name) || `Store ${index + 1}`;
    const phone = optionalString(store.phone);
    const address = optionalString(store.address);
    const map = optionalString(store.googleMapsUri);
    const duration = typeof route.durationMinutes === "number" ? `${route.durationMinutes} min` : undefined;
    const distance = typeof route.distanceMiles === "number" ? `${route.distanceMiles} mi` : undefined;

    return [
      `${index + 1}. ${[name, duration, distance, phone ? `phone ${phone}` : undefined, address, map].filter(Boolean).join(" / ")}`,
    ];
  });

  return [...rows, question ? `Inventory question: ${question}` : undefined].filter(Boolean).join("\n");
}

function partsCartActionSummary(data: unknown) {
  if (!isObject(data)) return undefined;
  const reviewPayUrl = optionalString(data.reviewPayUrl) || optionalString(data.vendorSearchUrl);
  const partName = optionalString(data.partName);
  const cartStatus = optionalString(data.cartStatus);
  const selectedStore = isObject(data.selectedStore) ? data.selectedStore : undefined;
  const storeName = selectedStore ? optionalString(selectedStore.name) : undefined;
  const storeAddress = selectedStore ? optionalString(selectedStore.address) : undefined;
  const storePhone = selectedStore ? optionalString(selectedStore.phone) : undefined;
  const storeMapUrl = optionalString(data.storeMapUrl);

  return [
    cartStatus ? `Cart status: ${cartStatus}` : undefined,
    partName ? `Part: ${partName}` : undefined,
    storeName ? `Store: ${[storeName, storeAddress, storePhone].filter(Boolean).join(" / ")}` : undefined,
    reviewPayUrl ? `Review/pay URL: ${reviewPayUrl}` : undefined,
    storeMapUrl ? `Store map: ${storeMapUrl}` : undefined,
    "Boundary: Jeff did not purchase, reserve, or order. Simon must verify fitment, availability, price, core charge, and pay.",
  ].filter(Boolean).join("\n");
}

function knowledgeActionSummary(data: unknown) {
  if (!isObject(data) || !Array.isArray(data.matches)) return undefined;
  const rows = data.matches.slice(0, 4).flatMap((match, index) => {
    if (!isObject(match)) return [];
    const title = optionalString(match.title) || `Knowledge match ${index + 1}`;
    const sourcePath = optionalString(match.sourcePath);
    const excerpt = optionalString(match.excerpt);

    return [
      `${index + 1}. ${[title, sourcePath].filter(Boolean).join(" / ")}${excerpt ? `: ${excerpt}` : ""}`,
    ];
  });

  return rows.length > 0 ? rows.join("\n") : "No strong WrenchReady knowledge match found.";
}

function buildActionContext(actions: MessageToolAction[]) {
  if (actions.length === 0) return "- No tool-backed action was run for this message.";

  return actions
    .map((action) => {
      const partsSummary = action.tool === "find_nearby_parts_stores" ? partsStoreActionSummary(action.data) : undefined;
      const cartSummary = action.tool === "prepare_parts_cart" ? partsCartActionSummary(action.data) : undefined;
      const knowledgeSummary = action.tool === "search_wrenchready_knowledge" ? knowledgeActionSummary(action.data) : undefined;
      return [
        `- ${action.tool}: ${action.success ? "success" : "blocked/failed"}${action.assistantSay ? ` - ${action.assistantSay}` : ""}${action.warning ? ` Warning: ${action.warning}` : ""}`,
        knowledgeSummary ? `  ${knowledgeSummary.replace(/\n/g, "\n  ")}` : undefined,
        partsSummary ? `  ${partsSummary.replace(/\n/g, "\n  ")}` : undefined,
        cartSummary ? `  ${cartSummary.replace(/\n/g, "\n  ")}` : undefined,
      ].filter(Boolean).join("\n");
    })
    .join("\n");
}

async function upsertOperatorTasksFromMessage(input: JeffAppMessageInput, params: {
  conversationId: string;
  summary: JeffConversationSummary;
  actions: MessageToolAction[];
}) {
  const sourceUrl = input.jobId ? `/ops/promises/${input.jobId}` : "/ops/field-assistant#jeff-call-workspace";
  const common = {
    promiseId: input.jobId,
    customerName: input.jobLabel,
    vehicleLabel: input.inferredVehicle || input.jobLabel,
    sourceChannel: "message" as const,
    sourceKind: "jeff-app-message",
    sourceId: params.conversationId,
    sourceUrl,
    metadata: {
      contextMode: input.contextMode,
      selectedJobId: input.selectedJobId,
      selectedJobLabel: input.selectedJobLabel,
      inferredVehicle: input.inferredVehicle,
      inferredPartName: input.inferredPartName,
      actions: params.actions.map((action) => ({
        tool: action.tool,
        success: action.success,
        warning: action.warning,
      })),
    },
  };
  const taskWrites: Array<Promise<unknown>> = [];
  const blockedAction = params.actions.find((action) => !action.success || action.warning);

  if (!input.jobId && input.contextMode !== "parts-only") {
    taskWrites.push(upsertOperatorTask({
      id: `operator-task-jeff-message-${params.conversationId}-review`,
      title: `Review Jeff message: ${input.inferredVehicle || input.inferredPartName || "unmatched message"}`,
      detail: input.text || params.summary.summary,
      type: "jeff-review",
      priority: input.contextMode === "admin" || input.contextMode === "different-job" ? "high" : "normal",
      owner: "Adam",
      blocker: "Message is not attached to a confirmed CRM job.",
      ...common,
    }));
  }

  if (params.actions.some((action) => action.tool === "prepare_quote_draft_for_review")) {
    taskWrites.push(upsertOperatorTask({
      id: `operator-task-jeff-message-${params.conversationId}-quote`,
      title: "Review quote draft from Message Jeff",
      detail: params.summary.recommendationSummary || input.text || "Jeff prepared or detected quote work that needs office review.",
      type: "quote-review",
      priority: "high",
      owner: "Adam",
      ...common,
    }));
  }

  if (params.actions.some((action) => ["prepare_parts_cart", "find_nearby_parts_stores", "purchase_or_reserve_part"].includes(action.tool))) {
    taskWrites.push(upsertOperatorTask({
      id: `operator-task-jeff-message-${params.conversationId}-parts`,
      title: "Parts follow-up from Simon",
      detail: params.summary.recommendationSummary || input.text || "Simon asked Jeff for parts support.",
      type: "parts",
      priority: "high",
      owner: "Simon",
      blocker: blockedAction?.tool === "purchase_or_reserve_part"
        ? "Jeff can help find stores and inventory questions, but purchasing/reserving is blocked."
        : undefined,
      ...common,
    }));
  }

  if (blockedAction) {
    taskWrites.push(upsertOperatorTask({
      id: `operator-task-jeff-message-${params.conversationId}-blocked`,
      title: `Unblock Jeff: ${blockedAction.tool}`,
      detail: blockedAction.warning || blockedAction.assistantSay || input.text || "Jeff reported a blocked or partial tool action.",
      type: "system",
      priority: "high",
      owner: "Adam",
      blocker: blockedAction.warning || "Tool action was blocked or partial.",
      ...common,
    }));
  }

  await Promise.all(taskWrites);
}

function fallbackReplyFromActions(actions: MessageToolAction[]) {
  const cartAction = actions.find((action) => action.tool === "prepare_parts_cart");
  if (cartAction?.success && isObject(cartAction.data)) {
    const reviewPayUrl = optionalString(cartAction.data.reviewPayUrl) || optionalString(cartAction.data.vendorSearchUrl);
    const partName = optionalString(cartAction.data.partName) || "that part";
    const fitmentStatus = optionalString(cartAction.data.fitmentStatus);
    const fitment = isObject(cartAction.data.fitment) ? cartAction.data.fitment : {};
    const missingFacts = Array.isArray(fitment.missingFacts)
      ? fitment.missingFacts.filter((fact): fact is string => typeof fact === "string")
      : [];
    const selectedStore = isObject(cartAction.data.selectedStore) ? cartAction.data.selectedStore : undefined;
    const storeName = selectedStore ? optionalString(selectedStore.name) : undefined;

    return [
      storeName
        ? `I prepared the parts handoff for ${partName} at ${storeName}.`
        : `I prepared the parts handoff for ${partName}.`,
      fitmentStatus ? `Fitment status: ${fitmentStatus}.` : undefined,
      missingFacts.length ? `Still need: ${missingFacts.join(", ")}.` : undefined,
      reviewPayUrl ? `Review and pay here: ${reviewPayUrl}` : undefined,
      "I did not buy, reserve, or order it. Verify exact fitment, availability, final price, and core charge before paying.",
    ].filter(Boolean).join("\n");
  }

  const usefulActions = actions
    .filter((action) => action.assistantSay)
    .map((action) => action.assistantSay);

  return usefulActions.length > 0 ? usefulActions.join("\n\n") : undefined;
}

function compactReadableValue(value: unknown, limit = 240): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value === "string") return value.trim().slice(0, limit) || undefined;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) {
    const parts = value
      .slice(0, 5)
      .map((entry) => compactReadableValue(entry, 90))
      .filter((entry): entry is string => Boolean(entry));
    if (!parts.length) return undefined;
    return `${parts.join("; ")}${value.length > parts.length ? `; +${value.length - parts.length} more` : ""}`.slice(0, limit);
  }
  if (!isObject(value)) return undefined;

  const usefulKeys = [
    "summary",
    "label",
    "name",
    "status",
    "partName",
    "part",
    "source",
    "note",
    "amount",
    "question",
    "result",
    "nextAction",
  ];
  const parts = usefulKeys
    .flatMap((key) => {
      const nested = compactReadableValue(value[key], 80);
      return nested ? [`${key}: ${nested}`] : [];
    })
    .slice(0, 4);

  return (parts.length ? parts.join("; ") : JSON.stringify(value).slice(0, limit)).slice(0, limit);
}

function fieldBriefLine(label: string, value: unknown) {
  const compact = compactReadableValue(value);
  return compact ? `- ${label}: ${compact}` : undefined;
}

function buildFieldBriefContextText(brief: unknown) {
  if (!isObject(brief)) return undefined;

  const customer = isObject(brief.customer) ? optionalString(brief.customer.name) : undefined;
  const lines = [
    customer ? `- Customer: ${customer}` : undefined,
    fieldBriefLine("Vehicle", brief.vehicle),
    fieldBriefLine("Scope", brief.serviceScope),
    fieldBriefLine("Authorized scope", brief.authorizedScope),
    fieldBriefLine("Approval", brief.approval),
    fieldBriefLine("Stop points", brief.stopPoints),
    fieldBriefLine("Known diagnostic path", brief.diagnosticPath),
    fieldBriefLine("Diagnostic tree", isObject(brief.diagnosticTree) ? brief.diagnosticTree.sourceGates : undefined),
    fieldBriefLine("Diagnostic tree link", brief.fieldPageUrl),
    fieldBriefLine("Parts status", brief.partsStatus),
    fieldBriefLine("Invoice/payment", brief.invoicePaymentStatus),
    fieldBriefLine("Evidence needed", brief.evidenceChecklist),
    fieldBriefLine("Next safe action", brief.nextAction),
  ].filter(Boolean);

  if (!lines.length) return undefined;
  return [
    "Selected job field packet. Use this silently; do not say you are checking context.",
    ...lines,
  ].join("\n");
}

async function loadMessageFieldContext(input: JeffAppMessageInput): Promise<MessageFieldContext> {
  if (!input.jobId) {
    return { status: "skipped" };
  }

  try {
    const fieldBrief = await getFieldBrief({ jobId: input.jobId });
    if (!fieldBrief.success) {
      return {
        status: "blocked",
        warning: fieldBrief.assistantSay,
      };
    }

    const data: Record<string, unknown> = isObject(fieldBrief.data) ? fieldBrief.data : {};
    const text = buildFieldBriefContextText(data.brief);
    return {
      status: text ? "loaded" : "blocked",
      text,
      summary: fieldBrief.assistantSay,
      warning: fieldBrief.warnings[0],
    };
  } catch (error) {
    return {
      status: "error",
      warning: error instanceof Error ? error.message : "Could not load selected job context.",
    };
  }
}

async function askJeffTextModel(
  input: JeffAppMessageInput,
  recentMessages: JeffAppThreadMessage[],
  actions: MessageToolAction[] = [],
  fieldContext: MessageFieldContext = { status: "skipped" },
) {
  const apiKey = readEnv("OPENAI_API_KEY");
  const model = readEnv("JEFF_FIELD_TEXT_MODEL", "JEFF_FIELD_REASONING_MODEL") || "gpt-5.5";
  const memories = await listApprovedJeffDurableMemories(50);
  const capabilities = await getJeffCapabilityReport();
  const actionFallback = fallbackReplyFromActions(actions);

  if (!apiKey) {
    return {
      reply: actionFallback || "I saved that, but my text brain is not connected because OPENAI_API_KEY is missing.",
      model,
      warning: "OPENAI_API_KEY is not configured.",
    };
  }

  const requestBody = {
    model,
    input: [
      {
        role: "system",
        content: [
          {
            type: "input_text",
            text: [
              jeffFieldAssistantSystemPrompt,
              "",
              "You are replying inside Jeff's phone-style field text thread.",
              "Keep answers concise, practical, and safe for a mobile mechanic in the field.",
              "Assume Simon is usually working alone. Give one-person-safe steps and one physical action at a time.",
              "Use research, memories, tools, and context internally, then answer like a human coach. Do not say according to my research, the research says, or the source says unless Simon asks for source detail.",
              "Default to: quick takeaway, one-sentence reason, next physical action.",
              "For mechanical questions, help from the symptom and test facts first. Do not force CRM context, job id, VIN, or customer details before giving a useful next test.",
              "If the message context says different-job, parts-only, personal, or no-job, do not drag the answer back to the selected CRM job.",
              "If Simon asks a follow-up like where can I buy one, continue the most recent part/vehicle from the thread unless the tool context says otherwise.",
              "If Simon asks for a part, test, purchase, diagnosis, safety judgment, invoice, or customer message, say what you can do now and what must be verified.",
              "Do not pretend a purchase, email, SMS, upload, or job update happened unless a tool or system state proves it.",
              "For quote-draft actions, say whether the draft is ready for human review. Do not say it was sent to a customer or turned into a payment link unless a separate tool action proves that.",
              "When tool-backed actions are listed, treat those outcomes as ground truth and summarize them plainly.",
              "For nearby parts-store results, include store names plus phone/address/map when available and the exact inventory-confirmation question. Do not claim live inventory unless a vendor-confirmed source proves it.",
              "For prepare_parts_cart results, include the exact review/pay URL from the tool result as a plain https link so the message portal can make it tappable. Say clearly that Jeff did not buy, reserve, or order the part.",
              "Use live capability status quietly. Do not recite system internals unless Simon asks what is connected or why something is blocked.",
              "",
              buildJeffCapabilityPromptContext(capabilities),
              "",
              "Approved durable memory:",
              buildMemoryContext(memories.memories) || "- None approved yet.",
              "",
              "Recent Jeff thread:",
              buildRecentContext(recentMessages) || "- No recent thread messages.",
              "",
              "Selected-job context loaded by the backend:",
              fieldContext.text || (fieldContext.status === "skipped" ? "- No selected job for this message." : `- ${fieldContext.status}: ${fieldContext.warning || "field context unavailable"}`),
              "",
              "Tool-backed actions for this message:",
              buildActionContext(actions),
            ].join("\n"),
          },
        ],
      },
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: [
              input.jobLabel ? `Job: ${input.jobLabel}` : undefined,
              input.jobId ? `Job id: ${input.jobId}` : undefined,
              input.contextMode ? `Message context: ${input.contextMode}` : undefined,
              input.selectedJobLabel && input.selectedJobLabel !== input.jobLabel
                ? `Selected app job ignored for this reply: ${input.selectedJobLabel}`
                : undefined,
              input.inferredVehicle ? `Vehicle from Simon's message: ${input.inferredVehicle}` : undefined,
              input.inferredPartName ? `Part from Simon's message: ${input.inferredPartName}` : undefined,
              input.attachments?.length
                ? `Attachments mentioned: ${input.attachments.map((attachment) => attachment.fileName).join(", ")}`
                : undefined,
              input.fieldPhotoStatus ? `Attachment status: ${input.fieldPhotoStatus}` : undefined,
              fieldContext.summary ? `Backend-loaded field context: ${fieldContext.summary}` : undefined,
              fieldContext.warning ? `Field context warning: ${fieldContext.warning}` : undefined,
              actions.length ? `Actions run: ${actions.map((action) => action.tool).join(", ")}` : undefined,
              `Simon says: ${input.text}`,
            ].filter(Boolean).join("\n"),
          },
        ],
      },
    ],
  };

  let response: Response;
  try {
    response = await fetch(OPENAI_RESPONSES_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });
  } catch (error) {
    return {
      reply: actionFallback || "I saved your message, but I could not get a live answer from Jeff's text brain yet.",
      model,
      warning: error instanceof Error ? error.message : "OpenAI text response failed before Jeff could answer.",
    };
  }
  const responseBody = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = extractOpenAIErrorMessage(responseBody);
    return {
      reply: actionFallback || "I saved your message, but I could not get a live answer from Jeff's text brain yet.",
      model,
      warning: message || `OpenAI text response failed with status ${response.status}.`,
    };
  }

  return {
    reply: extractOpenAIText(responseBody) || "I saved that. Tell me what you want me to do next.",
    model,
    warning: undefined,
  };
}

export async function sendJeffAppMessage(payload: unknown) {
  let input = applyMessageContext(normalizeInput(payload));
  const text = input.text;

  if (!text && !input.attachments?.length) {
    return {
      success: false,
      error: "Type a message or attach a file for Jeff.",
    };
  }

  const conversationId = makeId("jeff-app-message");
  const recent = await listJeffAppThreadMessages(20);
  input = applyRecentPartsFollowUpContext(input, recent.messages);
  const photoRegistration = await registerMessagePhotos(input);
  input.fieldPhotoStatus = photoRegistration.status;
  input.attachments = updateAttachmentsFromRegisteredPhotos(input.attachments, photoRegistration.photos);
  const savedAttachments = await saveAttachmentsToDrive(input.attachments);
  input.attachments = savedAttachments.attachments;
  const attachmentMedia = buildMessageAttachmentMedia(input, conversationId);
  const mediaWithConversation = [
    ...(photoRegistration.media || []).map((item) => ({
      ...item,
      conversationId,
      updatedAt: nowIso(),
      metadata: {
        ...item.metadata,
        sourceConversationId: conversationId,
      },
    })),
    ...attachmentMedia,
  ];
  const mediaStorage = await persistJeffMediaItems(mediaWithConversation);
  const actions = await runMessageActionTools(input);
  const fieldContext = await loadMessageFieldContext(input);
  const answer = await askJeffTextModel(input, recent.messages, actions, fieldContext);
  const timestamp = nowIso();
  const subject = input.jobLabel || input.inferredVehicle || input.inferredPartName || text?.slice(0, 90) || "Jeff app message";
  const transcript = [
    text ? `${input.sender || "Simon"}: ${text}` : undefined,
    answer.reply ? `Jeff: ${answer.reply}` : undefined,
  ].filter(Boolean).join("\n\n");
  const callType = input.jobId
    ? "job"
    : input.contextMode === "personal"
      ? "personal"
      : input.contextMode === "admin"
        ? "admin"
        : "unknown";
  const summaryKind = input.jobId
    ? "after_call"
    : input.contextMode === "no-job"
      ? "unresolved_call"
      : "manual_compaction";
  const reviewReason = input.jobId
    ? "Jeff app message attached by selected job."
    : input.contextMode === "different-job"
      ? "Jeff app message was intentionally detached because Simon said it was for a different job."
      : input.contextMode === "parts-only"
        ? "Jeff parts-only message captured without a selected job."
        : input.contextMode === "personal"
          ? "Jeff personal message captured outside CRM job context."
          : input.contextMode === "admin"
            ? "Jeff admin message captured outside CRM job context."
            : "Jeff app message is not attached to a confirmed job.";
  const conversation: JeffConversation = {
    id: conversationId,
    jobId: input.jobId,
    jobLabel: input.jobLabel,
    jobMatchStatus: input.jobId ? "manual" : "unresolved",
    callType,
    subjectLabel: subject,
    channel: input.attachments?.length ? "mms" : "sms",
    endedAt: timestamp,
    transcript,
    rawSummary: answer.reply,
    followUpRequested: false,
    followUpStatus: "none",
    needsReview: !input.jobId && input.contextMode !== "parts-only",
    reviewReason,
    sourcePayload: {
      source: "jeff-app-message",
      contextMode: input.contextMode,
      selectedJobId: input.selectedJobId,
      selectedJobLabel: input.selectedJobLabel,
      inferredVehicle: input.inferredVehicle,
      inferredPartName: input.inferredPartName,
      userMessage: text,
      assistantMessage: answer.reply,
      model: answer.model,
      fieldContextStatus: fieldContext.status,
      fieldContextSummary: fieldContext.summary,
      fieldContextWarning: fieldContext.warning,
      attachments: input.attachments,
      warning: answer.warning,
      attachmentStorage: savedAttachments.warnings.length > 0 ? "mixed-or-local" : "google-drive-or-none",
      fieldPhotoStatus: photoRegistration.status,
      mediaStorageStatus: mediaStorage.status,
      media: mediaWithConversation.map((item) => ({
        id: item.id,
        jobId: item.jobId,
        photoId: item.photoId,
        fileName: item.fileName,
        storageProvider: item.storageProvider,
        storageStatus: item.storageStatus,
      })),
      actions,
    },
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  const summary: JeffConversationSummary = {
    id: `${conversationId}-summary`,
    conversationId,
    jobId: input.jobId,
    summaryKind,
    summary: transcript || answer.reply,
    knownFacts: [
      input.jobLabel ? `Job: ${input.jobLabel}` : undefined,
      input.contextMode ? `Context: ${input.contextMode}` : undefined,
      input.inferredVehicle ? `Vehicle: ${input.inferredVehicle}` : undefined,
      input.inferredPartName ? `Part: ${input.inferredPartName}` : undefined,
      fieldContext.summary ? `Field context: ${fieldContext.summary}` : undefined,
      input.attachments?.length ? `Attachments: ${input.attachments.length}` : undefined,
    ].filter((entry): entry is string => Boolean(entry)),
    testsPerformed: [],
    readings: [],
    suspectedIssues: [],
    unprovenAssumptions: [],
    proofNeeded: input.attachments?.length ? [] : ["Ask for photos, scan reports, VIN, or readings when needed."],
    nextActions: [answer.reply],
    recommendationSummary: answer.reply,
    requestedFollowUps: [],
    emailRequested: false,
    emailStatus: "none",
    blockers: !input.jobId && input.contextMode === "no-job" ? ["Message is not attached to a confirmed job."] : [],
    confidence: "medium",
    createdAt: timestamp,
    metadata: {
      source: "jeff-app-message",
      contextMode: input.contextMode,
      selectedJobLabel: input.selectedJobLabel,
      inferredVehicle: input.inferredVehicle,
      inferredPartName: input.inferredPartName,
      model: answer.model,
      fieldContextStatus: fieldContext.status,
      fieldContextSummary: fieldContext.summary,
      fieldContextWarning: fieldContext.warning,
      warning: answer.warning,
      attachmentStorageWarnings: savedAttachments.warnings,
      fieldPhotoRegistrationWarnings: photoRegistration.warnings,
      mediaStorageWarning: mediaStorage.warning,
      actions,
    },
  };
  const storage = await persistJeffConversationWorkspace({ conversation, summary });
  await upsertOperatorTasksFromMessage(input, {
    conversationId,
    summary,
    actions,
  });

  return {
    success: true,
    message: appThreadMessagesFromConversation(conversation, summary),
    conversationId,
    storageStatus: storage.status,
    warning: answer.warning || mediaStorage.warning || storage.warning,
    warnings: [
      fieldContext.warning,
      ...photoRegistration.warnings,
      ...savedAttachments.warnings,
      mediaStorage.warning,
      storage.warning,
      ...actions.flatMap((action) => action.warning ? [action.warning] : []),
    ].filter(
      (warning): warning is string => Boolean(warning),
    ),
  };
}
