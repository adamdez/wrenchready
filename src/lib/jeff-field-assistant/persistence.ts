import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { hasPromiseCrmSupabase, supabaseRestRequest } from "@/lib/promise-crm/supabase";
import { getJeffLocalDataPath } from "@/lib/jeff-field-assistant/local-data";
import type {
  JeffConversation,
  JeffConversationCallType,
  JeffConversationJobMatchStatus,
  JeffConversationSummary,
  JeffConversationSummaryKind,
  JeffDurableMemory,
  JeffDurableMemorySensitivity,
  JeffDurableMemoryStatus,
  JeffDurableMemorySubjectType,
  JeffFieldChannel,
  JeffFieldConfidence,
  JeffFieldEvent,
  JeffFollowUpStatus,
  JeffJobWorkspaceSnapshot,
} from "@/lib/jeff-field-assistant/types";

type JeffFieldEventRow = {
  id: string;
  job_id: string;
  event_type: JeffFieldEvent["type"];
  channel: JeffFieldEvent["channel"];
  timestamp: string;
  sender: string;
  summary: string;
  extracted_facts: JeffFieldEvent["extractedFacts"] | null;
  raw_source_reference: string | null;
  confidence: JeffFieldEvent["confidence"];
  needs_review: boolean;
  created_at?: string;
};

type JeffDurableMemoryRow = {
  id: string;
  subject_type: JeffDurableMemorySubjectType;
  subject_key: string;
  subject_label: string;
  category: string;
  memory: string;
  evidence: string | null;
  evidence_event_ids: string[] | null;
  source_job_id: string | null;
  source_channel: JeffFieldChannel | null;
  status: JeffDurableMemoryStatus;
  confidence: JeffFieldConfidence;
  sensitivity: JeffDurableMemorySensitivity;
  created_by: string;
  approved_by: string | null;
  created_at: string;
  updated_at: string;
  approved_at: string | null;
  last_used_at: string | null;
  metadata: Record<string, unknown> | null;
};

