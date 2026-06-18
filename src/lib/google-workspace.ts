import { createSign } from "node:crypto";
import { readEnv } from "@/lib/env";

type GoogleAccessToken = {
  accessToken: string;
  expiresAt: number;
};

type GoogleTokenResponse = {
  access_token?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
};

type GmailHeader = {
  name?: string;
  value?: string;
};

type GmailMessagePart = {
  partId?: string;
  mimeType?: string;
  filename?: string;
  headers?: GmailHeader[];
  body?: {
    attachmentId?: string;
    data?: string;
    size?: number;
  };
  parts?: GmailMessagePart[];
};

type GmailMessageResource = {
  id?: string;
  threadId?: string;
  internalDate?: string;
  snippet?: string;
  payload?: GmailMessagePart;
};

type GoogleDriveUploadInput = {
  fileName: string;
  mimeType?: string;
  data: Buffer;
  folderId?: string;
};

type GoogleEmailInput = {
  to: string;
  cc?: string[];
  subject: string;
  html: string;
  text?: string;
};

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GMAIL_API_BASE = "https://gmail.googleapis.com/gmail/v1/users";
const GOOGLE_CALENDAR_API_BASE = "https://www.googleapis.com/calendar/v3";
const GOOGLE_DRIVE_API_BASE = "https://www.googleapis.com/drive/v3";
const GOOGLE_DRIVE_UPLOAD_URL = "https://www.googleapis.com/upload/drive/v3/files";

const GMAIL_READ_SCOPE = "https://www.googleapis.com/auth/gmail.readonly";
const GMAIL_SEND_SCOPE = "https://www.googleapis.com/auth/gmail.send";
const GMAIL_COMPOSE_SCOPE = "https://www.googleapis.com/auth/gmail.compose";
const CALENDAR_READ_SCOPE = "https://www.googleapis.com/auth/calendar.events.readonly";
const CALENDAR_WRITE_SCOPE = "https://www.googleapis.com/auth/calendar.events";
const DRIVE_FILE_SCOPE = "https://www.googleapis.com/auth/drive.file";

const tokenCache = new Map<string, GoogleAccessToken>();

function base64Url(input: string | Buffer) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function fromBase64Url(input?: string) {
  if (!input) return "";
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const padding = "=".repeat((4 - (normalized.length % 4)) % 4);
  return Buffer.from(`${normalized}${padding}`, "base64").toString("utf8");
}

function getGooglePrivateKey() {
  return readEnv("GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY")?.replace(/\\n/g, "\n");
}

function getGoogleClientEmail() {
  return readEnv("GOOGLE_SERVICE_ACCOUNT_EMAIL");
}

function getGoogleOAuthClientId() {
  return readEnv("GOOGLE_WORKSPACE_CLIENT_ID", "GOOGLE_CLIENT_ID");
}

function getGoogleOAuthClientSecret() {
  return readEnv("GOOGLE_WORKSPACE_CLIENT_SECRET", "GOOGLE_CLIENT_SECRET");
}

function getGoogleOAuthRefreshToken() {
  return readEnv("GOOGLE_WORKSPACE_REFRESH_TOKEN", "GOOGLE_REFRESH_TOKEN");
}

function hasGoogleOAuthCredentials() {
  return Boolean(getGoogleOAuthClientId() && getGoogleOAuthClientSecret() && getGoogleOAuthRefreshToken());
}

function hasGoogleServiceAccountCredentials() {
  return Boolean(getGoogleClientEmail() && getGooglePrivateKey());
}

function getGoogleWorkspaceDelegatedUser() {
  return readEnv(
    "GOOGLE_WORKSPACE_DELEGATED_USER",
    "GOOGLE_WORKSPACE_GMAIL_USER",
    "JEFF_INBOUND_EMAIL_ADDRESS",
  );
}

export function getGoogleWorkspaceGmailUser() {
  if (hasGoogleOAuthCredentials()) {
    return readEnv("GOOGLE_WORKSPACE_GMAIL_USER", "JEFF_INBOUND_EMAIL_ADDRESS") || "me";
  }

  return getGoogleWorkspaceDelegatedUser();
}

export function getGoogleWorkspaceCalendarId() {
  return readEnv("GOOGLE_CALENDAR_ID", "GOOGLE_WORKSPACE_CALENDAR_ID");
}

export function getGoogleWorkspaceDriveFolderId() {
  return readEnv("GOOGLE_DRIVE_JOB_FOLDER_ID", "GOOGLE_WORKSPACE_DRIVE_FOLDER_ID");
}

