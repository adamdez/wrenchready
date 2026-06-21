import { NextRequest, NextResponse } from "next/server";
import { readEnv } from "@/lib/env";
import { enforceRateLimit } from "@/lib/rate-limit";
import { validateTwilioWebhook } from "@/lib/twilio-webhook";
import {
  buildUnavailableTwiml,
  getSecondsEnv,
  getTwilioCallerId,
  normalizePhone,
  readBooleanEnv,
  TWILIO_XML_HEADERS,
  xmlEscape,
} from "@/lib/twilio-voice";

function getForwardTimeoutSeconds() {
  return getSecondsEnv(["TWILIO_FORWARD_TIMEOUT_SECONDS"], {
    fallback: 18,
    min: 5,
    max: 60,
  });
}

function isForwardScreeningEnabled() {
  return readBooleanEnv("TWILIO_FORWARD_SCREENING_ENABLED", true);
}

function buildForwardingResponse(forwardTo: string, callerId: string, timeout: number) {
  const screenAttributes = isForwardScreeningEnabled()
    ? ' url="/api/twilio/voice/screen" method="POST"'
    : "";

  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial answerOnBridge="true" callerId="${xmlEscape(callerId)}" timeout="${timeout}" action="/api/twilio/voice/fallback">
    <Number${screenAttributes}>${xmlEscape(forwardTo)}</Number>
  </Dial>
</Response>`;
}

async function handleVoiceWebhook(request: NextRequest) {
  const validation = await validateTwilioWebhook(request, { readFormData: true });
  if (!validation.ok) return validation.response;
  const from = validation.formData?.get("From");

  const rateLimit = await enforceRateLimit(request, {
    keyPrefix: "twilio:voice",
    limit: 40,
    windowMs: 60_000,
    subject: typeof from === "string" ? from : request.nextUrl.searchParams.get("From") || undefined,
    responseKind: "twiml",
  });

  if (rateLimit) return rateLimit;

  const forwardTo = normalizePhone(readEnv("TWILIO_FORWARD_TO_PHONE"));
  const callerId = getTwilioCallerId();

  if (!forwardTo || !callerId) {
    return new NextResponse(buildUnavailableTwiml(), {
      status: 200,
      headers: TWILIO_XML_HEADERS,
    });
  }

  return new NextResponse(
    buildForwardingResponse(forwardTo, callerId, getForwardTimeoutSeconds()),
    {
      status: 200,
      headers: TWILIO_XML_HEADERS,
    },
  );
}

export function GET(request: NextRequest) {
  return handleVoiceWebhook(request);
}

export function POST(request: NextRequest) {
  return handleVoiceWebhook(request);
}
