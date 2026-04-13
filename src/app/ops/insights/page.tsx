import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight, BarChart3 } from "lucide-react";
import {
  getCloseoutRecaptureSnapshot,
  getMarketingOfferPerformance,
  getPromiseEconomicsRollup,
} from "@/lib/promise-crm/server";
import type { MarketingOfferPerformance } from "@/lib/promise-crm/types";

export const metadata: Metadata = {
  title: "Offer Performance",
  robots: {
    index: false,
    follow: false,
  },
};

export const dynamic = "force-dynamic";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

type OfferAction =
  | "Market harder"
  | "Keep testing"
  | "Screen harder"
  | "Bundle only"
  | "Follow-through focus";

function getOfferAction(offer: MarketingOfferPerformance): OfferAction {
  if (offer.dispatchTier === "bundle-only" || offer.dispatchTier === "decline-standalone") {
    return "Bundle only";
  }

  if (offer.inboundCount > 0 && offer.promotedCount === 0) {
    return "Screen harder";
  }

  if (
    offer.promotedCount > 0 &&
    offer.convertedWorkCount === 0 &&
    offer.deferredWorkCount > 0
  ) {
    return "Follow-through focus";
  }

  if (offer.netProfitInView > 0 && offer.convertedWorkCount > 0) {
    return "Market harder";
  }

  return "Keep testing";
}

function getOfferActionDetail(offer: MarketingOfferPerformance) {
  const action = getOfferAction(offer);

  switch (action) {
    case "Bundle only":
      return "Keep this offer alive for demand capture, but only dispatch it when it supports route density or a larger ticket.";
    case "Screen harder":
      return "Demand exists, but the promise quality is not strong enough yet. Tighten qualification before confirming windows.";
    case "Follow-through focus":
      return "The offer is opening real work, but value is leaking into deferred recommendations. Tighten recap and next-step follow-through.";
    case "Market harder":
      return "This offer is already producing both work and net profit. It is a candidate for stronger ad spend and homepage emphasis.";
    case "Keep testing":
    default:
      return "The signal is still early. Keep tracking the offer without overweighting it yet.";
  }
}

