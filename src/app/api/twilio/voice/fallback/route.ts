import { NextRequest, NextResponse } from "next/server";
import { readEnv } from "@/lib/env";
import { enforceRateLimit } from "@/lib/rate-limit";
import {
  buildEmptyTwiml,
  buildVoicemailRecordingTwiml,
  getSecondsEnv,
  getTwilioCallerId,
  normalizePhone,
  TWILIO_XML_HEADERS,
  xmlEscape,
} from "@/lib/twilio-voice";
import { validateTwilioWebhook } from "@/lib/twilio-webhook";
import { createInboundRecord } from "@/lib/promise-crm/server";

function getJeffFallbackPhone() {
  return normalizePhone(
    readEnv(
      "TWILIO_JEFF_FALLBACK_PHONE",
      "WR_CUSTOMER_JEFF_PHONE_NUMBER",
      "VAPI_CUSTOMER_JEFF_PHONE_NUMBER",
    ),
  );
}

function getJeffFallbackTimeoutSeconds() {
  return getSecondsEnv(["TWILIO_JEFF_FALLBACK_TIMEOUT_SECONDS"], {
    fallback: 55,
    min: 10,
    max: 120,
  });
}

function buildJeffFallbackTwiml(jeffPhone: string, callerId: string) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">Connecting Jeff.</Say>
  <Dial answerOnBridge="true" callerId="${xmlEscape(callerId)}" timeout="${getJeffFallbackTimeoutSeconds()}" action="/api/twilio/voicemail">
    <Number>${xmlEscape(jeffPhone)}</Number>
  </Dial>
</Response>`;
}

async function handler(req: NextRequest) {
  const validation = await validateTwilioWebhook(req, { readFormData: true });
  if (!validation.ok) return validation.response;

  const rateLimit = await enforceRateLimit(req, {
    keyPrefix: "twilio:voice-fallback",
    limit: 40,
    windowMs: 60_000,
    subject: req.nextUrl.searchParams.get("From") || undefined,
    responseKind: "twiml",
  });

  if (rateLimit) return rateLimit;

  const dialStatus = getDialStatus(req, validation.formData);

  if (dialStatus === "completed") {
    // Close the loop: an answered inbound call must leave a structured trace, not
    // just live in the team's phone log. Mirror the voicemail-complete persistence.
    const from =
      (validation.formData?.get("From") as string | null) ||
      req.nextUrl.searchParams.get("From") ||
      "Unknown";
    const dialDuration =
      (validation.formData?.get("DialCallDuration") as string | null) ||
      req.nextUrl.searchParams.get("DialCallDuration") ||
      undefined;
    const callSid =
      (validation.formData?.get("CallSid") as string | null) ||
      req.nextUrl.searchParams.get("CallSid") ||
      undefined;
    await createInboundRecord({
      source: "phone",
      customerName: "Answered call",
      customerPhone: from,
      preferredContact: "call",
      vehicle: "Unknown vehicle",
      requestedService: "Answered inbound call — confirm need and next step",
      address: "Needs territory check",
      timingLabel: "Confirm during or right after the call",
      notes: `Inbound call answered by the team${dialDuration ? ` (~${dialDuration}s on the forwarded leg)` : ""}. Log what the customer needs and the next step so it does not stay only in the call log.`,
      rawPayload: { from, callSid, dialStatus, dialDuration },
    }).catch(() => null);
    return new NextResponse(buildEmptyTwiml(), {
      status: 200,
      headers: TWILIO_XML_HEADERS,
    });
  }

  const jeffPhone = getJeffFallbackPhone();
  const callerId = getTwilioCallerId();

  if (!jeffPhone || !callerId) {
    return new NextResponse(buildVoicemailRecordingTwiml(), {
      status: 200,
      headers: TWILIO_XML_HEADERS,
    });
  }

  return new NextResponse(buildJeffFallbackTwiml(jeffPhone, callerId), {
    status: 200,
    headers: TWILIO_XML_HEADERS,
  });
}

function getDialStatus(req: NextRequest, formData?: FormData) {
  if (req.method === "GET") {
    return req.nextUrl.searchParams.get("DialCallStatus") ?? "";
  }
  return ((formData?.get("DialCallStatus") as string | null) ?? req.nextUrl.searchParams.get("DialCallStatus")) ?? "";
}

export { handler as GET, handler as POST };
