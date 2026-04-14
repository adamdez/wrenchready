import {
  getCollectionSnapshot,
  getOutboundQueueSnapshot,
  getProofDisciplineSnapshot,
  getRecurringAccountStarterSnapshot,
  getWarrantySnapshot,
  getWeeklyRecaptureScorecard,
} from "@/lib/promise-crm/storage";
import { getSystemsReadinessSnapshot } from "@/lib/promise-crm/system-readiness";
import type {
  OperatingCadenceAction,
  WeeklyOperatingCadenceSnapshot,
} from "@/lib/promise-crm/types";

export async function getWeeklyOperatingCadenceSnapshot(): Promise<WeeklyOperatingCadenceSnapshot> {
  const [recapture, outbound, proof, accounts, systems, collections, warranty] = await Promise.all([
    getWeeklyRecaptureScorecard(),
    getOutboundQueueSnapshot(),
    getProofDisciplineSnapshot(),
    getRecurringAccountStarterSnapshot(),
    getSystemsReadinessSnapshot(),
    getCollectionSnapshot(),
    getWarrantySnapshot(),
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
      outboundSendReady: outbound.summary.sendReady,
      balancesOpen: collections.totalBalanceOpen,
      callbackOpen: warranty.open,
      proofWeak: proof.summary.proofWeak,
      recurringCandidates: accounts.candidates.length,
    },
    immediateActions: immediateActions.slice(0, 6),
  };
}
