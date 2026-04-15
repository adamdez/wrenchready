import { NextResponse } from "next/server";
import { sendPromiseOpsAlert } from "@/lib/promise-crm/alerts";
import { getPromiseRecord, updatePromiseRecord } from "@/lib/promise-crm/server";
import type {
  CommercialOutcomeStatus,
  CustomerApprovalStatus,
  FollowThroughResolutionAction,
  FollowThroughReason,
  PromiseCloseout,
  PromiseCustomerCertainty,
  PromiseDayReadiness,
  PromiseJobStage,
  PromiseRecord,
} from "@/lib/promise-crm/types";
import { sendOpsWebhook } from "@/lib/promise-crm/webhooks";

function getCriticalCloseoutGaps(
  promise: PromiseRecord,
  closeout: Partial<PromiseCloseout> | null | undefined,
) {
  const mergedCloseout = {
    ...promise.closeout,
    ...closeout,
    customerRecap: {
      ...promise.closeout?.customerRecap,
      ...closeout?.customerRecap,
    },
    reviewRequest: {
      ...promise.closeout?.reviewRequest,
      ...closeout?.reviewRequest,
    },
    maintenanceReminder: {
      ...promise.closeout?.maintenanceReminder,
      ...closeout?.maintenanceReminder,
    },
    nextProbableVisit: {
      ...promise.closeout?.nextProbableVisit,
      ...closeout?.nextProbableVisit,
    },
    proofCapture: {
      ...promise.closeout?.proofCapture,
      ...closeout?.proofCapture,
      assets: closeout?.proofCapture?.assets ?? promise.closeout?.proofCapture?.assets ?? [],
    },
  };

  const gaps = [
    !mergedCloseout.workPerformedSummary ? "work performed summary" : null,
    !mergedCloseout.customerConditionSummary ? "customer condition summary" : null,
    !mergedCloseout.customerRecap?.summary ? "customer recap summary" : null,
    !mergedCloseout.reviewRequest?.summary ? "review ask summary" : null,
    !mergedCloseout.maintenanceReminder?.summary ? "maintenance reminder summary" : null,
    !mergedCloseout.nextProbableVisit?.service ? "next probable visit service" : null,
    !mergedCloseout.nextProbableVisit?.reason ? "next probable visit reason" : null,
    !mergedCloseout.proofCapture?.proofNotes &&
    !mergedCloseout.proofCapture?.customerReliefQuote &&
    !(mergedCloseout.proofCapture?.assets?.length)
      ? "proof capture" : null,
  ].filter((entry): entry is string => Boolean(entry));

  return gaps;
}

type RouteContext = {
  params: Promise<{ id: string }>;
};

export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const promise = await getPromiseRecord(id);

  if (!promise) {
    return NextResponse.json({ error: "Promise record not found." }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    promise,
  });
}

