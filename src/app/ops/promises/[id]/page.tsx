import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  CalendarClock,
  CircleAlert,
  DollarSign,
  History,
  MapPin,
  MessageSquareShare,
  Phone,
  Quote,
  UserRound,
  Wrench,
} from "lucide-react";
import { OutboundResultForm } from "@/components/outbound-result-form";
import { PromiseStatusForm } from "@/components/promise-status-form";
import { getNextProbableVisit } from "@/lib/promise-crm/closeout-recapture";
import { computePromiseEconomics } from "@/lib/promise-crm/economics";
import { getPromiseOutboundSnapshot } from "@/lib/promise-crm/outbound-drafts";
import { getPlaybookRecommendation } from "@/lib/promise-crm/playbooks";
import { getPromiseRecord } from "@/lib/promise-crm/server";
import type {
  CommercialOutcomeStatus,
  FollowThroughResolutionAction,
  MaintenanceReminderStatus,
  ReviewRequestStatus,
} from "@/lib/promise-crm/types";

type PromiseDetailPageProps = {
  params: Promise<{ id: string }>;
};

type PromiseDetailRecord = Awaited<ReturnType<typeof getPromiseRecord>>;

function formatVehicle(record: NonNullable<PromiseDetailRecord>) {
  return `${record.vehicle.year} ${record.vehicle.make} ${record.vehicle.model}`;
}

