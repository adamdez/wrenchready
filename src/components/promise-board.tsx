import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  Mail,
  MessageSquareText,
  Phone,
  TimerReset,
  Wrench,
} from "lucide-react";
import { QuickDispatchForm } from "@/components/quick-dispatch-form";
import type {
  InboundRecord,
  PromiseBoardMetrics,
  PromiseRecord,
  ReadinessRisk,
} from "@/lib/promise-crm/types";

type PromiseBoardProps = {
  generatedAt: string;
  metrics: PromiseBoardMetrics;
  inbound: InboundRecord[];
  promisesWaiting: PromiseRecord[];
  tomorrowAtRisk: PromiseRecord[];
  followThroughDue: PromiseRecord[];
};

function riskClasses(risk: ReadinessRisk) {
  if (risk === "high") return "border-red-500/30 bg-red-500/10 text-red-200";
  if (risk === "medium") {
    return "border-[--wr-gold]/30 bg-[--wr-gold]/10 text-[--wr-gold-soft]";
  }
  return "border-[--wr-teal]/30 bg-[--wr-teal]/10 text-[--wr-teal-soft]";
}

function vehicleLabel(vehicle: InboundRecord["vehicle"] | PromiseRecord["vehicle"]) {
  return [vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(" ");
}

function formatBoardTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function telHref(phone?: string) {
  const digits = phone?.replace(/[^\d+]/g, "");
  return digits ? `tel:${digits}` : undefined;
}

function smsHref(phone?: string) {
  const digits = phone?.replace(/[^\d+]/g, "");
  return digits ? `sms:${digits}` : undefined;
}

function isMissingTiming(label?: string) {
  const normalized = (label || "").trim().toLowerCase();
  return (
    !normalized ||
    normalized === "no timing selected" ||
    normalized.includes("not selected") ||
    normalized.includes("tbd")
  );
}

function sourceLabel(source: InboundRecord["source"]) {
  if (source === "voicemail") return "Voicemail";
  if (source === "phone") return "Phone call";
  if (source === "text") return "Text";
  if (source === "manual") return "Manual";
  return "Website";
}

function sourceClasses(source: InboundRecord["source"]) {
  if (source === "voicemail") return "border-red-500/30 bg-red-500/10 text-red-200";
  if (source === "phone") {
    return "border-[--wr-gold]/30 bg-[--wr-gold]/10 text-[--wr-gold-soft]";
  }
  if (source === "text") return "border-primary/25 bg-primary/10 text-primary";
  return "border-border bg-background text-muted-foreground";
}

function isVoiceLead(record: InboundRecord) {
  return record.source === "voicemail" || record.source === "phone";
}

function findRecordingUrl(record: InboundRecord) {
  const searchable = [
    record.symptomSummary,
    record.location.accessNotes,
    ...record.notes,
  ].filter(Boolean);

  for (const value of searchable) {
    const match = String(value).match(/https?:\/\/\S+/);
    if (match && /recording|voicemail|\.mp3/i.test(String(value))) {
      return match[0].replace(/[),.]+$/, "");
    }
  }

  return undefined;
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-border px-4 py-6 text-sm leading-relaxed text-muted-foreground">
      {children}
    </div>
  );
}

function QueueHeader({
  title,
  count,
  icon,
  children,
}: {
  title: string;
  count: number;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border pb-4">
      <div>
        <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          {icon}
        </div>
        <h2 className="mt-4 text-xl font-bold text-foreground">{title}</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{children}</p>
      </div>
      <span className="rounded-full border border-border bg-background px-3 py-1 text-sm font-semibold text-foreground">
        {count}
      </span>
    </div>
  );
}

function ContactActions({ customer }: { customer: InboundRecord["customer"] }) {
  const phoneHref = telHref(customer.phone);
  const textHref = smsHref(customer.phone);

  return (
    <div className="flex flex-wrap gap-2">
      {phoneHref ? (
        <a
          className="inline-flex items-center gap-2 rounded-full bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground transition-all hover:brightness-110"
          href={phoneHref}
        >
          <Phone className="h-3.5 w-3.5" />
          Call
        </a>
      ) : null}
      {textHref ? (
        <a
          className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-2 text-xs font-semibold text-foreground transition-all hover:bg-secondary"
          href={textHref}
        >
          Text
        </a>
      ) : null}
      {customer.email ? (
        <a
          className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-2 text-xs font-semibold text-foreground transition-all hover:bg-secondary"
          href={`mailto:${customer.email}`}
        >
          <Mail className="h-3.5 w-3.5" />
          Email
        </a>
      ) : null}
    </div>
  );
}