function getGoogleAuthMode() {
  if (hasGoogleOAuthCredentials()) return "oauth-refresh-token";
  if (hasGoogleServiceAccountCredentials()) return "service-account";
  return "not-configured";
}

export function getGoogleWorkspaceIntegrationStatus() {
  const authMode = getGoogleAuthMode();
  const authReady = authMode !== "not-configured";
  const gmailUser = getGoogleWorkspaceGmailUser();
  const calendarId = getGoogleWorkspaceCalendarId();
  const driveFolderId = getGoogleWorkspaceDriveFolderId();
  const serviceAccountNeedsDelegation =
    authMode === "service-account" && !getGoogleWorkspaceDelegatedUser();

  return {
    auth: {
      mode: authMode,
      ready: authReady,
      missing: authReady
        ? []
        : [
            "GOOGLE_WORKSPACE_CLIENT_ID + GOOGLE_WORKSPACE_CLIENT_SECRET + GOOGLE_WORKSPACE_REFRESH_TOKEN",
            "or GOOGLE_SERVICE_ACCOUNT_EMAIL + GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY",
          ],
    },
    gmail: {
      user: gmailUser || "not configured",
      ready: authReady && Boolean(gmailUser) && !serviceAccountNeedsDelegation,
      canRead: authReady && Boolean(gmailUser) && !serviceAccountNeedsDelegation,
      canSend: authReady && Boolean(gmailUser) && !serviceAccountNeedsDelegation,
      missing: [
        !gmailUser ? "GOOGLE_WORKSPACE_GMAIL_USER or JEFF_INBOUND_EMAIL_ADDRESS" : undefined,
        serviceAccountNeedsDelegation ? "GOOGLE_WORKSPACE_DELEGATED_USER for Gmail domain delegation" : undefined,
      ].filter((entry): entry is string => Boolean(entry)),
    },
    calendar: {
      id: calendarId || "not configured",
      ready: authReady && Boolean(calendarId),
      canRead: authReady && Boolean(calendarId),
      canWrite: authReady && Boolean(calendarId) && readEnv("GOOGLE_WORKSPACE_ALLOW_CALENDAR_WRITES") === "true",
      missing: [!calendarId ? "GOOGLE_CALENDAR_ID" : undefined].filter((entry): entry is string => Boolean(entry)),
    },
    drive: {
      folderId: driveFolderId || "not configured",
      ready: authReady && Boolean(driveFolderId),
      canUpload: authReady && Boolean(driveFolderId),
      missing: [!driveFolderId ? "GOOGLE_DRIVE_JOB_FOLDER_ID" : undefined].filter((entry): entry is string => Boolean(entry)),
    },
  };
}

function serviceAccountJwt(scopes: string[]) {
  const clientEmail = getGoogleClientEmail();
  const privateKey = getGooglePrivateKey();
  if (!clientEmail || !privateKey) {
    throw new Error("Google service account credentials are not configured.");
  }

  const now = Math.floor(Date.now() / 1000);
  const delegatedUser = getGoogleWorkspaceDelegatedUser();
  const header = { alg: "RS256", typ: "JWT" };
  const claimSet: Record<string, unknown> = {
    iss: clientEmail,
    scope: scopes.join(" "),
    aud: GOOGLE_TOKEN_URL,
    exp: now + 3600,
    iat: now,
  };

  if (delegatedUser) {
    claimSet.sub = delegatedUser;
  }

  const unsigned = `${base64Url(JSON.stringify(header))}.${base64Url(JSON.stringify(claimSet))}`;
  const signer = createSign("RSA-SHA256");
  signer.update(unsigned);
  signer.end();
  const signature = signer.sign(privateKey);

  return `${unsigned}.${base64Url(signature)}`;
}

async function requestToken(body: URLSearchParams) {
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const token = (await response.json().catch(() => ({}))) as GoogleTokenResponse;

  if (!response.ok || !token.access_token) {
    throw new Error(
      token.error_description ||
        token.error ||
        `Google OAuth token request failed with status ${response.status}.`,
    );
  }

  return {
    accessToken: token.access_token,
    expiresAt: Date.now() + Math.max(60, token.expires_in || 3600) * 1000 - 60_000,
  };
}

