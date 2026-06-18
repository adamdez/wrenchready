import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { readEnv } from "@/lib/env";
import { getJeffLocalDataPath } from "@/lib/jeff-field-assistant/local-data";
import { normalizePhone } from "@/lib/twilio";
import type {
  JeffLiveSession,
  JeffLiveSessionEvent,
  JeffLiveSessionStatus,
} from "@/lib/jeff-field-assistant/types";

type JeffLiveSessionState = {
  sessions: JeffLiveSession[];
};

type UpsertLiveSessionInput = {
  sessionId?: string;
  source?: JeffLiveSession["source"];
  callId?: string;
  assistantId?: string;
  callerPhone?: string;
  activeJobId?: string;
  activeJobLabel?: string;
  activeJobConfidence?: JeffLiveSession["activeJobConfidence"];
  latestTranscript?: string;
  summary?: string;
  status?: JeffLiveSessionStatus;
  eventSummary?: string;
};

const SESSION_TTL_MS = 2 * 60 * 60 * 1000;
const ACTIVE_SESSION_WINDOW_MS = 45 * 60 * 1000;
const SESSION_STORE_FILE = getJeffLocalDataPath("sessions.json");

function nowIso() {
  return new Date().toISOString();
}

function expiresAtIso() {
  return new Date(Date.now() + SESSION_TTL_MS).toISOString();
}

function makeId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeSessionId(value?: string) {
  if (!value) return undefined;
  return value.trim().replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 120) || undefined;
}

function sessionIdForCall(callId?: string) {
  const normalized = normalizeSessionId(callId);
  return normalized ? `vapi-${normalized}` : undefined;
}

function isSessionStatus(value: unknown): value is JeffLiveSessionStatus {
  return value === "active" || value === "recent" || value === "closed";
}

