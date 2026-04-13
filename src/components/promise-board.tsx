import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  CircleCheckBig,
  ClipboardList,
  HandCoins,
  Phone,
  ShieldAlert,
  TimerReset,
  UserRound,
  Wrench,
} from "lucide-react";
import { computePromiseEconomics } from "@/lib/promise-crm/economics";
import type {
  InboundRecord,
  PromiseBoardMetrics,
  PromiseEconomicsRollup,
  PromiseRecord,
  ReadinessRisk,
} from "@/lib/promise-crm/types";
import type { WrenchReadyIntegrationSnapshot } from "@/lib/promise-crm/integrations";

type PromiseBoardProps = {
  generatedAt: string;
  metrics: PromiseBoardMetrics;
  economics: PromiseEconomicsRollup;
  inbound: InboundRecord[];
  promisesWaiting: PromiseRecord[];
  tomorrowAtRisk: PromiseRecord[];
  followThroughDue: PromiseRecord[];
  integrations: WrenchReadyIntegrationSnapshot;
};

function riskClasses(risk: ReadinessRisk) {
  if (risk === "high") {
    return "border-red-500/20 bg-red-500/10 text-red-300";
  }

  if (risk === "medium") {
    return "border-[--wr-gold]/20 bg-[--wr-gold]/10 text-[--wr-gold-soft]";
  }

  return "border-[--wr-teal]/20 bg-[--wr-teal]/10 text-[--wr-teal-soft]";
}

function sourceLabel(source: InboundRecord["source"]) {
  return source.replace(/^\w/, (value) => value.toUpperCase());
}

function serviceClassLabel(value?: InboundRecord["serviceClass"]) {
  if (value === "hero-core") return "Hero / core";
  if (value === "selective") return "Selective";
  if (value === "never-standalone") return "Never standalone";
  return "Needs policy";
}

function marketingRoleLabel(value?: InboundRecord["marketingRole"]) {
  if (value === "hero") return "Hero";
  if (value === "demand-capture") return "Demand capture";
  if (value === "hero-b2b") return "Hero for B2B";
  return "Needs role";
}

function dispatchTierLabel(value?: InboundRecord["dispatchTier"]) {
  if (value === "dispatch-first") return "Dispatch first";
  if (value === "selective-screening") return "Selective screening";
  if (value === "bundle-only") return "Bundle only";
  if (value === "decline-standalone") return "Decline standalone";
  return "Needs tier";
}

function vehicleLabel(vehicle: InboundRecord["vehicle"] | PromiseRecord["vehicle"]) {
  return `${vehicle.year} ${vehicle.make} ${vehicle.model}`;
}

function formatBoardTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatCompactCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function StatCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  tone: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card/60 p-5 backdrop-blur-sm">
      <div className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl ${tone}`}>
        {icon}
      </div>
      <p className="mt-4 text-3xl font-bold text-foreground">{value}</p>
      <p className="mt-1 text-sm text-muted-foreground">{label}</p>
    </div>
  );
}

function InboundCard({ record }: { record: InboundRecord }) {
  return (
    <Link
      href={`/ops/inbound/${record.id}`}
      className="block rounded-2xl border border-border bg-background/60 p-4 transition-all hover:border-primary/30 hover:bg-background/80"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-foreground">{record.customer.name}</p>
          <p className="mt-1 text-xs text-muted-foreground">{vehicleLabel(record.vehicle)}</p>
        </div>
        <span
          className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${riskClasses(record.readinessRisk)}`}
        >
          {record.readinessRisk} risk
        </span>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <span className="rounded-full border border-border bg-card px-2.5 py-1 text-[11px] text-muted-foreground">
          {sourceLabel(record.source)}
        </span>
        <span className="rounded-full border border-border bg-card px-2.5 py-1 text-[11px] text-muted-foreground">
          {record.location.territory}
        </span>
        <span className="rounded-full border border-border bg-card px-2.5 py-1 text-[11px] text-muted-foreground">
          {serviceClassLabel(record.serviceClass)}
        </span>
        <span className="rounded-full border border-border bg-card px-2.5 py-1 text-[11px] text-muted-foreground">
          {dispatchTierLabel(record.dispatchTier)}
        </span>
      </div>

      <p className="mt-4 text-sm font-medium text-foreground">{record.requestedService}</p>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{record.symptomSummary}</p>

      <div className="mt-4 rounded-xl border border-border/70 bg-card/50 p-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Next action</p>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{record.nextAction}</p>
        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
          Marketed as: {record.marketingOffer || record.requestedService} ({marketingRoleLabel(record.marketingRole)})
        </p>
        {record.pricingGuardrails?.[0] ? (
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
            Guardrail: {record.pricingGuardrails[0]}
          </p>
        ) : null}
      </div>

      <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
        <span>{record.owner}</span>
        <span>{record.preferredWindow.label}</span>
      </div>
    </Link>
  );
}

