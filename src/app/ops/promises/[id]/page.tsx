import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import {
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  ClipboardCheck,
  ExternalLink,
  FileText,
  ImagePlus,
  Mail,
  MapPin,
  MessageSquareShare,
  Phone,
  ReceiptText,
  ShieldCheck,
  Sparkles,
  UserRound,
  Wrench,
} from "lucide-react";
import { OpsPaymentLinkForm } from "@/components/ops-payment-link-form";
import { OutboundResultForm } from "@/components/outbound-result-form";
import { PromiseStatusForm } from "@/components/promise-status-form";
import { QuickCloseoutForm } from "@/components/quick-closeout-form";
import { getNextProbableVisit } from "@/lib/promise-crm/closeout-recapture";
import { isQuoteScheduleReview, promiseBoardStatusLabel } from "@/lib/promise-crm/display-state";
import { computePromiseEconomics } from "@/lib/promise-crm/economics";
import { getPromiseOutboundSnapshot } from "@/lib/promise-crm/outbound-drafts";
import { getPlaybookRecommendation } from "@/lib/promise-crm/playbooks";
import { getProofDisciplineForPromise } from "@/lib/promise-crm/proof-discipline";
import { getPromiseRecord } from "@/lib/promise-crm/server";
import type {
  CommercialOutcomeStatus,
  FollowThroughResolutionAction,
  PromiseFieldExecutionPacket,
  PromisePartItem,
  PromiseRecord,
} from "@/lib/promise-crm/types";

type PromiseDetailPageProps = {
  params: Promise<{ id: string }>;
};

type PromiseDetailRecord = NonNullable<Awaited<ReturnType<typeof getPromiseRecord>>>;

type TimelineItem = {
  title: string;
  detail: string;
  time?: string;
  label: string;
  tone?: "default" | "success" | "warning" | "danger";
};

const commandButtonClass =
  "inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg border border-border bg-background/70 px-2.5 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-secondary sm:min-h-11 sm:gap-2 sm:rounded-xl sm:px-3.5 sm:text-sm";

const primaryCommandButtonClass =
  "inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg bg-primary px-2.5 py-2 text-xs font-semibold text-primary-foreground transition-all hover:brightness-110 sm:min-h-11 sm:gap-2 sm:rounded-xl sm:px-3.5 sm:text-sm";

const navItems = [
  ["#overview", "Overview"],
  ["#timeline", "Timeline"],
  ["#quote", "Quote"],
  ["#schedule", "Schedule"],
  ["#parts", "Parts"],
  ["#field-plan", "Field Plan"],
  ["#messages", "Messages"],
  ["#files", "Files"],
  ["#payment", "Payment"],
  ["#jeff", "Jeff"],
];

const customerCertaintyChecks: Array<[
  keyof PromiseRecord["customerCertainty"],
  string,
]> = [
  ["contactConfirmed", "Contact confirmed"],
  ["arrivalWindowShared", "Arrival window shared"],
  ["pricingExpectationShared", "Pricing expectation shared"],
  ["updatesPlanShared", "Update plan shared"],
  ["followUpExplained", "Follow-up explained"],
];

const dayReadinessChecks: Array<[keyof PromiseRecord["dayReadiness"], string]> = [
  ["customerConfirmed", "Customer confirmed"],
  ["locationConfirmed", "Location confirmed"],
  ["partsConfirmed", "Parts confirmed"],
  ["toolsConfirmed", "Tools confirmed"],
  ["routeLocked", "Route locked"],
  ["paymentMethodReady", "Payment method ready"],
];

function formatVehicle(record: PromiseDetailRecord) {
  return [record.vehicle.year || undefined, record.vehicle.make, record.vehicle.model]
    .filter(Boolean)
    .join(" ");
}

