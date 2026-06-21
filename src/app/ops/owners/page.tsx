import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ShieldAlert, TimerReset, UserRound, Wrench } from "lucide-react";
import { OpsPageHeader } from "@/components/ops-page-header";
import { getOwnerExecutionOverview } from "@/lib/promise-crm/server";

export const metadata: Metadata = {
  title: "Owner Cockpits",
  robots: {
    index: false,
    follow: false,
  },
};

export const dynamic = "force-dynamic";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export default async function OwnerCockpitIndexPage() {
  const snapshots = await getOwnerExecutionOverview();

  return (
    <div className="shell py-10 sm:py-14">
      <OpsPageHeader
        eyebrow="Owner Cockpits"
        icon={UserRound}
        title="Give each owner a daily machine, not just a shared board."
        description="These owner views compress the shared ops system into something Dez or Simon can run from directly: their inbound, their risk, their follow-through, and their money in view."
      />

      <section className="mt-6 grid gap-5 lg:grid-cols-2">
        {snapshots.map((snapshot) => (
          <Link
            key={snapshot.owner}
            href={`/ops/owners/${snapshot.owner}`}
            className="rounded-3xl border border-border bg-card/50 p-6 transition-all hover:border-primary/30 hover:bg-card/70"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                  {snapshot.owner}
                </p>
                <h2 className="mt-2 text-3xl font-bold text-foreground">{snapshot.owner}&rsquo;s cockpit</h2>
                <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
                  {snapshot.focusMessage}
                </p>
              </div>
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Wrench className="h-5 w-5" />
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-border bg-background/60 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                  Owned inbound
                </p>
                <p className="mt-2 text-2xl font-bold text-foreground">{snapshot.metrics.inboundOwned}</p>
              </div>
              <div className="rounded-2xl border border-border bg-background/60 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                  Tomorrow risk
                </p>
                <p className="mt-2 text-2xl font-bold text-foreground">{snapshot.metrics.tomorrowAtRisk}</p>
              </div>
              <div className="rounded-2xl border border-border bg-background/60 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                  Follow-through
                </p>
                <p className="mt-2 text-2xl font-bold text-foreground">{snapshot.metrics.followThroughOpen}</p>
              </div>
              <div className="rounded-2xl border border-border bg-background/60 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                  Net profit in view
                </p>
                <p className="mt-2 text-2xl font-bold text-foreground">
                  {formatCurrency(snapshot.metrics.netProfitInView)}
                </p>
              </div>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-border bg-background/60 p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <ShieldAlert className="h-4 w-4 text-[var(--wr-gold)]" />
                  Risk + execution
                </div>
                <p className="mt-3 text-sm text-muted-foreground">
                  {snapshot.metrics.promisesWaiting} promises waiting / {snapshot.metrics.tomorrowAtRisk} tomorrow at risk
                </p>
              </div>
              <div className="rounded-2xl border border-border bg-background/60 p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <TimerReset className="h-4 w-4 text-primary" />
                  Value still open
                </div>
                <p className="mt-3 text-sm text-muted-foreground">
                  {formatCurrency(snapshot.metrics.deferredValueOpen)} deferred value still sitting in the queue
                </p>
              </div>
            </div>

            <div className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-foreground">
              Open cockpit
              <ArrowRight className="h-4 w-4" />
            </div>
          </Link>
        ))}
      </section>
    </div>
  );
}
