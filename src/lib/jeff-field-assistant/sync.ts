import { stat } from "node:fs/promises";
import {
  getJeffLocalDataPath,
  getJeffLocalDataRootStatus,
} from "@/lib/jeff-field-assistant/local-data";
import { syncJeffFieldEventMirror } from "@/lib/jeff-field-assistant/persistence";

type LocalMirrorFile = {
  label: string;
  path: string;
  exists: boolean;
  bytes?: number;
  updatedAt?: string;
};

const LOCAL_MIRROR_FILES = [
  {
    label: "field events",
    path: ".data/jeff/field-events.json",
    absolutePath: getJeffLocalDataPath("field-events.json"),
  },
  {
    label: "photo metadata",
    path: ".data/jeff/photos/index.json",
    absolutePath: getJeffLocalDataPath("photos", "index.json"),
  },
  {
    label: "photo image bytes",
    path: ".data/jeff/photos",
    absolutePath: getJeffLocalDataPath("photos"),
  },
  {
    label: "media index",
    path: ".data/jeff/media.json",
    absolutePath: getJeffLocalDataPath("media.json"),
  },
  {
    label: "live sessions",
    path: ".data/jeff/sessions.json",
    absolutePath: getJeffLocalDataPath("sessions.json"),
  },
  {
    label: "pilot call reviews",
    path: ".data/jeff/pilot-reviews.json",
    absolutePath: getJeffLocalDataPath("pilot-reviews.json"),
  },
];

async function localMirrorFile(entry: (typeof LOCAL_MIRROR_FILES)[number]): Promise<LocalMirrorFile> {
  try {
    const fileStat = await stat(/*turbopackIgnore: true*/ entry.absolutePath);
    return {
      label: entry.label,
      path: entry.path,
      exists: true,
      bytes: fileStat.size,
      updatedAt: fileStat.mtime.toISOString(),
    };
  } catch {
    return {
      label: entry.label,
      path: entry.path,
      exists: false,
    };
  }
}

export async function getJeffLocalMirrorStatus() {
  const files = await Promise.all(LOCAL_MIRROR_FILES.map(localMirrorFile));

  return {
    generatedAt: new Date().toISOString(),
    root: getJeffLocalDataRootStatus(),
    files,
  };
}

export async function syncJeffFieldAssistantLocalMirror(jobId?: string) {
  const [fieldEvents, localMirror] = await Promise.all([
    syncJeffFieldEventMirror(jobId),
    getJeffLocalMirrorStatus(),
  ]);

  return {
    success: fieldEvents.success,
    generatedAt: new Date().toISOString(),
    scope: {
      jobId: jobId || null,
    },
    fieldEvents,
    localMirror,
  };
}
