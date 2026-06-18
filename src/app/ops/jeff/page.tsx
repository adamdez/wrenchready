import type { Metadata } from "next";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Activity,
  Archive,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Bot,
  CalendarDays,
  CheckCircle2,
  Database,
  FileText,
  FlaskConical,
  FolderOpen,
  MapPin,
  Mail,
  UserRound,
  Wrench,
  XCircle,
} from "lucide-react";
import { getGoogleWorkspaceIntegrationStatus } from "@/lib/google-workspace";
import { getGoogleMapsIntegrationStatus } from "@/lib/google-maps";
import { getJeffLocalMirrorStatus } from "@/lib/jeff-field-assistant/sync";
import { getJeffCapabilityReport } from "@/lib/jeff-field-assistant/capabilities";
import { getJeffEmailIntegrationStatus } from "@/lib/jeff-field-assistant/email-ingest";
import { getLatestSimonLocation } from "@/lib/jeff-field-assistant/location";
import {
  isJeffEvaluationConversation,
  isJeffEvaluationSummary,
} from "@/lib/jeff-field-assistant/conversation-filters";
import { SectionJumpButton } from "./section-jump-button";
import {
  getJeffFieldFiles,
  getJeffBlockedRequestQueue,
  getJeffMemoryReviewQueue,
  getJeffWorkspaceReviewQueue,
  sendSimonRecapEmail,
  setJeffConversationReviewStatus,
  setJeffCoreMemoryStatus,
  syncJeffCalendar,
  syncJeffGmailInbox,
} from "@/lib/jeff-field-assistant/tools";

export const metadata: Metadata = {
  title: "Jeff Field Files",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

function formatVehicle(file: Awaited<ReturnType<typeof getJeffFieldFiles>>["fieldFiles"][number]) {
  return `${file.job.vehicle.year || ""} ${file.job.vehicle.make} ${file.job.vehicle.model}`.trim();
}

function storageTone(status: string) {
  if (
    status === "supabase-field-event" ||
    status === "supabase-memory" ||
    status === "supabase-workspace" ||
    status === "supabase-media" ||
    status === "google-drive" ||
    status === "promise-crm"
  ) {
    return "border-emerald-500/20 bg-emerald-500/10 text-emerald-300";
  }
  if (status === "local-file") return "border-sky-500/20 bg-sky-500/10 text-sky-200";
  if (status === "failed") return "border-red-500/20 bg-red-500/10 text-red-200";
  return "border-amber-500/20 bg-amber-500/10 text-amber-300";
}

function capabilityTone(status: string) {
  if (status === "ready") return "border-emerald-500/20 bg-emerald-500/10 text-emerald-200";
  if (status === "partial") return "border-amber-500/20 bg-amber-500/10 text-amber-200";
  return "border-red-500/20 bg-red-500/10 text-red-200";
}

function callTypeLabel(type?: string) {
  if (type === "job") return "Job call";
  if (type === "personal") return "Personal tech call";
  if (type === "test") return "Test call";
  if (type === "admin") return "Admin call";
  return "Unclassified call";
}

function callTypeIcon(type?: string) {
  if (type === "job") return Wrench;
  if (type === "personal") return UserRound;
  if (type === "test") return FlaskConical;
  if (type === "admin") return FileText;
  return Bot;
}

function callTone(type?: string, needsReview?: boolean) {
  if (type === "test") return "border-sky-500/20 bg-sky-500/10 text-sky-100";
  if (type === "personal") return "border-violet-500/20 bg-violet-500/10 text-violet-100";
  if (type === "admin") return "border-cyan-500/20 bg-cyan-500/10 text-cyan-100";
  if (needsReview) return "border-amber-500/20 bg-amber-500/10 text-amber-100";
  return "border-border bg-background/60 text-muted-foreground";
}

function followUpLabel(status?: string) {
  if (status === "sent") return "email sent";
  if (status === "drafted") return "drafted";
  if (status === "blocked") return "blocked";
  if (status === "failed") return "failed";
  if (status === "requested") return "requested";
  return "none";
}

function timeLabel(value?: string) {
  if (!value) return "No timestamp";
  return new Date(value).toLocaleString();
}

function shortText(value?: string, fallback = "No summary captured yet.") {
  const clean = value?.replace(/\s+/g, " ").trim();
  if (!clean) return fallback;
  return clean.length > 320 ? `${clean.slice(0, 317)}...` : clean;
}

function preferOperatorText(value?: string, fallback = "No summary captured yet.") {
  const clean = value
    ?.replace(/\s+/g, " ")
    .replace(/\b(?:Jeff|Simon)\s+says[:,]?\s+/gi, "")
    .replace(/\s+Simon asks,?\s+(?:can you\s+)?(?:compile|send|email|text)\b.*$/i, "")
    .trim();
  if (!clean) return fallback;

  const summaryClauses = [...clean.matchAll(/(Likely suspects|Recommended next tests|Proof needed):\s*(.*?)(?=\s(?:Likely suspects|Recommended next tests|Proof needed):|$)/gi)];
  if (summaryClauses.length <= 1) return shortText(clean, fallback);

  const byBody = new Map<string, { label: string; body: string }>();
  for (const clause of summaryClauses) {
    const body = clause[2]
      .replace(/\s+Simon asks,?\s+(?:can you\s+)?(?:compile|send|email|text)\b.*$/i, "")
      .trim();
    if (!body) continue;
    const label = clause[1] === "Likely suspects" && /^(verify|check|test|confirm)\b/i.test(body)
      ? "Recommended next tests"
      : clause[1];
    const key = body.toLowerCase().replace(/[^a-z0-9]+/g, "");
    const existing = byBody.get(key);
    if (!existing || label === "Recommended next tests") {
      byBody.set(key, { label, body });
    }
  }

  return shortText([...byBody.values()].map((clause) => `${clause.label}: ${clause.body}`).join(" "), fallback);
}

function blockedRequestLabel(type?: string) {
  if (type === "purchase_blocked") return "Parts purchase blocked";
  if (type === "booking_blocked") return "Booking blocked";
  if (type === "payment_blocked") return "Payment blocked";
  if (type === "email_blocked") return "Email blocked";
  if (type === "calendar_blocked") return "Calendar blocked";
  return type?.replace(/_/g, " ") || "Blocked request";
}

function blockedRequestSummary(request: { type?: string; summary?: string }) {
  const ask = preferOperatorText(
    request.summary?.replace(/^Blocked Jeff capability request\s*\([^)]+\):\s*/i, ""),
    "No request text captured.",
  );
  if (request.type === "purchase_blocked") {
    return `Jeff cannot buy or reserve parts yet. He should still find nearby inventory and give Simon store options. Simon asked: ${ask}`;
  }
  return ask;
}

