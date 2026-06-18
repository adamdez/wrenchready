import { timingSafeEqual } from "node:crypto";
import { readEnv } from "@/lib/env";

type JeffFieldAppAuthResult =
  | { authorized: true; pinRequired: boolean }
  | { authorized: false; pinRequired: boolean; status: number; message: string };

function isProductionRuntime() {
  return process.env.NODE_ENV === "production" || readEnv("VERCEL_ENV") === "production";
}

function secretsMatch(provided: string, expected: string) {
  const providedBuffer = Buffer.from(provided);
  const expectedBuffer = Buffer.from(expected);
  return providedBuffer.length === expectedBuffer.length && timingSafeEqual(providedBuffer, expectedBuffer);
}

export function getJeffFieldAppPin() {
  return readEnv("JEFF_FIELD_APP_PIN", "JEFF_FIELD_PHOTO_UPLOAD_PIN");
}

export function getJeffFieldAppAuthStatus() {
  const pin = getJeffFieldAppPin();
  return {
    configured: Boolean(pin),
    required: Boolean(pin) || isProductionRuntime(),
  };
}

export function authorizeJeffFieldAppRequest(request: Request): JeffFieldAppAuthResult {
  const requiredPin = getJeffFieldAppPin();
  const pinRequired = Boolean(requiredPin) || isProductionRuntime();

  if (!requiredPin) {
    return isProductionRuntime()
      ? {
          authorized: false,
          pinRequired,
          status: 503,
          message: "Jeff field app PIN is not configured.",
        }
      : { authorized: true, pinRequired: false };
  }

  const authHeader = request.headers.get("authorization") || "";
  const bearer = authHeader.match(/^Bearer\s+(.+)$/i)?.[1];
  const provided = bearer || request.headers.get("x-jeff-app-pin") || request.headers.get("x-jeff-photo-pin") || "";

  if (provided && secretsMatch(provided.trim(), requiredPin)) {
    return { authorized: true, pinRequired };
  }

  return {
    authorized: false,
    pinRequired,
    status: 401,
    message: "Jeff field app PIN is incorrect.",
  };
}
