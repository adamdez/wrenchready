import type { Metadata } from "next";
import { JeffMessagesThread } from "@/components/jeff-messages-thread";
import { getJeffFieldAppAuthStatus } from "@/lib/jeff-field-assistant/app-auth";
import {
  getActiveJeffLiveSession,
  getJeffFieldPhoneHref,
  getJeffFieldPhoneNumber,
  getJeffPhotoDropJobs,
} from "@/lib/jeff-field-assistant";
import { listJeffAppThreadMessages } from "@/lib/jeff-field-assistant/app-chat";

export const metadata: Metadata = {
  title: "Message Jeff",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type JeffMessagesPageProps = {
  searchParams: Promise<{
    jobId?: string;
  }>;
};

export default async function JeffMessagesPage({ searchParams }: JeffMessagesPageProps) {
  const params = await searchParams;
  const appAuth = getJeffFieldAppAuthStatus();
  const [thread, photoDrop] = await Promise.all([
    appAuth.required ? Promise.resolve({ messages: [], warnings: [] }) : listJeffAppThreadMessages(),
    appAuth.required ? Promise.resolve({ jobs: [] }) : getJeffPhotoDropJobs({ includeJobId: params.jobId }),
  ]);
  const activeSession = appAuth.required ? undefined : getActiveJeffLiveSession();
  const selectableJobIds = new Set(photoDrop.jobs.map((job) => job.jobId));
  const latestThreadJobId = [...thread.messages]
    .reverse()
    .find((message) => message.jobId && selectableJobIds.has(message.jobId))?.jobId;
  const requestedJobId = params.jobId && selectableJobIds.has(params.jobId)
    ? params.jobId
    : undefined;
  const initialSelectedJobId = requestedJobId ||
    activeSession?.activeJobId ||
    latestThreadJobId ||
    (photoDrop.jobs.length === 1 ? photoDrop.jobs[0]?.jobId : undefined);

  return (
    <JeffMessagesThread
      initialMessages={thread.messages}
      jobs={photoDrop.jobs}
      phoneHref={getJeffFieldPhoneHref()}
      phoneNumber={getJeffFieldPhoneNumber()}
      initialWarning={thread.warnings[0]}
      initialSelectedJobId={initialSelectedJobId}
      pinRequired={appAuth.required}
    />
  );
}