type JeffConversationRow = {
  id: string;
  call_id: string | null;
  session_id: string | null;
  job_id: string | null;
  job_label: string | null;
  job_match_status: JeffConversationJobMatchStatus;
  call_type?: JeffConversationCallType | null;
  subject_label?: string | null;
  channel: JeffFieldChannel;
  caller_phone: string | null;
  assistant_id: string | null;
  started_at: string | null;
  ended_at: string;
  duration_seconds: number | null;
  transcript: string | null;
  raw_summary: string | null;
  recording_url: string | null;
  follow_up_requested?: boolean | null;
  follow_up_status?: JeffFollowUpStatus | null;
  needs_review: boolean;
  review_reason: string | null;
  source_payload: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

type JeffConversationSummaryRow = {
  id: string;
  conversation_id: string;
  job_id: string | null;
  summary_kind: JeffConversationSummaryKind;
  summary: string;
  known_facts: string[] | null;
  tests_performed: string[] | null;
  readings: string[] | null;
  suspected_issues: string[] | null;
  unproven_assumptions: string[] | null;
  proof_needed: string[] | null;
  next_actions: string[] | null;
  recommendation_summary?: string | null;
  requested_follow_ups?: string[] | null;
  email_requested?: boolean | null;
  email_status?: JeffFollowUpStatus | null;
  email_to?: string | null;
  blockers: string[] | null;
  customer_safe_recap: string | null;
  confidence: JeffFieldConfidence;
  created_at: string;
  metadata: Record<string, unknown> | null;
};

type JeffJobWorkspaceSnapshotRow = {
  id: string;
  job_id: string;
  generated_at: string;
  latest_conversation_id: string | null;
  snapshot_summary: string;
  known_facts: string[] | null;
  latest_tests_and_readings: string[] | null;
  latest_media_and_reports: string[] | null;
  open_blockers: string[] | null;
  next_actions: string[] | null;
  missing_proof: string[] | null;
  needs_review: boolean;
  source_counts: Record<string, unknown> | null;
  created_at: string;
};

export type JeffFieldEventPersistenceStatus =
  | "supabase-field-event"
  | "local-file"
  | "not-configured"
  | "failed";

export type JeffFieldEventPersistenceResult = {
  status: JeffFieldEventPersistenceStatus;
  warning?: string;
};

export type JeffDurableMemoryPersistenceStatus =
  | "supabase-memory"
  | "local-file"
  | "not-configured"
  | "failed";

export type JeffDurableMemoryPersistenceResult = {
  status: JeffDurableMemoryPersistenceStatus;
  warning?: string;
};

export type JeffDurableMemoryListResult = {
  memories: JeffDurableMemory[];
  warnings: string[];
  storageStatus: JeffDurableMemoryPersistenceStatus;
};

export type JeffDurableMemoryListOptions = {
  statuses?: JeffDurableMemoryStatus[];
  limit?: number;
};

export type JeffJobWorkspacePersistenceStatus =
  | "supabase-workspace"
  | "local-file"
  | "not-configured"
  | "failed";

export type JeffJobWorkspacePersistenceResult = {
  status: JeffJobWorkspacePersistenceStatus;
  warning?: string;
};

export type JeffJobWorkspaceListResult = {
  conversations: JeffConversation[];
  summaries: JeffConversationSummary[];
  latestSnapshot?: JeffJobWorkspaceSnapshot;
  warnings: string[];
  storageStatus: JeffJobWorkspacePersistenceStatus;
};

type LocalJeffJobWorkspaceState = {
  conversations: JeffConversation[];
  summaries: JeffConversationSummary[];
  snapshots: JeffJobWorkspaceSnapshot[];
};

export type JeffFieldEventMirrorSyncResult = {
  success: boolean;
  status: "local-only" | "mirrored" | "supabase-unavailable" | "failed";
  localEventCount: number;
  supabaseEventCount?: number;
  pushedToSupabase: number;
  pulledToLocal: number;
  warnings: string[];
};

function encodeFilterValue(value: string) {
  return encodeURIComponent(value);
}

const LOCAL_FIELD_EVENTS_FILE = getJeffLocalDataPath("field-events.json");
const LOCAL_DURABLE_MEMORY_FILE = getJeffLocalDataPath("memory.json");
const LOCAL_JOB_WORKSPACE_FILE = getJeffLocalDataPath("workspace.json");

function optionalString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function isEventType(value: unknown): value is JeffFieldEvent["type"] {
  return (
    value === "voice_call_started" ||
    value === "voice_transcript_note" ||
    value === "sms_received" ||
    value === "mms_photo_received" ||
    value === "field_upload_received" ||
    value === "photo_analysis_completed" ||
    value === "diagnostic_email_received" ||
    value === "scan_report_parsed" ||
    value === "part_search_completed" ||
    value === "cart_prepared" ||
    value === "purchase_blocked" ||
    value === "approval_requested" ||
    value === "approval_received" ||
    value === "invoice_updated" ||
    value === "payment_link_ready" ||
    value === "closeout_started" ||
    value === "field_note_recorded" ||
    value === "conflict_flagged"
  );
}

function isChannel(value: unknown): value is JeffFieldEvent["channel"] {
  return (
    value === "voice" ||
    value === "sms" ||
    value === "mms" ||
    value === "upload" ||
    value === "email" ||
    value === "vendor" ||
    value === "approval" ||
    value === "invoice" ||
    value === "payment" ||
    value === "system"
  );
}

function isConfidence(value: unknown): value is JeffFieldEvent["confidence"] {
  return value === "high" || value === "medium" || value === "low";
}

function isMemorySubjectType(value: unknown): value is JeffDurableMemorySubjectType {
  return (
    value === "technician" ||
    value === "business" ||
    value === "customer" ||
    value === "vehicle" ||
    value === "vendor" ||
    value === "workflow" ||
    value === "job" ||
    value === "other"
  );
}

function isMemoryStatus(value: unknown): value is JeffDurableMemoryStatus {
  return value === "candidate" || value === "approved" || value === "rejected" || value === "archived";
}

function isMemorySensitivity(value: unknown): value is JeffDurableMemorySensitivity {
  return value === "low" || value === "personal" || value === "sensitive" || value === "restricted";
}

function isJobMatchStatus(value: unknown): value is JeffConversationJobMatchStatus {
  return value === "confirmed" || value === "inferred" || value === "unresolved" || value === "manual";
}

function isConversationCallType(value: unknown): value is JeffConversationCallType {
  return value === "job" || value === "personal" || value === "test" || value === "admin" || value === "unknown";
}

function isFollowUpStatus(value: unknown): value is JeffFollowUpStatus {
  return value === "none" || value === "requested" || value === "drafted" || value === "sent" || value === "blocked" || value === "failed";
}

function isConversationSummaryKind(value: unknown): value is JeffConversationSummaryKind {
  return value === "after_call" || value === "manual_compaction" || value === "unresolved_call";
}

function stringArray(value: unknown) {
  return Array.isArray(value)
    ? value.map((entry) => optionalString(entry)).filter((entry): entry is string => Boolean(entry))
    : [];
}

function optionalNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function localEventFromValue(value: unknown): JeffFieldEvent | null {
  if (!isObject(value)) return null;

  const id = optionalString(value.id);
  const jobId = optionalString(value.jobId);
  const timestamp = optionalString(value.timestamp);
  const sender = optionalString(value.sender);
  const summary = optionalString(value.summary);

  if (!id || !jobId || !timestamp || !sender || !summary) return null;
  if (!isEventType(value.type) || !isChannel(value.channel) || !isConfidence(value.confidence)) return null;

  return {
    id,
    jobId,
    type: value.type,
    channel: value.channel,
    timestamp,
    sender,
    summary,
    extractedFacts: isObject(value.extractedFacts) ? value.extractedFacts : {},
    rawSourceReference: optionalString(value.rawSourceReference),
    confidence: value.confidence,
    needsReview: value.needsReview === true,
  };
}

function localMemoryFromValue(value: unknown): JeffDurableMemory | null {
  if (!isObject(value)) return null;

  const id = optionalString(value.id);
  const subjectKey = optionalString(value.subjectKey);
  const subjectLabel = optionalString(value.subjectLabel);
  const category = optionalString(value.category);
  const memory = optionalString(value.memory);
  const createdBy = optionalString(value.createdBy);
  const createdAt = optionalString(value.createdAt);
  const updatedAt = optionalString(value.updatedAt);

  if (!id || !subjectKey || !subjectLabel || !category || !memory || !createdBy || !createdAt || !updatedAt) {
    return null;
  }
  if (!isMemorySubjectType(value.subjectType) || !isMemoryStatus(value.status)) return null;
  if (!isConfidence(value.confidence) || !isMemorySensitivity(value.sensitivity)) return null;

  return {
    id,
    subjectType: value.subjectType,
    subjectKey,
    subjectLabel,
    category,
    memory,
    evidence: optionalString(value.evidence),
    evidenceEventIds: stringArray(value.evidenceEventIds),
    sourceJobId: optionalString(value.sourceJobId),
    sourceChannel: isChannel(value.sourceChannel) ? value.sourceChannel : undefined,
    status: value.status,
    confidence: value.confidence,
    sensitivity: value.sensitivity,
    createdBy,
    approvedBy: optionalString(value.approvedBy),
    createdAt,
    updatedAt,
    approvedAt: optionalString(value.approvedAt),
    lastUsedAt: optionalString(value.lastUsedAt),
    metadata: isObject(value.metadata) ? value.metadata : {},
  };
}

function localConversationFromValue(value: unknown): JeffConversation | null {
  if (!isObject(value)) return null;

  const id = optionalString(value.id);
  const endedAt = optionalString(value.endedAt);
  const createdAt = optionalString(value.createdAt);
  const updatedAt = optionalString(value.updatedAt);

  if (!id || !endedAt || !createdAt || !updatedAt) return null;
  if (!isJobMatchStatus(value.jobMatchStatus) || !isChannel(value.channel)) return null;

  return {
    id,
    callId: optionalString(value.callId),
    sessionId: optionalString(value.sessionId),
    jobId: optionalString(value.jobId),
    jobLabel: optionalString(value.jobLabel),
    jobMatchStatus: value.jobMatchStatus,
    callType: isConversationCallType(value.callType) ? value.callType : value.jobId ? "job" : "unknown",
    subjectLabel: optionalString(value.subjectLabel),
    channel: value.channel,
    callerPhone: optionalString(value.callerPhone),
    assistantId: optionalString(value.assistantId),
    startedAt: optionalString(value.startedAt),
    endedAt,
    durationSeconds: optionalNumber(value.durationSeconds),
    transcript: optionalString(value.transcript),
    rawSummary: optionalString(value.rawSummary),
    recordingUrl: optionalString(value.recordingUrl),
    followUpRequested: value.followUpRequested === true,
    followUpStatus: isFollowUpStatus(value.followUpStatus) ? value.followUpStatus : "none",
    needsReview: value.needsReview === true,
    reviewReason: optionalString(value.reviewReason),
    sourcePayload: isObject(value.sourcePayload) ? value.sourcePayload : {},
    createdAt,
    updatedAt,
  };
}

function localConversationSummaryFromValue(value: unknown): JeffConversationSummary | null {
  if (!isObject(value)) return null;

  const id = optionalString(value.id);
  const conversationId = optionalString(value.conversationId);
  const summary = optionalString(value.summary);
  const createdAt = optionalString(value.createdAt);

  if (!id || !conversationId || !summary || !createdAt) return null;
  if (!isConversationSummaryKind(value.summaryKind) || !isConfidence(value.confidence)) return null;

  return {
    id,
    conversationId,
    jobId: optionalString(value.jobId),
    summaryKind: value.summaryKind,
    summary,
    knownFacts: stringArray(value.knownFacts),
    testsPerformed: stringArray(value.testsPerformed),
    readings: stringArray(value.readings),
    suspectedIssues: stringArray(value.suspectedIssues),
    unprovenAssumptions: stringArray(value.unprovenAssumptions),
    proofNeeded: stringArray(value.proofNeeded),
    nextActions: stringArray(value.nextActions),
    recommendationSummary: optionalString(value.recommendationSummary),
    requestedFollowUps: stringArray(value.requestedFollowUps),
    emailRequested: value.emailRequested === true,
    emailStatus: isFollowUpStatus(value.emailStatus) ? value.emailStatus : "none",
    emailTo: optionalString(value.emailTo),
    blockers: stringArray(value.blockers),
    customerSafeRecap: optionalString(value.customerSafeRecap),
    confidence: value.confidence,
    createdAt,
    metadata: isObject(value.metadata) ? value.metadata : {},
  };
}

function localWorkspaceSnapshotFromValue(value: unknown): JeffJobWorkspaceSnapshot | null {
  if (!isObject(value)) return null;

  const id = optionalString(value.id);
  const jobId = optionalString(value.jobId);
  const generatedAt = optionalString(value.generatedAt);
  const snapshotSummary = optionalString(value.snapshotSummary);
  const createdAt = optionalString(value.createdAt);

  if (!id || !jobId || !generatedAt || !snapshotSummary || !createdAt) return null;

  return {
    id,
    jobId,
    generatedAt,
    latestConversationId: optionalString(value.latestConversationId),
    snapshotSummary,
    knownFacts: stringArray(value.knownFacts),
    latestTestsAndReadings: stringArray(value.latestTestsAndReadings),
    latestMediaAndReports: stringArray(value.latestMediaAndReports),
    openBlockers: stringArray(value.openBlockers),
    nextActions: stringArray(value.nextActions),
    missingProof: stringArray(value.missingProof),
    needsReview: value.needsReview === true,
    sourceCounts: isObject(value.sourceCounts) ? value.sourceCounts : {},
    createdAt,
  };
}

async function listLocalJeffFieldEvents(jobId?: string) {
  try {
    const parsed = JSON.parse(await readFile(LOCAL_FIELD_EVENTS_FILE, "utf8"));
    const events: JeffFieldEvent[] = Array.isArray(parsed?.events)
      ? parsed.events
          .map(localEventFromValue)
          .filter((event: JeffFieldEvent | null): event is JeffFieldEvent => Boolean(event))
      : [];

    return events
      .filter((event) => !jobId || event.jobId === jobId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  } catch {
    return [];
  }
}

async function listLocalJeffDurableMemories(options: JeffDurableMemoryListOptions = {}) {
  try {
    const parsed = JSON.parse(await readFile(LOCAL_DURABLE_MEMORY_FILE, "utf8"));
    const memories: JeffDurableMemory[] = Array.isArray(parsed?.memories)
      ? parsed.memories
          .map(localMemoryFromValue)
          .filter((memory: JeffDurableMemory | null): memory is JeffDurableMemory => Boolean(memory))
      : [];
    const statuses = new Set(options.statuses || []);
    const limit = Math.max(1, Math.min(options.limit || 100, 500));

    return memories
      .filter((memory) => statuses.size === 0 || statuses.has(memory.status))
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, limit);
  } catch {
    return [];
  }
}

async function readLocalJeffJobWorkspaceState(): Promise<LocalJeffJobWorkspaceState> {
  try {
    const parsed = JSON.parse(await readFile(LOCAL_JOB_WORKSPACE_FILE, "utf8"));
    return {
      conversations: Array.isArray(parsed?.conversations)
        ? parsed.conversations
            .map(localConversationFromValue)
            .filter((conversation: JeffConversation | null): conversation is JeffConversation => Boolean(conversation))
        : [],
      summaries: Array.isArray(parsed?.summaries)
        ? parsed.summaries
            .map(localConversationSummaryFromValue)
            .filter((summary: JeffConversationSummary | null): summary is JeffConversationSummary => Boolean(summary))
        : [],
      snapshots: Array.isArray(parsed?.snapshots)
        ? parsed.snapshots
            .map(localWorkspaceSnapshotFromValue)
            .filter((snapshot: JeffJobWorkspaceSnapshot | null): snapshot is JeffJobWorkspaceSnapshot => Boolean(snapshot))
        : [],
    };
  } catch {
    return { conversations: [], summaries: [], snapshots: [] };
  }
}

async function writeLocalJeffJobWorkspaceState(state: LocalJeffJobWorkspaceState) {
  await mkdir(path.dirname(LOCAL_JOB_WORKSPACE_FILE), { recursive: true });
  await writeFile(
    LOCAL_JOB_WORKSPACE_FILE,
    JSON.stringify(
      {
        conversations: state.conversations
          .sort((a, b) => new Date(b.endedAt).getTime() - new Date(a.endedAt).getTime())
          .slice(0, 500),
        summaries: state.summaries
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, 500),
        snapshots: state.snapshots
          .sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime())
          .slice(0, 500),
      },
      null,
      2,
    ),
  );
}