export default async function OfferPerformancePage() {
  const [offers, economics, closeout] = await Promise.all([
    getMarketingOfferPerformance(),
    getPromiseEconomicsRollup(),
    getCloseoutRecaptureSnapshot(),
  ]);
  const topNetProfitOffer = offers[0];
  const topDemandOffer = [...offers].sort((a, b) => b.inboundCount - a.inboundCount)[0];
  const mostDeferredOffer = [...offers].sort((a, b) => b.deferredValueTotal - a.deferredValueTotal)[0];
  const marketHarderOffers = offers.filter((offer) => getOfferAction(offer) === "Market harder");
  const screenHarderOffers = offers.filter((offer) => getOfferAction(offer) === "Screen harder");
  const followThroughOffers = offers.filter(
    (offer) => getOfferAction(offer) === "Follow-through focus",
  );

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
          <BarChart3 className="h-3.5 w-3.5" />
          Offer Performance
        </span>
        <h1 className="mt-5 text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
          What we market vs what actually creates net profit
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-relaxed text-muted-foreground sm:text-lg">
          This is the first decision layer for demand shaping. It helps us separate good demand
          capture from good dispatch and from good money.
        </p>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-border bg-background/60 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
              Offers tracked
            </p>
            <p className="mt-2 text-2xl font-bold text-foreground">{offers.length}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Distinct marketed offers currently represented in inbound or promise data.
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-background/60 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
              Revenue in view
            </p>
            <p className="mt-2 text-2xl font-bold text-foreground">
              {formatCurrency(economics.totalRevenue)}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Current revenue attached to promises where economics have been captured.
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-background/60 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
              Net profit in view
            </p>
            <p className="mt-2 text-2xl font-bold text-foreground">
              {formatCurrency(economics.totalNetProfitEstimate)}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Estimated net profit from tracked promises after costs and reserves.
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-border bg-background/60 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
              Best net profit signal
            </p>
            <p className="mt-2 text-lg font-semibold text-foreground">
              {topNetProfitOffer?.marketingOffer || "No priced offers yet"}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {topNetProfitOffer
                ? `${formatCurrency(topNetProfitOffer.netProfitInView)} in view`
                : "Capture quote, invoice, and cost data to unlock this."}
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-background/60 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
              Strongest demand capture
            </p>
            <p className="mt-2 text-lg font-semibold text-foreground">
              {topDemandOffer?.marketingOffer || "No inbound yet"}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {topDemandOffer
                ? `${topDemandOffer.inboundCount} inbound / ${formatPercent(topDemandOffer.promotionRate)} promoted`
                : "No live offer data yet."}
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-background/60 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
              Biggest deferred value
            </p>
            <p className="mt-2 text-lg font-semibold text-foreground">
              {mostDeferredOffer?.marketingOffer || "No deferred work yet"}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {mostDeferredOffer && mostDeferredOffer.deferredValueTotal > 0
                ? `${formatCurrency(mostDeferredOffer.deferredValueTotal)} deferred`
                : "No deferred-value data captured yet."}
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-border bg-background/60 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
              Market harder
            </p>
            <p className="mt-2 text-lg font-semibold text-foreground">
              {marketHarderOffers[0]?.marketingOffer || "No proven offer yet"}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {marketHarderOffers.length > 0
                ? `${marketHarderOffers.length} offer${marketHarderOffers.length === 1 ? "" : "s"} already show both conversion and net profit.`
                : "No offer has enough real conversion plus margin signal yet."}
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-background/60 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
              Screen harder
            </p>
            <p className="mt-2 text-lg font-semibold text-foreground">
              {screenHarderOffers[0]?.marketingOffer || "No obvious screen issue"}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {screenHarderOffers.length > 0
                ? `${screenHarderOffers.length} offer${screenHarderOffers.length === 1 ? "" : "s"} need better qualification before ops makes promises.`
                : "Current live offers are reaching promise stage cleanly enough."}
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-background/60 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
              Follow-through focus
            </p>
            <p className="mt-2 text-lg font-semibold text-foreground">
              {followThroughOffers[0]?.marketingOffer || "No deferred-value cluster"}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {followThroughOffers.length > 0
                ? `${followThroughOffers.length} offer${followThroughOffers.length === 1 ? "" : "s"} are creating value that still needs to be closed or scheduled.`
                : "No major deferred-value pattern is visible yet."}
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-3 xl:grid-cols-6">
          <div className="rounded-2xl border border-border bg-background/60 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
              Closeout done
            </p>
            <p className="mt-2 text-2xl font-bold text-foreground">{closeout.closeoutCompleted}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {closeout.completedPromises > 0
                ? `${formatPercent(closeout.closeoutCompleted / closeout.completedPromises)} of completed visits`
                : "No completed visits yet"}
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-background/60 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
              Review ready
            </p>
            <p className="mt-2 text-2xl font-bold text-foreground">{closeout.reviewReady}</p>
            <p className="mt-1 text-sm text-muted-foreground">Visits ready for the ask but not sent yet.</p>
          </div>
          <div className="rounded-2xl border border-border bg-background/60 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
              Review sent
            </p>
            <p className="mt-2 text-2xl font-bold text-foreground">{closeout.reviewSent}</p>
            <p className="mt-1 text-sm text-muted-foreground">Review asks already pushed out.</p>
          </div>
          <div className="rounded-2xl border border-border bg-background/60 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
              Reminder seeded
            </p>
            <p className="mt-2 text-2xl font-bold text-foreground">{closeout.reminderSeeded}</p>
            <p className="mt-1 text-sm text-muted-foreground">Completed visits with a reminder seed waiting.</p>
          </div>
          <div className="rounded-2xl border border-border bg-background/60 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
              Next visit captured
            </p>
            <p className="mt-2 text-2xl font-bold text-foreground">
              {closeout.nextProbableVisitCaptured}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">Completed visits that already know the next probable visit.</p>
          </div>
          <div className="rounded-2xl border border-border bg-background/60 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
              Deferred value open
            </p>
            <p className="mt-2 text-2xl font-bold text-foreground">
              {formatCurrency(closeout.deferredValueOpen)}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">Value still sitting in completed-visit follow-up.</p>
          </div>
        </div>
      </section>

      <section className="mt-6 rounded-3xl border border-border bg-card/50 p-6">
        <h2 className="text-2xl font-bold text-foreground">Closeout and recapture read</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-border bg-background/60 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
              Now items
            </p>
            <p className="mt-2 text-xl font-semibold text-foreground">{closeout.nowItems}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Immediate next-step items created by closeout.
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-background/60 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
              Soon items
            </p>
            <p className="mt-2 text-xl font-semibold text-foreground">{closeout.soonItems}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Near-term next visits or recommended follow-up steps.
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-background/60 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
              Monitor items
            </p>
            <p className="mt-2 text-xl font-semibold text-foreground">{closeout.monitorItems}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Watchlist items that still need future reminder logic.
            </p>
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-border bg-background/60 p-4 text-sm text-muted-foreground">
          Closeout read:
          {" "}
          {closeout.completedPromises === 0
            ? "No completed visits are teaching the recapture machine yet."
            : closeout.closeoutCompleted < closeout.completedPromises
              ? "Completed visits are still leaking learning. Finish closeout on every finished job."
              : closeout.reviewReady > 0
                ? "The machine is creating review-ready visits. The next leverage is actually sending the ask."
                : closeout.reminderSeeded > 0
                  ? "The machine knows the next touch. The next leverage is turning reminder seeds into scheduled follow-up."
                  : "Completed visits are starting to produce structured recapture data instead of just disappearing into history."}
        </div>
      </section>

      <section className="mt-6 space-y-4">
        {offers.map((offer) => (
          <div
            key={`${offer.marketingOffer}-${offer.dispatchTier}`}
            className="rounded-3xl border border-border bg-card/50 p-6"
          >
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-3xl">
                <h2 className="text-2xl font-bold text-foreground">{offer.marketingOffer}</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Role: {offer.marketingRole} / Dispatch: {offer.dispatchTier}
                </p>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  Follow-on path:{" "}
                  {offer.followOnPath.length > 0
                    ? offer.followOnPath.join(" / ")
                    : "Needs follow-on definition"}
                </p>
              </div>

              <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background/60 px-4 py-2 text-sm text-muted-foreground">
                Promotion rate {formatPercent(offer.promotionRate)}
              </div>
            </div>

            <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
              Recommended action: {getOfferAction(offer)}
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-3 xl:grid-cols-6">
              <div className="rounded-2xl border border-border bg-background/60 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                  Inbound
                </p>
                <p className="mt-2 text-xl font-semibold text-foreground">{offer.inboundCount}</p>
              </div>
              <div className="rounded-2xl border border-border bg-background/60 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                  Promoted
                </p>
                <p className="mt-2 text-xl font-semibold text-foreground">{offer.promotedCount}</p>
              </div>
              <div className="rounded-2xl border border-border bg-background/60 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                  Converted work
                </p>
                <p className="mt-2 text-xl font-semibold text-foreground">{offer.convertedWorkCount}</p>
              </div>
              <div className="rounded-2xl border border-border bg-background/60 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                  Revenue
                </p>
                <p className="mt-2 text-xl font-semibold text-foreground">
                  {formatCurrency(offer.revenueInView)}
                </p>
              </div>
              <div className="rounded-2xl border border-border bg-background/60 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                  Net profit
                </p>
                <p className="mt-2 text-xl font-semibold text-foreground">
                  {formatCurrency(offer.netProfitInView)}
                </p>
              </div>
              <div className="rounded-2xl border border-border bg-background/60 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                  Deferred work
                </p>
                <p className="mt-2 text-xl font-semibold text-foreground">
                  {offer.deferredWorkCount}
                </p>
              </div>
              <div className="rounded-2xl border border-border bg-background/60 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                  Deferred value
                </p>
                <p className="mt-2 text-xl font-semibold text-foreground">
                  {offer.deferredValueTotal > 0 ? formatCurrency(offer.deferredValueTotal) : "None"}
                </p>
              </div>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-border bg-background/60 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                  Resolved promises
                </p>
                <p className="mt-2 text-xl font-semibold text-foreground">{offer.resolvedPromises}</p>
              </div>
              <div className="rounded-2xl border border-border bg-background/60 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                  Declined
                </p>
                <p className="mt-2 text-xl font-semibold text-foreground">{offer.declinedCount}</p>
              </div>
              <div className="rounded-2xl border border-border bg-background/60 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                  Avg net profit
                </p>
                <p className="mt-2 text-xl font-semibold text-foreground">
                  {offer.averageNetProfitPerPromise !== undefined
                    ? formatCurrency(offer.averageNetProfitPerPromise)
                    : "Not priced"}
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-border bg-background/60 p-4 text-sm text-muted-foreground">
              Decision read:
              {" "}
              {offer.inboundCount > 0 && offer.promotedCount === 0
                ? "Demand exists, but ops is not turning it into believable promises yet."
                : offer.promotedCount > 0 && offer.convertedWorkCount === 0 && offer.deferredWorkCount > 0
                  ? "This offer is creating real conversations, but most value is being deferred instead of closed."
                : offer.promotedCount > 0 && offer.promisesWithEconomics === 0
                  ? "This offer is reaching promise stage, but we still are not pricing outcomes consistently."
                : offer.netProfitInView > 0
                    ? "This offer is beginning to show real commercial value, not just lead volume."
                    : "This offer needs more operating data before we lean harder into it."}
            </div>

            <div className="mt-4 rounded-2xl border border-border bg-background/60 p-4 text-sm text-muted-foreground">
              What to do next: {getOfferActionDetail(offer)}
            </div>
          </div>
        ))}
      </section>

      <section className="mt-6 rounded-3xl border border-border bg-card/50 p-6">
        <h2 className="text-xl font-bold text-foreground">What to do with this</h2>
        <div className="mt-4 space-y-3 text-sm text-muted-foreground">
          <p>Push harder on offers that drive both promoted promises and net profit.</p>
          <p>Keep demand-capture offers if they convert honestly into stronger work.</p>
          <p>Screen harder where inbound is real but promise quality or margin is weak.</p>
          <p>
            Treat every unpriced promise as unfinished learning. The machine only gets smarter when
            quote, invoice, hours, and costs are actually captured.
          </p>
        </div>
        <Link
          href="/ops/promises"
          className="mt-5 inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground transition-all hover:bg-secondary"
        >
          Back to execution
          <ArrowRight className="h-4 w-4" />
        </Link>
      </section>
    </div>
  );
}
