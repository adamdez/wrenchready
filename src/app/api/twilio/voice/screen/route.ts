import { NextRequest, NextResponse } from "next/server";
import { enforceRateLimit } from "@/lib/rate-limit";
import { getSecondsEnv, TWILIO_XML_HEADERS } from "@/lib/twilio-voice";
import { validateTwilioWebhook } from "@/lib/twilio-webhook";

function getScreenTimeoutSeconds() {
  return getSecondsEnv(["TWILIO_FORWARD_SCREEN_TIMEOUT_SECONDS"], {
    fallback: 4,
    min: 2,
    max: 10,
  });
}

function buildScreeningTwiml() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather input="dtmf" numDigits="1" timeout="${getScreenTimeoutSeconds()}" action="/api/twilio/voice/screen/accept" method="POST">
    <Say voice="alice">WrenchReady call. Press any key to take it. If you do not take it, Jeff will answer.</Say>
  </Gather>
  <Hangup/>
</Response>`;
}

async function handler(request: NextRequest) {
  const validation = await validateTwilioWebhook(request, { readFormData: true });
  if (!validation.ok) return validation.response;

  const rateLimit = await enforceRateLimit(request, {
    keyPrefix: "twilio:voice-screen",
    limit: 60,
    windowMs: 60_000,
    subject: request.nextUrl.searchParams.get("From") || undefined,
    responseKind: "twiml",
  });

  if (rateLimit) return rateLimit;

  return new NextResponse(buildScreeningTwiml(), {
    status: 200,
    headers: TWILIO_XML_HEADERS,
  });
}

export { handler as GET, handler as POST };
