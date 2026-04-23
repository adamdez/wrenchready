import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, PackageSearch } from "lucide-react";
import { PartsPlannerActionForm } from "@/components/parts-planner-action-form";
import { getPartsPlanningSnapshot } from "@/lib/promise-crm/server";

export const metadata: Metadata = {
  title: "Parts Planning",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export default async function PartsPlanningPage() {
  const snapshot = await getPartsPlanningSnapshot();

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
          <PackageSearch className="h-3.5 w-3.5" />
          Parts Planning
        </span>
        <h1 className="mt-5 text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
          Find the right part once, stage one clean pickup, and keep the field day moving.
        </h1>
        <div className="mt-8 grid gap-4 md:grid-cols-5">
          <div className="rounded-2xl border border-border bg-background/60 p-4"><p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Active jobs</p><p className="mt-2 text-2xl font-bold text-foreground">{snapshot.total}</p></div>
          <div className="rounded-2xl border border-border bg-background/60 p-4"><p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Researching</p><p className="mt-2 text-2xl font-bold text-foreground">{snapshot.researching}</p></div>
          <div className="rounded-2xl border border-border bg-background/60 p-4"><p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Ordered / quoted</p><p className="mt-2 text-2xl font-bold text-foreground">{snapshot.ordered}</p></div>
          <div className="rounded-2xl border border-border bg-background/60 p-4"><p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Ready pickup</p><p className="mt-2 text-2xl font-bold text-foreground">{snapshot.readyPickup}</p></div>
          <div className="rounded-2xl border border-border bg-background/60 p-4"><p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Loaded to tech</p><p className="mt-2 text-2xl font-bold text-foreground">{snapshot.loadedTech}</p></div>
        </div>
        <div className="mt-4 rounded-2xl border border-border bg-background/60 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Estimated parts cost in view</p>
          <p className="mt-2 text-2xl font-bold text-foreground">{formatCurrency(snapshot.estimatedPartsCost)}</p>
        </div>
      </section>

      <section className="mt-6 rounded-3xl border border-border bg-card/50 p-6">
        <h2 className="text-xl font-bold text-foreground">Parts run worklist</h2>
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
                  <span className={`rounded-full border px-2.5 py-1 text-[11px] ${
                    task.taskPriority === "high"
                      ? "border-red-500/20 bg-red-500/10 text-red-200"
                      : task.taskPriority === "medium"
                        ? "border-amber-500/20 bg-amber-500/10 text-amber-300"
                        : "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
                  }`}>
                    {task.taskPriority} priority
                  </span>
                  <span className="rounded-full border border-border bg-card px-2.5 py-1 text-[11px] text-muted-foreground">
                    {task.scheduledWindowLabel}
                  </span>
                </div>
              </div>

              <p className="mt-3 text-sm text-muted-foreground">{task.nextStep}</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Required parts: {task.requiredCount} / Ready pickup: {task.readyPickupCount} / Loaded: {task.loadedCount}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Pickup owner: {task.pickupAssignedTo || "Not set"} / Window: {task.pickupWindow || "Not set"}
              </p>
              {task.pickupNotes ? (
                <p className="mt-1 text-sm text-muted-foreground">Pickup notes: {task.pickupNotes}</p>
              ) : null}

              {task.outstandingParts.length > 0 ? (
                <div className="mt-4 rounded-2xl border border-border bg-card/50 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Outstanding parts</p>
                  <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                    {task.outstandingParts.map((part) => (
                      <li key={`${task.promiseId}-${part.label}-${part.partNumber || "no-part"}`}>
                        <span className="font-medium text-foreground">{part.label}</span>
                        {part.partNumber ? ` / ${part.partNumber}` : ""}
                        {part.vendor ? ` / ${part.vendor}` : ""}
                        {part.vendorLocation ? ` / ${part.vendorLocation}` : ""}
                        {part.estimatedCost !== undefined ? ` / ${formatCurrency(part.estimatedCost)}` : ""}
                        {` / ${part.status}`}
                        {part.fitmentNotes ? ` / ${part.fitmentNotes}` : ""}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <PartsPlannerActionForm
                fieldExecution={task.fieldExecution}
                owner={task.owner}
                promiseId={task.promiseId}
              />
            </div>
          )) : (
            <div className="rounded-2xl border border-dashed border-border bg-background/40 p-4 text-sm text-muted-foreground">
              No active parts planning work right now.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