type UpdatePromisePayload = {
  owner?: "Dez" | "Simon" | "Unassigned";
  readinessRisk?: "low" | "medium" | "high";
  status?: "promises-waiting" | "tomorrow-at-risk" | "follow-through-due" | "completed";
  jobStage?: PromiseJobStage;
  serviceScope?: string;
  scheduledWindowLabel?: string;
  readinessSummary?: string;
  nextAction?: string;
  topRisks?: string[];
  noteToAdd?: string;
  economics?: {
    quotedAmount?: number;
    finalInvoiceAmount?: number;
    laborHours?: number;
    travelHours?: number;
    partsCostAmount?: number;
    techPayoutAmount?: number;
    supportCostAmount?: number;
    cardFeePercent?: number;
    warrantyReservePercent?: number;
  } | null;
  commercialOutcome?: {
    outcomeStatus?: string;
    convertedService?: string;
    deferredValueAmount?: number;
    outcomeSummary?: string;
  } | null;
  closeout?: Partial<PromiseCloseout> | null;
  followThroughDueAt?: string | null;
  followThroughResolution?: {
    resolvedAt?: string;
    resolvedBy?: "Dez" | "Simon" | "Unassigned";
    action?: FollowThroughResolutionAction;
    reason?: FollowThroughReason;
    summary?: string;
  } | null;
  customerApproval?: {
    status?: CustomerApprovalStatus;
    requestedAt?: string;
    respondedAt?: string;
    requestedService?: string;
    requestedAmount?: number;
    summary?: string;
    customerMessage?: string;
  } | null;
  customerCertainty?: PromiseCustomerCertainty | null;
  dayReadiness?: PromiseDayReadiness | null;
  fieldExecution?: {
    serviceGoal?: string;
    partsChecklist?: string[];
    photosRequired?: string[];
    inspectionChecklist?: string[];
    handoffChecklist?: string[];
    comebackPreventionSteps?: string[];
    notesTemplate?: string;
    upsellFocus?: string[];
    closeoutSteps?: string[];
  } | null;
  paymentCollection?: {
    status?: string;
    method?: string;
    processor?: string;
    depositRequestedAmount?: number;
    depositRequestedAt?: string;
    depositSessionId?: string;
    depositCheckoutUrl?: string;
    depositPaidAt?: string;
    balanceRequestedAt?: string;
    balanceSessionId?: string;
    balanceCheckoutUrl?: string;
    balancePaidAt?: string;
    lastPaymentReference?: string;
    amountCollected?: number;
    balanceDueAmount?: number;
    collectedAt?: string;
    invoiceReference?: string;
    writeOffReason?: string;
    paymentSummary?: string;
  } | null;
  warrantyCase?: {
    status?: string;
    severity?: string;
    rootCause?: string;
    issueSummary?: string;
    callbackDueAt?: string;
    makeGoodPlan?: string;
    preventionStep?: string;
    resolutionSummary?: string;
  } | null;
  recurringAccount?: {
    status?: string;
    accountName?: string;
    primaryContactName?: string;
    primaryContactRole?: string;
    contactEmail?: string;
    contactPhone?: string;
    targetLane?: string;
    vehicleCount?: number;
    cadenceLabel?: string;
    billingTerms?: string;
    monthlyValueEstimate?: number;
    proposalSentAt?: string;
    proposalValueEstimate?: number;
    proposalDecision?: string;
    proposalDecisionAt?: string;
    proposalDecisionReason?: string;
    trialStartAt?: string;
    trialReviewDueAt?: string;
    trialOutcome?: string;
    trialOutcomeAt?: string;
    trialOutcomeSummary?: string;
    activationTargetAt?: string;
    lastTouchedAt?: string;
    nextTouchDueAt?: string;
    nextStep?: string;
    summary?: string;
    decisionMakerConfirmed?: boolean;
    pricingShared?: boolean;
    serviceMixDefined?: boolean;
    clusterWindowDefined?: boolean;
    blockerSummary?: string;
    activityHistory?: Array<{
      recordedAt: string;
      actor: string;
      kind: string;
      summary: string;
    }>;
  } | null;
};

const COMMERCIAL_OUTCOME_STATUSES: CommercialOutcomeStatus[] = [
  "unknown",
  "approved-repair",
  "completed-maintenance",
  "diagnostic-only",
  "deferred-work",
  "declined",
];

const FOLLOW_THROUGH_RESOLUTION_ACTIONS: FollowThroughResolutionAction[] = [
  "scheduled-next-step",
  "recap-sent",
  "parked",
  "resolved-other",
];

function isEconomicsPayload(value: unknown) {
  if (value === null || value === undefined) return true;
  if (!value || typeof value !== "object") return false;

  return Object.values(value as Record<string, unknown>).every(
    (entry) => entry === undefined || typeof entry === "number",
  );
}