function formatCurrency(value?: number) {
  if (value === undefined) return "Not captured";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

function outcomeLabel(value?: CommercialOutcomeStatus) {
  if (value === "approved-repair") return "Approved repair";
  if (value === "completed-maintenance") return "Completed maintenance";
  if (value === "diagnostic-only") return "Diagnostic only";
  if (value === "deferred-work") return "Deferred work";
  if (value === "declined") return "Declined";
  return "Unknown";
}

function followThroughResolutionLabel(value?: FollowThroughResolutionAction) {
  if (value === "scheduled-next-step") return "Scheduled next step";
  if (value === "recap-sent") return "Recap sent";
  if (value === "parked") return "Parked";
  if (value === "resolved-other") return "Resolved";
  return "Not resolved";
}

function reviewRequestLabel(value?: ReviewRequestStatus) {
  if (value === "ready") return "Ready to send";
  if (value === "sent") return "Sent";
  if (value === "completed") return "Completed";
  return "Not ready";
}

function maintenanceReminderLabel(value?: MaintenanceReminderStatus) {
  if (value === "seeded") return "Seeded";
  if (value === "scheduled") return "Scheduled";
  return "Not seeded";
}

function jobStageLabel(value?: string) {
  if (value === "triage-needed") return "Triage needed";
  if (value === "quoted") return "Quoted";
  if (value === "scheduled") return "Scheduled";
  if (value === "confirmed") return "Confirmed";
  if (value === "en-route") return "En route";
  if (value === "on-site") return "On site";
  if (value === "waiting-approval") return "Waiting approval";
  if (value === "completed") return "Completed";
  if (value === "collected") return "Collected";
  if (value === "warranty-issue") return "Warranty issue";
  return "Not staged";
}

function paymentStatusLabel(value?: string) {
  if (value === "deposit-requested") return "Deposit requested";
  if (value === "awaiting-payment") return "Awaiting payment";
  if (value === "partial") return "Partial";
  if (value === "paid") return "Paid";
  if (value === "written-off") return "Written off";
  return "Not requested";
}

function warrantyStatusLabel(value?: string) {
  if (value === "monitoring") return "Monitoring";
  if (value === "open") return "Open";
  if (value === "resolved") return "Resolved";
  return "None";
}

function recurringStatusLabel(value?: string) {
  if (value === "lead") return "Lead";
  if (value === "pitched") return "Pitched";
  if (value === "trial-active") return "Trial active";
  if (value === "active") return "Active";
  if (value === "at-risk") return "At risk";
  return "Not account work";
}

function followThroughReasonLabel(value?: string) {
  if (value === "approved-next-step") return "Approved next step";
  if (value === "deferred-work") return "Deferred work";
  if (value === "diagnostic-recap") return "Diagnostic recap";
  if (value === "review-request") return "Review request";
  if (value === "maintenance-reminder") return "Maintenance reminder";
  if (value === "open-follow-through") return "Open follow-through";
  return "General";
}

function customerApprovalLabel(
  value: NonNullable<PromiseDetailRecord>["customerApproval"]["status"],
) {
  if (value === "awaiting-approval") return "Awaiting approval";
  if (value === "approved") return "Approved";
  if (value === "declined") return "Declined";
  return "Not needed";
}

export const metadata: Metadata = {
  title: "Promise Detail",
  robots: {
    index: false,
    follow: false,
  },
};

export const dynamic = "force-dynamic";

export default async function PromiseDetailPage({ params }: PromiseDetailPageProps) {
  const { id } = await params;
  const promise = await getPromiseRecord(id);

  if (!promise) {
    notFound();
  }

  const economics = computePromiseEconomics(promise.economics);
  const nextProbableVisit = getNextProbableVisit(promise);
  const outbound = getPromiseOutboundSnapshot(promise);
  const playbook = getPlaybookRecommendation(
    `${promise.serviceScope} ${promise.commercialOutcome?.convertedService || ""} ${promise.nextAction}`,
  );

  return (
    <div className="shell py-10 sm:py-14">
      <Link
        href="/ops/promises"
        className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Promise Board
      </Link>

      <section className="mt-6 overflow-hidden rounded-[2rem] border border-border bg-card/60 p-6 backdrop-blur-sm sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3.5 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              <Wrench className="h-3.5 w-3.5" />
              Promise Detail
            </span>
            <h1 className="mt-5 text-4xl font-bold tracking-tight text-foreground">
              {promise.customer.name}
            </h1>
            <p className="mt-3 text-lg text-muted-foreground">{promise.serviceScope}</p>
          </div>

          <div className="rounded-2xl border border-border bg-background/60 px-4 py-3 text-sm text-muted-foreground">
            {promise.scheduledWindow.label}
          </div>
        </div>

        <div className="mt-8 grid gap-4 lg:grid-cols-4">
          <div className="rounded-2xl border border-border bg-background/60 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <UserRound className="h-4 w-4 text-primary" />
              Customer
            </div>
            <p className="mt-3 text-sm text-muted-foreground">{promise.customer.name}</p>
            <p className="mt-1 text-sm text-muted-foreground">{promise.customer.phone}</p>
          </div>
          <div className="rounded-2xl border border-border bg-background/60 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Wrench className="h-4 w-4 text-primary" />
              Vehicle
            </div>
            <p className="mt-3 text-sm text-muted-foreground">{formatVehicle(promise)}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {promise.vehicle.mileage?.toLocaleString()} miles
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-background/60 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <MapPin className="h-4 w-4 text-primary" />
              Location
            </div>
            <p className="mt-3 text-sm text-muted-foreground">{promise.location.label}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {promise.location.accessNotes || promise.location.territory}
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-background/60 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <CalendarClock className="h-4 w-4 text-primary" />
              Owner
            </div>
            <p className="mt-3 text-sm text-muted-foreground">{promise.owner}</p>
            <p className="mt-1 text-sm text-muted-foreground">Risk: {promise.readinessRisk}</p>
            <p className="mt-1 text-sm text-muted-foreground">Stage: {jobStageLabel(promise.jobStage)}</p>
          </div>
        </div>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[1.25fr_0.9fr]">
        <div className="space-y-6">
          <div className="rounded-3xl border border-border bg-card/50 p-6">
            <h2 className="text-xl font-bold text-foreground">What was promised</h2>
            <p className="mt-3 text-base leading-relaxed text-muted-foreground">
              {promise.readinessSummary}
            </p>

            <div className="mt-6 rounded-2xl border border-border bg-background/60 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                Immediate next action
              </p>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {promise.nextAction}
              </p>
            </div>

            <div className="mt-4 rounded-2xl border border-border bg-background/60 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                Customer status page
              </p>
              <div className="mt-2 flex flex-col gap-2 text-sm text-muted-foreground">
                <Link
                  href={promise.customerAccess.sharePath}
                  target="_blank"
                  className="font-medium text-primary transition-colors hover:text-primary/80"
                >
                  Open customer view
                </Link>
                <span>{promise.customerAccess.sharePath}</span>
                <span>Approval state: {customerApprovalLabel(promise.customerApproval.status)}</span>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-border bg-card/50 p-6">
            <h2 className="text-xl font-bold text-foreground">Operator notes</h2>
            <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
              {promise.notes.map((note) => (
                <li key={note} className="flex gap-2">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  {note}
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-3xl border border-border bg-card/50 p-6">
            <h2 className="text-xl font-bold text-foreground">Customer approval</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-border bg-background/60 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                  Approval status
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {customerApprovalLabel(promise.customerApproval.status)}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {promise.customerApproval.requestedService || "No approval item recorded"}
                </p>
              </div>

              <div className="rounded-2xl border border-border bg-background/60 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                  Requested amount
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {formatCurrency(promise.customerApproval.requestedAmount)}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {promise.customerApproval.summary || "No customer-facing summary recorded"}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-border bg-card/50 p-6">
            <h2 className="text-xl font-bold text-foreground">Field execution packet</h2>
            {promise.fieldExecution ? (
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-border bg-background/60 p-4 md:col-span-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                    Service goal
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {promise.fieldExecution.serviceGoal || "No service goal recorded"}
                  </p>
                </div>
                {[
                  ["Parts checklist", promise.fieldExecution.partsChecklist],
                  ["Photos required", promise.fieldExecution.photosRequired],
                  ["Inspection checklist", promise.fieldExecution.inspectionChecklist],
                  ["Honest add-on focus", promise.fieldExecution.upsellFocus],
                  ["Closeout steps", promise.fieldExecution.closeoutSteps],
                ].map(([label, items]) => (
                  <div key={label as string} className="rounded-2xl border border-border bg-background/60 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                      {label as string}
                    </p>
                    {Array.isArray(items) && items.length > 0 ? (
                      <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                        {items.map((item) => (
                          <li key={`${label}-${item}`} className="flex gap-2">
                            <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-3 text-sm text-muted-foreground">Not captured.</p>
                    )}
                  </div>
                ))}
                <div className="rounded-2xl border border-border bg-background/60 p-4 md:col-span-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                    Notes template
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {promise.fieldExecution.notesTemplate || "No notes template recorded"}
                  </p>
                </div>
              </div>
            ) : (
              <p className="mt-4 text-sm text-muted-foreground">
                No field packet captured yet.
              </p>
            )}
          </div>

          <div className="rounded-3xl border border-border bg-card/50 p-6">
            <h2 className="text-xl font-bold text-foreground">Collection and warranty truth</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-border bg-background/60 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                  Collection
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {paymentStatusLabel(promise.paymentCollection?.status)}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Method: {promise.paymentCollection?.method || "Not captured"}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Balance due: {formatCurrency(promise.paymentCollection?.balanceDueAmount)}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {promise.paymentCollection?.paymentSummary || "No collection summary recorded"}
                </p>
              </div>

              <div className="rounded-2xl border border-border bg-background/60 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                  Warranty / comeback
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {warrantyStatusLabel(promise.warrantyCase?.status)}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {promise.warrantyCase?.issueSummary || "No warranty issue recorded"}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Callback due: {promise.warrantyCase?.callbackDueAt || "Not scheduled"}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {promise.warrantyCase?.resolutionSummary || "No resolution summary recorded"}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-border bg-card/50 p-6">
            <h2 className="text-xl font-bold text-foreground">Recurring account health</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-border bg-background/60 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                  Account status
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {recurringStatusLabel(promise.recurringAccount?.status)}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {promise.recurringAccount?.accountName || "No account linked"}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {promise.recurringAccount?.primaryContactName || "No primary contact recorded"}
                </p>
              </div>

              <div className="rounded-2xl border border-border bg-background/60 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                  Cadence and terms
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {promise.recurringAccount?.cadenceLabel || "No cadence recorded"}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {promise.recurringAccount?.billingTerms || "No billing terms recorded"}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Vehicle count: {promise.recurringAccount?.vehicleCount ?? "Unknown"}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Monthly value: {formatCurrency(promise.recurringAccount?.monthlyValueEstimate)}
                </p>
              </div>

              <div className="rounded-2xl border border-border bg-background/60 p-4 md:col-span-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                  Next touch
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {promise.recurringAccount?.nextTouchDueAt || "No next touch due"}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {promise.recurringAccount?.nextStep || "No recurring account next step recorded"}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {promise.recurringAccount?.summary || "No recurring account summary recorded"}
                </p>
              </div>
            </div>
            {promise.recurringAccount?.activityHistory &&
            promise.recurringAccount.activityHistory.length > 0 ? (
              <div className="mt-4 rounded-2xl border border-border bg-background/60 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                  Account activity
                </p>
                <div className="mt-3 space-y-3">
                  {promise.recurringAccount.activityHistory.slice(0, 5).map((activity) => (
                    <div
                      key={`${activity.recordedAt}-${activity.summary}`}
                      className="rounded-xl border border-border/70 bg-card/50 p-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-sm font-medium text-foreground">{activity.summary}</p>
                        <span className="text-xs text-muted-foreground">
                          {activity.kind} / {activity.actor}
                        </span>
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground">{activity.recordedAt}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <div className="rounded-3xl border border-border bg-card/50 p-6">
            <h2 className="text-xl font-bold text-foreground">Commercial outcome</h2>
            {promise.commercialOutcome ? (
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-border bg-background/60 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                    Outcome
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {outcomeLabel(promise.commercialOutcome.outcomeStatus)}
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {promise.commercialOutcome.convertedService || "No converted service recorded"}
                  </p>
                </div>

                <div className="rounded-2xl border border-border bg-background/60 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                    Deferred value
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {formatCurrency(promise.commercialOutcome.deferredValueAmount)}
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {promise.commercialOutcome.outcomeSummary || "No outcome summary recorded"}
                  </p>
                </div>
              </div>
            ) : (
              <p className="mt-4 text-sm text-muted-foreground">
                No commercial outcome recorded yet.
              </p>
            )}
          </div>

          <div className="rounded-3xl border border-border bg-card/50 p-6">
            <h2 className="text-xl font-bold text-foreground">Structured closeout</h2>
            {promise.closeout ? (
              <>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <div className="rounded-2xl border border-border bg-background/60 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                      Work performed
                    </p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {promise.closeout.workPerformedSummary || "No work summary recorded"}
                    </p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Completed at: {promise.closeout.completedAt || "Not captured"}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-border bg-background/60 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                      Customer recap
                    </p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {promise.closeout.customerConditionSummary || "No customer recap recorded"}
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid gap-4 xl:grid-cols-3">
                  {[
                    ["Now", promise.closeout.now],
                    ["Soon", promise.closeout.soon],
                    ["Monitor", promise.closeout.monitor],
                  ].map(([label, items]) => (
                    <div
                      key={label as string}
                      className="rounded-2xl border border-border bg-background/60 p-4"
                    >
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                        {label as string}
                      </p>
                      {Array.isArray(items) && items.length > 0 ? (
                        <ul className="mt-3 space-y-3 text-sm text-muted-foreground">
                          {items.map((item) => (
                            <li key={`${label}-${item.title}`} className="flex gap-2">
                              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                              <span>
                                <span className="font-medium text-foreground">{item.title}</span>
                                {item.detail ? ` — ${item.detail}` : ""}
                                {item.estimatedAmount !== undefined
                                  ? ` (${formatCurrency(item.estimatedAmount)})`
                                  : ""}
                              </span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="mt-3 text-sm text-muted-foreground">
                          No {String(label).toLowerCase()} recap recorded.
                        </p>
                      )}
                    </div>
                  ))}
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-3">
                  <div className="rounded-2xl border border-border bg-background/60 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                      Customer recap
                    </p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {promise.closeout.customerRecap?.status || "Not ready"}
                    </p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {promise.closeout.customerRecap?.summary || "No recap send summary recorded"}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-border bg-background/60 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                      Review request
                    </p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {reviewRequestLabel(promise.closeout.reviewRequest?.status)}
                    </p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {promise.closeout.reviewRequest?.summary || "No review trigger recorded"}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-border bg-background/60 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                      Maintenance reminder
                    </p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {maintenanceReminderLabel(promise.closeout.maintenanceReminder?.status)}
                    </p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {promise.closeout.maintenanceReminder?.service || "No reminder seed recorded"}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-border bg-background/60 p-4 md:col-span-2">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                      Next probable visit
                    </p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {nextProbableVisit?.service || "Not captured"}
                    </p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {nextProbableVisit?.reason || "Use closeout to connect this visit to the next one."}
                    </p>
                  </div>
                </div>

                {promise.closeout.proofCapture ? (
                  <div className="mt-4 rounded-2xl border border-border bg-background/60 p-4">
                    <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                      <Quote className="h-4 w-4 text-primary" />
                      Proof capture
                    </div>
                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                          Why they booked
                        </p>
                        <p className="mt-2 text-sm text-muted-foreground">
                          {promise.closeout.proofCapture.bookingReason || "Not captured"}
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                          Promise that mattered most
                        </p>
                        <p className="mt-2 text-sm text-muted-foreground">
                          {promise.closeout.proofCapture.promiseThatMatteredMost || "Not captured"}
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                          Customer relief quote
                        </p>
                        <p className="mt-2 text-sm text-muted-foreground">
                          {promise.closeout.proofCapture.customerReliefQuote || "Not captured"}
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                          Proof notes
                        </p>
                        <p className="mt-2 text-sm text-muted-foreground">
                          {promise.closeout.proofCapture.proofNotes || "Not captured"}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 rounded-2xl border border-border/70 bg-card/50 p-4">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                        Saved assets
                      </p>
                      {promise.closeout.proofCapture.assets.length > 0 ? (
                        <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                          {promise.closeout.proofCapture.assets.map((asset) => (
                            <li key={`${asset.kind}-${asset.label}`} className="flex gap-2">
                              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                              <span>
                                <span className="font-medium text-foreground">{asset.label}</span>
                                {asset.note ? ` - ${asset.note}` : ""}
                                {asset.url ? ` (${asset.url})` : ""}
                              </span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="mt-3 text-sm text-muted-foreground">No proof assets logged yet.</p>
                      )}
                    </div>
                  </div>
                ) : null}
              </>
            ) : (
              <p className="mt-4 text-sm text-muted-foreground">
                No structured closeout recorded yet.
              </p>
            )}
          </div>

          <div className="rounded-3xl border border-border bg-card/50 p-6">
            <h2 className="text-xl font-bold text-foreground">Follow-through resolution</h2>
            {promise.followThroughHistory && promise.followThroughHistory.length > 0 ? (
              <div className="mt-4 space-y-4">
                {promise.followThroughHistory
                  .slice()
                  .reverse()
                  .map((entry) => (
                    <div
                      key={`${entry.resolvedAt}-${entry.action}-${entry.reason || "general"}`}
                      className="rounded-2xl border border-border bg-background/60 p-4"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                            <History className="h-4 w-4 text-primary" />
                            {followThroughResolutionLabel(entry.action)}
                          </div>
                          <p className="mt-2 text-sm text-muted-foreground">
                            {followThroughReasonLabel(entry.reason)} / by {entry.resolvedBy}
                          </p>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {new Intl.DateTimeFormat("en-US", {
                            month: "short",
                            day: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                          }).format(new Date(entry.resolvedAt))}
                        </span>
                      </div>
                      <p className="mt-3 text-sm text-muted-foreground">
                        {entry.summary || "No resolution summary recorded"}
                      </p>
                    </div>
                  ))}
              </div>
            ) : (
              <p className="mt-4 text-sm text-muted-foreground">
                No follow-through resolution recorded yet.
              </p>
            )}
          </div>

          <div className="rounded-3xl border border-border bg-card/50 p-6">
            <h2 className="text-xl font-bold text-foreground">Economics snapshot</h2>
            {economics ? (
              <>
                <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  <div className="rounded-2xl border border-border bg-background/60 p-4">
                    <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                      <DollarSign className="h-4 w-4 text-primary" />
                      Revenue
                    </div>
                    <p className="mt-3 text-sm text-muted-foreground">
                      Quote: {formatCurrency(promise.economics?.quotedAmount)}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Final: {formatCurrency(promise.economics?.finalInvoiceAmount ?? economics.revenue)}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-border bg-background/60 p-4">
                    <div className="text-sm font-semibold text-foreground">Cost stack</div>
                    <p className="mt-3 text-sm text-muted-foreground">
                      Tech: {formatCurrency(economics.techPayout)}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Parts: {formatCurrency(economics.partsCost)}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Support: {formatCurrency(economics.supportCost)}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-border bg-background/60 p-4">
                    <div className="text-sm font-semibold text-foreground">Clock time</div>
                    <p className="mt-3 text-sm text-muted-foreground">
                      Labor: {economics.laborHours.toFixed(2)} hrs
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Travel: {economics.travelHours.toFixed(2)} hrs
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Total: {economics.clockHours.toFixed(2)} hrs
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <div className="rounded-2xl border border-border bg-background/60 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                      Gross profit
                    </p>
                    <p className="mt-2 text-lg font-semibold text-foreground">
                      {formatCurrency(economics.grossProfitAmount)}
                    </p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Revenue less tech payout and parts cost.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-border bg-background/60 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                      Net profit estimate
                    </p>
                    <p className="mt-2 text-lg font-semibold text-foreground">
                      {formatCurrency(economics.netProfitEstimateAmount)}
                    </p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {economics.netProfitPerClockHour !== undefined
                        ? `${formatCurrency(economics.netProfitPerClockHour)} net profit per clock hour`
                        : "Add labor and travel hours to see per-hour economics."}
                    </p>
                  </div>
                </div>

                <div className="mt-4 rounded-2xl border border-border bg-background/60 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                    Reserve assumptions
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Card fee: {economics.cardFeePercent.toFixed(2)}% (
                    {formatCurrency(economics.cardFeeAmount)})
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Warranty reserve: {economics.warrantyReservePercent.toFixed(2)}% (
                    {formatCurrency(economics.warrantyReserveAmount)})
                  </p>
                </div>
              </>
            ) : (
              <p className="mt-4 text-sm text-muted-foreground">
                No economics captured yet. Add quote, invoice, costs, and hours in the promise
                form so we can learn which promises actually create healthy work.
              </p>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <PromiseStatusForm promise={promise} />

          <div className="rounded-3xl border border-border bg-card/50 p-6">
            <h2 className="text-xl font-bold text-foreground">Promise breakers</h2>
            {promise.topRisks.length > 0 ? (
              <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
                {promise.topRisks.map((risk) => (
                  <li key={risk} className="flex gap-2">
                    <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-[--wr-gold]" />
                    {risk}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-sm text-muted-foreground">
                No active blockers are flagged on this promise.
              </p>
            )}
          </div>

          <div className="rounded-3xl border border-border bg-card/50 p-6">
            <h2 className="text-xl font-bold text-foreground">Contact path</h2>
            <div className="mt-4 space-y-3 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-primary" />
                {promise.customer.phone}
              </div>
              <p>Preferred contact: {promise.customer.preferredContact}</p>
              {promise.customer.email ? <p>{promise.customer.email}</p> : null}
            </div>
          </div>

          {(playbook.dispatchRule || playbook.quoteScript || playbook.addOnPlays.length > 0) ? (
            <div className="rounded-3xl border border-border bg-card/50 p-6">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-xl font-bold text-foreground">Relevant playbook</h2>
                <Link
                  href="/ops/playbooks"
                  className="text-sm font-medium text-primary transition-colors hover:text-primary/80"
                >
                  Open full playbooks
                </Link>
              </div>

              {playbook.dispatchRule ? (
                <div className="mt-4 rounded-2xl border border-border bg-background/60 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                    Dispatch promise
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {playbook.dispatchRule.firstPromise}
                  </p>
                </div>
              ) : null}

              {playbook.quoteScript ? (
                <div className="mt-4 rounded-2xl border border-border bg-background/60 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                    Quote language
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {playbook.quoteScript.pricingLanguage}
                  </p>
                </div>
              ) : null}

              {playbook.addOnPlays[0] ? (
                <div className="mt-4 rounded-2xl border border-border bg-background/60 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                    Closeout next-step wording
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {playbook.addOnPlays[0].customerWords}
                  </p>
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="rounded-3xl border border-border bg-card/50 p-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-bold text-foreground">Outbound drafts</h2>
              <Link
                href={`/api/al/wrenchready/promises/${promise.id}/outbound`}
                target="_blank"
                className="text-sm font-medium text-primary transition-colors hover:text-primary/80"
              >
                Open JSON
              </Link>
            </div>

            <div className="mt-4 space-y-4">
              {[
                outbound.closeoutRecap,
                outbound.reviewAsk,
                outbound.reminderSeed,
              ].map((draft) => (
                <div key={draft.headline} className="rounded-2xl border border-border bg-background/60 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                      <MessageSquareShare className="h-4 w-4 text-primary" />
                      {draft.headline}
                    </div>
                    <span className="rounded-full border border-border bg-card px-2.5 py-1 text-[11px] text-muted-foreground">
                      {draft.status} / {draft.channel}
                    </span>
                  </div>
                  {draft.subject ? (
                    <p className="mt-3 text-sm text-foreground">Subject: {draft.subject}</p>
                  ) : null}
                  <pre className="mt-3 whitespace-pre-wrap rounded-xl border border-border/70 bg-card/50 p-3 text-sm text-muted-foreground">
                    {draft.body}
                  </pre>
                  <p className="mt-3 text-sm text-muted-foreground">{draft.reason}</p>
                </div>
              ))}
            </div>

            {outbound.proofSummary.length > 0 ? (
              <div className="mt-4 rounded-2xl border border-border bg-background/60 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                  Proof summary
                </p>
                <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                  {outbound.proofSummary.map((entry) => (
                    <li key={entry} className="flex gap-2">
                      <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                      {entry}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div className="mt-4 rounded-2xl border border-border bg-background/60 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                Outbound history
              </p>
              {promise.outboundHistory && promise.outboundHistory.length > 0 ? (
                <div className="mt-3 space-y-3">
                  {promise.outboundHistory
                    .slice()
                    .reverse()
                    .map((event) => (
                      <div key={event.id} className="rounded-xl border border-border/70 bg-card/50 p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-medium text-foreground">{event.headline}</p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {event.channelType} / {event.status} / {event.channel}
                            </p>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {new Intl.DateTimeFormat("en-US", {
                              month: "short",
                              day: "numeric",
                              hour: "numeric",
                              minute: "2-digit",
                            }).format(new Date(event.recordedAt))}
                          </span>
                        </div>
                        <p className="mt-2 text-sm text-muted-foreground">
                          {event.summary || "No outbound summary recorded."}
                        </p>
                        {event.status === "delivered" || event.status === "responded" ? (
                          <OutboundResultForm
                            promiseId={promise.id}
                            channelType={event.channelType}
                            owner={promise.owner}
                          />
                        ) : null}
                      </div>
                    ))}
                </div>
              ) : (
                <p className="mt-3 text-sm text-muted-foreground">
                  No outbound history recorded yet.
                </p>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
