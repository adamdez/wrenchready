import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight, CheckCircle2, Compass, Target } from "lucide-react";
import { getWeeklyOperatingCadenceSnapshot } from "@/lib/promise-crm/operating-cadence";

export const metadata: Metadata = {
  title: "Operating Cadence",
  robots: {
    index: false,
    follow: false,
  },
};

export const dynamic = "force-dynamic";

function toneClasses(tone: "promise" | "trust" | "growth" | "system") {
  if (tone === "trust") return "border-primary/20 bg-primary/10 text-primary";
  if (tone === "growth") return "border-emerald-500/20 bg-emerald-500/10 text-emerald-300";
  if (tone === "system") return "border-sky-500/20 bg-sky-500/10 text-sky-300";
  return "border-amber-500/20 bg-amber-500/10 text-amber-300";
}

export default async function OperatingCadencePage() {
  const snapshot = await getWeeklyOperatingCadenceSnapshot();

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
          <Compass className="h-3.5 w-3.5" />
          Operating Cadence
        </span>
        <h1 className="mt-5 text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
          Keep the week pointed at promise quality, trust, and repeat revenue.
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-relaxed text-muted-foreground sm:text-lg">
          This is the weekly reset: what the company is trying to become, what this build is for,
          and what the team should do first instead of drifting into random work.
        </p>

        <div className="mt-8 grid gap-4 lg:grid-cols-2">
          <div className="rounded-3xl border border-border bg-background/60 p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Company goal</p>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{snapshot.companyGoal}</p>
          </div>
          <div className="rounded-3xl border border-border bg-background/60 p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Build goal</p>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{snapshot.buildGoal}</p>
          </div>
        </div>

        <div className="mt-4 rounded-3xl border border-border bg-background/60 p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Why</p>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{snapshot.why}</p>
        </div>
      </section>

      <section className="mt-6 rounded-3xl border border-border bg-card/50 p-6">
        <h2 className="text-xl font-bold text-foreground">Weekly signal</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          These numbers keep the team pointed at trust, money, and repeatability instead of just volume.
        </p>

        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <div className="rounded-2xl border border-border bg-background/60 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Closeout rate</p>
            <p className="mt-2 text-2xl font-bold text-foreground">
              {(snapshot.metrics.closeoutRate * 100).toFixed(0)}%
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-background/60 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Send-ready outbound</p>
            <p className="mt-2 text-2xl font-bold text-foreground">{snapshot.metrics.outboundSendReady}</p>
          </div>
          <div className="rounded-2xl border border-border bg-background/60 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Balances open</p>
            <p className="mt-2 text-2xl font-bold text-foreground">${snapshot.metrics.balancesOpen.toFixed(0)}</p>
          </div>
          <div className="rounded-2xl border border-border bg-background/60 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Callbacks open</p>
            <p className="mt-2 text-2xl font-bold text-foreground">{snapshot.metrics.callbackOpen}</p>
          </div>
          <div className="rounded-2xl border border-border bg-background/60 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Proof weak visits</p>
            <p className="mt-2 text-2xl font-bold text-foreground">{snapshot.metrics.proofWeak}</p>
          </div>
          <div className="rounded-2xl border border-border bg-background/60 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Recurring candidates</p>
            <p className="mt-2 text-2xl font-bold text-foreground">{snapshot.metrics.recurringCandidates}</p>
          </div>
        </div>
      </section>

      <section className="mt-6 rounded-3xl border border-border bg-card/50 p-6">
        <div className="flex items-start gap-3">
          <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Target className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">The standard</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              This is the bar. If a feature, workflow, or decision does not strengthen these
              standards, it is probably noise right now.
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {snapshot.standard.map((item) => (
            <div key={item} className="rounded-2xl border border-border bg-background/60 p-4">
              <div className="flex gap-3">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <p className="text-sm leading-relaxed text-muted-foreground">{item}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-6 rounded-3xl border border-border bg-card/50 p-6">
        <h2 className="text-xl font-bold text-foreground">Do these first this week</h2>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {snapshot.immediateActions.map((action) => (
            <Link
              key={`${action.title}-${action.href}`}
              href={action.href}
              className="rounded-2xl border border-border bg-background/60 p-4 transition-all hover:border-primary/30 hover:bg-background/80"
            >
              <span
                className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${toneClasses(action.tone)}`}
              >
                {action.owner}
              </span>
              <p className="mt-4 text-sm font-semibold text-foreground">{action.title}</p>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{action.detail}</p>
              <span className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-primary">
                Open
                <ArrowRight className="h-4 w-4" />
              </span>
            </Link>
          ))}
        </div>

        <Link
          href="/ops/systems"
          className="mt-6 inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground transition-all hover:bg-secondary"
        >
          Check systems and access needs
          <ArrowRight className="h-4 w-4" />
        </Link>
      </section>
    </div>
  );
}