function isCommercialOutcomePayload(value: unknown) {
  if (value === null || value === undefined) return true;
  if (!value || typeof value !== "object") return false;

  const candidate = value as Record<string, unknown>;

  return (
    (candidate.outcomeStatus === undefined ||
      COMMERCIAL_OUTCOME_STATUSES.includes(candidate.outcomeStatus as CommercialOutcomeStatus)) &&
    (candidate.convertedService === undefined || typeof candidate.convertedService === "string") &&
    (candidate.deferredValueAmount === undefined || typeof candidate.deferredValueAmount === "number") &&
    (candidate.outcomeSummary === undefined || typeof candidate.outcomeSummary === "string")
  );
}

function isFollowThroughResolutionPayload(value: unknown) {
  if (value === null || value === undefined) return true;
  if (!value || typeof value !== "object") return false;

  const candidate = value as Record<string, unknown>;

  return (
    (candidate.resolvedAt === undefined || typeof candidate.resolvedAt === "string") &&
    (candidate.resolvedBy === undefined || typeof candidate.resolvedBy === "string") &&
    (candidate.reason === undefined || typeof candidate.reason === "string") &&
    (candidate.action === undefined ||
      FOLLOW_THROUGH_RESOLUTION_ACTIONS.includes(
        candidate.action as FollowThroughResolutionAction,
      )) &&
    (candidate.summary === undefined || typeof candidate.summary === "string")
  );
}

function isRecapItemPayload(value: unknown) {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;

  return (
    typeof candidate.title === "string" &&
    (candidate.detail === undefined || typeof candidate.detail === "string") &&
    (candidate.estimatedAmount === undefined ||
      typeof candidate.estimatedAmount === "number")
  );
}

function isProofAssetPayload(value: unknown) {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;

  return (
    typeof candidate.label === "string" &&
    (candidate.kind === undefined || typeof candidate.kind === "string") &&
    (candidate.note === undefined || typeof candidate.note === "string") &&
    (candidate.url === undefined || typeof candidate.url === "string") &&
    (candidate.permissionStatus === undefined ||
      candidate.permissionStatus === "unknown" ||
      candidate.permissionStatus === "internal-only" ||
      candidate.permissionStatus === "customer-approved")
  );
}

function isProofCapturePayload(value: unknown) {
  if (value === null || value === undefined) return true;
  if (!value || typeof value !== "object") return false;

  const candidate = value as Record<string, unknown>;
  return (
    (candidate.bookingReason === undefined || typeof candidate.bookingReason === "string") &&
    (candidate.promiseThatMatteredMost === undefined ||
      typeof candidate.promiseThatMatteredMost === "string") &&
    (candidate.customerReliefQuote === undefined ||
      typeof candidate.customerReliefQuote === "string") &&
    (candidate.proofNotes === undefined || typeof candidate.proofNotes === "string") &&
    (candidate.assets === undefined ||
      (Array.isArray(candidate.assets) && candidate.assets.every(isProofAssetPayload)))
  );
}

function isCloseoutPayload(value: unknown) {
  if (value === null || value === undefined) return true;
  if (!value || typeof value !== "object") return false;

  const candidate = value as Record<string, unknown>;

  const reviewRequest = candidate.reviewRequest;
  const maintenanceReminder = candidate.maintenanceReminder;
  const nextProbableVisit = candidate.nextProbableVisit;
  const proofCapture = candidate.proofCapture;
  const customerRecap = candidate.customerRecap;

  return (
    (candidate.completedAt === undefined || typeof candidate.completedAt === "string") &&
    (candidate.workPerformedSummary === undefined ||
      typeof candidate.workPerformedSummary === "string") &&
    (candidate.customerConditionSummary === undefined ||
      typeof candidate.customerConditionSummary === "string") &&
    (candidate.now === undefined ||
      (Array.isArray(candidate.now) && candidate.now.every(isRecapItemPayload))) &&
    (candidate.soon === undefined ||
      (Array.isArray(candidate.soon) && candidate.soon.every(isRecapItemPayload))) &&
    (candidate.monitor === undefined ||
      (Array.isArray(candidate.monitor) && candidate.monitor.every(isRecapItemPayload))) &&
    (customerRecap === undefined ||
      customerRecap === null ||
      (typeof customerRecap === "object" &&
        ((customerRecap as Record<string, unknown>).status === undefined ||
          typeof (customerRecap as Record<string, unknown>).status === "string"))) &&
    (reviewRequest === undefined ||
      reviewRequest === null ||
      (typeof reviewRequest === "object" &&
        (reviewRequest as Record<string, unknown>).status !== undefined)) &&
    (maintenanceReminder === undefined ||
      maintenanceReminder === null ||
      (typeof maintenanceReminder === "object" &&
        ((maintenanceReminder as Record<string, unknown>).service === undefined ||
          typeof (maintenanceReminder as Record<string, unknown>).service === "string"))) &&
    (nextProbableVisit === undefined ||
      nextProbableVisit === null ||
      (typeof nextProbableVisit === "object" &&
        (((nextProbableVisit as Record<string, unknown>).service === undefined ||
          typeof (nextProbableVisit as Record<string, unknown>).service === "string") &&
          ((nextProbableVisit as Record<string, unknown>).reason === undefined ||
            typeof (nextProbableVisit as Record<string, unknown>).reason === "string")))) &&
    isProofCapturePayload(proofCapture)
  );
}

