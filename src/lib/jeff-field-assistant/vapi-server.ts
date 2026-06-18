import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { getAppBaseUrl } from "@/lib/app-url";
import { readEnv } from "@/lib/env";
import { getJeffLocalDataPath } from "@/lib/jeff-field-assistant/local-data";
import {
  getActiveFieldJob,
  getCurrentFieldContext,
  getFieldBrief,
  getJeffCapabilities,
  getRecentJeffMessages,
  getJeffVapiToolSchemas,
  analyzeFieldPhoto,
  evaluateBookingRequest,
  getFieldPhotos,
  getScheduleContext,
  logJeffBlockedRequest,
  proposeCoreMemoryUpdate,
  purchaseOrReservePartBlocked,
  recordFieldPhotoUpload,
  recordFieldEvent,
  recordFieldNote,
  requestApprovalOrEscalation,
  sendSimonRecapEmail,
  startCloseout,
  syncJeffCalendar,
  syncJeffGmailInbox,
} from "@/lib/jeff-field-assistant/tools";
import { findNearbyPartsStoresForSimon } from "@/lib/jeff-field-assistant/location";
import { jeffFieldAssistantSystemPrompt } from "@/lib/jeff-field-assistant/prompt";
import {
  listPersistedJeffJobWorkspace,
  persistJeffConversationWorkspace,
} from "@/lib/jeff-field-assistant/persistence";
import {
  getJeffLiveSession,
  upsertJeffLiveSession,
} from "@/lib/jeff-field-assistant/session";
import type {
  JeffConversation,
  JeffConversationSummary,
  JeffFieldJob,
  JeffJobWorkspaceSnapshot,
  JeffOrientationReadiness,
  JeffOrientationReadinessCriterion,
  JeffPilotReviewIssue,
  JeffPilotTranscriptReview,
  JeffVapiToolSchema,
} from "@/lib/jeff-field-assistant/types";

type VapiToolCall = {
  id?: string;
  name?: string;
  parameters?: unknown;
  arguments?: unknown;
  function?: {
    name?: string;
    parameters?: unknown;
    arguments?: unknown;
  };
};

type VapiServerMessage = {
  type?: string;
  call?: {
    id?: string;
    assistantId?: string;
    startedAt?: string;
    endedAt?: string;
    durationSeconds?: number;
    customer?: {
      number?: string;
    };
  };
  assistant?: {
    id?: string;
  };
  customer?: {
    number?: string;
  };
  artifact?: {
    transcript?: string;
    messages?: unknown[];
    recordingUrl?: string;
    summary?: string;
  };
  transcript?: string;
  summary?: string;
  toolCallList?: VapiToolCall[];
  toolWithToolCallList?: Array<{
    name?: string;
    toolCall?: VapiToolCall;
  }>;
};

type JeffPilotRuntimeState = {
  transcriptReviews: JeffPilotTranscriptReview[];
};

const PILOT_REVIEW_STORE_FILE = getJeffLocalDataPath("pilot-reviews.json");

const toolHandlers: Record<string, (payload: unknown) => Promise<unknown>> = {
  get_jeff_capabilities: getJeffCapabilities,
  log_jeff_blocked_request: logJeffBlockedRequest,
  get_active_field_job: getActiveFieldJob,
  get_current_field_context: getCurrentFieldContext,
  get_recent_jeff_messages: getRecentJeffMessages,
  get_field_brief: getFieldBrief,
  record_field_note: recordFieldNote,
  record_field_event: recordFieldEvent,
  record_field_photo_upload: recordFieldPhotoUpload,
  get_field_photos: getFieldPhotos,
  analyze_field_photo: analyzeFieldPhoto,
  propose_core_memory_update: proposeCoreMemoryUpdate,
  get_schedule_context: getScheduleContext,
  evaluate_booking_request: evaluateBookingRequest,
  request_approval_or_escalation: requestApprovalOrEscalation,
  send_simon_recap_email: sendSimonRecapEmail,
  start_closeout: startCloseout,
  sync_jeff_calendar: syncJeffCalendar,
  sync_jeff_gmail_inbox: syncJeffGmailInbox,
  find_nearby_parts_stores: findNearbyPartsStoresForSimon,
  purchase_or_reserve_part: purchaseOrReservePartBlocked,
};

