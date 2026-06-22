import type {
  JeffActionStateSnapshot,
} from "@/lib/jeff-field-assistant/action-state";
import type {
  PromiseFieldExecutionPacket,
  PromisePaymentCollection,
  PromiseRecord,
} from "@/lib/promise-crm/types";

export type JeffFieldChannel =
  | "voice"
  | "sms"
  | "mms"
  | "upload"
  | "email"
  | "vendor"
  | "approval"
  | "invoice"
  | "payment"
  | "system";

export type JeffFieldEventType =
  | "voice_call_started"
  | "voice_transcript_note"
  | "sms_received"
  | "mms_photo_received"
  | "field_upload_received"
  | "photo_analysis_completed"
  | "diagnostic_email_received"
  | "scan_report_parsed"
  | "part_search_completed"
  | "cart_prepared"
  | "purchase_blocked"
  | "approval_requested"
  | "approval_received"
  | "invoice_updated"
  | "payment_link_ready"
  | "closeout_started"
  | "field_note_recorded"
  | "conflict_flagged";

export type JeffFieldJobSource = "promise-crm" | "jeff-fixture";

export type JeffFieldConfidence = "high" | "medium" | "low";

export type JeffFieldPhotoStorageStatus =
  | "google-drive"
  | "local-file"
  | "runtime-memory"
  | "external-url"
  | "metadata-only";

export type JeffMediaStorageProvider = JeffFieldPhotoStorageStatus;

export type JeffMediaStorageStatus =
  | "available"
  | "temporary"
  | "metadata-only"
  | "failed";

export type JeffMediaParseStatus =
  | "not-needed"
  | "pending"
  | "parsed"
  | "failed"
  | "blocked";

export type JeffMediaReviewStatus =
  | "accepted"
  | "needs-review"
  | "rejected"
  | "archived";

export type JeffExtractedFacts = {
  customerName?: string;
  vehicle?: string;
  vin?: string;
  odometer?: string;
  symptoms?: string[];
  testsPerformed?: string[];
  readings?: string[];
  suspectedCause?: string;
  partNeeded?: string;
  authorization?: string;
  invoiceReference?: string;
  paymentStatus?: string;
};

export type JeffFieldFactStatus = "proved" | "suspected";

export type JeffFieldFactEvidenceType =
  | "technician-report"
  | "test-performed"
  | "reading"
  | "photo"
  | "tool-result"
  | "field-event";

export type JeffFieldFactEvidence = {
  id: string;
  type: JeffFieldFactEvidenceType;
  label: string;
  sourceEventId?: string;
  sourcePhotoId?: string;
  value?: string;
  capturedAt: string;
};

export type JeffFieldFact = {
  id: string;
  status: JeffFieldFactStatus;
  category: "symptom" | "test" | "reading" | "diagnosis" | "part" | "payment" | "other";
  label: string;
  value: string;
  evidenceIds: string[];
  sourceEventId?: string;
};

export type JeffFieldFactLedger = {
  facts: JeffFieldFact[];
  evidence: JeffFieldFactEvidence[];
};

export type JeffFieldEvent = {
  id: string;
  jobId: string;
  type: JeffFieldEventType;
  channel: JeffFieldChannel;
  timestamp: string;
  sender: "Simon" | "Dez" | "Jeff" | "Customer" | "Vendor" | "System" | string;
  summary: string;
  extractedFacts: JeffExtractedFacts;
  rawSourceReference?: string;
  confidence: JeffFieldConfidence;
  needsReview: boolean;
};

export type JeffConversationJobMatchStatus =
  | "confirmed"
  | "inferred"
  | "unresolved"
  | "manual";

export type JeffConversationCallType =
  | "job"
  | "personal"
  | "test"
  | "admin"
  | "unknown";

export type JeffFollowUpStatus =
  | "none"
  | "requested"
  | "drafted"
  | "sent"
  | "blocked"
  | "failed";