async function listLocalJeffJobWorkspace(jobId?: string): Promise<JeffJobWorkspaceListResult> {
  const state = await readLocalJeffJobWorkspaceState();
  const conversations = state.conversations
    .filter((conversation) => !jobId || conversation.jobId === jobId)
    .sort((a, b) => new Date(b.endedAt).getTime() - new Date(a.endedAt).getTime())
    .slice(0, 50);
  const conversationIds = new Set(conversations.map((conversation) => conversation.id));
  const summaries = state.summaries
    .filter((summary) => (!jobId || summary.jobId === jobId) || conversationIds.has(summary.conversationId))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 50);
  const latestSnapshot = state.snapshots
    .filter((snapshot) => !jobId || snapshot.jobId === jobId)
    .sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime())[0];

  return {
    conversations,
    summaries,
    latestSnapshot,
    warnings: [],
    storageStatus: "local-file",
  };
}

async function upsertLocalJeffFieldEvent(event: JeffFieldEvent) {
  await upsertLocalJeffFieldEvents([event]);
}

async function upsertLocalJeffFieldEvents(eventsToUpsert: JeffFieldEvent[]) {
  const events = await listLocalJeffFieldEvents();
  const byId = new Map<string, JeffFieldEvent>();
  for (const entry of [...eventsToUpsert, ...events]) byId.set(entry.id, entry);

  const nextEvents = [...byId.values()]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 1000);

  await mkdir(path.dirname(LOCAL_FIELD_EVENTS_FILE), { recursive: true });
  await writeFile(LOCAL_FIELD_EVENTS_FILE, JSON.stringify({ events: nextEvents }, null, 2));
}