function optionalString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function optionalStringList(value: unknown) {
  return Array.isArray(value)
    ? value.map(optionalString).filter((entry): entry is string => Boolean(entry))
    : [];
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function eventFromValue(value: unknown): JeffLiveSessionEvent | null {
  if (!isObject(value)) return null;

  const id = optionalString(value.id);
  const timestamp = optionalString(value.timestamp);
  const summary = optionalString(value.summary);
  const type = optionalString(value.type);

  if (!id || !timestamp || !summary) return null;
  if (
    type !== "session_started" &&
    type !== "session_updated" &&
    type !== "job_context_set" &&
    type !== "photo_received" &&
    type !== "transcript_updated" &&
    type !== "session_closed"
  ) {
    return null;
  }

  return { id, timestamp, type, summary };
}

function sessionFromValue(value: unknown): JeffLiveSession | null {
  if (!isObject(value)) return null;

  const id = optionalString(value.id);
  const createdAt = optionalString(value.createdAt);
  const updatedAt = optionalString(value.updatedAt);
  const expiresAt = optionalString(value.expiresAt);
  const status = value.status;
  const source = optionalString(value.source);

  if (!id || !createdAt || !updatedAt || !expiresAt || !isSessionStatus(status)) return null;
  if (source !== "vapi-call" && source !== "mobile-hub" && source !== "photo-drop" && source !== "system") {
    return null;
  }

  return {
    id,
    createdAt,
    updatedAt,
    expiresAt,
    status,
    source,
    callId: optionalString(value.callId),
    assistantId: optionalString(value.assistantId),
    callerPhone: normalizePhone(optionalString(value.callerPhone) || "") || undefined,
    activeJobId: optionalString(value.activeJobId),
    activeJobLabel: optionalString(value.activeJobLabel),
    activeJobConfidence:
      value.activeJobConfidence === "confirmed" || value.activeJobConfidence === "inferred"
        ? value.activeJobConfidence
        : "unknown",
    latestTranscript: optionalString(value.latestTranscript),
    summary: optionalString(value.summary),
    pendingPhotoIds: optionalStringList(value.pendingPhotoIds).slice(0, 50),
    lastPhotoAt: optionalString(value.lastPhotoAt),
    events: Array.isArray(value.events)
      ? value.events.map(eventFromValue).filter((event): event is JeffLiveSessionEvent => Boolean(event)).slice(0, 25)
      : [],
  };
}

function readPersistedSessionState(): JeffLiveSessionState {
  try {
    const parsed = JSON.parse(readFileSync(SESSION_STORE_FILE, "utf8"));
    const sessions = Array.isArray(parsed?.sessions)
      ? parsed.sessions
          .map(sessionFromValue)
          .filter((session: JeffLiveSession | null): session is JeffLiveSession => Boolean(session))
      : [];
    return { sessions };
  } catch {
    return { sessions: [] };
  }
}

function writePersistedSessionState(sessions: JeffLiveSession[]) {
  try {
    mkdirSync(path.dirname(SESSION_STORE_FILE), { recursive: true });
    writeFileSync(SESSION_STORE_FILE, JSON.stringify({ sessions: sessions.slice(0, 50) }, null, 2));
  } catch {
    // Local persistence is best-effort for the pilot; runtime state still carries the session.
  }
}

function getSessionState(): JeffLiveSessionState {
  const globalState = globalThis as typeof globalThis & {
    __wrenchreadyJeffLiveSessionState?: JeffLiveSessionState;
  };

  if (!globalState.__wrenchreadyJeffLiveSessionState) {
    globalState.__wrenchreadyJeffLiveSessionState = readPersistedSessionState();
  }

  return globalState.__wrenchreadyJeffLiveSessionState;
}

function isExpired(session: JeffLiveSession) {
  return new Date(session.expiresAt).getTime() < Date.now();
}

function isActive(session: JeffLiveSession) {
  return (
    session.status === "active" &&
    Date.now() - new Date(session.updatedAt).getTime() <= ACTIVE_SESSION_WINDOW_MS
  );
}

function pruneSessions() {
  const state = getSessionState();
  state.sessions = state.sessions
    .filter((session) => !isExpired(session))
    .slice(0, 50);
  writePersistedSessionState(state.sessions);
  return state.sessions;
}

function sessionEvent(type: JeffLiveSessionEvent["type"], summary: string): JeffLiveSessionEvent {
  return {
    id: makeId("jeff-session-event"),
    timestamp: nowIso(),
    type,
    summary,
  };
}

function eventTypeForUpdate(input: UpsertLiveSessionInput): JeffLiveSessionEvent["type"] {
  if (input.status === "closed") return "session_closed";
  if (input.activeJobId) return "job_context_set";
  if (input.latestTranscript) return "transcript_updated";
  return "session_updated";
}

function mergeSession(existing: JeffLiveSession, input: UpsertLiveSessionInput): JeffLiveSession {
  const eventSummary = input.eventSummary || input.summary;
  return {
    ...existing,
    updatedAt: nowIso(),
    expiresAt: input.status === "closed" ? existing.expiresAt : expiresAtIso(),
    status: input.status || existing.status,
    source: input.source || existing.source,
    callId: input.callId || existing.callId,
    assistantId: input.assistantId || existing.assistantId,
    callerPhone: normalizePhone(input.callerPhone) || existing.callerPhone,
    activeJobId: input.activeJobId || existing.activeJobId,
    activeJobLabel: input.activeJobLabel || existing.activeJobLabel,
    activeJobConfidence:
      input.activeJobConfidence ||
      (input.activeJobId ? "inferred" : existing.activeJobConfidence),
    latestTranscript: input.latestTranscript || existing.latestTranscript,
    summary: input.summary || existing.summary,
    events: eventSummary
      ? [
          sessionEvent(eventTypeForUpdate(input), eventSummary),
          ...existing.events,
        ].slice(0, 25)
      : existing.events,
  };
}

export function getJeffFieldPhoneNumber() {
  return normalizePhone(readEnv("JEFF_FIELD_PHONE_NUMBER", "VAPI_JEFF_PHONE_NUMBER")) || "+15094089122";
}

export function getJeffFieldPhoneHref() {
  return `tel:${getJeffFieldPhoneNumber()}`;
}

export function upsertJeffLiveSession(input: UpsertLiveSessionInput = {}) {
  const state = getSessionState();
  const sessions = pruneSessions();
  const id =
    normalizeSessionId(input.sessionId) ||
    sessionIdForCall(input.callId) ||
    makeId("jeff-session");
  const existing = sessions.find((session) => session.id === id);

  if (existing) {
    const updated = mergeSession(existing, input);
    state.sessions = [
      updated,
      ...sessions.filter((session) => session.id !== id),
    ].slice(0, 50);
    writePersistedSessionState(state.sessions);
    return updated;
  }

  const eventSummary = input.eventSummary || input.summary || "Jeff session started.";
  const createdAt = nowIso();
  const session: JeffLiveSession = {
    id,
    createdAt,
    updatedAt: createdAt,
    expiresAt: expiresAtIso(),
    status: input.status || "active",
    source: input.source || (input.callId ? "vapi-call" : "mobile-hub"),
    callId: input.callId,
    assistantId: input.assistantId,
    callerPhone: normalizePhone(input.callerPhone) || undefined,
    activeJobId: input.activeJobId,
    activeJobLabel: input.activeJobLabel,
    activeJobConfidence:
      input.activeJobConfidence || (input.activeJobId ? "inferred" : "unknown"),
    latestTranscript: input.latestTranscript,
    summary: input.summary,
    pendingPhotoIds: [],
    events: [sessionEvent("session_started", eventSummary)],
  };

  state.sessions = [session, ...sessions].slice(0, 50);
  writePersistedSessionState(state.sessions);
  return session;
}

export function getJeffLiveSession(sessionId?: string) {
  const normalized = normalizeSessionId(sessionId);
  if (!normalized) return undefined;
  return pruneSessions().find((session) => session.id === normalized);
}

export function getLatestJeffLiveSession() {
  return pruneSessions()
    .filter((session) => session.status !== "closed")
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0];
}

