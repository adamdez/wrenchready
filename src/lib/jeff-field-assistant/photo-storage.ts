import { readFileSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  dataUrlToGoogleDriveBuffer,
  downloadGoogleDriveFile,
  getGoogleWorkspaceIntegrationStatus,
  uploadGoogleDriveFile,
} from "@/lib/google-workspace";
import { getJeffLocalDataPath } from "@/lib/jeff-field-assistant/local-data";
import type { JeffFieldPhoto, JeffFieldPhotoStorageStatus } from "@/lib/jeff-field-assistant/types";

type PersistPhotoInput = {
  photoId: string;
  fileName: string;
  contentType: string;
  dataUrl?: string;
  url?: string;
};

type PersistPhotoResult = {
  dataUrl?: string;
  url?: string;
  storageKey?: string;
  driveFileId?: string;
  driveWebViewLink?: string;
  driveWebContentLink?: string;
  storageStatus: JeffFieldPhotoStorageStatus;
  warning?: string;
};

const DATA_URL_PATTERN = /^data:(image\/[a-zA-Z0-9.+-]+);base64,([a-zA-Z0-9+/=\s]+)$/;
const PHOTO_STORAGE_DIR = getJeffLocalDataPath("photos");
const PHOTO_INDEX_FILE = path.join(PHOTO_STORAGE_DIR, "index.json");
const MAX_PERSISTED_PHOTO_RECORDS = 500;

function getPhotoStorageDir() {
  return PHOTO_STORAGE_DIR;
}

function safeSegment(value: string) {
  return value.trim().replace(/[^a-zA-Z0-9._-]/g, "-").replace(/-+/g, "-").slice(0, 120);
}

function extensionForPhoto(fileName: string, contentType: string) {
  const fromName = path.extname(fileName).replace(/[^a-zA-Z0-9.]/g, "").slice(0, 12);
  if (fromName) return fromName.toLowerCase();

  if (contentType === "image/png") return ".png";
  if (contentType === "image/webp") return ".webp";
  if (contentType === "image/gif") return ".gif";
  return ".jpg";
}

function parseDataUrl(dataUrl: string) {
  const match = dataUrl.match(DATA_URL_PATTERN);
  if (!match) return null;

  return {
    contentType: match[1],
    buffer: Buffer.from(match[2].replace(/\s/g, ""), "base64"),
  };
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

function isStorageStatus(value: unknown): value is JeffFieldPhotoStorageStatus {
  return (
    value === "google-drive" ||
    value === "local-file" ||
    value === "runtime-memory" ||
    value === "external-url" ||
    value === "metadata-only"
  );
}

function photoFromIndexValue(value: unknown): JeffFieldPhoto | null {
  if (!isObject(value)) return null;

  const id = optionalString(value.id);
  const uploadedAt = optionalString(value.uploadedAt);
  const uploadedBy = optionalString(value.uploadedBy);
  const sourceChannel = optionalString(value.sourceChannel);
  const fileName = optionalString(value.fileName);
  const contentType = optionalString(value.contentType);
  const sizeBytes = optionalNumber(value.sizeBytes);
  const storageStatus = value.storageStatus;

  if (!id || !uploadedAt || !uploadedBy || !sourceChannel || !fileName || !contentType || sizeBytes === undefined) {
    return null;
  }
  if (!isStorageStatus(storageStatus)) return null;

  return {
    id,
    jobId: optionalString(value.jobId),
    sessionId: optionalString(value.sessionId),
    uploadedAt,
    uploadedBy,
    sourceChannel: sourceChannel as JeffFieldPhoto["sourceChannel"],
    fileName,
    contentType,
    sizeBytes,
    label: optionalString(value.label),
    note: optionalString(value.note),
    url: optionalString(value.url),
    storageKey: optionalString(value.storageKey),
    mediaId: optionalString(value.mediaId),
    driveFileId: optionalString(value.driveFileId),
    driveWebViewLink: optionalString(value.driveWebViewLink),
    driveWebContentLink: optionalString(value.driveWebContentLink),
    storageStatus,
    attachmentStatus:
      value.attachmentStatus === "job-attached" || value.attachmentStatus === "session-inbox"
        ? value.attachmentStatus
        : undefined,
    eventId: optionalString(value.eventId),
  };
}

function photoForIndex(photo: JeffFieldPhoto): JeffFieldPhoto {
  return { ...photo, dataUrl: undefined };
}

function driveFileName(input: PersistPhotoInput, contentType: string) {
  const extension = extensionForPhoto(input.fileName, contentType);
  const baseName = safeSegment(path.basename(input.fileName, path.extname(input.fileName))) || "field-photo";
  return `${safeSegment(input.photoId)}-${baseName}${extension}`;
}

export function readPersistedJeffPhotos() {
  try {
    const parsed = JSON.parse(readFileSync(PHOTO_INDEX_FILE, "utf8"));
    const values = Array.isArray(parsed?.photos) ? parsed.photos : [];
    return values
      .map(photoFromIndexValue)
      .filter((photo: JeffFieldPhoto | null): photo is JeffFieldPhoto => Boolean(photo));
  } catch {
    return [];
  }
}

export async function upsertPersistedJeffPhotos(photos: JeffFieldPhoto[]) {
  const current = readPersistedJeffPhotos();
  const byId = new Map<string, JeffFieldPhoto>();

  for (const photo of [...photos.map(photoForIndex), ...current]) {
    byId.set(photo.id, photo);
  }

  const nextPhotos = [...byId.values()]
    .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime())
    .slice(0, MAX_PERSISTED_PHOTO_RECORDS);

  await mkdir(PHOTO_STORAGE_DIR, { recursive: true });
  await writeFile(PHOTO_INDEX_FILE, JSON.stringify({ photos: nextPhotos }, null, 2));
}

