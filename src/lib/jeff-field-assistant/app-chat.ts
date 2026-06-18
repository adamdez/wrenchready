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
  proposeCoreMemoryUpdate,
  purchaseOrReservePartBlocked,
  recordFieldNote,
  recordFieldPhotoUpload,
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
  sender?: string;
  attachments?: JeffAppAttachment[];
  fieldPhotoStatus?: string;
};

type MessageToolAction = {
  tool: string;
  success: boolean;
  assistantSay?: string;
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
  };
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

function likelyWantsPhotoAnalysis(text: string, attachments: JeffAppAttachment[] = []) {
  return attachments.some(isImageAttachment) && /\b(photo|picture|image|look|see|analy[sz]e|what is this|what do you see)\b/i.test(text);
}

function likelyWantsPartStore(text: string) {
  return /\b(part|parts|starter|alternator|battery|sensor|spark plugs?|coil|brake|caliper|rotor|filter)\b/i.test(text) &&
    /\b(find|near|close|store|oreilly|o'reilly|autozone|napa|buy|order|reserve|cart|pickup|pick up|get)\b/i.test(text);
}

function likelyWantsPurchaseBlocked(text: string) {
  return /\b(buy|order|reserve|cart|purchase|pay for|checkout|pick up|pickup)\b/i.test(text);
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
    /\b(?:find|buy|order|reserve|get|add)\s+(?:a|an|the)?\s*([a-z0-9][a-z0-9\s-]{2,60}?)(?:\s+(?:near|close|from|at|for|to|and|please)\b|$)/i,
    /\b(?:need|needs)\s+(?:a|an|the)?\s*([a-z0-9][a-z0-9\s-]{2,60}?)(?:\s+(?:near|close|from|at|for|to|and|please)\b|$)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern)?.[1];
    if (match) {
      return match
        .replace(/\b(that|this|cart|part|parts|store|pickup|pick up)\b/gi, "")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 80);
    }
  }

  const knownPart = text.match(/\b(starter|alternator|battery|spark plugs?|ignition coils?|sensor|brake pads?|caliper|rotor|oil filter|air filter)\b/i)?.[1];
  return knownPart?.trim();
}

async function runMessageActionTools(input: JeffAppMessageInput): Promise<MessageToolAction[]> {
  const text = input.text || "";
  if (!text.trim() && !input.attachments?.length) return [];

  const actions: MessageToolAction[] = [];

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

  if (likelyWantsPartStore(text)) {
    const partName = extractPartName(text);
    actions.push(messageActionFromResult(await findNearbyPartsStoresForSimon({
      partName,
      vehicle: input.jobLabel,
    }), "find_nearby_parts_stores"));
  }

  if (likelyWantsPurchaseBlocked(text)) {
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

function buildActionContext(actions: MessageToolAction[]) {
  if (actions.length === 0) return "- No tool-backed action was run for this message.";

  return actions
    .map((action) => `- ${action.tool}: ${action.success ? "success" : "blocked/failed"}${action.assistantSay ? ` - ${action.assistantSay}` : ""}${action.warning ? ` Warning: ${action.warning}` : ""}`)
    .join("\n");
}

async function askJeffTextModel(
  input: JeffAppMessageInput,
  recentMessages: JeffAppThreadMessage[],
  actions: MessageToolAction[] = [],
) {
  const apiKey = readEnv("OPENAI_API_KEY");
  const model = readEnv("JEFF_FIELD_TEXT_MODEL", "JEFF_FIELD_REASONING_MODEL") || "gpt-4.1-mini";
  const memories = await listApprovedJeffDurableMemories(50);
  const capabilities = await getJeffCapabilityReport();

  if (!apiKey) {
    return {
      reply: "I saved that, but my text brain is not connected because OPENAI_API_KEY is missing.",
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
              "If Simon asks for a part, test, purchase, diagnosis, safety judgment, invoice, or customer message, say what you can do now and what must be verified.",
              "Do not pretend a purchase, email, SMS, upload, or job update happened unless a tool or system state proves it.",
              "When tool-backed actions are listed, treat those outcomes as ground truth and summarize them plainly.",
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
              input.attachments?.length
                ? `Attachments mentioned: ${input.attachments.map((attachment) => attachment.fileName).join(", ")}`
                : undefined,
              input.fieldPhotoStatus ? `Attachment status: ${input.fieldPhotoStatus}` : undefined,
              actions.length ? `Actions run: ${actions.map((action) => action.tool).join(", ")}` : undefined,
              `Simon says: ${input.text}`,
            ].filter(Boolean).join("\n"),
          },
        ],
      },
    ],
  };

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
      reply: "I saved your message, but I could not get a live answer from Jeff's text brain yet.",
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
  const input = normalizeInput(payload);
  const text = input.text;

  if (!text && !input.attachments?.length) {
    return {
      success: false,
      error: "Type a message or attach a file for Jeff.",
    };
  }

  const conversationId = makeId("jeff-app-message");
  const recent = await listJeffAppThreadMessages(20);
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
  const answer = await askJeffTextModel(input, recent.messages, actions);
  const timestamp = nowIso();
  const subject = input.jobLabel || text?.slice(0, 90) || "Jeff app message";
  const transcript = [
    text ? `${input.sender || "Simon"}: ${text}` : undefined,
    answer.reply ? `Jeff: ${answer.reply}` : undefined,
  ].filter(Boolean).join("\n\n");
  const conversation: JeffConversation = {
    id: conversationId,
    jobId: input.jobId,
    jobLabel: input.jobLabel,
    jobMatchStatus: input.jobId ? "manual" : "unresolved",
    callType: input.jobId ? "job" : "unknown",
    subjectLabel: subject,
    channel: input.attachments?.length ? "mms" : "sms",
    endedAt: timestamp,
    transcript,
    rawSummary: answer.reply,
    followUpRequested: false,
    followUpStatus: "none",
    needsReview: !input.jobId,
    reviewReason: input.jobId
      ? "Jeff app message attached by selected job."
      : "Jeff app message is not attached to a confirmed job.",
    sourcePayload: {
      source: "jeff-app-message",
      userMessage: text,
      assistantMessage: answer.reply,
      model: answer.model,
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
    summaryKind: input.jobId ? "after_call" : "unresolved_call",
    summary: transcript || answer.reply,
    knownFacts: [
      input.jobLabel ? `Job: ${input.jobLabel}` : undefined,
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
    blockers: input.jobId ? [] : ["Message is not attached to a confirmed job."],
    confidence: "medium",
    createdAt: timestamp,
    metadata: {
      source: "jeff-app-message",
      model: answer.model,
      warning: answer.warning,
      attachmentStorageWarnings: savedAttachments.warnings,
      fieldPhotoRegistrationWarnings: photoRegistration.warnings,
      mediaStorageWarning: mediaStorage.warning,
      actions,
    },
  };
  const storage = await persistJeffConversationWorkspace({ conversation, summary });

  return {
    success: true,
    message: appThreadMessagesFromConversation(conversation, summary),
    conversationId,
    storageStatus: storage.status,
    warning: answer.warning || mediaStorage.warning || storage.warning,
    warnings: [
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