function isCustomerApprovalPayload(value: unknown) {
  if (value === null || value === undefined) return true;
  if (!value || typeof value !== "object") return false;

  const candidate = value as Record<string, unknown>;

  return (
    (candidate.status === undefined || typeof candidate.status === "string") &&
    (candidate.requestedAt === undefined || typeof candidate.requestedAt === "string") &&
    (candidate.respondedAt === undefined || typeof candidate.respondedAt === "string") &&
    (candidate.requestedService === undefined ||
      typeof candidate.requestedService === "string") &&
    (candidate.requestedAmount === undefined ||
      typeof candidate.requestedAmount === "number") &&
    (candidate.summary === undefined || typeof candidate.summary === "string") &&
    (candidate.customerMessage === undefined ||
      typeof candidate.customerMessage === "string")
  );
}

function isCustomerCertaintyPayload(value: unknown) {
  if (value === null || value === undefined) return true;
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;

  return Object.values(candidate).every((entry) => typeof entry === "boolean");
}

function isDayReadinessPayload(value: unknown) {
  if (value === null || value === undefined) return true;
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;

  return Object.values(candidate).every((entry) => typeof entry === "boolean");
}

function isStringArray(value: unknown) {
  return Array.isArray(value) && value.every((entry) => typeof entry === "string");
}

function isFieldExecutionPayload(value: unknown) {
  if (value === null || value === undefined) return true;
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;

  return (
    (candidate.serviceGoal === undefined || typeof candidate.serviceGoal === "string") &&
    (candidate.partsChecklist === undefined || isStringArray(candidate.partsChecklist)) &&
    (candidate.photosRequired === undefined || isStringArray(candidate.photosRequired)) &&
    (candidate.inspectionChecklist === undefined ||
      isStringArray(candidate.inspectionChecklist)) &&
    (candidate.handoffChecklist === undefined || isStringArray(candidate.handoffChecklist)) &&
    (candidate.comebackPreventionSteps === undefined ||
      isStringArray(candidate.comebackPreventionSteps)) &&
    (candidate.notesTemplate === undefined || typeof candidate.notesTemplate === "string") &&
    (candidate.upsellFocus === undefined || isStringArray(candidate.upsellFocus)) &&
    (candidate.closeoutSteps === undefined || isStringArray(candidate.closeoutSteps))
  );
}

function isRecurringAccountActivityPayload(value: unknown) {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;

  return (
    typeof candidate.recordedAt === "string" &&
    typeof candidate.actor === "string" &&
    typeof candidate.kind === "string" &&
    typeof candidate.summary === "string"
  );
}

