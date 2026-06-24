import type {
  PromiseJobStage,
  PromiseRecord,
} from "@/lib/promise-crm/types";

/**
 * Single source of truth for "what state is this job in?".
 *
 * The Promise CRM stores ~14 independent status enums (jobStage, customerApproval,
 * quotePacket.*, paymentCollection.status, followThrough*, ...) that nothing forces
 * to agree. Deriving "status" or the funnel stepper independently from those fields
 * is what produced the contradictions (two "current" steps, 5 different status labels,
 * a past-due follow-up shown next to a future schedule).
 *
 * `resolvePromiseState` collapses all of that into ONE canonical pipeline stage plus a
 * single status label, the per-step states for the funnel, the human-review gates, and
 * the one next action. Every funnel/status surface should render FROM this — never
 * recompute stage from raw fields.
 *
 * Pure + dependency-free so it can be unit-verified against fixtures and later graduated
 * to an XState machine without changing callers.
 */

export type PromiseStage =
  | "intake"
  | "quote"
  | "schedule"
  | "field"
  | "payment"
  | "followup";

export const PROMISE_STAGES: PromiseStage[] = [
  "intake",
  "quote",
  "schedule",
  "field",
  "payment",
  "followup",
];

export type PromiseStepState = "done" | "current" | "blocked" | "upcoming";

export type ResolvedPromiseState = {
  /** Canonical pipeline stage the job is sitting in. `null` stage = fully complete. */
  stage: PromiseStage | null;
  /** Index into PROMISE_STAGES of the active stage; `null` when terminal. */
  stageIndex: number | null;
  /** "won" = completed & paid, "lost" = closed/declined, null = still in progress. */
  terminal: "won" | "lost" | null;
  /** Reason captured when a lead was marked lost (from the declined outcome summary). */
  lostReason?: string;
  /** The ONE canonical status label (same vocabulary the board already uses). */
  label: string;
  /** Per-stage states for the 6-step funnel, in PROMISE_STAGES order. Exactly one
   *  "current" while in progress; zero when complete; "blocked" replaces "current"
   *  when the active stage has a blocker. Never two "current". */
  stepStates: PromiseStepState[];
  /** Human-review gates. Customer-facing actions stay locked until these are true. */
  gates: {
    canSendQuote: boolean;
    canCreatePaymentLink: boolean;
  };
  /** Why the active stage can't advance yet (e.g. quote blockers). */
  blockers: string[];
  /** The single most important next move for the current stage. */
  nextAction: { id: string; label: string };
};

/** Minimal structural input — satisfied by both `PromiseRecord` and the page's
 *  derived `PromiseDetailRecord`, so this resolver works from anywhere. */
export type ResolvablePromise = Pick<
  PromiseRecord,
  | "status"
  | "jobStage"
  | "customerApproval"
  | "paymentCollection"
  | "quotePacket"
  | "closeout"
  | "followThroughResolution"
  | "followThroughDueAt"
  | "commercialOutcome"
>;

const STAGES_AFTER_QUOTE: PromiseJobStage[] = [
  "scheduled",
  "confirmed",
  "en-route",
  "on-site",
  "completed",
  "collected",
];
const FIELD_STARTED: PromiseJobStage[] = [
  "en-route",
  "on-site",
  "waiting-approval",
  "completed",
  "collected",
];
const FIELD_DONE: PromiseJobStage[] = ["completed", "collected"];

/** A quote is blocked when its packet carries blockers or is explicitly blocked.
 *  Defined here so the page and the resolver share one definition. */
export function quoteIsBlocked(record: ResolvablePromise): boolean {
  return Boolean(
    record.quotePacket?.blockers.length || record.quotePacket?.status === "blocked",
  );
}

/** True for the pre-customer-send review window: drafted/quoted, not approved, not
 *  sent, no live payment link. Single definition reused by the board label + page. */
export function isQuoteScheduleReview(record: ResolvablePromise): boolean {
  const customerNotApproved = record.customerApproval.status !== "approved";
  const notSentToCustomer = record.quotePacket?.customerSendStatus !== "sent";
  const noLivePaymentLink =
    !record.paymentCollection?.depositCheckoutUrl &&
    !record.paymentCollection?.balanceCheckoutUrl &&
    record.quotePacket?.paymentLinkStatus !== "ready";

  return (
    record.jobStage === "quoted" &&
    customerNotApproved &&
    notSentToCustomer &&
    noLivePaymentLink
  );
}