export async function getGoogleWorkspaceAccessToken(scopes: string[]) {
  const normalizedScopes = [...new Set(scopes)].sort();
  const cacheKey = `${getGoogleAuthMode()}::${normalizedScopes.join(" ")}`;
  const cached = tokenCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.accessToken;

  let token: GoogleAccessToken;

  if (hasGoogleOAuthCredentials()) {
    token = await requestToken(new URLSearchParams({
      client_id: getGoogleOAuthClientId() || "",
      client_secret: getGoogleOAuthClientSecret() || "",
      refresh_token: getGoogleOAuthRefreshToken() || "",
      grant_type: "refresh_token",
    }));
  } else if (hasGoogleServiceAccountCredentials()) {
    token = await requestToken(new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: serviceAccountJwt(normalizedScopes),
    }));
  } else {
    throw new Error("Google Workspace credentials are not configured.");
  }

  tokenCache.set(cacheKey, token);
  return token.accessToken;
}

async function googleJsonRequest<T>(url: string, scopes: string[], init: RequestInit = {}) {
  const accessToken = await getGoogleWorkspaceAccessToken(scopes);
  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
  const body = (await response.json().catch(() => ({}))) as T & {
    error?: { message?: string; status?: string };
  };

  if (!response.ok) {
    throw new Error(body.error?.message || `Google Workspace request failed with status ${response.status}.`);
  }

  return body;
}

function headerValue(part: GmailMessagePart | undefined, name: string) {
  const header = part?.headers?.find((entry) => entry.name?.toLowerCase() === name.toLowerCase());
  return header?.value;
}

function collectGmailPartText(part: GmailMessagePart | undefined, targetMimeType: string): string[] {
  if (!part) return [];
  const ownText = part.mimeType === targetMimeType ? fromBase64Url(part.body?.data) : "";
  const childText = (part.parts || []).flatMap((child) => collectGmailPartText(child, targetMimeType));
  return [ownText, ...childText].filter(Boolean);
}

function collectGmailAttachments(part: GmailMessagePart | undefined): Array<{
  fileName?: string;
  contentType?: string;
  sizeBytes?: number;
}> {
  if (!part) return [];
  const ownAttachment = part.filename
    ? [{
        fileName: part.filename,
        contentType: part.mimeType,
        sizeBytes: part.body?.size,
      }]
    : [];
  return [
    ...ownAttachment,
    ...(part.parts || []).flatMap(collectGmailAttachments),
  ];
}

export function normalizeGmailMessageForJeff(message: GmailMessageResource) {
  const receivedAt = message.internalDate
    ? new Date(Number(message.internalDate)).toISOString()
    : undefined;
  const text = collectGmailPartText(message.payload, "text/plain").join("\n\n").trim();
  const html = collectGmailPartText(message.payload, "text/html").join("\n\n").trim();

  return {
    provider: "google-workspace-gmail",
    providerEventType: "gmail-sync",
    providerMessageId: message.id,
    from: headerValue(message.payload, "From"),
    to: headerValue(message.payload, "To"),
    subject: headerValue(message.payload, "Subject"),
    text: text || message.snippet,
    html,
    receivedAt,
    attachments: collectGmailAttachments(message.payload),
    raw: {
      id: message.id,
      threadId: message.threadId,
      internalDate: message.internalDate,
    },
  };
}

export async function listRecentGmailMessages(input: {
  query?: string;
  maxResults?: number;
} = {}) {
  const status = getGoogleWorkspaceIntegrationStatus();
  if (!status.gmail.canRead) {
    throw new Error(`Google Gmail is not ready: ${status.gmail.missing.join(", ") || "missing credentials"}.`);
  }

  const user = encodeURIComponent(getGoogleWorkspaceGmailUser() || "me");
  const query = input.query || `to:${status.gmail.user} newer_than:14d -in:sent`;
  const maxResults = Math.max(1, Math.min(input.maxResults || 10, 25));
  const listUrl = `${GMAIL_API_BASE}/${user}/messages?${new URLSearchParams({
    q: query,
    maxResults: String(maxResults),
  })}`;
  const list = await googleJsonRequest<{ messages?: Array<{ id: string }> }>(
    listUrl,
    [GMAIL_READ_SCOPE],
    { method: "GET" },
  );
  const messages = list.messages || [];

  return Promise.all(
    messages.map(async (message) => {
      const detailUrl = `${GMAIL_API_BASE}/${user}/messages/${encodeURIComponent(message.id)}?format=full`;
      const detail = await googleJsonRequest<GmailMessageResource>(detailUrl, [GMAIL_READ_SCOPE], { method: "GET" });
      return normalizeGmailMessageForJeff(detail);
    }),
  );
}