export type JeffConversation = {
  id: string;
  callId?: string;
  sessionId?: string;
  jobId?: string;
  jobLabel?: string;
  jobMatchStatus: JeffConversationJobMatchStatus;
  callType: JeffConversationCallType;
  subjectLabel?: string;
  channel: JeffFieldChannel;
  callerPhone?: string;
  assistantId?: string;
  startedAt?: string;
  endedAt: string;
  durationSeconds?: number;
  transcript?: string;
  rawSummary?: string;
  recordingUrl?: string;
  followUpRequested: boolean;
  followUpStatus: JeffFollowUpStatus;
  needsReview: boolean;
  reviewReason?: string;
  sourcePayload: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type JeffConversationSummaryKind =
  | "after_call"
  | "manual_compaction"
  | "unresolved_call";

export type JeffConversationSummary = {
  id: string;
  conversationId: string;
  jobId?: string;
  summaryKind: JeffConversationSummaryKind;
  summary: string;
  knownFacts: string[];
  testsPerformed: string[];
  readings: string[];
  suspectedIssues: string[];
  unprovenAssumptions: string[];
  proofNeeded: string[];
  nextActions: string[];
  recommendationSummary?: string;
  requestedFollowUps: string[];
  emailRequested: boolean;
  emailStatus: JeffFollowUpStatus;
  emailTo?: string;
  blockers: string[];
  customerSafeRecap?: string;
  confidence: JeffFieldConfidence;
  createdAt: string;
  metadata: Record<string, unknown>;
};

export type JeffJobWorkspaceSnapshot = {
  id: string;
  jobId: string;
  generatedAt: string;
  latestConversationId?: string;
  snapshotSummary: string;
  knownFacts: string[];
  latestTestsAndReadings: string[];
  latestMediaAndReports: string[];
  openBlockers: string[];
  nextActions: string[];
  missingProof: string[];
  needsReview: boolean;
  sourceCounts: Record<string, unknown>;
  createdAt: string;
};

export type JeffDurableMemorySubjectType =
  | "technician"
  | "business"
  | "customer"
  | "vehicle"
  | "vendor"
  | "workflow"
  | "job"
  | "other";

export type JeffDurableMemoryStatus =
  | "candidate"
  | "approved"
  | "rejected"
  | "archived";

export type JeffDurableMemorySensitivity =
  | "low"
  | "personal"
  | "sensitive"
  | "restricted";

export type JeffDurableMemory = {
  id: string;
  subjectType: JeffDurableMemorySubjectType;
  subjectKey: string;
  subjectLabel: string;
  category: string;
  memory: string;
  evidence?: string;
  evidenceEventIds: string[];
  sourceJobId?: string;
  sourceChannel?: JeffFieldChannel;
  status: JeffDurableMemoryStatus;
  confidence: JeffFieldConfidence;
  sensitivity: JeffDurableMemorySensitivity;
  createdBy: string;
  approvedBy?: string;
  createdAt: string;
  updatedAt: string;
  approvedAt?: string;
  lastUsedAt?: string;
  metadata: Record<string, unknown>;
};

export type JeffDurableMemorySummary = Pick<
  JeffDurableMemory,
  | "id"
  | "subjectType"
  | "subjectKey"
  | "subjectLabel"
  | "category"
  | "memory"
  | "evidence"
  | "sourceJobId"
  | "status"
  | "confidence"
  | "sensitivity"
  | "updatedAt"
>;

export type JeffFieldPhoto = {
  id: string;
  mediaId?: string;
  jobId?: string;
  sessionId?: string;
  uploadedAt: string;
  uploadedBy: string;
  sourceChannel: JeffFieldChannel;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  label?: string;
  note?: string;
  url?: string;
  storageKey?: string;
  dataUrl?: string;
  driveFileId?: string;
  driveWebViewLink?: string;
  driveWebContentLink?: string;
  storageStatus: JeffFieldPhotoStorageStatus;
  attachmentStatus?: "job-attached" | "session-inbox";
  eventId?: string;
};

export type JeffFieldPhotoSummary = Omit<JeffFieldPhoto, "dataUrl"> & {
  hasImageData: boolean;
};

export type JeffFieldPhotoAnalysis = {
  id: string;
  jobId: string;
  photoId: string;
  createdAt: string;
  model: string;
  prompt: string;
  analysis: string;
  warnings: string[];
  usage?: Record<string, unknown>;
};

export type JeffMediaItem = {
  id: string;
  jobId?: string;
  conversationId?: string;
  sessionId?: string;
  fieldEventId?: string;
  photoId?: string;
  sourceChannel: JeffFieldChannel;
  uploadedAt: string;
  uploadedBy: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  label?: string;
  note?: string;
  storageProvider: JeffMediaStorageProvider;
  storageStatus: JeffMediaStorageStatus;
  driveFileId?: string;
  driveWebViewLink?: string;
  driveWebContentLink?: string;
  externalUrl?: string;
  localStorageKey?: string;
  parseStatus: JeffMediaParseStatus;
  reviewStatus: JeffMediaReviewStatus;
  extractedText?: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type JeffFieldJob = {
  id: string;
  source: JeffFieldJobSource;
  customer: PromiseRecord["customer"];
  vehicle: PromiseRecord["vehicle"];
  location: PromiseRecord["location"];
  serviceScope: string;
  owner: PromiseRecord["owner"];
  jobStage: PromiseRecord["jobStage"];
  scheduledWindow: PromiseRecord["scheduledWindow"];
  readinessSummary: string;
  nextAction: string;
  topRisks: string[];
  notes: string[];
  customerApproval: PromiseRecord["customerApproval"];
  fieldExecution?: PromiseFieldExecutionPacket;
  paymentCollection?: PromisePaymentCollection;
  updatedAt: string;
};

export type JeffContextPacket = {
  generatedAt: string;
  job: JeffFieldJob;
  durableMemories: JeffDurableMemorySummary[];
  latestConversationSummaries: JeffConversationSummary[];
  latestWorkspaceSnapshot?: JeffJobWorkspaceSnapshot;
  authorizedScope: string;
  stopPoints: string[];
  latestConcern: string;
  latestTestsAndReadings: string[];
  latestMediaAndReports: string[];
  latestPhotos: JeffFieldPhotoSummary[];
  partsStatus: string[];
  invoicePaymentStatus: string;
  openApprovalsAndBlockers: string[];
  latestEvents: JeffFieldEvent[];
  conflicts: string[];
  safeNextActions: string[];
  authority: {
    diagnosticAdvice: "allowed";
    fieldNoteLogging: "allowed";
    escalationDrafts: "allowed";
    closeoutDrafts: "allowed";
    partsPurchasing: "blocked";
  };
};

export type JeffFieldFile = {
  generatedAt: string;
  job: JeffFieldJob;
  promiseNotes: string[];
  fieldEvents: JeffFieldEvent[];
  fieldPhotos: JeffFieldPhotoSummary[];
  media: JeffMediaItem[];
  conversations: JeffConversation[];
  conversationSummaries: JeffConversationSummary[];
  workspaceSnapshot?: JeffJobWorkspaceSnapshot;
  context: JeffContextPacket;
  storage: {
    jobRecord: JeffFieldJobSource;
    promiseNotes: "promise-crm" | "fixture-only";
    fieldEvents: "supabase-field-event" | "local-file" | "runtime-memory" | "not-configured" | "failed";
    conversations: "supabase-workspace" | "local-file" | "runtime-memory" | "not-configured" | "failed";
    photos: JeffFieldPhotoStorageStatus | "mixed";
    media: "supabase-media" | "local-file" | "not-configured" | "failed";
  };
  warnings: string[];
};

export type JeffToolResult<T> = {
  success: boolean;
  tool: string;
  assistantSay: string;
  data: T;
  warnings: string[];
  actionState: JeffActionStateSnapshot;
};

export type JeffVapiToolSchema = {
  name: string;
  description: string;
  endpoint: string;
  method: "POST";
  parameters: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
};

export type JeffLiveSessionStatus = "active" | "recent" | "closed";

export type JeffLiveSessionEvent = {
  id: string;
  timestamp: string;
  type:
    | "session_started"
    | "session_updated"
    | "job_context_set"
    | "photo_received"
    | "transcript_updated"
    | "session_closed";
  summary: string;
};

export type JeffLiveSession = {
  id: string;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
  status: JeffLiveSessionStatus;
  source: "vapi-call" | "mobile-hub" | "photo-drop" | "system";
  callId?: string;
  assistantId?: string;
  callerPhone?: string;
  activeJobId?: string;
  activeJobLabel?: string;
  activeJobConfidence: "confirmed" | "inferred" | "unknown";
  latestTranscript?: string;
  summary?: string;
  pendingPhotoIds: string[];
  lastPhotoAt?: string;
  events: JeffLiveSessionEvent[];
};

export type JeffPilotReviewIssue = {
  severity: "blocker" | "fix-before-field" | "watch";
  summary: string;
  recommendedFix: string;
};

export type JeffOrientationReadinessCriterion = {
  id: string;
  label: string;
  passed: boolean;
  evidence?: string;
};

export type JeffOrientationReadiness = {
  assessed: boolean;
  ready: boolean;
  summary: string;
  criteria: JeffOrientationReadinessCriterion[];
  missing: string[];
  suggestedFollowUp: string[];
};

export type JeffPilotTranscriptReview = {
  id: string;
  createdAt: string;
  callId?: string;
  customerNumber?: string;
  assistantId?: string;
  scenario?: string;
  transcriptSummary: string;
  transcript?: string;
  passed: boolean;
  issues: JeffPilotReviewIssue[];
  orientationReadiness?: JeffOrientationReadiness;
  nextRunFocus: string[];
};
