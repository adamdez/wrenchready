import { getNextProbableVisit } from "@/lib/promise-crm/closeout-recapture";
import type { PromiseRecord } from "@/lib/promise-crm/types";

export type CustomerTimelineItem = {
  label: string;
  detail: string;
  state: "complete" | "current" | "upcoming";
};

const INTERNAL_CUSTOMER_TEXT_PATTERNS = [
  /\bAdam\/Dez\b/gi,
  /\b(?:customer send|customer-send)\b/gi,
  /\b(?:internal service plan|internal field note|operator task)\b/gi,
  /\b(?:margin|cost basis|vendor cost)\b/gi,
];

const INTERNAL_SENTENCE_PATTERNS = [
  /[^.!?]*(?:customer send|customer-send|Adam\/Dez|internal service plan|internal field note|operator task|margin|cost basis|vendor cost|not created for this draft|payment-link creation)[^.!?]*[.!?]?/gi,
];

export function customerSafeText(value?: string, fallback = "We will update this as soon as the next step is confirmed.") {
  const original = value?.replace(/\s+/g, " ").trim();
  if (!original) return fallback;

  let clean = original;
  for (const pattern of INTERNAL_SENTENCE_PATTERNS) {
    clean = clean.replace(pattern, " ");
  }
  for (const pattern of INTERNAL_CUSTOMER_TEXT_PATTERNS) {
    clean = clean.replace(pattern, "");
  }

  clean = clean.replace(/\s+/g, " ").replace(/\s+([,.!?])/g, "$1").trim();
  return clean || fallback;
}

export function customerSafeScheduleLabel(value?: string) {
  const label = value?.replace(/\s+/g, " ").trim();
  if (!label) return "We are confirming the appointment window.";
  if (/needs|office|review|pending|tbd|not captured|not selected|no timing/i.test(label)) {
    return "We are confirming the appointment window.";
  }
  return label;
}

function getHeadline(promise: PromiseRecord) {
  if (promise.customerApproval.status === "awaiting-approval") {
    return "Your quote is ready for approval";
  }

  if (promise.customerApproval.status === "approved") {
    return "Thanks — your next service step is approved";
  }

  if (promise.customerApproval.status === "declined") {
    return "We recorded your response";
  }

  if (promise.status === "tomorrow-at-risk") {
    return "We are tightening the details of your visit";
  }

  if (promise.status === "follow-through-due") {
    return "Your visit is complete and we still owe you a clear next step";
  }

  if (promise.status === "completed") {
    return "Your WrenchReady visit is complete";
  }

  return "Your service request is moving forward";
}

function getSupportingMessage(promise: PromiseRecord) {
  if (promise.customerApproval.status === "awaiting-approval") {
    return customerSafeText(
      promise.customerApproval.summary,
      "Review the recommended work and let us know whether you want us to move ahead.",
    );
  }

  if (promise.status === "tomorrow-at-risk") {
    return "We are confirming the timing, parts, and visit details before we lock the promise fully.";
  }

  if (promise.status === "follow-through-due") {
    const nextProbableVisit = getNextProbableVisit(promise);
    return (
      customerSafeText(
        promise.closeout?.customerConditionSummary ||
          promise.closeout?.workPerformedSummary ||
          promise.commercialOutcome?.outcomeSummary ||
          nextProbableVisit?.reason ||
          promise.nextAction,
        "We still need to close the loop with your recap, next service step, or follow-up recommendation.",
      )
    );
  }

  if (promise.status === "completed") {
    const nextProbableVisit = getNextProbableVisit(promise);
    return (
      customerSafeText(
        promise.closeout?.customerConditionSummary ||
          promise.closeout?.workPerformedSummary ||
          promise.commercialOutcome?.outcomeSummary ||
          nextProbableVisit?.reason,
        "Your visit is complete. We keep this page updated so you can see what happened and what comes next.",
      )
    );
  }

  return customerSafeText(promise.readinessSummary);
}

export function getCustomerStatusTone(promise: PromiseRecord) {
  if (promise.customerApproval.status === "awaiting-approval") return "attention";
  if (promise.status === "tomorrow-at-risk") return "risk";
  if (promise.status === "completed") return "complete";
  if (promise.status === "follow-through-due") return "follow-through";
  return "active";
}

export function buildCustomerTimeline(promise: PromiseRecord): CustomerTimelineItem[] {
  const nextProbableVisit = getNextProbableVisit(promise);
  const isApprovalActive = promise.customerApproval.status === "awaiting-approval";
  const isApprovalAnswered =
    promise.customerApproval.status === "approved" ||
    promise.customerApproval.status === "declined";
  const isVisitComplete =
    promise.status === "completed" || promise.status === "follow-through-due";
  const hasFollowThrough =
    promise.status === "follow-through-due" ||
    !!promise.followThroughDueAt ||
    promise.customerApproval.status === "approved";

  return [
    {
      label: "Request received",
      detail: "Your service request is in the WrenchReady system.",
      state: "complete",
    },
    {
      label: "Visit plan",
      detail:
        promise.status === "tomorrow-at-risk"
          ? "We are still tightening the timing or readiness details before we lock the promise."
          : `Current window: ${customerSafeScheduleLabel(promise.scheduledWindow.label)}.`,
      state: promise.status === "tomorrow-at-risk" ? "current" : "complete",
    },
    {
      label: "Quote decision",
      detail: customerSafeText(
        promise.customerApproval.summary,
        "If additional work is needed, you will see it here and can approve or decline it.",
      ),
      state: isApprovalActive ? "current" : isApprovalAnswered ? "complete" : "upcoming",
    },
    {
      label: "Visit complete",
      detail: customerSafeText(
        promise.closeout?.workPerformedSummary ||
          promise.commercialOutcome?.outcomeSummary,
        "We update this step when the visit is complete and the recap is ready.",
      ),
      state: isVisitComplete ? "complete" : isApprovalActive ? "upcoming" : "current",
    },
    {
      label: "Next step",
      detail: customerSafeText(
        nextProbableVisit?.reason ||
          promise.nextAction,
        "If a follow-up, deferred repair, or maintenance reminder is needed, it will show here.",
      ),
      state: hasFollowThrough ? "current" : isVisitComplete ? "upcoming" : "upcoming",
    },
  ];
}

export function buildCustomerStatusView(promise: PromiseRecord) {
  return {
    headline: getHeadline(promise),
    message: getSupportingMessage(promise),
    tone: getCustomerStatusTone(promise),
    timeline: buildCustomerTimeline(promise),
  };
}
