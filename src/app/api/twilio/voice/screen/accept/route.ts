import { NextResponse } from "next/server";
import { TWILIO_XML_HEADERS } from "@/lib/twilio-voice";

function handler() {
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
