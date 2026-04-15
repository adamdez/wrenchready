import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Gauge, Target } from "lucide-react";
import { getWedgeFocusSnapshot } from "@/lib/promise-crm/server";

export const metadata: Metadata = {
  title: "Wedge Focus",
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

function actionTone(action: string) {
  if (action === "Lead harder") return "border-emerald-500/20 bg-emerald-500/10 text-emerald-300";
  if (action === "Protect the promise") return "border-amber-500/20 bg-amber-500/10 text-amber-300";
  if (action === "Tighten follow-through") return "border-sky-500/20 bg-sky-500/10 text-sky-300";
  return "border-border bg-background/70 text-muted-foreground";
}

export default async function WedgeFocusPage() {
  const snapshot = await getWedgeFocusSnapshot();
  const primaryWedges = snapshot.wedges.filter((wedge) => wedge.homepagePriority === "primary");
  const supportingWedges = snapshot.wedges.filter(
    (wedge) => wedge.homepagePriority === "supporting",
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
        <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3.5 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
          <Target className="h-3.5 w-3.5" />
          Wedge Focus
        </span>
        <h1 className="mt-5 text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
          Keep the front door narrow enough to protect the promise.
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-relaxed text-muted-foreground sm:text-lg">
          {snapshot.whyNow}
        </p>

        <div className="mt-8 grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-3xl border border-border bg-background/60 p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
              Weekly headline
            </p>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{snapshot.headline}</p>
          </div>
          <div className="rounded-3xl border border-border bg-background/60 p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
              This week
            </p>
            <div className="mt-3 space-y-2 text-sm text-muted-foreground">
              {snapshot.focusAreas.map((item) => (
                <div key={item} className="flex gap-2 rounded-2xl border border-border bg-card/50 p-3">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mt-6 rounded-3xl border border-border bg-card/50 p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-foreground">Primary launch wedges</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              These should stay at the top of the homepage, the intake flow, and the response script.
            </p>
          </div>
          <Link
            href="/ops/insights"
            className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground transition-all hover:bg-secondary"
          >
            Offer performance
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="mt-5 grid gap-4 xl:grid-cols-2">
          {primaryWedges.map((wedge) => (
            <article key={wedge.id} className="rounded-3xl border border-border bg-background/60 p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                    {wedge.lane}
                  </p>
                  <h3 className="mt-2 text-xl font-semibold text-foreground">{wedge.title}</h3>
                </div>
                <span
                  className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${actionTone(
                    wedge.action,
                  )}`}
                >
                  {wedge.action}
                </span>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl border border-border bg-card/50 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Inbound</p>
                  <p className="mt-2 text-2xl font-bold text-foreground">{wedge.inboundCount}</p>
                </div>
                <div className="rounded-2xl border border-border bg-card/50 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Promoted</p>
                  <p className="mt-2 text-2xl font-bold text-foreground">{wedge.promotedCount}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{formatPercent(wedge.promotionRate)} rate</p>
                </div>
                <div className="rounded-2xl border border-border bg-card/50 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Converted work</p>
                  <p className="mt-2 text-2xl font-bold text-foreground">{wedge.convertedWorkCount}</p>
                </div>
                <div className="rounded-2xl border border-border bg-card/50 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Net profit</p>
                  <p className="mt-2 text-2xl font-bold text-foreground">{formatCurrency(wedge.netProfitInView)}</p>
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-border bg-card/50 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Why this matters now</p>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{wedge.actionDetail}</p>
                <div className="mt-4 flex items-start gap-3 rounded-2xl border border-border bg-background/60 p-4">
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <Gauge className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">Weekly focus</p>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{wedge.weeklyFocus}</p>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-6 rounded-3xl border border-border bg-card/50 p-6">
        <h2 className="text-xl font-bold text-foreground">Supporting lanes</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          These can stay live, but they should support the main wedges instead of replacing them.
        </p>

        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          {supportingWedges.map((wedge) => (
            <article key={wedge.id} className="rounded-2xl border border-border bg-background/60 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                    {wedge.lane}
                  </p>
                  <h3 className="mt-2 text-base font-semibold text-foreground">{wedge.title}</h3>
                </div>
                <span
                  className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${actionTone(
                    wedge.action,
                  )}`}
                >
                  {wedge.action}
                </span>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{wedge.actionDetail}</p>
              <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                <span>{wedge.promotedCount} promoted</span>
                <span>{formatCurrency(wedge.netProfitInView)} net profit</span>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
