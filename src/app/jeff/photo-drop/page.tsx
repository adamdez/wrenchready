import type { Metadata } from "next";
import { JeffPhotoDropForm } from "@/components/jeff-photo-drop-form";
import {
  getActiveJeffLiveSessionById,
  getJeffPhotoDropJobs,
} from "@/lib/jeff-field-assistant";

export const metadata: Metadata = {
  title: "Jeff Photo Drop",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type JeffPhotoDropPageProps = {
  searchParams: Promise<{
    session?: string;
    jobId?: string;
  }>;
};

export default async function JeffPhotoDropPage({ searchParams }: JeffPhotoDropPageProps) {
  const params = await searchParams;
  const photoDrop = await getJeffPhotoDropJobs({ includeJobId: params.jobId });
  const liveSession = params.session ? getActiveJeffLiveSessionById(params.session) : undefined;
  const allowedJobIds = new Set(
    [params.jobId, liveSession?.activeJobId].filter((value): value is string => Boolean(value)),
  );
  const jobs = allowedJobIds.size > 0
    ? photoDrop.jobs.filter((job) => allowedJobIds.has(job.jobId))
    : [];
  const initialJobId = jobs.some((job) => job.jobId === params.jobId) ? params.jobId : undefined;
  const sessionWarning =
    params.session && !liveSession
      ? "That Jeff session is not active anymore. Upload with a selected job or customer/vehicle details."
      : undefined;

  return (
    <JeffPhotoDropForm
      jobs={jobs}
      initialJobId={initialJobId}
      initialSession={liveSession
        ? {
            id: liveSession.id,
            status: liveSession.status,
            activeJobId: liveSession.activeJobId,
            activeJobLabel: liveSession.activeJobLabel,
            updatedAt: liveSession.updatedAt,
          }
        : null}
      sessionWarning={sessionWarning}
      maxPhotosPerUpload={photoDrop.maxPhotosPerUpload}
      uploadPinConfigured={photoDrop.uploadPinConfigured}
    />
  );
}
