import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight, BriefcaseBusiness } from "lucide-react";
import {
  getCollectionSnapshot,
  getFieldExecutionSnapshot,
  getRecurringAccountStarterSnapshot,
  getTomorrowReadinessSnapshot,
  getWarrantySnapshot,
  getWeeklyRecaptureScorecard,
  getWedgeFocusSnapshot,
} from "@/lib/promise-crm/server";

export const metadata: Metadata = {
  title: "Management Review",
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

export default async function ManagementReviewPage() {
  const [wedges, tomorrow, field, collections, warranty, recapture, accounts] = await Promise.all([
    getWedgeFocusSnapshot(),
    getTomorrowReadinessSnapshot(),
    getFieldExecutionSnapshot(),
    getCollectionSnapshot(),
    getWarrantySnapshot(),
    getWeeklyRecaptureScorecard(),
    getRecurringAccountStarterSnapshot(),
  ]);

  const agenda = [
    {
      title: "Demand and wedge quality",
      detail: wedges.headline,
      href: "/ops/wedges",
    },
    {
      title: "Tomorrow honesty",
      detail: `${tomorrow.needsAttention} promise${tomorrow.needsAttention === 1 ? "" : "s"} still need attention before the day starts cleanly.`,
      href: "/ops/tomorrow",
    },
    {
      title: "Field discipline",
      detail: `${field.needsPacket} packet gap${field.needsPacket === 1 ? "" : "s"} and ${field.comebackPreventionWeak} comeback-prevention gap${field.comebackPreventionWeak === 1 ? "" : "s"} are still visible.`,
      href: "/ops/field",
    },
    {
      title: "Money truth",
      detail: `${formatCurrency(collections.totalBalanceOpen)} still open across deposits and balances.`,
      href: "/ops/collections",
    },
    {
      title: "Trust recovery",
      detail: `${warranty.open} open callback${warranty.open === 1 ? "" : "s"} and ${warranty.overdue} overdue.`,
      href: "/ops/warranty",
    },
    {
      title: "Repeat and recurring revenue",
      detail: `${recapture.metrics.nextVisitConversions} next-visit conversion${recapture.metrics.nextVisitConversions === 1 ? "" : "s"} and ${accounts.summary.active} active account${accounts.summary.active === 1 ? "" : "s"} are on the board.`,
      href: "/ops/accounts",
    },
  ];

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
          <BriefcaseBusiness className="h-3.5 w-3.5" />
          Management Review
        </span>
        <h1 className="mt-5 text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
          Run the week like an operating review, not a pile of tabs.
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-relaxed text-muted-foreground sm:text-lg">
          This page is the weekly leadership packet: demand quality, promise quality, field
          discipline, money truth, trust recovery, and recurring growth in one place.
        </p>

        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-6">
          <div className="rounded-2xl border border-border bg-background/60 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Primary wedge</p>
            <p className="mt-2 text-lg font-semibold text-foreground">
              {wedges.wedges.find((item) => item.homepagePriority === "primary")?.title || "No wedge signal"}
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-background/60 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Tomorrow at risk</p>
            <p className="mt-2 text-2xl font-bold text-foreground">{tomorrow.needsAttention}</p>
          </div>
          <div className="rounded-2xl border border-border bg-background/60 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Field gaps</p>
            <p className="mt-2 text-2xl font-bold text-foreground">{field.needsPacket}</p>
          </div>
          <div className="rounded-2xl border border-border bg-background/60 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Open balance</p>
            <p className="mt-2 text-2xl font-bold text-foreground">{formatCurrency(collections.totalBalanceOpen)}</p>
          </div>
          <div className="rounded-2xl border border-border bg-background/60 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Warranty overdue</p>
            <p className="mt-2 text-2xl font-bold text-foreground">{warranty.overdue}</p>
          </div>
          <div className="rounded-2xl border border-border bg-background/60 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Active monthly</p>
            <p className="mt-2 text-2xl font-bold text-foreground">{formatCurrency(accounts.summary.activeMonthlyValueEstimate)}</p>
          </div>
        </div>
      </section>

      <section className="mt-6 rounded-3xl border border-border bg-card/50 p-6">
        <h2 className="text-xl font-bold text-foreground">Weekly agenda</h2>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {agenda.map((item) => (
            <Link
              key={item.title}
              href={item.href}
              className="rounded-2xl border border-border bg-background/60 p-4 transition-all hover:border-primary/30 hover:bg-background/80"
            >
              <p className="text-sm font-semibold text-foreground">{item.title}</p>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.detail}</p>
              <span className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-primary">
                Open
                <ArrowRight className="h-4 w-4" />
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="rounded-3xl border border-border bg-card/50 p-6">
          <h2 className="text-lg font-bold text-foreground">Demand and promise</h2>
          <div className="mt-4 space-y-3 text-sm text-muted-foreground">
            <p>{wedges.headline}</p>
            <p>{tomorrow.readyNow} promise{tomorrow.readyNow === 1 ? "" : "s"} already look ready for tomorrow.</p>
            <p>{tomorrow.averageReadinessScore.toFixed(0)} average readiness score.</p>
          </div>
        </div>
        <div className="rounded-3xl border border-border bg-card/50 p-6">
          <h2 className="text-lg font-bold text-foreground">Execution and recovery</h2>
          <div className="mt-4 space-y-3 text-sm text-muted-foreground">
            <p>{field.comebackPreventionWeak} visit{field.comebackPreventionWeak === 1 ? "" : "s"} still lack comeback-prevention steps.</p>
            <p>{field.closeoutAtRisk} completed visit{field.closeoutAtRisk === 1 ? "" : "s"} still need cleaner closeout.</p>
            <p>{warranty.trustRisk} callback{warranty.trustRisk === 1 ? "" : "s"} are marked as trust-risk severity.</p>
          </div>
        </div>
        <div className="rounded-3xl border border-border bg-card/50 p-6">
          <h2 className="text-lg font-bold text-foreground">Repeat and recurring</h2>
          <div className="mt-4 space-y-3 text-sm text-muted-foreground">
            <p>{recapture.metrics.nextVisitCaptured} next probable visit{recapture.metrics.nextVisitCaptured === 1 ? "" : "s"} captured.</p>
            <p>{accounts.summary.readyToPitch} lead{accounts.summary.readyToPitch === 1 ? "" : "s"} are ready for a real pitch.</p>
            <p>{accounts.summary.readyToActivate} account{accounts.summary.readyToActivate === 1 ? "" : "s"} are close to trial or activation.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