export async function persistJeffPhotoData(input: PersistPhotoInput): Promise<PersistPhotoResult> {
  if (input.url) {
    return {
      url: input.url,
      storageStatus: "external-url",
    };
  }

  if (!input.dataUrl) {
    return {
      storageStatus: "metadata-only",
    };
  }

  const parsed = parseDataUrl(input.dataUrl);
  if (!parsed) {
    return {
      storageStatus: "runtime-memory",
      dataUrl: input.dataUrl,
      warning: "Jeff could not persist one photo because its image data was not a valid image data URL.",
    };
  }

  let driveWarning: string | undefined;
  const driveUpload = dataUrlToGoogleDriveBuffer(input.dataUrl);
  const googleStatus = getGoogleWorkspaceIntegrationStatus();
  if (googleStatus.drive.canUpload && driveUpload) {
    try {
      const driveFile = await uploadGoogleDriveFile({
        fileName: driveFileName(input, driveUpload.mimeType || parsed.contentType || input.contentType),
        mimeType: driveUpload.mimeType || parsed.contentType || input.contentType,
        data: driveUpload.data,
      });

      return {
        url: driveFile.webViewLink || driveFile.webContentLink,
        storageKey: driveFile.id,
        driveFileId: driveFile.id,
        driveWebViewLink: driveFile.webViewLink,
        driveWebContentLink: driveFile.webContentLink,
        storageStatus: "google-drive",
      };
    } catch (error) {
      driveWarning = error instanceof Error
        ? `Jeff could not upload one photo to Google Drive, so he tried local pilot storage instead: ${error.message}`
        : "Jeff could not upload one photo to Google Drive, so he tried local pilot storage instead.";
    }
  }

  try {
    const storageDir = getPhotoStorageDir();
    await mkdir(storageDir, { recursive: true });

    const storageKey = `${safeSegment(input.photoId)}${extensionForPhoto(input.fileName, parsed.contentType || input.contentType)}`;
    await writeFile(path.join(/*turbopackIgnore: true*/ storageDir, storageKey), parsed.buffer);

    return {
      storageKey,
      storageStatus: "local-file",
      warning: driveWarning,
    };
  } catch {
    return {
      storageStatus: "runtime-memory",
      dataUrl: input.dataUrl,
      warning: [
        driveWarning,
        "Jeff could not write a photo to local durable storage, so it was kept in runtime memory for this process only.",
      ].filter(Boolean).join(" "),
    };
  }
}

export async function getJeffPhotoImageUrl(photo: JeffFieldPhoto) {
  if (photo.dataUrl) return { imageUrl: photo.dataUrl };
  if (photo.storageStatus === "google-drive" && photo.driveFileId) {
    try {
      const buffer = await downloadGoogleDriveFile(photo.driveFileId);
      return {
        imageUrl: `data:${photo.contentType || "image/jpeg"};base64,${buffer.toString("base64")}`,
      };
    } catch (error) {
      return {
        imageUrl: undefined,
        warning: error instanceof Error
          ? `Jeff could not read the Google Drive photo bytes: ${error.message}`
          : "Jeff could not read the Google Drive photo bytes.",
      };
    }
  }
  if (photo.url && photo.storageStatus !== "google-drive") return { imageUrl: photo.url };

  if (photo.storageStatus !== "local-file" || !photo.storageKey) {
    return {
      imageUrl: undefined,
      warning: "The selected photo has no image data, external URL, or local storage key available.",
    };
  }

  try {
    const buffer = await readFile(
      path.join(/*turbopackIgnore: true*/ getPhotoStorageDir(), safeSegment(photo.storageKey)),
    );
    return {
      imageUrl: `data:${photo.contentType || "image/jpeg"};base64,${buffer.toString("base64")}`,
    };
  } catch {
    return {
      imageUrl: undefined,
      warning: "Jeff could not read the local stored photo. Re-upload the image before relying on photo analysis.",
    };
  }
}
