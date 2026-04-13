import { getNextProbableVisit } from "@/lib/promise-crm/closeout-recapture";
import { getPlaybookRecommendation } from "@/lib/promise-crm/playbooks";
import type {
  PromiseOutboundDraft,
  PromiseOutboundSnapshot,
  PromiseRecord,
  PromiseRecapItem,
} from "@/lib/promise-crm/types";

function formatCurrency(value?: number) {
  if (value === undefined) return undefined;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatRecapList(items: PromiseRecapItem[] = []) {
  return items
    .slice(0, 3)
    .map((item) => {
      const amount = formatCurrency(item.estimatedAmount);
      return `- ${item.title}${item.detail ? `: ${item.detail}` : ""}${amount ? ` (${amount})` : ""}`;
    })
    .join("\n");
}

function getPromiseText(promise: PromiseRecord) {
  return [
    promise.serviceScope,
    promise.nextAction,
    promise.commercialOutcome?.convertedService || "",
    promise.closeout?.workPerformedSummary || "",
    promise.closeout?.maintenanceReminder?.service || "",
  ].join(" ");
}

function buildReviewAskDraft(promise: PromiseRecord): PromiseOutboundDraft {
  const review = promise.closeout?.reviewRequest;
  const playbook = getPlaybookRecommendation(getPromiseText(promise));
  const reliefQuote = promise.closeout?.proofCapture?.customerReliefQuote;
  const customerName = promise.customer.name.split(" ")[0] || promise.customer.name;

  if (!review || review.status === "not-ready") {
    return {
      status: "not-ready",
      channel: promise.customer.preferredContact === "email" ? "email" : "text",
      headline: "Review ask is not ready",
      body: "Capture a clear closeout and mark the review request ready before generating the ask.",
      reason: "No review-ready closeout state is recorded on this promise yet.",
    };
  }

  const ask =
    playbook.reviewAskScript?.ask ||
    `If today's visit made things easier, would you mind leaving a quick review about the clarity and reliability of the experience?`;
  const followUp =
    review.summary ||
    playbook.reviewAskScript?.followUpNote ||
    "Tie the ask to the promise that mattered most to the customer.";
  const proofHook =
    reliefQuote ||
    promise.closeout?.proofCapture?.promiseThatMatteredMost ||
    promise.closeout?.proofCapture?.bookingReason;

  return {
    status: review.status === "ready" ? "send-ready" : "draft",
    channel: review.channel || (promise.customer.preferredContact === "email" ? "email" : "text"),
    headline: "Review ask draft",
    subject: `Thanks again, ${customerName}`,
    body: [
      `Hi ${customerName},`,
      "",
      ask,
      review.reviewUrl ? "" : "",
      review.reviewUrl ? `Review link: ${review.reviewUrl}` : "",
      proofHook ? `What mattered most on this visit: ${proofHook}` : "",
      followUp ? `Operator note: ${followUp}` : "",
    ]
      .filter(Boolean)
      .join("\n"),
    reason:
      review.status === "ready"
        ? "The closeout is review-ready, so ops can send this ask as soon as the channel is available."
        : "A review draft exists, but the request is already marked sent or completed.",
  };
}

function buildReminderDraft(promise: PromiseRecord): PromiseOutboundDraft {
  const reminder = promise.closeout?.maintenanceReminder;
  const playbook = getPlaybookRecommendation(getPromiseText(promise));
  const customerName = promise.customer.name.split(" ")[0] || promise.customer.name;

  if (!reminder || reminder.status === "not-seeded" || !reminder.service) {
    return {
      status: "not-ready",
      channel: promise.customer.preferredContact === "email" ? "email" : "text",
      headline: "Reminder seed is not ready",
      body: "Seed the next maintenance touch in closeout before generating a reminder draft.",
      reason: "There is no maintenance reminder seed recorded yet.",
    };
  }

  const timing = reminder.dueLabel || reminder.dueAt || "the next recommended interval";
  const bodyLead =
    playbook.reminderSeedPlay?.message ||
    reminder.summary ||
    `We want to keep the next service step visible before it turns into a surprise later.`;

  return {
    status: reminder.status === "seeded" ? "send-ready" : "draft",
    channel: promise.customer.preferredContact === "email" ? "email" : "text",
    headline: "Maintenance reminder draft",
    subject: `${reminder.service} follow-up`,
    body: [
      `Hi ${customerName},`,
      "",
      bodyLead,
      `Recommended next step: ${reminder.service}.`,
      `Best timing: ${timing}.`,
      promise.closeout?.nextProbableVisit?.reason || reminder.summary || "",
    ]
      .filter(Boolean)
      .join("\n"),
    reason:
      reminder.status === "seeded"
        ? "This reminder is seeded and can become a real outbound touch when that channel is enabled."
        : "The reminder is already scheduled, so this is reference copy for the operator.",
  };
}

function buildCloseoutRecapDraft(promise: PromiseRecord): PromiseOutboundDraft {
  const closeout = promise.closeout;
  const nextVisit = getNextProbableVisit(promise);
  const customerName = promise.customer.name.split(" ")[0] || promise.customer.name;

  if (!closeout) {
    return {
      status: "not-ready",
      channel: "email",
      headline: "Closeout recap is not ready",
      body: "Record the structured closeout first so the customer leaves with a real recap.",
      reason: "No structured closeout is recorded yet.",
    };
  }

  const nowItems = formatRecapList(closeout.now);
  const soonItems = formatRecapList(closeout.soon);
  const monitorItems = formatRecapList(closeout.monitor);

  return {
    status: "draft",
    channel: promise.customer.preferredContact === "email" ? "email" : "text",
    headline: "Customer recap draft",
    subject: `Your WrenchReady visit recap`,
    body: [
      `Hi ${customerName},`,
      "",
      closeout.customerConditionSummary || "Here is the clearest recap from today's visit.",
      closeout.workPerformedSummary ? `Work completed: ${closeout.workPerformedSummary}` : "",
      nowItems ? `Now\n${nowItems}` : "",
      soonItems ? `Soon\n${soonItems}` : "",
      monitorItems ? `Monitor\n${monitorItems}` : "",
      nextVisit?.service
        ? `Most likely next visit: ${nextVisit.service}${nextVisit.timingLabel ? ` (${nextVisit.timingLabel})` : ""}.`
        : "",
    ]
      .filter(Boolean)
      .join("\n\n"),
    reason: "This recap turns the finished visit into a clear next-step story for the customer.",
  };
}

export function getPromiseProofSummary(promise: PromiseRecord) {
  const proof = promise.closeout?.proofCapture;
  if (!proof) return [];

  const summary = [
    proof.bookingReason ? `Booked because: ${proof.bookingReason}` : null,
    proof.promiseThatMatteredMost
      ? `Promise that mattered most: ${proof.promiseThatMatteredMost}`
      : null,
    proof.customerReliefQuote ? `Customer quote: ${proof.customerReliefQuote}` : null,
    proof.proofNotes ? `Proof notes: ${proof.proofNotes}` : null,
    ...proof.assets.map((asset) => `${asset.kind}: ${asset.label}${asset.note ? ` - ${asset.note}` : ""}`),
  ];

  return summary.filter((item): item is string => Boolean(item));
}

export function getPromiseOutboundSnapshot(
  promise: PromiseRecord,
): PromiseOutboundSnapshot {
  return {
    reviewAsk: buildReviewAskDraft(promise),
    reminderSeed: buildReminderDraft(promise),
    closeoutRecap: buildCloseoutRecapDraft(promise),
    proofSummary: getPromiseProofSummary(promise),
  };
}
