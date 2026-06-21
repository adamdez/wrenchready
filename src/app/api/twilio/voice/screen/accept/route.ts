import { NextRequest, NextResponse } from "next/server";
import { enforceRateLimit } from "@/lib/rate-limit";
import { TWILIO_XML_HEADERS } from "@/lib/twilio-voice";
import { validateTwilioWebhook } from "@/lib/twilio-webhook";

async function handler(request: NextRequest) {
  const validation = await validateTwilioWebhook(request, { readFormData: true });
  if (!validation.ok) return validation.response;

  const rateLimit = await enforceRateLimit(request, {
    keyPrefix: "twilio:voice-screen-accept",
    limit: 60,
    windowMs: 60_000,
    subject: request.nextUrl.searchParams.get("From") || undefined,
    responseKind: "twiml",
  });

  if (rateLimit) return rateLimit;

  return new NextResponse(
    `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">Connecting.</Say>
</Response>`,
    {
      status: 200,
      headers: TWILIO_XML_HEADERS,
    },
  );
}

export { handler as GET, handler as POST };
