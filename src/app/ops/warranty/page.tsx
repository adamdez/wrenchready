import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ShieldAlert } from "lucide-react";
import { WarrantyActionForm } from "@/components/warranty-action-form";
import { getWarrantySnapshot } from "@/lib/promise-crm/server";

export const metadata: Metadata = {
  title: "Warranty and Comebacks",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function WarrantyPage() {
  const snapshot = await getWarrantySnapshot();

  return (
    <div className="shell py-10 sm:py-14">
      <Link href="/ops/promises" className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
        <ArrowLeft className="h-4 w-4" />
        Back to Promise Board
      </Link>

      <section className="mt-6 overflow-hidden rounded-[2rem] border border-border bg-card/60 p-6 backdrop-blur-sm sm:p-8">
        <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3.5 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
          <ShieldAlert className="h-3.5 w-3.5" />
          Warranty and Comebacks
        </span>
        <h1 className="mt-5 text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
          Catch trust breakage early and own the callback plan.
        </h1>
        <div className="mt-8 grid gap-4 md:grid-cols-3 xl:grid-cols-6">
          <div className="rounded-2xl border border-border bg-background/60 p-4"><p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Open</p><p className="mt-2 text-2xl font-bold text-foreground">{snapshot.open}</p></div>
          <div className="rounded-2xl border border-border bg-background/60 p-4"><p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Monitoring</p><p className="mt-2 text-2xl font-bold text-foreground">{snapshot.monitoring}</p></div>
          <div className="rounded-2xl border border-border bg-background/60 p-4"><p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Resolved</p><p className="mt-2 text-2xl font-bold text-foreground">{snapshot.resolved}</p></div>
          <div className="rounded-2xl border border-border bg-background/60 p-4"><p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Overdue</p><p className="mt-2 text-2xl font-bold text-foreground">{snapshot.overdue}</p></div>
          <div className="rounded-2xl border border-border bg-background/60 p-4"><p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Trust risk</p><p className="mt-2 text-2xl font-bold text-foreground">{snapshot.trustRisk}</p></div>
          <div className="rounded-2xl border border-border bg-background/60 p-4"><p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Prevention missing</p><p className="mt-2 text-2xl font-bold text-foreground">{snapshot.preventionMissing}</p></div>
        </div>
      </section>

      <section className="mt-6 rounded-3xl border border-border bg-card/50 p-6">
        <h2 className="text-xl font-bold text-foreground">Warranty worklist</h2>
        <div className="mt-4 space-y-4">
          {snapshot.tasks.length > 0 ? snapshot.tasks.map((task) => (
            <div key={task.promiseId} className="rounded-2xl border border-border bg-background/60 p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <Link href={`/ops/promises/${task.promiseId}`} className="text-sm font-semibold text-foreground transition-colors hover:text-primary">
                    {task.customerName}
                  </Link>
                  <p className="mt-1 text-xs text-muted-foreground">{task.serviceScope} / {task.territory} / {task.owner}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full border border-border bg-card px-2.5 py-1 text-[11px] text-muted-foreground">{task.status}</span>
                  {task.severity ? (
                    <span className={`rounded-full border px-2.5 py-1 text-[11px] ${
                      task.severity === "down-unit"
                        ? "border-red-500/20 bg-red-500/10 text-red-200"
                        : task.severity === "trust-risk"
                          ? "border-amber-500/20 bg-amber-500/10 text-amber-300"
                          : "border-sky-500/20 bg-sky-500/10 text-sky-300"
                    }`}>{task.severity}</span>
                  ) : null}
                  {task.overdue ? (
                    <span className="rounded-full border border-red-500/20 bg-red-500/10 px-2.5 py-1 text-[11px] text-red-200">overdue</span>
                  ) : null}
                </div>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">{task.issueSummary || "No issue summary recorded."}</p>
              <p className="mt-2 text-sm text-muted-foreground">Callback due: {task.callbackDueAt || "Not scheduled"}</p>
              <p className="mt-2 text-sm text-muted-foreground">Root cause: {task.rootCause || "Not set"}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                Missing: {[
                  task.makeGoodPlanMissing ? "make-good plan" : null,
                  task.preventionMissing ? "prevention step" : null,
                ].filter(Boolean).join(", ") || "none"}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">{task.nextStep}</p>
              <WarrantyActionForm
                owner={task.owner}
                promiseId={task.promiseId}
                warrantyCase={task.warrantyCase}
              />
            </div>
          )) : (
            <div className="rounded-2xl border border-dashed border-border bg-background/40 p-4 text-sm text-muted-foreground">
              No open warranty or comeback work right now.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
