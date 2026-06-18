import { NextResponse } from "next/server";
import { authorizeJeffToolRequest } from "@/lib/jeff-field-assistant/tools";
import {
  getJeffPilotTranscriptReviews,
  reviewJeffTranscript,
} from "@/lib/jeff-field-assistant/vapi-server";

export const dynamic = "force-dynamic";

export function GET(request: Request) {
  const auth = authorizeJeffToolRequest(request);
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.message }, { status: auth.status });
  }

  return NextResponse.json({
    success: true,
    reviews: getJeffPilotTranscriptReviews(),
  });
}

export async function POST(request: Request) {
  const auth = authorizeJeffToolRequest(request);
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.message }, { status: auth.status });
  }

  const body = await request.json().catch(() => ({}));
  const review = reviewJeffTranscript({
    callId: typeof body.callId === "string" ? body.callId : undefined,
    customerNumber: typeof body.customerNumber === "string" ? body.customerNumber : undefined,
    assistantId: typeof body.assistantId === "string" ? body.assistantId : undefined,
    scenario: typeof body.scenario === "string" ? body.scenario : undefined,
    transcript: typeof body.transcript === "string" ? body.transcript : undefined,
  });

  return NextResponse.json({
    success: true,
    review,
  });
}
