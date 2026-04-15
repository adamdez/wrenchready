import {
  getCollectionSnapshot,
  getOutboundQueueSnapshot,
  getProofDisciplineSnapshot,
  getRecurringAccountStarterSnapshot,
  getWarrantySnapshot,
  getWeeklyRecaptureScorecard,
  getWedgeFocusSnapshot,
} from "@/lib/promise-crm/storage";
import { getSystemsReadinessSnapshot } from "@/lib/promise-crm/system-readiness";
import type {
  OperatingCadenceAction,
  WeeklyOperatingCadenceSnapshot,
} from "@/lib/promise-crm/types";

export async function getWeeklyOperatingCadenceSnapshot(): Promise<WeeklyOperatingCadenceSnapshot> {
  const [recapture, outbound, proof, accounts, systems, collections, warranty, wedges] = await Promise.all([
    getWeeklyRecaptureScorecard(),
    getOutboundQueueSnapshot(),
    getProofDisciplineSnapshot(),
    getRecurringAccountStarterSnapshot(),
    getSystemsReadinessSnapshot(),
    getCollectionSnapshot(),
    getWarrantySnapshot(),
    getWedgeFocusSnapshot(),
  ]);

  const immediateActions: OperatingCadenceAction[] = [];

  if (recapture.metrics.closeoutRate < 1) {
    immediateActions.push({
      title: "Close out every finished visit before the week ends",
      detail:
        "If the visit is complete but the recap is not structured, the machine cannot learn, ask for proof, or earn the next visit.",
      owner: "Ops",
      href: "/ops/recapture",
      tone: "promise",
    });
  }

  if (outbound.summary.sendReady > 0) {
    immediateActions.push({
      title: "Clear the send-ready outbound queue",
      detail:
        "Recap, review, and reminder drafts are ready now. Keep the next touch visible instead of carrying it in memory.",
      owner: "Ops",
      href: "/ops/outbound",
      tone: "trust",
    });
  }

  if (recapture.metrics.collectionRate < 1 && recapture.metrics.depositsRequested > 0) {
    immediateActions.push({
      title: "Collect the open deposits and balances",
      detail:
        "Approved work is outrunning collected money. Tighten the deposit and balance lane before treating the promise as secure.",
      owner: "Ops",
      href: "/ops/collections",
      tone: "system",
    });
  }

  if (recapture.metrics.callbackOpen > 0) {
    immediateActions.push({
      title: "Close the open callback issues",
      detail:
        "Warranty or comeback work is still open. Finish the recovery path before it turns into a reputation problem.",
      owner: "Simon",
      href: "/ops/warranty",
      tone: "trust",
    });
  }

  if (proof.summary.proofWeak > 0) {
    immediateActions.push({
      title: "Tighten proof on the weakest completed visits",
      detail:
        "Good visits are still ending without permission-safe proof, customer language, or reusable relief notes.",
      owner: "Ops",
      href: "/ops/proof",
      tone: "trust",
    });
  }

  if (accounts.candidates.length > 0) {
    immediateActions.push({
      title: "Work the best recurring-account candidates this week",
      detail:
        "The pipeline already contains likely B2B or multi-vehicle opportunities. Turn one into a real repeatable lane.",
      owner: "Dez",
      href: "/ops/accounts",
      tone: "growth",
    });
  }

  if (accounts.summary.overdue > 0) {
    immediateActions.push({
      title: "Clear the overdue account touches",
      detail:
        "Recurring accounts are slipping past their next-touch date. Protect the lane before warm account work cools off.",
      owner: "Dez",
      href: "/ops/accounts",
      tone: "growth",
    });
  }

  const primaryWedgeNeedsWork = wedges.wedges.some(
    (wedge) =>
      wedge.homepagePriority === "primary" &&
      (wedge.action === "Protect the promise" || wedge.action === "Keep testing"),
  );

  if (primaryWedgeNeedsWork) {
    immediateActions.push({
      title: "Tighten the launch wedges before broadening demand",
      detail:
        "No-start help and brake help are the front door. Keep the homepage, intake, and response language narrow enough that these leads turn into believable promises.",
      owner: "Ops",
      href: "/ops/wedges",
      tone: "growth",
    });
  }

  if (systems.needsNow.length > 0) {
    immediateActions.push({
      title: "Clear the real system blockers before relying on them",
      detail:
        "Some channels and trust surfaces still need configuration before the team should treat them as production-safe.",
      owner: "Ops",
      href: "/ops/systems",
      tone: "system",
    });
  }

  if (immediateActions.length === 0) {
    immediateActions.push({
      title: "Protect the operating habit this week",
      detail:
        "The core spine is healthy. Keep the promise loop tight, keep proof disciplined, and keep next-visit work visible.",
      owner: "Ops",
      href: "/ops/recapture",
      tone: "promise",
    });
  }

  const managementCommitments = [
    {
      title: "Own one recurring-account conversion move",
      owner: "Dez" as const,
      detail:
        accounts.ownerTargets.find((item) => item.owner === "Dez")?.weeklyTarget ||
        "Advance one account from lead or proposal into the next real decision.",
      href: "/ops/accounts",
    },
    {
      title: "Turn trial and quality truth into activation confidence",
      owner: "Simon" as const,
      detail:
        accounts.ownerTargets.find((item) => item.owner === "Simon")?.weeklyTarget ||
        "Protect the service quality that makes recurring work believable.",
      href: "/ops/accounts",
    },
    {
      title: "Run the Friday operating review from facts, not memory",
      owner: "Ops" as const,
      detail:
        "Review closeout quality, callbacks, balances, wedge performance, and recurring-account movement in one packet before the week rolls over.",
      href: "/ops/management",
    },
  ];

  return {
    generatedAt: new Date().toISOString(),
    companyGoal: systems.companyGoal,
    buildGoal: systems.buildGoal,
    why:
      "The business only works if WrenchReady gets customers, makes clear promises, keeps them visibly, and turns kept promises into repeat and recurring revenue.",
    standard: [
      "The promise must be specific enough to operationalize.",
      "The customer must be able to feel progress and certainty.",
      "Risk must be visible before the promise breaks, not after.",
      "Every finished visit should create proof, a recap, and the next probable visit.",
      "No channel should be treated as live if compliance or transport reality says otherwise.",
    ],
    metrics: {
      closeoutRate: recapture.metrics.closeoutRate,
      closeoutQualityRate: recapture.metrics.closeoutQualityRate,
      outboundSendReady: outbound.summary.sendReady,
      balancesOpen: collections.totalBalanceOpen,
      callbackOpen: warranty.open,
      proofWeak: proof.summary.proofWeak,
      recurringCandidates: accounts.candidates.length,
      recurringOverdue: accounts.summary.overdue,
      proposalDue: accounts.summary.proposalDue,
      trialReviewDue: accounts.summary.trialReviewDue,
    },
    weeklyRitual: [
      {
        label: "Monday reset",
        owner: "Ops",
        detail:
          "Review the management page, tighten tomorrow risk, and make the wedge and recurring priorities explicit for the week.",
        href: "/ops/management",
      },
      {
        label: "Daily promise check",
        owner: "Ops",
        detail:
          "Clear tomorrow-at-risk blockers, tighten field packets, and keep collections from trailing execution.",
        href: "/ops/tomorrow",
      },
      {
        label: "Midweek account push",
        owner: "Dez",
        detail:
          "Advance one recurring account with a real proposal, one trial date, or one active-cadence protection move.",
        href: "/ops/accounts",
      },
      {
        label: "Friday recapture review",
        owner: "Simon",
        detail:
          "Check closeout quality, review completion, reminder seed quality, and callback recovery before the week ends.",
        href: "/ops/recapture",
      },
    ],
    recurring: {
      headline: accounts.weeklyPlan.headline,
      tracked: accounts.summary.tracked,
      active: accounts.summary.active,
      trialActive: accounts.summary.trialActive,
      activeMonthlyValueEstimate: accounts.summary.activeMonthlyValueEstimate,
      touchDisciplineRate: accounts.summary.touchDisciplineRate,
      trialConversionRate: accounts.summary.trialConversionRate,
      readyToPitch: accounts.summary.readyToPitch,
      readyToActivate: accounts.summary.readyToActivate,
      proposalValueInFlight: accounts.summary.proposalValueInFlight,
      activationValueInFlight: accounts.summary.activationValueInFlight,
      focusAreas: accounts.weeklyPlan.focusAreas,
    },
    ownerScorecard: accounts.ownerTargets,
    managementCommitments,
    wedgeFocus: {
      headline: wedges.headline,
      primaryWedge: wedges.wedges.find((wedge) => wedge.homepagePriority === "primary")?.title,
      promotedCount: wedges.wedges
        .filter((wedge) => wedge.homepagePriority === "primary")
        .reduce((total, wedge) => total + wedge.promotedCount, 0),
      netProfitInView: wedges.wedges
        .filter((wedge) => wedge.homepagePriority === "primary")
        .reduce((total, wedge) => total + wedge.netProfitInView, 0),
      focusAreas: wedges.focusAreas,
    },
    immediateActions: immediateActions.slice(0, 6),
  };
}
