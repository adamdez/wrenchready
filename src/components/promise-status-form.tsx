"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CheckCircle2, Save } from "lucide-react";
import { computePromiseEconomics } from "@/lib/promise-crm/economics";
import type {
  CommercialOutcomeStatus,
  CustomerApprovalStatus,
  PromiseJobStage,
  PromisePaymentMethod,
  PromiseProofAsset,
  PromiseRecapItem,
  PromiseRecord,
  PromiseRecurringProposalDecision,
  PromiseRecurringTrialOutcome,
} from "@/lib/promise-crm/types";

type PromiseStatusFormProps = {
  promise: PromiseRecord;
};

function formatRiskList(value: string[]) {
  return value.join("\n");
}

function formatList(value: string[] = []) {
  return value.join("\n");
}

function parseList(value: string) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function formatRecapItems(value: PromiseRecapItem[] = []) {
  return value
    .map((item) =>
      [item.title, item.detail, item.estimatedAmount !== undefined ? item.estimatedAmount.toString() : ""]
        .filter(Boolean)
        .join(" | "),
    )
    .join("\n");
}

function parseRecapItems(value: string): PromiseRecapItem[] {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [titlePart = "", detailPart = "", amountPart = ""] = line
        .split("|")
        .map((entry) => entry.trim());
      const estimatedAmount = amountPart ? Number(amountPart) : undefined;

      return {
        title: titlePart,
        detail: detailPart || undefined,
        estimatedAmount:
          estimatedAmount !== undefined && !Number.isNaN(estimatedAmount)
            ? estimatedAmount
            : undefined,
      };
    })
    .filter((item) => item.title);
}

function formatProofAssets(value: PromiseProofAsset[] = []) {
  return value
    .map((item) =>
      [
        item.kind,
        item.label,
        item.note || "",
        item.url || "",
        item.permissionStatus || "",
      ]
        .filter(Boolean)
        .join(" | "),
    )
    .join("\n");
}

function parseProofAssets(value: string): PromiseProofAsset[] {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [kindPart = "", labelPart = "", notePart = "", urlPart = "", permissionPart = ""] = line
        .split("|")
        .map((entry) => entry.trim());
      const kind: PromiseProofAsset["kind"] =
        kindPart === "photo" ||
        kindPart === "testimonial" ||
        kindPart === "recap" ||
        kindPart === "review"
          ? kindPart
          : "recap";

      return {
        kind,
        label: labelPart,
        note: notePart || undefined,
        url: urlPart || undefined,
        permissionStatus:
          permissionPart === "customer-approved" ||
          permissionPart === "internal-only" ||
          permissionPart === "unknown"
            ? (permissionPart as PromiseProofAsset["permissionStatus"])
            : undefined,
      };
    })
    .filter((item) => item.label);
}

