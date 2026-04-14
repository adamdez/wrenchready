import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Building2 } from "lucide-react";
import { getRecurringAccountStarterSnapshot } from "@/lib/promise-crm/server";

export const metadata: Metadata = {
  title: "Recurring Accounts",
  robots: {
    index: false,
    follow: false,
  },
};

export const dynamic = "force-dynamic";

export default async function RecurringAccountsPage() {
  const snapshot = await getRecurringAccountStarterSnapshot();

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
          <Building2 className="h-3.5 w-3.5" />
          Recurring Accounts
        </span>
        <h1 className="mt-5 text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
          Start one narrow recurring-account lane.
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-relaxed text-muted-foreground sm:text-lg">
          The point is not to become a full fleet platform overnight. It is to prove one repeatable
          recurring offer that improves density, repeatability, and trust.
        </p>

        <div className="mt-8 rounded-3xl border border-border bg-background/60 p-5">
          <h2 className="text-xl font-bold text-foreground">{snapshot.starterOffer.title}</h2>
          <p className="mt-3 text-sm text-muted-foreground">{snapshot.starterOffer.summary}</p>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Best targets</p>
              <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                {snapshot.starterOffer.bestTargets.map((target) => (
                  <li key={target} className="flex gap-2">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                    {target}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Core promise</p>
              <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                {snapshot.starterOffer.promise.map((item) => (
                  <li key={item} className="flex gap-2">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-6 grid gap-5 lg:grid-cols-2">
        <div className="rounded-3xl border border-border bg-card/50 p-6">
          <h2 className="text-xl font-bold text-foreground">Outreach opener</h2>
          <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
            {snapshot.outreachScripts.opener}
          </p>
        </div>

        <div className="rounded-3xl border border-border bg-card/50 p-6">
          <h2 className="text-xl font-bold text-foreground">Follow-up</h2>
          <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
            {snapshot.outreachScripts.followUp}
          </p>
          <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
            Landing page headline
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            {snapshot.outreachScripts.landingPageHeadline}
          </p>
        </div>
      </section>

      <section className="mt-6 rounded-3xl border border-border bg-card/50 p-6">
        <h2 className="text-xl font-bold text-foreground">Tracked account health</h2>
        <div className="mt-4 space-y-4">
          {snapshot.activeAccounts && snapshot.activeAccounts.length > 0 ? (
            snapshot.activeAccounts.map((account, index) => (
              <div key={`${account.accountName || "account"}-${index}`} className="rounded-2xl border border-border bg-background/60 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-border bg-card px-2.5 py-1 text-[11px] text-muted-foreground">
                    {account.status}
                  </span>
                  <span className="rounded-full border border-border bg-card px-2.5 py-1 text-[11px] text-muted-foreground">
                    {account.vehicleCount ?? "?"} vehicles
                  </span>
                </div>
                <p className="mt-3 text-sm font-semibold text-foreground">
                  {account.accountName || "Unnamed account"}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {account.cadenceLabel || "No cadence recorded"} / {account.billingTerms || "No billing terms recorded"}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Next touch: {account.nextTouchDueAt || "Not scheduled"}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {account.summary || "No account summary recorded"}
                </p>
              </div>
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-border bg-background/40 p-4 text-sm text-muted-foreground">
              No recurring accounts have been tracked in the promise records yet.
            </div>
          )}
        </div>
      </section>

      <section className="mt-6 rounded-3xl border border-border bg-card/50 p-6">
        <h2 className="text-xl font-bold text-foreground">Current candidates</h2>
        <div className="mt-4 space-y-4">
          {snapshot.candidates.length > 0 ? (
            snapshot.candidates.map((candidate) => (
              <div key={`${candidate.sourceType}-${candidate.sourceId}`} className="rounded-2xl border border-border bg-background/60 p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{candidate.customerName}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {candidate.lane} / {candidate.territory} / {candidate.owner}
                    </p>
                  </div>
                  <Link
                    href={
                      candidate.sourceType === "inbound"
                        ? `/ops/inbound/${candidate.sourceId}`
                        : `/ops/promises/${candidate.sourceId}`
                    }
                    className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground transition-all hover:bg-secondary"
                  >
                    Open {candidate.sourceType}
                  </Link>
                </div>
                <p className="mt-3 text-sm text-muted-foreground">{candidate.whyThisFits}</p>
                <p className="mt-2 text-sm text-foreground">{candidate.nextStep}</p>
              </div>
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-border bg-background/40 p-4 text-sm text-muted-foreground">
              No recurring-account candidates are obvious in the current live data yet.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