function reviewPriorityLabel(conversation?: { needsReview?: boolean; callType?: string; jobMatchStatus?: string }) {
  if (!conversation) return "No call";
  if (conversation.needsReview) return "Human review";
  if (conversation.callType === "personal") return "Personal follow-up";
  if (conversation.callType === "admin") return "Admin follow-up";
  if (conversation.jobMatchStatus === "unresolved") return "Needs job match";
  return "Captured";
}

type JeffActionParams = Record<string, string | string[] | undefined>;

function searchParamValue(params: JeffActionParams, key: string) {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

function actionRedirectUrl(action: string, response: unknown) {
  const result = response && typeof response === "object"
    ? response as { success?: boolean; assistantSay?: string; error?: string }
    : {};
  const params = new URLSearchParams({
    action,
    status: result.success ? "success" : "blocked",
    message: (result.assistantSay || result.error || "Jeff action finished.").slice(0, 240),
  });

  return `/ops/field-assistant?${params.toString()}`;
}

function actionNotice(params: JeffActionParams) {
  const message = searchParamValue(params, "message");
  const status = searchParamValue(params, "status");
  if (!message) return undefined;

  return {
    message,
    success: status === "success",
  };
}

async function updateMemoryStatusAction(formData: FormData) {
  "use server";

  const id = formData.get("id");
  const status = formData.get("status");

  if (typeof id !== "string" || typeof status !== "string") {
    throw new Error("Jeff memory update requires an id and status.");
  }

  await setJeffCoreMemoryStatus({
    id,
    status,
    approvedBy: "Dez",
  });
  revalidatePath("/ops/jeff");
  revalidatePath("/ops/field-assistant");
}

async function syncGmailAction() {
  "use server";

  const response = await syncJeffGmailInbox({ maxResults: 10 });
  revalidatePath("/ops/jeff");
  revalidatePath("/ops/field-assistant");
  redirect(actionRedirectUrl("gmail", response));
}

async function syncCalendarAction() {
  "use server";

  const response = await syncJeffCalendar({ limit: 50 });
  revalidatePath("/ops/jeff");
  revalidatePath("/ops/field-assistant");
  redirect(actionRedirectUrl("calendar", response));
}

async function sendRecapAction(formData: FormData) {
  "use server";

  const conversationId = formData.get("conversationId");
  const mode = formData.get("mode");

  if (typeof conversationId !== "string" || !conversationId) {
    throw new Error("Jeff recap action requires a conversation id.");
  }

  const response = await sendSimonRecapEmail({
    conversationId,
    sendNow: mode !== "draft",
  });
  revalidatePath("/ops/jeff");
  revalidatePath("/ops/field-assistant");
  redirect(actionRedirectUrl(mode === "draft" ? "draft-recap" : "send-recap", response));
}

async function markConversationReviewedAction(formData: FormData) {
  "use server";

  const conversationId = formData.get("conversationId");

  if (typeof conversationId !== "string" || !conversationId) {
    throw new Error("Jeff review action requires a conversation id.");
  }

  const response = await setJeffConversationReviewStatus({
    conversationId,
    reviewedBy: "Dez",
  });
  revalidatePath("/ops/jeff");
  revalidatePath("/ops/field-assistant");
  redirect(actionRedirectUrl("mark-reviewed", response));
}

export default async function JeffFieldFilesPage({
  searchParams,
}: {
  searchParams?: Promise<JeffActionParams>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const notice = actionNotice(resolvedSearchParams);
  const [
    { fieldFiles, warnings },
    localMirror,
    memoryQueue,
    workspaceQueue,
    simonLocation,
    capabilityReport,
    blockedRequestQueue,
  ] = await Promise.all([
    getJeffFieldFiles(),
    getJeffLocalMirrorStatus(),
    getJeffMemoryReviewQueue(),
    getJeffWorkspaceReviewQueue(),
    getLatestSimonLocation(),
    getJeffCapabilityReport(),
    getJeffBlockedRequestQueue(8),
  ]);
  const uniqueWarnings = [...new Set([
    ...warnings,
    ...memoryQueue.warnings,
    ...workspaceQueue.warnings,
    ...capabilityReport.warnings,
    ...blockedRequestQueue.warnings,
  ])].slice(0, 5);
  const emailStatus = getJeffEmailIntegrationStatus();
  const googleWorkspaceStatus = getGoogleWorkspaceIntegrationStatus();
  const googleMapsStatus = getGoogleMapsIntegrationStatus();
  const memoryCandidates = memoryQueue.memories.filter((memory) => memory.status === "candidate").length;
  const approvedMemories = memoryQueue.memories.filter((memory) => memory.status === "approved").length;
  const allSummaries = [
    ...fieldFiles.flatMap((file) => file.conversationSummaries),
    ...workspaceQueue.summaries,
  ];
  const summaryByConversation = new Map(allSummaries.map((summary) => [summary.conversationId, summary]));
  const isEvaluationReviewConversation = (conversation: (typeof workspaceQueue.conversations)[number]) =>
    isJeffEvaluationConversation(conversation) || isJeffEvaluationSummary(summaryByConversation.get(conversation.id));
  const realReviewConversations = workspaceQueue.conversations.filter((conversation) => !isEvaluationReviewConversation(conversation));
  const latestReviewConversation = realReviewConversations[0];
  const latestReviewSummary = latestReviewConversation
    ? summaryByConversation.get(latestReviewConversation.id)
    : undefined;
  const followUpRequests = allSummaries.filter(
    (summary) => summary.emailRequested || summary.requestedFollowUps.length > 0,
  );
  const openFollowUps = followUpRequests.filter(
    (summary) => summary.emailStatus !== "sent" && summary.emailStatus !== "drafted",
  );
  const capabilityItems = [...capabilityReport.capabilities].sort((a, b) => {
    const weight = { blocked: 0, partial: 1, ready: 2 };
    return weight[a.state] - weight[b.state] || a.area.localeCompare(b.area) || a.label.localeCompare(b.label);
  });
  const latestOpenFollowUp = openFollowUps[0];
  const latestBlockedRequest = blockedRequestQueue.requests[0];
  const latestCallSummaryText = latestReviewSummary
    ? preferOperatorText(latestReviewSummary.recommendationSummary || latestReviewSummary.summary)
    : "No recent Jeff call needs operator attention.";
  const latestFollowUpNeedsAction = Boolean(
    latestReviewConversation &&
    latestReviewSummary &&
    (latestReviewSummary.emailRequested || latestReviewSummary.requestedFollowUps.length > 0) &&
    latestReviewSummary.emailStatus !== "sent",
  );
  const latestReviewNeedsAction = Boolean(
    latestReviewConversation &&
    (latestReviewConversation.needsReview || latestReviewConversation.jobMatchStatus === "unresolved"),
  );
  const primaryNextAction =
    latestReviewSummary?.requestedFollowUps[0] ||
    latestReviewSummary?.nextActions[0] ||
    latestReviewConversation?.reviewReason ||
    "No immediate operator action is attached to the latest Jeff call.";
  const earlierReviewConversations = latestReviewConversation
    ? realReviewConversations.filter((conversation) => conversation.id !== latestReviewConversation.id)
    : realReviewConversations;
  const triageItems = [
    latestReviewConversation
      ? {
          id: `call-${latestReviewConversation.id}`,
          label: reviewPriorityLabel(latestReviewConversation),
          title: latestReviewConversation.subjectLabel || latestReviewConversation.jobLabel || callTypeLabel(latestReviewConversation.callType),
          body: primaryNextAction,
          meta: `${callTypeLabel(latestReviewConversation.callType)} / ${timeLabel(latestReviewConversation.endedAt)}`,
          tone: latestReviewConversation.needsReview ? "amber" : "blue",
          target: "jeff-call-workspace",
        }
      : undefined,
    latestOpenFollowUp
      ? {
          id: `follow-up-${latestOpenFollowUp.id}`,
          label: "Follow-up open",
          title: latestOpenFollowUp.emailRequested ? "Email recap needs completion" : "Requested follow-up",
          body: latestOpenFollowUp.requestedFollowUps[0] || "Simon asked Jeff for an email recap.",
          meta: followUpLabel(latestOpenFollowUp.emailStatus),
          tone: latestOpenFollowUp.emailStatus === "failed" || latestOpenFollowUp.emailStatus === "blocked" ? "red" : "amber",
          target: "jeff-call-workspace",
        }
      : undefined,
    latestBlockedRequest
      ? {
          id: `blocked-${latestBlockedRequest.id}`,
          label: "Blocked ask",
          title: blockedRequestLabel(latestBlockedRequest.type),
          body: blockedRequestSummary(latestBlockedRequest),
          meta: timeLabel(latestBlockedRequest.timestamp),
          tone: "red",
          target: "jeff-capabilities",
        }
      : undefined,
    memoryCandidates > 0
      ? {
          id: "memory-review",
          label: "Memory review",
          title: `${memoryCandidates} candidate${memoryCandidates === 1 ? "" : "s"}`,
          body: "Approve only memories that should affect Jeff's future behavior. Keep job notes out of personal memory.",
          meta: `${approvedMemories} approved`,
          tone: "blue",
          target: "jeff-durable-memory",
        }
      : undefined,
    simonLocation.location?.stale
      ? {
          id: "location-stale",
          label: "Location stale",
          title: "Ask Simon to share location again",
          body: `Last location is ${simonLocation.location.ageMinutes} minutes old. Parts-store choices should refresh location first.`,
          meta: simonLocation.location.jobLabel || "No job label",
          tone: "amber",
          target: "jeff-google-workspace",
        }
      : undefined,
  ].filter((item): item is {
    id: string;
    label: string;
    title: string;
    body: string;
    meta: string;
    tone: string;
    target: string;
  } => Boolean(item));
  const triageTone = (tone: string) => {
    if (tone === "red") return "border-red-500/20 bg-red-500/10 text-red-100";
    if (tone === "amber") return "border-amber-500/20 bg-amber-500/10 text-amber-100";
    return "border-sky-500/20 bg-sky-500/10 text-sky-100";
  };

  return (
    <div className="shell py-10 sm:py-14">
      <Link href="/ops" className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
        <ArrowLeft className="h-4 w-4" />
        Back to Ops
      </Link>

      <section className="mt-6 overflow-hidden rounded-3xl border border-border bg-card/60 p-5 backdrop-blur-sm sm:p-6">
        <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3.5 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
          <Bot className="h-3.5 w-3.5" />
          Jeff Ops Triage
        </span>
        <div className="mt-4 grid gap-4 lg:grid-cols-[1.15fr_0.85fr] lg:items-start">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Latest call, open actions, and proof.
            </h1>
            <div className={`mt-4 rounded-2xl border p-4 ${callTone(latestReviewConversation?.callType, latestReviewConversation?.needsReview)}`}>
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] opacity-75">
                    Latest Jeff call
                  </p>
                  <p className="mt-1 text-lg font-semibold text-foreground">
                    {latestReviewConversation?.subjectLabel || latestReviewConversation?.jobLabel || "No recent call needing attention"}
                  </p>
                  <p className="mt-1 text-sm opacity-90">{latestCallSummaryText}</p>
                </div>
                <span className="w-fit rounded-full border border-white/15 bg-black/20 px-2.5 py-1 text-[11px]">
                  {reviewPriorityLabel(latestReviewConversation)}
                </span>
              </div>
              <div className="mt-3 rounded-xl border border-white/10 bg-black/15 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] opacity-70">Next human move</p>
                <p className="mt-1 text-sm opacity-95">{primaryNextAction}</p>
              </div>
              {latestReviewConversation ? (
                <p className="mt-3 text-xs opacity-70">
                  {callTypeLabel(latestReviewConversation.callType)} / {timeLabel(latestReviewConversation.endedAt)}
                </p>
              ) : null}
              <div className="mt-3 flex flex-wrap gap-2">
                <SectionJumpButton
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-white/15 bg-black/20 px-3 text-sm font-medium text-foreground transition-colors hover:bg-black/30"
                  targetId="jeff-call-workspace"
                >
                  <FileText className="h-4 w-4" />
                  Open workspace
                </SectionJumpButton>
                {latestReviewConversation ? (
                  <>
                    <form action={sendRecapAction}>
                      <input name="conversationId" type="hidden" value={latestReviewConversation.id} />
                      <input name="mode" type="hidden" value="draft" />
                      <button
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-sky-500/20 bg-sky-500/10 px-3 text-sm font-medium text-sky-100 transition-colors hover:bg-sky-500/20"
                        type="submit"
                      >
                        <FileText className="h-4 w-4" />
                        Draft recap
                      </button>
                    </form>
                    <form action={sendRecapAction}>
                      <input name="conversationId" type="hidden" value={latestReviewConversation.id} />
                      <input name="mode" type="hidden" value="send" />
                      <button
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 text-sm font-medium text-emerald-100 transition-colors hover:bg-emerald-500/20"
                        type="submit"
                      >
                        <Mail className="h-4 w-4" />
                        Send recap
                      </button>
                    </form>
                  </>
                ) : null}
                {latestReviewConversation ? (
                  <form action={markConversationReviewedAction}>
                    <input name="conversationId" type="hidden" value={latestReviewConversation.id} />
                    <button
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-white/15 bg-black/20 px-3 text-sm font-medium text-foreground transition-colors hover:bg-black/30"
                      type="submit"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Mark reviewed
                    </button>
                  </form>
                ) : null}
              </div>
              {latestReviewConversation ? (
                <details className="mt-3 rounded-xl border border-white/10 bg-black/15 p-3">
                  <summary className="cursor-pointer text-xs font-semibold uppercase tracking-[0.14em] opacity-80">
                    Show proof here
                  </summary>
                  {latestReviewConversation.recordingUrl ? (
                    <a
                      className="mt-3 inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-white/15 bg-black/20 px-3 text-xs font-medium transition-colors hover:bg-black/30"
                      href={latestReviewConversation.recordingUrl}
                      rel="noreferrer"
                      target="_blank"
                    >
                      <Activity className="h-3.5 w-3.5" />
                      Open recording
                    </a>
                  ) : null}
                  {latestReviewConversation.transcript ? (
                    <pre className="mt-3 max-h-56 overflow-auto whitespace-pre-wrap rounded-lg border border-white/10 bg-black/20 p-3 text-xs leading-relaxed opacity-90">
                      {latestReviewConversation.transcript}
                    </pre>
                  ) : (
                    <p className="mt-3 text-sm opacity-80">No transcript was captured for this call.</p>
                  )}
                </details>
              ) : null}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-background/60 p-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <AlertTriangle className="h-4 w-4 text-amber-300" />
              Human Action Queue
            </div>
            <div className="mt-3 space-y-2">
              {triageItems.length > 0 ? triageItems.slice(0, 4).map((item) => (
                <article key={item.id} className={`rounded-xl border p-2.5 ${triageTone(item.tone)}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] opacity-70">{item.label}</p>
                      <p className="mt-1 text-sm font-semibold">{item.title}</p>
                    </div>
                    <span className="shrink-0 rounded-full border border-white/15 bg-black/15 px-2 py-0.5 text-[10px] opacity-80">
                      {item.meta}
                    </span>
                  </div>
                  <p className="mt-1 text-sm opacity-90">{preferOperatorText(item.body, "Review this item.")}</p>
                  <SectionJumpButton
                    className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold opacity-85 transition-opacity hover:opacity-100"
                    targetId={item.target}
                  >
                    Open
                    <ArrowRight className="h-3.5 w-3.5" />
                  </SectionJumpButton>
                </article>
              )) : (
                <p className="rounded-xl border border-dashed border-border bg-card/40 p-3 text-sm text-muted-foreground">
                  No open Jeff action is waiting on an operator.
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-4">
          <div className="rounded-2xl border border-border bg-background/60 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Needs review</p>
            <p className="mt-2 text-2xl font-bold text-foreground">{realReviewConversations.length}</p>
          </div>
          <div className="rounded-2xl border border-border bg-background/60 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Open follow-ups</p>
            <p className="mt-2 text-2xl font-bold text-foreground">{openFollowUps.length}</p>
          </div>
          <div className="rounded-2xl border border-border bg-background/60 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Blocked asks</p>
            <p className="mt-2 text-2xl font-bold text-foreground">{blockedRequestQueue.requests.length}</p>
          </div>
          <div className="rounded-2xl border border-border bg-background/60 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Photos</p>
            <p className="mt-2 text-2xl font-bold text-foreground">
              {fieldFiles.reduce((count, file) => count + file.fieldPhotos.length, 0)}
            </p>
          </div>
        </div>
        {uniqueWarnings.length > 0 ? (
          <div className="mt-6 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-100">
            {uniqueWarnings.map((warning) => (
              <p key={warning}>{warning}</p>
            ))}
          </div>
        ) : null}
      </section>

      {notice ? (
        <div className={`mt-6 rounded-2xl border p-4 text-sm ${
          notice.success
            ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-100"
            : "border-amber-500/20 bg-amber-500/10 text-amber-100"
        }`}>
          {notice.message}
        </div>
      ) : null}

      <details id="jeff-capabilities" className="mt-6 scroll-mt-6 rounded-3xl border border-border bg-card/50 p-6">
        <summary className="cursor-pointer list-none">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Activity className="h-4 w-4 text-primary" />
                System readiness and blocked capability log
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                Open this when Jeff could not do something, or when production wiring needs verification.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-[11px]">
              <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-emerald-200">
                ready: {capabilityReport.counts.ready}
              </span>
              <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-amber-200">
                partial: {capabilityReport.counts.partial}
              </span>
              <span className="rounded-full border border-red-500/20 bg-red-500/10 px-2.5 py-1 text-red-200">
                blocked: {capabilityReport.counts.blocked}
              </span>
            </div>
          </div>
        </summary>
        <div className="mt-5 grid gap-3 lg:grid-cols-2">
          {capabilityItems.map((capability) => (
            <article key={capability.id} className={`rounded-2xl border p-4 ${capabilityTone(capability.state)}`}>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm font-semibold">{capability.label}</p>
                  <p className="mt-1 text-[11px] uppercase tracking-[0.16em] opacity-70">
                    {capability.area} / {capability.state}
                  </p>
                </div>
                <span className="w-fit rounded-full border border-white/15 bg-black/15 px-2.5 py-1 text-[11px]">
                  {capability.available ? "works now" : capability.state === "partial" ? "manual step" : "blocked"}
                </span>
              </div>
              <p className="mt-3 text-sm opacity-90">{capability.reason}</p>
              <p className="mt-2 text-xs opacity-80">Jeff says: {capability.whatJeffShouldSay}</p>
              {capability.operatorAction ? (
                <p className="mt-2 text-xs opacity-80">Next unlock: {capability.operatorAction}</p>
              ) : null}
            </article>
          ))}
        </div>
        <div className="mt-5 rounded-2xl border border-border bg-background/60 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <AlertTriangle className="h-4 w-4 text-amber-300" />
            Recent Blocked Requests
          </div>
          <div className="mt-3 space-y-2">
            {blockedRequestQueue.requests.length > 0 ? blockedRequestQueue.requests.map((request) => (
              <article key={request.id} className="rounded-xl border border-border bg-card/50 p-3">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                  <p className="text-sm font-medium text-foreground">{blockedRequestSummary(request)}</p>
                  <span className="shrink-0 rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-[11px] text-amber-200">
                    {blockedRequestLabel(request.type)}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {request.jobId} / {new Date(request.timestamp).toLocaleString()}
                </p>
              </article>
            )) : (
              <p className="text-sm text-muted-foreground">No blocked capability requests have been logged yet.</p>
            )}
          </div>
        </div>
      </details>

      <section id="jeff-email" className="mt-6 scroll-mt-6 rounded-3xl border border-border bg-card/50 p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Mail className="h-4 w-4 text-primary" />
              Jeff Email
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Sending and receiving are separate systems. This panel shows what is actually wired.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-[11px]">
            <span className={`rounded-full border px-2.5 py-1 ${emailStatus.outbound.ready ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300" : "border-amber-500/20 bg-amber-500/10 text-amber-300"}`}>
              send: {emailStatus.outbound.ready ? "ready" : "not ready"}
            </span>
            <span className={`rounded-full border px-2.5 py-1 ${emailStatus.inbound.ready ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300" : "border-amber-500/20 bg-amber-500/10 text-amber-300"}`}>
              receive: {emailStatus.inbound.ready ? "endpoint ready" : "not connected"}
            </span>
          </div>
        </div>
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          <div className="rounded-2xl border border-border bg-background/60 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Outbound identity</p>
            <p className="mt-2 text-sm font-semibold text-foreground">{emailStatus.outbound.from}</p>
            <p className="mt-2 text-sm text-muted-foreground">Provider: {emailStatus.outbound.provider}</p>
            {emailStatus.outbound.primaryRecipient ? (
              <p className="mt-2 text-sm text-muted-foreground">To: {emailStatus.outbound.primaryRecipient}</p>
            ) : null}
            {emailStatus.outbound.cc.length > 0 ? (
              <p className="mt-1 text-sm text-muted-foreground">Cc: {emailStatus.outbound.cc.join(", ")}</p>
            ) : null}
            <p className="mt-2 text-sm text-muted-foreground">{emailStatus.outbound.note}</p>
          </div>
          <div className="rounded-2xl border border-border bg-background/60 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Inbound mailbox</p>
            <p className="mt-2 text-sm font-semibold text-foreground">{emailStatus.inbound.address}</p>
            <p className="mt-2 text-sm text-muted-foreground">Provider: {emailStatus.inbound.provider}</p>
            <p className="mt-2 break-all font-mono text-[11px] text-muted-foreground">{emailStatus.inbound.endpoint}</p>
            <p className="mt-2 text-sm text-muted-foreground">{emailStatus.inbound.note}</p>
            <form action={syncGmailAction} className="mt-4">
              <button
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-primary/25 bg-primary/10 px-3 text-sm font-medium text-primary transition-colors hover:bg-primary/15"
                type="submit"
              >
                <Mail className="h-4 w-4" />
                Check Gmail
              </button>
            </form>
          </div>
        </div>
      </section>

      <section id="jeff-google-workspace" className="mt-6 scroll-mt-6 rounded-3xl border border-border bg-card/50 p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <CalendarDays className="h-4 w-4 text-primary" />
              Jeff Google Workspace
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Gmail, Calendar, and Drive are the office backbone. Each item stays separate so one bad credential does not hide the rest.
            </p>
          </div>
          <span className={`w-fit rounded-full border px-2.5 py-1 text-[11px] ${googleWorkspaceStatus.auth.ready ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300" : "border-amber-500/20 bg-amber-500/10 text-amber-300"}`}>
            auth: {googleWorkspaceStatus.auth.mode}
          </span>
        </div>
        <div className="mt-4 grid gap-3 lg:grid-cols-3">
          <div className="rounded-2xl border border-border bg-background/60 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Mail className="h-4 w-4 text-primary" />
              Gmail
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{googleWorkspaceStatus.gmail.user}</p>
            <p className={`mt-2 text-xs ${googleWorkspaceStatus.gmail.ready ? "text-emerald-300" : "text-amber-300"}`}>
              {googleWorkspaceStatus.gmail.ready ? "read/send ready" : "not connected"}
            </p>
            {googleWorkspaceStatus.gmail.missing.length > 0 ? (
              <p className="mt-2 text-xs text-muted-foreground">{googleWorkspaceStatus.gmail.missing.join(", ")}</p>
            ) : null}
            <form action={syncGmailAction} className="mt-4">
              <button
                className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-border bg-secondary/60 px-3 text-xs font-medium text-foreground transition-colors hover:bg-secondary"
                type="submit"
              >
                <Mail className="h-3.5 w-3.5" />
                Sync inbox
              </button>
            </form>
          </div>
          <div className="rounded-2xl border border-border bg-background/60 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <CalendarDays className="h-4 w-4 text-primary" />
              Calendar
            </div>
            <p className="mt-2 break-all text-sm text-muted-foreground">{googleWorkspaceStatus.calendar.id}</p>
            <p className={`mt-2 text-xs ${googleWorkspaceStatus.calendar.ready ? "text-emerald-300" : "text-amber-300"}`}>
              {googleWorkspaceStatus.calendar.ready ? "read ready" : "not connected"}
            </p>
            {googleWorkspaceStatus.calendar.canWrite ? (
              <p className="mt-2 text-xs text-emerald-300">calendar writes enabled</p>
            ) : null}
            <form action={syncCalendarAction} className="mt-4">
              <button
                className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-border bg-secondary/60 px-3 text-xs font-medium text-foreground transition-colors hover:bg-secondary"
                type="submit"
              >
                <CalendarDays className="h-3.5 w-3.5" />
                Mirror CRM
              </button>
            </form>
          </div>
          <div className="rounded-2xl border border-border bg-background/60 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <FolderOpen className="h-4 w-4 text-primary" />
              Drive
            </div>
            <p className="mt-2 break-all text-sm text-muted-foreground">{googleWorkspaceStatus.drive.folderId}</p>
            <p className={`mt-2 text-xs ${googleWorkspaceStatus.drive.ready ? "text-emerald-300" : "text-amber-300"}`}>
              {googleWorkspaceStatus.drive.ready ? "upload ready" : "not connected"}
            </p>
          </div>
        </div>
        <div className="mt-3 rounded-2xl border border-border bg-background/60 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <MapPin className="h-4 w-4 text-primary" />
            Maps and Simon Location
          </div>
          <p className={`mt-2 text-xs ${googleMapsStatus.ready ? "text-emerald-300" : "text-amber-300"}`}>
            Maps: {googleMapsStatus.ready ? "routes/places ready" : `not connected (${googleMapsStatus.missing.join(", ")})`}
          </p>
          {simonLocation.location ? (
            <p className={`mt-2 text-sm ${simonLocation.location.stale ? "text-amber-300" : "text-muted-foreground"}`}>
              Last seen {simonLocation.location.ageMinutes} minute{simonLocation.location.ageMinutes === 1 ? "" : "s"} ago
              {simonLocation.location.jobLabel ? ` / ${simonLocation.location.jobLabel}` : ""}
              {simonLocation.location.stale ? " / stale" : " / fresh"}
            </p>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">No Simon location check-in yet.</p>
          )}
        </div>
      </section>

      <details className="mt-6 rounded-3xl border border-border bg-card/50 p-6">
        <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-semibold text-foreground">
          <Database className="h-4 w-4 text-primary" />
          Developer Diagnostics
        </summary>
        <p className="mt-2 text-sm text-muted-foreground">
          Local mirror files are development backups. The Jeff workspace section is the operator-facing call view.
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {localMirror.files.map((file) => (
            <div key={file.path} className="rounded-2xl border border-border bg-background/60 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-foreground">{file.label}</p>
                <span className={`rounded-full border px-2.5 py-1 text-[11px] ${storageTone(file.exists ? "local-file" : "not-configured")}`}>
                  {file.exists ? "present" : "missing"}
                </span>
              </div>
              <p className="mt-2 font-mono text-[11px] text-muted-foreground">{file.path}</p>
              {file.updatedAt ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  Updated {new Date(file.updatedAt).toLocaleString()}
                </p>
              ) : null}
            </div>
          ))}
        </div>
      </details>

      <section id="jeff-call-workspace" className="mt-6 scroll-mt-6 rounded-3xl border border-border bg-card/50 p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Bot className="h-4 w-4 text-primary" />
              Jeff Call Workspace
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              End-of-call transcripts compact into job, personal, and admin summaries. Evaluation calls stay out of the operator queue.
            </p>
          </div>
          <span className={`w-fit rounded-full border px-2.5 py-1 text-[11px] ${storageTone(workspaceQueue.storageStatus)}`}>
            {workspaceQueue.storageStatus}
          </span>
        </div>

        {latestReviewConversation ? (
          <article className={`mt-5 rounded-2xl border p-4 ${callTone(latestReviewConversation.callType, latestReviewConversation.needsReview)}`}>
            {(() => {
              const Icon = callTypeIcon(latestReviewConversation.callType);
              return (
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-black/20">
                      <Icon className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold">
                        Latest: {callTypeLabel(latestReviewConversation.callType)}
                      </p>
                      <p className="mt-1 text-base font-semibold text-foreground">
                        {latestReviewConversation.subjectLabel || latestReviewConversation.jobLabel || "Needs label"}
                      </p>
                      <p className="mt-1 text-xs opacity-80">
                        {latestReviewConversation.reviewReason || "Review the call summary and requested actions."}
                      </p>
                    </div>
                  </div>
                  <p className="text-[11px] opacity-70">
                    {new Date(latestReviewConversation.endedAt).toLocaleString()}
                  </p>
                </div>
              );
            })()}
            {latestReviewSummary ? (
              <div className="mt-4 space-y-3">
                <p className="text-sm opacity-90">
                  {preferOperatorText(latestReviewSummary.recommendationSummary || latestReviewSummary.summary)}
                </p>
                {latestReviewSummary.nextActions.length > 0 ? (
                  <div className="space-y-1 text-sm opacity-90">
                    {latestReviewSummary.nextActions.slice(0, 3).map((action) => (
                      <p key={action}>Next: {preferOperatorText(action, "Review this action.")}</p>
                    ))}
                  </div>
                ) : null}
                {latestReviewSummary.emailRequested || latestReviewSummary.requestedFollowUps.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-black/20 px-2.5 py-1 text-[11px]">
                      <Mail className="h-3.5 w-3.5" />
                      {followUpLabel(latestReviewSummary.emailStatus)}
                    </span>
                    {latestReviewSummary.emailTo ? (
                      <span className="rounded-full border border-white/15 bg-black/20 px-2.5 py-1 text-[11px]">
                        {latestReviewSummary.emailTo}
                      </span>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ) : null}
            <div className="mt-4 flex flex-wrap gap-2">
              {latestReviewConversation.recordingUrl ? (
                <a
                  className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-white/15 bg-black/20 px-3 text-xs font-medium transition-colors hover:bg-black/30"
                  href={latestReviewConversation.recordingUrl}
                  rel="noreferrer"
                  target="_blank"
                >
                  <Activity className="h-3.5 w-3.5" />
                  Open recording
                </a>
              ) : null}
              {latestFollowUpNeedsAction ? (
                <form action={sendRecapAction}>
                  <input name="conversationId" type="hidden" value={latestReviewConversation.id} />
                  <input name="mode" type="hidden" value="send" />
                  <button
                    className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 text-xs font-medium text-emerald-100 transition-colors hover:bg-emerald-500/20"
                    type="submit"
                  >
                    <Mail className="h-3.5 w-3.5" />
                    Send recap
                  </button>
                </form>
              ) : null}
              {latestReviewNeedsAction ? (
                <form action={markConversationReviewedAction}>
                  <input name="conversationId" type="hidden" value={latestReviewConversation.id} />
                  <button
                    className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-white/15 bg-black/20 px-3 text-xs font-medium transition-colors hover:bg-black/30"
                    type="submit"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Mark reviewed
                  </button>
                </form>
              ) : null}
            </div>
            <details className="mt-4 rounded-xl border border-white/10 bg-black/15 p-3">
              <summary className="cursor-pointer text-xs font-semibold uppercase tracking-[0.14em] opacity-80">
                Show transcript and source proof
              </summary>
              {latestReviewConversation.transcript ? (
                <pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap rounded-lg border border-white/10 bg-black/20 p-3 text-xs leading-relaxed opacity-90">
                  {latestReviewConversation.transcript}
                </pre>
              ) : (
                <p className="mt-3 text-sm opacity-80">No transcript was captured for this call.</p>
              )}
              {latestReviewConversation.rawSummary ? (
                <p className="mt-3 text-xs opacity-80">Vapi summary: {preferOperatorText(latestReviewConversation.rawSummary)}</p>
              ) : null}
              <p className="mt-3 text-[11px] opacity-70">
                Conversation id: {latestReviewConversation.id}
                {latestReviewConversation.callId ? ` / Call id: ${latestReviewConversation.callId}` : ""}
              </p>
            </details>
          </article>
        ) : null}

        <div className="mt-5 space-y-3">
          {earlierReviewConversations.length > 0 ? earlierReviewConversations.slice(0, 5).map((conversation) => {
            const summary = summaryByConversation.get(conversation.id);
            const Icon = callTypeIcon(conversation.callType);
            return (
              <article key={conversation.id} className={`rounded-2xl border p-4 ${callTone(conversation.callType, conversation.needsReview)}`}>
                <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-black/20">
                      <Icon className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold">
                        {callTypeLabel(conversation.callType)} / {conversation.subjectLabel || conversation.jobLabel || "Needs label"}
                      </p>
                      <p className="mt-1 text-xs opacity-80">
                        {conversation.reviewReason || "Review needed before this call becomes job truth."}
                      </p>
                    </div>
                  </div>
                  <p className="text-[11px] opacity-70">
                    {new Date(conversation.endedAt).toLocaleString()}
                  </p>
                </div>
                {summary ? (
                  <>
                    <p className="mt-3 text-sm opacity-90">{preferOperatorText(summary.recommendationSummary || summary.summary)}</p>
                    {summary.requestedFollowUps.length > 0 || summary.emailRequested ? (
                      <p className="mt-2 text-xs opacity-80">
                        Follow-up: {preferOperatorText(summary.requestedFollowUps[0], "Email requested")} ({followUpLabel(summary.emailStatus)})
                      </p>
                    ) : null}
                  </>
                ) : null}
                {conversation.transcript || conversation.recordingUrl ? (
                  <details className="mt-3 rounded-xl border border-white/10 bg-black/15 p-3">
                    <summary className="cursor-pointer text-xs font-semibold uppercase tracking-[0.14em] opacity-80">
                      Show proof
                    </summary>
                    {conversation.recordingUrl ? (
                      <a
                        className="mt-3 inline-flex h-8 items-center justify-center gap-2 rounded-lg border border-white/15 bg-black/20 px-2.5 text-xs font-medium transition-colors hover:bg-black/30"
                        href={conversation.recordingUrl}
                        rel="noreferrer"
                        target="_blank"
                      >
                        <Activity className="h-3.5 w-3.5" />
                        Open recording
                      </a>
                    ) : null}
                    {conversation.transcript ? (
                      <pre className="mt-3 max-h-56 overflow-auto whitespace-pre-wrap rounded-lg border border-white/10 bg-black/20 p-3 text-xs leading-relaxed opacity-90">
                        {conversation.transcript}
                      </pre>
                    ) : null}
                  </details>
                ) : null}
              </article>
            );
          }) : (
            <div className="rounded-2xl border border-dashed border-border bg-background/40 p-4 text-sm text-muted-foreground">
              No earlier Jeff calls need review.
            </div>
          )}
        </div>
      </section>

      <section id="jeff-durable-memory" className="mt-6 scroll-mt-6 rounded-3xl border border-border bg-card/50 p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Database className="h-4 w-4 text-primary" />
              Jeff Durable Memory
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Candidates stay out of calls until approved. Approved rows are pulled into Jeff&apos;s field context.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-[11px]">
            <span className={`rounded-full border px-2.5 py-1 ${storageTone(memoryQueue.storageStatus)}`}>
              {memoryQueue.storageStatus}
            </span>
            <span className="rounded-full border border-border bg-background/60 px-2.5 py-1 text-muted-foreground">
              approved: {approvedMemories}
            </span>
          </div>
        </div>

        <div className="mt-5 grid gap-3 lg:grid-cols-2">
          {memoryQueue.memories.length > 0 ? memoryQueue.memories.map((memory) => (
            <article key={memory.id} className="rounded-2xl border border-border bg-background/60 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-foreground">{memory.subjectLabel}</p>
                  <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-primary">
                    {memory.category} / {memory.status} / {memory.sensitivity}
                  </p>
                </div>
                <div className="flex gap-2">
                  {memory.status === "candidate" ? (
                    <>
                      <form action={updateMemoryStatusAction}>
                        <input name="id" type="hidden" value={memory.id} />
                        <input name="status" type="hidden" value="approved" />
                        <button className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-emerald-500/20 bg-emerald-500/10 text-emerald-200 transition-colors hover:bg-emerald-500/20" title="Approve memory" type="submit">
                          <CheckCircle2 className="h-4 w-4" />
                        </button>
                      </form>
                      <form action={updateMemoryStatusAction}>
                        <input name="id" type="hidden" value={memory.id} />
                        <input name="status" type="hidden" value="rejected" />
                        <button className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-red-500/20 bg-red-500/10 text-red-200 transition-colors hover:bg-red-500/20" title="Reject memory" type="submit">
                          <XCircle className="h-4 w-4" />
                        </button>
                      </form>
                    </>
                  ) : (
                    <form action={updateMemoryStatusAction}>
                      <input name="id" type="hidden" value={memory.id} />
                      <input name="status" type="hidden" value="archived" />
                      <button className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-secondary/60 text-muted-foreground transition-colors hover:text-foreground" title="Archive memory" type="submit">
                        <Archive className="h-4 w-4" />
                      </button>
                    </form>
                  )}
                </div>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">{memory.memory}</p>
              {memory.evidence ? (
                <p className="mt-3 text-xs text-muted-foreground">Evidence: {memory.evidence}</p>
              ) : null}
              <p className="mt-3 text-[11px] text-muted-foreground">
                {memory.subjectType}:{memory.subjectKey} / {new Date(memory.updatedAt).toLocaleString()}
              </p>
            </article>
          )) : (
            <div className="rounded-2xl border border-dashed border-border bg-background/40 p-4 text-sm text-muted-foreground">
              No durable memory candidates yet.
            </div>
          )}
        </div>
      </section>

      <section className="mt-6 space-y-4">
        {fieldFiles.length > 0 ? fieldFiles.map((file) => (
          <article key={file.job.id} className="rounded-3xl border border-border bg-card/50 p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <FileText className="h-4 w-4 text-primary" />
                  <Link href={`/ops/promises/${file.job.id}`} className="transition-colors hover:text-primary">
                    {file.job.customer.name}
                  </Link>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {formatVehicle(file)} / {file.job.serviceScope} / {file.job.owner} / {file.job.jobStage}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className={`rounded-full border px-2.5 py-1 text-[11px] ${storageTone(file.storage.promiseNotes)}`}>
                  notes: {file.storage.promiseNotes}
                </span>
                <span className={`rounded-full border px-2.5 py-1 text-[11px] ${storageTone(file.storage.fieldEvents)}`}>
                  events: {file.storage.fieldEvents}
                </span>
                <span className="rounded-full border border-border bg-background/60 px-2.5 py-1 text-[11px] text-muted-foreground">
                  photos: {file.storage.photos}
                </span>
                <span className={`rounded-full border px-2.5 py-1 text-[11px] ${storageTone(file.storage.media)}`}>
                  media: {file.storage.media}
                </span>
              </div>
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-3">
              <div className="rounded-2xl border border-border bg-background/60 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Workspace Summary</p>
                {file.workspaceSnapshot ? (
                  <>
                    <p className="mt-3 text-sm text-muted-foreground">{file.workspaceSnapshot.snapshotSummary}</p>
                    <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                      {file.workspaceSnapshot.nextActions.slice(0, 3).map((action) => (
                        <p key={action}>Next: {preferOperatorText(action, "Review this action.")}</p>
                      ))}
                      {file.workspaceSnapshot.openBlockers.slice(0, 2).map((blocker) => (
                        <p key={blocker} className="text-red-200">Blocker: {preferOperatorText(blocker, "Review this blocker.")}</p>
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="mt-3 text-sm text-muted-foreground">No compacted Jeff call summary is attached yet.</p>
                )}
              </div>

              <div className="rounded-2xl border border-border bg-background/60 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Current Context</p>
                <p className="mt-3 text-sm text-muted-foreground">{file.context.latestConcern}</p>
                <p className="mt-3 text-sm text-muted-foreground">{file.context.safeNextActions[0]}</p>
                {file.context.conflicts.length > 0 ? (
                  <p className="mt-3 text-sm text-red-200">{file.context.conflicts[0]}</p>
                ) : null}
              </div>

              <div className="rounded-2xl border border-border bg-background/60 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Latest Jeff Events</p>
                <div className="mt-3 space-y-3">
                  {file.fieldEvents.slice(0, 4).map((event) => (
                    <div key={event.id} className="text-sm text-muted-foreground">
                      <p className="font-medium text-foreground">{event.type}</p>
                      <p>{event.summary}</p>
                    </div>
                  ))}
                  {file.fieldEvents.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No Jeff events saved yet.</p>
                  ) : null}
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-background/60 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Media & Uploads</p>
                <div className="mt-3 space-y-3">
                  {file.media.slice(0, 4).map((item) => (
                    <div key={item.id} className="text-sm text-muted-foreground">
                      <p className="font-medium text-foreground">{item.fileName}</p>
                      <p>
                        {item.storageProvider} / {item.reviewStatus}
                        {item.label ? ` / ${item.label}` : ""}
                      </p>
                      {item.driveWebViewLink ? (
                        <a className="mt-1 inline-block text-xs text-primary hover:text-primary/80" href={item.driveWebViewLink}>
                          Open Drive file
                        </a>
                      ) : null}
                    </div>
                  ))}
                  {file.media.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No uploaded media is indexed yet.</p>
                  ) : null}
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-background/60 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Call Compactions</p>
                <div className="mt-3 space-y-3">
                  {file.conversationSummaries.slice(0, 3).map((summary) => (
                    <div key={summary.id} className="text-sm text-muted-foreground">
                      <p>{preferOperatorText(summary.summary)}</p>
                      {summary.nextActions[0] ? (
                        <p className="mt-1 text-xs text-muted-foreground">Next: {preferOperatorText(summary.nextActions[0], "Review this action.")}</p>
                      ) : null}
                    </div>
                  ))}
                  {file.conversationSummaries.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No compacted calls yet.</p>
                  ) : null}
                </div>
              </div>
            </div>
          </article>
        )) : (
          <div className="rounded-3xl border border-dashed border-border bg-card/40 p-6 text-sm text-muted-foreground">
            No Jeff field files are available.
          </div>
        )}
      </section>
    </div>
  );
}
