import type { Metadata } from "next";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  CalendarClock,
  CircleCheckBig,
  ShieldAlert,
} from "lucide-react";
import { getTomorrowReadinessSnapshot } from "@/lib/promise-crm/server";

export const metadata: Metadata = {
  title: "Tomorrow Readiness",
  robots: {
    index: false,
    follow: false,
  },
};

export const dynamic = "force-dynamic";

function readinessClasses(score: number) {
  if (score >= 82) return "border-[--wr-teal]/20 bg-[--wr-teal]/10 text-[--wr-teal-soft]";
  if (score >= 55) return "border-[--wr-gold]/20 bg-[--wr-gold]/10 text-[--wr-gold-soft]";
  return "border-red-500/20 bg-red-500/10 text-red-200";
}

function formatCurrency(value?: number) {
  if (value === undefined) return "No economics yet";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function StatCard({
  label,
  value,
  description,
}: {
  label: string;
  value: string | number;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-background/60 p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">{label}</p>
      <p className="mt-2 text-2xl font-bold text-foreground">{value}</p>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

export default async function TomorrowReadinessPage() {
  const snapshot = await getTomorrowReadinessSnapshot();

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
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3.5 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              <CalendarClock className="h-3.5 w-3.5" />
              Tomorrow Readiness
            </span>
            <h1 className="mt-5 text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
              Make tomorrow true before tomorrow gets here.
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              This is the keep-the-promise view: customer certainty plus route and job readiness in one place.
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-background/60 px-4 py-3 text-sm text-muted-foreground">
            {snapshot.total} active promises in tomorrow view
          </div>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Average readiness"
            value={`${snapshot.averageReadinessScore}%`}
            description="How believable tomorrow currently is across active promises."
          />
          <StatCard
            label="Ready now"
            value={snapshot.readyNow}
            description="Promises that already have the basics locked."
          />
          <StatCard
            label="Needs attention"
            value={snapshot.needsAttention}
            description="Promises still carrying blockers that can break tomorrow."
          />
          <StatCard
            label="Generated"
            value={new Intl.DateTimeFormat("en-US", {
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
            }).format(new Date(snapshot.generatedAt))}
            description="Live pull from the current promise records."
          />
        </div>
      </section>

      <section className="mt-6 space-y-5">
        {snapshot.promises.length > 0 ? (
          snapshot.promises.map((item) => (
            <div
              key={item.promiseId}
              className="rounded-3xl border border-border bg-card/50 p-5"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="max-w-3xl">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${readinessClasses(item.readinessScore)}`}
                    >
                      {item.readinessScore}% ready
                    </span>
                    <span className="rounded-full border border-border bg-background/70 px-2.5 py-1 text-[11px] text-muted-foreground">
                      {item.owner}
                    </span>
                    <span className="rounded-full border border-border bg-background/70 px-2.5 py-1 text-[11px] text-muted-foreground">
                      {item.territory}
                    </span>
                    <span className="rounded-full border border-border bg-background/70 px-2.5 py-1 text-[11px] text-muted-foreground">
                      {item.scheduledWindowLabel}
                    </span>
                  </div>
                  <h2 className="mt-4 text-xl font-bold text-foreground">{item.customerName}</h2>
                  <p className="mt-2 text-sm font-medium text-foreground">{item.serviceScope}</p>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.nextAction}</p>
                </div>

                <div className="rounded-2xl border border-border bg-background/60 px-4 py-3 text-sm text-muted-foreground">
                  Net profit in view: {formatCurrency(item.netProfitEstimateAmount)}
                </div>
              </div>

              <div className="mt-5 grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
                <div className="rounded-2xl border border-border bg-background/60 p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <ShieldAlert className="h-4 w-4 text-primary" />
                    Customer certainty
                  </div>
                  <div className="mt-4 grid gap-2 sm:grid-cols-2">
                    {[
                      ["Contact confirmed", item.customerCertainty.contactConfirmed],
                      ["Arrival window shared", item.customerCertainty.arrivalWindowShared],
                      ["Pricing expectation shared", item.customerCertainty.pricingExpectationShared],
                      ["Updates plan shared", item.customerCertainty.updatesPlanShared],
                      ["Follow-up explained", item.customerCertainty.followUpExplained],
                    ].map(([label, value]) => (
                      <div
                        key={label as string}
                        className={`rounded-xl border px-3 py-3 text-sm ${
                          value
                            ? "border-[--wr-teal]/20 bg-[--wr-teal]/10 text-[--wr-teal-soft]"
                            : "border-red-500/20 bg-red-500/10 text-red-200"
                        }`}
                      >
                        {label as string}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-border bg-background/60 p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <CircleCheckBig className="h-4 w-4 text-primary" />
                    Day readiness
                  </div>
                  <div className="mt-4 grid gap-2 sm:grid-cols-2">
                    {[
                      ["Customer confirmed", item.dayReadiness.customerConfirmed],
                      ["Location confirmed", item.dayReadiness.locationConfirmed],
                      ["Parts confirmed", item.dayReadiness.partsConfirmed],
                      ["Tools confirmed", item.dayReadiness.toolsConfirmed],
                      ["Route locked", item.dayReadiness.routeLocked],
                      ["Payment method ready", item.dayReadiness.paymentMethodReady],
                    ].map(([label, value]) => (
                      <div
                        key={label as string}
                        className={`rounded-xl border px-3 py-3 text-sm ${
                          value
                            ? "border-[--wr-teal]/20 bg-[--wr-teal]/10 text-[--wr-teal-soft]"
                            : "border-red-500/20 bg-red-500/10 text-red-200"
                        }`}
                      >
                        {label as string}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-5 rounded-2xl border border-border bg-background/60 p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <AlertTriangle className="h-4 w-4 text-primary" />
                  What can still break tomorrow
                </div>
                {item.blockers.length > 0 ? (
                  <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                    {item.blockers.map((blocker) => (
                      <li key={blocker} className="flex gap-2">
                        <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[--wr-gold]" />
                        {blocker}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-4 text-sm text-muted-foreground">
                    No active blockers right now. This promise currently looks believable.
                  </p>
                )}
              </div>

              <div className="mt-4">
                <Link
                  href={`/ops/promises/${item.promiseId}`}
                  className="inline-flex items-center gap-2 rounded-full border border-border bg-background/70 px-4 py-2 text-sm font-semibold text-foreground transition-transform hover:-translate-y-0.5"
                >
                  Open promise
                </Link>
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-3xl border border-border bg-card/50 p-6 text-sm text-muted-foreground">
            No active promises are waiting on tomorrow readiness right now.
          </div>
        )}
      </section>
    </div>
  );
}