async function upsertLocalJeffDurableMemory(memory: JeffDurableMemory) {
  await upsertLocalJeffDurableMemories([memory]);
}

async function upsertLocalJeffDurableMemories(memoriesToUpsert: JeffDurableMemory[]) {
  const memories = await listLocalJeffDurableMemories({ limit: 500 });
  const byId = new Map<string, JeffDurableMemory>();
  for (const entry of [...memoriesToUpsert, ...memories]) byId.set(entry.id, entry);

  const nextMemories = [...byId.values()]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 500);

  await mkdir(path.dirname(LOCAL_DURABLE_MEMORY_FILE), { recursive: true });
  await writeFile(LOCAL_DURABLE_MEMORY_FILE, JSON.stringify({ memories: nextMemories }, null, 2));
}

async function upsertLocalJeffJobWorkspace(input: {
  conversation: JeffConversation;
  summary: JeffConversationSummary;
  snapshot?: JeffJobWorkspaceSnapshot;
}) {
  const state = await readLocalJeffJobWorkspaceState();
  const conversationsById = new Map<string, JeffConversation>();
  const summariesById = new Map<string, JeffConversationSummary>();
  const snapshotsById = new Map<string, JeffJobWorkspaceSnapshot>();

  for (const conversation of [input.conversation, ...state.conversations]) conversationsById.set(conversation.id, conversation);
  for (const summary of [input.summary, ...state.summaries]) summariesById.set(summary.id, summary);
  for (const snapshot of [input.snapshot, ...state.snapshots]) {
    if (snapshot) snapshotsById.set(snapshot.id, snapshot);
  }

  await writeLocalJeffJobWorkspaceState({
    conversations: [...conversationsById.values()],
    summaries: [...summariesById.values()],
    snapshots: [...snapshotsById.values()],
  });
}

function mergeEvents(...groups: JeffFieldEvent[][]) {
  const byId = new Map<string, JeffFieldEvent>();
  for (const event of groups.flat()) byId.set(event.id, event);
  return [...byId.values()].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

function mergeById<T extends { id: string }>(...groups: T[][]) {
  const byId = new Map<string, T>();
  for (const entry of groups.flat()) byId.set(entry.id, entry);
  return [...byId.values()];
}

function latestWorkspaceSnapshot(...snapshots: Array<JeffJobWorkspaceSnapshot | undefined>) {
  return snapshots
    .filter((snapshot): snapshot is JeffJobWorkspaceSnapshot => Boolean(snapshot))
    .sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime())[0];
}

function toRow(event: JeffFieldEvent): JeffFieldEventRow {
  return {
    id: event.id,
    job_id: event.jobId,
    event_type: event.type,
    channel: event.channel,
    timestamp: event.timestamp,
    sender: event.sender,
    summary: event.summary,
    extracted_facts: event.extractedFacts,
    raw_source_reference: event.rawSourceReference || null,
    confidence: event.confidence,
    needs_review: event.needsReview,
  };
}

function fromRow(row: JeffFieldEventRow): JeffFieldEvent {
  return {
    id: row.id,
    jobId: row.job_id,
    type: row.event_type,
    channel: row.channel,
    timestamp: row.timestamp,
    sender: row.sender,
    summary: row.summary,
    extractedFacts: row.extracted_facts || {},
    rawSourceReference: row.raw_source_reference || undefined,
    confidence: row.confidence,
    needsReview: row.needs_review,
  };
}

function memoryToRow(memory: JeffDurableMemory): JeffDurableMemoryRow {
  return {
    id: memory.id,
    subject_type: memory.subjectType,
    subject_key: memory.subjectKey,
    subject_label: memory.subjectLabel,
    category: memory.category,
    memory: memory.memory,
    evidence: memory.evidence || null,
    evidence_event_ids: memory.evidenceEventIds,
    source_job_id: memory.sourceJobId || null,
    source_channel: memory.sourceChannel || null,
    status: memory.status,
    confidence: memory.confidence,
    sensitivity: memory.sensitivity,
    created_by: memory.createdBy,
    approved_by: memory.approvedBy || null,
    created_at: memory.createdAt,
    updated_at: memory.updatedAt,
    approved_at: memory.approvedAt || null,
    last_used_at: memory.lastUsedAt || null,
    metadata: memory.metadata,
  };
}

function memoryFromRow(row: JeffDurableMemoryRow): JeffDurableMemory {
  return {
    id: row.id,
    subjectType: row.subject_type,
    subjectKey: row.subject_key,
    subjectLabel: row.subject_label,
    category: row.category,
    memory: row.memory,
    evidence: row.evidence || undefined,
    evidenceEventIds: row.evidence_event_ids || [],
    sourceJobId: row.source_job_id || undefined,
    sourceChannel: row.source_channel || undefined,
    status: row.status,
    confidence: row.confidence,
    sensitivity: row.sensitivity,
    createdBy: row.created_by,
    approvedBy: row.approved_by || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    approvedAt: row.approved_at || undefined,
    lastUsedAt: row.last_used_at || undefined,
    metadata: row.metadata || {},
  };
}

