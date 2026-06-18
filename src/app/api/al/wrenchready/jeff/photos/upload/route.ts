import { Buffer } from "node:buffer";
import { NextResponse } from "next/server";
import { readEnv } from "@/lib/env";
import { recordFieldPhotoUpload } from "@/lib/jeff-field-assistant/tools";

export const dynamic = "force-dynamic";

const MAX_UPLOAD_BYTES = 7 * 1024 * 1024;

function isProductionRuntime() {
  return process.env.NODE_ENV === "production" || readEnv("VERCEL_ENV") === "production";
}

function formString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function isUploadFile(value: FormDataEntryValue): value is File {
  return (
    typeof value === "object" &&
    value !== null &&
    "arrayBuffer" in value &&
    "name" in value &&
    "type" in value &&
    "size" in value
  );
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

export async function POST(request: Request) {
  const requiredPin = readEnv("JEFF_FIELD_PHOTO_UPLOAD_PIN");
  if (!requiredPin && isProductionRuntime()) {
    return NextResponse.json(
      {
        success: false,
        error: "Jeff Photo Drop PIN is not configured.",
      },
      { status: 503 },
    );
  }

  const formData = await request.formData();

  if (requiredPin && formString(formData, "pin") !== requiredPin) {
    return NextResponse.json(
      {
        success: false,
        error: "Jeff Photo Drop PIN is incorrect.",
      },
      { status: 401 },
    );
  }

  const files = formData.getAll("photos").filter(isUploadFile);
  const rejected: string[] = [];

  const photos = await Promise.all(
    files.map(async (file) => {
      if (!file.type.toLowerCase().startsWith("image/")) {
        rejected.push(`${file.name || "photo"} is not an image.`);
        return null;
      }

      if (file.size > MAX_UPLOAD_BYTES) {
        rejected.push(`${file.name || "photo"} is too large for the pilot upload limit.`);
        return null;
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      return {
        fileName: file.name || "field-photo.jpg",
        contentType: file.type || "image/jpeg",
        sizeBytes: file.size,
        dataUrl: `data:${file.type || "image/jpeg"};base64,${buffer.toString("base64")}`,
      };
    }),
  );

  const response = await recordFieldPhotoUpload({
    sessionId: formString(formData, "sessionId"),
    jobId: formString(formData, "jobId"),
    customerName: formString(formData, "customerName"),
    vehicle: formString(formData, "vehicle"),
    label: formString(formData, "label"),
    note: formString(formData, "note"),
    uploadedBy: formString(formData, "uploadedBy") || "Simon",
    sourceChannel: "upload",
    photos: photos.filter(Boolean),
  });

  const payload: Record<string, unknown> = isObject(response)
    ? response
    : { success: false, error: "Jeff photo upload returned an invalid response." };
  const success = payload.success === true;
  const warnings = Array.isArray(payload.warnings) ? payload.warnings : [];

  return NextResponse.json(
    {
      ...payload,
      warnings: [...warnings, ...rejected],
    },
    { status: success ? 200 : 400 },
  );
}
