import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ShieldCheck, ShoppingBag, Wrench } from "lucide-react";
import { getSystemsReadinessSnapshot } from "@/lib/promise-crm/system-readiness";
import type { SystemReadinessItem } from "@/lib/promise-crm/types";

export const metadata: Metadata = {
  title: "Systems Readiness",
  robots: {
    index: false,
    follow: false,
  },
};

export const dynamic = "force-dynamic";

function statusClasses(status: SystemReadinessItem["status"]) {
  if (status === "ready") return "border-emerald-500/20 bg-emerald-500/10 text-emerald-300";
  if (status === "held") return "border-amber-500/20 bg-amber-500/10 text-amber-300";
  if (status === "buy-or-provision") return "border-rose-500/20 bg-rose-500/10 text-rose-300";
  return "border-sky-500/20 bg-sky-500/10 text-sky-300";
}

function accessLabel(value: SystemReadinessItem["accessNeed"]) {
  if (value === "purchase") return "Needs purchase";
  if (value === "config") return "Needs config";
  return "Ready now";
}

export default async function SystemsReadinessPage() {
  const snapshot = await getSystemsReadinessSnapshot();

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
          <ShieldCheck className="h-3.5 w-3.5" />
          Systems Readiness
        </span>
        <h1 className="mt-5 text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
          Know what is truly live, what still needs setup, and what is worth buying next.
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-relaxed text-muted-foreground sm:text-lg">
          This page keeps the tooling story honest. The standard is simple: no channel or surface
          should be treated as production-ready unless the transport, compliance, and trust details
          are actually there.
        </p>
      </section>

      <section className="mt-6 grid gap-5 xl:grid-cols-2">
        <div className="rounded-3xl border border-border bg-card/50 p-6">
          <div className="flex items-start gap-3">
            <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Wrench className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">Needs attention now</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                These are the gaps that still affect the promise machine right now.
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-4">
            {snapshot.needsNow.length > 0 ? (
              snapshot.needsNow.map((item) => (
                <div key={item.name} className="rounded-2xl border border-border bg-background/60 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${statusClasses(item.status)}`}>
                      {item.status}
                    </span>
                    <span className="rounded-full border border-border bg-card px-2.5 py-1 text-[11px] text-muted-foreground">
                      {accessLabel(item.accessNeed)}
                    </span>
                  </div>
                  <p className="mt-3 text-sm font-semibold text-foreground">{item.name}</p>
                  <p className="mt-2 text-sm text-muted-foreground">{item.summary}</p>
                  <p className="mt-3 text-xs uppercase tracking-[0.16em] text-primary">Next step</p>
                  <p className="mt-1 text-sm text-muted-foreground">{item.nextStep}</p>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-border bg-background/40 p-4 text-sm text-muted-foreground">
                No immediate system blockers are showing right now.
              </div>
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-border bg-card/50 p-6">
          <div className="flex items-start gap-3">
            <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <ShoppingBag className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">Worth buying or provisioning soon</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                These are the next surfaces that likely require real vendor setup, not just more code.
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-4">
            {snapshot.needsSoon.length > 0 ? (
              snapshot.needsSoon.map((item) => (
                <div key={item.name} className="rounded-2xl border border-border bg-background/60 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${statusClasses(item.status)}`}>
                      {item.status}
                    </span>
                    <span className="rounded-full border border-border bg-card px-2.5 py-1 text-[11px] text-muted-foreground">
                      {accessLabel(item.accessNeed)}
                    </span>
                  </div>
                  <p className="mt-3 text-sm font-semibold text-foreground">{item.name}</p>
                  <p className="mt-2 text-sm text-muted-foreground">{item.whyItMatters}</p>
                  <p className="mt-3 text-xs uppercase tracking-[0.16em] text-primary">Next step</p>
                  <p className="mt-1 text-sm text-muted-foreground">{item.nextStep}</p>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-border bg-background/40 p-4 text-sm text-muted-foreground">
                No near-term purchase or provisioning needs are showing right now.
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="mt-6 rounded-3xl border border-border bg-card/50 p-6">
        <h2 className="text-xl font-bold text-foreground">All tracked systems</h2>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {snapshot.systems.map((item) => (
            <div key={item.name} className="rounded-2xl border border-border bg-background/60 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${statusClasses(item.status)}`}>
                  {item.status}
                </span>
                <span className="rounded-full border border-border bg-card px-2.5 py-1 text-[11px] text-muted-foreground">
                  {item.priority}
                </span>
              </div>
              <p className="mt-3 text-sm font-semibold text-foreground">{item.name}</p>
              <p className="mt-2 text-sm text-muted-foreground">{item.summary}</p>
              <p className="mt-3 text-xs uppercase tracking-[0.16em] text-primary">Why it matters</p>
              <p className="mt-1 text-sm text-muted-foreground">{item.whyItMatters}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
