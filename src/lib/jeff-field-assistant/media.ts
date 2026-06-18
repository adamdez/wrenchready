import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { hasPromiseCrmSupabase, supabaseRestRequest } from "@/lib/promise-crm/supabase";
import { getJeffLocalDataPath } from "@/lib/jeff-field-assistant/local-data";
import type {
  JeffFieldChannel,
  JeffMediaItem,
  JeffMediaParseStatus,
  JeffMediaReviewStatus,
  JeffMediaStorageProvider,
  JeffMediaStorageStatus,
} from "@/lib/jeff-field-assistant/types";

type JeffMediaRow = {
  id: string;
  job_id: string | null;
  conversation_id: string | null;
  session_id: string | null;
  field_event_id: string | null;
  photo_id: string | null;
  source_channel: JeffFieldChannel;
  uploaded_at: string;
  uploaded_by: string;
  file_name: string;
  content_type: string;
  size_bytes: number;
  label: string | null;
  note: string | null;
  storage_provider: JeffMediaStorageProvider;
  storage_status: JeffMediaStorageStatus;
  drive_file_id: string | null;
  drive_web_view_link: string | null;
  drive_web_content_link: string | null;
  external_url: string | null;
  local_storage_key: string | null;
  parse_status: JeffMediaParseStatus;
  review_status: JeffMediaReviewStatus;
  extracted_text: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

export type JeffMediaPersistenceStatus =
  | "supabase-media"
  | "local-file"
  | "not-configured"
  | "failed";

export type JeffMediaPersistenceResult = {
  status: JeffMediaPersistenceStatus;
  warning?: string;
};

export type JeffMediaListResult = {
  media: JeffMediaItem[];
  warnings: string[];
  storageStatus: JeffMediaPersistenceStatus;
};

type JeffMediaListOptions = {
  jobId?: string;
  sessionId?: string;
  conversationId?: string;
  limit?: number;
};

const LOCAL_MEDIA_FILE = getJeffLocalDataPath("media.json");

function encodeFilterValue(value: string) {
  return encodeURIComponent(value);
}

function optionalString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function optionalNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function isChannel(value: unknown): value is JeffFieldChannel {
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

function isStorageProvider(value: unknown): value is JeffMediaStorageProvider {
  return (
    value === "google-drive" ||
    value === "local-file" ||
    value === "external-url" ||
    value === "runtime-memory" ||
    value === "metadata-only"
  );
}

function isStorageStatus(value: unknown): value is JeffMediaStorageStatus {
  return value === "available" || value === "temporary" || value === "metadata-only" || value === "failed";
}

function isParseStatus(value: unknown): value is JeffMediaParseStatus {
  return value === "not-needed" || value === "pending" || value === "parsed" || value === "failed" || value === "blocked";
}

function isReviewStatus(value: unknown): value is JeffMediaReviewStatus {
  return value === "accepted" || value === "needs-review" || value === "rejected" || value === "archived";
}

function localMediaFromValue(value: unknown): JeffMediaItem | null {
  if (!isObject(value)) return null;

  const id = optionalString(value.id);
  const uploadedAt = optionalString(value.uploadedAt);
  const uploadedBy = optionalString(value.uploadedBy);
  const fileName = optionalString(value.fileName);
  const contentType = optionalString(value.contentType);
  const sizeBytes = optionalNumber(value.sizeBytes);
  const createdAt = optionalString(value.createdAt);
  const updatedAt = optionalString(value.updatedAt);

  if (!id || !uploadedAt || !uploadedBy || !fileName || !contentType || sizeBytes === undefined || !createdAt || !updatedAt) {
    return null;
  }
  if (!isChannel(value.sourceChannel)) return null;
  if (!isStorageProvider(value.storageProvider)) return null;
  if (!isStorageStatus(value.storageStatus)) return null;
  if (!isParseStatus(value.parseStatus)) return null;
  if (!isReviewStatus(value.reviewStatus)) return null;

  return {
    id,
    jobId: optionalString(value.jobId),
    conversationId: optionalString(value.conversationId),
    sessionId: optionalString(value.sessionId),
    fieldEventId: optionalString(value.fieldEventId),
    photoId: optionalString(value.photoId),
    sourceChannel: value.sourceChannel,
    uploadedAt,
    uploadedBy,
    fileName,
    contentType,
    sizeBytes,
    label: optionalString(value.label),
    note: optionalString(value.note),
    storageProvider: value.storageProvider,
    storageStatus: value.storageStatus,
    driveFileId: optionalString(value.driveFileId),
    driveWebViewLink: optionalString(value.driveWebViewLink),
    driveWebContentLink: optionalString(value.driveWebContentLink),
    externalUrl: optionalString(value.externalUrl),
    localStorageKey: optionalString(value.localStorageKey),
    parseStatus: value.parseStatus,
    reviewStatus: value.reviewStatus,
    extractedText: optionalString(value.extractedText),
    metadata: isObject(value.metadata) ? value.metadata : {},
    createdAt,
    updatedAt,
  };
}

function mediaFromRow(row: JeffMediaRow): JeffMediaItem {
  return {
    id: row.id,
    jobId: row.job_id || undefined,
    conversationId: row.conversation_id || undefined,
    sessionId: row.session_id || undefined,
    fieldEventId: row.field_event_id || undefined,
    photoId: row.photo_id || undefined,
    sourceChannel: row.source_channel,
    uploadedAt: row.uploaded_at,
    uploadedBy: row.uploaded_by,
    fileName: row.file_name,
    contentType: row.content_type,
    sizeBytes: row.size_bytes,
    label: row.label || undefined,
    note: row.note || undefined,
    storageProvider: row.storage_provider,
    storageStatus: row.storage_status,
    driveFileId: row.drive_file_id || undefined,
    driveWebViewLink: row.drive_web_view_link || undefined,
    driveWebContentLink: row.drive_web_content_link || undefined,
    externalUrl: row.external_url || undefined,
    localStorageKey: row.local_storage_key || undefined,
    parseStatus: row.parse_status,
    reviewStatus: row.review_status,
    extractedText: row.extracted_text || undefined,
    metadata: row.metadata || {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mediaToRow(media: JeffMediaItem): JeffMediaRow {
  return {
    id: media.id,
    job_id: media.jobId || null,
    conversation_id: media.conversationId || null,
    session_id: media.sessionId || null,
    field_event_id: media.fieldEventId || null,
    photo_id: media.photoId || null,
    source_channel: media.sourceChannel,
    uploaded_at: media.uploadedAt,
    uploaded_by: media.uploadedBy,
    file_name: media.fileName,
    content_type: media.contentType,
    size_bytes: media.sizeBytes,
    label: media.label || null,
    note: media.note || null,
    storage_provider: media.storageProvider,
    storage_status: media.storageStatus,
    drive_file_id: media.driveFileId || null,
    drive_web_view_link: media.driveWebViewLink || null,
    drive_web_content_link: media.driveWebContentLink || null,
    external_url: media.externalUrl || null,
    local_storage_key: media.localStorageKey || null,
    parse_status: media.parseStatus,
    review_status: media.reviewStatus,
    extracted_text: media.extractedText || null,
    metadata: media.metadata || {},
    created_at: media.createdAt,
    updated_at: media.updatedAt,
  };
}

function mediaMatchesOptions(media: JeffMediaItem, options: JeffMediaListOptions) {
  if (options.jobId && media.jobId !== options.jobId) return false;
  if (options.sessionId && media.sessionId !== options.sessionId) return false;
  if (options.conversationId && media.conversationId !== options.conversationId) return false;
  return true;
}

async function listLocalJeffMedia(options: JeffMediaListOptions = {}) {
  try {
    const parsed = JSON.parse(await readFile(LOCAL_MEDIA_FILE, "utf8"));
    const media: JeffMediaItem[] = Array.isArray(parsed?.media)
      ? parsed.media
          .map(localMediaFromValue)
          .filter((entry: JeffMediaItem | null): entry is JeffMediaItem => Boolean(entry))
      : [];

    return media
      .filter((entry) => mediaMatchesOptions(entry, options))
      .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime())
      .slice(0, Math.max(1, Math.min(options.limit || 100, 500)));
  } catch {
    return [];
  }
}

async function upsertLocalJeffMedia(media: JeffMediaItem[]) {
  const current = await listLocalJeffMedia({ limit: 500 });
  const byId = new Map<string, JeffMediaItem>();

  for (const entry of [...media, ...current]) {
    byId.set(entry.id, entry);
  }

  const next = [...byId.values()]
    .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime())
    .slice(0, 500);

  await mkdir(path.dirname(LOCAL_MEDIA_FILE), { recursive: true });
  await writeFile(LOCAL_MEDIA_FILE, JSON.stringify({ media: next }, null, 2));
}

async function upsertSupabaseJeffMedia(media: JeffMediaItem[]) {
  if (media.length === 0) return [];

  const rows = await supabaseRestRequest<JeffMediaRow[]>(
    "wrenchready_jeff_media?on_conflict=id",
    {
      method: "POST",
      body: media.map(mediaToRow),
      prefer: "resolution=merge-duplicates,return=representation",
    },
  );

  return rows.map(mediaFromRow);
}

async function listSupabaseJeffMedia(options: JeffMediaListOptions = {}) {
  const filters = [
    options.jobId ? `job_id=eq.${encodeFilterValue(options.jobId)}` : undefined,
    options.sessionId ? `session_id=eq.${encodeFilterValue(options.sessionId)}` : undefined,
    options.conversationId ? `conversation_id=eq.${encodeFilterValue(options.conversationId)}` : undefined,
  ].filter(Boolean);
  const query = [
    "wrenchready_jeff_media?select=*",
    filters.length ? `&${filters.join("&")}` : "",
    "&order=uploaded_at.desc",
    `&limit=${Math.max(1, Math.min(options.limit || 100, 500))}`,
  ].join("");
  const rows = await supabaseRestRequest<JeffMediaRow[]>(query, { method: "GET" });

  return rows.map(mediaFromRow);
}

function messageFromError(error: unknown) {
  return error instanceof Error ? error.message : "Unknown Jeff media persistence error.";
}

export async function persistJeffMediaItems(media: JeffMediaItem[]): Promise<JeffMediaPersistenceResult> {
  if (media.length === 0) return { status: hasPromiseCrmSupabase() ? "supabase-media" : "not-configured" };

  if (!hasPromiseCrmSupabase()) {
    await upsertLocalJeffMedia(media);
    return {
      status: "local-file",
      warning: "Supabase is not configured, so Jeff wrote the media index to local pilot storage.",
    };
  }

  try {
    const saved = await upsertSupabaseJeffMedia(media);
    await upsertLocalJeffMedia(saved);
    return { status: "supabase-media" };
  } catch (error) {
    await upsertLocalJeffMedia(media);
    return {
      status: "local-file",
      warning: `Jeff media Supabase save failed, so the media index was written locally: ${messageFromError(error)}`,
    };
  }
}

export async function persistJeffMediaItem(media: JeffMediaItem) {
  return persistJeffMediaItems([media]);
}

export async function listPersistedJeffMedia(options: JeffMediaListOptions = {}): Promise<JeffMediaListResult> {
  if (!hasPromiseCrmSupabase()) {
    return {
      media: await listLocalJeffMedia(options),
      warnings: ["Supabase is not configured, so Jeff is reading local pilot media storage."],
      storageStatus: "local-file",
    };
  }

  try {
    const media = await listSupabaseJeffMedia(options);
    await upsertLocalJeffMedia(media);
    return {
      media,
      warnings: [],
      storageStatus: "supabase-media",
    };
  } catch (error) {
    return {
      media: await listLocalJeffMedia(options),
      warnings: [`Jeff media Supabase read failed, so Jeff is reading local pilot storage: ${messageFromError(error)}`],
      storageStatus: "local-file",
    };
  }
}
