import { NextResponse } from "next/server";
import { readEnv } from "@/lib/env";
import { syncJeffFieldAssistantLocalMirror } from "@/lib/jeff-field-assistant/sync";
import { authorizeJeffToolRequest } from "@/lib/jeff-field-assistant/tools";

export const dynamic = "force-dynamic";

function authorizeSyncRequest(request: Request) {
  const cronSecret = readEnv("CRON_SECRET");
  const authorization = request.headers.get("authorization") || "";

  if (cronSecret && authorization === `Bearer ${cronSecret}`) {
    return { authorized: true as const };
  }

  return authorizeJeffToolRequest(request);
}

async function syncResponse(jobId?: string) {
  const sync = await syncJeffFieldAssistantLocalMirror(jobId);
  return NextResponse.json(sync, { status: sync.success ? 200 : 207 });
}

export async function GET(request: Request) {
  const auth = authorizeSyncRequest(request);
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.message }, { status: auth.status });
  }

  const url = new URL(request.url);
  return syncResponse(url.searchParams.get("jobId") || undefined);
}

export async function POST(request: Request) {
  const auth = authorizeSyncRequest(request);
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.message }, { status: auth.status });
  }

  const payload = await request.json().catch(() => ({}));
  const jobId =
    payload && typeof payload === "object" && "jobId" in payload && typeof payload.jobId === "string"
      ? payload.jobId
      : undefined;

  return syncResponse(jobId);
}