function mimeHeaders(input: GoogleEmailInput) {
  return [
    `To: ${input.to}`,
    input.cc?.length ? `Cc: ${input.cc.join(", ")}` : undefined,
    `Subject: ${input.subject}`,
    "MIME-Version: 1.0",
    "Content-Type: text/html; charset=UTF-8",
    "Content-Transfer-Encoding: 7bit",
  ].filter(Boolean).join("\r\n");
}

export async function sendGoogleWorkspaceEmail(input: GoogleEmailInput) {
  const status = getGoogleWorkspaceIntegrationStatus();
  if (!status.gmail.canSend) {
    throw new Error(`Google Gmail send is not ready: ${status.gmail.missing.join(", ") || "missing credentials"}.`);
  }

  const user = encodeURIComponent(getGoogleWorkspaceGmailUser() || "me");
  const raw = base64Url(`${mimeHeaders(input)}\r\n\r\n${input.html}`);
  const sent = await googleJsonRequest<{ id?: string; threadId?: string }>(
    `${GMAIL_API_BASE}/${user}/messages/send`,
    [GMAIL_SEND_SCOPE, GMAIL_COMPOSE_SCOPE],
    {
      method: "POST",
      body: JSON.stringify({ raw }),
    },
  );

  return {
    data: {
      id: sent.id,
      threadId: sent.threadId,
      provider: "google-workspace-gmail",
    },
  };
}

export async function listGoogleCalendarEvents(input: {
  timeMin: string;
  timeMax: string;
  maxResults?: number;
  privateExtendedProperty?: string;
}) {
  const status = getGoogleWorkspaceIntegrationStatus();
  if (!status.calendar.canRead) {
    throw new Error(`Google Calendar is not ready: ${status.calendar.missing.join(", ") || "missing credentials"}.`);
  }

  const calendarId = encodeURIComponent(getGoogleWorkspaceCalendarId() || "primary");
  const params = new URLSearchParams({
    timeMin: input.timeMin,
    timeMax: input.timeMax,
    maxResults: String(Math.max(1, Math.min(input.maxResults || 25, 100))),
    singleEvents: "true",
    orderBy: "startTime",
  });
  if (input.privateExtendedProperty) {
    params.set("privateExtendedProperty", input.privateExtendedProperty);
  }
  const events = await googleJsonRequest<{
    items?: Array<{
      id?: string;
      summary?: string;
      description?: string;
      location?: string;
      status?: string;
      htmlLink?: string;
      start?: { dateTime?: string; date?: string };
      end?: { dateTime?: string; date?: string };
      attendees?: Array<{ email?: string; displayName?: string; responseStatus?: string }>;
    }>;
  }>(
    `${GOOGLE_CALENDAR_API_BASE}/calendars/${calendarId}/events?${params}`,
    [CALENDAR_READ_SCOPE],
    { method: "GET" },
  );

  return (events.items || []).map((event) => ({
    id: event.id,
    summary: event.summary || "Busy",
    description: event.description,
    location: event.location,
    status: event.status,
    htmlLink: event.htmlLink,
    start: event.start?.dateTime || event.start?.date,
    end: event.end?.dateTime || event.end?.date,
    attendees: event.attendees || [],
  }));
}

type GoogleCalendarEventWriteInput = {
  summary: string;
  description?: string;
  location?: string;
  startIso: string;
  endIso: string;
  privateExtendedProperties?: Record<string, string>;
};

function calendarWriteBody(input: GoogleCalendarEventWriteInput) {
  return {
    summary: input.summary,
    description: input.description,
    location: input.location,
    start: { dateTime: input.startIso },
    end: { dateTime: input.endIso },
    extendedProperties: input.privateExtendedProperties
      ? { private: input.privateExtendedProperties }
      : undefined,
  };
}

async function assertCalendarWritesReady() {
  const status = getGoogleWorkspaceIntegrationStatus();
  if (!status.calendar.canWrite) {
    throw new Error("Google Calendar writes are not enabled. Set GOOGLE_WORKSPACE_ALLOW_CALENDAR_WRITES=true after review.");
  }
}

export async function createGoogleCalendarHold(input: GoogleCalendarEventWriteInput) {
  await assertCalendarWritesReady();

  const calendarId = encodeURIComponent(getGoogleWorkspaceCalendarId() || "primary");
  return googleJsonRequest<{
    id?: string;
    htmlLink?: string;
  }>(
    `${GOOGLE_CALENDAR_API_BASE}/calendars/${calendarId}/events`,
    [CALENDAR_WRITE_SCOPE],
    {
      method: "POST",
      body: JSON.stringify(calendarWriteBody(input)),
    },
  );
}

