import { NextRequest, NextResponse } from "next/server";
import {
  buildEmptyTwiml,
  buildVoicemailRecordingTwiml,
  TWILIO_XML_HEADERS,
} from "@/lib/twilio-voice";

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
  const dialStatus = await getDialStatus(req);
  return handleDialResult(dialStatus);
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