function conversationToRow(conversation: JeffConversation): JeffConversationRow {
  return {
    id: conversation.id,
    call_id: conversation.callId || null,
    session_id: conversation.sessionId || null,
    job_id: conversation.jobId || null,
    job_label: conversation.jobLabel || null,
    job_match_status: conversation.jobMatchStatus,
    call_type: conversation.callType,
    subject_label: conversation.subjectLabel || null,
    channel: conversation.channel,
    caller_phone: conversation.callerPhone || null,
    assistant_id: conversation.assistantId || null,
    started_at: conversation.startedAt || null,
    ended_at: conversation.endedAt,
    duration_seconds: conversation.durationSeconds || null,
    transcript: conversation.transcript || null,
    raw_summary: conversation.rawSummary || null,
    recording_url: conversation.recordingUrl || null,
    follow_up_requested: conversation.followUpRequested,
    follow_up_status: conversation.followUpStatus,
    needs_review: conversation.needsReview,
    review_reason: conversation.reviewReason || null,
    source_payload: conversation.sourcePayload,
    created_at: conversation.createdAt,
    updated_at: conversation.updatedAt,
  };
}

function conversationFromRow(row: JeffConversationRow): JeffConversation {
  return {
    id: row.id,
    callId: row.call_id || undefined,
    sessionId: row.session_id || undefined,
    jobId: row.job_id || undefined,
    jobLabel: row.job_label || undefined,
    jobMatchStatus: row.job_match_status,
    callType: isConversationCallType(row.call_type) ? row.call_type : row.job_id ? "job" : "unknown",
    subjectLabel: row.subject_label || undefined,
    channel: row.channel,
    callerPhone: row.caller_phone || undefined,
    assistantId: row.assistant_id || undefined,
    startedAt: row.started_at || undefined,
    endedAt: row.ended_at,
    durationSeconds: row.duration_seconds || undefined,
    transcript: row.transcript || undefined,
    rawSummary: row.raw_summary || undefined,
    recordingUrl: row.recording_url || undefined,
    followUpRequested: row.follow_up_requested === true,
    followUpStatus: isFollowUpStatus(row.follow_up_status) ? row.follow_up_status : "none",
    needsReview: row.needs_review,
    reviewReason: row.review_reason || undefined,
    sourcePayload: row.source_payload || {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function conversationSummaryToRow(summary: JeffConversationSummary): JeffConversationSummaryRow {
  return {
    id: summary.id,
    conversation_id: summary.conversationId,
    job_id: summary.jobId || null,
    summary_kind: summary.summaryKind,
    summary: summary.summary,
    known_facts: summary.knownFacts,
    tests_performed: summary.testsPerformed,
    readings: summary.readings,
    suspected_issues: summary.suspectedIssues,
    unproven_assumptions: summary.unprovenAssumptions,
    proof_needed: summary.proofNeeded,
    next_actions: summary.nextActions,
    recommendation_summary: summary.recommendationSummary || null,
    requested_follow_ups: summary.requestedFollowUps,
    email_requested: summary.emailRequested,
    email_status: summary.emailStatus,
    email_to: summary.emailTo || null,
    blockers: summary.blockers,
    customer_safe_recap: summary.customerSafeRecap || null,
    confidence: summary.confidence,
    created_at: summary.createdAt,
    metadata: summary.metadata,
  };
}

function conversationSummaryFromRow(row: JeffConversationSummaryRow): JeffConversationSummary {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    jobId: row.job_id || undefined,
    summaryKind: row.summary_kind,
    summary: row.summary,
    knownFacts: row.known_facts || [],
    testsPerformed: row.tests_performed || [],
    readings: row.readings || [],
    suspectedIssues: row.suspected_issues || [],
    unprovenAssumptions: row.unproven_assumptions || [],
    proofNeeded: row.proof_needed || [],
    nextActions: row.next_actions || [],
    recommendationSummary: row.recommendation_summary || undefined,
    requestedFollowUps: row.requested_follow_ups || [],
    emailRequested: row.email_requested === true,
    emailStatus: isFollowUpStatus(row.email_status) ? row.email_status : "none",
    emailTo: row.email_to || undefined,
    blockers: row.blockers || [],
    customerSafeRecap: row.customer_safe_recap || undefined,
    confidence: row.confidence,
    createdAt: row.created_at,
    metadata: row.metadata || {},
  };
}

function workspaceSnapshotToRow(snapshot: JeffJobWorkspaceSnapshot): JeffJobWorkspaceSnapshotRow {
  return {
    id: snapshot.id,
    job_id: snapshot.jobId,
    generated_at: snapshot.generatedAt,
    latest_conversation_id: snapshot.latestConversationId || null,
    snapshot_summary: snapshot.snapshotSummary,
    known_facts: snapshot.knownFacts,
    latest_tests_and_readings: snapshot.latestTestsAndReadings,
    latest_media_and_reports: snapshot.latestMediaAndReports,
    open_blockers: snapshot.openBlockers,
    next_actions: snapshot.nextActions,
    missing_proof: snapshot.missingProof,
    needs_review: snapshot.needsReview,
    source_counts: snapshot.sourceCounts,
    created_at: snapshot.createdAt,
  };
}

function workspaceSnapshotFromRow(row: JeffJobWorkspaceSnapshotRow): JeffJobWorkspaceSnapshot {
  return {
    id: row.id,
    jobId: row.job_id,
    generatedAt: row.generated_at,
    latestConversationId: row.latest_conversation_id || undefined,
    snapshotSummary: row.snapshot_summary,
    knownFacts: row.known_facts || [],
    latestTestsAndReadings: row.latest_tests_and_readings || [],
    latestMediaAndReports: row.latest_media_and_reports || [],
    openBlockers: row.open_blockers || [],
    nextActions: row.next_actions || [],
    missingProof: row.missing_proof || [],
    needsReview: row.needs_review,
    sourceCounts: row.source_counts || {},
    createdAt: row.created_at,
  };
}

async function listSupabaseJeffFieldEvents(jobId?: string) {
  const jobFilter = jobId ? `&job_id=eq.${encodeFilterValue(jobId)}` : "";
  const rows = await supabaseRestRequest<JeffFieldEventRow[]>(
    `wrenchready_jeff_field_event?select=*&order=timestamp.desc&limit=1000${jobFilter}`,
    { method: "GET" },
  );

  return rows.map(fromRow);
}

async function upsertSupabaseJeffFieldEvents(events: JeffFieldEvent[]) {
  if (events.length === 0) return;

  await supabaseRestRequest<JeffFieldEventRow[]>("wrenchready_jeff_field_event?on_conflict=id", {
    method: "POST",
    body: events.map(toRow),
    prefer: "resolution=merge-duplicates,return=representation",
  });
}

function statusFilter(statuses?: JeffDurableMemoryStatus[]) {
  if (!statuses?.length) return "";
  if (statuses.length === 1) return `&status=eq.${encodeFilterValue(statuses[0])}`;
  return `&status=in.(${statuses.map(encodeFilterValue).join(",")})`;
}

async function listSupabaseJeffDurableMemories(options: JeffDurableMemoryListOptions = {}) {
  const limit = Math.max(1, Math.min(options.limit || 100, 500));
  const rows = await supabaseRestRequest<JeffDurableMemoryRow[]>(
    `wrenchready_jeff_memory?select=*&order=updated_at.desc&limit=${limit}${statusFilter(options.statuses)}`,
    { method: "GET" },
  );

  return rows.map(memoryFromRow);
}

async function upsertSupabaseJeffDurableMemory(memory: JeffDurableMemory) {
  const rows = await supabaseRestRequest<JeffDurableMemoryRow[]>("wrenchready_jeff_memory?on_conflict=id", {
    method: "POST",
    body: [memoryToRow(memory)],
    prefer: "resolution=merge-duplicates,return=representation",
  });

  return memoryFromRow(rows[0] || memoryToRow(memory));
}

async function upsertSupabaseJeffConversationWorkspace(input: {
  conversation: JeffConversation;
  summary: JeffConversationSummary;
  snapshot?: JeffJobWorkspaceSnapshot;
}) {
  const conversationRows = await supabaseRestRequest<JeffConversationRow[]>(
    "wrenchready_jeff_conversation?on_conflict=id",
    {
      method: "POST",
      body: [conversationToRow(input.conversation)],
      prefer: "resolution=merge-duplicates,return=representation",
    },
  );
  const savedConversation = conversationFromRow(conversationRows[0] || conversationToRow(input.conversation));

  const summaryRows = await supabaseRestRequest<JeffConversationSummaryRow[]>(
    "wrenchready_jeff_conversation_summary?on_conflict=id",
    {
      method: "POST",
      body: [conversationSummaryToRow(input.summary)],
      prefer: "resolution=merge-duplicates,return=representation",
    },
  );
  const savedSummary = conversationSummaryFromRow(summaryRows[0] || conversationSummaryToRow(input.summary));

  let savedSnapshot: JeffJobWorkspaceSnapshot | undefined;
  if (input.snapshot) {
    const snapshotRows = await supabaseRestRequest<JeffJobWorkspaceSnapshotRow[]>(
      "wrenchready_jeff_job_workspace_snapshot?on_conflict=id",
      {
        method: "POST",
        body: [workspaceSnapshotToRow(input.snapshot)],
        prefer: "resolution=merge-duplicates,return=representation",
      },
    );
    savedSnapshot = workspaceSnapshotFromRow(snapshotRows[0] || workspaceSnapshotToRow(input.snapshot));
  }

  return { conversation: savedConversation, summary: savedSummary, snapshot: savedSnapshot };
}

async function listSupabaseJeffJobWorkspace(jobId?: string): Promise<JeffJobWorkspaceListResult> {
  const jobFilter = jobId ? `&job_id=eq.${encodeFilterValue(jobId)}` : "";
  const [conversationRows, summaryRows, snapshotRows] = await Promise.all([
    supabaseRestRequest<JeffConversationRow[]>(
      `wrenchready_jeff_conversation?select=*&order=ended_at.desc&limit=50${jobFilter}`,
      { method: "GET" },
    ),
    supabaseRestRequest<JeffConversationSummaryRow[]>(
      `wrenchready_jeff_conversation_summary?select=*&order=created_at.desc&limit=50${jobFilter}`,
      { method: "GET" },
    ),
    jobId
      ? supabaseRestRequest<JeffJobWorkspaceSnapshotRow[]>(
          `wrenchready_jeff_job_workspace_snapshot?select=*&job_id=eq.${encodeFilterValue(jobId)}&order=generated_at.desc&limit=1`,
          { method: "GET" },
        )
      : Promise.resolve([]),
  ]);

  return {
    conversations: conversationRows.map(conversationFromRow),
    summaries: summaryRows.map(conversationSummaryFromRow),
    latestSnapshot: snapshotRows[0] ? workspaceSnapshotFromRow(snapshotRows[0]) : undefined,
    warnings: [],
    storageStatus: "supabase-workspace",
  };
}

function messageFromError(error: unknown) {
  return error instanceof Error ? error.message : "Unknown Supabase persistence error.";
}

export async function syncJeffFieldEventMirror(jobId?: string): Promise<JeffFieldEventMirrorSyncResult> {
  const localEvents = await listLocalJeffFieldEvents(jobId);

  if (!hasPromiseCrmSupabase()) {
    return {
      success: true,
      status: "local-only",
      localEventCount: localEvents.length,
      pushedToSupabase: 0,
      pulledToLocal: 0,
      warnings: ["Supabase is not configured, so Jeff's local field-event mirror is the only event store."],
    };
  }

  try {
    const supabaseEvents = await listSupabaseJeffFieldEvents(jobId);
    const localIds = new Set(localEvents.map((event) => event.id));
    const supabaseIds = new Set(supabaseEvents.map((event) => event.id));
    const eventsToPull = supabaseEvents.filter((event) => !localIds.has(event.id));
    const eventsToPush = localEvents.filter((event) => !supabaseIds.has(event.id));
    const warnings: string[] = [];

    if (eventsToPull.length > 0) {
      await upsertLocalJeffFieldEvents(eventsToPull);
    }

    try {
      await upsertSupabaseJeffFieldEvents(eventsToPush);
    } catch (error) {
      warnings.push(`Jeff local mirror push failed: ${messageFromError(error)}`);
    }

    return {
      success: warnings.length === 0,
      status: warnings.length === 0 ? "mirrored" : "supabase-unavailable",
      localEventCount: mergeEvents(localEvents, eventsToPull).length,
      supabaseEventCount: supabaseEvents.length + eventsToPush.length,
      pushedToSupabase: warnings.length === 0 ? eventsToPush.length : 0,
      pulledToLocal: eventsToPull.length,
      warnings,
    };
  } catch (error) {
    return {
      success: false,
      status: "failed",
      localEventCount: localEvents.length,
      pushedToSupabase: 0,
      pulledToLocal: 0,
      warnings: [`Jeff local mirror pull failed: ${messageFromError(error)}`],
    };
  }
}

export async function persistJeffFieldEvent(
  event: JeffFieldEvent,
): Promise<JeffFieldEventPersistenceResult> {
  if (!hasPromiseCrmSupabase()) {
    await upsertLocalJeffFieldEvent(event);
    return {
      status: "local-file",
      warning: "Supabase is not configured, so the Jeff field event was written to local pilot storage.",
    };
  }

  try {
    await upsertSupabaseJeffFieldEvents([event]);
    await upsertLocalJeffFieldEvent(event);

    return { status: "supabase-field-event" };
  } catch (error) {
    await upsertLocalJeffFieldEvent(event);
    return {
      status: "local-file",
      warning: `Jeff field event Supabase save failed, so it was written locally: ${messageFromError(error)}`,
    };
  }
}

export async function listPersistedJeffFieldEvents(jobId: string): Promise<{
  events: JeffFieldEvent[];
  warnings: string[];
  storageStatus: JeffFieldEventPersistenceStatus;
}> {
  if (!hasPromiseCrmSupabase()) {
    const localEvents = await listLocalJeffFieldEvents(jobId);
    return {
      events: localEvents,
      warnings: ["Supabase is not configured, so Jeff is reading local pilot field-event storage."],
      storageStatus: "local-file",
    };
  }

  try {
    const sync = await syncJeffFieldEventMirror(jobId);
    const localEvents = await listLocalJeffFieldEvents(jobId);
    const warnings = sync.warnings;

    return {
      events: localEvents.slice(0, 100),
      warnings,
      storageStatus: sync.success ? "supabase-field-event" : "local-file",
    };
  } catch (error) {
    const localEvents = await listLocalJeffFieldEvents(jobId);
    return {
      events: localEvents,
      warnings: [`Jeff field event Supabase read failed, so Jeff is reading local pilot storage: ${messageFromError(error)}`],
      storageStatus: "local-file",
    };
  }
}

export async function persistJeffDurableMemory(
  memory: JeffDurableMemory,
): Promise<JeffDurableMemoryPersistenceResult> {
  if (!hasPromiseCrmSupabase()) {
    await upsertLocalJeffDurableMemory(memory);
    return {
      status: "local-file",
      warning: "Supabase is not configured, so Jeff wrote the memory candidate to local pilot storage.",
    };
  }

  try {
    const saved = await upsertSupabaseJeffDurableMemory(memory);
    await upsertLocalJeffDurableMemory(saved);

    return { status: "supabase-memory" };
  } catch (error) {
    await upsertLocalJeffDurableMemory(memory);
    return {
      status: "local-file",
      warning: `Jeff durable memory Supabase save failed, so it was written locally: ${messageFromError(error)}`,
    };
  }
}

export async function listPersistedJeffDurableMemories(
  options: JeffDurableMemoryListOptions = {},
): Promise<JeffDurableMemoryListResult> {
  if (!hasPromiseCrmSupabase()) {
    const memories = await listLocalJeffDurableMemories(options);
    return {
      memories,
      warnings: ["Supabase is not configured, so Jeff is reading local pilot durable-memory storage."],
      storageStatus: "local-file",
    };
  }

  try {
    const memories = await listSupabaseJeffDurableMemories(options);
    await upsertLocalJeffDurableMemories(memories);

    return {
      memories,
      warnings: [],
      storageStatus: "supabase-memory",
    };
  } catch (error) {
    const memories = await listLocalJeffDurableMemories(options);
    return {
      memories,
      warnings: [`Jeff durable memory Supabase read failed, so Jeff is reading local pilot storage: ${messageFromError(error)}`],
      storageStatus: "local-file",
    };
  }
}

export async function listApprovedJeffDurableMemories(limit = 12) {
  return listPersistedJeffDurableMemories({
    statuses: ["approved"],
    limit,
  });
}

export async function updateJeffDurableMemoryStatus(input: {
  id: string;
  status: JeffDurableMemoryStatus;
  approvedBy?: string;
}): Promise<{ memory: JeffDurableMemory; storageStatus: JeffDurableMemoryPersistenceStatus; warnings: string[] }> {
  const updatedAt = new Date().toISOString();
  const approvedAt = input.status === "approved" ? updatedAt : undefined;
  const approvedBy = input.status === "approved" ? input.approvedBy || "Dez" : undefined;

  if (hasPromiseCrmSupabase()) {
    try {
      const rows = await supabaseRestRequest<JeffDurableMemoryRow[]>(
        `wrenchready_jeff_memory?id=eq.${encodeFilterValue(input.id)}`,
        {
          method: "PATCH",
          body: {
            status: input.status,
            updated_at: updatedAt,
            approved_at: approvedAt || null,
            approved_by: approvedBy || null,
          },
          prefer: "return=representation",
        },
      );
      const saved = rows[0] ? memoryFromRow(rows[0]) : undefined;
      if (!saved) throw new Error("Memory row was not found.");

      await upsertLocalJeffDurableMemory(saved);
      return { memory: saved, storageStatus: "supabase-memory", warnings: [] };
    } catch (error) {
      const localMemory = (await listLocalJeffDurableMemories({ limit: 500 })).find(
        (memory) => memory.id === input.id,
      );
      if (!localMemory) throw error;

      const updated = {
        ...localMemory,
        status: input.status,
        updatedAt,
        approvedAt,
        approvedBy,
      };
      await upsertLocalJeffDurableMemory(updated);
      return {
        memory: updated,
        storageStatus: "local-file",
        warnings: [`Jeff durable memory Supabase status update failed, so local pilot storage was updated: ${messageFromError(error)}`],
      };
    }
  }

  const localMemory = (await listLocalJeffDurableMemories({ limit: 500 })).find(
    (memory) => memory.id === input.id,
  );
  if (!localMemory) {
    throw new Error("Memory row was not found in local pilot storage.");
  }

  const updated = {
    ...localMemory,
    status: input.status,
    updatedAt,
    approvedAt,
    approvedBy,
  };
  await upsertLocalJeffDurableMemory(updated);

  return {
    memory: updated,
    storageStatus: "local-file",
    warnings: ["Supabase is not configured, so Jeff updated local pilot durable-memory storage."],
  };
}

export async function persistJeffConversationWorkspace(input: {
  conversation: JeffConversation;
  summary: JeffConversationSummary;
  snapshot?: JeffJobWorkspaceSnapshot;
}): Promise<JeffJobWorkspacePersistenceResult> {
  if (!hasPromiseCrmSupabase()) {
    await upsertLocalJeffJobWorkspace(input);
    return {
      status: "local-file",
      warning: "Supabase is not configured, so Jeff wrote the job workspace conversation to local pilot storage.",
    };
  }

  try {
    const saved = await upsertSupabaseJeffConversationWorkspace(input);
    await upsertLocalJeffJobWorkspace({
      conversation: saved.conversation,
      summary: saved.summary,
      snapshot: saved.snapshot,
    });

    return { status: "supabase-workspace" };
  } catch (error) {
    await upsertLocalJeffJobWorkspace(input);
    return {
      status: "local-file",
      warning: `Jeff job workspace Supabase save failed, so it was written locally: ${messageFromError(error)}`,
    };
  }
}

export async function listPersistedJeffJobWorkspace(jobId?: string): Promise<JeffJobWorkspaceListResult> {
  if (!hasPromiseCrmSupabase()) {
    const localWorkspace = await listLocalJeffJobWorkspace(jobId);
    return {
      ...localWorkspace,
      warnings: ["Supabase is not configured, so Jeff is reading local pilot job-workspace storage."],
      storageStatus: "local-file",
    };
  }

  try {
    const workspace = await listSupabaseJeffJobWorkspace(jobId);
    const localWorkspace = await listLocalJeffJobWorkspace(jobId);
    const conversations = mergeById(workspace.conversations, localWorkspace.conversations)
      .sort((a, b) => new Date(b.endedAt).getTime() - new Date(a.endedAt).getTime())
      .slice(0, 50);
    const conversationIds = new Set(conversations.map((conversation) => conversation.id));
    const summaries = mergeById(workspace.summaries, localWorkspace.summaries)
      .filter((summary) => (!jobId || summary.jobId === jobId) || conversationIds.has(summary.conversationId))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 50);

    return {
      conversations,
      summaries,
      latestSnapshot: latestWorkspaceSnapshot(workspace.latestSnapshot, localWorkspace.latestSnapshot),
      warnings: [],
      storageStatus: workspace.storageStatus,
    };
  } catch (error) {
    const localWorkspace = await listLocalJeffJobWorkspace(jobId);
    return {
      ...localWorkspace,
      warnings: [`Jeff job workspace Supabase read failed, so Jeff is reading local pilot storage: ${messageFromError(error)}`],
      storageStatus: "local-file",
    };
  }
}

export async function listUnresolvedJeffConversations(limit = 25): Promise<JeffJobWorkspaceListResult> {
  if (!hasPromiseCrmSupabase()) {
    const localWorkspace = await listLocalJeffJobWorkspace();
    return {
      ...localWorkspace,
      conversations: localWorkspace.conversations
        .filter((conversation) => conversation.needsReview || conversation.jobMatchStatus === "unresolved")
        .slice(0, limit),
      summaries: localWorkspace.summaries
        .filter((summary) => summary.summaryKind === "unresolved_call")
        .slice(0, limit),
      warnings: ["Supabase is not configured, so Jeff is reading local pilot unresolved-call storage."],
      storageStatus: "local-file",
    };
  }

  try {
    const rows = await supabaseRestRequest<JeffConversationRow[]>(
      `wrenchready_jeff_conversation?select=*&or=(needs_review.eq.true,job_match_status.eq.unresolved)&order=ended_at.desc&limit=${Math.max(1, Math.min(limit, 100))}`,
      { method: "GET" },
    );
    const conversations = rows.map(conversationFromRow);
    const conversationIds = conversations.map((conversation) => conversation.id);
    const summaries = conversationIds.length > 0
      ? await supabaseRestRequest<JeffConversationSummaryRow[]>(
          `wrenchready_jeff_conversation_summary?select=*&conversation_id=in.(${conversationIds.map(encodeFilterValue).join(",")})&order=created_at.desc&limit=${Math.max(1, Math.min(limit, 100))}`,
          { method: "GET" },
        )
      : [];
    const localWorkspace = await listLocalJeffJobWorkspace();
    const unresolvedLocalConversations = localWorkspace.conversations
      .filter((conversation) => conversation.needsReview || conversation.jobMatchStatus === "unresolved");
    const mergedConversations = mergeById(conversations, unresolvedLocalConversations)
      .sort((a, b) => new Date(b.endedAt).getTime() - new Date(a.endedAt).getTime())
      .slice(0, limit);
    const mergedConversationIds = new Set(mergedConversations.map((conversation) => conversation.id));
    const mergedSummaries = mergeById(
      summaries.map(conversationSummaryFromRow),
      localWorkspace.summaries.filter((summary) => summary.summaryKind === "unresolved_call" || mergedConversationIds.has(summary.conversationId)),
    )
      .filter((summary) => mergedConversationIds.has(summary.conversationId))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);

    return {
      conversations: mergedConversations,
      summaries: mergedSummaries,
      warnings: [],
      storageStatus: "supabase-workspace",
    };
  } catch (error) {
    const localWorkspace = await listLocalJeffJobWorkspace();
    return {
      ...localWorkspace,
      conversations: localWorkspace.conversations
        .filter((conversation) => conversation.needsReview || conversation.jobMatchStatus === "unresolved")
        .slice(0, limit),
      summaries: localWorkspace.summaries
        .filter((summary) => summary.summaryKind === "unresolved_call")
        .slice(0, limit),
      warnings: [`Jeff unresolved conversation Supabase read failed, so Jeff is reading local pilot storage: ${messageFromError(error)}`],
      storageStatus: "local-file",
    };
  }
}