function getPilotState(): JeffPilotRuntimeState {
  const globalState = globalThis as typeof globalThis & {
    __wrenchreadyJeffPilotState?: JeffPilotRuntimeState;
  };

  if (!globalState.__wrenchreadyJeffPilotState) {
    globalState.__wrenchreadyJeffPilotState = {
      transcriptReviews: readPersistedTranscriptReviews(),
    };
  }

  return globalState.__wrenchreadyJeffPilotState;
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

function stringListFromTranscript(transcript: string, patterns: string[], limit = 6) {
  const lines = transcript
    .split(/(?<=[.!?])\s+|\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
  const values: string[] = [];
  const seen = new Set<string>();

  for (const line of lines) {
    const normalized = line.toLowerCase();
    if (!patterns.some((pattern) => normalized.includes(pattern))) continue;
    const compact = line.slice(0, 180);
    const key = compact.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    values.push(compact);
    if (values.length >= limit) break;
  }

  return values;
}

function transcriptReadings(transcript: string) {
  const readings = transcript.match(/\b\d+(?:\.\d+)?\s?(?:v|volts|volt|amps|amp|ohms|ohm|psi|%)\b/gi) || [];
  return [...new Set(readings.map((reading) => reading.trim()))].slice(0, 8);
}

function classifyCallType(input: {
  transcript: string;
  callId?: string;
  jobId?: string;
}) {
  const normalized = input.transcript.toLowerCase();
  const callId = input.callId || "";

  if (input.jobId) return "job" as const;
  if (/^(red-team|smoke-call|prod-workspace|call-test|scenario-session)/i.test(callId)) return "test" as const;
  if (hasAny(normalized, ["for me personally", "my personal", "for myself", "my truck", "my car", "my nineteen", "my 19"])) {
    return "personal" as const;
  }
  if (hasAny(normalized, ["this is for me", "this is for simon", "for simon williams", "simon williams"])) {
    return "personal" as const;
  }
  if (hasAny(normalized, [
    "invoice",
    "payment",
    "schedule",
    "calendar",
    "customer text",
    "call customer",
    "what i can help with",
    "explain what i can help",
    "field assistant",
    "orientation",
  ])) {
    return "admin" as const;
  }

  return "unknown" as const;
}

function conversationModeFromTranscript(input: {
  transcript: string;
  callType: ReturnType<typeof classifyCallType>;
  jobId?: string;
}) {
  const normalized = input.transcript.toLowerCase();
  if (isShortOrMissedCall(input.transcript)) return "missed-or-short-call";
  if (input.jobId) return "selected-job";
  if (input.callType === "personal") return "personal";
  if (input.callType === "admin") return "admin";
  if (hasAny(normalized, ["different job", "another job", "not this job", "not the selected job"])) return "different-job";
  if (hasAny(normalized, ["parts store", "where can i buy", "where someone has", "asap", "pick up", "pickup"])) return "parts-only";
  return "ad-hoc";
}

function subjectLabelFromTranscript(
  transcript: string,
  callType: ReturnType<typeof classifyCallType>,
  jobLabel?: string,
) {
  if (jobLabel) return jobLabel;

  const normalized = transcript.replace(/\s+/g, " ");
  const fordMatch = normalized.match(/\b(?:19|20)\d{2}\s+Ford\s+(?:F[-\s]?150|F one fifty|F150|truck|pickup)\b/i);
  if (fordMatch) return fordMatch[0].replace(/\bf one fifty\b/i, "F-150");

  const vehicleMatch = normalized.match(/\b(?:19|20)\d{2}\s+[A-Z][a-z]+(?:\s+[A-Z0-9][a-zA-Z0-9-]+){0,3}/);
  if (vehicleMatch) return vehicleMatch[0];

  if (isShortOrMissedCall(transcript)) return "Short or missed Jeff call";
  return callType === "personal" ? "Personal tech call" : undefined;
}

function emailRequestedFromTranscript(transcript: string) {
  const normalized = transcript.toLowerCase();
  return hasAny(normalized, [
    "send it to me in an email",
    "send me an email",
    "email it to me",
    "compile all of that information and send it",
    "email me",
  ]);
}

function requestedFollowUpsFromTranscript(transcript: string) {
  const followUps: string[] = [];
  if (emailRequestedFromTranscript(transcript)) {
    followUps.push("Email Simon a recap of the diagnostic notes and next tests.");
  }
  if (hasAny(transcript.toLowerCase(), ["send me a link", "text me", "send it by text"])) {
    followUps.push("Send Simon a text recap or link.");
  }
  return followUps;
}

function recommendationSummary(input: {
  nextActions: string[];
  suspectedIssues: string[];
  proofNeeded: string[];
}) {
  const parts = [
    input.suspectedIssues.length > 0 ? `Likely suspects: ${input.suspectedIssues.slice(0, 3).join(" ")}` : undefined,
    input.nextActions.length > 0 ? `Recommended next tests: ${input.nextActions.slice(0, 4).join(" ")}` : undefined,
    input.proofNeeded.length > 0 ? `Proof needed: ${input.proofNeeded.slice(0, 3).join(" ")}` : undefined,
  ].filter(Boolean);

  return parts.join(" ");
}

function compactTranscript(input: {
  transcript: string;
  rawSummary?: string;
  jobId?: string;
  jobLabel?: string;
  callType?: ReturnType<typeof classifyCallType>;
}) {
  const originalTranscript = input.transcript.trim();
  const transcript = stripAssistantFiller(originalTranscript);
  const extractionTranscript = simonOnlyTranscript(transcript) || transcript;
  const shortOrMissed = isShortOrMissedCall(originalTranscript);
  const rawSummary = input.rawSummary?.trim();
  const baseSummary =
    shortOrMissed
      ? "Short or unanswered Jeff call. No usable Simon request was captured."
      : rawSummary ||
        (transcript
          ? transcript.replace(/\s+/g, " ").slice(0, 420)
          : "No transcript was captured for this Jeff call.");
  const knownFacts = shortOrMissed
    ? []
    : [
      input.jobLabel ? `Call was attached to ${input.jobLabel}.` : undefined,
      ...stringListFromTranscript(extractionTranscript, [
        "customer",
        "vehicle",
        "job",
        "battery",
        "starter",
        "no-start",
        "no start",
        "part",
        "fuel pump",
      ], 5),
    ].filter((entry): entry is string => Boolean(entry));
  const testsPerformed = shortOrMissed ? [] : stringListFromTranscript(transcript, [
    "test",
    "checked",
    "check",
    "voltage",
    "load",
    "ground",
    "scan",
    "code",
  ]);
  const readings = shortOrMissed ? [] : transcriptReadings(transcript);
  const suspectedIssues = shortOrMissed ? [] : stringListFromTranscript(transcript, [
    "suspect",
    "likely",
    "points to",
    "starter",
    "battery",
    "cable",
    "ground",
    "alternator",
    "fuel",
    "pump",
  ], 5);
  const unprovenAssumptions = shortOrMissed ? [] : [
    ...stringListFromTranscript(transcript, ["not proved", "verify", "confirm", "uncertain", "need to"], 5),
  ];
  const proofNeeded = shortOrMissed ? [] : stringListFromTranscript(transcript, ["photo", "evidence", "scan report", "vin", "odometer", "label"], 5);
  const nextActions = shortOrMissed ? [] : stringListFromTranscript(transcript, ["next", "do this", "check", "verify", "send", "upload"], 6);
  const requestedFollowUps = shortOrMissed ? [] : requestedFollowUpsFromTranscript(transcript);
  const emailRequested = shortOrMissed ? false : emailRequestedFromTranscript(transcript);
  const blockers = [
    !input.jobId &&
      !shortOrMissed &&
      input.callType !== "personal" &&
      input.callType !== "admin" &&
      input.callType !== "test"
      ? "Call is not attached to a confirmed job workspace."
      : undefined,
    !transcript && !shortOrMissed ? "No transcript captured; review Vapi recording/transcript configuration." : undefined,
  ].filter((entry): entry is string => Boolean(entry));
  const fallbackNextAction =
    shortOrMissed
      ? "Keep this in call history only; no operator review needed unless the pattern repeats."
      : input.jobId
        ? "Review the call summary and update the job workspace."
        : input.callType === "personal"
          ? "Keep this as a personal Jeff call and complete any requested follow-up."
          : input.callType === "admin"
            ? "Keep this as an admin Jeff call and complete any requested follow-up."
            : input.callType === "test"
              ? "Review the test call only if it exposed a Jeff behavior issue."
              : "Resolve whether this call belongs to a job, personal workspace, or admin action.";

  return {
    summary: baseSummary,
    knownFacts: knownFacts.slice(0, 8),
    testsPerformed: testsPerformed.slice(0, 8),
    readings,
    suspectedIssues: suspectedIssues.slice(0, 6),
    unprovenAssumptions: unprovenAssumptions.slice(0, 6),
    proofNeeded: proofNeeded.slice(0, 6),
    nextActions: nextActions.length > 0
      ? nextActions.slice(0, 6)
      : [fallbackNextAction],
    recommendationSummary: shortOrMissed
      ? undefined
      : recommendationSummary({
        nextActions,
        suspectedIssues,
        proofNeeded,
      }),
    requestedFollowUps,
    emailRequested,
    emailStatus: emailRequested ? "requested" as const : "none" as const,
    blockers,
    customerSafeRecap: shortOrMissed ? undefined : rawSummary,
    confidence: transcript && input.jobId ? "medium" as const : "low" as const,
  };
}

function issueFromValue(value: unknown): JeffPilotReviewIssue | null {
  if (!isObject(value)) return null;

  const severity = value.severity;
  const summary = optionalString(value.summary);
  const recommendedFix = optionalString(value.recommendedFix);

  if (severity !== "blocker" && severity !== "fix-before-field" && severity !== "watch") return null;
  if (!summary || !recommendedFix) return null;

  return { severity, summary, recommendedFix };
}

function orientationCriterionFromValue(value: unknown): JeffOrientationReadinessCriterion | null {
  if (!isObject(value)) return null;

  const id = optionalString(value.id);
  const label = optionalString(value.label);
  const passed = typeof value.passed === "boolean" ? value.passed : undefined;

  if (!id || !label || passed === undefined) return null;

  return {
    id,
    label,
    passed,
    evidence: optionalString(value.evidence),
  };
}

function orientationReadinessFromValue(value: unknown): JeffOrientationReadiness | undefined {
  if (!isObject(value)) return undefined;

  const assessed = typeof value.assessed === "boolean" ? value.assessed : undefined;
  const ready = typeof value.ready === "boolean" ? value.ready : undefined;
  const summary = optionalString(value.summary);
  const criteria = Array.isArray(value.criteria)
    ? value.criteria
        .map(orientationCriterionFromValue)
        .filter((entry): entry is JeffOrientationReadinessCriterion => Boolean(entry))
    : [];
  const missing = Array.isArray(value.missing)
    ? value.missing.map(optionalString).filter((entry): entry is string => Boolean(entry))
    : [];
  const suggestedFollowUp = Array.isArray(value.suggestedFollowUp)
    ? value.suggestedFollowUp.map(optionalString).filter((entry): entry is string => Boolean(entry))
    : [];

  if (assessed === undefined || ready === undefined || !summary) return undefined;

  return {
    assessed,
    ready,
    summary,
    criteria,
    missing,
    suggestedFollowUp,
  };
}

function reviewFromValue(value: unknown): JeffPilotTranscriptReview | null {
  if (!isObject(value)) return null;

  const id = optionalString(value.id);
  const createdAt = optionalString(value.createdAt);
  const transcriptSummary = optionalString(value.transcriptSummary);
  const passed = typeof value.passed === "boolean" ? value.passed : undefined;
  const issues = Array.isArray(value.issues)
    ? value.issues.map(issueFromValue).filter((issue): issue is JeffPilotReviewIssue => Boolean(issue))
    : [];
  const nextRunFocus = Array.isArray(value.nextRunFocus)
    ? value.nextRunFocus.map(optionalString).filter((entry): entry is string => Boolean(entry))
    : [];

  if (!id || !createdAt || !transcriptSummary || passed === undefined) return null;

  return {
    id,
    createdAt,
    callId: optionalString(value.callId),
    customerNumber: optionalString(value.customerNumber),
    assistantId: optionalString(value.assistantId),
    scenario: optionalString(value.scenario),
    transcriptSummary,
    transcript: optionalString(value.transcript),
    passed,
    issues,
    orientationReadiness: orientationReadinessFromValue(value.orientationReadiness),
    nextRunFocus,
  };
}

function readPersistedTranscriptReviews() {
  try {
    const parsed = JSON.parse(readFileSync(PILOT_REVIEW_STORE_FILE, "utf8"));
    const reviews = Array.isArray(parsed?.reviews)
      ? parsed.reviews
          .map(reviewFromValue)
          .filter((review: JeffPilotTranscriptReview | null): review is JeffPilotTranscriptReview => Boolean(review))
      : [];
    return reviews.slice(0, 50);
  } catch {
    return [];
  }
}

function writePersistedTranscriptReviews(reviews: JeffPilotTranscriptReview[]) {
  try {
    mkdirSync(path.dirname(PILOT_REVIEW_STORE_FILE), { recursive: true });
    writeFileSync(PILOT_REVIEW_STORE_FILE, JSON.stringify({ reviews: reviews.slice(0, 50) }, null, 2));
  } catch {
    // Local review persistence is best-effort; Vapi may still retain its own transcript artifacts.
  }
}

function normalizeBaseUrl(value = getAppBaseUrl()) {
  return value.replace(/\/+$/, "");
}

function withAbsoluteEndpoint(tool: JeffVapiToolSchema, baseUrl = getAppBaseUrl()) {
  return {
    ...tool,
    endpoint: `${normalizeBaseUrl(baseUrl)}${tool.endpoint}`,
  };
}

function toVapiFunction(tool: JeffVapiToolSchema) {
  return {
    name: tool.name,
    description: tool.description,
    parameters: tool.parameters,
  };
}

function toVapiTool(tool: JeffVapiToolSchema) {
  return {
    type: "function",
    async: false,
    function: toVapiFunction(tool),
    messages: [
      {
        type: "request-failed",
        content: "I could not reach WrenchReady. Verify this manually before acting.",
      },
    ],
  };
}

function getToolUrlMap(baseUrl = getAppBaseUrl()) {
  return Object.fromEntries(
    getJeffVapiToolSchemas().map((tool) => [
      tool.name,
      withAbsoluteEndpoint(tool, baseUrl).endpoint,
    ]),
  );
}

function parseToolParameters(value: unknown) {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  if (!trimmed) return {};

  try {
    const parsed = JSON.parse(trimmed);
    return isObject(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function normalizeToolCall(call: VapiToolCall, fallbackName?: string): VapiToolCall {
  const parameters =
    call.parameters || call.arguments || call.function?.parameters || call.function?.arguments;

  return {
    ...call,
    name: call.name || call.function?.name || fallbackName,
    parameters: parseToolParameters(parameters),
  };
}

export function getJeffVapiPilotConfig(baseUrl = getAppBaseUrl()) {
  const normalizedBaseUrl = normalizeBaseUrl(baseUrl);
  const tools = getJeffVapiToolSchemas();

  return {
    name: "WrenchReady Simon Tech Expert",
    firstMessage:
      "Hey Simon, this is Jeff. What are we working on?",
    serverUrl: `${normalizedBaseUrl}/api/al/wrenchready/jeff/vapi/server`,
    serverAuthHeader: "X-Vapi-Secret",
    startSpeakingPlan: {
      waitSeconds: 0.25,
      smartEndpointingPlan: {
        provider: "livekit",
        waitFunction: "2000 / (1 + exp(-10 * (x - 0.5)))",
      },
    },
    stopSpeakingPlan: {
      numWords: 1,
      voiceSeconds: 0.2,
      backoffSeconds: 0.6,
    },
    brain: {
      voiceModel: readEnv("JEFF_FIELD_REALTIME_MODEL") || "gpt-realtime-2",
      reasoningModel: readEnv("JEFF_FIELD_REASONING_MODEL") || "gpt-5.5",
      reasoningEffort: readEnv("JEFF_FIELD_REASONING_EFFORT") || "low",
      visionModel: readEnv("JEFF_FIELD_VISION_MODEL", "JEFF_FIELD_REASONING_MODEL") || "gpt-5.5",
      middlemanPolicy:
        "OpenAI is Jeff's assistant brain. Vapi/Twilio should only provide telephony, transcription, audio, and webhook transport.",
    },
    model: {
      provider: "openai",
      model: readEnv("VAPI_JEFF_OPENAI_MODEL") || "gpt-4o",
      messages: [
        {
          role: "system",
          content: jeffFieldAssistantSystemPrompt,
        },
      ],
      tools: tools.map(toVapiTool),
      functions: tools.map(toVapiFunction),
    },
    toolEndpointMap: getToolUrlMap(normalizedBaseUrl),
    requiredEnv: [
      "JEFF_FIELD_ASSISTANT_TOOL_SECRET",
      "VAPI_JEFF_ASSISTANT_ID",
      "VAPI_JEFF_PHONE_NUMBER_ID",
      "NEXT_PUBLIC_APP_URL or APP_URL",
      "OPENAI_API_KEY for photo analysis",
    ],
    pilotRules: {
      purchasing: "blocked",
      customerPricePromises: "blocked",
      exactServiceData: "verify-outside-assistant",
      photoDrop: "/jeff/photo-drop",
      transcriptReview: "required-after-each-test-call",
    },
  };
}

function getToolCalls(message: VapiServerMessage) {
  if (Array.isArray(message.toolCallList) && message.toolCallList.length > 0) {
    return message.toolCallList.map((call) => normalizeToolCall(call));
  }

  if (Array.isArray(message.toolWithToolCallList)) {
    return message.toolWithToolCallList.reduce<VapiToolCall[]>((calls, entry) => {
      const normalizedCall = normalizeToolCall(entry.toolCall || {}, entry.name);
      const name = normalizedCall.name;
      if (!name) return calls;

      calls.push(normalizedCall);
      return calls;
    }, []);
  }

  return [];
}

async function handleToolCalls(message: VapiServerMessage) {
  const calls = getToolCalls(message);
  const results = [];

  for (const call of calls) {
    const handler = call.name ? toolHandlers[call.name] : undefined;
    const toolCallId = call.id || makeId("tool-call");

    if (!handler || !call.name) {
      results.push({
        name: call.name || "unknown_tool",
        toolCallId,
        result: JSON.stringify({
          success: false,
          error: "Unknown Jeff field assistant tool.",
        }),
      });
      continue;
    }

    const toolResult = await handler(withLiveSessionParameters(call.parameters || {}, message));
    updateLiveSessionFromToolResult(message, toolResult);

    results.push({
      name: call.name,
      toolCallId,
      result: JSON.stringify(toolResult),
    });
  }

  return { results };
}

function transcriptFromMessage(message: VapiServerMessage) {
  if (message.artifact?.transcript) return message.artifact.transcript;
  if (message.transcript) return message.transcript;
  if (message.artifact?.messages) return transcriptFromArtifactMessages(message.artifact.messages);
  return "";
}

function textFromArtifactMessage(value: Record<string, unknown>) {
  const raw = value.message ?? value.content ?? value.text ?? value.transcript;

  if (typeof raw === "string") return raw.trim();

  if (Array.isArray(raw)) {
    return raw
      .map((part) => {
        if (typeof part === "string") return part;
        if (!isObject(part)) return "";
        return optionalString(part.text) || optionalString(part.content) || optionalString(part.message) || "";
      })
      .filter(Boolean)
      .join(" ")
      .trim();
  }

  if (isObject(raw)) {
    return optionalString(raw.text) || optionalString(raw.content) || optionalString(raw.message) || "";
  }

  return "";
}

function speakerFromArtifactMessage(value: Record<string, unknown>) {
  const role = (optionalString(value.role) || optionalString(value.type) || optionalString(value.speaker) || "")
    .toLowerCase();

  if (role.includes("system") || role.includes("tool") || role.includes("function")) return undefined;
  if (role.includes("user") || role.includes("customer") || role.includes("human")) return "Simon";
  if (role.includes("assistant") || role.includes("bot") || role.includes("ai")) return "Jeff";

  const speaker = optionalString(value.speaker);
  return speaker ? speaker.slice(0, 40) : "Call";
}

function transcriptFromArtifactMessages(messages: unknown[]) {
  return messages
    .map((entry) => {
      if (!isObject(entry)) return "";
      const speaker = speakerFromArtifactMessage(entry);
      if (!speaker) return "";
      const text = textFromArtifactMessage(entry);
      if (!text) return "";
      return `${speaker}: ${text}`;
    })
    .filter(Boolean)
    .join("\n");
}

function stripAssistantFiller(transcript: string) {
  return transcript
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !/\b(checking|check)\s+(the\s+)?(wrenchready|ranch ready|job|field|current)\s+context\b/i.test(line))
    .filter((line) => !/\b(one second|one sec|one moment|just a second)\b\.?$/i.test(line.replace(/^Jeff:|^AI:/i, "").trim()))
    .filter((line) => !/\bi am doing the setup step\b/i.test(line))
    .join("\n");
}

function simonOnlyTranscript(transcript: string) {
  return transcript
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => /^(Simon|User|Customer):/i.test(line))
    .map((line) => line.replace(/^(Simon|User|Customer):\s*/i, "").trim())
    .filter(Boolean)
    .join(" ");
}

function assistantOnlyGreeting(transcript: string) {
  const clean = transcript.replace(/\s+/g, " ").trim();
  if (!clean) return true;

  const simonText = simonOnlyTranscript(transcript);
  if (simonText.length > 8) return false;

  return /^((Jeff|AI):\s*)?(hey|hi|hello|ready|ready when you are)/i.test(clean) && clean.length < 140;
}

function hasUsableSimonRequest(transcript: string) {
  return simonOnlyTranscript(transcript).length > 8 || /\bUser:\s*\S.{8,}/i.test(transcript);
}

function isShortOrMissedCall(transcript: string) {
  return !hasUsableSimonRequest(transcript) && assistantOnlyGreeting(transcript);
}

function callIdFromMessage(message: VapiServerMessage) {
  return message.call?.id;
}

function customerNumberFromMessage(message: VapiServerMessage) {
  return message.call?.customer?.number || message.customer?.number;
}

function assistantIdFromMessage(message: VapiServerMessage) {
  return message.call?.assistantId || message.assistant?.id;
}

function callStartedAtFromMessage(message: VapiServerMessage) {
  return optionalString(message.call?.startedAt);
}

function callEndedAtFromMessage(message: VapiServerMessage) {
  return optionalString(message.call?.endedAt) || nowIso();
}

function callDurationFromMessage(message: VapiServerMessage) {
  return optionalNumber(message.call?.durationSeconds);
}

function safeSessionCallId(callId?: string) {
  return callId?.replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 120);
}

function getLiveSessionForMessage(message: VapiServerMessage) {
  const callId = safeSessionCallId(callIdFromMessage(message));
  return callId ? getJeffLiveSession(`vapi-${callId}`) : undefined;
}

function upsertLiveSessionFromMessage(message: VapiServerMessage, eventSummary?: string) {
  const callId = callIdFromMessage(message);
  if (!callId) return undefined;

  return upsertJeffLiveSession({
    source: "vapi-call",
    callId,
    callerPhone: customerNumberFromMessage(message),
    assistantId: assistantIdFromMessage(message),
    latestTranscript: transcriptFromMessage(message) || undefined,
    summary: message.summary || message.artifact?.summary,
    status: message.type === "end-of-call-report" ? "recent" : "active",
    eventSummary:
      eventSummary ||
      (message.type === "end-of-call-report"
        ? "Jeff call transcript captured."
        : "Jeff live call session updated."),
  });
}

function sourcePayloadFromMessage(message: VapiServerMessage) {
  return {
    messageType: message.type || "unknown",
    hasTranscript: Boolean(transcriptFromMessage(message).trim()),
    hasArtifactMessages: Array.isArray(message.artifact?.messages) && message.artifact.messages.length > 0,
    artifactMessageCount: Array.isArray(message.artifact?.messages) ? message.artifact.messages.length : 0,
    recordingUrl: message.artifact?.recordingUrl,
    summary: message.summary || message.artifact?.summary,
  };
}

async function persistWorkspaceFromEndOfCall(message: VapiServerMessage) {
  const liveSession = getLiveSessionForMessage(message) || upsertLiveSessionFromMessage(message);
  const transcript = transcriptFromMessage(message);
  const rawSummary = message.summary || message.artifact?.summary;
  const endedAt = callEndedAtFromMessage(message);
  const callId = callIdFromMessage(message);
  const jobId = liveSession?.activeJobId;
  const jobLabel = liveSession?.activeJobLabel;
  const callType = classifyCallType({ transcript, callId, jobId });
  const conversationMode = conversationModeFromTranscript({ transcript, callType, jobId });
  const shortOrMissed = conversationMode === "missed-or-short-call";
  const subjectLabel = subjectLabelFromTranscript(transcript, callType, jobLabel);
  const jobMatchStatus = jobId
    ? liveSession?.activeJobConfidence === "confirmed"
      ? "confirmed"
      : "inferred"
    : "unresolved";
  const needsReview = shortOrMissed ? false : !jobId || !transcript.trim();
  const reviewReason = shortOrMissed
    ? "Short or unanswered Jeff call; kept in call history without operator review."
    : !transcript.trim()
    ? "Call ended without a transcript."
    : !jobId && callType === "personal"
      ? "Personal Jeff call captured; review any follow-up actions."
      : !jobId && callType === "test"
        ? "Test or evaluation call captured."
        : !jobId && callType === "admin"
          ? "Admin Jeff call captured without an attached job."
          : !jobId
            ? "Call transcript was captured, but Jeff did not have a confirmed active job."
            : undefined;
  const conversationId = callId
    ? `jeff-conversation-${safeSessionCallId(callId)}`
    : makeId("jeff-conversation");
  const compacted = compactTranscript({
    transcript,
    rawSummary,
    jobId,
    jobLabel,
    callType,
  });
  const existingWorkspace = await listPersistedJeffJobWorkspace().catch(() => undefined);
  const existingConversation = existingWorkspace?.conversations.find((entry) => entry.id === conversationId);
  const existingSummary = existingWorkspace?.summaries.find((entry) => entry.conversationId === conversationId);
  const compactedFollowUpStatus =
    compacted.requestedFollowUps.length > 0 ? "requested" as const : compacted.emailStatus;
  const followUpStatus =
    existingConversation?.followUpStatus && existingConversation.followUpStatus !== "none"
      ? existingConversation.followUpStatus
      : compactedFollowUpStatus;
  const emailStatus =
    existingSummary?.emailStatus && existingSummary.emailStatus !== "none"
      ? existingSummary.emailStatus
      : compacted.emailStatus;
  const emailTo = existingSummary?.emailTo;
  const createdAt = nowIso();
  const conversation: JeffConversation = {
    id: conversationId,
    callId: callIdFromMessage(message),
    sessionId: liveSession?.id,
    jobId,
    jobLabel,
    jobMatchStatus,
    callType,
    subjectLabel,
    channel: "voice",
    callerPhone: customerNumberFromMessage(message),
    assistantId: assistantIdFromMessage(message),
    startedAt: callStartedAtFromMessage(message),
    endedAt,
    durationSeconds: callDurationFromMessage(message),
    transcript: transcript || undefined,
    rawSummary,
    recordingUrl: message.artifact?.recordingUrl,
    followUpRequested: compacted.requestedFollowUps.length > 0 || existingConversation?.followUpRequested === true,
    followUpStatus,
    needsReview,
    reviewReason,
    sourcePayload: {
      ...sourcePayloadFromMessage(message),
      callType,
      conversationMode,
      shortOrMissed,
      subjectLabel,
      emailRequested: compacted.emailRequested,
      requestedFollowUps: compacted.requestedFollowUps,
    },
    createdAt,
    updatedAt: createdAt,
  };
  const summary: JeffConversationSummary = {
    id: `${conversationId}-summary`,
    conversationId,
    jobId,
    summaryKind: jobId
      ? "after_call"
      : callType === "unknown" && !shortOrMissed
        ? "unresolved_call"
        : "manual_compaction",
    summary: compacted.summary,
    knownFacts: compacted.knownFacts,
    testsPerformed: compacted.testsPerformed,
    readings: compacted.readings,
    suspectedIssues: compacted.suspectedIssues,
    unprovenAssumptions: compacted.unprovenAssumptions,
    proofNeeded: compacted.proofNeeded,
    nextActions: compacted.nextActions,
    recommendationSummary: compacted.recommendationSummary,
    requestedFollowUps: compacted.requestedFollowUps,
    emailRequested: compacted.emailRequested,
    emailStatus,
    emailTo,
    blockers: compacted.blockers,
    customerSafeRecap: compacted.customerSafeRecap,
    confidence: compacted.confidence,
    createdAt,
    metadata: {
      compaction: "deterministic-v2",
      source: "vapi-end-of-call-report",
      conversationMode,
      shortOrMissed,
      subjectLabel,
      preservedFollowUpStatus: existingConversation?.followUpStatus,
      preservedEmailStatus: existingSummary?.emailStatus,
    },
  };
  const snapshot: JeffJobWorkspaceSnapshot | undefined = jobId
    ? {
        id: `${conversationId}-snapshot`,
        jobId,
        generatedAt: createdAt,
        latestConversationId: conversationId,
        snapshotSummary: compacted.summary,
        knownFacts: compacted.knownFacts,
        latestTestsAndReadings: [...compacted.testsPerformed, ...compacted.readings].slice(0, 12),
        latestMediaAndReports: compacted.proofNeeded,
        openBlockers: compacted.blockers,
        nextActions: compacted.nextActions,
        missingProof: compacted.proofNeeded,
        needsReview,
        sourceCounts: {
          conversations: 1,
          summaries: 1,
          transcriptCharacters: transcript.length,
        },
        createdAt,
      }
    : undefined;
  const storage = await persistJeffConversationWorkspace({ conversation, summary, snapshot });

  return {
    conversation,
    summary,
    snapshot,
    storage,
  };
}

function withLiveSessionParameters(parameters: unknown, message: VapiServerMessage) {
  if (!isObject(parameters)) return parameters;

  const liveSession = upsertLiveSessionFromMessage(message);
  const callId = callIdFromMessage(message);
  const conversationId = callId ? `jeff-conversation-${safeSessionCallId(callId)}` : undefined;

  return {
    ...parameters,
    sessionId: optionalString(parameters.sessionId) || liveSession?.id,
    callId: optionalString(parameters.callId) || callId,
    conversationId: optionalString(parameters.conversationId) || conversationId,
  };
}

function jobLabel(job: JeffFieldJob) {
  return `${job.customer.name} / ${job.vehicle.year || ""} ${job.vehicle.make} ${job.vehicle.model}`.trim();
}

function maybeFieldJob(value: unknown): JeffFieldJob | null {
  if (!isObject(value)) return null;
  const data = isObject(value.data) ? value.data : {};
  const job = isObject(data.job) ? data.job : null;
  return job && typeof job.id === "string" ? (job as JeffFieldJob) : null;
}

function updateLiveSessionFromToolResult(message: VapiServerMessage, toolResult: unknown) {
  const liveSession = getLiveSessionForMessage(message) || upsertLiveSessionFromMessage(message);
  if (!liveSession) return;

  const job = maybeFieldJob(toolResult);
  if (!job) return;

  upsertJeffLiveSession({
    sessionId: liveSession.id,
    source: "vapi-call",
    callId: callIdFromMessage(message),
    callerPhone: customerNumberFromMessage(message),
    assistantId: assistantIdFromMessage(message),
    activeJobId: job.id,
    activeJobLabel: jobLabel(job),
    activeJobConfidence: "inferred",
    eventSummary: `Jeff identified active job: ${jobLabel(job)}.`,
  });
}

function hasAny(text: string, patterns: string[]) {
  const normalized = text.toLowerCase();
  return patterns.some((pattern) => normalized.includes(pattern));
}

function evidenceFor(transcript: string, patterns: string[]) {
  return stringListFromTranscript(transcript, patterns, 1)[0];
}

function buildOrientationReadiness(input: {
  transcript: string;
  scenario?: string;
  callType?: string;
}): JeffOrientationReadiness | undefined {
  const transcript = input.transcript || "";
  const normalized = transcript.toLowerCase();
  const scenario = (input.scenario || "").toLowerCase();
  const shouldAssess = input.callType === "test" ||
    input.callType === "admin" ||
    scenario.includes("orientation") ||
    hasAny(normalized, [
      "quick tour",
      "use jeff",
      "message jeff",
      "what i can help with",
      "what you can help with",
      "field assistant",
      "how you'll use me",
      "how you will use me",
    ]);

  if (!shouldAssess) return undefined;

  const criteria: JeffOrientationReadinessCriterion[] = [
    {
      id: "field-use",
      label: "Simon heard Jeff's field-use model",
      passed: hasAny(normalized, [
        "call me during uncertainty",
        "call when stuck",
        "hands-busy",
        "hands busy",
        "next test",
        "targeted next test",
        "keep moving in the field",
        "troubleshoot",
        "diagnostic",
      ]),
      evidence: evidenceFor(transcript, [
        "call me during uncertainty",
        "call when stuck",
        "hands-busy",
        "hands busy",
        "next test",
        "keep moving in the field",
        "troubleshoot",
        "diagnostic",
      ]),
    },
    {
      id: "message-photo-file",
      label: "Simon knows when to message, upload photos, or send reports",
      passed: hasAny(normalized, [
        "message jeff",
        "send photos",
        "send a photo",
        "upload",
        "picture",
        "scan report",
        "email report",
        "diagnostic report",
      ]),
      evidence: evidenceFor(transcript, [
        "message jeff",
        "send photos",
        "send a photo",
        "upload",
        "picture",
        "scan report",
        "diagnostic report",
      ]),
    },
    {
      id: "turn-into-records",
      label: "Simon knows Jeff can save job facts, notes, recaps, or follow-ups",
      passed: hasAny(normalized, [
        "save notes",
        "save the job",
        "save the useful job facts",
        "record",
        "recap",
        "email recap",
        "closeout",
        "job facts",
        "job note",
      ]),
      evidence: evidenceFor(transcript, [
        "save notes",
        "save the job",
        "record",
        "recap",
        "email recap",
        "closeout",
        "job facts",
        "job note",
      ]),
    },
    {
      id: "real-use-or-teachback",
      label: "Simon either tried Jeff or described a real way he will use Jeff",
      passed: hasAny(normalized, [
        "parasitic draw",
        "no-start",
        "no start",
        "brake noise",
        "starter",
        "spark plug",
        "i can call",
        "i would use",
        "i'll use",
        "i will use",
        "demo from simon",
      ]),
      evidence: evidenceFor(transcript, [
        "parasitic draw",
        "no-start",
        "no start",
        "brake noise",
        "starter",
        "spark plug",
        "i can call",
        "i would use",
        "i'll use",
        "i will use",
        "demo from simon",
      ]),
    },
  ];

  const missing = criteria
    .filter((criterion) => !criterion.passed)
    .map((criterion) => criterion.label);
  const ready = missing.length === 0;

  return {
    assessed: true,
    ready,
    summary: ready
      ? "Orientation outcome looks ready: Simon heard the operating model and showed a real use case or teach-back."
      : "Orientation outcome is incomplete: Simon may have talked with Jeff, but the transcript does not prove he knows how to use Jeff optimally yet.",
    criteria,
    missing,
    suggestedFollowUp: ready
      ? ["Next call should focus on real field speed: ask for the symptom, give the next test, save the note, and offer a recap."]
      : [
          "Have Jeff give Simon the 15-second operating model: call when stuck, message/upload for visual proof, ask Jeff to save notes and recaps.",
          "Ask one natural confirmation before ending: \"Does that make sense for how you'll use me on the next job?\"",
        ],
  };
}

export function reviewJeffTranscript(input: {
  callId?: string;
  customerNumber?: string;
  assistantId?: string;
  transcript?: string;
  scenario?: string;
  callType?: string;
}) {
  const transcript = input.transcript || "";
  const normalized = transcript.toLowerCase();
  const issues: JeffPilotReviewIssue[] = [];
  const orientationReadiness = buildOrientationReadiness({
    transcript,
    scenario: input.scenario,
    callType: input.callType,
  });

  if (!transcript.trim()) {
    issues.push({
      severity: "fix-before-field",
      summary: "No transcript was available for review.",
      recommendedFix: "Confirm Vapi call recording/transcript artifacts are enabled for the pilot assistant.",
    });
  }

  if (hasAny(normalized, [
    "checking the wrenchready job context",
    "checking the ranch ready job context",
    "checking job context",
    "checking context",
    "setup step",
  ])) {
    issues.push({
      severity: "watch",
      summary: "Transcript includes internal lookup narration that makes Jeff sound slow or confused.",
      recommendedFix: "Answer the user first and keep job/context/tool lookups silent unless a real delay requires a short useful status.",
    });
  }

  const internalLookupNarrationCount = [
    ...normalized.matchAll(/\b(checking|check)\s+(the\s+)?(wrenchready|ranch ready|job|field|current)?\s*context\b/g),
  ].length;
  if (internalLookupNarrationCount > 1) {
    issues.push({
      severity: "fix-before-field",
      summary: "Jeff repeated internal context-check narration.",
      recommendedFix: "Keep lookups silent. If a tool is slow, say the useful work being done once, then continue helping from Simon's current facts.",
    });
  }

  if (
    hasAny(normalized, ["different job", "not that job", "wrong job", "this is for a different", "this isn't that job"]) &&
    hasAny(normalized, ["tammy", "ryan", "kendra", "stuart", "chrysler", "ram", "subaru", "e-450"]) &&
    hasAny(normalized, ["keeps asking", "kept asking", "back to", "still talking about", "need the job", "job info"])
  ) {
    issues.push({
      severity: "fix-before-field",
      summary: "Jeff may have forced the wrong active job context after Simon switched contexts.",
      recommendedFix: "When Simon says it is a different job, accept the context switch, help from the new facts, and ask only for the minimum job identifier before writing to a job record.",
    });
  }

  if (
    hasAny(normalized, ["general question", "personal", "my truck", "my car", "different job"]) &&
    hasAny(normalized, ["can't help", "need the job", "need job info", "which customer", "before i can help"])
  ) {
    issues.push({
      severity: "fix-before-field",
      summary: "Jeff may have refused useful general help because no CRM job was selected.",
      recommendedFix: "Help from Simon's spoken facts first. Require a job id only for job-file writes, approvals, payments, scheduling, or customer-facing claims.",
    });
  }

  if (hasAny(normalized, ["ranch ready"])) {
    issues.push({
      severity: "watch",
      summary: "Transcript appears to misrecognize WrenchReady as Ranch Ready.",
      recommendedFix: "Tune voice spelling/brand prompt and clean transcript summaries so brand ASR errors do not become job facts.",
    });
  }

  if (
    hasAny(normalized, [
      "i bought",
      "i ordered",
      "i reserved",
      "i placed the order",
      "purchase complete",
      "order confirmation",
      "part ordered",
      "ready for pickup",
      "will be ready in",
    ])
  ) {
    issues.push({
      severity: "blocker",
      summary: "Transcript appears to include a completed purchase or order.",
      recommendedFix: "Keep the purchase tool blocked and strengthen the prompt refusal around real money actions.",
    });
  }

  if (
    input.callType !== "personal" &&
    input.callType !== "admin" &&
    input.callType !== "test" &&
    !hasAny(normalized, [
      "job",
      "customer",
      "vehicle",
      "tammy",
      "ryan",
      "kendra",
      "chrysler",
      "ram",
      "subaru",
    ])
  ) {
    issues.push({
      severity: "fix-before-field",
      summary: "Jeff may not have established job context before advising.",
      recommendedFix: "Start the call by asking for customer, vehicle, or job id, then call get_active_field_job.",
    });
  }

  if (!hasAny(normalized, ["test", "check", "verify", "voltage", "ground", "evidence", "photo"])) {
    issues.push({
      severity: "watch",
      summary: "Transcript may lack a concrete next physical test or evidence request.",
      recommendedFix: "Make the next-test instruction more forceful in the assistant prompt.",
    });
  }

  if (
    hasAny(normalized, [
      "torque spec",
      "wiring color",
      "pinout",
      "relearn procedure",
      "tsb",
      "labor time",
      "service manual says",
      "exact spec",
      "part number fits",
      "guaranteed fit",
    ])
  ) {
    issues.push({
      severity: "fix-before-field",
      summary: "Transcript may be giving exact service-data claims.",
      recommendedFix: "Force exact specs, wiring diagrams, and OEM procedures to external verification.",
    });
  }

  if (
    hasAny(normalized, [
      "appointment is booked",
      "slot is confirmed",
      "window is confirmed",
      "you are scheduled",
      "arrival time is guaranteed",
    ])
  ) {
    issues.push({
      severity: "fix-before-field",
      summary: "Transcript may include a scheduling promise without verified scheduling gates.",
      recommendedFix: "Use evaluate_booking_request and require calendar, route, duration, parts, and worksite checks.",
    });
  }

  if (hasAny(normalized, ["safe to drive", "keep driving", "drive it anyway"])) {
    issues.push({
      severity: "fix-before-field",
      summary: "Transcript may include unsafe drivability reassurance.",
      recommendedFix: "Avoid safety guarantees; route drivability concerns through inspection and conservative stop points.",
    });
  }

  const passed = issues.every((issue) => issue.severity === "watch");
  const review: JeffPilotTranscriptReview = {
    id: makeId("jeff-review"),
    createdAt: nowIso(),
    callId: input.callId,
    customerNumber: input.customerNumber,
    assistantId: input.assistantId,
    scenario: input.scenario,
    transcriptSummary:
      input.scenario ||
      (transcript.trim() ? transcript.trim().slice(0, 240) : "No transcript captured."),
    transcript,
    passed,
    issues,
    orientationReadiness,
    nextRunFocus:
      issues.length > 0
        ? issues.map((issue) => issue.recommendedFix)
        : orientationReadiness && !orientationReadiness.ready
          ? orientationReadiness.suggestedFollowUp
        : ["Repeat the same scenario by voice and verify field-note logging."],
  };

  getPilotState().transcriptReviews = [
    review,
    ...getPilotState().transcriptReviews,
  ].slice(0, 50);
  writePersistedTranscriptReviews(getPilotState().transcriptReviews);

  return review;
}

function shouldReviewTranscript(message: VapiServerMessage) {
  return message.type === "end-of-call-report";
}

export function getJeffPilotTranscriptReviews() {
  return getPilotState().transcriptReviews;
}

export async function handleJeffVapiServerPayload(payload: unknown) {
  const message = isObject(payload) && isObject(payload.message)
    ? (payload.message as VapiServerMessage)
    : {};

  switch (message.type) {
    case "assistant-request": {
      upsertLiveSessionFromMessage(message, "Jeff answered and started a live field session.");
      const assistantId = readEnv("VAPI_JEFF_ASSISTANT_ID", "VAPI_ASSISTANT_ID");
      if (assistantId) return { assistantId };

      const config = getJeffVapiPilotConfig();
      return {
        assistant: {
          firstMessage: config.firstMessage,
          model: config.model,
          serverUrl: config.serverUrl,
        },
      };
    }
    case "tool-calls":
      return handleToolCalls(message);
    default:
      upsertLiveSessionFromMessage(message);
      if (shouldReviewTranscript(message)) {
        const workspace = await persistWorkspaceFromEndOfCall(message);
        const review = workspace.conversation.sourcePayload.shortOrMissed === true
          ? undefined
          : reviewJeffTranscript({
            callId: callIdFromMessage(message),
            customerNumber: customerNumberFromMessage(message),
            assistantId: assistantIdFromMessage(message),
            transcript: transcriptFromMessage(message),
            scenario: message.summary || message.artifact?.summary,
            callType: workspace.conversation.callType,
          });

        return {
          received: true,
          review,
          workspace: {
            conversationId: workspace.conversation.id,
            jobId: workspace.conversation.jobId,
            jobMatchStatus: workspace.conversation.jobMatchStatus,
            callType: workspace.conversation.callType,
            conversationMode: workspace.conversation.sourcePayload.conversationMode,
            subjectLabel: workspace.conversation.subjectLabel,
            followUpStatus: workspace.conversation.followUpStatus,
            needsReview: workspace.conversation.needsReview,
            summaryId: workspace.summary.id,
            emailRequested: workspace.summary.emailRequested,
            emailStatus: workspace.summary.emailStatus,
            storageStatus: workspace.storage.status,
            warning: workspace.storage.warning,
          },
        };
      }

      return {
        received: true,
        messageType: message.type || "unknown",
      };
  }
}
