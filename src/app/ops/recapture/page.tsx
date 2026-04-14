import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight, CalendarSync } from "lucide-react";
import { getWeeklyRecaptureScorecard } from "@/lib/promise-crm/server";

export const metadata: Metadata = {
  title: "Weekly Recapture",
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

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

export default async function RecapturePage() {
  const scorecard = await getWeeklyRecaptureScorecard();

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
        <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3.5 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
          <CalendarSync className="h-3.5 w-3.5" />
          Weekly Recapture
        </span>
        <h1 className="mt-5 text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
          Measure whether finished visits are earning the next visit.
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-relaxed text-muted-foreground sm:text-lg">
          This is the management layer for closeout, review, reminder, and next-visit discipline.
          If the machine is working, these numbers should tighten every week.
        </p>

        <div className="mt-6 rounded-2xl border border-border bg-background/60 px-4 py-3 text-sm text-muted-foreground">
          Window: {scorecard.windowLabel}
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-border bg-background/60 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Completed visits</p>
            <p className="mt-2 text-2xl font-bold text-foreground">{scorecard.metrics.completedVisits}</p>
          </div>
          <div className="rounded-2xl border border-border bg-background/60 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Closeout rate</p>
            <p className="mt-2 text-2xl font-bold text-foreground">{formatPercent(scorecard.metrics.closeoutRate)}</p>
          </div>
          <div className="rounded-2xl border border-border bg-background/60 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Proof-ready visits</p>
            <p className="mt-2 text-2xl font-bold text-foreground">{scorecard.metrics.proofReady}</p>
          </div>
          <div className="rounded-2xl border border-border bg-background/60 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Net profit in view</p>
            <p className="mt-2 text-2xl font-bold text-foreground">{formatCurrency(scorecard.metrics.netProfitInView)}</p>
          </div>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-4">
          <div className="rounded-2xl border border-border bg-background/60 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Recaps sent</p>
            <p className="mt-2 text-xl font-semibold text-foreground">{scorecard.metrics.recapsSent}</p>
          </div>
          <div className="rounded-2xl border border-border bg-background/60 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Recap responses</p>
            <p className="mt-2 text-xl font-semibold text-foreground">{scorecard.metrics.recapResponses}</p>
          </div>
          <div className="rounded-2xl border border-border bg-background/60 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Review completed</p>
            <p className="mt-2 text-xl font-semibold text-foreground">{scorecard.metrics.reviewCompleted}</p>
          </div>
          <div className="rounded-2xl border border-border bg-background/60 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Next-visit conversions</p>
            <p className="mt-2 text-xl font-semibold text-foreground">{scorecard.metrics.nextVisitConversions}</p>
          </div>
        </div>
      </section>

      <section className="mt-6 rounded-3xl border border-border bg-card/50 p-6">
        <h2 className="text-xl font-bold text-foreground">Priority reads</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {scorecard.priorities.map((priority) => (
            <div key={priority.title} className="rounded-2xl border border-border bg-background/60 p-4">
              <p className="text-sm font-semibold text-foreground">{priority.title}</p>
              <p className="mt-2 text-sm text-muted-foreground">{priority.detail}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-6 rounded-3xl border border-border bg-card/50 p-6">
        <h2 className="text-xl font-bold text-foreground">Weekly operating read</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-border bg-background/60 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Review ready</p>
            <p className="mt-2 text-xl font-semibold text-foreground">{scorecard.metrics.reviewReady}</p>
          </div>
          <div className="rounded-2xl border border-border bg-background/60 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Reminder seeded</p>
            <p className="mt-2 text-xl font-semibold text-foreground">{scorecard.metrics.reminderSeeded}</p>
          </div>
          <div className="rounded-2xl border border-border bg-background/60 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Reminder converted</p>
            <p className="mt-2 text-xl font-semibold text-foreground">{scorecard.metrics.reminderConversions}</p>
          </div>
          <div className="rounded-2xl border border-border bg-background/60 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Next visit captured</p>
            <p className="mt-2 text-xl font-semibold text-foreground">{scorecard.metrics.nextVisitCaptured}</p>
          </div>
        </div>

        <Link
          href="/ops/outbound"
          className="mt-5 inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground transition-all hover:bg-secondary"
        >
          Open outbound queue
          <ArrowRight className="h-4 w-4" />
        </Link>
      </section>

      <section className="mt-6 rounded-3xl border border-border bg-card/50 p-6">
        <h2 className="text-xl font-bold text-foreground">Money, callback, and account signal</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-border bg-background/60 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Deposit collection rate</p>
            <p className="mt-2 text-xl font-semibold text-foreground">{formatPercent(scorecard.metrics.collectionRate)}</p>
            <p className="mt-2 text-sm text-muted-foreground">
              {scorecard.metrics.depositsCollected} of {scorecard.metrics.depositsRequested} requested deposits collected
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-background/60 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Balance still open</p>
            <p className="mt-2 text-xl font-semibold text-foreground">{formatCurrency(scorecard.metrics.balanceOpen)}</p>
          </div>
          <div className="rounded-2xl border border-border bg-background/60 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Callback resolution rate</p>
            <p className="mt-2 text-xl font-semibold text-foreground">{formatPercent(scorecard.metrics.callbackRate)}</p>
            <p className="mt-2 text-sm text-muted-foreground">
              {scorecard.metrics.callbackResolved} resolved / {scorecard.metrics.callbackOpen} still open
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-background/60 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Recurring accounts</p>
            <p className="mt-2 text-xl font-semibold text-foreground">{scorecard.metrics.recurringActive}</p>
            <p className="mt-2 text-sm text-muted-foreground">
              {scorecard.metrics.recurringLeads} leads / {scorecard.metrics.recurringTrialActive} trials / {scorecard.metrics.recurringAtRisk} at risk
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