function PromiseCard({ record }: { record: PromiseRecord }) {
  const economics = computePromiseEconomics(record.economics);

  return (
    <Link
      href={`/ops/promises/${record.id}`}
      className="block rounded-2xl border border-border bg-background/60 p-4 transition-all hover:border-primary/30 hover:bg-background/80"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-foreground">{record.customer.name}</p>
          <p className="mt-1 text-xs text-muted-foreground">{vehicleLabel(record.vehicle)}</p>
        </div>
        <span
          className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${riskClasses(record.readinessRisk)}`}
        >
          {record.readinessRisk} risk
        </span>
      </div>

      <p className="mt-4 text-sm font-medium text-foreground">{record.serviceScope}</p>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{record.readinessSummary}</p>

      <div className="mt-4 rounded-xl border border-border/70 bg-card/50 p-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
          What could break the promise
        </p>
        {record.topRisks.length > 0 ? (
          <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
            {record.topRisks.slice(0, 2).map((risk) => (
              <li key={risk} className="flex gap-2">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[--wr-gold]" />
                {risk}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">No active blockers right now.</p>
        )}
      </div>

      {economics ? (
        <div className="mt-4 rounded-xl border border-border/70 bg-card/50 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
            Economics snapshot
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Revenue ${economics.revenue.toFixed(2)} / Net profit ${economics.netProfitEstimateAmount.toFixed(2)}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            {economics.netProfitPerClockHour !== undefined
              ? `$${economics.netProfitPerClockHour.toFixed(2)} net profit per clock hour`
              : "Add labor + travel hours for per-hour view"}
          </p>
        </div>
      ) : null}

      <div className="mt-4 flex items-center justify-between gap-3 text-xs text-muted-foreground">
        <span>{record.owner}</span>
        <span>{record.scheduledWindow.label}</span>
      </div>
    </Link>
  );
}

function BoardColumn({
  title,
  description,
  icon,
  count,
  children,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-border bg-card/50 p-5 backdrop-blur-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            {icon}
          </div>
          <h2 className="mt-4 text-xl font-bold text-foreground">{title}</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p>
        </div>
        <span className="rounded-full border border-border bg-background/70 px-3 py-1 text-sm font-semibold text-foreground">
          {count}
        </span>
      </div>
      <div className="mt-6 space-y-4">{children}</div>
    </section>
  );
}

function IntegrationCard({
  label,
  configured,
  summary,
}: {
  label: string;
  configured: boolean;
  summary: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-background/60 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-foreground">{label}</p>
        <span
          className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
            configured
              ? "border-[--wr-teal]/20 bg-[--wr-teal]/10 text-[--wr-teal-soft]"
              : "border-red-500/20 bg-red-500/10 text-red-200"
          }`}
        >
          {configured ? "Ready" : "Missing"}
        </span>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{summary}</p>
    </div>
  );
}

