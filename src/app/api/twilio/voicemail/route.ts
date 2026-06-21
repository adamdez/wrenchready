import { NextRequest, NextResponse } from "next/server";
import {
  buildEmptyTwiml,
  buildVoicemailRecordingTwiml,
  TWILIO_XML_HEADERS,
} from "@/lib/twilio-voice";
import { enforceRateLimit } from "@/lib/rate-limit";
import { validateTwilioWebhook } from "@/lib/twilio-webhook";

/**
 * Twilio hits this endpoint after the <Dial> completes (via the action URL).
 * If the call wasn't answered, play a voicemail greeting and record the message.
 * If the call was answered (completed), just hang up cleanly.
 */
function handleDialResult(dialStatus: string) {
  const answered = dialStatus === "completed";

  if (answered) {
    return new NextResponse(buildEmptyTwiml(), { status: 200, headers: TWILIO_XML_HEADERS });
  }

  return new NextResponse(buildVoicemailRecordingTwiml(), {
    status: 200,
    headers: TWILIO_XML_HEADERS,
  });
}

async function handler(req: NextRequest) {
  const validation = await validateTwilioWebhook(req, { readFormData: true });
  if (!validation.ok) return validation.response;

  const rateLimit = await enforceRateLimit(req, {
    keyPrefix: "twilio:voicemail",
    limit: 40,
    windowMs: 60_000,
    subject: req.nextUrl.searchParams.get("From") || undefined,
    responseKind: "twiml",
  });

  if (rateLimit) return rateLimit;

  const dialStatus = getDialStatus(req, validation.formData);
  return handleDialResult(dialStatus);
}

function getDialStatus(req: NextRequest, formData?: FormData) {
  if (req.method === "GET") {
    return req.nextUrl.searchParams.get("DialCallStatus") ?? "";
  }
  return ((formData?.get("DialCallStatus") as string | null) ?? req.nextUrl.searchParams.get("DialCallStatus")) ?? "";
}

export { handler as GET, handler as POST };
