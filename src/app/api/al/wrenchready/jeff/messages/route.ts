import { NextResponse } from "next/server";
import { authorizeJeffFieldAppRequest } from "@/lib/jeff-field-assistant/app-auth";
import {
  listJeffAppThreadMessages,
  sendJeffAppMessage,
} from "@/lib/jeff-field-assistant/app-chat";
import { getActiveJeffLiveSession } from "@/lib/jeff-field-assistant/session";
import { getJeffPhotoDropJobs } from "@/lib/jeff-field-assistant/tools";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = authorizeJeffFieldAppRequest(request);
  if (!auth.authorized) {
    return NextResponse.json(
      { success: false, error: auth.message, pinRequired: auth.pinRequired },
      { status: auth.status },
    );
  }

  const [thread, photoDrop] = await Promise.all([
    listJeffAppThreadMessages(),
    getJeffPhotoDropJobs(),
  ]);
  const activeSession = getActiveJeffLiveSession();
  const activeJobId = activeSession?.activeJobId ||
    (photoDrop.jobs.length === 1 ? photoDrop.jobs[0]?.jobId : undefined);
  const activeJob = photoDrop.jobs.find((job) => job.jobId === activeJobId);

  return NextResponse.json({
    success: true,
    ...thread,
    jobs: photoDrop.jobs,
    activeJobId,
    activeJobNotice: activeJob
      ? `Using ${activeJob.customerName} / ${activeJob.vehicle}.`
      : activeSession?.activeJobId
        ? "Jeff has an active job from the live session, but it is not in the current job list."
        : undefined,
  });
}

export async function POST(request: Request) {
  const auth = authorizeJeffFieldAppRequest(request);
  if (!auth.authorized) {
    return NextResponse.json(
      { success: false, error: auth.message, pinRequired: auth.pinRequired },
      { status: auth.status },
    );
  }

  const payload = await request.json().catch(() => ({}));
  const result = await sendJeffAppMessage(payload);

  return NextResponse.json(result, {
    status: result.success ? 200 : 400,
  });
}