export function PromiseBoard(props: PromiseBoardProps) {
  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-[2rem] border border-border bg-card/60 p-6 backdrop-blur-sm sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3.5 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              <Wrench className="h-3.5 w-3.5" />
              WrenchReady Promise Board
            </span>
            <h1 className="mt-5 text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
              Make promises carefully. Keep them visibly.
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              This board is the operating heartbeat: what just came in, what is promised, what
              could break tomorrow, and what still needs follow-through after the wrench stops
              turning.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/ops/inbound/new"
                className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-all hover:brightness-110"
              >
                <Phone className="h-4 w-4" />
                Add manual inbound
              </Link>
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 rounded-full border border-border px-5 py-3 text-sm font-medium text-foreground transition-all hover:bg-secondary"
              >
                Public request flow
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-background/60 px-4 py-3 text-sm text-muted-foreground">
            Snapshot generated {formatBoardTime(props.generatedAt)}
          </div>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            icon={<ClipboardList className="h-5 w-5" />}
            label="New inbound needing qualification"
            value={props.metrics.newInbound}
            tone="bg-primary/10 text-primary"
          />
          <StatCard
            icon={<CalendarClock className="h-5 w-5" />}
            label="Promises waiting on clean execution"
            value={props.metrics.promisesWaiting}
            tone="bg-[--wr-teal]/10 text-[--wr-teal]"
          />
          <StatCard
            icon={<ShieldAlert className="h-5 w-5" />}
            label="Tomorrow promises at risk"
            value={props.metrics.tomorrowAtRisk}
            tone="bg-[--wr-gold]/10 text-[--wr-gold]"
          />
          <StatCard
            icon={<TimerReset className="h-5 w-5" />}
            label="Follow-through due today"
            value={props.metrics.followThroughDue}
            tone="bg-red-500/10 text-red-300"
          />
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-border bg-background/60 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
              Promises with economics
            </p>
            <p className="mt-2 text-2xl font-bold text-foreground">{props.economics.trackedPromises}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Promises currently teaching the machine what healthy work looks like.
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-background/60 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
              Revenue in view
            </p>
            <p className="mt-2 text-2xl font-bold text-foreground">
              {formatCompactCurrency(props.economics.totalRevenue)}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Sum of captured quote or invoice values on tracked promises.
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-background/60 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
              Net profit in view
            </p>
            <p className="mt-2 text-2xl font-bold text-foreground">
              {formatCompactCurrency(props.economics.totalNetProfitEstimate)}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {props.economics.averageNetProfitPerClockHour !== undefined
                ? `${formatCompactCurrency(props.economics.averageNetProfitPerClockHour)} avg net profit per clock hour`
                : "Add labor and travel hours to unlock per-hour economics."}
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href="/ops/insights"
            className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground transition-all hover:bg-secondary"
          >
            Offer performance report
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/ops/follow-through"
            className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground transition-all hover:bg-secondary"
          >
            <HandCoins className="h-4 w-4" />
            Follow-through worklist
          </Link>
          <Link
            href="/ops/outbound"
            className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground transition-all hover:bg-secondary"
          >
            <Phone className="h-4 w-4" />
            Outbound queue
          </Link>
          <Link
            href="/ops/tomorrow"
            className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground transition-all hover:bg-secondary"
          >
            <CalendarClock className="h-4 w-4" />
            Tomorrow readiness
          </Link>
          <Link
            href="/ops/owners"
            className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground transition-all hover:bg-secondary"
          >
            <UserRound className="h-4 w-4" />
            Owner cockpits
          </Link>
          <Link
            href="/ops/playbooks"
            className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground transition-all hover:bg-secondary"
          >
            <ClipboardList className="h-4 w-4" />
            Operator playbooks
          </Link>
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background/60 px-4 py-2 text-sm text-muted-foreground">
            {formatPercent(
              props.metrics.promisesWaiting /
                Math.max(
                  props.metrics.promisesWaiting +
                    props.metrics.tomorrowAtRisk +
                    props.metrics.followThroughDue,
                  1,
                ),
            )}{" "}
            of active promises are currently in clean waiting state
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <IntegrationCard
            label="Supabase"
            configured={props.integrations.supabase.configured}
            summary={props.integrations.supabase.summary}
          />
          <IntegrationCard
            label="Ops Webhook"
            configured={props.integrations.opsWebhook.configured}
            summary={props.integrations.opsWebhook.summary}
          />
          <IntegrationCard
            label="Twilio Voice"
            configured={props.integrations.twilioVoice.configured}
            summary={props.integrations.twilioVoice.summary}
          />
          <IntegrationCard
            label="Twilio Messaging"
            configured={props.integrations.twilioMessaging.configured}
            summary={props.integrations.twilioMessaging.summary}
          />
          <IntegrationCard
            label="Voicemail Alerts"
            configured={props.integrations.twilioNotifications.configured}
            summary={props.integrations.twilioNotifications.summary}
          />
          <IntegrationCard
            label="Ops SMS Alerts"
            configured={props.integrations.opsSmsAlerts.configured}
            summary={props.integrations.opsSmsAlerts.summary}
          />
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-4">
        <BoardColumn
          title="New Inbound"
          description="Every lead lands here first. Nothing should skip qualification and become a fake promise by accident."
          icon={<Phone className="h-5 w-5" />}
          count={props.inbound.length}
        >
          {props.inbound.map((record) => (
            <InboundCard key={record.id} record={record} />
          ))}
        </BoardColumn>

        <BoardColumn
          title="Promises Waiting"
          description="These customers already believe something specific will happen. Protect the day, the parts, and the arrival window."
          icon={<CircleCheckBig className="h-5 w-5" />}
          count={props.promisesWaiting.length}
        >
          {props.promisesWaiting.map((record) => (
            <PromiseCard key={record.id} record={record} />
          ))}
        </BoardColumn>

        <BoardColumn
          title="Tomorrow At Risk"
          description="These are the promises most likely to break if someone does not intervene early."
          icon={<AlertTriangle className="h-5 w-5" />}
          count={props.tomorrowAtRisk.length}
        >
          {props.tomorrowAtRisk.map((record) => (
            <PromiseCard key={record.id} record={record} />
          ))}
        </BoardColumn>

        <BoardColumn
          title="Follow-through Due"
          description="The visit is not over until the recap, deferred work, and next visit path are clear to the customer."
          icon={<ArrowRight className="h-5 w-5" />}
          count={props.followThroughDue.length}
        >
          {props.followThroughDue.map((record) => (
            <PromiseCard key={record.id} record={record} />
          ))}
        </BoardColumn>
      </section>
    </div>
  );
}
