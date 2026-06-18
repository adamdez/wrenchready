import { NextResponse } from "next/server";
import {
  listJeffLiveSessions,
  upsertJeffLiveSession,
} from "@/lib/jeff-field-assistant";
import type { JeffLiveSessionStatus } from "@/lib/jeff-field-assistant";
import { authorizeJeffToolRequest } from "@/lib/jeff-field-assistant/tools";

export const dynamic = "force-dynamic";

function normalizeSessionStatus(value: unknown): JeffLiveSessionStatus | undefined {
  return value === "active" || value === "recent" || value === "closed" ? value : undefined;
}

export function GET(request: Request) {
  const auth = authorizeJeffToolRequest(request);
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.message }, { status: auth.status });
  }

  return NextResponse.json({
    success: true,
    sessions: listJeffLiveSessions(),
  });
}

export async function POST(request: Request) {
  const auth = authorizeJeffToolRequest(request);
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.message }, { status: auth.status });
  }

  const body = await request.json().catch(() => ({}));
  const session = upsertJeffLiveSession({
    sessionId: typeof body.sessionId === "string" ? body.sessionId : undefined,
    source: body.source === "photo-drop" || body.source === "system" ? body.source : "mobile-hub",
    callId: typeof body.callId === "string" ? body.callId : undefined,
    callerPhone: typeof body.callerPhone === "string" ? body.callerPhone : undefined,
    activeJobId: typeof body.activeJobId === "string" ? body.activeJobId : undefined,
    activeJobLabel: typeof body.activeJobLabel === "string" ? body.activeJobLabel : undefined,
    status: normalizeSessionStatus(body.status),
    summary: typeof body.summary === "string" ? body.summary : undefined,
    eventSummary: typeof body.eventSummary === "string" ? body.eventSummary : "Manual Jeff session updated.",
  });

  return NextResponse.json({
    success: true,
    session,
  });
}
