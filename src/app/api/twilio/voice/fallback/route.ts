import { NextRequest, NextResponse } from "next/server";
import { readEnv } from "@/lib/env";
import {
  buildEmptyTwiml,
  buildVoicemailRecordingTwiml,
  getSecondsEnv,
  getTwilioCallerId,
  normalizePhone,
  TWILIO_XML_HEADERS,
  xmlEscape,
} from "@/lib/twilio-voice";

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
  <Say voice="alice">Adam is tied up right now. I am connecting you to Jeff, WrenchReady's assistant, so we can still help.</Say>
  <Dial answerOnBridge="true" callerId="${xmlEscape(callerId)}" timeout="${getJeffFallbackTimeoutSeconds()}" action="/api/twilio/voicemail">
    <Number>${xmlEscape(jeffPhone)}</Number>
  </Dial>
</Response>`;
}

async function handler(req: NextRequest) {
  const dialStatus = await getDialStatus(req);

  if (dialStatus === "completed") {
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

async function getDialStatus(req: NextRequest) {
  if (req.method === "GET") {
    return req.nextUrl.searchParams.get("DialCallStatus") ?? "";
  }

  const contentType = req.headers.get("content-type") ?? "";

  if (!contentType.includes("application/x-www-form-urlencoded") && !contentType.includes("multipart/form-data")) {
    return req.nextUrl.searchParams.get("DialCallStatus") ?? "";
  }

  const formData = await req.formData();
  return (formData.get("DialCallStatus") as string) ?? "";
}

export { handler as GET, handler as POST };