function InboundQueueItem({ record }: { record: InboundRecord }) {
  const timingMissing = isMissingTiming(record.preferredWindow.label);
  const recordingUrl = findRecordingUrl(record);
  const voiceLead = isVoiceLead(record);

  return (
    <article className="rounded-2xl border border-border bg-card/50 p-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-bold text-foreground">{record.customer.name}</h3>
            <span className="rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
              Not promised yet
            </span>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${sourceClasses(record.source)}`}
            >
              {record.source === "text" ? (
                <MessageSquareText className="h-3.5 w-3.5" />
              ) : (
                <Phone className="h-3.5 w-3.5" />
              )}
              {sourceLabel(record.source)}
            </span>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">{record.requestedService}</p>
          <p className="mt-1 text-sm text-muted-foreground">{vehicleLabel(record.vehicle)}</p>
        </div>
        <span className={`w-fit rounded-full border px-2.5 py-1 text-xs font-semibold ${riskClasses(record.readinessRisk)}`}>
          {record.readinessRisk} risk
        </span>
      </div>

      <dl className="mt-4 grid gap-3 text-sm md:grid-cols-2">
        <div>
          <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
            Location
          </dt>
          <dd className="mt-1 text-muted-foreground">{record.location.label}</dd>
        </div>
        <div>
          <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
            Timing
          </dt>
          <dd className={timingMissing ? "mt-1 font-semibold text-red-200" : "mt-1 text-muted-foreground"}>
            {record.preferredWindow.label}
          </dd>
        </div>
      </dl>

      <div className="mt-4 rounded-2xl border border-border bg-background/50 p-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
          Next action
        </p>
        <p className="mt-2 text-sm leading-relaxed text-foreground">{record.nextAction}</p>
      </div>

      {voiceLead ? (
        <div className="mt-4 rounded-2xl border border-red-500/25 bg-red-500/10 p-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-red-200">
                Missed call / voicemail action
              </p>
              <p className="mt-2 text-sm leading-relaxed text-red-100">
                Call back first. Confirm customer, vehicle, location, timing, and whether this is
                an appointment request before promising anything.
              </p>
            </div>
            {recordingUrl ? (
              <a
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full border border-red-500/30 px-3 py-2 text-xs font-semibold text-red-100 transition-all hover:bg-red-500/15"
                href={recordingUrl}
                rel="noreferrer"
                target="_blank"
              >
                Open recording
                <ArrowRight className="h-3.5 w-3.5" />
              </a>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <ContactActions customer={record.customer} />
        <Link
          className="inline-flex items-center justify-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-semibold text-foreground transition-all hover:bg-secondary"
          href={`/ops/inbound/${record.id}`}
        >
          Open lead
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </article>
  );
}

function PromiseQueueItem({
  record,
  tone,
}: {
  record: PromiseRecord;
  tone: "waiting" | "risk" | "follow";
}) {
  const label =
    tone === "risk" ? "At risk" : tone === "follow" ? "Follow-up due" : "Promised";

  return (
    <article className="rounded-2xl border border-border bg-card/50 p-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-bold text-foreground">{record.customer.name}</h3>
            <span
              className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${
                tone === "risk"
                  ? "border-red-500/30 bg-red-500/10 text-red-200"
                  : tone === "follow"
                    ? "border-[--wr-gold]/30 bg-[--wr-gold]/10 text-[--wr-gold-soft]"
                    : "border-[--wr-teal]/30 bg-[--wr-teal]/10 text-[--wr-teal-soft]"
              }`}
            >
              {label}
            </span>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">{record.serviceScope}</p>
          <p className="mt-1 text-sm text-muted-foreground">{vehicleLabel(record.vehicle)}</p>
        </div>
        <span className={`w-fit rounded-full border px-2.5 py-1 text-xs font-semibold ${riskClasses(record.readinessRisk)}`}>
          {record.owner}
        </span>
      </div>

      <dl className="mt-4 grid gap-3 text-sm md:grid-cols-2">
        <div>
          <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
            Window
          </dt>
          <dd className="mt-1 text-muted-foreground">{record.scheduledWindow.label}</dd>
        </div>
        <div>
          <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
            Location
          </dt>
          <dd className="mt-1 text-muted-foreground">{record.location.label}</dd>
        </div>
      </dl>

      <div className="mt-4 rounded-2xl border border-border bg-background/50 p-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
          Next action
        </p>
        <p className="mt-2 text-sm leading-relaxed text-foreground">{record.nextAction}</p>
        {record.topRisks[0] ? (
          <p className="mt-2 text-sm leading-relaxed text-red-200">{record.topRisks[0]}</p>
        ) : null}
      </div>

      <div className="mt-4 flex justify-end">
        <Link
          className="inline-flex items-center justify-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-semibold text-foreground transition-all hover:bg-secondary"
          href={`/ops/promises/${record.id}`}
        >
          Open promise
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </article>
  );
}