function resolveLabel(record: ResolvablePromise): string {
  if (isQuoteScheduleReview(record)) return "Quote / schedule review";
  if (record.status === "tomorrow-at-risk") return "At risk";
  if (record.status === "follow-through-due") return "Follow-up due";
  if (record.status === "completed") return "Completed";
  return "Promised";
}

export function resolvePromiseState(record: ResolvablePromise): ResolvedPromiseState {
  // LOST terminal: a lead closed without converting (e.g. went with a competitor) is
  // recorded as a "declined" commercial outcome. Short-circuit so the page stops showing
  // happy-path CTAs ("send quote") and reads "Closed — Lost" with a Reopen action.
  if (record.commercialOutcome?.outcomeStatus === "declined") {
    return {
      stage: null,
      stageIndex: null,
      terminal: "lost",
      lostReason: record.commercialOutcome.outcomeSummary?.trim() || undefined,
      label: "Closed — Lost",
      stepStates: PROMISE_STAGES.map(() => "upcoming"),
      gates: { canSendQuote: false, canCreatePaymentLink: false },
      blockers: [],
      nextAction: { id: "reopen", label: "Reopen lead" },
    };
  }

  const quoteDone =
    record.customerApproval.status === "approved" ||
    STAGES_AFTER_QUOTE.includes(record.jobStage);
  const scheduleDone = FIELD_STARTED.includes(record.jobStage);
  const fieldDone = FIELD_DONE.includes(record.jobStage);
  const paymentDone =
    record.paymentCollection?.status === "paid" || record.jobStage === "collected";
  const closeoutDone = Boolean(
    record.closeout?.completedAt || record.followThroughResolution,
  );

  // Intake is always done (the record exists). The current stage is the FIRST stage
  // that is not yet done — computed once, so EXACTLY ONE stage is ever "current".
  const done = [true, quoteDone, scheduleDone, fieldDone, paymentDone, closeoutDone];
  const firstNotDone = done.findIndex((d) => !d);
  const stageIndex: number | null = firstNotDone === -1 ? null : firstNotDone;

  // Blockers attach to the active stage only.
  const quoteBlocked = quoteIsBlocked(record);
  const paymentBlocked = record.quotePacket?.paymentLinkStatus === "blocked";
  const blockers: string[] = [];
  if (stageIndex === 1 && quoteBlocked) {
    blockers.push(...(record.quotePacket?.blockers ?? ["Quote blocked"]));
  }
  if (stageIndex === 4 && paymentBlocked) {
    blockers.push("Payment link blocked");
  }

  const activeIsBlocked = blockers.length > 0;
  const stepStates: PromiseStepState[] = PROMISE_STAGES.map((_, i) => {
    if (stageIndex === null) return "done";
    if (i < stageIndex) return "done";
    if (i === stageIndex) return activeIsBlocked ? "blocked" : "current";
    return "upcoming";
  });

  const gates = {
    canSendQuote:
      Boolean(record.quotePacket) &&
      !quoteBlocked &&
      record.quotePacket?.customerSendStatus !== "sent",
    canCreatePaymentLink:
      record.customerApproval.status === "approved" && !paymentBlocked,
  };

  const stage: PromiseStage | null =
    stageIndex === null ? null : PROMISE_STAGES[stageIndex];

  return {
    stage,
    stageIndex,
    terminal: stageIndex === null ? "won" : null,
    label: resolveLabel(record),
    stepStates,
    gates,
    blockers,
    nextAction: resolveNextAction(stage, activeIsBlocked, gates),
  };
}

function resolveNextAction(
  stage: PromiseStage | null,
  blocked: boolean,
  gates: ResolvedPromiseState["gates"],
): { id: string; label: string } {
  switch (stage) {
    case "intake":
      return { id: "build-quote", label: "Build quote" };
    case "quote":
      if (blocked) return { id: "resolve-blockers", label: "Resolve quote blockers" };
      return gates.canSendQuote
        ? { id: "send-quote", label: "Approve & send quote" }
        : { id: "review-quote", label: "Review quote" };
    case "schedule":
      return { id: "schedule", label: "Schedule the visit" };
    case "field":
      return { id: "field", label: "Run the field job" };
    case "payment":
      return { id: "collect-payment", label: "Collect payment" };
    case "followup":
      return { id: "closeout", label: "Record closeout & send recap" };
    default:
      return { id: "complete", label: "Completed & paid" };
  }
}
