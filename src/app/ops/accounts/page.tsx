import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Building2, Clock3 } from "lucide-react";
import { RecurringAccountActionForm } from "@/components/recurring-account-action-form";
import { getRecurringAccountStarterSnapshot } from "@/lib/promise-crm/server";

export const metadata: Metadata = {
  title: "Recurring Accounts",
  robots: {
    index: false,
    follow: false,
  },
};

export const dynamic = "force-dynamic";

function formatCurrency(value?: number) {
  if (value === undefined) return "Not set";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function recurringStatusLabel(value?: string) {
  if (value === "lead") return "Lead";
  if (value === "pitched") return "Pitched";
  if (value === "trial-active") return "Trial active";
  if (value === "active") return "Active";
  if (value === "at-risk") return "At risk";
  return "Not account work";
}

function pressureClasses(value: "overdue" | "due-now" | "watch" | "healthy") {
  if (value === "overdue") return "border-red-500/20 bg-red-500/10 text-red-200";
  if (value === "due-now") return "border-amber-500/20 bg-amber-500/10 text-amber-300";
  if (value === "watch") return "border-sky-500/20 bg-sky-500/10 text-sky-300";
  return "border-emerald-500/20 bg-emerald-500/10 text-emerald-300";
}

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
          Turn the starter lane into real recurring revenue motion.
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-relaxed text-muted-foreground sm:text-lg">
          The goal is not to build a full fleet platform. The goal is to run one accountable lane:
          identify the account, pitch a believable recurring offer, track the next touch, and move
          real teams into trial and active cadence.
        </p>

        <div className="mt-8 grid gap-4 md:grid-cols-4 xl:grid-cols-6">
          <div className="rounded-2xl border border-border bg-background/60 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
              Tracked
            </p>
            <p className="mt-2 text-2xl font-bold text-foreground">{snapshot.summary.tracked}</p>
          </div>
          <div className="rounded-2xl border border-border bg-background/60 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
              Leads / pitched
            </p>
            <p className="mt-2 text-2xl font-bold text-foreground">
              {snapshot.summary.leads} / {snapshot.summary.pitched}
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-background/60 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
              Due now
            </p>
            <p className="mt-2 text-2xl font-bold text-foreground">{snapshot.summary.dueNow}</p>
          </div>
          <div className="rounded-2xl border border-border bg-background/60 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
              Overdue
            </p>
            <p className="mt-2 text-2xl font-bold text-foreground">{snapshot.summary.overdue}</p>
          </div>
          <div className="rounded-2xl border border-border bg-background/60 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
              Trial active
            </p>
            <p className="mt-2 text-2xl font-bold text-foreground">
              {snapshot.summary.trialActive}
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-background/60 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
              Active
            </p>
            <p className="mt-2 text-2xl font-bold text-foreground">{snapshot.summary.active}</p>
          </div>
          <div className="rounded-2xl border border-border bg-background/60 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
              Ready to pitch
            </p>
            <p className="mt-2 text-2xl font-bold text-foreground">{snapshot.summary.readyToPitch}</p>
          </div>
          <div className="rounded-2xl border border-border bg-background/60 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
              Ready to activate
            </p>
            <p className="mt-2 text-2xl font-bold text-foreground">{snapshot.summary.readyToActivate}</p>
          </div>
          <div className="rounded-2xl border border-border bg-background/60 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
              Proposal due
            </p>
            <p className="mt-2 text-2xl font-bold text-foreground">{snapshot.summary.proposalDue}</p>
          </div>
          <div className="rounded-2xl border border-border bg-background/60 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
              Trial review due
            </p>
            <p className="mt-2 text-2xl font-bold text-foreground">{snapshot.summary.trialReviewDue}</p>
          </div>
          <div className="rounded-2xl border border-border bg-background/60 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
              Est. monthly
            </p>
            <p className="mt-2 text-2xl font-bold text-foreground">
              {formatCurrency(snapshot.summary.totalMonthlyValueEstimate)}
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          <div className="rounded-3xl border border-border bg-background/60 p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
              Weekly headline
            </p>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              {snapshot.weeklyPlan.headline}
            </p>
          </div>
          <div className="rounded-3xl border border-border bg-background/60 p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
              Health metrics
            </p>
            <p className="mt-3 text-sm text-muted-foreground">
              Touch discipline {(snapshot.summary.touchDisciplineRate * 100).toFixed(0)}%
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Trial conversion {(snapshot.summary.trialConversionRate * 100).toFixed(0)}%
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Active monthly {formatCurrency(snapshot.summary.activeMonthlyValueEstimate)}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Ready to pitch {snapshot.summary.readyToPitch} / ready to activate {snapshot.summary.readyToActivate}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Proposal due {snapshot.summary.proposalDue} / trial review due {snapshot.summary.trialReviewDue}
            </p>
          </div>
          <div className="rounded-3xl border border-border bg-background/60 p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
              This week
            </p>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              {snapshot.weeklyPlan.targets.map((target) => (
                <li key={target} className="flex gap-2">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  {target}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-6 rounded-3xl border border-border bg-background/60 p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
            Focus areas
          </p>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {snapshot.weeklyPlan.focusAreas.map((item) => (
              <div key={item} className="rounded-2xl border border-border bg-card/50 p-4 text-sm text-muted-foreground">
                {item}
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 rounded-3xl border border-border bg-background/60 p-5">
          <h2 className="text-xl font-bold text-foreground">{snapshot.starterOffer.title}</h2>
          <p className="mt-3 text-sm text-muted-foreground">{snapshot.starterOffer.summary}</p>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                Best targets
              </p>
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
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                Core promise
              </p>
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
        <div className="flex items-center gap-2">
          <Clock3 className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-bold text-foreground">Account worklist</h2>
        </div>
        <div className="mt-4 space-y-4">
          {snapshot.worklist.length > 0 ? (
            snapshot.worklist.map((item) => (
              <div
                key={item.promiseId}
                className="rounded-2xl border border-border bg-background/60 p-4"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <Link
                      href={`/ops/promises/${item.promiseId}`}
                      className="text-sm font-semibold text-foreground transition-colors hover:text-primary"
                    >
                      {item.recurringAccount.accountName || item.customerName}
                    </Link>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {recurringStatusLabel(item.status)} / {item.territory} / {item.owner}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {item.overdue ? (
                      <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-[11px] text-amber-300">
                        Overdue
                      </span>
                    ) : null}
                    <span
                      className={`rounded-full border px-2.5 py-1 text-[11px] ${pressureClasses(item.pressure)}`}
                    >
                      {item.pressure.replace("-", " ")}
                    </span>
                    <span className="rounded-full border border-border bg-card px-2.5 py-1 text-[11px] text-muted-foreground">
                      {item.daysUntilTouch !== undefined
                        ? `${item.daysUntilTouch <= 0 ? "Due now" : `${item.daysUntilTouch}d to touch`}`
                        : "No touch date"}
                    </span>
                    <span className="rounded-full border border-border bg-card px-2.5 py-1 text-[11px] text-muted-foreground">
                      {item.proposalStage.replace("-", " ")}
                    </span>
                  </div>
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-2xl border border-border bg-card/50 p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                      Contact
                    </p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {item.recurringAccount.primaryContactName || "Not set"}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {item.recurringAccount.primaryContactRole || item.recurringAccount.contactEmail || "No contact role or email"}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-border bg-card/50 p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                      Cadence
                    </p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {item.recurringAccount.cadenceLabel || "Not set"}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {item.recurringAccount.vehicleCount || "?"} vehicles
                    </p>
                  </div>
                  <div className="rounded-2xl border border-border bg-card/50 p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                      Health
                    </p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {item.healthScore}% account health
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {item.readinessBlockers.length > 0
                        ? `${item.readinessBlockers.length} blocker${item.readinessBlockers.length === 1 ? "" : "s"}`
                        : "No explicit blockers"}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-border bg-card/50 p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                      Terms
                    </p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {item.recurringAccount.billingTerms || "Not set"}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {formatCurrency(item.recurringAccount.monthlyValueEstimate)}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-border bg-card/50 p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                      Last activity
                    </p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {item.lastActivity?.summary || "No activity logged yet"}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {item.lastActivity?.recordedAt || item.recurringAccount.lastTouchedAt || "No touch date"}
                    </p>
                  </div>
                </div>

                <div className="mt-4 rounded-2xl border border-border bg-card/50 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                    Next step
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {item.recurringAccount.nextStep || "No next step recorded"}
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {item.nextMilestone || "No next milestone recorded"}
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {item.recurringAccount.summary || "No account summary recorded"}
                  </p>
                  <p className="mt-3 text-sm font-medium text-foreground">Recommended action</p>
                  <p className="mt-2 text-sm text-muted-foreground">{item.recommendedAction}</p>
                </div>

                <div className="mt-4 rounded-2xl border border-border bg-card/50 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                    Account readiness
                  </p>
                  <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
                    {[
                      ["Decision maker", item.recurringAccount.decisionMakerConfirmed],
                      ["Pricing shared", item.recurringAccount.pricingShared],
                      ["Service mix", item.recurringAccount.serviceMixDefined],
                      ["Cluster window", item.recurringAccount.clusterWindowDefined],
                      ["Proposal sent", Boolean(item.recurringAccount.proposalSentAt)],
                      ["Trial review date", Boolean(item.recurringAccount.trialReviewDueAt)],
                    ].map(([label, value]) => (
                      <div
                        key={label as string}
                        className={`rounded-xl border px-3 py-3 text-sm ${
                          value
                            ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
                            : "border-amber-500/20 bg-amber-500/10 text-amber-300"
                        }`}
                      >
                        {label as string}
                      </div>
                    ))}
                  </div>
                  {item.readinessBlockers.length > 0 ? (
                    <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                      {item.readinessBlockers.map((blocker) => (
                        <li key={`${item.promiseId}-${blocker}`} className="flex gap-2">
                          <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                          {blocker}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-4 text-sm text-muted-foreground">
                      Readiness looks clean enough to push this account forward.
                    </p>
                  )}
                </div>

                {item.recurringAccount.activityHistory &&
                item.recurringAccount.activityHistory.length > 0 ? (
                  <div className="mt-4 rounded-2xl border border-border bg-card/50 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                      Recent activity
                    </p>
                    <div className="mt-3 space-y-3">
                      {item.recurringAccount.activityHistory.slice(0, 4).map((activity) => (
                        <div
                          key={`${item.promiseId}-${activity.recordedAt}-${activity.summary}`}
                          className="rounded-xl border border-border/70 bg-background/40 p-3"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <p className="text-sm font-medium text-foreground">{activity.summary}</p>
                            <span className="text-xs text-muted-foreground">
                              {activity.kind} / {activity.actor}
                            </span>
                          </div>
                          <p className="mt-2 text-xs text-muted-foreground">
                            {activity.recordedAt}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                <RecurringAccountActionForm
                  promiseId={item.promiseId}
                  owner={item.owner}
                  recurringAccount={item.recurringAccount}
                />
              </div>
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-border bg-background/40 p-4 text-sm text-muted-foreground">
              No recurring-account work is being tracked yet.
            </div>
          )}
        </div>
      </section>

      <section className="mt-6 rounded-3xl border border-border bg-card/50 p-6">
        <h2 className="text-xl font-bold text-foreground">Current candidates</h2>
        <div className="mt-4 space-y-4">
          {snapshot.candidates.length > 0 ? (
            snapshot.candidates.map((candidate) => (
              <div
                key={`${candidate.sourceType}-${candidate.sourceId}`}
                className="rounded-2xl border border-border bg-background/60 p-4"
              >
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