function isPaymentCollectionPayload(value: unknown) {
  if (value === null || value === undefined) return true;
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;

  return (
    (candidate.status === undefined || typeof candidate.status === "string") &&
    (candidate.method === undefined || typeof candidate.method === "string") &&
    (candidate.processor === undefined || typeof candidate.processor === "string") &&
    (candidate.depositRequestedAmount === undefined ||
      typeof candidate.depositRequestedAmount === "number") &&
    (candidate.depositRequestedAt === undefined || typeof candidate.depositRequestedAt === "string") &&
    (candidate.depositSessionId === undefined || typeof candidate.depositSessionId === "string") &&
    (candidate.depositCheckoutUrl === undefined ||
      typeof candidate.depositCheckoutUrl === "string") &&
    (candidate.depositPaidAt === undefined || typeof candidate.depositPaidAt === "string") &&
    (candidate.balanceRequestedAt === undefined || typeof candidate.balanceRequestedAt === "string") &&
    (candidate.balanceSessionId === undefined || typeof candidate.balanceSessionId === "string") &&
    (candidate.balanceCheckoutUrl === undefined ||
      typeof candidate.balanceCheckoutUrl === "string") &&
    (candidate.balancePaidAt === undefined || typeof candidate.balancePaidAt === "string") &&
    (candidate.lastPaymentReference === undefined ||
      typeof candidate.lastPaymentReference === "string") &&
    (candidate.amountCollected === undefined || typeof candidate.amountCollected === "number") &&
    (candidate.balanceDueAmount === undefined || typeof candidate.balanceDueAmount === "number") &&
    (candidate.collectedAt === undefined || typeof candidate.collectedAt === "string") &&
    (candidate.invoiceReference === undefined || typeof candidate.invoiceReference === "string") &&
    (candidate.writeOffReason === undefined || typeof candidate.writeOffReason === "string") &&
    (candidate.paymentSummary === undefined || typeof candidate.paymentSummary === "string")
  );
}

function isWarrantyCasePayload(value: unknown) {
  if (value === null || value === undefined) return true;
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;

  return (
    (candidate.status === undefined || typeof candidate.status === "string") &&
    (candidate.severity === undefined || typeof candidate.severity === "string") &&
    (candidate.rootCause === undefined || typeof candidate.rootCause === "string") &&
    (candidate.issueSummary === undefined || typeof candidate.issueSummary === "string") &&
    (candidate.callbackDueAt === undefined || typeof candidate.callbackDueAt === "string") &&
    (candidate.makeGoodPlan === undefined || typeof candidate.makeGoodPlan === "string") &&
    (candidate.preventionStep === undefined || typeof candidate.preventionStep === "string") &&
    (candidate.resolutionSummary === undefined ||
      typeof candidate.resolutionSummary === "string")
  );
}