export function PromiseBoard(props: PromiseBoardProps) {
  const promisedJobs = [...props.tomorrowAtRisk, ...props.promisesWaiting];

  return (
    <div className="space-y-8">
      <header className="border-b border-border pb-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3.5 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              <Wrench className="h-3.5 w-3.5" />
              WrenchReady Today Queue
            </span>
            <h1 className="mt-5 text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
              Calls, promises, follow-up.
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              Log dispatched jobs first. Then work new requests and follow-up.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:items-end">
            <p className="text-sm text-muted-foreground">
              Snapshot {formatBoardTime(props.generatedAt)}
            </p>
          </div>
        </div>

        <div className="mt-8">
          <QuickDispatchForm />
        </div>

        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-border bg-card/50 p-4">
            <p className="text-3xl font-bold text-foreground">{props.metrics.newInbound}</p>
            <p className="mt-1 text-sm text-muted-foreground">new requests</p>
          </div>
          <div className="rounded-2xl border border-border bg-card/50 p-4">
            <p className="text-3xl font-bold text-foreground">
              {props.metrics.promisesWaiting + props.metrics.tomorrowAtRisk}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">promised jobs</p>
          </div>
          <div className="rounded-2xl border border-border bg-card/50 p-4">
            <p className="text-3xl font-bold text-foreground">{props.metrics.followThroughDue}</p>
            <p className="mt-1 text-sm text-muted-foreground">follow-up due</p>
          </div>
        </div>
      </header>

      <section className="grid gap-8 xl:grid-cols-[1.1fr_1fr_1fr]">
        <div className="space-y-4">
          <QueueHeader title="New Requests" count={props.inbound.length} icon={<Phone className="h-5 w-5" />}>
            Contact these first. Nothing here has a real appointment promise yet.
          </QueueHeader>
          {props.inbound.length ? (
            props.inbound.map((record) => <InboundQueueItem key={record.id} record={record} />)
          ) : (
            <EmptyState>No new requests need qualification.</EmptyState>
          )}
        </div>

        <div className="space-y-4">
          <QueueHeader
            title="Promised Jobs"
            count={promisedJobs.length}
            icon={<CalendarClock className="h-5 w-5" />}
          >
            These customers believe something specific will happen. Reduce risk before the day starts.
          </QueueHeader>
          {promisedJobs.length ? (
            promisedJobs.map((record) => (
              <PromiseQueueItem
                key={record.id}
                record={record}
                tone={record.status === "tomorrow-at-risk" ? "risk" : "waiting"}
              />
            ))
          ) : (
            <EmptyState>No active promised jobs are waiting.</EmptyState>
          )}
        </div>

        <div className="space-y-4">
          <QueueHeader
            title="Follow-Up Due"
            count={props.followThroughDue.length}
            icon={<TimerReset className="h-5 w-5" />}
          >
            The job is not finished until the recap, payment, review ask, or next step is clear.
          </QueueHeader>
          {props.followThroughDue.length ? (
            props.followThroughDue.map((record) => (
              <PromiseQueueItem key={record.id} record={record} tone="follow" />
            ))
          ) : (
            <EmptyState>No follow-up is due from the promise records.</EmptyState>
          )}
        </div>
      </section>

      {props.metrics.tomorrowAtRisk > 0 ? (
        <section className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm leading-relaxed text-red-100">
          <div className="flex gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
            <p>
              {props.metrics.tomorrowAtRisk} promised job
              {props.metrics.tomorrowAtRisk === 1 ? "" : "s"} need risk reduction before the
              route starts.
            </p>
          </div>
        </section>
      ) : (
        <section className="rounded-2xl border border-[--wr-teal]/20 bg-[--wr-teal]/10 p-4 text-sm leading-relaxed text-[--wr-teal-soft]">
          <div className="flex gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
            <p>No tomorrow-at-risk promises are currently flagged.</p>
          </div>
        </section>
      )}
    </div>
  );
}
