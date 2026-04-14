import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Camera } from "lucide-react";
import { getProofDisciplineSnapshot } from "@/lib/promise-crm/server";

export const metadata: Metadata = {
  title: "Proof Discipline",
  robots: {
    index: false,
    follow: false,
  },
};

export const dynamic = "force-dynamic";

export default async function ProofDisciplinePage() {
  const snapshot = await getProofDisciplineSnapshot();

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
          <Camera className="h-3.5 w-3.5" />
          Proof Discipline
        </span>
        <h1 className="mt-5 text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
          Keep the trust assets, not just the invoice.
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-relaxed text-muted-foreground sm:text-lg">
          This is the proof-quality layer on top of closeout. It highlights which completed visits
          still need usable recap language, permission-safe proof, or a cleaner trust asset.
        </p>

        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-border bg-background/60 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Completed visits</p>
            <p className="mt-2 text-2xl font-bold text-foreground">{snapshot.summary.completedVisits}</p>
          </div>
          <div className="rounded-2xl border border-border bg-background/60 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Proof-ready</p>
            <p className="mt-2 text-2xl font-bold text-foreground">{snapshot.summary.proofReady}</p>
          </div>
          <div className="rounded-2xl border border-border bg-background/60 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Needs work</p>
            <p className="mt-2 text-2xl font-bold text-foreground">{snapshot.summary.proofWeak}</p>
          </div>
          <div className="rounded-2xl border border-border bg-background/60 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Permission-safe assets</p>
            <p className="mt-2 text-2xl font-bold text-foreground">{snapshot.summary.permissionSafeAssets}</p>
          </div>
        </div>
      </section>

      <section className="mt-6 space-y-4">
        {snapshot.tasks.length > 0 ? (
          snapshot.tasks.map((task) => (
            <div key={task.promiseId} className="rounded-3xl border border-border bg-card/50 p-6">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <Link
                    href={`/ops/promises/${task.promiseId}`}
                    className="text-lg font-semibold text-foreground transition-colors hover:text-primary"
                  >
                    {task.customerName}
                  </Link>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {task.serviceScope} / {task.territory} / {task.owner}
                  </p>
                </div>
                <span className="rounded-full border border-border bg-background/60 px-3 py-1 text-sm text-muted-foreground">
                  Proof score {task.proofScore}
                </span>
              </div>

              <p className="mt-4 text-sm text-muted-foreground">{task.nextStep}</p>
              {task.needsPermission ? (
                <p className="mt-2 text-sm text-[--wr-gold-soft]">
                  Existing asset is not yet marked customer-approved for reuse.
                </p>
              ) : null}
              <p className="mt-2 text-sm text-muted-foreground">
                Customer-approved assets: {task.approvedAssets}
              </p>

              <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                {task.blockers.map((blocker) => (
                  <li key={blocker} className="flex gap-2">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                    {blocker}
                  </li>
                ))}
              </ul>
            </div>
          ))
        ) : (
          <div className="rounded-3xl border border-border bg-card/50 p-6 text-sm text-muted-foreground">
            No proof-discipline gaps right now.
          </div>
        )}
      </section>
    </div>
  );
}
