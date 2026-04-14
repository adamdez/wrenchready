import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, CreditCard } from "lucide-react";
import { CollectionActionForm } from "@/components/collection-action-form";
import { getCollectionSnapshot } from "@/lib/promise-crm/server";

export const metadata: Metadata = {
  title: "Collections",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

function formatCurrency(value?: number) {
  if (value === undefined) return "Not captured";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(value);
}

export default async function CollectionsPage() {
  const snapshot = await getCollectionSnapshot();

  return (
    <div className="shell py-10 sm:py-14">
      <Link href="/ops/promises" className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
        <ArrowLeft className="h-4 w-4" />
        Back to Promise Board
      </Link>

      <section className="mt-6 overflow-hidden rounded-[2rem] border border-border bg-card/60 p-6 backdrop-blur-sm sm:p-8">
        <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3.5 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
          <CreditCard className="h-3.5 w-3.5" />
          Collections
        </span>
        <h1 className="mt-5 text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
          Make sure completed work actually becomes collected revenue.
        </h1>
        <div className="mt-8 grid gap-4 md:grid-cols-5">
          <div className="rounded-2xl border border-border bg-background/60 p-4"><p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Open</p><p className="mt-2 text-2xl font-bold text-foreground">{snapshot.totalOpen}</p></div>
          <div className="rounded-2xl border border-border bg-background/60 p-4"><p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Awaiting payment</p><p className="mt-2 text-2xl font-bold text-foreground">{snapshot.awaitingPayment}</p></div>
          <div className="rounded-2xl border border-border bg-background/60 p-4"><p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Partial</p><p className="mt-2 text-2xl font-bold text-foreground">{snapshot.partial}</p></div>
          <div className="rounded-2xl border border-border bg-background/60 p-4"><p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Paid</p><p className="mt-2 text-2xl font-bold text-foreground">{snapshot.paid}</p></div>
          <div className="rounded-2xl border border-border bg-background/60 p-4"><p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Written off</p><p className="mt-2 text-2xl font-bold text-foreground">{snapshot.writtenOff}</p></div>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-border bg-background/60 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Balance open</p>
            <p className="mt-2 text-2xl font-bold text-foreground">{formatCurrency(snapshot.totalBalanceOpen)}</p>
          </div>
          <div className="rounded-2xl border border-border bg-background/60 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Online balance checkout ready</p>
            <p className="mt-2 text-2xl font-bold text-foreground">{snapshot.readyForBalanceCheckout}</p>
          </div>
        </div>
      </section>

      <section className="mt-6 rounded-3xl border border-border bg-card/50 p-6">
        <h2 className="text-xl font-bold text-foreground">Collection queue</h2>
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
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-border bg-card px-2.5 py-1 text-[11px] text-muted-foreground">{task.status}</span>
                  <span className="rounded-full border border-border bg-card px-2.5 py-1 text-[11px] text-muted-foreground">{task.collectionPriority}</span>
                </div>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">{task.nextStep}</p>
              <p className="mt-2 text-sm text-muted-foreground">Method: {task.method || "Not set"} / Balance due: {formatCurrency(task.balanceDueAmount)}</p>
              {task.invoiceReference ? (
                <p className="mt-1 text-sm text-muted-foreground">Invoice reference: {task.invoiceReference}</p>
              ) : null}
              {task.writeOffReason ? (
                <p className="mt-1 text-sm text-muted-foreground">Write-off reason: {task.writeOffReason}</p>
              ) : null}
              {task.balanceCheckoutReady ? (
                <p className="mt-1 text-sm text-muted-foreground">
                  Customer can use online balance checkout from the public status page.
                </p>
              ) : null}
              <CollectionActionForm task={task} />
            </div>
          )) : (
            <div className="rounded-2xl border border-dashed border-border bg-background/40 p-4 text-sm text-muted-foreground">
              No collection issues are visible right now.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
