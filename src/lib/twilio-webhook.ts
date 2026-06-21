import { createHmac, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { readEnv } from "@/lib/env";

type TwilioValidationResult =
  | { ok: true; formData?: FormData }
  | { ok: false; response: NextResponse };

const TWILIO_WEBHOOK_HEADERS = {
  "Content-Type": "text/xml; charset=utf-8",
} as const;

function twilioError(status: number, message: string) {
  return new NextResponse(
    `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>${message}</Message>
</Response>`,
    { status, headers: TWILIO_WEBHOOK_HEADERS },
  );
}

function requestUrl(request: NextRequest) {
  const proto =
    request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() ||
    request.nextUrl.protocol.replace(/:$/, "") ||
    "https";
  const host =
    request.headers.get("x-forwarded-host")?.split(",")[0]?.trim() ||
    request.headers.get("host") ||
    request.nextUrl.host;

  return `${proto}://${host}${request.nextUrl.pathname}${request.nextUrl.search}`;
}

function formEntries(formData: FormData) {
  return Array.from(formData.entries())
    .filter((entry): entry is [string, string] => typeof entry[1] === "string")
    .sort(([aName, aValue], [bName, bValue]) => {
      if (aName === bName) return aValue.localeCompare(bValue);
      return aName.localeCompare(bName);
    });
}

function timingSafeBase64Equals(actual: string, expected: string) {
  const actualBuffer = Buffer.from(actual);
  const expectedBuffer = Buffer.from(expected);

  if (actualBuffer.length !== expectedBuffer.length) return false;

  return timingSafeEqual(actualBuffer, expectedBuffer);
}

export function computeTwilioSignature(
  url: string,
  params: Array<[string, string]>,
  authToken: string,
) {
  const payload = params.reduce((acc, [key, value]) => `${acc}${key}${value}`, url);

  return createHmac("sha1", authToken).update(payload).digest("base64");
}

function verifySignature(
  request: NextRequest,
  signature: string,
  params: Array<[string, string]>,
  authToken: string,
) {
  const expected = computeTwilioSignature(requestUrl(request), params, authToken);

  return timingSafeBase64Equals(signature, expected);
}

function shouldReadForm(request: NextRequest) {
  const contentType = request.headers.get("content-type") || "";
  return (
    request.method !== "GET" &&
    (contentType.includes("application/x-www-form-urlencoded") ||
      contentType.includes("multipart/form-data"))
  );
}

export async function validateTwilioWebhook(
  request: NextRequest,
  options?: { readFormData?: boolean },
): Promise<TwilioValidationResult> {
  const authToken = readEnv("TWILIO_AUTH_TOKEN", "Twilio_Auth_Token");
  const signature = request.headers.get("x-twilio-signature");

  if (!authToken) {
    return {
      ok: false,
      response: twilioError(503, "Twilio webhook validation is not configured."),
    };
  }

  if (!signature) {
    return {
      ok: false,
      response: twilioError(403, "Invalid Twilio webhook signature."),
    };
  }

  const formData = options?.readFormData && shouldReadForm(request)
    ? await request.formData()
    : undefined;
  const params = formData ? formEntries(formData) : [];

  if (!verifySignature(request, signature, params, authToken)) {
    return {
      ok: false,
      response: twilioError(403, "Invalid Twilio webhook signature."),
    };
  }

  return { ok: true, formData };
}