export async function upsertGoogleCalendarEventByPrivateProperty(input: GoogleCalendarEventWriteInput & {
  propertyKey: string;
  propertyValue: string;
}) {
  await assertCalendarWritesReady();

  const calendarId = encodeURIComponent(getGoogleWorkspaceCalendarId() || "primary");
  const existing = await listGoogleCalendarEvents({
    timeMin: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    timeMax: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
    maxResults: 10,
    privateExtendedProperty: `${input.propertyKey}=${input.propertyValue}`,
  });
  const body = calendarWriteBody({
    ...input,
    privateExtendedProperties: {
      ...(input.privateExtendedProperties || {}),
      [input.propertyKey]: input.propertyValue,
    },
  });
  const existingId = existing[0]?.id;

  if (!existingId) {
    const created = await googleJsonRequest<{
      id?: string;
      htmlLink?: string;
    }>(
      `${GOOGLE_CALENDAR_API_BASE}/calendars/${calendarId}/events`,
      [CALENDAR_WRITE_SCOPE],
      {
        method: "POST",
        body: JSON.stringify(body),
      },
    );

    return { action: "created" as const, event: created };
  }

  const updated = await googleJsonRequest<{
    id?: string;
    htmlLink?: string;
  }>(
    `${GOOGLE_CALENDAR_API_BASE}/calendars/${calendarId}/events/${encodeURIComponent(existingId)}`,
    [CALENDAR_WRITE_SCOPE],
    {
      method: "PATCH",
      body: JSON.stringify(body),
    },
  );

  return { action: "updated" as const, event: updated };
}

export async function uploadGoogleDriveFile(input: GoogleDriveUploadInput) {
  const status = getGoogleWorkspaceIntegrationStatus();
  const folderId = input.folderId || getGoogleWorkspaceDriveFolderId();
  if (!status.drive.canUpload || !folderId) {
    throw new Error(`Google Drive upload is not ready: ${status.drive.missing.join(", ") || "missing folder id"}.`);
  }

  const accessToken = await getGoogleWorkspaceAccessToken([DRIVE_FILE_SCOPE]);
  const boundary = `wrenchready-jeff-${Date.now()}`;
  const metadata = {
    name: input.fileName,
    parents: [folderId],
  };
  const mimeType = input.mimeType || "application/octet-stream";
  const body = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n`),
    Buffer.from(JSON.stringify(metadata)),
    Buffer.from(`\r\n--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`),
    input.data,
    Buffer.from(`\r\n--${boundary}--`),
  ]);
  const response = await fetch(
    `${GOOGLE_DRIVE_UPLOAD_URL}?uploadType=multipart&fields=id,name,mimeType,webViewLink,webContentLink`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": `multipart/related; boundary=${boundary}`,
        "Content-Length": String(body.length),
      },
      body,
    },
  );
  const uploaded = (await response.json().catch(() => ({}))) as {
    id?: string;
    name?: string;
    mimeType?: string;
    webViewLink?: string;
    webContentLink?: string;
    error?: { message?: string };
  };

  if (!response.ok) {
    throw new Error(uploaded.error?.message || `Google Drive upload failed with status ${response.status}.`);
  }

  return uploaded;
}

export async function downloadGoogleDriveFile(fileId: string) {
  const status = getGoogleWorkspaceIntegrationStatus();
  if (!status.drive.canUpload) {
    throw new Error(`Google Drive download is not ready: ${status.drive.missing.join(", ") || "missing credentials"}.`);
  }

  const accessToken = await getGoogleWorkspaceAccessToken([DRIVE_FILE_SCOPE]);
  const response = await fetch(
    `${GOOGLE_DRIVE_API_BASE}/files/${encodeURIComponent(fileId)}?alt=media`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as {
      error?: { message?: string };
    };
    throw new Error(body.error?.message || `Google Drive download failed with status ${response.status}.`);
  }

  return Buffer.from(await response.arrayBuffer());
}

export function dataUrlToGoogleDriveBuffer(value?: string) {
  const match = value?.match(/^data:([^;,]+)?(?:;base64)?,([\s\S]+)$/);
  if (!match) return undefined;

  const mimeType = match[1] || "application/octet-stream";
  const data = value?.includes(";base64,")
    ? Buffer.from(match[2], "base64")
    : Buffer.from(decodeURIComponent(match[2]), "utf8");

  return { mimeType, data };
}