function isRecurringAccountPayload(value: unknown) {
  if (value === null || value === undefined) return true;
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;

  return (
    (candidate.status === undefined || typeof candidate.status === "string") &&
    (candidate.accountName === undefined || typeof candidate.accountName === "string") &&
    (candidate.primaryContactName === undefined ||
      typeof candidate.primaryContactName === "string") &&
    (candidate.primaryContactRole === undefined ||
      typeof candidate.primaryContactRole === "string") &&
    (candidate.contactEmail === undefined || typeof candidate.contactEmail === "string") &&
    (candidate.contactPhone === undefined || typeof candidate.contactPhone === "string") &&
    (candidate.targetLane === undefined || typeof candidate.targetLane === "string") &&
    (candidate.vehicleCount === undefined || typeof candidate.vehicleCount === "number") &&
    (candidate.cadenceLabel === undefined || typeof candidate.cadenceLabel === "string") &&
    (candidate.billingTerms === undefined || typeof candidate.billingTerms === "string") &&
    (candidate.monthlyValueEstimate === undefined ||
      typeof candidate.monthlyValueEstimate === "number") &&
    (candidate.proposalSentAt === undefined || typeof candidate.proposalSentAt === "string") &&
    (candidate.proposalValueEstimate === undefined ||
      typeof candidate.proposalValueEstimate === "number") &&
    (candidate.proposalDecision === undefined || typeof candidate.proposalDecision === "string") &&
    (candidate.proposalDecisionAt === undefined || typeof candidate.proposalDecisionAt === "string") &&
    (candidate.proposalDecisionReason === undefined ||
      typeof candidate.proposalDecisionReason === "string") &&
    (candidate.trialStartAt === undefined || typeof candidate.trialStartAt === "string") &&
    (candidate.trialReviewDueAt === undefined ||
      typeof candidate.trialReviewDueAt === "string") &&
    (candidate.trialOutcome === undefined || typeof candidate.trialOutcome === "string") &&
    (candidate.trialOutcomeAt === undefined || typeof candidate.trialOutcomeAt === "string") &&
    (candidate.trialOutcomeSummary === undefined ||
      typeof candidate.trialOutcomeSummary === "string") &&
    (candidate.activationTargetAt === undefined ||
      typeof candidate.activationTargetAt === "string") &&
    (candidate.lastTouchedAt === undefined || typeof candidate.lastTouchedAt === "string") &&
    (candidate.nextTouchDueAt === undefined || typeof candidate.nextTouchDueAt === "string") &&
    (candidate.nextStep === undefined || typeof candidate.nextStep === "string") &&
    (candidate.summary === undefined || typeof candidate.summary === "string") &&
    (candidate.decisionMakerConfirmed === undefined ||
      typeof candidate.decisionMakerConfirmed === "boolean") &&
    (candidate.pricingShared === undefined || typeof candidate.pricingShared === "boolean") &&
    (candidate.serviceMixDefined === undefined ||
      typeof candidate.serviceMixDefined === "boolean") &&
    (candidate.clusterWindowDefined === undefined ||
      typeof candidate.clusterWindowDefined === "boolean") &&
    (candidate.blockerSummary === undefined || typeof candidate.blockerSummary === "string") &&
    (candidate.activityHistory === undefined ||
      (Array.isArray(candidate.activityHistory) &&
        candidate.activityHistory.every(isRecurringAccountActivityPayload)))
  );
}