export function getActiveJeffLiveSession() {
  return pruneSessions()
    .filter(isActive)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0];
}

export function getActiveJeffLiveSessionById(sessionId?: string) {
  const session = getJeffLiveSession(sessionId);
  return session && isActive(session) ? session : undefined;
}

export function resolveJeffLiveSession(sessionId?: string) {
  return normalizeSessionId(sessionId) ? getActiveJeffLiveSessionById(sessionId) : getActiveJeffLiveSession();
}

export function listJeffLiveSessions() {
  return pruneSessions().sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
}

export function attachPhotoToJeffLiveSession(input: {
  sessionId?: string;
  photoIds: string[];
  jobId?: string;
  jobLabel?: string;
}) {
  const session = resolveJeffLiveSession(input.sessionId);
  if (!session) return undefined;

  const pendingPhotoIds = [...new Set([...input.photoIds, ...session.pendingPhotoIds])].slice(0, 50);
  const updated = mergeSession(session, {
    sessionId: session.id,
    activeJobId: input.jobId,
    activeJobLabel: input.jobLabel,
    activeJobConfidence: input.jobId ? "inferred" : session.activeJobConfidence,
    eventSummary: input.jobId
      ? `Photo uploaded and attached to ${input.jobLabel || input.jobId}.`
      : "Photo uploaded into the current Jeff session inbox.",
  });

  const state = getSessionState();
  const next: JeffLiveSession = {
    ...updated,
    pendingPhotoIds,
    lastPhotoAt: nowIso(),
  };
  state.sessions = [
    next,
    ...state.sessions.filter((candidate) => candidate.id !== session.id),
  ].slice(0, 50);

  return next;
}
