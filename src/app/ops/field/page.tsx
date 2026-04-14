import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ClipboardList } from "lucide-react";
import { getFieldExecutionSnapshot } from "@/lib/promise-crm/server";

export const metadata: Metadata = {
  title: "Field Execution",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function FieldExecutionPage() {
  const snapshot = await getFieldExecutionSnapshot();

  return (
    <div className="shell py-10 sm:py-14">
      <Link href="/ops/promises" className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
        <ArrowLeft className="h-4 w-4" />
        Back to Promise Board
      </Link>

      <section className="mt-6 overflow-hidden rounded-[2rem] border border-border bg-card/60 p-6 backdrop-blur-sm sm:p-8">
        <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3.5 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
          <ClipboardList className="h-3.5 w-3.5" />
          Field Execution
        </span>
        <h1 className="mt-5 text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
          Give the day one clean packet instead of scattered texts.
        </h1>
        <div className="mt-8 grid gap-4 md:grid-cols-4">
          <div className="rounded-2xl border border-border bg-background/60 p-4"><p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Active promises</p><p className="mt-2 text-2xl font-bold text-foreground">{snapshot.total}</p></div>
          <div className="rounded-2xl border border-border bg-background/60 p-4"><p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Need packet</p><p className="mt-2 text-2xl font-bold text-foreground">{snapshot.needsPacket}</p></div>
          <div className="rounded-2xl border border-border bg-background/60 p-4"><p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Confirmed</p><p className="mt-2 text-2xl font-bold text-foreground">{snapshot.confirmedToday}</p></div>
          <div className="rounded-2xl border border-border bg-background/60 p-4"><p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">In motion</p><p className="mt-2 text-2xl font-bold text-foreground">{snapshot.onSiteNow}</p></div>
        </div>
      </section>

      <section className="mt-6 rounded-3xl border border-border bg-card/50 p-6">
        <h2 className="text-xl font-bold text-foreground">Execution worklist</h2>
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
                <span className="rounded-full border border-border bg-card px-2.5 py-1 text-[11px] text-muted-foreground">{task.jobStage}</span>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">{task.nextStep}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                Missing: {[
                  task.missingPartsChecklist ? "parts" : null,
                  task.missingPhotosChecklist ? "photos" : null,
                  task.missingInspectionChecklist ? "inspection" : null,
                ].filter(Boolean).join(", ") || "none"}
              </p>
            </div>
          )) : (
            <div className="rounded-2xl border border-dashed border-border bg-background/40 p-4 text-sm text-muted-foreground">
              No active field execution work right now.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