function isUpdatePromisePayload(value: unknown): value is UpdatePromisePayload {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;

  return (
    (candidate.owner === undefined || typeof candidate.owner === "string") &&
    (candidate.readinessRisk === undefined || typeof candidate.readinessRisk === "string") &&
    (candidate.status === undefined || typeof candidate.status === "string") &&
    (candidate.serviceScope === undefined || typeof candidate.serviceScope === "string") &&
    (candidate.scheduledWindowLabel === undefined ||
      typeof candidate.scheduledWindowLabel === "string") &&
    (candidate.readinessSummary === undefined ||
      typeof candidate.readinessSummary === "string") &&
    (candidate.nextAction === undefined || typeof candidate.nextAction === "string") &&
    (candidate.topRisks === undefined ||
      (Array.isArray(candidate.topRisks) &&
        candidate.topRisks.every((entry) => typeof entry === "string"))) &&
    (candidate.noteToAdd === undefined || typeof candidate.noteToAdd === "string") &&
    isEconomicsPayload(candidate.economics) &&
    isCommercialOutcomePayload(candidate.commercialOutcome) &&
    isCloseoutPayload(candidate.closeout) &&
    isFollowThroughResolutionPayload(candidate.followThroughResolution) &&
    isCustomerApprovalPayload(candidate.customerApproval) &&
    isCustomerCertaintyPayload(candidate.customerCertainty) &&
    isDayReadinessPayload(candidate.dayReadiness) &&
    isFieldExecutionPayload(candidate.fieldExecution) &&
    isPaymentCollectionPayload(candidate.paymentCollection) &&
    isWarrantyCasePayload(candidate.warrantyCase) &&
    isRecurringAccountPayload(candidate.recurringAccount) &&
    (candidate.followThroughDueAt === undefined ||
      candidate.followThroughDueAt === null ||
      typeof candidate.followThroughDueAt === "string")
  );
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = await request.json();

    if (!isUpdatePromisePayload(body)) {
      return NextResponse.json(
        { error: "Promise update payload is invalid." },
        { status: 400 },
      );
    }

    const currentPromise = await getPromiseRecord(id);
    if (!currentPromise) {
      return NextResponse.json({ error: "Promise record not found." }, { status: 404 });
    }

    const resolvingToCompletedState =
      body.status === "completed" ||
      body.jobStage === "completed" ||
      body.jobStage === "collected";

    if (resolvingToCompletedState) {
      const criticalCloseoutGaps = getCriticalCloseoutGaps(currentPromise, body.closeout);
      if (criticalCloseoutGaps.length > 0) {
        return NextResponse.json(
          {
            error:
              "Complete the closeout before marking this promise finished. Missing: " +
              criticalCloseoutGaps.join(", "),
          },
          { status: 400 },
        );
      }
    }

    const promise = await updatePromiseRecord(id, {
      ...body,
      commercialOutcome:
        body.commercialOutcome === undefined || body.commercialOutcome === null
          ? body.commercialOutcome
          : {
              outcomeStatus:
                (body.commercialOutcome.outcomeStatus ?? "unknown") as CommercialOutcomeStatus,
              convertedService: body.commercialOutcome.convertedService,
              deferredValueAmount: body.commercialOutcome.deferredValueAmount,
              outcomeSummary: body.commercialOutcome.outcomeSummary,
            },
      closeout: body.closeout,
      followThroughResolution:
        body.followThroughResolution === undefined || body.followThroughResolution === null
          ? body.followThroughResolution
          : {
              resolvedAt:
                body.followThroughResolution.resolvedAt ?? new Date().toISOString(),
              resolvedBy: body.followThroughResolution.resolvedBy ?? "Unassigned",
              action:
                body.followThroughResolution.action ?? "resolved-other",
              reason: body.followThroughResolution.reason,
              summary: body.followThroughResolution.summary,
            },
      customerApproval:
        body.customerApproval === undefined || body.customerApproval === null
          ? body.customerApproval
          : {
              status: body.customerApproval.status ?? "not-needed",
              requestedAt: body.customerApproval.requestedAt,
              respondedAt: body.customerApproval.respondedAt,
              requestedService: body.customerApproval.requestedService,
              requestedAmount: body.customerApproval.requestedAmount,
              summary: body.customerApproval.summary,
              customerMessage: body.customerApproval.customerMessage,
            },
      customerCertainty: body.customerCertainty,
      dayReadiness: body.dayReadiness,
      jobStage: body.jobStage,
      fieldExecution: body.fieldExecution as PromiseRecord["fieldExecution"],
      paymentCollection: body.paymentCollection as PromiseRecord["paymentCollection"],
      warrantyCase: body.warrantyCase as PromiseRecord["warrantyCase"],
      recurringAccount: body.recurringAccount as PromiseRecord["recurringAccount"],
    });

    await sendOpsWebhook({
      event: "promise_updated",
      business: "wrenchready",
        payload: {
          promiseId: promise.id,
          owner: promise.owner,
          status: promise.status,
          jobStage: promise.jobStage,
          readinessRisk: promise.readinessRisk,
          followThroughDueAt: promise.followThroughDueAt || null,
        },
    });

    if (promise.closeout) {
      await sendOpsWebhook({
        event: "promise_closeout_updated",
        business: "wrenchready",
        payload: {
          promiseId: promise.id,
          owner: promise.owner,
          status: promise.status,
          reviewRequestStatus: promise.closeout.reviewRequest?.status || "not-ready",
          maintenanceReminderStatus:
            promise.closeout.maintenanceReminder?.status || "not-seeded",
          nextProbableVisit:
            promise.closeout.nextProbableVisit?.service || null,
        },
      });
    }

    await sendPromiseOpsAlert(promise).catch(() => false);

    return NextResponse.json({
      success: true,
      promise,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to update promise record.",
      },
      { status: 500 },
    );
  }
}
