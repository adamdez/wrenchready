import { NextRequest, NextResponse } from "next/server";

const XML_HEADERS = {
  "Content-Type": "text/xml; charset=utf-8",
} as const;

/**
 * Twilio hits this endpoint after the <Dial> completes (via the action URL).
 * If the call wasn't answered, play a voicemail greeting and record the message.
 * If the call was answered (completed), just hang up cleanly.
 */
function handleDialResult(dialStatus: string) {
  const answered = dialStatus === "completed";

  if (answered) {
    return new NextResponse(
      `<?xml version="1.0" encoding="UTF-8"?>\n<Response/>`,
      { status: 200, headers: XML_HEADERS },
    );
  }

  // Not answered — play greeting and record voicemail
  return new NextResponse(
    `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">Hey, you've reached Wrench Ready Mobile Mechanic. We can't get to the phone right now. Leave your name, number, and a short message and we'll get back to you as soon as possible.</Say>
  <Record maxLength="120" playBeep="true" action="/api/twilio/voicemail/complete" transcribe="false" />
  <Say voice="alice">We didn't receive a message. Feel free to text this number instead. Goodbye.</Say>
</Response>`,
    { status: 200, headers: XML_HEADERS },
  );
}

async function handler(req: NextRequest) {
  const formData = await req.formData();
  const dialStatus = (formData.get("DialCallStatus") as string) ?? "";
  return handleDialResult(dialStatus);
}

export { handler as GET, handler as POST };
