import type { Metadata } from "next";
import Link from "next/link";
import { Inbox, ShieldAlert } from "lucide-react";
import { getInboundRecords } from "@/lib/promise-crm/server";

export const metadata: Metadata = {
  title: "Inbound Queue",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const INBOUND_DISPLAY_LIMIT = 24;

function ageLabel(createdAt: string) {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(createdAt).getTime()) / 60000));
  if (minutes < 60) return `${minutes}m old`;
  return `${Math.round(minutes / 60)}h old`;
}

function riskClass(risk: "low" | "medium" | "high") {
  if (risk === "high") return "border-red-500/25 bg-red-500/10 text-red-200";
  if (risk === "medium") return "border-[var(--wr-gold)]/25 bg-[var(--wr-gold)]/10 text-[var(--wr-gold-soft)]";
  return "border-[var(--wr-teal)]/25 bg-[var(--wr-teal)]/10 text-[var(--wr-teal-soft)]";
}

export default async function OpsInboundPage() {
  const inbound = await getInboundRecords();
  const active = inbound.filter((record) => record.qualificationStatus !== "promoted");
  const visible = active.slice(0, INBOUND_DISPLAY_LIMIT);
  const hiddenCount = Math.max(0, active.length - visible.length);
  const highRiskCount = active.filter((record) => record.readinessRisk === "high").length;

  return (
    <div className="shell py-10 sm:py-14">
      <section className="rounded-[2rem] border border-border bg-card/60 p-6 sm:p-8">
        <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3.5 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
          <Inbox className="h-3.5 w-3.5" />
          Inbound Queue
        </span>
        <div className="mt-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
              Screen requests before they become promises.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
              Showing active inbound records that still need qualification, owner assignment, or promotion.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-border bg-background/60 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Active</p>
              <p className="mt-2 text-2xl font-bold text-foreground">{active.length}</p>
            </div>
            <div className="rounded-2xl border border-border bg-background/60 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">High risk</p>
              <p className="mt-2 text-2xl font-bold text-foreground">{highRiskCount}</p>
            </div>
            <div className="rounded-2xl border border-border bg-background/60 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Promoted</p>
              <p className="mt-2 text-2xl font-bold text-foreground">{inbound.length - active.length}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-6 space-y-3">
        {hiddenCount > 0 ? (
          <p className="rounded-2xl border border-[var(--wr-gold)]/25 bg-[var(--wr-gold)]/10 px-4 py-3 text-sm text-[var(--wr-gold-soft)]">
            Showing {visible.length} of {active.length}. Use owner/status triage first; older records are intentionally not expanded by default.
          </p>
        ) : null}

        {visible.length ? (
          visible.map((record) => (
            <article className="rounded-2xl border border-border bg-card/50 p-4" key={record.id}>
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap gap-2">
                    <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${riskClass(record.readinessRisk)}`}>
                      {record.readinessRisk} risk
                    </span>
                    <span className="rounded-full border border-border bg-background/70 px-2.5 py-1 text-[11px] text-muted-foreground">
                      {record.source}
                    </span>
                    <span className="rounded-full border border-border bg-background/70 px-2.5 py-1 text-[11px] text-muted-foreground">
                      {ageLabel(record.createdAt)}
                    </span>
                  </div>
                  <h2 className="mt-3 text-lg font-bold text-foreground">{record.customer.name}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {record.vehicle.year || ""} {record.vehicle.make} {record.vehicle.model} / {record.location.territory}
                  </p>
                  <p className="mt-2 text-sm font-medium text-foreground">{record.requestedService}</p>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{record.nextAction}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {record.readinessRisk === "high" ? <ShieldAlert className="h-5 w-5 text-red-200" /> : null}
                  <Link
                    className="inline-flex h-10 items-center rounded-full border border-border bg-background/70 px-4 text-sm font-semibold text-foreground transition-colors hover:bg-secondary"
                    href={`/ops/inbound/${record.id}`}
                  >
                    Open
                  </Link>
                </div>
              </div>
            </article>
          ))
        ) : (
          <div className="rounded-2xl border border-dashed border-border bg-card/40 p-6 text-sm text-muted-foreground">
            No unpromoted inbound records are waiting right now.
          </div>
        )}
      </section>
    </div>
  );
}
