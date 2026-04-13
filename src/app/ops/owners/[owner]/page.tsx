import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowRight,
  ArrowLeft,
  CalendarClock,
  ClipboardList,
  HandCoins,
  Phone,
  ShieldAlert,
  TimerReset,
  Wrench,
} from "lucide-react";
import { getOwnerExecutionSnapshot } from "@/lib/promise-crm/server";
import type {
  InboundRecord,
  OwnerDailyPriority,
  PromiseRecord,
  WrenchReadyOwner,
} from "@/lib/promise-crm/types";

type OwnerPageProps = {
  params: Promise<{ owner: string }>;
};

export const metadata: Metadata = {
  title: "Owner Cockpit",
  robots: {
    index: false,
    follow: false,
  },
};

export const dynamic = "force-dynamic";

function isOwner(value: string): value is WrenchReadyOwner {
  return value === "Dez" || value === "Simon";
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function riskClasses(risk: InboundRecord["readinessRisk"] | PromiseRecord["readinessRisk"]) {
  if (risk === "high") return "border-red-500/20 bg-red-500/10 text-red-200";
  if (risk === "medium") return "border-[--wr-gold]/20 bg-[--wr-gold]/10 text-[--wr-gold-soft]";
  return "border-[--wr-teal]/20 bg-[--wr-teal]/10 text-[--wr-teal-soft]";
}

function vehicleLabel(vehicle: InboundRecord["vehicle"] | PromiseRecord["vehicle"]) {
  return `${vehicle.year} ${vehicle.make} ${vehicle.model}`;
}

function priorityToneClasses(tone: OwnerDailyPriority["tone"]) {
  if (tone === "risk") return "border-red-500/20 bg-red-500/10 text-red-200";
  if (tone === "follow-through") return "border-[--wr-gold]/20 bg-[--wr-gold]/10 text-[--wr-gold-soft]";
  if (tone === "inbound") return "border-primary/20 bg-primary/10 text-primary";
  if (tone === "execution") return "border-[--wr-teal]/20 bg-[--wr-teal]/10 text-[--wr-teal-soft]";
  return "border-border bg-background/70 text-muted-foreground";
}

export default async function OwnerCockpitPage({ params }: OwnerPageProps) {
  const { owner } = await params;

  if (!isOwner(owner)) {
    notFound();
  }

  const snapshot = await getOwnerExecutionSnapshot(owner);

  return (
    <div className="shell py-10 sm:py-14">
      <Link
        href="/ops/owners"
        className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to owner cockpits
      </Link>

      <section className="mt-6 overflow-hidden rounded-[2rem] border border-border bg-card/60 p-6 backdrop-blur-sm sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3.5 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              <Wrench className="h-3.5 w-3.5" />
              {snapshot.owner} Cockpit
            </span>
            <h1 className="mt-5 text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
              {snapshot.owner}&rsquo;s daily execution board
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              {snapshot.focusMessage}
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-background/60 px-4 py-3 text-sm text-muted-foreground">
            {snapshot.metrics.completedTrackedPromises} completed priced promises in view
          </div>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-border bg-background/60 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
              Owned inbound
            </p>
            <p className="mt-2 text-2xl font-bold text-foreground">{snapshot.metrics.inboundOwned}</p>
          </div>
          <div className="rounded-2xl border border-border bg-background/60 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
              Promises waiting
            </p>
            <p className="mt-2 text-2xl font-bold text-foreground">{snapshot.metrics.promisesWaiting}</p>
          </div>
          <div className="rounded-2xl border border-border bg-background/60 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
              Tomorrow at risk
            </p>
            <p className="mt-2 text-2xl font-bold text-foreground">{snapshot.metrics.tomorrowAtRisk}</p>
          </div>
          <div className="rounded-2xl border border-border bg-background/60 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
              Follow-through open
            </p>
            <p className="mt-2 text-2xl font-bold text-foreground">{snapshot.metrics.followThroughOpen}</p>
          </div>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-border bg-background/60 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
              Revenue in view
            </p>
            <p className="mt-2 text-2xl font-bold text-foreground">
              {formatCurrency(snapshot.metrics.revenueInView)}
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-background/60 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
              Net profit in view
            </p>
            <p className="mt-2 text-2xl font-bold text-foreground">
              {formatCurrency(snapshot.metrics.netProfitInView)}
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-background/60 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
              Deferred value open
            </p>
            <p className="mt-2 text-2xl font-bold text-foreground">
              {formatCurrency(snapshot.metrics.deferredValueOpen)}
            </p>
          </div>
        </div>
      </section>

      <section className="mt-6 rounded-3xl border border-border bg-card/50 p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-foreground">Do these first today</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              This brief is generated from the live queue so {snapshot.owner} can act without re-reading the whole board.
            </p>
          </div>
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <ClipboardList className="h-5 w-5" />
          </div>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          {snapshot.dailyPriorities.map((item, index) => (
            <Link
              key={`${item.title}-${index}`}
              href={item.href}
              className="rounded-2xl border border-border bg-background/60 p-4 transition-all hover:border-primary/30 hover:bg-background/80"
            >
              <div className="flex items-center justify-between gap-3">
                <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${priorityToneClasses(item.tone)}`}>
                  Priority {index + 1}
                </span>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-foreground">{item.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{item.detail}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-6 grid gap-5 xl:grid-cols-4">
        <section className="rounded-3xl border border-border bg-card/50 p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Phone className="h-5 w-5" />
              </div>
              <h2 className="mt-4 text-xl font-bold text-foreground">Owned inbound</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Leads already assigned to {snapshot.owner} but not yet promoted into real promises.
              </p>
            </div>
            <span className="rounded-full border border-border bg-background/70 px-3 py-1 text-sm font-semibold text-foreground">
              {snapshot.inbound.length}
            </span>
          </div>
          <div className="mt-6 space-y-4">
            {snapshot.inbound.length > 0 ? (
              snapshot.inbound.map((record) => (
                <Link
                  key={record.id}
                  href={`/ops/inbound/${record.id}`}
                  className="block rounded-2xl border border-border bg-background/60 p-4 transition-all hover:border-primary/30 hover:bg-background/80"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{record.customer.name}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{vehicleLabel(record.vehicle)}</p>
                    </div>
                    <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${riskClasses(record.readinessRisk)}`}>
                      {record.readinessRisk} risk
                    </span>
                  </div>
                  <p className="mt-3 text-sm text-muted-foreground">{record.nextAction}</p>
                </Link>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-border bg-background/40 p-4 text-sm text-muted-foreground">
                No owned inbound waiting right now.
              </div>
            )}
          </div>
        </section>

        <section className="rounded-3xl border border-border bg-card/50 p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <CalendarClock className="h-5 w-5" />
              </div>
              <h2 className="mt-4 text-xl font-bold text-foreground">Promises waiting</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Work already promised that now needs clean execution, not more theory.
              </p>
            </div>
            <span className="rounded-full border border-border bg-background/70 px-3 py-1 text-sm font-semibold text-foreground">
              {snapshot.promisesWaiting.length}
            </span>
          </div>
          <div className="mt-6 space-y-4">
            {snapshot.promisesWaiting.length > 0 ? (
              snapshot.promisesWaiting.map((record) => (
                <Link
                  key={record.id}
                  href={`/ops/promises/${record.id}`}
                  className="block rounded-2xl border border-border bg-background/60 p-4 transition-all hover:border-primary/30 hover:bg-background/80"
                >
                  <p className="text-sm font-semibold text-foreground">{record.customer.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{record.serviceScope}</p>
                  <p className="mt-3 text-sm text-muted-foreground">{record.nextAction}</p>
                </Link>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-border bg-background/40 p-4 text-sm text-muted-foreground">
                No clean waiting promises right now.
              </div>
            )}
          </div>
        </section>

        <section className="rounded-3xl border border-border bg-card/50 p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[--wr-gold]/10 text-[--wr-gold]">
                <ShieldAlert className="h-5 w-5" />
              </div>
              <h2 className="mt-4 text-xl font-bold text-foreground">Tomorrow at risk</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                These are the promises most likely to break unless {snapshot.owner} intervenes early.
              </p>
            </div>
            <span className="rounded-full border border-border bg-background/70 px-3 py-1 text-sm font-semibold text-foreground">
              {snapshot.tomorrowAtRisk.length}
            </span>
          </div>
          <div className="mt-6 space-y-4">
            {snapshot.tomorrowAtRisk.length > 0 ? (
              snapshot.tomorrowAtRisk.map((record) => (
                <Link
                  key={record.id}
                  href={`/ops/promises/${record.id}`}
                  className="block rounded-2xl border border-border bg-background/60 p-4 transition-all hover:border-primary/30 hover:bg-background/80"
                >
                  <p className="text-sm font-semibold text-foreground">{record.customer.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{record.serviceScope}</p>
                  <p className="mt-3 text-sm text-muted-foreground">
                    {record.topRisks[0] || record.readinessSummary}
                  </p>
                </Link>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-border bg-background/40 p-4 text-sm text-muted-foreground">
                No tomorrow-risk promises right now.
              </div>
            )}
          </div>
        </section>

        <section className="rounded-3xl border border-border bg-card/50 p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <TimerReset className="h-5 w-5" />
              </div>
              <h2 className="mt-4 text-xl font-bold text-foreground">Follow-through</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Value still open after the visit. This is where trust turns into more revenue or leaks out.
              </p>
            </div>
            <span className="rounded-full border border-border bg-background/70 px-3 py-1 text-sm font-semibold text-foreground">
              {snapshot.followThrough.length}
            </span>
          </div>
          <div className="mt-6 space-y-4">
            {snapshot.followThrough.length > 0 ? (
              snapshot.followThrough.map((task) => (
                <Link
                  key={task.promiseId}
                  href={`/ops/promises/${task.promiseId}`}
                  className="block rounded-2xl border border-border bg-background/60 p-4 transition-all hover:border-primary/30 hover:bg-background/80"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-foreground">{task.customerName}</p>
                    <span className="rounded-full border border-border bg-card px-2.5 py-1 text-[11px] text-muted-foreground">
                      {task.reason}
                    </span>
                  </div>
                  <p className="mt-3 text-sm text-muted-foreground">{task.recommendedAction}</p>
                  <p className="mt-3 text-xs text-muted-foreground">
                    Deferred value {formatCurrency(task.deferredValueAmount ?? 0)}
                  </p>
                </Link>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-border bg-background/40 p-4 text-sm text-muted-foreground">
                No open follow-through assigned right now.
              </div>
            )}
          </div>
        </section>
      </section>

      <section className="mt-6 rounded-3xl border border-border bg-card/50 p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-foreground">Recent completed promises</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Use this section to remember what recently closed, what was learned, and where the real money came from.
            </p>
          </div>
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <HandCoins className="h-5 w-5" />
          </div>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          {snapshot.completedPromises.length > 0 ? (
            snapshot.completedPromises.map((record) => (
              <Link
                key={record.id}
                href={`/ops/promises/${record.id}`}
                className="rounded-2xl border border-border bg-background/60 p-4 transition-all hover:border-primary/30 hover:bg-background/80"
              >
                <p className="text-sm font-semibold text-foreground">{record.customer.name}</p>
                <p className="mt-1 text-xs text-muted-foreground">{record.serviceScope}</p>
                <p className="mt-3 text-sm text-muted-foreground">
                  {record.followThroughResolution?.summary || record.readinessSummary}
                </p>
              </Link>
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-border bg-background/40 p-4 text-sm text-muted-foreground">
              No completed promises assigned to {snapshot.owner} yet.
            </div>
          )}
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            href="/ops/follow-through"
            className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground transition-all hover:bg-secondary"
          >
            Follow-through queue
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/ops/insights"
            className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground transition-all hover:bg-secondary"
          >
            Offer performance
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}
