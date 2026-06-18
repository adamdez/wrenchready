import { NextResponse } from "next/server";
import { getActiveJeffLiveSession } from "@/lib/jeff-field-assistant";
import { authorizeJeffToolRequest } from "@/lib/jeff-field-assistant/tools";

export const dynamic = "force-dynamic";

export function GET(request: Request) {
  const auth = authorizeJeffToolRequest(request);
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.message }, { status: auth.status });
  }

  return NextResponse.json({
    success: true,
    session: getActiveJeffLiveSession() || null,
  });
}