function formatCurrency(value?: number) {
  if (value === undefined) return "Not captured";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

function formatDateTime(value?: string) {
  if (!value) return "Not captured";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
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

function jobStageLabel(value?: string) {
  if (value === "triage-needed") return "Triage needed";
  if (value === "quoted") return "Quote draft";
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

function quotePacketStatusLabel(value?: string) {
  if (value === "send-ready") return "Send-ready";
  if (value === "blocked") return "Blocked";
  return "Draft for review";
}

function qaStatusLabel(value?: string) {
  if (value === "pass") return "Pass";
  if (value === "blocked") return "Blocked";
  return "Needs review";
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
  value: PromiseDetailRecord["customerApproval"]["status"],
) {
  if (value === "awaiting-approval") return "Awaiting approval";
  if (value === "approved") return "Approved";
  if (value === "declined") return "Declined";
  return "Not needed";
}

function phoneHref(phone?: string) {
  const digits = phone?.replace(/\D/g, "") || "";
  if (!digits) return undefined;
  const normalized = digits.length === 10 ? `1${digits}` : digits;
  return `tel:+${normalized}`;
}

function smsHref(phone?: string) {
  const digits = phone?.replace(/\D/g, "") || "";
  if (!digits) return undefined;
  const normalized = digits.length === 10 ? `1${digits}` : digits;
  return `sms:+${normalized}`;
}

function emailHref(email: string | undefined, promise: PromiseDetailRecord) {
  if (!email) return undefined;
  const subject = `WrenchReady update: ${promise.serviceScope}`;
  return `mailto:${email}?subject=${encodeURIComponent(subject)}`;
}

function mapHref(address?: string) {
  const query = address?.trim() || "Spokane WA";
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

function quoteAmount(promise: PromiseDetailRecord) {
  return (
    promise.customerApproval.requestedAmount ??
    promise.economics?.quotedAmount ??
    promise.economics?.finalInvoiceAmount
  );
}

function customerSendLabel(value?: string) {
  if (value === "ready-after-review") return "Ready after review";
  if (value === "sent") return "Sent";
  return "Not sent";
}

function paymentLinkLabel(value?: string) {
  if (value === "pending-review") return "Pending review";
  if (value === "ready") return "Ready";
  if (value === "blocked") return "Blocked";
  return "Not created";
}

function riskClasses(risk: PromiseDetailRecord["readinessRisk"]) {
  if (risk === "high") return "border-red-500/30 bg-red-500/10 text-red-200";
  if (risk === "medium") {
    return "border-[--wr-gold]/30 bg-[--wr-gold]/10 text-[--wr-gold-soft]";
  }
  return "border-[--wr-teal]/30 bg-[--wr-teal]/10 text-[--wr-teal-soft]";
}

function qaStatusClasses(value?: string) {
  if (value === "pass") return "border-[--wr-teal]/25 bg-[--wr-teal]/10 text-[--wr-teal-soft]";
  if (value === "blocked") return "border-red-500/25 bg-red-500/10 text-red-200";
  return "border-[--wr-gold]/25 bg-[--wr-gold]/10 text-[--wr-gold-soft]";
}

function timelineToneClasses(tone: TimelineItem["tone"] = "default") {
  if (tone === "success") return "border-[--wr-teal]/40 bg-[--wr-teal]/15 text-[--wr-teal-soft]";
  if (tone === "warning") return "border-[--wr-gold]/40 bg-[--wr-gold]/15 text-[--wr-gold-soft]";
  if (tone === "danger") return "border-red-500/40 bg-red-500/15 text-red-200";
  return "border-primary/30 bg-primary/10 text-primary";
}

function buildTimeline(promise: PromiseDetailRecord): TimelineItem[] {
  const items: TimelineItem[] = [
    {
      title: "Promise record created",
      detail: `${promise.customer.name} entered the CRM for ${promise.serviceScope}.`,
      time: promise.createdAt,
      label: "CRM",
    },
    {
      title: "Record updated",
      detail: promise.nextAction,
      time: promise.updatedAt,
      label: "CRM",
    },
    {
      title: "Current appointment window",
      detail: promise.scheduledWindow.label,
      time: promise.scheduledWindow.startIso,
      label: "Schedule",
      tone: promise.scheduledWindow.startIso ? "success" : "warning",
    },
  ];

  if (promise.customerApproval.requestedAt) {
    items.push({
      title: "Customer approval requested",
      detail: `${promise.customerApproval.requestedService || promise.serviceScope} / ${formatCurrency(promise.customerApproval.requestedAmount)}`,
      time: promise.customerApproval.requestedAt,
      label: "Quote",
      tone: promise.customerApproval.status === "approved" ? "success" : "warning",
    });
  }

  if (promise.customerApproval.respondedAt) {
    items.push({
      title: `Customer ${customerApprovalLabel(promise.customerApproval.status).toLowerCase()}`,
      detail: promise.customerApproval.summary || "Customer approval status updated.",
      time: promise.customerApproval.respondedAt,
      label: "Customer",
      tone: promise.customerApproval.status === "approved" ? "success" : "danger",
    });
  }

  if (promise.quotePacket) {
    items.push({
      title: "Quote packet generated",
      detail: `${quotePacketStatusLabel(promise.quotePacket.status)} / ${promise.quotePacket.nextAction}`,
      time: promise.quotePacket.generatedAt,
      label: "Quote",
      tone: promise.quotePacket.status === "blocked" ? "danger" : "warning",
    });
  }

  if (promise.paymentCollection?.depositRequestedAt) {
    items.push({
      title: "Deposit requested",
      detail: `${formatCurrency(promise.paymentCollection.depositRequestedAmount)} / ${paymentStatusLabel(promise.paymentCollection.status)}`,
      time: promise.paymentCollection.depositRequestedAt,
      label: "Payment",
      tone: "warning",
    });
  }

  if (promise.paymentCollection?.balanceRequestedAt) {
    items.push({
      title: "Balance requested",
      detail: `${formatCurrency(promise.paymentCollection.balanceDueAmount)} / ${paymentStatusLabel(promise.paymentCollection.status)}`,
      time: promise.paymentCollection.balanceRequestedAt,
      label: "Payment",
      tone: "warning",
    });
  }

  if (promise.paymentCollection?.collectedAt || promise.paymentCollection?.depositPaidAt || promise.paymentCollection?.balancePaidAt) {
    items.push({
      title: "Payment collected",
      detail: promise.paymentCollection.paymentSummary || `${formatCurrency(promise.paymentCollection.amountCollected)} collected.`,
      time:
        promise.paymentCollection.collectedAt ||
        promise.paymentCollection.balancePaidAt ||
        promise.paymentCollection.depositPaidAt,
      label: "Payment",
      tone: "success",
    });
  }

  if (promise.closeout?.completedAt) {
    items.push({
      title: "Job closeout recorded",
      detail: promise.closeout.workPerformedSummary || "Structured closeout captured.",
      time: promise.closeout.completedAt,
      label: "Closeout",
      tone: "success",
    });
  }

  for (const event of promise.outboundHistory || []) {
    items.push({
      title: event.headline,
      detail: event.summary || `${event.channelType} via ${event.channel}`,
      time: event.recordedAt,
      label: event.status,
      tone: event.status === "failed" ? "danger" : "success",
    });
  }

  for (const entry of promise.followThroughHistory || []) {
    items.push({
      title: followThroughResolutionLabel(entry.action),
      detail: `${followThroughReasonLabel(entry.reason)} / ${entry.summary || "No summary recorded"}`,
      time: entry.resolvedAt,
      label: "Follow-through",
      tone: "success",
    });
  }

  for (const activity of promise.recurringAccount?.activityHistory || []) {
    items.push({
      title: activity.summary,
      detail: `${activity.kind} / ${activity.actor}`,
      time: activity.recordedAt,
      label: "Account",
    });
  }

  return items.sort((a, b) => {
    const aTime = a.time ? new Date(a.time).getTime() : 0;
    const bTime = b.time ? new Date(b.time).getTime() : 0;
    return bTime - aTime;
  });
}

function Section({
  id,
  title,
  eyebrow,
  action,
  children,
}: {
  id: string;
  title: string;
  eyebrow: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-6 border-t border-border pt-6 lg:scroll-mt-32">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
            {eyebrow}
          </p>
          <h2 className="mt-1 text-2xl font-bold text-foreground">{title}</h2>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function StatusPill({
  children,
  className = "border-border bg-background/70 text-muted-foreground",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${className}`}>
      {children}
    </span>
  );
}

function MetricTile({
  label,
  value,
  detail,
  icon,
}: {
  label: string;
  value: string;
  detail?: string;
  icon?: ReactNode;
}) {
  return (
    <div className="min-w-0 rounded-xl border border-border bg-background/55 p-4">
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
        {icon}
        {label}
      </div>
      <p className="mt-2 break-words text-base font-semibold text-foreground">{value}</p>
      {detail ? <p className="mt-1 break-words text-sm text-muted-foreground">{detail}</p> : null}
    </div>
  );
}

function CommandLink({
  href,
  icon,
  children,
  primary = false,
  external = false,
}: {
  href?: string;
  icon: ReactNode;
  children: ReactNode;
  primary?: boolean;
  external?: boolean;
}) {
  if (!href) {
    return (
      <span className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg border border-border bg-background/30 px-2.5 py-2 text-xs font-semibold text-muted-foreground opacity-70 sm:min-h-11 sm:gap-2 sm:rounded-xl sm:px-3.5 sm:text-sm">
        {icon}
        {children}
      </span>
    );
  }

  return (
    <a
      className={primary ? primaryCommandButtonClass : commandButtonClass}
      href={href}
      rel={external ? "noreferrer" : undefined}
      target={external ? "_blank" : undefined}
    >
      {icon}
      {children}
    </a>
  );
}

function ListBlock({
  title,
  items,
  empty,
}: {
  title: string;
  items?: string[];
  empty: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-background/55 p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
        {title}
      </p>
      {items && items.length > 0 ? (
        <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
          {items.map((item) => (
            <li className="flex min-w-0 gap-2" key={`${title}-${item}`}>
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
              <span className="break-words">{item}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">{empty}</p>
      )}
    </div>
  );
}

function BooleanChecklist({
  title,
  items,
}: {
  title: string;
  items: Array<[string, boolean]>;
}) {
  return (
    <div className="rounded-xl border border-border bg-background/55 p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
        {title}
      </p>
      <div className="mt-3 grid gap-2">
        {items.map(([label, checked]) => (
          <div className="flex items-center gap-2 text-sm text-muted-foreground" key={label}>
            <span
              className={`inline-flex h-5 w-5 items-center justify-center rounded-full border ${
                checked
                  ? "border-[--wr-teal]/40 bg-[--wr-teal]/15 text-[--wr-teal-soft]"
                  : "border-border bg-card text-muted-foreground"
              }`}
            >
              {checked ? <CheckCircle2 className="h-3.5 w-3.5" /> : null}
            </span>
            {label}
          </div>
        ))}
      </div>
    </div>
  );
}

function PartItemCard({ part }: { part: PromisePartItem }) {
  return (
    <div className="rounded-xl border border-border bg-background/55 p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-semibold text-foreground">
            {part.quantity || 1}x {part.label}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {part.partNumber || "No part number"} / {part.vendor || "Vendor not set"}
          </p>
        </div>
        <StatusPill>{part.status.replace(/-/g, " ")}</StatusPill>
      </div>
      <div className="mt-3 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
        <p>Location: {part.vendorLocation || "Not captured"}</p>
        <p>Cost: {formatCurrency(part.estimatedCost)}</p>
        <p className="sm:col-span-2">Fitment: {part.fitmentNotes || "Verify VIN/options before ordering."}</p>
        {part.notes ? <p className="sm:col-span-2">Notes: {part.notes}</p> : null}
      </div>
    </div>
  );
}

function QuoteDocument({
  title,
  audience,
  summary,
  markdown,
  defaultOpen = false,
}: {
  title: string;
  audience: string;
  summary: string;
  markdown: string;
  defaultOpen?: boolean;
}) {
  return (
    <details
      className="rounded-xl border border-border bg-background/55"
      open={defaultOpen}
    >
      <summary className="cursor-pointer list-none p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
              {audience}
            </p>
            <p className="mt-1 font-semibold text-foreground">{title}</p>
            <p className="mt-1 text-sm text-muted-foreground">{summary}</p>
          </div>
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary">
            Expand
            <ChevronRight className="h-3.5 w-3.5" />
          </span>
        </div>
      </summary>
      <pre className="mx-4 mb-4 max-h-none overflow-visible whitespace-pre-wrap break-words rounded-xl border border-border bg-card/70 p-4 text-xs leading-relaxed text-muted-foreground sm:max-h-[460px] sm:overflow-auto">
        {markdown}
      </pre>
    </details>
  );
}

function QuickActionUnavailable({ label, reason }: { label: string; reason: string }) {
  return (
    <div className="rounded-xl border border-border bg-background/55 p-4">
      <p className="text-sm font-semibold text-foreground">{label}</p>
      <p className="mt-2 text-sm text-muted-foreground">{reason}</p>
    </div>
  );
}

function getCloseoutGapLabels(
  promise: PromiseDetailRecord,
  nextProbableVisit: ReturnType<typeof getNextProbableVisit>,
  proofScore: number,
  approvedAssets: number,
) {
  return [
    !promise.closeout?.workPerformedSummary ? "work summary" : null,
    !promise.closeout?.customerConditionSummary ? "customer condition" : null,
    !promise.closeout?.customerRecap?.summary ? "customer recap summary" : null,
    !promise.closeout?.reviewRequest?.summary ? "review ask summary" : null,
    !promise.closeout?.maintenanceReminder?.summary ? "reminder summary" : null,
    !nextProbableVisit?.reason ? "next visit reason" : null,
    proofScore < 70 ? "proof depth" : null,
    approvedAssets === 0 ? "permission-safe proof" : null,
  ].filter((entry): entry is string => Boolean(entry));
}

function fieldPacketCoverage(fieldExecution?: PromiseFieldExecutionPacket) {
  if (!fieldExecution) return { complete: 0, total: 9 };
  const sections = [
    fieldExecution.serviceGoal,
    fieldExecution.partsChecklist.length,
    fieldExecution.requiredTools.length,
    fieldExecution.mfgSpecs.length,
    fieldExecution.serviceDataChecks.length,
    fieldExecution.fitmentCautions.length,
    fieldExecution.photosRequired.length,
    fieldExecution.inspectionChecklist.length,
    fieldExecution.closeoutSteps.length,
  ];
  return {
    complete: sections.filter(Boolean).length,
    total: sections.length,
  };
}

export const metadata: Metadata = {
  title: "Promise CRM Record",
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
  const proof = getProofDisciplineForPromise(promise);
  const outbound = getPromiseOutboundSnapshot(promise);
  const playbook = getPlaybookRecommendation(
    `${promise.serviceScope} ${promise.commercialOutcome?.convertedService || ""} ${promise.nextAction}`,
  );
  const timeline = buildTimeline(promise);
  const closeoutGapLabels = getCloseoutGapLabels(
    promise,
    nextProbableVisit,
    proof.proofScore,
    proof.approvedAssets,
  );
  const callCustomerHref = phoneHref(promise.customer.phone);
  const textCustomerHref = smsHref(promise.customer.phone);
  const emailCustomerHref = emailHref(promise.customer.email, promise);
  const openMapHref = mapHref(promise.location.label || promise.location.city);
  const quoteTotal = quoteAmount(promise);
  const fieldCoverage = fieldPacketCoverage(promise.fieldExecution);
  const qaChecks = promise.quotePacket?.qaChecks || [];
  const qaPassCount = qaChecks.filter((check) => check.status === "pass").length;
  const qaBlockedCount = qaChecks.filter((check) => check.status === "blocked").length;
  const canRequestDeposit = promise.paymentCollection?.status === "deposit-requested";
  const canRequestBalance = Boolean(
    promise.paymentCollection?.balanceDueAmount &&
      promise.paymentCollection.balanceDueAmount > 0 &&
      promise.paymentCollection.status !== "paid",
  );
  const quoteReview = isQuoteScheduleReview(promise);

  return (
    <div className="bg-background pb-12">
      <div className="shell pt-6 sm:pt-8">
        <Link
          href="/ops/promises"
          className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Promise Board
        </Link>
      </div>

      <header className="relative z-30 mt-4 border-y border-border bg-background/95 backdrop-blur lg:sticky lg:top-0">
        <div className="shell py-3">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <StatusPill
                  className={
                    quoteReview
                      ? "border-[--wr-gold]/30 bg-[--wr-gold]/10 text-[--wr-gold-soft]"
                      : "border-primary/25 bg-primary/10 text-primary"
                  }
                >
                  {quoteReview ? "Quote / schedule review" : "CRM Record"}
                </StatusPill>
                <StatusPill>{jobStageLabel(promise.jobStage)}</StatusPill>
                <StatusPill className={riskClasses(promise.readinessRisk)}>
                  {promise.readinessRisk} risk
                </StatusPill>
                <StatusPill>
                  Owner: {promise.owner}
                </StatusPill>
              </div>
              <div className="mt-2 flex min-w-0 flex-col gap-1 lg:flex-row lg:items-baseline lg:gap-3">
                <h1 className="truncate text-xl font-bold tracking-tight text-foreground sm:text-3xl">
                  {promise.customer.name}
                </h1>
                <p className="truncate text-sm text-muted-foreground sm:text-base">
                  {formatVehicle(promise)} / {promise.serviceScope}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 sm:flex sm:flex-wrap xl:justify-end">
              <CommandLink href={callCustomerHref} icon={<Phone className="h-4 w-4" />} primary>
                Call
              </CommandLink>
              <CommandLink href={textCustomerHref} icon={<MessageSquareShare className="h-4 w-4" />}>
                Text
              </CommandLink>
              <CommandLink href={emailCustomerHref} icon={<Mail className="h-4 w-4" />}>
                Email
              </CommandLink>
              <CommandLink href={openMapHref} icon={<MapPin className="h-4 w-4" />} external>
                Map
              </CommandLink>
              <CommandLink href={promise.customerAccess.sharePath} icon={<UserRound className="h-4 w-4" />} external>
                Customer
              </CommandLink>
              <CommandLink href="#quote" icon={<FileText className="h-4 w-4" />}>
                Quote
              </CommandLink>
              <CommandLink href="#payment" icon={<ReceiptText className="h-4 w-4" />}>
                Invoice
              </CommandLink>
              <CommandLink href={`/jeff/photo-drop?jobId=${promise.id}`} icon={<ImagePlus className="h-4 w-4" />}>
                Upload
              </CommandLink>
              <CommandLink href={`/jeff/messages?jobId=${promise.id}`} icon={<Sparkles className="h-4 w-4" />}>
                Ask Jeff
              </CommandLink>
            </div>
          </div>

          <nav className="mt-3 flex gap-2 overflow-x-auto pb-1 text-sm" aria-label="Promise record sections">
            {navItems.map(([href, label]) => (
              <a
                className="whitespace-nowrap rounded-full border border-border bg-background/70 px-3 py-1.5 font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                href={href}
                key={href}
              >
                {label}
              </a>
            ))}
          </nav>
        </div>
      </header>

      <main className="shell py-6 sm:py-8">
        {quoteReview ? (
          <section className="mb-6 rounded-xl border border-[--wr-gold]/30 bg-[--wr-gold]/10 p-4 text-[--wr-gold-soft]">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-3xl">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <CircleAlert className="h-4 w-4 shrink-0" />
                  Not a scheduled customer promise
                </div>
                <p className="mt-2 text-sm leading-relaxed">
                  Jeff prepared this as a quote or schedule review draft. Adam/Dez still needs to
                  approve scope, price, caveats, customer send, payment link, and calendar before
                  this becomes a customer-facing appointment.
                </p>
              </div>
              <div className="grid min-w-0 gap-2 text-xs sm:grid-cols-3 lg:w-[32rem]">
                <StatusPill className="border-[--wr-gold]/30 bg-background/40 text-[--wr-gold-soft]">
                  Customer: {customerSendLabel(promise.quotePacket?.customerSendStatus)}
                </StatusPill>
                <StatusPill className="border-[--wr-gold]/30 bg-background/40 text-[--wr-gold-soft]">
                  Payment: {paymentLinkLabel(promise.quotePacket?.paymentLinkStatus)}
                </StatusPill>
                <StatusPill className="border-[--wr-gold]/30 bg-background/40 text-[--wr-gold-soft]">
                  Approval: {customerApprovalLabel(promise.customerApproval.status)}
                </StatusPill>
              </div>
            </div>
          </section>
        ) : null}

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="min-w-0 space-y-8">
            <Section id="overview" eyebrow="Command center" title="Overview">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <MetricTile
                  detail={promise.customer.phone}
                  icon={<UserRound className="h-3.5 w-3.5" />}
                  label="Customer"
                  value={promise.customer.name}
                />
                <MetricTile
                  detail={promise.vehicle.mileage ? `${promise.vehicle.mileage.toLocaleString()} miles` : "Mileage not captured"}
                  icon={<Wrench className="h-3.5 w-3.5" />}
                  label="Vehicle"
                  value={formatVehicle(promise)}
                />
                <MetricTile
                  detail={promise.location.accessNotes || promise.location.territory}
                  icon={<MapPin className="h-3.5 w-3.5" />}
                  label="Location"
                  value={promise.location.label}
                />
                <MetricTile
                  detail={
                    quoteReview
                      ? `Draft ${formatCurrency(quoteTotal)} / payment ${paymentLinkLabel(promise.quotePacket?.paymentLinkStatus)}`
                      : `Quote ${formatCurrency(quoteTotal)} / ${paymentStatusLabel(promise.paymentCollection?.status)}`
                  }
                  icon={<CalendarClock className="h-3.5 w-3.5" />}
                  label={quoteReview ? "Review window" : "Schedule"}
                  value={promise.scheduledWindow.label}
                />
              </div>

              <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_0.85fr]">
                <div className="rounded-xl border border-border bg-background/55 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
                    Immediate next action
                  </p>
                  <p className="mt-2 text-base leading-relaxed text-foreground">{promise.nextAction}</p>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                    {promise.readinessSummary}
                  </p>
                </div>

                <div className="rounded-xl border border-border bg-background/55 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
                    {quoteReview ? "Review state" : "Approval and customer view"}
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {customerApprovalLabel(promise.customerApproval.status)} / {formatCurrency(promise.customerApproval.requestedAmount)}
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {promise.customerApproval.summary || "No customer approval summary recorded."}
                  </p>
                  <a
                    className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-primary transition-colors hover:text-primary/80"
                    href={promise.customerAccess.sharePath}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {quoteReview ? "Open customer status preview" : "Open customer status page"}
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              </div>
            </Section>

            <Section id="timeline" eyebrow="Source of truth" title="Timeline">
              <div className="space-y-3">
                {timeline.slice(0, 14).map((item) => (
                  <div
                    className="grid gap-3 rounded-xl border border-border bg-background/55 p-4 md:grid-cols-[132px_minmax(0,1fr)]"
                    key={`${item.title}-${item.time || item.detail}`}
                  >
                    <div>
                      <StatusPill className={timelineToneClasses(item.tone)}>{item.label}</StatusPill>
                      <p className="mt-2 text-xs text-muted-foreground">{formatDateTime(item.time)}</p>
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-foreground">{item.title}</p>
                      <p className="mt-1 break-words text-sm leading-relaxed text-muted-foreground">{item.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Section>

            <Section
              id="quote"
              eyebrow="Estimate workflow"
              title="Quote"
              action={
                <div className="flex flex-wrap gap-2">
                  <CommandLink href={promise.customerAccess.sharePath} icon={<UserRound className="h-4 w-4" />} external>
                    Customer View
                  </CommandLink>
                  <CommandLink href="#payment" icon={<ReceiptText className="h-4 w-4" />}>
                    Payment
                  </CommandLink>
                </div>
              }
            >
              {promise.quotePacket ? (
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-4">
                    <MetricTile label="Packet status" value={quotePacketStatusLabel(promise.quotePacket.status)} detail={`Send: ${customerSendLabel(promise.quotePacket.customerSendStatus)}`} />
                    <MetricTile label="Review owner" value={promise.quotePacket.reviewOwner} detail={`Generated by ${promise.quotePacket.generatedBy}`} />
                    <MetricTile label="QA" value={`${qaPassCount}/${qaChecks.length} pass`} detail={qaBlockedCount ? `${qaBlockedCount} blocked` : "No hard blockers"} />
                    <MetricTile label="Payment link" value={paymentLinkLabel(promise.quotePacket.paymentLinkStatus)} detail={formatCurrency(quoteTotal)} />
                  </div>

                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {qaChecks.map((check) => (
                      <div
                        className={`rounded-xl border p-4 text-sm ${qaStatusClasses(check.status)}`}
                        key={`${check.label}-${check.status}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-semibold">{check.label}</p>
                          <span className="rounded-full border border-current/20 px-2 py-0.5 text-[11px] font-semibold uppercase">
                            {qaStatusLabel(check.status)}
                          </span>
                        </div>
                        <p className="mt-2 break-words opacity-90">{check.detail || check.status}</p>
                      </div>
                    ))}
                  </div>

                  {promise.quotePacket.blockers.length > 0 ? (
                    <div className="rounded-xl border border-red-500/25 bg-red-500/10 p-4">
                      <p className="text-sm font-semibold text-red-100">Blocked before customer send</p>
                      <ul className="mt-3 space-y-2 text-sm text-red-100/85">
                        {promise.quotePacket.blockers.map((blocker) => (
                          <li className="flex gap-2" key={blocker}>
                            <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                            <span>{blocker}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  <div className="grid gap-4 xl:grid-cols-2">
                    <QuoteDocument
                      audience="Simon / Adam only"
                      markdown={promise.quotePacket.internalServicePlan.markdown}
                      summary={promise.quotePacket.internalServicePlan.summary}
                      title={promise.quotePacket.internalServicePlan.title}
                    />
                    <QuoteDocument
                      audience="Customer-safe draft"
                      defaultOpen
                      markdown={promise.quotePacket.externalCustomerQuote.markdown}
                      summary={promise.quotePacket.externalCustomerQuote.summary}
                      title={promise.quotePacket.externalCustomerQuote.title}
                    />
                  </div>

                  <div className="rounded-xl border border-border bg-background/55 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
                      Next quote action
                    </p>
                    <p className="mt-2 text-sm text-muted-foreground">{promise.quotePacket.nextAction}</p>
                  </div>
                </div>
              ) : (
                <QuickActionUnavailable
                  label="No quote packet captured"
                  reason="Jeff needs to create a quote draft through the CRM tool before this can be reviewed or sent."
                />
              )}
            </Section>

            <Section id="schedule" eyebrow="Dispatch readiness" title="Schedule">
              {quoteReview ? (
                <div className="mb-4 rounded-xl border border-[--wr-gold]/25 bg-[--wr-gold]/10 p-4 text-sm leading-relaxed text-[--wr-gold-soft]">
                  This is a requested or draft window, not a booked appointment. Confirm route,
                  duration, parts/worksite readiness, customer approval, and customer send before
                  calling it scheduled.
                </div>
              ) : null}
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-xl border border-border bg-background/55 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
                    Appointment and route
                  </p>
                  <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                    <p>Window: {promise.scheduledWindow.label}</p>
                    <p>Start: {formatDateTime(promise.scheduledWindow.startIso)}</p>
                    <p>End: {formatDateTime(promise.scheduledWindow.endIso)}</p>
                    <p>Address: {promise.location.label}</p>
                    <p>Access: {promise.location.accessNotes || "No access note recorded."}</p>
                  </div>
                  <a
                    className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary transition-colors hover:text-primary/80"
                    href={openMapHref}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open route in Google Maps
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>

                <div className="grid gap-4">
                  <BooleanChecklist
                    title="Customer certainty"
                    items={customerCertaintyChecks.map(([key, label]) => [
                      label,
                      promise.customerCertainty[key],
                    ])}
                  />
                  <BooleanChecklist
                    title="Day readiness"
                    items={dayReadinessChecks.map(([key, label]) => [
                      label,
                      promise.dayReadiness[key],
                    ])}
                  />
                </div>
              </div>
            </Section>

            <Section id="parts" eyebrow="Procurement" title="Parts">
              {promise.fieldExecution ? (
                <div className="space-y-4">
                  <div className="grid gap-4 lg:grid-cols-2">
                    <ListBlock
                      empty="No parts checklist captured."
                      items={promise.fieldExecution.partsChecklist}
                      title="Parts checklist"
                    />
                    <div className="rounded-xl border border-border bg-background/55 p-4">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
                        Parts run
                      </p>
                      <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                        <p>Assigned: {promise.fieldExecution.partsRunPlan?.assignedTo || "Not assigned"}</p>
                        <p>Pickup window: {promise.fieldExecution.partsRunPlan?.pickupWindow || "Not captured"}</p>
                        <p>Consolidate by: {promise.fieldExecution.partsRunPlan?.consolidateBy || "Not captured"}</p>
                        <p>{promise.fieldExecution.partsRunPlan?.pickupNotes || "No pickup notes captured."}</p>
                      </div>
                    </div>
                  </div>

                  {promise.fieldExecution.partsPlan && promise.fieldExecution.partsPlan.length > 0 ? (
                    <div className="grid gap-3">
                      {promise.fieldExecution.partsPlan.map((part) => (
                        <PartItemCard key={`${part.label}-${part.partNumber || part.vendor || part.status}`} part={part} />
                      ))}
                    </div>
                  ) : (
                    <QuickActionUnavailable
                      label="No priced parts plan"
                      reason="Jeff can research fitment and nearby inventory, but the CRM does not have a priced part line yet."
                    />
                  )}
                </div>
              ) : (
                <QuickActionUnavailable
                  label="No field execution packet"
                  reason="Parts, tools, photos, and stop points need to be captured before dispatch."
                />
              )}
            </Section>

            <Section id="field-plan" eyebrow="Technician mode" title="Field Plan">
              <div className="mb-4">
                <QuickCloseoutForm promise={promise} />
              </div>

              {promise.fieldExecution ? (
                <div className="space-y-4">
                  <div className="rounded-xl border border-border bg-background/55 p-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
                          Service goal
                        </p>
                        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                          {promise.fieldExecution.serviceGoal || "No service goal recorded."}
                        </p>
                      </div>
                      <StatusPill>
                        {fieldCoverage.complete}/{fieldCoverage.total} ready
                      </StatusPill>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <ListBlock title="Required tools" items={promise.fieldExecution.requiredTools} empty="No required tools captured." />
                    <ListBlock title="MFG specs" items={promise.fieldExecution.mfgSpecs} empty="No manufacturer specs captured." />
                    <ListBlock title="Service data checks" items={promise.fieldExecution.serviceDataChecks} empty="No service-data checks captured." />
                    <ListBlock title="Fitment cautions" items={promise.fieldExecution.fitmentCautions} empty="No fitment cautions captured." />
                    <ListBlock title="Inspection checklist" items={promise.fieldExecution.inspectionChecklist} empty="No inspection checklist captured." />
                    <ListBlock title="Photos required" items={promise.fieldExecution.photosRequired} empty="No required photos captured." />
                    <ListBlock title="Comeback prevention" items={promise.fieldExecution.comebackPreventionSteps} empty="No comeback prevention steps captured." />
                    <ListBlock title="Closeout steps" items={promise.fieldExecution.closeoutSteps} empty="No closeout steps captured." />
                  </div>

                  <div className="rounded-xl border border-border bg-background/55 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
                      Notes template
                    </p>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                      {promise.fieldExecution.notesTemplate || "No notes template recorded."}
                    </p>
                  </div>
                </div>
              ) : (
                <QuickActionUnavailable
                  label="No field plan captured"
                  reason="Create a field execution packet before Simon relies on this page during the job."
                />
              )}
            </Section>

            <Section
              id="messages"
              eyebrow="Communication"
              title="Messages"
              action={
                <CommandLink href={`/jeff/messages?jobId=${promise.id}`} icon={<Sparkles className="h-4 w-4" />}>
                  Message Jeff
                </CommandLink>
              }
            >
              <div className="grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
                <div className="rounded-xl border border-border bg-background/55 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
                    Contact path
                  </p>
                  <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                    <p>Phone: {promise.customer.phone}</p>
                    <p>Email: {promise.customer.email || "Not captured"}</p>
                    <p>Preferred: {promise.customer.preferredContact}</p>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <CommandLink href={callCustomerHref} icon={<Phone className="h-4 w-4" />}>
                      Call
                    </CommandLink>
                    <CommandLink href={textCustomerHref} icon={<MessageSquareShare className="h-4 w-4" />}>
                      Text
                    </CommandLink>
                    <CommandLink href={emailCustomerHref} icon={<Mail className="h-4 w-4" />}>
                      Email
                    </CommandLink>
                  </div>
                </div>

                <div className="space-y-3">
                  {[outbound.closeoutRecap, outbound.reviewAsk, outbound.reminderSeed].map((draft) => (
                    <div className="rounded-xl border border-border bg-background/55 p-4" key={draft.headline}>
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="font-semibold text-foreground">{draft.headline}</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {draft.status} / {draft.channel}
                          </p>
                        </div>
                        {draft.subject ? <StatusPill>{draft.subject}</StatusPill> : null}
                      </div>
                      <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                        {draft.body}
                      </p>
                      <p className="mt-3 text-xs text-muted-foreground">{draft.reason}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-4 rounded-xl border border-border bg-background/55 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
                  Outbound history
                </p>
                {promise.outboundHistory && promise.outboundHistory.length > 0 ? (
                  <div className="mt-3 space-y-3">
                    {promise.outboundHistory
                      .slice()
                      .reverse()
                      .map((event) => (
                        <div className="rounded-xl border border-border/70 bg-card/50 p-3" key={event.id}>
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                              <p className="text-sm font-medium text-foreground">{event.headline}</p>
                              <p className="mt-1 text-xs text-muted-foreground">
                                {event.channelType} / {event.status} / {event.channel}
                              </p>
                            </div>
                            <span className="text-xs text-muted-foreground">{formatDateTime(event.recordedAt)}</span>
                          </div>
                          <p className="mt-2 text-sm text-muted-foreground">
                            {event.summary || "No outbound summary recorded."}
                          </p>
                          {event.status === "delivered" || event.status === "responded" ? (
                            <OutboundResultForm
                              channelType={event.channelType}
                              owner={promise.owner}
                              promiseId={promise.id}
                            />
                          ) : null}
                        </div>
                      ))}
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-muted-foreground">No outbound history recorded yet.</p>
                )}
              </div>
            </Section>

            <Section
              id="files"
              eyebrow="Proof and media"
              title="Files / Photos"
              action={
                <CommandLink href={`/jeff/photo-drop?jobId=${promise.id}`} icon={<ImagePlus className="h-4 w-4" />}>
                  Upload photo
                </CommandLink>
              }
            >
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-xl border border-border bg-background/55 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
                        Proof score
                      </p>
                      <p className="mt-2 text-2xl font-bold text-foreground">{proof.proofScore}</p>
                    </div>
                    <StatusPill>{proof.approvedAssets} approved assets</StatusPill>
                  </div>
                  <p className="mt-3 text-sm text-muted-foreground">
                    {proof.proofScore < 70
                      ? "Proof is not strong enough yet. Capture job photos, customer-safe recap, and permission status."
                      : "Proof depth is usable for closeout and customer confidence."}
                  </p>
                </div>
                <ListBlock
                  empty="No required photo checklist captured."
                  items={promise.fieldExecution?.photosRequired}
                  title="Photo checklist"
                />
              </div>

              <div className="mt-4 rounded-xl border border-border bg-background/55 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
                  Saved assets
                </p>
                {promise.closeout?.proofCapture?.assets && promise.closeout.proofCapture.assets.length > 0 ? (
                  <ul className="mt-3 space-y-3 text-sm text-muted-foreground">
                    {promise.closeout.proofCapture.assets.map((asset) => (
                      <li className="rounded-xl border border-border/70 bg-card/50 p-3" key={`${asset.kind}-${asset.label}`}>
                        <p className="font-semibold text-foreground">{asset.label}</p>
                        <p className="mt-1">{asset.kind} / {asset.permissionStatus || "unknown permission"}</p>
                        {asset.note ? <p className="mt-1">{asset.note}</p> : null}
                        {asset.url ? (
                          <a className="mt-2 inline-flex text-primary" href={asset.url} target="_blank" rel="noreferrer">
                            Open asset
                          </a>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-3 text-sm text-muted-foreground">No uploaded media is attached to this record yet.</p>
                )}
              </div>
            </Section>

            <Section id="payment" eyebrow="Money and margin" title="Payment">
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-xl border border-border bg-background/55 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
                    Collection
                  </p>
                  <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                    <p>Status: {paymentStatusLabel(promise.paymentCollection?.status)}</p>
                    <p>Method: {promise.paymentCollection?.method || "Not captured"}</p>
                    <p>Deposit: {formatCurrency(promise.paymentCollection?.depositRequestedAmount)}</p>
                    <p>Balance due: {formatCurrency(promise.paymentCollection?.balanceDueAmount)}</p>
                    <p>Collected: {formatCurrency(promise.paymentCollection?.amountCollected)}</p>
                    <p>Invoice ref: {promise.paymentCollection?.invoiceReference || "Not captured"}</p>
                    <p>{promise.paymentCollection?.paymentSummary || "No collection summary recorded."}</p>
                  </div>
                  <OpsPaymentLinkForm
                    canRequestBalance={canRequestBalance}
                    canRequestDeposit={canRequestDeposit}
                    customerStatusPath={promise.customerAccess.sharePath}
                    promiseId={promise.id}
                  />
                </div>

                <div className="rounded-xl border border-border bg-background/55 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
                    Economics
                  </p>
                  {economics ? (
                    <div className="mt-3 grid gap-3 text-sm text-muted-foreground sm:grid-cols-2">
                      <p>Quote: {formatCurrency(promise.economics?.quotedAmount)}</p>
                      <p>Final: {formatCurrency(promise.economics?.finalInvoiceAmount ?? economics.revenue)}</p>
                      <p>Parts: {formatCurrency(economics.partsCost)}</p>
                      <p>Tech: {formatCurrency(economics.techPayout)}</p>
                      <p>Gross profit: {formatCurrency(economics.grossProfitAmount)}</p>
                      <p>Net estimate: {formatCurrency(economics.netProfitEstimateAmount)}</p>
                      <p>Labor: {economics.laborHours.toFixed(2)} hrs</p>
                      <p>Travel: {economics.travelHours.toFixed(2)} hrs</p>
                      <p className="sm:col-span-2">
                        {economics.netProfitPerClockHour !== undefined
                          ? `${formatCurrency(economics.netProfitPerClockHour)} net profit per clock hour`
                          : "Add labor and travel to calculate per-hour economics."}
                      </p>
                    </div>
                  ) : (
                    <p className="mt-3 text-sm text-muted-foreground">
                      Add quote, invoice, cost, and hours to see margin.
                    </p>
                  )}
                </div>
              </div>
            </Section>

            <Section id="jeff" eyebrow="Assistant actions" title="Jeff Notes / Assistant Actions">
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-xl border border-border bg-background/55 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
                    Operator notes
                  </p>
                  {promise.notes.length > 0 ? (
                    <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                      {promise.notes.map((note) => (
                        <li className="flex min-w-0 gap-2" key={note}>
                          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                          <span className="break-words">{note}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-3 text-sm text-muted-foreground">No operator notes are visible.</p>
                  )}
                </div>

                <div className="rounded-xl border border-border bg-background/55 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
                    Relevant playbook
                  </p>
                  <div className="mt-3 space-y-3 text-sm text-muted-foreground">
                    <p>{playbook.dispatchRule?.firstPromise || "No dispatch playbook matched."}</p>
                    <p>{playbook.quoteScript?.pricingLanguage || "No quote script matched."}</p>
                    <p>{playbook.addOnPlays[0]?.customerWords || "No closeout add-on wording matched."}</p>
                  </div>
                  <Link
                    className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary transition-colors hover:text-primary/80"
                    href="/ops/playbooks"
                  >
                    Open playbooks
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                </div>

                <div className="rounded-xl border border-border bg-background/55 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
                    Follow-through
                  </p>
                  {promise.followThroughHistory && promise.followThroughHistory.length > 0 ? (
                    <div className="mt-3 space-y-3">
                      {promise.followThroughHistory
                        .slice()
                        .reverse()
                        .map((entry) => (
                          <div className="rounded-xl border border-border/70 bg-card/50 p-3" key={`${entry.resolvedAt}-${entry.action}`}>
                            <p className="text-sm font-semibold text-foreground">{followThroughResolutionLabel(entry.action)}</p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {followThroughReasonLabel(entry.reason)} / by {entry.resolvedBy} / {formatDateTime(entry.resolvedAt)}
                            </p>
                            <p className="mt-2 text-sm text-muted-foreground">{entry.summary || "No resolution summary recorded."}</p>
                          </div>
                        ))}
                    </div>
                  ) : (
                    <p className="mt-3 text-sm text-muted-foreground">No follow-through resolution recorded yet.</p>
                  )}
                </div>

                <div className="rounded-xl border border-border bg-background/55 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
                    Closeout recapture
                  </p>
                  {closeoutGapLabels.length > 0 ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {closeoutGapLabels.map((gap) => (
                        <StatusPill className="border-[--wr-gold]/25 bg-[--wr-gold]/10 text-[--wr-gold-soft]" key={gap}>
                          {gap}
                        </StatusPill>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-3 text-sm text-muted-foreground">Closeout has the main required fields.</p>
                  )}
                </div>
              </div>

              <details className="mt-4 rounded-xl border border-border bg-background/55">
                <summary className="cursor-pointer list-none p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground">Edit full CRM record</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Advanced form for owner, status, quote, closeout, proof, warranty, and account fields.
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-primary" />
                  </div>
                </summary>
                <div className="border-t border-border p-4">
                  <PromiseStatusForm promise={promise} />
                </div>
              </details>
            </Section>
          </div>

          <aside className="min-w-0 space-y-4 xl:sticky xl:top-36 xl:self-start">
            <div className="rounded-xl border border-border bg-card/70 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
                Next best action
              </p>
              <p className="mt-2 text-sm leading-relaxed text-foreground">{promise.nextAction}</p>
              <div className="mt-4 grid gap-2">
                <CommandLink href={`/jeff/messages?jobId=${promise.id}`} icon={<Sparkles className="h-4 w-4" />} primary>
                  Ask Jeff
                </CommandLink>
                <CommandLink href="#quote" icon={<FileText className="h-4 w-4" />}>
                  Review Quote
                </CommandLink>
                <CommandLink href="#field-plan" icon={<ClipboardCheck className="h-4 w-4" />}>
                  Field Plan
                </CommandLink>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card/70 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
                Status
              </p>
              <div className="mt-3 grid gap-2">
                <StatusPill
                  className={
                    quoteReview
                      ? "border-[--wr-gold]/30 bg-[--wr-gold]/10 text-[--wr-gold-soft]"
                      : undefined
                  }
                >
                  {promiseBoardStatusLabel(promise)}
                </StatusPill>
                <StatusPill>{jobStageLabel(promise.jobStage)}</StatusPill>
                <StatusPill>{quotePacketStatusLabel(promise.quotePacket?.status)}</StatusPill>
                <StatusPill>{paymentStatusLabel(promise.paymentCollection?.status)}</StatusPill>
                <StatusPill>{customerApprovalLabel(promise.customerApproval.status)}</StatusPill>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card/70 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
                Risks
              </p>
              {promise.topRisks.length > 0 ? (
                <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                  {promise.topRisks.slice(0, 5).map((risk) => (
                    <li className="flex gap-2" key={risk}>
                      <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-[--wr-gold]" />
                      <span>{risk}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-sm text-muted-foreground">No active blockers flagged.</p>
              )}
            </div>

            <div className="rounded-xl border border-border bg-card/70 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
                Warranty / account
              </p>
              <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                <p>Warranty: {warrantyStatusLabel(promise.warrantyCase?.status)}</p>
                <p>{promise.warrantyCase?.issueSummary || "No warranty issue recorded."}</p>
                <p>Account: {recurringStatusLabel(promise.recurringAccount?.status)}</p>
                <p>{promise.recurringAccount?.nextStep || "No recurring account next step."}</p>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card/70 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
                Commercial outcome
              </p>
              <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                <p>{outcomeLabel(promise.commercialOutcome?.outcomeStatus)}</p>
                <p>{promise.commercialOutcome?.convertedService || promise.serviceScope}</p>
                <p>Deferred: {formatCurrency(promise.commercialOutcome?.deferredValueAmount)}</p>
                <p>{promise.commercialOutcome?.outcomeSummary || "No outcome summary recorded."}</p>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card/70 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <ShieldCheck className="h-4 w-4 text-primary" />
                Customer safety
              </div>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Internal service plans stay on this ops record. The public customer page reads from
                the customer-safe approval and quote state.
              </p>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