export function PromiseStatusForm({ promise }: PromiseStatusFormProps) {
  const router = useRouter();
  const [owner, setOwner] = useState<"Dez" | "Simon" | "Unassigned">(promise.owner);
  const [statusValue, setStatusValue] = useState<
    "promises-waiting" | "tomorrow-at-risk" | "follow-through-due" | "completed"
  >(promise.status);
  const [jobStage, setJobStage] = useState<PromiseJobStage>(promise.jobStage);
  const [readinessRisk, setReadinessRisk] = useState<"low" | "medium" | "high">(
    promise.readinessRisk,
  );
  const [scheduledWindowLabel, setScheduledWindowLabel] = useState(
    promise.scheduledWindow.label,
  );
  const [readinessSummary, setReadinessSummary] = useState(promise.readinessSummary);
  const [nextAction, setNextAction] = useState(promise.nextAction);
  const [topRisks, setTopRisks] = useState(formatRiskList(promise.topRisks));
  const [followThroughDueAt, setFollowThroughDueAt] = useState(
    promise.followThroughDueAt || "",
  );
  const [quotedAmount, setQuotedAmount] = useState(
    promise.economics?.quotedAmount?.toString() || "",
  );
  const [finalInvoiceAmount, setFinalInvoiceAmount] = useState(
    promise.economics?.finalInvoiceAmount?.toString() || "",
  );
  const [laborHours, setLaborHours] = useState(
    promise.economics?.laborHours?.toString() || "",
  );
  const [travelHours, setTravelHours] = useState(
    promise.economics?.travelHours?.toString() || "",
  );
  const [partsCostAmount, setPartsCostAmount] = useState(
    promise.economics?.partsCostAmount?.toString() || "",
  );
  const [techPayoutAmount, setTechPayoutAmount] = useState(
    promise.economics?.techPayoutAmount?.toString() || "",
  );
  const [supportCostAmount, setSupportCostAmount] = useState(
    promise.economics?.supportCostAmount?.toString() || "20",
  );
  const [cardFeePercent, setCardFeePercent] = useState(
    promise.economics?.cardFeePercent?.toString() || "3",
  );
  const [warrantyReservePercent, setWarrantyReservePercent] = useState(
    promise.economics?.warrantyReservePercent?.toString() || "2",
  );
  const [outcomeStatus, setOutcomeStatus] = useState(
    promise.commercialOutcome?.outcomeStatus || "unknown",
  );
  const [convertedService, setConvertedService] = useState(
    promise.commercialOutcome?.convertedService || "",
  );
  const [deferredValueAmount, setDeferredValueAmount] = useState(
    promise.commercialOutcome?.deferredValueAmount?.toString() || "",
  );
  const [outcomeSummary, setOutcomeSummary] = useState(
    promise.commercialOutcome?.outcomeSummary || "",
  );
  const [customerApprovalStatus, setCustomerApprovalStatus] = useState<CustomerApprovalStatus>(
    promise.customerApproval.status,
  );
  const [approvalRequestedAt, setApprovalRequestedAt] = useState(
    promise.customerApproval.requestedAt || "",
  );
  const [approvalRequestedService, setApprovalRequestedService] = useState(
    promise.customerApproval.requestedService || "",
  );
  const [approvalRequestedAmount, setApprovalRequestedAmount] = useState(
    promise.customerApproval.requestedAmount?.toString() || "",
  );
  const [approvalSummary, setApprovalSummary] = useState(
    promise.customerApproval.summary || "",
  );
  const [customerMessage, setCustomerMessage] = useState(
    promise.customerApproval.customerMessage || "",
  );
  const [completedAt, setCompletedAt] = useState(promise.closeout?.completedAt || "");
  const [workPerformedSummary, setWorkPerformedSummary] = useState(
    promise.closeout?.workPerformedSummary || "",
  );
  const [customerConditionSummary, setCustomerConditionSummary] = useState(
    promise.closeout?.customerConditionSummary || "",
  );
  const [nowRecap, setNowRecap] = useState(formatRecapItems(promise.closeout?.now));
  const [soonRecap, setSoonRecap] = useState(formatRecapItems(promise.closeout?.soon));
  const [monitorRecap, setMonitorRecap] = useState(formatRecapItems(promise.closeout?.monitor));
  const [customerRecapStatus, setCustomerRecapStatus] = useState<
    "not-ready" | "ready" | "sent"
  >(promise.closeout?.customerRecap?.status || "not-ready");
  const [customerRecapChannel, setCustomerRecapChannel] = useState<"email" | "text">(
    promise.closeout?.customerRecap?.channel || "email",
  );
  const [customerRecapSentAt, setCustomerRecapSentAt] = useState(
    promise.closeout?.customerRecap?.sentAt || "",
  );
  const [customerRecapSummary, setCustomerRecapSummary] = useState(
    promise.closeout?.customerRecap?.summary || "",
  );
  const [reviewRequestStatus, setReviewRequestStatus] = useState<
    "not-ready" | "ready" | "sent" | "completed"
  >(
    promise.closeout?.reviewRequest?.status || "not-ready",
  );
  const [reviewRequestDueAt, setReviewRequestDueAt] = useState(
    promise.closeout?.reviewRequest?.dueAt || "",
  );
  const [reviewRequestSentAt, setReviewRequestSentAt] = useState(
    promise.closeout?.reviewRequest?.sentAt || "",
  );
  const [reviewRequestChannel, setReviewRequestChannel] = useState<"email" | "text">(
    promise.closeout?.reviewRequest?.channel || "email",
  );
  const [reviewRequestSummary, setReviewRequestSummary] = useState(
    promise.closeout?.reviewRequest?.summary || "",
  );
  const [reviewUrl, setReviewUrl] = useState(
    promise.closeout?.reviewRequest?.reviewUrl || "",
  );
  const [maintenanceReminderStatus, setMaintenanceReminderStatus] = useState<
    "not-seeded" | "seeded" | "scheduled"
  >(
    promise.closeout?.maintenanceReminder?.status || "not-seeded",
  );
  const [maintenanceService, setMaintenanceService] = useState(
    promise.closeout?.maintenanceReminder?.service || "",
  );
  const [maintenanceDueLabel, setMaintenanceDueLabel] = useState(
    promise.closeout?.maintenanceReminder?.dueLabel || "",
  );
  const [maintenanceDueAt, setMaintenanceDueAt] = useState(
    promise.closeout?.maintenanceReminder?.dueAt || "",
  );
  const [maintenanceSummary, setMaintenanceSummary] = useState(
    promise.closeout?.maintenanceReminder?.summary || "",
  );
  const [nextProbableVisitService, setNextProbableVisitService] = useState(
    promise.closeout?.nextProbableVisit?.service || "",
  );
  const [nextProbableVisitReason, setNextProbableVisitReason] = useState(
    promise.closeout?.nextProbableVisit?.reason || "",
  );
  const [nextProbableVisitTimingLabel, setNextProbableVisitTimingLabel] = useState(
    promise.closeout?.nextProbableVisit?.timingLabel || "",
  );
  const [nextProbableVisitAmount, setNextProbableVisitAmount] = useState(
    promise.closeout?.nextProbableVisit?.estimatedAmount?.toString() || "",
  );
  const [bookingReason, setBookingReason] = useState(
    promise.closeout?.proofCapture?.bookingReason || "",
  );
  const [promiseThatMatteredMost, setPromiseThatMatteredMost] = useState(
    promise.closeout?.proofCapture?.promiseThatMatteredMost || "",
  );
  const [customerReliefQuote, setCustomerReliefQuote] = useState(
    promise.closeout?.proofCapture?.customerReliefQuote || "",
  );
  const [proofNotes, setProofNotes] = useState(
    promise.closeout?.proofCapture?.proofNotes || "",
  );
  const [proofAssets, setProofAssets] = useState(
    formatProofAssets(promise.closeout?.proofCapture?.assets),
  );
  const [contactConfirmed, setContactConfirmed] = useState(
    promise.customerCertainty.contactConfirmed,
  );
  const [arrivalWindowShared, setArrivalWindowShared] = useState(
    promise.customerCertainty.arrivalWindowShared,
  );
  const [pricingExpectationShared, setPricingExpectationShared] = useState(
    promise.customerCertainty.pricingExpectationShared,
  );
  const [updatesPlanShared, setUpdatesPlanShared] = useState(
    promise.customerCertainty.updatesPlanShared,
  );
  const [followUpExplained, setFollowUpExplained] = useState(
    promise.customerCertainty.followUpExplained,
  );
  const [customerConfirmed, setCustomerConfirmed] = useState(
    promise.dayReadiness.customerConfirmed,
  );
  const [locationConfirmed, setLocationConfirmed] = useState(
    promise.dayReadiness.locationConfirmed,
  );
  const [partsConfirmed, setPartsConfirmed] = useState(
    promise.dayReadiness.partsConfirmed,
  );
  const [toolsConfirmed, setToolsConfirmed] = useState(
    promise.dayReadiness.toolsConfirmed,
  );
  const [routeLocked, setRouteLocked] = useState(promise.dayReadiness.routeLocked);
  const [paymentMethodReady, setPaymentMethodReady] = useState(
    promise.dayReadiness.paymentMethodReady,
  );
  const [serviceGoal, setServiceGoal] = useState(promise.fieldExecution?.serviceGoal || "");
  const [partsChecklist, setPartsChecklist] = useState(
    formatList(promise.fieldExecution?.partsChecklist),
  );
  const [photosRequired, setPhotosRequired] = useState(
    formatList(promise.fieldExecution?.photosRequired),
  );
  const [inspectionChecklist, setInspectionChecklist] = useState(
    formatList(promise.fieldExecution?.inspectionChecklist),
  );
  const [handoffChecklist, setHandoffChecklist] = useState(
    formatList(promise.fieldExecution?.handoffChecklist),
  );
  const [comebackPreventionSteps, setComebackPreventionSteps] = useState(
    formatList(promise.fieldExecution?.comebackPreventionSteps),
  );
  const [notesTemplate, setNotesTemplate] = useState(
    promise.fieldExecution?.notesTemplate || "",
  );
  const [upsellFocus, setUpsellFocus] = useState(
    formatList(promise.fieldExecution?.upsellFocus),
  );
  const [closeoutSteps, setCloseoutSteps] = useState(
    formatList(promise.fieldExecution?.closeoutSteps),
  );
  const [paymentCollectionStatus, setPaymentCollectionStatus] = useState<
    "not-requested" | "deposit-requested" | "awaiting-payment" | "partial" | "paid" | "written-off"
  >(promise.paymentCollection?.status || "not-requested");
  const [paymentMethod, setPaymentMethod] = useState<PromisePaymentMethod>(
    promise.paymentCollection?.method || "not-set",
  );
  const [depositRequestedAmount, setDepositRequestedAmount] = useState(
    promise.paymentCollection?.depositRequestedAmount?.toString() || "",
  );
  const [amountCollected, setAmountCollected] = useState(
    promise.paymentCollection?.amountCollected?.toString() || "",
  );
  const [balanceDueAmount, setBalanceDueAmount] = useState(
    promise.paymentCollection?.balanceDueAmount?.toString() || "",
  );
  const [collectedAt, setCollectedAt] = useState(
    promise.paymentCollection?.collectedAt || "",
  );
  const [paymentSummary, setPaymentSummary] = useState(
    promise.paymentCollection?.paymentSummary || "",
  );
  const [warrantyStatus, setWarrantyStatus] = useState<
    "none" | "monitoring" | "open" | "resolved"
  >(promise.warrantyCase?.status || "none");
  const [warrantySeverity, setWarrantySeverity] = useState<
    "watch" | "trust-risk" | "down-unit"
  >(promise.warrantyCase?.severity || "watch");
  const [warrantyRootCause, setWarrantyRootCause] = useState<
    "parts" | "installation" | "diagnosis" | "expectation-gap" | "unknown"
  >(promise.warrantyCase?.rootCause || "unknown");
  const [warrantyIssueSummary, setWarrantyIssueSummary] = useState(
    promise.warrantyCase?.issueSummary || "",
  );
  const [warrantyCallbackDueAt, setWarrantyCallbackDueAt] = useState(
    promise.warrantyCase?.callbackDueAt || "",
  );
  const [warrantyMakeGoodPlan, setWarrantyMakeGoodPlan] = useState(
    promise.warrantyCase?.makeGoodPlan || "",
  );
  const [warrantyPreventionStep, setWarrantyPreventionStep] = useState(
    promise.warrantyCase?.preventionStep || "",
  );
  const [warrantyResolutionSummary, setWarrantyResolutionSummary] = useState(
    promise.warrantyCase?.resolutionSummary || "",
  );
  const [recurringAccountStatus, setRecurringAccountStatus] = useState<
    "not-account" | "lead" | "pitched" | "trial-active" | "active" | "at-risk"
  >(promise.recurringAccount?.status || "not-account");
  const [accountName, setAccountName] = useState(
    promise.recurringAccount?.accountName || "",
  );
  const [targetLane, setTargetLane] = useState(
    promise.recurringAccount?.targetLane || "contractor-upkeep",
  );
  const [vehicleCount, setVehicleCount] = useState(
    promise.recurringAccount?.vehicleCount?.toString() || "",
  );
  const [cadenceLabel, setCadenceLabel] = useState(
    promise.recurringAccount?.cadenceLabel || "",
  );
  const [billingTerms, setBillingTerms] = useState(
    promise.recurringAccount?.billingTerms || "",
  );
  const [proposalSentAt, setProposalSentAt] = useState(
    promise.recurringAccount?.proposalSentAt || "",
  );
  const [proposalValueEstimate, setProposalValueEstimate] = useState(
    promise.recurringAccount?.proposalValueEstimate?.toString() || "",
  );
  const [proposalDecision, setProposalDecision] = useState<PromiseRecurringProposalDecision>(
    promise.recurringAccount?.proposalDecision || "open",
  );
  const [proposalDecisionAt, setProposalDecisionAt] = useState(
    promise.recurringAccount?.proposalDecisionAt || "",
  );
  const [proposalDecisionReason, setProposalDecisionReason] = useState(
    promise.recurringAccount?.proposalDecisionReason || "",
  );
  const [trialStartAt, setTrialStartAt] = useState(
    promise.recurringAccount?.trialStartAt || "",
  );
  const [trialReviewDueAt, setTrialReviewDueAt] = useState(
    promise.recurringAccount?.trialReviewDueAt || "",
  );
  const [trialOutcome, setTrialOutcome] = useState<PromiseRecurringTrialOutcome>(
    promise.recurringAccount?.trialOutcome || "unknown",
  );
  const [trialOutcomeAt, setTrialOutcomeAt] = useState(
    promise.recurringAccount?.trialOutcomeAt || "",
  );
  const [trialOutcomeSummary, setTrialOutcomeSummary] = useState(
    promise.recurringAccount?.trialOutcomeSummary || "",
  );
  const [activationTargetAt, setActivationTargetAt] = useState(
    promise.recurringAccount?.activationTargetAt || "",
  );
  const [nextTouchDueAt, setNextTouchDueAt] = useState(
    promise.recurringAccount?.nextTouchDueAt || "",
  );
  const [recurringSummary, setRecurringSummary] = useState(
    promise.recurringAccount?.summary || "",
  );
  const [noteToAdd, setNoteToAdd] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  function toOptionalNumber(value: string) {
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    const parsed = Number(trimmed);
    return Number.isNaN(parsed) ? undefined : parsed;
  }

  const economicsPreview = computePromiseEconomics({
    quotedAmount: toOptionalNumber(quotedAmount),
    finalInvoiceAmount: toOptionalNumber(finalInvoiceAmount),
    laborHours: toOptionalNumber(laborHours),
    travelHours: toOptionalNumber(travelHours),
    partsCostAmount: toOptionalNumber(partsCostAmount),
    techPayoutAmount: toOptionalNumber(techPayoutAmount),
    supportCostAmount: toOptionalNumber(supportCostAmount),
    cardFeePercent: toOptionalNumber(cardFeePercent),
    warrantyReservePercent: toOptionalNumber(warrantyReservePercent),
  });

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("saving");
    setMessage("");

    try {
      const response = await fetch(`/api/al/wrenchready/promises/${promise.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          owner,
          status: statusValue,
          jobStage,
          readinessRisk,
          scheduledWindowLabel,
          readinessSummary,
          nextAction,
          topRisks: topRisks
            .split("\n")
            .map((entry) => entry.trim())
            .filter(Boolean),
          economics: {
            quotedAmount: toOptionalNumber(quotedAmount),
            finalInvoiceAmount: toOptionalNumber(finalInvoiceAmount),
            laborHours: toOptionalNumber(laborHours),
            travelHours: toOptionalNumber(travelHours),
            partsCostAmount: toOptionalNumber(partsCostAmount),
            techPayoutAmount: toOptionalNumber(techPayoutAmount),
            supportCostAmount: toOptionalNumber(supportCostAmount),
            cardFeePercent: toOptionalNumber(cardFeePercent),
            warrantyReservePercent: toOptionalNumber(warrantyReservePercent),
          },
          commercialOutcome: {
            outcomeStatus,
            convertedService: convertedService.trim() || undefined,
            deferredValueAmount: toOptionalNumber(deferredValueAmount),
            outcomeSummary: outcomeSummary.trim() || undefined,
          },
          closeout: {
            completedAt: completedAt.trim() || undefined,
            workPerformedSummary: workPerformedSummary.trim() || undefined,
            customerConditionSummary: customerConditionSummary.trim() || undefined,
            now: parseRecapItems(nowRecap),
            soon: parseRecapItems(soonRecap),
            monitor: parseRecapItems(monitorRecap),
            customerRecap: {
              status: customerRecapStatus,
              channel: customerRecapChannel,
              sentAt: customerRecapSentAt.trim() || undefined,
              summary: customerRecapSummary.trim() || undefined,
            },
            reviewRequest: {
              status: reviewRequestStatus,
              dueAt: reviewRequestDueAt.trim() || undefined,
              sentAt: reviewRequestSentAt.trim() || undefined,
              channel: reviewRequestChannel === "text" ? "text" : "email",
              summary: reviewRequestSummary.trim() || undefined,
              reviewUrl: reviewUrl.trim() || undefined,
            },
            maintenanceReminder: {
              status: maintenanceReminderStatus,
              service: maintenanceService.trim() || undefined,
              dueLabel: maintenanceDueLabel.trim() || undefined,
              dueAt: maintenanceDueAt.trim() || undefined,
              summary: maintenanceSummary.trim() || undefined,
            },
            nextProbableVisit: {
              service: nextProbableVisitService.trim() || undefined,
              reason: nextProbableVisitReason.trim() || undefined,
              timingLabel: nextProbableVisitTimingLabel.trim() || undefined,
              estimatedAmount: toOptionalNumber(nextProbableVisitAmount),
            },
            proofCapture: {
              bookingReason: bookingReason.trim() || undefined,
              promiseThatMatteredMost: promiseThatMatteredMost.trim() || undefined,
              customerReliefQuote: customerReliefQuote.trim() || undefined,
              proofNotes: proofNotes.trim() || undefined,
              assets: parseProofAssets(proofAssets),
            },
          },
          followThroughDueAt: followThroughDueAt.trim() || null,
          customerApproval: {
            status: customerApprovalStatus,
            requestedAt: approvalRequestedAt.trim() || undefined,
            requestedService: approvalRequestedService.trim() || undefined,
            requestedAmount: toOptionalNumber(approvalRequestedAmount),
            summary: approvalSummary.trim() || undefined,
            customerMessage: customerMessage.trim() || undefined,
            respondedAt:
              customerApprovalStatus === "approved" || customerApprovalStatus === "declined"
                ? new Date().toISOString()
                : undefined,
          },
          customerCertainty: {
            contactConfirmed,
            arrivalWindowShared,
            pricingExpectationShared,
            updatesPlanShared,
            followUpExplained,
          },
          dayReadiness: {
            customerConfirmed,
            locationConfirmed,
            partsConfirmed,
            toolsConfirmed,
            routeLocked,
            paymentMethodReady,
          },
          fieldExecution: {
            serviceGoal: serviceGoal.trim() || undefined,
            partsChecklist: parseList(partsChecklist),
            photosRequired: parseList(photosRequired),
            inspectionChecklist: parseList(inspectionChecklist),
            handoffChecklist: parseList(handoffChecklist),
            comebackPreventionSteps: parseList(comebackPreventionSteps),
            notesTemplate: notesTemplate.trim() || undefined,
            upsellFocus: parseList(upsellFocus),
            closeoutSteps: parseList(closeoutSteps),
          },
          paymentCollection: {
            status: paymentCollectionStatus,
            method: paymentMethod === "not-set" ? undefined : paymentMethod,
            depositRequestedAmount: toOptionalNumber(depositRequestedAmount),
            amountCollected: toOptionalNumber(amountCollected),
            balanceDueAmount: toOptionalNumber(balanceDueAmount),
            collectedAt: collectedAt.trim() || undefined,
            paymentSummary: paymentSummary.trim() || undefined,
          },
          warrantyCase: {
            status: warrantyStatus,
            severity: warrantySeverity,
            rootCause: warrantyRootCause,
            issueSummary: warrantyIssueSummary.trim() || undefined,
            callbackDueAt: warrantyCallbackDueAt.trim() || undefined,
            makeGoodPlan: warrantyMakeGoodPlan.trim() || undefined,
            preventionStep: warrantyPreventionStep.trim() || undefined,
            resolutionSummary: warrantyResolutionSummary.trim() || undefined,
          },
          recurringAccount: {
            status: recurringAccountStatus,
            accountName: accountName.trim() || undefined,
            targetLane:
              targetLane === "fleet-pm" ||
              targetLane === "contractor-upkeep" ||
              targetLane === "property-manager" ||
              targetLane === "nonprofit" ||
              targetLane === "mixed"
                ? targetLane
                : undefined,
            vehicleCount: toOptionalNumber(vehicleCount),
            cadenceLabel: cadenceLabel.trim() || undefined,
            billingTerms: billingTerms.trim() || undefined,
            proposalSentAt: proposalSentAt.trim() || undefined,
            proposalValueEstimate: toOptionalNumber(proposalValueEstimate),
            proposalDecision,
            proposalDecisionAt: proposalDecisionAt.trim() || undefined,
            proposalDecisionReason: proposalDecisionReason.trim() || undefined,
            trialStartAt: trialStartAt.trim() || undefined,
            trialReviewDueAt: trialReviewDueAt.trim() || undefined,
            trialOutcome,
            trialOutcomeAt: trialOutcomeAt.trim() || undefined,
            trialOutcomeSummary: trialOutcomeSummary.trim() || undefined,
            activationTargetAt: activationTargetAt.trim() || undefined,
            nextTouchDueAt: nextTouchDueAt.trim() || undefined,
            summary: recurringSummary.trim() || undefined,
          },
          noteToAdd: noteToAdd.trim() || undefined,
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.error || "Could not update promise.");
      }

      setStatus("success");
      setMessage("Promise updated.");
      setNoteToAdd("");
      router.refresh();
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Could not update promise.");
    }
  }

  return (
    <div className="rounded-3xl border border-border bg-card/50 p-6">
      <h2 className="text-xl font-bold text-foreground">Protect this promise</h2>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
        Update the owner, risk, and next action as the day changes. The point is to surface a
        truthful promise state so ops and automation can react early.
      </p>

      {message ? (
        <div
          className={`mt-4 rounded-2xl border px-4 py-3 text-sm ${
            status === "success"
              ? "border-[--wr-teal]/20 bg-[--wr-teal]/10 text-[--wr-teal-soft]"
              : "border-red-500/20 bg-red-500/10 text-red-200"
          }`}
        >
          {message}
        </div>
      ) : null}

      <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
        <label className="block space-y-2">
          <span className="text-xs font-semibold uppercase tracking-widest text-primary">Owner</span>
          <select
            className="form-input"
            onChange={(event) => setOwner(event.target.value as "Dez" | "Simon" | "Unassigned")}
            value={owner}
          >
            <option value="Unassigned">Unassigned</option>
            <option value="Dez">Dez</option>
            <option value="Simon">Simon</option>
          </select>
        </label>

        <label className="block space-y-2">
          <span className="text-xs font-semibold uppercase tracking-widest text-primary">Status</span>
          <select
            className="form-input"
            onChange={(event) =>
              setStatusValue(
                event.target.value as
                  | "promises-waiting"
                  | "tomorrow-at-risk"
                  | "follow-through-due"
                  | "completed",
              )
            }
            value={statusValue}
          >
            <option value="promises-waiting">Promises waiting</option>
            <option value="tomorrow-at-risk">Tomorrow at risk</option>
            <option value="follow-through-due">Follow-through due</option>
            <option value="completed">Completed</option>
          </select>
        </label>

        <label className="block space-y-2">
          <span className="text-xs font-semibold uppercase tracking-widest text-primary">
            Job stage
          </span>
          <select
            className="form-input"
            onChange={(event) => setJobStage(event.target.value as PromiseJobStage)}
            value={jobStage}
          >
            <option value="triage-needed">Triage needed</option>
            <option value="quoted">Quoted</option>
            <option value="scheduled">Scheduled</option>
            <option value="confirmed">Confirmed</option>
            <option value="en-route">En route</option>
            <option value="on-site">On site</option>
            <option value="waiting-approval">Waiting approval</option>
            <option value="completed">Completed</option>
            <option value="collected">Collected</option>
            <option value="warranty-issue">Warranty issue</option>
          </select>
        </label>

        <label className="block space-y-2">
          <span className="text-xs font-semibold uppercase tracking-widest text-primary">
            Readiness risk
          </span>
          <select
            className="form-input"
            onChange={(event) => setReadinessRisk(event.target.value as "low" | "medium" | "high")}
            value={readinessRisk}
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </label>

        <label className="block space-y-2">
          <span className="text-xs font-semibold uppercase tracking-widest text-primary">
            Scheduled window
          </span>
          <input
            className="form-input"
            onChange={(event) => setScheduledWindowLabel(event.target.value)}
            value={scheduledWindowLabel}
          />
        </label>

        <label className="block space-y-2">
          <span className="text-xs font-semibold uppercase tracking-widest text-primary">
            Readiness summary
          </span>
          <textarea
            className="form-textarea"
            onChange={(event) => setReadinessSummary(event.target.value)}
            value={readinessSummary}
          />
        </label>

        <label className="block space-y-2">
          <span className="text-xs font-semibold uppercase tracking-widest text-primary">
            Next action
          </span>
          <textarea
            className="form-textarea"
            onChange={(event) => setNextAction(event.target.value)}
            value={nextAction}
          />
        </label>

        <label className="block space-y-2">
          <span className="text-xs font-semibold uppercase tracking-widest text-primary">
            Promise breakers
          </span>
          <textarea
            className="form-textarea"
            onChange={(event) => setTopRisks(event.target.value)}
            placeholder="One risk per line"
            value={topRisks}
          />
        </label>

        <label className="block space-y-2">
          <span className="text-xs font-semibold uppercase tracking-widest text-primary">
            Follow-through due at
          </span>
          <input
            className="form-input"
            onChange={(event) => setFollowThroughDueAt(event.target.value)}
            placeholder="2026-04-13T18:00:00-07:00"
            value={followThroughDueAt}
          />
        </label>

        <div className="rounded-2xl border border-border bg-background/60 p-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">
            Commercial outcome
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Record what this promise actually turned into so we can learn from the result, not just
            the activity.
          </p>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="block space-y-2">
              <span className="text-xs font-semibold uppercase tracking-widest text-primary">
                Outcome
              </span>
              <select
                className="form-input"
                onChange={(event) =>
                  setOutcomeStatus(event.target.value as CommercialOutcomeStatus)
                }
                value={outcomeStatus}
              >
                <option value="unknown">Unknown</option>
                <option value="approved-repair">Approved repair</option>
                <option value="completed-maintenance">Completed maintenance</option>
                <option value="diagnostic-only">Diagnostic only</option>
                <option value="deferred-work">Deferred work</option>
                <option value="declined">Declined</option>
              </select>
            </label>

            <label className="block space-y-2">
              <span className="text-xs font-semibold uppercase tracking-widest text-primary">
                Converted service
              </span>
              <input
                className="form-input"
                onChange={(event) => setConvertedService(event.target.value)}
                placeholder="Brake job, alternator, maintenance visit, etc."
                value={convertedService}
              />
            </label>

            <label className="block space-y-2">
              <span className="text-xs font-semibold uppercase tracking-widest text-primary">
                Deferred value
              </span>
              <input
                className="form-input"
                inputMode="decimal"
                onChange={(event) => setDeferredValueAmount(event.target.value)}
                placeholder="0.00"
                value={deferredValueAmount}
              />
            </label>

            <label className="block space-y-2">
              <span className="text-xs font-semibold uppercase tracking-widest text-primary">
                Outcome summary
              </span>
              <textarea
                className="form-textarea"
                onChange={(event) => setOutcomeSummary(event.target.value)}
                placeholder="What happened commercially?"
                value={outcomeSummary}
              />
            </label>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-background/60 p-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">
            Structured closeout and recapture
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Every finished visit should create a clear recap, a review signal, a reminder seed, and
            the next probable visit. Use one line per item in the format:
            <span className="font-medium text-foreground"> title | detail | amount</span>.
          </p>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="block space-y-2">
              <span className="text-xs font-semibold uppercase tracking-widest text-primary">
                Completed at
              </span>
              <input
                className="form-input"
                onChange={(event) => setCompletedAt(event.target.value)}
                placeholder="2026-04-13T15:30:00-07:00"
                value={completedAt}
              />
            </label>

            <label className="block space-y-2">
              <span className="text-xs font-semibold uppercase tracking-widest text-primary">
                Work performed
              </span>
              <textarea
                className="form-textarea"
                onChange={(event) => setWorkPerformedSummary(event.target.value)}
                placeholder="What was actually done on this visit?"
                value={workPerformedSummary}
              />
            </label>

            <label className="block space-y-2 md:col-span-2">
              <span className="text-xs font-semibold uppercase tracking-widest text-primary">
                Customer-ready recap
              </span>
              <textarea
                className="form-textarea"
                onChange={(event) => setCustomerConditionSummary(event.target.value)}
                placeholder="What should the customer understand after the visit?"
                value={customerConditionSummary}
              />
            </label>

            <label className="block space-y-2">
              <span className="text-xs font-semibold uppercase tracking-widest text-primary">
                Now
              </span>
              <textarea
                className="form-textarea"
                onChange={(event) => setNowRecap(event.target.value)}
                placeholder="Brake pads now | Metal-to-metal risk | 425"
                value={nowRecap}
              />
            </label>

            <label className="block space-y-2">
              <span className="text-xs font-semibold uppercase tracking-widest text-primary">
                Soon
              </span>
              <textarea
                className="form-textarea"
                onChange={(event) => setSoonRecap(event.target.value)}
                placeholder="Battery retest soon | Recheck after replacement | 89"
                value={soonRecap}
              />
            </label>

            <label className="block space-y-2 md:col-span-2">
              <span className="text-xs font-semibold uppercase tracking-widest text-primary">
                Monitor
              </span>
              <textarea
                className="form-textarea"
                onChange={(event) => setMonitorRecap(event.target.value)}
                placeholder="Alternator output monitor | Readings were borderline today"
                value={monitorRecap}
              />
            </label>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <label className="block space-y-2">
              <span className="text-xs font-semibold uppercase tracking-widest text-primary">
                Customer recap status
              </span>
              <select
                className="form-input"
                onChange={(event) =>
                  setCustomerRecapStatus(
                    event.target.value as "not-ready" | "ready" | "sent",
                  )
                }
                value={customerRecapStatus}
              >
                <option value="not-ready">Not ready</option>
                <option value="ready">Ready to send</option>
                <option value="sent">Sent</option>
              </select>
            </label>

            <label className="block space-y-2">
              <span className="text-xs font-semibold uppercase tracking-widest text-primary">
                Recap channel
              </span>
              <select
                className="form-input"
                onChange={(event) =>
                  setCustomerRecapChannel(event.target.value as "email" | "text")
                }
                value={customerRecapChannel}
              >
                <option value="email">Email</option>
                <option value="text">Text</option>
              </select>
            </label>

            <label className="block space-y-2">
              <span className="text-xs font-semibold uppercase tracking-widest text-primary">
                Recap sent at
              </span>
              <input
                className="form-input"
                onChange={(event) => setCustomerRecapSentAt(event.target.value)}
                placeholder="2026-04-13T16:30:00-07:00"
                value={customerRecapSentAt}
              />
            </label>

            <label className="block space-y-2 md:col-span-2">
              <span className="text-xs font-semibold uppercase tracking-widest text-primary">
                Recap send summary
              </span>
              <textarea
                className="form-textarea"
                onChange={(event) => setCustomerRecapSummary(event.target.value)}
                placeholder="Why this recap matters and what it should reinforce."
                value={customerRecapSummary}
              />
            </label>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <label className="block space-y-2">
              <span className="text-xs font-semibold uppercase tracking-widest text-primary">
                Review request status
              </span>
              <select
                className="form-input"
                onChange={(event) =>
                  setReviewRequestStatus(
                    event.target.value as "not-ready" | "ready" | "sent" | "completed",
                  )
                }
                value={reviewRequestStatus}
              >
                <option value="not-ready">Not ready</option>
                <option value="ready">Ready to send</option>
                <option value="sent">Sent</option>
                <option value="completed">Completed</option>
              </select>
            </label>

            <label className="block space-y-2">
              <span className="text-xs font-semibold uppercase tracking-widest text-primary">
                Review channel
              </span>
              <select
                className="form-input"
                onChange={(event) =>
                  setReviewRequestChannel(event.target.value as "email" | "text")
                }
                value={reviewRequestChannel}
              >
                <option value="email">Email</option>
                <option value="text">Text</option>
              </select>
            </label>

            <label className="block space-y-2">
              <span className="text-xs font-semibold uppercase tracking-widest text-primary">
                Review due at
              </span>
              <input
                className="form-input"
                onChange={(event) => setReviewRequestDueAt(event.target.value)}
                placeholder="2026-04-13T18:00:00-07:00"
                value={reviewRequestDueAt}
              />
            </label>

            <label className="block space-y-2">
              <span className="text-xs font-semibold uppercase tracking-widest text-primary">
                Review sent at
              </span>
              <input
                className="form-input"
                onChange={(event) => setReviewRequestSentAt(event.target.value)}
                placeholder="2026-04-13T18:15:00-07:00"
                value={reviewRequestSentAt}
              />
            </label>

            <label className="block space-y-2 md:col-span-2">
              <span className="text-xs font-semibold uppercase tracking-widest text-primary">
                Review request summary
              </span>
              <textarea
                className="form-textarea"
                onChange={(event) => setReviewRequestSummary(event.target.value)}
                placeholder="Why this customer is a strong review ask and how to frame it."
                value={reviewRequestSummary}
              />
            </label>

            <label className="block space-y-2 md:col-span-2">
              <span className="text-xs font-semibold uppercase tracking-widest text-primary">
                Review URL
              </span>
              <input
                className="form-input"
                onChange={(event) => setReviewUrl(event.target.value)}
                placeholder="Google review link if known"
                value={reviewUrl}
              />
            </label>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <label className="block space-y-2">
              <span className="text-xs font-semibold uppercase tracking-widest text-primary">
                Maintenance reminder status
              </span>
              <select
                className="form-input"
                onChange={(event) =>
                  setMaintenanceReminderStatus(
                    event.target.value as "not-seeded" | "seeded" | "scheduled",
                  )
                }
                value={maintenanceReminderStatus}
              >
                <option value="not-seeded">Not seeded</option>
                <option value="seeded">Seeded</option>
                <option value="scheduled">Scheduled</option>
              </select>
            </label>

            <label className="block space-y-2">
              <span className="text-xs font-semibold uppercase tracking-widest text-primary">
                Reminder service
              </span>
              <input
                className="form-input"
                onChange={(event) => setMaintenanceService(event.target.value)}
                placeholder="Next service or reminder target"
                value={maintenanceService}
              />
            </label>

            <label className="block space-y-2">
              <span className="text-xs font-semibold uppercase tracking-widest text-primary">
                Reminder label
              </span>
              <input
                className="form-input"
                onChange={(event) => setMaintenanceDueLabel(event.target.value)}
                placeholder="In 90 days / 3,000 miles"
                value={maintenanceDueLabel}
              />
            </label>

            <label className="block space-y-2">
              <span className="text-xs font-semibold uppercase tracking-widest text-primary">
                Reminder due at
              </span>
              <input
                className="form-input"
                onChange={(event) => setMaintenanceDueAt(event.target.value)}
                placeholder="2026-07-15T09:00:00-07:00"
                value={maintenanceDueAt}
              />
            </label>

            <label className="block space-y-2 md:col-span-2">
              <span className="text-xs font-semibold uppercase tracking-widest text-primary">
                Reminder summary
              </span>
              <textarea
                className="form-textarea"
                onChange={(event) => setMaintenanceSummary(event.target.value)}
                placeholder="What should trigger the reminder and why will the customer care?"
                value={maintenanceSummary}
              />
            </label>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <label className="block space-y-2">
              <span className="text-xs font-semibold uppercase tracking-widest text-primary">
                Next probable visit
              </span>
              <input
                className="form-input"
                onChange={(event) => setNextProbableVisitService(event.target.value)}
                placeholder="Service most likely to happen next"
                value={nextProbableVisitService}
              />
            </label>

            <label className="block space-y-2">
              <span className="text-xs font-semibold uppercase tracking-widest text-primary">
                Timing label
              </span>
              <input
                className="form-input"
                onChange={(event) => setNextProbableVisitTimingLabel(event.target.value)}
                placeholder="Now / Soon / Next month"
                value={nextProbableVisitTimingLabel}
              />
            </label>

            <label className="block space-y-2">
              <span className="text-xs font-semibold uppercase tracking-widest text-primary">
                Estimated amount
              </span>
              <input
                className="form-input"
                inputMode="decimal"
                onChange={(event) => setNextProbableVisitAmount(event.target.value)}
                placeholder="0.00"
                value={nextProbableVisitAmount}
              />
            </label>

            <label className="block space-y-2 md:col-span-2">
              <span className="text-xs font-semibold uppercase tracking-widest text-primary">
                Why this is the next probable visit
              </span>
              <textarea
                className="form-textarea"
                onChange={(event) => setNextProbableVisitReason(event.target.value)}
                placeholder="Connect the completed visit to the next likely service."
                value={nextProbableVisitReason}
              />
            </label>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <label className="block space-y-2">
              <span className="text-xs font-semibold uppercase tracking-widest text-primary">
                Why they booked
              </span>
              <textarea
                className="form-textarea"
                onChange={(event) => setBookingReason(event.target.value)}
                placeholder="What pain, urgency, or convenience need brought them in?"
                value={bookingReason}
              />
            </label>

            <label className="block space-y-2">
              <span className="text-xs font-semibold uppercase tracking-widest text-primary">
                Promise that mattered most
              </span>
              <textarea
                className="form-textarea"
                onChange={(event) => setPromiseThatMatteredMost(event.target.value)}
                placeholder="What promise or certainty layer made the visit feel different?"
                value={promiseThatMatteredMost}
              />
            </label>

            <label className="block space-y-2">
              <span className="text-xs font-semibold uppercase tracking-widest text-primary">
                Customer relief quote
              </span>
              <textarea
                className="form-textarea"
                onChange={(event) => setCustomerReliefQuote(event.target.value)}
                placeholder="The exact customer wording worth saving, if permissioned."
                value={customerReliefQuote}
              />
            </label>

            <label className="block space-y-2">
              <span className="text-xs font-semibold uppercase tracking-widest text-primary">
                Proof notes
              </span>
              <textarea
                className="form-textarea"
                onChange={(event) => setProofNotes(event.target.value)}
                placeholder="What proof asset should marketing or ops keep from this visit?"
                value={proofNotes}
              />
            </label>

            <label className="block space-y-2 md:col-span-2">
              <span className="text-xs font-semibold uppercase tracking-widest text-primary">
                Proof assets
              </span>
              <textarea
                className="form-textarea"
                onChange={(event) => setProofAssets(event.target.value)}
                placeholder="photo | Brake pads before and after | Customer approved sharing | https://... | customer-approved"
                value={proofAssets}
              />
            </label>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-background/60 p-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">
            Customer approval
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Use this when the customer should see a quote decision on the public status page.
          </p>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="block space-y-2">
              <span className="text-xs font-semibold uppercase tracking-widest text-primary">
                Approval state
              </span>
              <select
                className="form-input"
                onChange={(event) =>
                  setCustomerApprovalStatus(event.target.value as CustomerApprovalStatus)
                }
                value={customerApprovalStatus}
              >
                <option value="not-needed">Not needed</option>
                <option value="awaiting-approval">Awaiting approval</option>
                <option value="approved">Approved</option>
                <option value="declined">Declined</option>
              </select>
            </label>

            <label className="block space-y-2">
              <span className="text-xs font-semibold uppercase tracking-widest text-primary">
                Requested at
              </span>
              <input
                className="form-input"
                onChange={(event) => setApprovalRequestedAt(event.target.value)}
                placeholder="2026-04-13T10:30:00-07:00"
                value={approvalRequestedAt}
              />
            </label>

            <label className="block space-y-2">
              <span className="text-xs font-semibold uppercase tracking-widest text-primary">
                Requested service
              </span>
              <input
                className="form-input"
                onChange={(event) => setApprovalRequestedService(event.target.value)}
                placeholder="Oxygen sensor replacement"
                value={approvalRequestedService}
              />
            </label>

            <label className="block space-y-2">
              <span className="text-xs font-semibold uppercase tracking-widest text-primary">
                Requested amount
              </span>
              <input
                className="form-input"
                inputMode="decimal"
                onChange={(event) => setApprovalRequestedAmount(event.target.value)}
                placeholder="245"
                value={approvalRequestedAmount}
              />
            </label>

            <label className="block space-y-2 md:col-span-2">
              <span className="text-xs font-semibold uppercase tracking-widest text-primary">
                Approval summary
              </span>
              <textarea
                className="form-textarea"
                onChange={(event) => setApprovalSummary(event.target.value)}
                placeholder="Explain the next repair step clearly and briefly."
                value={approvalSummary}
              />
            </label>

            <label className="block space-y-2 md:col-span-2">
              <span className="text-xs font-semibold uppercase tracking-widest text-primary">
                Customer-facing note
              </span>
              <textarea
                className="form-textarea"
                onChange={(event) => setCustomerMessage(event.target.value)}
                placeholder="Optional note that appears on the customer status page."
                value={customerMessage}
              />
            </label>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-background/60 p-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">
            Promise commitments
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Track whether the customer can actually feel the promise clearly before the day starts.
          </p>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {[
              ["Contact confirmed", contactConfirmed, setContactConfirmed],
              ["Arrival window shared", arrivalWindowShared, setArrivalWindowShared],
              ["Pricing expectation shared", pricingExpectationShared, setPricingExpectationShared],
              ["Updates plan shared", updatesPlanShared, setUpdatesPlanShared],
              ["Follow-up explained", followUpExplained, setFollowUpExplained],
            ].map(([label, value, setter]) => (
              <label
                key={label as string}
                className="flex items-center gap-3 rounded-xl border border-border/70 bg-card/50 px-3 py-3 text-sm text-foreground"
              >
                <input
                  checked={value as boolean}
                  className="h-4 w-4 accent-primary"
                  onChange={(event) => (setter as (value: boolean) => void)(event.target.checked)}
                  type="checkbox"
                />
                <span>{label as string}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-background/60 p-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">
            Tomorrow readiness
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            This is the keep-the-promise checklist. If these are soft, tomorrow is soft.
          </p>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {[
              ["Customer confirmed", customerConfirmed, setCustomerConfirmed],
              ["Location confirmed", locationConfirmed, setLocationConfirmed],
              ["Parts confirmed", partsConfirmed, setPartsConfirmed],
              ["Tools confirmed", toolsConfirmed, setToolsConfirmed],
              ["Route locked", routeLocked, setRouteLocked],
              ["Payment method ready", paymentMethodReady, setPaymentMethodReady],
            ].map(([label, value, setter]) => (
              <label
                key={label as string}
                className="flex items-center gap-3 rounded-xl border border-border/70 bg-card/50 px-3 py-3 text-sm text-foreground"
              >
                <input
                  checked={value as boolean}
                  className="h-4 w-4 accent-primary"
                  onChange={(event) => (setter as (value: boolean) => void)(event.target.checked)}
                  type="checkbox"
                />
                <span>{label as string}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-background/60 p-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">
            Field execution packet
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Give the tech one clean packet instead of scattered texts. Use one line per checklist item.
          </p>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="block space-y-2 md:col-span-2">
              <span className="text-xs font-semibold uppercase tracking-widest text-primary">
                Service goal
              </span>
              <input
                className="form-input"
                onChange={(event) => setServiceGoal(event.target.value)}
                placeholder="What must be true by the time this visit is done?"
                value={serviceGoal}
              />
            </label>

            <label className="block space-y-2">
              <span className="text-xs font-semibold uppercase tracking-widest text-primary">
                Parts checklist
              </span>
              <textarea
                className="form-textarea"
                onChange={(event) => setPartsChecklist(event.target.value)}
                placeholder="Battery group size 35&#10;Starter core check&#10;Brake pads + rotors"
                value={partsChecklist}
              />
            </label>

            <label className="block space-y-2">
              <span className="text-xs font-semibold uppercase tracking-widest text-primary">
                Photos required
              </span>
              <textarea
                className="form-textarea"
                onChange={(event) => setPhotosRequired(event.target.value)}
                placeholder="VIN&#10;Before condition&#10;Completed repair"
                value={photosRequired}
              />
            </label>

            <label className="block space-y-2">
              <span className="text-xs font-semibold uppercase tracking-widest text-primary">
                Inspection checklist
              </span>
              <textarea
                className="form-textarea"
                onChange={(event) => setInspectionChecklist(event.target.value)}
                placeholder="Charging system check&#10;Rear brakes visual&#10;Fluid level check"
                value={inspectionChecklist}
              />
            </label>

            <label className="block space-y-2">
              <span className="text-xs font-semibold uppercase tracking-widest text-primary">
                Handoff checklist
              </span>
              <textarea
                className="form-textarea"
                onChange={(event) => setHandoffChecklist(event.target.value)}
                placeholder="Walk customer through work performed&#10;Confirm payment path&#10;Explain next-step watch items"
                value={handoffChecklist}
              />
            </label>

            <label className="block space-y-2">
              <span className="text-xs font-semibold uppercase tracking-widest text-primary">
                Comeback prevention
              </span>
              <textarea
                className="form-textarea"
                onChange={(event) => setComebackPreventionSteps(event.target.value)}
                placeholder="Retorque after road test&#10;Recheck charging voltage&#10;Document customer operating note"
                value={comebackPreventionSteps}
              />
            </label>

            <label className="block space-y-2">
              <span className="text-xs font-semibold uppercase tracking-widest text-primary">
                Honest add-on focus
              </span>
              <textarea
                className="form-textarea"
                onChange={(event) => setUpsellFocus(event.target.value)}
                placeholder="Charging system retest&#10;Rear brake status&#10;Cabin air filter"
                value={upsellFocus}
              />
            </label>

            <label className="block space-y-2 md:col-span-2">
              <span className="text-xs font-semibold uppercase tracking-widest text-primary">
                Notes template
              </span>
              <textarea
                className="form-textarea"
                onChange={(event) => setNotesTemplate(event.target.value)}
                placeholder="Complaint / findings / work performed / next recommendation"
                value={notesTemplate}
              />
            </label>

            <label className="block space-y-2 md:col-span-2">
              <span className="text-xs font-semibold uppercase tracking-widest text-primary">
                Closeout steps
              </span>
              <textarea
                className="form-textarea"
                onChange={(event) => setCloseoutSteps(event.target.value)}
                placeholder="Collect payment&#10;Ask for review&#10;Seed next visit"
                value={closeoutSteps}
              />
            </label>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-background/60 p-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">
            Payment and collection
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            A job is not truly done if the money surface is vague. Record deposit, balance, method, and collection truth.
          </p>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="block space-y-2">
              <span className="text-xs font-semibold uppercase tracking-widest text-primary">
                Collection status
              </span>
              <select
                className="form-input"
                onChange={(event) =>
                  setPaymentCollectionStatus(
                    event.target.value as
                      | "not-requested"
                      | "deposit-requested"
                      | "awaiting-payment"
                      | "partial"
                      | "paid"
                      | "written-off",
                  )
                }
                value={paymentCollectionStatus}
              >
                <option value="not-requested">Not requested</option>
                <option value="deposit-requested">Deposit requested</option>
                <option value="awaiting-payment">Awaiting payment</option>
                <option value="partial">Partial</option>
                <option value="paid">Paid</option>
                <option value="written-off">Written off</option>
              </select>
            </label>

            <label className="block space-y-2">
              <span className="text-xs font-semibold uppercase tracking-widest text-primary">
                Payment method
              </span>
              <select
                className="form-input"
                onChange={(event) => setPaymentMethod(event.target.value as PromisePaymentMethod)}
                value={paymentMethod}
              >
                <option value="not-set">Not set</option>
                <option value="card">Card</option>
                <option value="apple-pay">Apple Pay</option>
                <option value="google-pay">Google Pay</option>
                <option value="cash-app-pay">Cash App Pay</option>
                <option value="paypal">PayPal</option>
                <option value="venmo">Venmo</option>
                <option value="link">Link</option>
                <option value="invoice">Invoice</option>
                <option value="cash">Cash</option>
                <option value="bnpl">BNPL</option>
                <option value="other">Other</option>
              </select>
            </label>

            <label className="block space-y-2">
              <span className="text-xs font-semibold uppercase tracking-widest text-primary">
                Deposit requested
              </span>
              <input
                className="form-input"
                inputMode="decimal"
                onChange={(event) => setDepositRequestedAmount(event.target.value)}
                placeholder="0.00"
                value={depositRequestedAmount}
              />
            </label>

            <label className="block space-y-2">
              <span className="text-xs font-semibold uppercase tracking-widest text-primary">
                Amount collected
              </span>
              <input
                className="form-input"
                inputMode="decimal"
                onChange={(event) => setAmountCollected(event.target.value)}
                placeholder="0.00"
                value={amountCollected}
              />
            </label>

            <label className="block space-y-2">
              <span className="text-xs font-semibold uppercase tracking-widest text-primary">
                Balance due
              </span>
              <input
                className="form-input"
                inputMode="decimal"
                onChange={(event) => setBalanceDueAmount(event.target.value)}
                placeholder="0.00"
                value={balanceDueAmount}
              />
            </label>

            <label className="block space-y-2">
              <span className="text-xs font-semibold uppercase tracking-widest text-primary">
                Collected at
              </span>
              <input
                className="form-input"
                onChange={(event) => setCollectedAt(event.target.value)}
                placeholder="2026-04-13T16:10:00-07:00"
                value={collectedAt}
              />
            </label>

            <label className="block space-y-2 md:col-span-2">
              <span className="text-xs font-semibold uppercase tracking-widest text-primary">
                Payment summary
              </span>
              <textarea
                className="form-textarea"
                onChange={(event) => setPaymentSummary(event.target.value)}
                placeholder="Saved card paid in driveway / invoice sent to office manager / waiting for deposit"
                value={paymentSummary}
              />
            </label>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-background/60 p-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">
            Warranty or comeback
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Own issues early. A comeback is a trust event before it is a margin event.
          </p>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="block space-y-2">
              <span className="text-xs font-semibold uppercase tracking-widest text-primary">
                Warranty status
              </span>
              <select
                className="form-input"
                onChange={(event) =>
                  setWarrantyStatus(
                    event.target.value as "none" | "monitoring" | "open" | "resolved",
                  )
                }
                value={warrantyStatus}
              >
                <option value="none">None</option>
                <option value="monitoring">Monitoring</option>
                <option value="open">Open</option>
                <option value="resolved">Resolved</option>
              </select>
            </label>

            <label className="block space-y-2">
              <span className="text-xs font-semibold uppercase tracking-widest text-primary">
                Severity
              </span>
              <select
                className="form-input"
                onChange={(event) =>
                  setWarrantySeverity(
                    event.target.value as "watch" | "trust-risk" | "down-unit",
                  )
                }
                value={warrantySeverity}
              >
                <option value="watch">Watch</option>
                <option value="trust-risk">Trust risk</option>
                <option value="down-unit">Down unit</option>
              </select>
            </label>

            <label className="block space-y-2">
              <span className="text-xs font-semibold uppercase tracking-widest text-primary">
                Callback due
              </span>
              <input
                className="form-input"
                onChange={(event) => setWarrantyCallbackDueAt(event.target.value)}
                placeholder="2026-04-15T09:00:00-07:00"
                value={warrantyCallbackDueAt}
              />
            </label>

            <label className="block space-y-2">
              <span className="text-xs font-semibold uppercase tracking-widest text-primary">
                Root cause
              </span>
              <select
                className="form-input"
                onChange={(event) =>
                  setWarrantyRootCause(
                    event.target.value as
                      | "parts"
                      | "installation"
                      | "diagnosis"
                      | "expectation-gap"
                      | "unknown",
                  )
                }
                value={warrantyRootCause}
              >
                <option value="unknown">Unknown</option>
                <option value="parts">Parts</option>
                <option value="installation">Installation</option>
                <option value="diagnosis">Diagnosis</option>
                <option value="expectation-gap">Expectation gap</option>
              </select>
            </label>

            <label className="block space-y-2 md:col-span-2">
              <span className="text-xs font-semibold uppercase tracking-widest text-primary">
                Issue summary
              </span>
              <textarea
                className="form-textarea"
                onChange={(event) => setWarrantyIssueSummary(event.target.value)}
                placeholder="What broke trust or what needs to be checked?"
                value={warrantyIssueSummary}
              />
            </label>

            <label className="block space-y-2 md:col-span-2">
              <span className="text-xs font-semibold uppercase tracking-widest text-primary">
                Make-good plan
              </span>
              <textarea
                className="form-textarea"
                onChange={(event) => setWarrantyMakeGoodPlan(event.target.value)}
                placeholder="What exactly are we doing for the customer, by when, and who owns it?"
                value={warrantyMakeGoodPlan}
              />
            </label>

            <label className="block space-y-2 md:col-span-2">
              <span className="text-xs font-semibold uppercase tracking-widest text-primary">
                Prevention step
              </span>
              <textarea
                className="form-textarea"
                onChange={(event) => setWarrantyPreventionStep(event.target.value)}
                placeholder="What should change in screening, field execution, or closeout so this does not repeat?"
                value={warrantyPreventionStep}
              />
            </label>

            <label className="block space-y-2 md:col-span-2">
              <span className="text-xs font-semibold uppercase tracking-widest text-primary">
                Resolution summary
              </span>
              <textarea
                className="form-textarea"
                onChange={(event) => setWarrantyResolutionSummary(event.target.value)}
                placeholder="What is the fix, owner, and communication plan?"
                value={warrantyResolutionSummary}
              />
            </label>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-background/60 p-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">
            Recurring account health
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Track whether this promise belongs to a repeatable account lane, not just a one-off job.
          </p>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="block space-y-2">
              <span className="text-xs font-semibold uppercase tracking-widest text-primary">
                Account status
              </span>
              <select
                className="form-input"
                onChange={(event) =>
                  setRecurringAccountStatus(
                    event.target.value as
                      | "not-account"
                      | "lead"
                      | "pitched"
                      | "trial-active"
                      | "active"
                      | "at-risk",
                  )
                }
                value={recurringAccountStatus}
              >
                <option value="not-account">Not account work</option>
                <option value="lead">Lead</option>
                <option value="pitched">Pitched</option>
                <option value="trial-active">Trial active</option>
                <option value="active">Active</option>
                <option value="at-risk">At risk</option>
              </select>
            </label>

            <label className="block space-y-2">
              <span className="text-xs font-semibold uppercase tracking-widest text-primary">
                Account name
              </span>
              <input
                className="form-input"
                onChange={(event) => setAccountName(event.target.value)}
                placeholder="Contractor fleet / church vehicles / property manager"
                value={accountName}
              />
            </label>

            <label className="block space-y-2">
              <span className="text-xs font-semibold uppercase tracking-widest text-primary">
                Target lane
              </span>
              <select
                className="form-input"
                onChange={(event) =>
                  setTargetLane(
                    event.target.value as
                      | "fleet-pm"
                      | "contractor-upkeep"
                      | "property-manager"
                      | "nonprofit"
                      | "mixed",
                  )
                }
                value={targetLane}
              >
                <option value="contractor-upkeep">Contractor upkeep</option>
                <option value="fleet-pm">Fleet PM</option>
                <option value="property-manager">Property manager</option>
                <option value="nonprofit">Nonprofit</option>
                <option value="mixed">Mixed</option>
              </select>
            </label>

            <label className="block space-y-2">
              <span className="text-xs font-semibold uppercase tracking-widest text-primary">
                Vehicle count
              </span>
              <input
                className="form-input"
                inputMode="numeric"
                onChange={(event) => setVehicleCount(event.target.value)}
                placeholder="3"
                value={vehicleCount}
              />
            </label>

            <label className="block space-y-2">
              <span className="text-xs font-semibold uppercase tracking-widest text-primary">
                Cadence
              </span>
              <input
                className="form-input"
                onChange={(event) => setCadenceLabel(event.target.value)}
                placeholder="Monthly PM / quarterly inspections"
                value={cadenceLabel}
              />
            </label>

            <label className="block space-y-2">
              <span className="text-xs font-semibold uppercase tracking-widest text-primary">
                Billing terms
              </span>
              <input
                className="form-input"
                onChange={(event) => setBillingTerms(event.target.value)}
                placeholder="Card on file / Net 15 / same-day invoice"
                value={billingTerms}
              />
            </label>

            <label className="block space-y-2">
              <span className="text-xs font-semibold uppercase tracking-widest text-primary">
                Proposal sent
              </span>
              <input
                className="form-input"
                onChange={(event) => setProposalSentAt(event.target.value)}
                placeholder="2026-04-18T09:00:00-07:00"
                value={proposalSentAt}
              />
            </label>

            <label className="block space-y-2">
              <span className="text-xs font-semibold uppercase tracking-widest text-primary">
                Proposal value
              </span>
              <input
                className="form-input"
                inputMode="decimal"
                onChange={(event) => setProposalValueEstimate(event.target.value)}
                placeholder="1200"
                value={proposalValueEstimate}
              />
            </label>

            <label className="block space-y-2">
              <span className="text-xs font-semibold uppercase tracking-widest text-primary">
                Proposal decision
              </span>
              <select
                className="form-input"
                onChange={(event) =>
                  setProposalDecision(
                    event.target.value as PromiseRecurringProposalDecision,
                  )
                }
                value={proposalDecision}
              >
                <option value="open">Open</option>
                <option value="won">Won</option>
                <option value="lost">Lost</option>
                <option value="stalled">Stalled</option>
              </select>
            </label>

            <label className="block space-y-2">
              <span className="text-xs font-semibold uppercase tracking-widest text-primary">
                Proposal decision at
              </span>
              <input
                className="form-input"
                onChange={(event) => setProposalDecisionAt(event.target.value)}
                placeholder="2026-04-24T09:00:00-07:00"
                value={proposalDecisionAt}
              />
            </label>

            <label className="block space-y-2 md:col-span-2">
              <span className="text-xs font-semibold uppercase tracking-widest text-primary">
                Proposal decision reason
              </span>
              <textarea
                className="form-textarea"
                onChange={(event) => setProposalDecisionReason(event.target.value)}
                placeholder="Why was this account won, lost, or stalled?"
                value={proposalDecisionReason}
              />
            </label>

            <label className="block space-y-2">
              <span className="text-xs font-semibold uppercase tracking-widest text-primary">
                Trial start
              </span>
              <input
                className="form-input"
                onChange={(event) => setTrialStartAt(event.target.value)}
                placeholder="2026-04-22T08:00:00-07:00"
                value={trialStartAt}
              />
            </label>

            <label className="block space-y-2">
              <span className="text-xs font-semibold uppercase tracking-widest text-primary">
                Trial review due
              </span>
              <input
                className="form-input"
                onChange={(event) => setTrialReviewDueAt(event.target.value)}
                placeholder="2026-04-29T09:00:00-07:00"
                value={trialReviewDueAt}
              />
            </label>

            <label className="block space-y-2">
              <span className="text-xs font-semibold uppercase tracking-widest text-primary">
                Trial outcome
              </span>
              <select
                className="form-input"
                onChange={(event) =>
                  setTrialOutcome(event.target.value as PromiseRecurringTrialOutcome)
                }
                value={trialOutcome}
              >
                <option value="unknown">Unknown</option>
                <option value="successful">Successful</option>
                <option value="failed">Failed</option>
                <option value="extended">Extended</option>
              </select>
            </label>

            <label className="block space-y-2">
              <span className="text-xs font-semibold uppercase tracking-widest text-primary">
                Trial outcome at
              </span>
              <input
                className="form-input"
                onChange={(event) => setTrialOutcomeAt(event.target.value)}
                placeholder="2026-04-29T09:00:00-07:00"
                value={trialOutcomeAt}
              />
            </label>

            <label className="block space-y-2 md:col-span-2">
              <span className="text-xs font-semibold uppercase tracking-widest text-primary">
                Trial outcome summary
              </span>
              <textarea
                className="form-textarea"
                onChange={(event) => setTrialOutcomeSummary(event.target.value)}
                placeholder="What happened in the trial and what does it mean for activation?"
                value={trialOutcomeSummary}
              />
            </label>

            <label className="block space-y-2">
              <span className="text-xs font-semibold uppercase tracking-widest text-primary">
                Activation target
              </span>
              <input
                className="form-input"
                onChange={(event) => setActivationTargetAt(event.target.value)}
                placeholder="2026-05-02T09:00:00-07:00"
                value={activationTargetAt}
              />
            </label>

            <label className="block space-y-2">
              <span className="text-xs font-semibold uppercase tracking-widest text-primary">
                Next touch due
              </span>
              <input
                className="form-input"
                onChange={(event) => setNextTouchDueAt(event.target.value)}
                placeholder="2026-04-18T09:00:00-07:00"
                value={nextTouchDueAt}
              />
            </label>

            <label className="block space-y-2 md:col-span-2">
              <span className="text-xs font-semibold uppercase tracking-widest text-primary">
                Account summary
              </span>
              <textarea
                className="form-textarea"
                onChange={(event) => setRecurringSummary(event.target.value)}
                placeholder="Why this account matters, who approves work, and what we need next."
                value={recurringSummary}
              />
            </label>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-background/60 p-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">
            Economics snapshot
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Capture what this promise is worth so we can learn which offers turn into healthy work.
          </p>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="block space-y-2">
              <span className="text-xs font-semibold uppercase tracking-widest text-primary">
                Quoted amount
              </span>
              <input
                className="form-input"
                inputMode="decimal"
                onChange={(event) => setQuotedAmount(event.target.value)}
                placeholder="0.00"
                value={quotedAmount}
              />
            </label>

            <label className="block space-y-2">
              <span className="text-xs font-semibold uppercase tracking-widest text-primary">
                Final invoice
              </span>
              <input
                className="form-input"
                inputMode="decimal"
                onChange={(event) => setFinalInvoiceAmount(event.target.value)}
                placeholder="0.00"
                value={finalInvoiceAmount}
              />
            </label>

            <label className="block space-y-2">
              <span className="text-xs font-semibold uppercase tracking-widest text-primary">
                Labor hours
              </span>
              <input
                className="form-input"
                inputMode="decimal"
                onChange={(event) => setLaborHours(event.target.value)}
                placeholder="1.5"
                value={laborHours}
              />
            </label>

            <label className="block space-y-2">
              <span className="text-xs font-semibold uppercase tracking-widest text-primary">
                Travel hours
              </span>
              <input
                className="form-input"
                inputMode="decimal"
                onChange={(event) => setTravelHours(event.target.value)}
                placeholder="0.4"
                value={travelHours}
              />
            </label>

            <label className="block space-y-2">
              <span className="text-xs font-semibold uppercase tracking-widest text-primary">
                Parts cost
              </span>
              <input
                className="form-input"
                inputMode="decimal"
                onChange={(event) => setPartsCostAmount(event.target.value)}
                placeholder="0.00"
                value={partsCostAmount}
              />
            </label>

            <label className="block space-y-2">
              <span className="text-xs font-semibold uppercase tracking-widest text-primary">
                Tech payout
              </span>
              <input
                className="form-input"
                inputMode="decimal"
                onChange={(event) => setTechPayoutAmount(event.target.value)}
                placeholder="0.00"
                value={techPayoutAmount}
              />
            </label>

            <label className="block space-y-2">
              <span className="text-xs font-semibold uppercase tracking-widest text-primary">
                Support cost
              </span>
              <input
                className="form-input"
                inputMode="decimal"
                onChange={(event) => setSupportCostAmount(event.target.value)}
                placeholder="20"
                value={supportCostAmount}
              />
            </label>

            <label className="block space-y-2">
              <span className="text-xs font-semibold uppercase tracking-widest text-primary">
                Card fee %
              </span>
              <input
                className="form-input"
                inputMode="decimal"
                onChange={(event) => setCardFeePercent(event.target.value)}
                placeholder="3"
                value={cardFeePercent}
              />
            </label>

            <label className="block space-y-2 md:col-span-2">
              <span className="text-xs font-semibold uppercase tracking-widest text-primary">
                Warranty reserve %
              </span>
              <input
                className="form-input"
                inputMode="decimal"
                onChange={(event) => setWarrantyReservePercent(event.target.value)}
                placeholder="2"
                value={warrantyReservePercent}
              />
            </label>
          </div>

          {economicsPreview ? (
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <div className="rounded-2xl border border-border bg-card/50 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                  Revenue
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  ${economicsPreview.revenue.toFixed(2)}
                </p>
              </div>
              <div className="rounded-2xl border border-border bg-card/50 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                  Net profit estimate
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  ${economicsPreview.netProfitEstimateAmount.toFixed(2)}
                </p>
              </div>
              <div className="rounded-2xl border border-border bg-card/50 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                  Net profit / clock hr
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {economicsPreview.netProfitPerClockHour !== undefined
                    ? `$${economicsPreview.netProfitPerClockHour.toFixed(2)}`
                    : "Add labor + travel hours"}
                </p>
              </div>
            </div>
          ) : null}
        </div>

        <label className="block space-y-2">
          <span className="text-xs font-semibold uppercase tracking-widest text-primary">
            New operator note
          </span>
          <textarea
            className="form-textarea"
            onChange={(event) => setNoteToAdd(event.target.value)}
            placeholder="What changed, what was confirmed, or what still feels risky?"
            value={noteToAdd}
          />
        </label>

        <button
          className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-all hover:brightness-110 disabled:opacity-50"
          disabled={status === "saving"}
          type="submit"
        >
          {status === "success" ? <CheckCircle2 className="h-4 w-4" /> : <Save className="h-4 w-4" />}
          {status === "saving" ? "Saving..." : "Save promise update"}
        </button>
      </form>
    </div>
  );
}
