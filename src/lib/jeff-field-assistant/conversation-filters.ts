import type {
  JeffConversation,
  JeffConversationSummary,
  JeffDurableMemory,
  JeffFieldJob,
} from "@/lib/jeff-field-assistant/types";

const EVALUATION_TEXT_PATTERNS = [
  /\bred[- ]team\b/i,
  /\bjeff-fixture\b/i,
  /\bjeff test\b/i,
  /\bsmoke test\b/i,
  /\bsmoke test candidate\b/i,
  /\btest body\b/i,
  /\bdeploy smoke\b/i,
  /\bscenario[- ]session\b/i,
  /\bscenario tool[- ]call\b/i,
  /\bscenario wording\b/i,
  /\bpilot call scenario\b/i,
  /\bcall[- ]test\b/i,
  /\bprod[- ]workspace\b/i,
  /\bwrong[- ]secret\b/i,
  /\bwebhook test\b/i,
  /\bverification passed\b/i,
  /\bpersonal-call-email\b/i,
];

function sourceValueText(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return "";
  const source = value as Record<string, unknown>;
  return [
    source.source,
    source.userMessage,
    source.assistantMessage,
    source.model,
    source.callType,
  ]
    .filter((entry): entry is string => typeof entry === "string")
    .join(" ");
}

function conversationEvaluationText(conversation: JeffConversation) {
  return [
    conversation.id,
    conversation.callId,
    conversation.sessionId,
    conversation.jobId,
    conversation.jobLabel,
    conversation.subjectLabel,
    conversation.transcript,
    conversation.rawSummary,
    conversation.reviewReason,
    sourceValueText(conversation.sourcePayload),
  ]
    .filter((entry): entry is string => Boolean(entry))
    .join(" ");
}

export function isJeffEvaluationConversation(conversation: JeffConversation) {
  if (conversation.callType === "test") return true;
  const text = conversationEvaluationText(conversation);
  return EVALUATION_TEXT_PATTERNS.some((pattern) => pattern.test(text));
}

export function isJeffEvaluationSummary(summary?: JeffConversationSummary) {
  if (!summary) return false;
  const text = [
    summary.id,
    summary.conversationId,
    summary.summary,
    summary.recommendationSummary,
    summary.requestedFollowUps.join(" "),
    summary.metadata ? JSON.stringify(summary.metadata) : undefined,
  ]
    .filter((entry): entry is string => Boolean(entry))
    .join(" ");

  return EVALUATION_TEXT_PATTERNS.some((pattern) => pattern.test(text));
}

export function isJeffEvaluationMemory(memory: JeffDurableMemory) {
  const text = [
    memory.id,
    memory.subjectLabel,
    memory.category,
    memory.memory,
    memory.evidence,
    memory.evidenceEventIds.join(" "),
    memory.sourceJobId,
    memory.metadata ? JSON.stringify(memory.metadata) : undefined,
  ]
    .filter((entry): entry is string => Boolean(entry))
    .join(" ");

  return EVALUATION_TEXT_PATTERNS.some((pattern) => pattern.test(text));
}

export function isJeffFieldThreadConversation(conversation: JeffConversation) {
  return !isJeffEvaluationConversation(conversation);
}

export function isJeffFieldSelectableJob(job: JeffFieldJob, allowFixtures = false) {
  if (job.source === "jeff-fixture" && !allowFixtures) return false;

  const text = [
    job.id,
    job.customer.name,
    job.customer.phone,
    job.vehicle.make,
    job.vehicle.model,
    job.serviceScope,
    job.readinessSummary,
    job.nextAction,
  ]
    .filter((entry): entry is string => Boolean(entry))
    .join(" ");

  return !/\b(webhook test|policy test|memo test|smoke test)\b/i.test(text);
}

export function fieldSafeJeffNotice(notice?: string) {
  if (!notice) return "";

  if (/openai|responses api|model|api key/i.test(notice)) {
    return "Jeff saved the message, but the live AI answer was not available. Try again or call Jeff.";
  }

  if (/supabase|pgrst|schema cache|local pilot|storage|database|json/i.test(notice)) {
    return "Jeff is using backup storage or one connected system is slow. Tell Adam if this repeats.";
  }

  return notice;
}
