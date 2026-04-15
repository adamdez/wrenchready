import {
  extractPromiseCloseout,
  getNextProbableVisit,
  hasDeferredWorkCaptured,
  mergePromiseCloseout,
  mergePromiseNotesWithCloseout,
} from "@/lib/promise-crm/closeout-recapture";
import { getPromiseOutboundSnapshot } from "@/lib/promise-crm/outbound-drafts";
import { getOutboundTransportPolicy } from "@/lib/promise-crm/outbound-transport";
import {
  extractCommercialOutcome,
  isConvertedWork,
  isDeclinedWork,
  isDeferredWork,
  isResolvedOutcome,
  mergePromiseNotesWithCommercialOutcome,
  normalizeCommercialOutcome,
} from "@/lib/promise-crm/commercial-outcome";
import {
  createPromiseCustomerAccess,
  ensurePromiseCustomerApproval,
  extractPromiseCustomerState,
  mergePromiseNotesWithCustomerState,
  normalizePromiseCustomerApproval,
} from "@/lib/promise-crm/customer-access";
import {
  appendOutboundEvent,
  extractPromiseOutboundHistory,
  mergePromiseNotesWithOutboundHistory,
} from "@/lib/promise-crm/outbound-history";
import {
  extractFollowThroughResolution,
  getLatestFollowThroughResolution,
  mergeFollowThroughResolutionHistory,
  mergePromiseNotesWithFollowThroughResolution,
  normalizeFollowThroughResolution,
} from "@/lib/promise-crm/follow-through-resolution";
import {
  computePromiseEconomics,
  extractPromiseEconomics,
  mergePromiseNotesWithEconomics,
  normalizePromiseEconomics,
} from "@/lib/promise-crm/economics";
import {
  extractPromiseExecutionOps,
  getExecutionPacketCompleteness,
  mergeFieldExecutionPacket,
  mergePaymentCollection,
  mergePromiseNotesWithExecutionOps,
  mergeRecurringAccount,
  mergeWarrantyCase,
  normalizePromiseJobStage,
} from "@/lib/promise-crm/execution-ops";
import { getProofDisciplineForPromise } from "@/lib/promise-crm/proof-discipline";
import {
  computeReadinessScore,
  extractPromiseReadinessState,
  getDefaultCustomerCertainty,
  getDefaultDayReadiness,
  getPromiseReadinessBlockers,
  mergePromiseNotesWithReadinessState,
  normalizePromiseCustomerCertainty,
  normalizePromiseDayReadiness,
} from "@/lib/promise-crm/promise-readiness";
import {
  recurringAccountOutreachScripts,
  recurringAccountStarterOffer,
} from "@/lib/promise-crm/recurring-accounts";
import { evaluateIntake, type IntakeEvaluation } from "@/lib/promise-crm/intake";
import { inboundRecords, promiseRecords } from "@/lib/promise-crm/mock-data";
import { hasPromiseCrmSupabase, supabaseRestRequest } from "@/lib/promise-crm/supabase";
import type {
  CollectionSnapshot,
  FieldExecutionSnapshot,
  FollowThroughSummary,
  FollowThroughTask,
  InboundRecord,
  MarketingOfferPerformance,
  OutboundQueueItem,
  OutboundQueueSnapshot,
  OwnerDailyPriority,
  OwnerExecutionMetrics,
  OwnerExecutionSnapshot,
  PublicProofSnapshot,
  ProofDisciplineSnapshot,
  PromiseBoardMetrics,
  PromiseCloseout,
  CloseoutRecaptureSnapshot,
  PromiseCustomerCertainty,
  PromiseCustomerApproval,
  PromiseDayReadiness,
  PromiseEconomicsRollup,
  PromiseEconomicsSnapshot,
  PromiseFieldExecutionPacket,
  PromiseJobStage,
  PromiseOutboundEvent,
  PromisePaymentCollection,
  PromiseRecord,
  PromiseRecurringAccount,
  PromiseWarrantyCase,
  RecurringAccountStarterSnapshot,
  TomorrowReadinessSnapshot,
  WarrantySnapshot,
  WeeklyRecaptureScorecard,
  WedgeFocusAction,
  WedgeFocusItem,
  WedgeFocusSnapshot,
  WrenchReadyOwner,
} from "@/lib/promise-crm/types";

type AppointmentPayload = {
  fullName: string;
  email: string;
  phone: string;
  vehicle: string;
  serviceNeeded: string;
  address: string;
  timing: string;
  notes: string;
  smsConsent?: boolean;
};

type InboundCreateInput = {
  source: InboundRecord["source"];
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  preferredContact: InboundRecord["customer"]["preferredContact"];
  vehicle: string;
  requestedService: string;
  address: string;
  timingLabel?: string;
  notes?: string;
  rawPayload?: unknown;
};

type RuntimePromiseCrmState = {
  inbound: InboundRecord[];
  promises: PromiseRecord[];
};

type UpdateInboundInput = {
  owner?: InboundRecord["owner"];
  qualificationStatus?: InboundRecord["qualificationStatus"];
  readinessRisk?: InboundRecord["readinessRisk"];
  nextAction?: string;
  preferredWindowLabel?: string;
  noteToAdd?: string;
};

type UpdatePromiseInput = {
  owner?: PromiseRecord["owner"];
  readinessRisk?: PromiseRecord["readinessRisk"];
  status?: PromiseRecord["status"];
  jobStage?: PromiseJobStage;
  serviceScope?: string;
  scheduledWindowLabel?: string;
  readinessSummary?: string;
  nextAction?: string;
  topRisks?: string[];
  noteToAdd?: string;
  economics?: PromiseEconomicsSnapshot | null;
  commercialOutcome?: PromiseRecord["commercialOutcome"] | null;
  closeout?: Partial<PromiseCloseout> | null;
  followThroughDueAt?: string | null;
  followThroughResolution?: PromiseRecord["followThroughResolution"] | null;
  customerApproval?: PromiseCustomerApproval | null;
  customerCertainty?: PromiseCustomerCertainty | null;
  dayReadiness?: PromiseDayReadiness | null;
  fieldExecution?: PromiseFieldExecutionPacket | null;
  paymentCollection?: PromisePaymentCollection | null;
  warrantyCase?: PromiseWarrantyCase | null;
  recurringAccount?: PromiseRecurringAccount | null;
  outboundEvent?: PromiseOutboundEvent | null;
};

type SupabaseInboundRow = {
  id: string;
  created_at: string;
  source: InboundRecord["source"];
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  preferred_contact: InboundRecord["customer"]["preferredContact"];
  vehicle_year: number | null;
  vehicle_make: string;
  vehicle_model: string;
  vehicle_mileage: number | null;
  vehicle_label: string;
  location_label: string;
  city: string;
  territory: string;
  access_notes: string | null;
  requested_service: string;
  normalized_service: string;
  service_lane: string;
  symptom_summary: string;
  owner: InboundRecord["owner"];
  readiness_risk: InboundRecord["readinessRisk"];
  qualification_status: InboundRecord["qualificationStatus"];
  promise_fit: "strong" | "conditional" | "review";
  preferred_window_label: string;
  preferred_window_start: string | null;
  preferred_window_end: string | null;
  next_action: string;
  notes: string[] | null;
  raw_payload: unknown;
};

type SupabasePromiseRow = {
  id: string;
  inbound_id: string | null;
  created_at: string;
  updated_at: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  preferred_contact: PromiseRecord["customer"]["preferredContact"];
  vehicle_year: number | null;
  vehicle_make: string;
  vehicle_model: string;
  vehicle_mileage: number | null;
  location_label: string;
  city: string;
  territory: string;
  access_notes: string | null;
  service_scope: string;
  owner: PromiseRecord["owner"];
  readiness_risk: PromiseRecord["readinessRisk"];
  status: PromiseRecord["status"];
  scheduled_window_label: string;
  scheduled_window_start: string | null;
  scheduled_window_end: string | null;
  readiness_summary: string;
  next_action: string;
  top_risks: string[] | null;
  notes: string[] | null;
  follow_through_due_at: string | null;
};

function sortNewestFirst<T extends { createdAt: string }>(records: T[]) {
  return [...records].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

function uniqueById<T extends { id: string }>(records: T[]) {
  const seen = new Set<string>();
  return records.filter((record) => {
    if (seen.has(record.id)) return false;
    seen.add(record.id);
    return true;
  });
}

function appendNoteList(existing: string[], noteToAdd?: string) {
  if (!noteToAdd) return existing;
  return [noteToAdd, ...existing];
}

function markInboundPromoted(
  inbound: InboundRecord,
  owner: InboundRecord["owner"],
): InboundRecord {
  return {
    ...inbound,
    qualificationStatus: "promoted",
    owner,
  };
}

function replaceInboundRecord(updated: InboundRecord) {
  const runtime = getRuntimeState();
  runtime.inbound = uniqueById([
    updated,
    ...runtime.inbound.filter((record) => record.id !== updated.id),
  ]);
}

function replacePromiseRecord(updated: PromiseRecord) {
  const runtime = getRuntimeState();
  runtime.promises = uniqueById([
    reconcilePromiseRecord(updated),
    ...runtime.promises.filter((record) => record.id !== updated.id),
  ]);
}

function getRuntimeState(): RuntimePromiseCrmState {
  const globalState = globalThis as typeof globalThis & {
    __wrenchreadyPromiseCrmState?: RuntimePromiseCrmState;
  };

  if (!globalState.__wrenchreadyPromiseCrmState) {
    globalState.__wrenchreadyPromiseCrmState = {
      inbound: [],
      promises: [],
    };
  }

  if (!globalState.__wrenchreadyPromiseCrmState.promises) {
    globalState.__wrenchreadyPromiseCrmState.promises = [];
  }

  if (!globalState.__wrenchreadyPromiseCrmState.inbound) {
    globalState.__wrenchreadyPromiseCrmState.inbound = [];
  }

  return globalState.__wrenchreadyPromiseCrmState;
}

function parseVehicle(vehicleLabel: string) {
  const cleaned = vehicleLabel.trim().replace(/\s+/g, " ");
  const yearMatch = cleaned.match(/^(19|20)\d{2}/);
  const parts = cleaned.split(" ");

  const year = yearMatch ? Number(yearMatch[0]) : null;
  const make = parts[year ? 1 : 0] || "Unknown";
  const model = parts.slice(year ? 2 : 1).join(" ") || "Vehicle";

  return { year, make, model, label: cleaned || "Unknown vehicle" };
}

function inferCityAndTerritory(address: string, evaluation: IntakeEvaluation) {
  const normalized = address.toLowerCase();
  if (normalized.includes("liberty lake")) {
    return { city: "Liberty Lake", territory: evaluation.territory };
  }
  if (normalized.includes("valley")) {
    return { city: "Spokane Valley", territory: evaluation.territory };
  }
  return { city: "Spokane", territory: evaluation.territory };
}

function mapInboundRow(row: SupabaseInboundRow): InboundRecord {
  const evaluation = evaluateIntake({
    fullName: row.customer_name,
    email: row.customer_email || "",
    phone: row.customer_phone,
    vehicle: row.vehicle_label,
    serviceNeeded: row.requested_service,
    address: row.location_label,
    timing: row.preferred_window_label,
    notes: row.symptom_summary,
    smsConsent: row.preferred_contact === "text",
  });
  const rawPayload =
    row.raw_payload && typeof row.raw_payload === "object" && row.raw_payload !== null
      ? (row.raw_payload as Record<string, unknown>)
      : null;

  return {
    id: row.id,
    createdAt: row.created_at,
    source: row.source,
    customer: {
      name: row.customer_name,
      phone: row.customer_phone,
      email: row.customer_email || undefined,
      preferredContact: row.preferred_contact,
    },
    vehicle: {
      year: row.vehicle_year || 0,
      make: row.vehicle_make,
      model: row.vehicle_model,
      mileage: row.vehicle_mileage || undefined,
    },
    location: {
      label: row.location_label,
      city: row.city,
      territory: row.territory,
      accessNotes: row.access_notes || undefined,
    },
    requestedService: row.requested_service,
    normalizedService: row.normalized_service,
    serviceLane: row.service_lane,
    marketingOffer:
      rawPayload && "marketingOffer" in rawPayload
        ? (rawPayload.marketingOffer as string)
        : evaluation.marketingOffer,
    marketingRole:
      rawPayload && "marketingRole" in rawPayload
        ? (rawPayload.marketingRole as InboundRecord["marketingRole"])
        : evaluation.marketingRole,
    dispatchTier:
      rawPayload && "dispatchTier" in rawPayload
        ? (rawPayload.dispatchTier as InboundRecord["dispatchTier"])
        : evaluation.dispatchTier,
    followOnPath:
      rawPayload && "followOnPath" in rawPayload
        ? (rawPayload.followOnPath as string[])
        : evaluation.followOnPath,
    promiseFit: row.promise_fit,
    serviceClass:
      rawPayload && "serviceClass" in rawPayload
        ? (rawPayload.serviceClass as InboundRecord["serviceClass"])
        : evaluation.serviceClass,
    acceptancePolicy:
      rawPayload && "acceptancePolicy" in rawPayload
        ? (rawPayload.acceptancePolicy as InboundRecord["acceptancePolicy"])
        : evaluation.acceptancePolicy,
    pricingGuardrails:
      rawPayload && "pricingGuardrails" in rawPayload
        ? (rawPayload.pricingGuardrails as string[])
        : evaluation.pricingGuardrails,
    screeningQuestions:
      rawPayload && "screeningQuestions" in rawPayload
        ? (rawPayload.screeningQuestions as string[])
        : evaluation.screeningQuestions,
    redFlagTriggers:
      rawPayload && "redFlagTriggers" in rawPayload
        ? (rawPayload.redFlagTriggers as string[])
        : evaluation.redFlagTriggers,
    dispatchGate:
      rawPayload && "dispatchGate" in rawPayload
        ? (rawPayload.dispatchGate as string)
        : evaluation.dispatchGate,
    wedgePromise:
      rawPayload && "wedgePromise" in rawPayload
        ? (rawPayload.wedgePromise as string)
        : evaluation.wedgePromise,
    symptomSummary: row.symptom_summary,
    owner: row.owner,
    readinessRisk: row.readiness_risk,
    qualificationStatus: row.qualification_status,
    preferredWindow: {
      label: row.preferred_window_label,
      startIso: row.preferred_window_start || undefined,
      endIso: row.preferred_window_end || undefined,
    },
    nextAction: row.next_action,
    notes: row.notes || [],
  };
}

function mapPromiseRow(row: SupabasePromiseRow): PromiseRecord {
  const { economics, visibleNotes: notesWithoutEconomics } = extractPromiseEconomics(row.notes || []);
  const { commercialOutcome, visibleNotes: notesWithoutOutcome } =
    extractCommercialOutcome(notesWithoutEconomics);
  const {
    jobStage,
    fieldExecution,
    paymentCollection,
    warrantyCase,
    recurringAccount,
    visibleNotes: notesWithoutExecutionOps,
  } = extractPromiseExecutionOps(notesWithoutOutcome);
  const { followThroughHistory, followThroughResolution, visibleNotes } =
    extractFollowThroughResolution(notesWithoutExecutionOps);
  const { closeout, visibleNotes: notesWithoutCloseout } = extractPromiseCloseout(visibleNotes);
  const {
    outboundHistory,
    visibleNotes: notesWithoutOutboundHistory,
  } = extractPromiseOutboundHistory(notesWithoutCloseout);
  const {
    customerAccess,
    customerApproval,
    visibleNotes: visibleNotesWithoutCustomerState,
  } = extractPromiseCustomerState(notesWithoutOutboundHistory, row.id);
  const {
    customerCertainty,
    dayReadiness,
    visibleNotes: visibleNotesWithoutReadinessState,
  } = extractPromiseReadinessState(visibleNotesWithoutCustomerState);
  return reconcilePromiseRecord({
    id: row.id,
    inboundId: row.inbound_id || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    customer: {
      name: row.customer_name,
      phone: row.customer_phone,
      email: row.customer_email || undefined,
      preferredContact: row.preferred_contact,
    },
    vehicle: {
      year: row.vehicle_year || 0,
      make: row.vehicle_make,
      model: row.vehicle_model,
      mileage: row.vehicle_mileage || undefined,
    },
    location: {
      label: row.location_label,
      city: row.city,
      territory: row.territory,
      accessNotes: row.access_notes || undefined,
    },
    serviceScope: row.service_scope,
    owner: row.owner,
    readinessRisk: row.readiness_risk,
    status: row.status,
    scheduledWindow: {
      label: row.scheduled_window_label,
      startIso: row.scheduled_window_start || undefined,
      endIso: row.scheduled_window_end || undefined,
    },
    readinessSummary: row.readiness_summary,
    nextAction: row.next_action,
    topRisks: row.top_risks || [],
    notes: visibleNotesWithoutReadinessState,
    jobStage,
    customerCertainty,
    dayReadiness,
    fieldExecution,
    paymentCollection,
    warrantyCase,
    recurringAccount,
    customerAccess,
    customerApproval,
    economics,
    commercialOutcome,
    closeout,
    outboundHistory,
    followThroughDueAt: row.follow_through_due_at || undefined,
    followThroughResolution,
    followThroughHistory,
  });
}

function hasCompletedExecutionSignal(promise: PromiseRecord) {
  if (
    promise.jobStage === "completed" ||
    promise.jobStage === "collected" ||
    promise.jobStage === "warranty-issue"
  ) {
    return true;
  }

  if (promise.paymentCollection?.status === "paid" || promise.paymentCollection?.status === "written-off") {
    return true;
  }

  if (promise.closeout?.completedAt) {
    return true;
  }

  if (
    promise.warrantyCase?.status === "open" ||
    promise.warrantyCase?.status === "monitoring" ||
    promise.warrantyCase?.status === "resolved"
  ) {
    return true;
  }

  return false;
}

function getFollowThroughCandidates(promise: PromiseRecord) {
  const outcome = promise.commercialOutcome;
  const closeout = promise.closeout;
  const executionComplete = hasCompletedExecutionSignal(promise);

  const candidates: Array<{
    reason: FollowThroughTask["reason"];
    summary: string;
    recommendedAction: string;
  }> = [];

  if (closeout?.reviewRequest?.status === "ready" || closeout?.reviewRequest?.status === "sent") {
    candidates.push({
      reason: "review-request",
      summary:
        closeout.reviewRequest.summary ||
        "Completed visit is ready for a review request. Close the loop while the trust signal is fresh.",
      recommendedAction:
        closeout.reviewRequest.status === "sent"
          ? "Confirm the review ask landed cleanly and record the result or any customer response."
          : "Send the review ask through the right channel and log when it was sent.",
    });
  }

  if (
    closeout?.maintenanceReminder?.status === "seeded" ||
    closeout?.maintenanceReminder?.status === "scheduled"
  ) {
    candidates.push({
      reason: "maintenance-reminder",
      summary:
        closeout.maintenanceReminder.summary ||
        `Maintenance reminder is ${closeout.maintenanceReminder.status}. Keep the next service visible before the relationship goes cold.`,
      recommendedAction:
        closeout.maintenanceReminder.status === "scheduled"
          ? "Make sure the reminder cadence is actually set and tied to the next likely visit."
          : "Turn the maintenance reminder seed into a real follow-up task with timing the customer can understand.",
    });
  }

  if (outcome?.outcomeStatus === "approved-repair") {
    candidates.push({
      reason: "approved-next-step",
      summary:
        outcome.outcomeSummary ||
        "Customer approved next-step repair. Follow through until the follow-up visit is actually scheduled.",
      recommendedAction:
        "Convert approval into a scheduled repair window and confirm parts, timing, and customer expectations.",
    });
  }

  if (outcome?.outcomeStatus === "deferred-work") {
    candidates.push({
      reason: "deferred-work",
      summary:
        outcome.outcomeSummary ||
        "Deferred work still needs a concrete next step or reminder path.",
      recommendedAction:
        "Re-contact the customer with a clear next-step offer and capture whether the work should be scheduled or parked.",
    });
  }

  if (outcome?.outcomeStatus === "diagnostic-only") {
    candidates.push({
      reason: "diagnostic-recap",
      summary:
        outcome.outcomeSummary ||
        "The diagnostic visit ended without approved work. Close the loop with options and recommendations.",
      recommendedAction:
        "Send or confirm the diagnostic recap, pricing, and recommended repair path before the lead goes cold.",
    });
  }

  if (executionComplete && !closeout) {
    candidates.push({
      reason: "open-follow-through",
      summary:
        "Visit is completed, but the structured closeout is still missing. Recap, deferred work, review ask, and reminder seed still need to be captured.",
      recommendedAction:
        "Finish the closeout so this completed job turns into a review signal and the next probable visit.",
    });
  } else if (executionComplete && closeout && hasDeferredWorkCaptured(closeout)) {
    const nextProbableVisit = getNextProbableVisit(promise);
    candidates.push({
      reason: "deferred-work",
      summary:
        closeout.customerConditionSummary ||
        closeout.workPerformedSummary ||
        "The visit created follow-on value that still needs a concrete next step.",
      recommendedAction: nextProbableVisit
        ? `Use the closeout recap to turn ${nextProbableVisit.service} into the next scheduled visit.`
        : "Use the closeout recap to turn the best Now or Soon item into a scheduled next visit.",
    });
  }

  if (promise.followThroughDueAt || promise.status === "follow-through-due") {
    candidates.push({
      reason: "open-follow-through",
      summary:
        outcome?.outcomeSummary ||
        promise.nextAction ||
        "Promise still needs recap, scheduling, or customer follow-up.",
      recommendedAction:
        "Clear the outstanding follow-through item so this promise stops floating between completion and next action.",
    });
  }

  return candidates;
}

function getOutstandingFollowThroughCandidate(promise: PromiseRecord) {
  return getFollowThroughCandidates(promise).find(
    (candidate) =>
      !isFollowThroughReasonResolved(promise.followThroughHistory, candidate.reason),
  );
}

function reconcilePromiseStatus(promise: PromiseRecord): PromiseRecord["status"] {
  if (hasCompletedExecutionSignal(promise)) {
    return getOutstandingFollowThroughCandidate(promise) ? "follow-through-due" : "completed";
  }

  return promise.status === "tomorrow-at-risk" ? "tomorrow-at-risk" : "promises-waiting";
}

function reconcilePromiseRecord(promise: PromiseRecord): PromiseRecord {
  const reconciledStatus = reconcilePromiseStatus(promise);
  if (promise.status === reconciledStatus) return promise;

  return {
    ...promise,
    status: reconciledStatus,
  };
}

async function listSupabaseInboundRecords() {
  const rows = await supabaseRestRequest<SupabaseInboundRow[]>(
    "wrenchready_inbound?select=*&order=created_at.desc",
    { method: "GET" },
  );
  return rows.map(mapInboundRow);
}

async function listSupabasePromiseRecords() {
  const rows = await supabaseRestRequest<SupabasePromiseRow[]>(
    "wrenchready_promise?select=*&order=created_at.desc",
    { method: "GET" },
  );
  return rows.map(mapPromiseRow);
}

export async function getInboundRecords(): Promise<InboundRecord[]> {
  if (!hasPromiseCrmSupabase()) {
    return sortNewestFirst(uniqueById([...getRuntimeState().inbound, ...inboundRecords]));
  }

  try {
    return await listSupabaseInboundRecords();
  } catch {
    return sortNewestFirst(uniqueById([...getRuntimeState().inbound, ...inboundRecords]));
  }
}

export async function getInboundRecord(id: string) {
  const records = await getInboundRecords();
  return records.find((record) => record.id === id);
}

export async function getPromiseRecords(): Promise<PromiseRecord[]> {
  if (!hasPromiseCrmSupabase()) {
    return sortNewestFirst(
      uniqueById([...getRuntimeState().promises, ...promiseRecords]).map(reconcilePromiseRecord),
    );
  }

  try {
    return (await listSupabasePromiseRecords()).map(reconcilePromiseRecord);
  } catch {
    return sortNewestFirst(
      uniqueById([...getRuntimeState().promises, ...promiseRecords]).map(reconcilePromiseRecord),
    );
  }
}

export async function getPromiseRecord(id: string) {
  const records = await getPromiseRecords();
  return records.find((record) => record.id === id);
}

export async function getPromiseRecordByCustomerToken(token: string) {
  const records = await getPromiseRecords();
  return records.find((record) => record.customerAccess.token === token);
}

export async function getPromiseBoardMetrics(): Promise<PromiseBoardMetrics> {
  const [inbound, promises] = await Promise.all([getInboundRecords(), getPromiseRecords()]);

  return {
    newInbound: inbound.filter((record) => record.qualificationStatus !== "promoted").length,
    promisesWaiting: promises.filter((record) => record.status === "promises-waiting").length,
    tomorrowAtRisk: promises.filter((record) => record.status === "tomorrow-at-risk").length,
    followThroughDue: promises.filter((record) => record.status === "follow-through-due").length,
  };
}

export async function getPromiseEconomicsRollup(): Promise<PromiseEconomicsRollup> {
  const promises = await getPromiseRecords();
  const modeled = promises
    .map((promise) => computePromiseEconomics(promise.economics))
    .filter((value): value is NonNullable<ReturnType<typeof computePromiseEconomics>> => value !== null);

  const trackedPromises = modeled.length;
  const totalRevenue = modeled.reduce((sum, item) => sum + item.revenue, 0);
  const totalNetProfitEstimate = modeled.reduce(
    (sum, item) => sum + item.netProfitEstimateAmount,
    0,
  );
  const perHourValues = modeled
    .map((item) => item.netProfitPerClockHour)
    .filter((value): value is number => value !== undefined);

  return {
    trackedPromises,
    totalRevenue,
    totalNetProfitEstimate,
    averageNetProfitPerClockHour:
      perHourValues.length > 0
        ? perHourValues.reduce((sum, value) => sum + value, 0) / perHourValues.length
        : undefined,
  };
}

export async function getTomorrowReadinessSnapshot(): Promise<TomorrowReadinessSnapshot> {
  const promises = await getPromiseRecords();
  const candidates = promises.filter(
    (record) => record.status === "promises-waiting" || record.status === "tomorrow-at-risk",
  );

  const items = candidates
    .map((record) => {
      const readinessScore = computeReadinessScore(
        record.customerCertainty,
        record.dayReadiness,
      );
      const blockers = getPromiseReadinessBlockers(
        record.customerCertainty,
        record.dayReadiness,
      );
      const economics = computePromiseEconomics(record.economics);

      return {
        promiseId: record.id,
        customerName: record.customer.name,
        owner: record.owner,
        serviceScope: record.serviceScope,
        territory: record.location.territory,
        scheduledWindowLabel: record.scheduledWindow.label,
        readinessScore,
        blockers,
        nextAction: record.nextAction,
        customerCertainty: record.customerCertainty,
        dayReadiness: record.dayReadiness,
        netProfitEstimateAmount: economics?.netProfitEstimateAmount,
      };
    })
    .sort((a, b) => {
      if (a.readinessScore !== b.readinessScore) return a.readinessScore - b.readinessScore;
      return (b.netProfitEstimateAmount ?? 0) - (a.netProfitEstimateAmount ?? 0);
    });

  const total = items.length;
  const readyNow = items.filter((item) => item.readinessScore >= 82).length;
  const needsAttention = total - readyNow;
  const averageReadinessScore =
    total > 0
      ? Math.round(items.reduce((sum, item) => sum + item.readinessScore, 0) / total)
      : 0;

  return {
    generatedAt: new Date().toISOString(),
    total,
    readyNow,
    needsAttention,
    averageReadinessScore,
    promises: items,
  };
}

function buildFollowThroughTask(
  promise: PromiseRecord,
  sourceInbound?: InboundRecord,
): FollowThroughTask | null {
  const dueAt = promise.followThroughDueAt || undefined;
  const now = Date.now();
  const dueTime = dueAt ? new Date(dueAt).getTime() : undefined;
  const isDueSoon = dueTime !== undefined && dueTime <= now + 24 * 60 * 60 * 1000;
  const urgency =
    dueTime !== undefined && dueTime < now
      ? "overdue"
      : isDueSoon || promise.status === "follow-through-due"
        ? "due-now"
        : "queued";

  const nextCandidate = getOutstandingFollowThroughCandidate(promise);

  if (!nextCandidate) return null;

  const { reason, summary, recommendedAction } = nextCandidate;
  const outcome = promise.commercialOutcome;

  const economics = computePromiseEconomics(promise.economics);

  return {
    promiseId: promise.id,
    inboundId: promise.inboundId,
    createdAt: promise.createdAt,
    updatedAt: promise.updatedAt,
    customerName: promise.customer.name,
    customerPhone: promise.customer.phone,
    owner: promise.owner,
    territory: promise.location.territory,
    marketingOffer: sourceInbound?.marketingOffer,
    serviceScope: promise.serviceScope,
    scheduledWindowLabel: promise.scheduledWindow.label,
    dueAt,
    reason,
    urgency,
    recommendedAction,
    outcomeStatus: outcome?.outcomeStatus,
    convertedService: outcome?.convertedService,
    deferredValueAmount: outcome?.deferredValueAmount,
    netProfitEstimateAmount: economics?.netProfitEstimateAmount,
    summary,
  };
}

function isFollowThroughReasonResolved(
  history: PromiseRecord["followThroughHistory"],
  reason: FollowThroughTask["reason"],
) {
  const resolution =
    history?.find((entry) => entry.reason === reason) ||
    getLatestFollowThroughResolution(history);
  if (!resolution) return false;
  if (resolution.reason) return resolution.reason === reason;

  if (resolution.action === "recap-sent") {
    return reason === "review-request" || reason === "diagnostic-recap";
  }

  if (resolution.action === "scheduled-next-step") {
    return reason === "approved-next-step" || reason === "maintenance-reminder";
  }

  if (resolution.action === "parked" || resolution.action === "resolved-other") {
    return reason === "open-follow-through" || reason === "deferred-work";
  }

  return false;
}

export async function getFollowThroughWorklist(): Promise<{
  generatedAt: string;
  summary: FollowThroughSummary;
  tasks: FollowThroughTask[];
}> {
  const [inbound, promises] = await Promise.all([getInboundRecords(), getPromiseRecords()]);
  const inboundById = new Map(inbound.map((record) => [record.id, record]));
  const tasks = promises
    .map((promise) =>
      buildFollowThroughTask(
        promise,
        promise.inboundId ? inboundById.get(promise.inboundId) : undefined,
      ),
    )
    .filter((task): task is FollowThroughTask => task !== null)
    .sort((a, b) => {
      const urgencyRank = { overdue: 0, "due-now": 1, queued: 2 };
      if (urgencyRank[a.urgency] !== urgencyRank[b.urgency]) {
        return urgencyRank[a.urgency] - urgencyRank[b.urgency];
      }

      if ((b.deferredValueAmount ?? 0) !== (a.deferredValueAmount ?? 0)) {
        return (b.deferredValueAmount ?? 0) - (a.deferredValueAmount ?? 0);
      }

      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });

  const summary: FollowThroughSummary = {
    total: tasks.length,
    overdue: tasks.filter((task) => task.urgency === "overdue").length,
    dueNow: tasks.filter((task) => task.urgency === "due-now").length,
    queued: tasks.filter((task) => task.urgency === "queued").length,
    approvedNextStep: tasks.filter((task) => task.reason === "approved-next-step").length,
    deferredWork: tasks.filter((task) => task.reason === "deferred-work").length,
    diagnosticRecap: tasks.filter((task) => task.reason === "diagnostic-recap").length,
    reviewRequest: tasks.filter((task) => task.reason === "review-request").length,
    maintenanceReminder: tasks.filter((task) => task.reason === "maintenance-reminder").length,
    openFollowThrough: tasks.filter((task) => task.reason === "open-follow-through").length,
    deferredValueTotal: tasks.reduce(
      (sum, task) => sum + (task.deferredValueAmount ?? 0),
      0,
    ),
  };

  return {
    generatedAt: new Date().toISOString(),
    summary,
    tasks,
  };
}

function getOwnerFocusMessage(metrics: OwnerExecutionMetrics) {
  if (metrics.tomorrowAtRisk > 0) {
    return "Reduce tomorrow risk first. Promises already made outrank new demand.";
  }

  if (metrics.followThroughOpen > 0) {
    return "Close the loop on existing value. Follow-through is the fastest path to more revenue without more lead cost.";
  }

  if (metrics.inboundOwned > 0) {
    return "Work the owned inbound queue before it goes stale or turns into soft promises.";
  }

  if (metrics.promisesWaiting > 0) {
    return "Protect clean execution today: parts, route, timing, and clear customer expectations.";
  }

  return "Queue is relatively clean. Capture economics, sharpen offers, and keep the next day honest.";
}

function getOwnerDailyPriorities(input: {
  inbound: InboundRecord[];
  promisesWaiting: PromiseRecord[];
  tomorrowAtRisk: PromiseRecord[];
  followThrough: FollowThroughTask[];
  completedPromises: PromiseRecord[];
}): OwnerDailyPriority[] {
  const priorities: OwnerDailyPriority[] = [];

  for (const promise of input.tomorrowAtRisk.slice(0, 2)) {
    priorities.push({
      title: "Reduce tomorrow risk",
      detail: `${promise.customer.name}: ${promise.topRisks[0] || promise.readinessSummary}`,
      href: `/ops/promises/${promise.id}`,
      tone: "risk",
    });
  }

  for (const task of input.followThrough.slice(0, 2)) {
    priorities.push({
      title: "Close open value",
      detail: `${task.customerName}: ${task.recommendedAction}`,
      href: `/ops/promises/${task.promiseId}`,
      tone: "follow-through",
    });
  }

  for (const inbound of input.inbound.slice(0, 2)) {
    priorities.push({
      title: "Qualify owned inbound",
      detail: `${inbound.customer.name}: ${inbound.nextAction}`,
      href: `/ops/inbound/${inbound.id}`,
      tone: "inbound",
    });
  }

  for (const promise of input.promisesWaiting.slice(0, 2)) {
    priorities.push({
      title: "Protect a promised visit",
      detail: `${promise.customer.name}: ${promise.nextAction}`,
      href: `/ops/promises/${promise.id}`,
      tone: "execution",
    });
  }

  for (const promise of input.completedPromises.slice(0, 2)) {
    if (!promise.economics) continue;

    priorities.push({
      title: "Capture the learning",
      detail: `${promise.customer.name}: use this completed job to sharpen pricing, offer quality, and repeat-work follow-through.`,
      href: `/ops/promises/${promise.id}`,
      tone: "signal",
    });
  }

  if (priorities.length === 0) {
    priorities.push({
      title: "Keep the machine honest",
      detail:
        "The queue is relatively clean right now. Review recent work, capture economics, and keep tomorrow truthful before chasing more demand.",
      href: "/ops/promises",
      tone: "signal",
    });
  }

  return priorities.slice(0, 3);
}

export async function getOwnerExecutionSnapshot(
  owner: WrenchReadyOwner,
): Promise<OwnerExecutionSnapshot> {
  const [inbound, promises, followThrough] = await Promise.all([
    getInboundRecords(),
    getPromiseRecords(),
    getFollowThroughWorklist(),
  ]);

  const inboundOwned = inbound.filter(
    (record) => record.owner === owner && record.qualificationStatus !== "promoted",
  );
  const ownedPromises = promises.filter((record) => record.owner === owner);
  const promisesWaiting = ownedPromises.filter(
    (record) => record.status === "promises-waiting",
  );
  const tomorrowAtRisk = ownedPromises.filter(
    (record) => record.status === "tomorrow-at-risk",
  );
  const completedPromises = ownedPromises.filter(
    (record) => record.status === "completed",
  );
  const ownerFollowThrough = followThrough.tasks.filter((task) => task.owner === owner);
  const completedTrackedPromises = completedPromises.filter((record) => record.economics).length;

  const economicsRollup = ownedPromises
    .map((record) => computePromiseEconomics(record.economics))
    .filter((value): value is NonNullable<ReturnType<typeof computePromiseEconomics>> => value !== null);

  const metrics: OwnerExecutionMetrics = {
    inboundOwned: inboundOwned.length,
    promisesWaiting: promisesWaiting.length,
    tomorrowAtRisk: tomorrowAtRisk.length,
    followThroughOpen: ownerFollowThrough.length,
    completedTrackedPromises,
    revenueInView: economicsRollup.reduce((sum, item) => sum + item.revenue, 0),
    netProfitInView: economicsRollup.reduce(
      (sum, item) => sum + item.netProfitEstimateAmount,
      0,
    ),
    deferredValueOpen: ownerFollowThrough.reduce(
      (sum, item) => sum + (item.deferredValueAmount ?? 0),
      0,
    ),
  };

  return {
    owner,
    generatedAt: new Date().toISOString(),
    metrics,
    focusMessage: getOwnerFocusMessage(metrics),
    dailyPriorities: getOwnerDailyPriorities({
      inbound: inboundOwned,
      promisesWaiting,
      tomorrowAtRisk,
      followThrough: ownerFollowThrough,
      completedPromises,
    }),
    inbound: inboundOwned,
    promisesWaiting,
    tomorrowAtRisk,
    followThrough: ownerFollowThrough,
    completedPromises: completedPromises
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 6),
  };
}

export async function getOwnerExecutionOverview() {
  const owners: WrenchReadyOwner[] = ["Dez", "Simon"];
  return Promise.all(owners.map((owner) => getOwnerExecutionSnapshot(owner)));
}

export async function getMarketingOfferPerformance(): Promise<MarketingOfferPerformance[]> {
  const [inbound, promises] = await Promise.all([getInboundRecords(), getPromiseRecords()]);

  const inboundById = new Map(inbound.map((record) => [record.id, record]));
  const grouped = new Map<string, MarketingOfferPerformance>();

  function getOrCreate(record: InboundRecord) {
    const key = `${record.marketingOffer || "Needs offer"}::${record.dispatchTier || "unknown"}`;
    const existing = grouped.get(key);

    if (existing) return existing;

    const created: MarketingOfferPerformance = {
      marketingOffer: record.marketingOffer || "Needs offer",
      marketingRole: record.marketingRole || "unknown",
      dispatchTier: record.dispatchTier || "unknown",
      inboundCount: 0,
      promotedCount: 0,
      promotionRate: 0,
      promisesWithEconomics: 0,
      resolvedPromises: 0,
      convertedWorkCount: 0,
      deferredWorkCount: 0,
      declinedCount: 0,
      revenueInView: 0,
      netProfitInView: 0,
      deferredValueTotal: 0,
      averageNetProfitPerPromise: undefined,
      followOnPath: record.followOnPath || [],
    };

    grouped.set(key, created);
    return created;
  }

  for (const record of inbound) {
    const row = getOrCreate(record);
    row.inboundCount += 1;
  }

  for (const promise of promises) {
    const sourceInbound = promise.inboundId ? inboundById.get(promise.inboundId) : undefined;
    if (!sourceInbound) continue;

    const row = getOrCreate(sourceInbound);
    row.promotedCount += 1;

    if (isResolvedOutcome(promise.commercialOutcome)) {
      row.resolvedPromises += 1;
    }
    if (isConvertedWork(promise.commercialOutcome)) {
      row.convertedWorkCount += 1;
    }
    if (isDeferredWork(promise.commercialOutcome)) {
      row.deferredWorkCount += 1;
      row.deferredValueTotal += promise.commercialOutcome?.deferredValueAmount ?? 0;
    }
    if (isDeclinedWork(promise.commercialOutcome)) {
      row.declinedCount += 1;
    }

    const economics = computePromiseEconomics(promise.economics);
    if (!economics) continue;

    row.promisesWithEconomics += 1;
    row.revenueInView += economics.revenue;
    row.netProfitInView += economics.netProfitEstimateAmount;
  }

  for (const row of grouped.values()) {
    row.promotionRate = row.inboundCount > 0 ? row.promotedCount / row.inboundCount : 0;
    row.averageNetProfitPerPromise =
      row.promisesWithEconomics > 0
        ? row.netProfitInView / row.promisesWithEconomics
        : undefined;
  }

  return [...grouped.values()].sort((a, b) => {
    if (b.netProfitInView !== a.netProfitInView) return b.netProfitInView - a.netProfitInView;
    return b.inboundCount - a.inboundCount;
  });
}

function getWedgeActionForOffer(
  offer: MarketingOfferPerformance | undefined,
): {
  action: WedgeFocusAction;
  actionDetail: string;
  weeklyFocus: string;
} {
  if (!offer || offer.inboundCount === 0) {
    return {
      action: "Keep testing",
      actionDetail:
        "This wedge does not have enough live inbound yet. Keep the language tight, keep screening honest, and wait for cleaner signal before overweighting it.",
      weeklyFocus: "Keep gathering signal without broadening the promise.",
    };
  }

  if (offer.netProfitInView > 0 && offer.convertedWorkCount > 0) {
    return {
      action: "Lead harder",
      actionDetail:
        "This wedge is already creating both real work and net profit. It deserves stronger homepage emphasis, faster response discipline, and cleaner intake handling.",
      weeklyFocus: "Protect response speed and make this wedge the clearest front door.",
    };
  }

  if (offer.promotedCount > 0 && offer.convertedWorkCount === 0 && offer.deferredWorkCount > 0) {
    return {
      action: "Tighten follow-through",
      actionDetail:
        "This wedge is opening work, but too much value is cooling into deferred items. Close the recap and next-step gap before pushing more demand into it.",
      weeklyFocus: "Turn deferred value into scheduled next steps.",
    };
  }

  if (offer.promotedCount === 0 || offer.promotionRate < 0.5) {
    return {
      action: "Protect the promise",
      actionDetail:
        "Demand is arriving, but too much of it is not clean enough to turn into a promise. Tighten worksite notes, job-fit screening, and pricing language before scaling it.",
      weeklyFocus: "Tighten screening so the wedge creates believable promises, not noisy inbound.",
    };
  }

  return {
    action: "Keep testing",
    actionDetail:
      "The wedge has early movement, but the signal is still thin. Keep the positioning focused and keep measuring before changing spend or page hierarchy.",
    weeklyFocus: "Keep testing without broadening the service story.",
  };
}

export async function getWedgeFocusSnapshot(): Promise<WedgeFocusSnapshot> {
  const offers = await getMarketingOfferPerformance();
  const byOffer = new Map(offers.map((offer) => [offer.marketingOffer, offer]));

  const wedgeDefinitions: Array<{
    id: WedgeFocusItem["id"];
    title: string;
    marketingOffer: string;
    lane: string;
    homepagePriority: WedgeFocusItem["homepagePriority"];
  }> = [
    {
      id: "battery-no-start",
      title: "Dead battery and no-start",
      marketingOffer: "No-start help",
      lane: "Battery / no-start / charging",
      homepagePriority: "primary",
    },
    {
      id: "brake-service",
      title: "Brake noise and brake repair",
      marketingOffer: "Brake help",
      lane: "Brake service",
      homepagePriority: "primary",
    },
    {
      id: "paid-diagnostic",
      title: "Check engine and paid diagnostic clarity",
      marketingOffer: "Check engine light evaluation",
      lane: "Check-engine / diagnostic evaluation",
      homepagePriority: "supporting",
    },
    {
      id: "inspection",
      title: "Pre-purchase and inspection trust lane",
      marketingOffer: "Inspection",
      lane: "Inspection",
      homepagePriority: "supporting",
    },
    {
      id: "maintenance",
      title: "Routine maintenance as retention, not the hero",
      marketingOffer: "Mobile oil change",
      lane: "Maintenance / retention",
      homepagePriority: "supporting",
    },
  ];

  const wedges = wedgeDefinitions.map<WedgeFocusItem>((definition) => {
    const offer = byOffer.get(definition.marketingOffer);
    const action = getWedgeActionForOffer(offer);

    return {
      id: definition.id,
      title: definition.title,
      marketingOffer: definition.marketingOffer,
      lane: definition.lane,
      homepagePriority: definition.homepagePriority,
      inboundCount: offer?.inboundCount ?? 0,
      promotedCount: offer?.promotedCount ?? 0,
      promotionRate: offer?.promotionRate ?? 0,
      convertedWorkCount: offer?.convertedWorkCount ?? 0,
      netProfitInView: offer?.netProfitInView ?? 0,
      deferredValueTotal: offer?.deferredValueTotal ?? 0,
      action: action.action,
      actionDetail: action.actionDetail,
      weeklyFocus: action.weeklyFocus,
    };
  });

  const primaryWedges = wedges.filter((wedge) => wedge.homepagePriority === "primary");
  const topPrimaryWedge = [...primaryWedges].sort((left, right) => {
    if (right.netProfitInView !== left.netProfitInView) {
      return right.netProfitInView - left.netProfitInView;
    }
    return right.promotedCount - left.promotedCount;
  })[0];

  const focusAreas = primaryWedges.map((wedge) => {
    if (wedge.inboundCount === 0) {
      return `${wedge.title}: tighten the page and intake language until live inbound starts showing up cleanly.`;
    }

    if (wedge.action === "Lead harder") {
      return `${wedge.title}: keep it at the top of the homepage, answer fast, and protect the clean promise that is already converting.`;
    }

    if (wedge.action === "Protect the promise") {
      return `${wedge.title}: improve worksite notes, pricing framing, and screening so fewer leads die before a believable promise.`;
    }

    if (wedge.action === "Tighten follow-through") {
      return `${wedge.title}: close the recap and next-step gap so deferred value does not cool off.`;
    }

    return `${wedge.title}: keep gathering signal without broadening into generic mobile-mechanic language.`;
  });

  return {
    generatedAt: new Date().toISOString(),
    headline: topPrimaryWedge
      ? `${topPrimaryWedge.title} is the clearest current wedge to protect and grow.`
      : "No wedge has enough live signal yet. Keep the front door narrow and measurable.",
    whyNow:
      "The company needs a sharper front door, not a broader catalog. The launch wedges should make demand easier to capture, easier to screen, and easier to turn into profitable kept promises.",
    focusAreas,
    wedges,
  };
}

export async function getPromiseBoardSnapshot() {
  const [inbound, promises, metrics, economics] = await Promise.all([
    getInboundRecords(),
    getPromiseRecords(),
    getPromiseBoardMetrics(),
    getPromiseEconomicsRollup(),
  ]);

  return {
    generatedAt: new Date().toISOString(),
    metrics,
    economics,
    inbound: inbound.filter((record) => record.qualificationStatus !== "promoted"),
    promisesWaiting: promises.filter((record) => record.status === "promises-waiting"),
    tomorrowAtRisk: promises.filter((record) => record.status === "tomorrow-at-risk"),
    followThroughDue: promises.filter((record) => record.status === "follow-through-due"),
  };
}

export async function createInboundRecord(
  input: InboundCreateInput,
  evaluation = evaluateIntake({
    fullName: input.customerName,
    email: input.customerEmail || "",
    phone: input.customerPhone,
    vehicle: input.vehicle,
    serviceNeeded: input.requestedService,
    address: input.address,
    timing: input.timingLabel || "",
    notes: input.notes || "",
    smsConsent: input.preferredContact === "text",
  }),
) {
  const vehicle = parseVehicle(input.vehicle);
  const location = inferCityAndTerritory(input.address, evaluation);
  const insertRow: Omit<SupabaseInboundRow, "id" | "created_at"> = {
    source: input.source,
    customer_name: input.customerName || "Inbound lead",
    customer_phone: input.customerPhone || "Unknown",
    customer_email: input.customerEmail || null,
    preferred_contact: input.preferredContact,
    vehicle_year: vehicle.year,
    vehicle_make: vehicle.make,
    vehicle_model: vehicle.model,
    vehicle_mileage: null,
    vehicle_label: vehicle.label,
    location_label: input.address || `${location.territory} worksite`,
    city: location.city,
    territory: location.territory,
    access_notes: input.notes || null,
    requested_service: input.requestedService || "Needs screening",
    normalized_service: evaluation.normalizedService,
    service_lane: evaluation.serviceLane,
    symptom_summary: input.notes || input.requestedService || "Inbound submitted.",
    owner: "Unassigned",
    readiness_risk: evaluation.readinessRisk,
    qualification_status: "new",
    promise_fit: evaluation.promiseFit,
    preferred_window_label: input.timingLabel || "No timing selected",
    preferred_window_start: null,
    preferred_window_end: null,
    next_action: evaluation.nextAction,
    notes: [
      input.source === "website"
        ? "Created from public website request form."
        : `Created from ${input.source} intake.`,
      evaluation.promiseFit === "review"
        ? "Do not promise timing before human screening."
        : "Screen and assign owner before confirming the visit.",
    ],
    raw_payload: {
      ...(input.rawPayload && typeof input.rawPayload === "object" ? input.rawPayload : {}),
      marketingOffer: evaluation.marketingOffer,
      marketingRole: evaluation.marketingRole,
      dispatchTier: evaluation.dispatchTier,
      followOnPath: evaluation.followOnPath,
      serviceClass: evaluation.serviceClass,
      acceptancePolicy: evaluation.acceptancePolicy,
      pricingGuardrails: evaluation.pricingGuardrails,
      screeningQuestions: evaluation.screeningQuestions,
      redFlagTriggers: evaluation.redFlagTriggers,
      dispatchGate: evaluation.dispatchGate,
      wedgePromise: evaluation.wedgePromise,
    },
  };

  if (!hasPromiseCrmSupabase()) {
    const created: InboundRecord = mapInboundRow({
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
      ...insertRow,
    });
    getRuntimeState().inbound.unshift(created);
    return created;
  }

  try {
    const rows = await supabaseRestRequest<SupabaseInboundRow[]>(
      "wrenchready_inbound",
      {
        method: "POST",
        body: insertRow,
      },
    );

    return rows[0] ? mapInboundRow(rows[0]) : null;
  } catch {
    const created: InboundRecord = mapInboundRow({
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
      ...insertRow,
    });
    getRuntimeState().inbound.unshift(created);
    return created;
  }
}

export async function createInboundFromAppointment(
  payload: AppointmentPayload,
  evaluation = evaluateIntake(payload),
) {
  return createInboundRecord(
    {
      source: "website",
      customerName: payload.fullName,
      customerPhone: payload.phone,
      customerEmail: payload.email,
      preferredContact: payload.smsConsent ? "text" : "call",
      vehicle: payload.vehicle,
      requestedService: payload.serviceNeeded,
      address: payload.address,
      timingLabel: payload.timing,
      notes: payload.notes,
      rawPayload: payload,
    },
    evaluation,
  );
}

type CreatePromiseInput = {
  inboundId: string;
  owner: PromiseRecord["owner"];
  serviceScope: string;
  scheduledWindowLabel: string;
  readinessSummary: string;
  nextAction: string;
};

export async function createPromiseFromInbound(input: CreatePromiseInput) {
  const inbound = await getInboundRecord(input.inboundId);

  if (!inbound) {
    throw new Error("Inbound record not found.");
  }

  const customerAccess = createPromiseCustomerAccess();
  const promiseRow: Omit<SupabasePromiseRow, "id" | "created_at" | "updated_at"> = {
    inbound_id: inbound.id,
    customer_name: inbound.customer.name,
    customer_phone: inbound.customer.phone,
    customer_email: inbound.customer.email || null,
    preferred_contact: inbound.customer.preferredContact,
    vehicle_year: inbound.vehicle.year || null,
    vehicle_make: inbound.vehicle.make,
    vehicle_model: inbound.vehicle.model,
    vehicle_mileage: inbound.vehicle.mileage || null,
    location_label: inbound.location.label,
    city: inbound.location.city,
    territory: inbound.location.territory,
    access_notes: inbound.location.accessNotes || null,
    service_scope: input.serviceScope,
    owner: input.owner,
    readiness_risk: inbound.readinessRisk,
    status: inbound.readinessRisk === "high" ? "tomorrow-at-risk" : "promises-waiting",
    scheduled_window_label: input.scheduledWindowLabel,
    scheduled_window_start: inbound.preferredWindow.startIso || null,
    scheduled_window_end: inbound.preferredWindow.endIso || null,
    readiness_summary: input.readinessSummary,
    next_action: input.nextAction,
    top_risks:
      inbound.readinessRisk === "high"
        ? ["This promise still needs active risk reduction before it is safe to keep."]
        : [],
    notes: [
      ...mergePromiseNotesWithExecutionOps(
        mergePromiseNotesWithReadinessState(
          mergePromiseNotesWithCustomerState(
            ["Promoted from inbound record.", ...inbound.notes],
            customerAccess,
          ),
          getDefaultCustomerCertainty(),
          getDefaultDayReadiness(),
        ),
        "scheduled",
      ),
    ],
    follow_through_due_at: null,
  };

  if (!hasPromiseCrmSupabase()) {
    const created: PromiseRecord = mapPromiseRow({
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...promiseRow,
    });

    const runtime = getRuntimeState();
    runtime.promises.unshift(created);
    replaceInboundRecord(markInboundPromoted(inbound, input.owner));

    return created;
  }

  try {
    const [rows] = await Promise.all([
      supabaseRestRequest<SupabasePromiseRow[]>("wrenchready_promise", {
        method: "POST",
        body: promiseRow,
      }),
      supabaseRestRequest<unknown>(
        `wrenchready_inbound?id=eq.${inbound.id}`,
        {
          method: "PATCH",
          body: { qualification_status: "promoted", owner: input.owner },
          prefer: "return=minimal",
        },
      ).catch(() => undefined),
    ]);

    return rows[0] ? mapPromiseRow(rows[0]) : null;
  } catch {
    const created: PromiseRecord = mapPromiseRow({
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...promiseRow,
    });

    replacePromiseRecord(created);
    replaceInboundRecord(markInboundPromoted(inbound, input.owner));

    return created;
  }
}

export async function updateInboundRecord(id: string, updates: UpdateInboundInput) {
  const current = await getInboundRecord(id);

  if (!current) {
    throw new Error("Inbound record not found.");
  }

  const patch = {
    owner: updates.owner ?? current.owner,
    qualification_status: updates.qualificationStatus ?? current.qualificationStatus,
    readiness_risk: updates.readinessRisk ?? current.readinessRisk,
    next_action: updates.nextAction ?? current.nextAction,
    preferred_window_label:
      updates.preferredWindowLabel ?? current.preferredWindow.label,
    notes: appendNoteList(current.notes, updates.noteToAdd),
  };

  if (!hasPromiseCrmSupabase()) {
    const updated: InboundRecord = {
      ...current,
      owner: patch.owner,
      qualificationStatus: patch.qualification_status,
      readinessRisk: patch.readiness_risk,
      nextAction: patch.next_action,
      preferredWindow: {
        ...current.preferredWindow,
        label: patch.preferred_window_label,
      },
      notes: patch.notes,
    };

    replaceInboundRecord(updated);
    return updated;
  }

  try {
    const rows = await supabaseRestRequest<SupabaseInboundRow[]>(
      `wrenchready_inbound?id=eq.${id}`,
      {
        method: "PATCH",
        body: patch,
      },
    );

    return rows[0] ? mapInboundRow(rows[0]) : current;
  } catch {
    const updated: InboundRecord = {
      ...current,
      owner: patch.owner,
      qualificationStatus: patch.qualification_status,
      readinessRisk: patch.readiness_risk,
      nextAction: patch.next_action,
      preferredWindow: {
        ...current.preferredWindow,
        label: patch.preferred_window_label,
      },
      notes: patch.notes,
    };

    replaceInboundRecord(updated);
    return updated;
  }
}

export async function updatePromiseRecord(id: string, updates: UpdatePromiseInput) {
  const current = await getPromiseRecord(id);

  if (!current) {
    throw new Error("Promise record not found.");
  }

  const nextFollowThroughResolution =
    updates.followThroughResolution !== undefined
      ? normalizeFollowThroughResolution(updates.followThroughResolution)
      : updates.followThroughDueAt !== undefined && updates.followThroughDueAt !== null
        ? undefined
        : updates.status === "follow-through-due"
          ? undefined
          : current.followThroughResolution;
  const nextFollowThroughHistory =
    updates.followThroughResolution !== undefined
      ? mergeFollowThroughResolutionHistory(
          current.followThroughHistory,
          nextFollowThroughResolution,
        )
      : current.followThroughHistory;
  const nextCustomerApproval =
    updates.customerApproval === undefined
      ? current.customerApproval
      : ensurePromiseCustomerApproval(normalizePromiseCustomerApproval(updates.customerApproval));
  const nextCloseout =
    mergePromiseCloseout(current.closeout, updates.closeout);
  const nextOutboundHistory =
    updates.outboundEvent === undefined
      ? current.outboundHistory
      : appendOutboundEvent(current.outboundHistory, updates.outboundEvent);
  const nextCustomerCertainty =
    updates.customerCertainty === undefined
      ? current.customerCertainty
      : normalizePromiseCustomerCertainty(updates.customerCertainty);
  const nextDayReadiness =
    updates.dayReadiness === undefined
      ? current.dayReadiness
      : normalizePromiseDayReadiness(updates.dayReadiness);
  const nextJobStage =
    updates.jobStage === undefined ? current.jobStage : normalizePromiseJobStage(updates.jobStage);
  const nextFieldExecution = mergeFieldExecutionPacket(current.fieldExecution, updates.fieldExecution);
  const nextPaymentCollection = mergePaymentCollection(
    current.paymentCollection,
    updates.paymentCollection,
  );
  const nextWarrantyCase = mergeWarrantyCase(current.warrantyCase, updates.warrantyCase);
  const nextRecurringAccount = mergeRecurringAccount(
    current.recurringAccount,
    updates.recurringAccount,
  );
  const resolvedStatus = reconcilePromiseStatus({
    ...current,
    updatedAt: new Date().toISOString(),
    owner: updates.owner ?? current.owner,
    readinessRisk: updates.readinessRisk ?? current.readinessRisk,
    status: updates.status ?? current.status,
    serviceScope: updates.serviceScope ?? current.serviceScope,
    scheduledWindow: {
      ...current.scheduledWindow,
      label: updates.scheduledWindowLabel ?? current.scheduledWindow.label,
    },
    readinessSummary: updates.readinessSummary ?? current.readinessSummary,
    nextAction: updates.nextAction ?? current.nextAction,
    topRisks: updates.topRisks ?? current.topRisks,
    jobStage: nextJobStage,
    customerCertainty: nextCustomerCertainty,
    dayReadiness: nextDayReadiness,
    fieldExecution: nextFieldExecution,
    paymentCollection: nextPaymentCollection,
    warrantyCase: nextWarrantyCase,
    recurringAccount: nextRecurringAccount,
    customerAccess: current.customerAccess,
    customerApproval: nextCustomerApproval,
    economics:
      updates.economics === undefined
        ? current.economics
        : normalizePromiseEconomics(updates.economics),
    commercialOutcome:
      updates.commercialOutcome === undefined
        ? current.commercialOutcome
        : normalizeCommercialOutcome(updates.commercialOutcome),
    closeout: nextCloseout,
    outboundHistory: nextOutboundHistory,
    followThroughDueAt:
      updates.followThroughDueAt === undefined
        ? current.followThroughDueAt
        : updates.followThroughDueAt || undefined,
    followThroughResolution: nextFollowThroughResolution,
    followThroughHistory: nextFollowThroughHistory,
  });

  const patch = {
    owner: updates.owner ?? current.owner,
    readiness_risk: updates.readinessRisk ?? current.readinessRisk,
    status: resolvedStatus,
    service_scope: updates.serviceScope ?? current.serviceScope,
    scheduled_window_label:
      updates.scheduledWindowLabel ?? current.scheduledWindow.label,
    readiness_summary: updates.readinessSummary ?? current.readinessSummary,
    next_action: updates.nextAction ?? current.nextAction,
    top_risks: updates.topRisks ?? current.topRisks,
    notes: mergePromiseNotesWithExecutionOps(
      mergePromiseNotesWithReadinessState(
        mergePromiseNotesWithCustomerState(
          mergePromiseNotesWithOutboundHistory(
            mergePromiseNotesWithCloseout(
              mergePromiseNotesWithCommercialOutcome(
                mergePromiseNotesWithFollowThroughResolution(
                  mergePromiseNotesWithEconomics(
                    appendNoteList(current.notes, updates.noteToAdd),
                    updates.economics === undefined
                      ? current.economics
                      : normalizePromiseEconomics(updates.economics),
                  ),
                  nextFollowThroughHistory,
                ),
                updates.commercialOutcome === undefined
                  ? current.commercialOutcome
                  : normalizeCommercialOutcome(updates.commercialOutcome),
              ),
              nextCloseout,
            ),
            nextOutboundHistory,
          ),
          current.customerAccess,
          nextCustomerApproval,
        ),
        nextCustomerCertainty,
        nextDayReadiness,
      ),
      nextJobStage,
      nextFieldExecution,
      nextPaymentCollection,
      nextWarrantyCase,
      nextRecurringAccount,
    ),
    follow_through_due_at:
      updates.followThroughDueAt === undefined
        ? current.followThroughDueAt || null
        : updates.followThroughDueAt,
  };

  if (!hasPromiseCrmSupabase()) {
    const updated: PromiseRecord = {
      ...current,
      updatedAt: new Date().toISOString(),
      owner: patch.owner,
      readinessRisk: patch.readiness_risk,
      status: patch.status,
      serviceScope: patch.service_scope,
      scheduledWindow: {
        ...current.scheduledWindow,
        label: patch.scheduled_window_label,
      },
      readinessSummary: patch.readiness_summary,
      nextAction: patch.next_action,
      topRisks: patch.top_risks,
      notes: extractPromiseReadinessState(
        extractPromiseCustomerState(
          extractPromiseOutboundHistory(
            extractPromiseCloseout(
              extractFollowThroughResolution(
                extractPromiseExecutionOps(
                  extractCommercialOutcome(extractPromiseEconomics(patch.notes).visibleNotes).visibleNotes,
                ).visibleNotes,
              ).visibleNotes,
            ).visibleNotes,
          ).visibleNotes,
          current.id,
        ).visibleNotes,
      ).visibleNotes,
      jobStage: nextJobStage,
      customerCertainty: nextCustomerCertainty,
      dayReadiness: nextDayReadiness,
      fieldExecution: nextFieldExecution,
      paymentCollection: nextPaymentCollection,
      warrantyCase: nextWarrantyCase,
      recurringAccount: nextRecurringAccount,
      customerAccess: current.customerAccess,
      customerApproval: nextCustomerApproval,
      economics:
        updates.economics === undefined
          ? current.economics
          : normalizePromiseEconomics(updates.economics),
      commercialOutcome:
        updates.commercialOutcome === undefined
          ? current.commercialOutcome
          : normalizeCommercialOutcome(updates.commercialOutcome),
      closeout: nextCloseout,
      outboundHistory: nextOutboundHistory,
      followThroughDueAt: patch.follow_through_due_at || undefined,
      followThroughResolution: nextFollowThroughResolution,
      followThroughHistory: nextFollowThroughHistory,
    };

    replacePromiseRecord(updated);
    return updated;
  }

  try {
    const rows = await supabaseRestRequest<SupabasePromiseRow[]>(
      `wrenchready_promise?id=eq.${id}`,
      {
        method: "PATCH",
        body: patch,
      },
    );

    return rows[0] ? mapPromiseRow(rows[0]) : current;
  } catch {
    const updated: PromiseRecord = {
      ...current,
      updatedAt: new Date().toISOString(),
      owner: patch.owner,
      readinessRisk: patch.readiness_risk,
      status: patch.status,
      serviceScope: patch.service_scope,
      scheduledWindow: {
        ...current.scheduledWindow,
        label: patch.scheduled_window_label,
      },
      readinessSummary: patch.readiness_summary,
      nextAction: patch.next_action,
      topRisks: patch.top_risks,
      notes: extractPromiseReadinessState(
        extractPromiseCustomerState(
          extractPromiseOutboundHistory(
            extractPromiseCloseout(
              extractFollowThroughResolution(
                extractPromiseExecutionOps(
                  extractCommercialOutcome(extractPromiseEconomics(patch.notes).visibleNotes).visibleNotes,
                ).visibleNotes,
              ).visibleNotes,
            ).visibleNotes,
          ).visibleNotes,
          current.id,
        ).visibleNotes,
      ).visibleNotes,
      jobStage: nextJobStage,
      customerCertainty: nextCustomerCertainty,
      dayReadiness: nextDayReadiness,
      fieldExecution: nextFieldExecution,
      paymentCollection: nextPaymentCollection,
      warrantyCase: nextWarrantyCase,
      recurringAccount: nextRecurringAccount,
      customerAccess: current.customerAccess,
      customerApproval: nextCustomerApproval,
      economics:
        updates.economics === undefined
          ? current.economics
          : normalizePromiseEconomics(updates.economics),
      commercialOutcome:
        updates.commercialOutcome === undefined
          ? current.commercialOutcome
          : normalizeCommercialOutcome(updates.commercialOutcome),
      closeout: nextCloseout,
      outboundHistory: nextOutboundHistory,
      followThroughDueAt: patch.follow_through_due_at || undefined,
      followThroughResolution: nextFollowThroughResolution,
      followThroughHistory: nextFollowThroughHistory,
    };

    replacePromiseRecord(updated);
    return updated;
  }
}

export async function getCloseoutRecaptureSnapshot(): Promise<CloseoutRecaptureSnapshot> {
  const promises = await getPromiseRecords();
  const completedPromises = promises.filter(
    (record) => record.status === "completed" || record.status === "follow-through-due",
  );

  const snapshot = completedPromises.reduce<CloseoutRecaptureSnapshot>(
    (summary, record) => {
      const closeout = record.closeout;
      const proof = getProofDisciplineForPromise(record);
      const closeoutQualityFlags = [
        Boolean(closeout?.workPerformedSummary),
        Boolean(closeout?.customerConditionSummary),
        Boolean(closeout?.customerRecap?.status && closeout.customerRecap.status !== "not-ready"),
        Boolean(closeout?.reviewRequest?.status && closeout.reviewRequest.status !== "not-ready"),
        Boolean(
          closeout?.maintenanceReminder?.status &&
            closeout.maintenanceReminder.status !== "not-seeded",
        ),
        Boolean(getNextProbableVisit(record)),
        proof.proofScore >= 70,
        proof.approvedAssets > 0,
      ].filter(Boolean).length;

      summary.completedPromises += 1;
      if (closeout) summary.closeoutCompleted += 1;
      if (!closeout) summary.closeoutMissing += 1;
      if (closeout?.customerRecap?.status === "ready") summary.recapReady += 1;
      if (closeout?.customerRecap?.status === "sent") summary.recapSent += 1;
      if (closeout?.reviewRequest?.status === "ready") summary.reviewReady += 1;
      if (closeout?.reviewRequest?.status === "sent") summary.reviewSent += 1;
      if (closeout?.reviewRequest?.status === "completed") summary.reviewCompleted += 1;
      if (closeout?.maintenanceReminder?.status === "seeded") summary.reminderSeeded += 1;
      if (closeout?.maintenanceReminder?.status === "scheduled") summary.reminderScheduled += 1;
      if (getNextProbableVisit(record)) summary.nextProbableVisitCaptured += 1;
      if (
        closeout?.proofCapture?.bookingReason ||
        closeout?.proofCapture?.promiseThatMatteredMost ||
        closeout?.proofCapture?.customerReliefQuote ||
        closeout?.proofCapture?.proofNotes ||
        (closeout?.proofCapture?.assets.length || 0) > 0
      ) {
        summary.proofCaptured += 1;
      }
      if (proof.approvedAssets > 0) summary.proofPermissionReady += 1;
      summary.nowItems += closeout?.now.length || 0;
      summary.soonItems += closeout?.soon.length || 0;
      summary.monitorItems += closeout?.monitor.length || 0;
      summary.deferredValueOpen += record.commercialOutcome?.deferredValueAmount || 0;
      summary.closeoutQualityRate += closeoutQualityFlags / 8;
      return summary;
    },
    {
      completedPromises: 0,
      closeoutCompleted: 0,
      closeoutMissing: 0,
      closeoutQualityRate: 0,
      recapReady: 0,
      recapSent: 0,
      reviewReady: 0,
      reviewSent: 0,
      reviewCompleted: 0,
      reminderSeeded: 0,
      reminderScheduled: 0,
      nextProbableVisitCaptured: 0,
      proofCaptured: 0,
      proofPermissionReady: 0,
      nowItems: 0,
      soonItems: 0,
      monitorItems: 0,
      deferredValueOpen: 0,
    },
  );

  return {
    ...snapshot,
    closeoutQualityRate:
      snapshot.completedPromises > 0
        ? snapshot.closeoutQualityRate / snapshot.completedPromises
        : 0,
  };
}

export async function getOutboundQueueSnapshot(): Promise<OutboundQueueSnapshot> {
  const promises = await getPromiseRecords();
  const recentActivity = promises
    .flatMap((promise) =>
      (promise.outboundHistory || []).map((event) => ({
        ...event,
        promiseId: promise.id,
        customerName: promise.customer.name,
        serviceScope: promise.serviceScope,
        owner: promise.owner,
      })),
    )
    .sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime())
    .slice(0, 12);

  const items = promises
    .flatMap((promise) => {
      const outbound = getPromiseOutboundSnapshot(promise);
      const drafts: OutboundQueueItem[] = [];

      if (
        outbound.closeoutRecap.status !== "not-ready" &&
        promise.closeout?.customerRecap?.status !== "sent"
      ) {
        const transport = getOutboundTransportPolicy("closeout-recap", outbound.closeoutRecap.channel);
        drafts.push({
          promiseId: promise.id,
          customerName: promise.customer.name,
          owner: promise.owner,
          territory: promise.location.territory,
          serviceScope: promise.serviceScope,
          channelType: "closeout-recap",
          status: outbound.closeoutRecap.status,
          preferredChannel: outbound.closeoutRecap.channel,
          headline: outbound.closeoutRecap.headline,
          subject: outbound.closeoutRecap.subject,
          body: outbound.closeoutRecap.body,
          reason: outbound.closeoutRecap.reason,
          dueAt: promise.closeout?.completedAt,
          recapStatus: promise.closeout?.customerRecap?.status || "not-ready",
          transport,
        });
      }

      if (promise.closeout?.reviewRequest?.status === "ready") {
        const transport = getOutboundTransportPolicy("review-ask", outbound.reviewAsk.channel);
        drafts.push({
          promiseId: promise.id,
          customerName: promise.customer.name,
          owner: promise.owner,
          territory: promise.location.territory,
          serviceScope: promise.serviceScope,
          channelType: "review-ask",
          status: outbound.reviewAsk.status,
          preferredChannel: outbound.reviewAsk.channel,
          headline: outbound.reviewAsk.headline,
          subject: outbound.reviewAsk.subject,
          body: outbound.reviewAsk.body,
          reason: outbound.reviewAsk.reason,
          dueAt: promise.closeout?.reviewRequest?.dueAt,
          reviewStatus: promise.closeout?.reviewRequest?.status || "not-ready",
          transport,
        });
      }

      if (promise.closeout?.maintenanceReminder?.status === "seeded") {
        const transport = getOutboundTransportPolicy(
          "maintenance-reminder",
          outbound.reminderSeed.channel,
        );
        drafts.push({
          promiseId: promise.id,
          customerName: promise.customer.name,
          owner: promise.owner,
          territory: promise.location.territory,
          serviceScope: promise.serviceScope,
          channelType: "maintenance-reminder",
          status: outbound.reminderSeed.status,
          preferredChannel: outbound.reminderSeed.channel,
          headline: outbound.reminderSeed.headline,
          subject: outbound.reminderSeed.subject,
          body: outbound.reminderSeed.body,
          reason: outbound.reminderSeed.reason,
          dueAt: promise.closeout?.maintenanceReminder?.dueAt,
          reminderStatus: promise.closeout?.maintenanceReminder?.status || "not-seeded",
          transport,
        });
      }

      return drafts;
    })
    .sort((a, b) => {
      if (a.status !== b.status) return a.status === "send-ready" ? -1 : 1;
      if (a.dueAt && b.dueAt) return new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime();
      if (a.dueAt) return -1;
      if (b.dueAt) return 1;
      return a.customerName.localeCompare(b.customerName);
    });

  const deliveredCount = recentActivity.filter((event) => event.status === "delivered").length;
  const respondedCount = recentActivity.filter((event) => event.status === "responded").length;
  const convertedCount = recentActivity.filter((event) => event.status === "converted").length;
  const failedCount = recentActivity.filter((event) => event.status === "failed").length;

  return {
    generatedAt: new Date().toISOString(),
    summary: {
      total: items.length,
      sendReady: items.filter((item) => item.status === "send-ready" && item.transport.enabled).length,
      draftOnly: items.filter((item) => item.status === "draft").length,
      held: items.filter((item) => !item.transport.enabled).length,
      recapReady: items.filter((item) => item.channelType === "closeout-recap").length,
      reviewReady: items.filter((item) => item.channelType === "review-ask").length,
      reminderReady: items.filter((item) => item.channelType === "maintenance-reminder").length,
      deliveredToday: deliveredCount,
      responded: respondedCount,
      converted: convertedCount,
      failed: failedCount,
    },
    items,
    recentActivity,
  };
}

export async function getWeeklyRecaptureScorecard(): Promise<WeeklyRecaptureScorecard> {
  const [promises, outbound] = await Promise.all([
    getPromiseRecords(),
    getOutboundQueueSnapshot(),
  ]);
  const completedPromises = promises.filter(
    (record) => record.status === "completed" || record.status === "follow-through-due",
  );
  const completedWithEconomics = completedPromises
    .map((record) => computePromiseEconomics(record.economics))
    .filter((value): value is NonNullable<typeof value> => Boolean(value));
  const promisesWithDeposits = promises.filter(
    (record) => (record.paymentCollection?.depositRequestedAmount || 0) > 0,
  );
  const depositsCollected = promisesWithDeposits.filter(
    (record) => (record.paymentCollection?.amountCollected || 0) > 0,
  );
  const warrantyTracked = promises.filter(
    (record) =>
      record.warrantyCase &&
      record.warrantyCase.status !== "none",
  );
  const recurringTracked = promises.filter(
    (record) =>
      record.recurringAccount &&
      record.recurringAccount.status !== "not-account",
  );
  const closeoutQualityScores = completedPromises.map((record) => {
    const closeout = record.closeout;
    const proof = getProofDisciplineForPromise(record);
    const completedFlags = [
      Boolean(closeout?.workPerformedSummary),
      Boolean(closeout?.customerConditionSummary),
      Boolean(closeout?.customerRecap?.status && closeout.customerRecap.status !== "not-ready"),
      Boolean(closeout?.reviewRequest?.status && closeout.reviewRequest.status !== "not-ready"),
      Boolean(
        closeout?.maintenanceReminder?.status &&
          closeout.maintenanceReminder.status !== "not-seeded",
      ),
      Boolean(getNextProbableVisit(record)),
      proof.proofScore >= 70,
      proof.approvedAssets > 0,
    ].filter(Boolean).length;

    return completedFlags / 8;
  });
  const weakCloseouts = completedPromises
    .map((record) => {
      const closeout = record.closeout;
      const proof = getProofDisciplineForPromise(record);
      const blockers = [
        !closeout?.workPerformedSummary ? "Work performed summary missing" : null,
        !closeout?.customerConditionSummary ? "Customer condition summary missing" : null,
        !closeout?.customerRecap?.status || closeout.customerRecap.status === "not-ready"
          ? "Customer recap not ready"
          : null,
        !closeout?.reviewRequest?.status || closeout.reviewRequest.status === "not-ready"
          ? "Review ask not prepared"
          : null,
        !closeout?.maintenanceReminder?.status ||
        closeout.maintenanceReminder.status === "not-seeded"
          ? "Reminder seed missing"
          : null,
        !getNextProbableVisit(record) ? "Next probable visit missing" : null,
        proof.proofScore < 70 ? "Proof capture is weak" : null,
        proof.approvedAssets === 0 ? "No permission-safe proof asset" : null,
      ].filter((entry): entry is string => Boolean(entry));

      const score =
        [
          Boolean(closeout?.workPerformedSummary),
          Boolean(closeout?.customerConditionSummary),
          Boolean(closeout?.customerRecap?.status && closeout.customerRecap.status !== "not-ready"),
          Boolean(closeout?.reviewRequest?.status && closeout.reviewRequest.status !== "not-ready"),
          Boolean(
            closeout?.maintenanceReminder?.status &&
              closeout.maintenanceReminder.status !== "not-seeded",
          ),
          Boolean(getNextProbableVisit(record)),
          proof.proofScore >= 70,
          proof.approvedAssets > 0,
        ].filter(Boolean).length / 8;

      return {
        promiseId: record.id,
        customerName: record.customer.name,
        owner: record.owner,
        serviceScope: record.serviceScope,
        closeoutQualityScore: score,
        severity: getCloseoutSeverity(record),
        gapLabels: getCloseoutGapLabels(record),
        blockers,
        closeout,
      };
    })
    .filter((task) => task.blockers.length > 0)
    .sort((a, b) => a.closeoutQualityScore - b.closeoutQualityScore)
    .slice(0, 8);

  const metrics = {
    completedVisits: completedPromises.length,
    closeoutsDone: completedPromises.filter((record) => Boolean(record.closeout)).length,
    closeoutRate:
      completedPromises.length > 0
        ? completedPromises.filter((record) => Boolean(record.closeout)).length / completedPromises.length
        : 0,
    closeoutQualityRate:
      closeoutQualityScores.length > 0
        ? closeoutQualityScores.reduce((sum, score) => sum + score, 0) / closeoutQualityScores.length
        : 0,
    proofReady: completedPromises.filter(
      (record) => getProofDisciplineForPromise(record).proofScore >= 70,
    ).length,
    proofPermissionReady: completedPromises.filter(
      (record) => getProofDisciplineForPromise(record).approvedAssets > 0,
    ).length,
    reviewReady: completedPromises.filter(
      (record) => record.closeout?.reviewRequest?.status === "ready",
    ).length,
    reviewCompleted: completedPromises.filter(
      (record) => record.closeout?.reviewRequest?.status === "completed",
    ).length,
    recapsSent: completedPromises.filter(
      (record) => record.closeout?.customerRecap?.status === "sent",
    ).length,
    recapResponses: outbound.recentActivity.filter(
      (event) => event.channelType === "closeout-recap" && event.status === "responded",
    ).length,
    reminderSeeded: completedPromises.filter(
      (record) => record.closeout?.maintenanceReminder?.status === "seeded",
    ).length,
    reminderConversions: outbound.recentActivity.filter(
      (event) => event.channelType === "maintenance-reminder" && event.status === "converted",
    ).length,
    nextVisitCaptured: completedPromises.filter((record) => Boolean(getNextProbableVisit(record))).length,
    nextVisitConversions: outbound.recentActivity.filter(
      (event) =>
        event.status === "converted" &&
        (event.conversionType === "next-visit-requested" ||
          event.conversionType === "scheduled-next-visit"),
    ).length,
    netProfitInView: completedWithEconomics.reduce(
      (sum, economics) => sum + economics.netProfitEstimateAmount,
      0,
    ),
    depositsRequested: promisesWithDeposits.length,
    depositsCollected: depositsCollected.length,
    collectionRate:
      promisesWithDeposits.length > 0 ? depositsCollected.length / promisesWithDeposits.length : 0,
    balanceOpen: promises.reduce(
      (sum, record) => sum + (record.paymentCollection?.balanceDueAmount || 0),
      0,
    ),
    callbackOpen: warrantyTracked.filter((record) => record.warrantyCase?.status === "open").length,
    callbackResolved: warrantyTracked.filter(
      (record) => record.warrantyCase?.status === "resolved",
    ).length,
    callbackRate:
      warrantyTracked.length > 0
        ? warrantyTracked.filter((record) => record.warrantyCase?.status === "resolved").length /
          warrantyTracked.length
        : 0,
    recurringLeads: recurringTracked.filter(
      (record) => record.recurringAccount?.status === "lead" || record.recurringAccount?.status === "pitched",
    ).length,
    recurringTrialActive: recurringTracked.filter(
      (record) => record.recurringAccount?.status === "trial-active",
    ).length,
    recurringActive: recurringTracked.filter(
      (record) => record.recurringAccount?.status === "active",
    ).length,
    recurringAtRisk: recurringTracked.filter(
      (record) => record.recurringAccount?.status === "at-risk",
    ).length,
    proposalsWon: recurringTracked.filter(
      (record) => record.recurringAccount?.proposalDecision === "won",
    ).length,
    proposalsLost: recurringTracked.filter(
      (record) => record.recurringAccount?.proposalDecision === "lost",
    ).length,
    proposalsStalled: recurringTracked.filter(
      (record) => record.recurringAccount?.proposalDecision === "stalled",
    ).length,
    successfulTrials: recurringTracked.filter(
      (record) => record.recurringAccount?.trialOutcome === "successful",
    ).length,
    failedTrials: recurringTracked.filter(
      (record) => record.recurringAccount?.trialOutcome === "failed",
    ).length,
    extendedTrials: recurringTracked.filter(
      (record) => record.recurringAccount?.trialOutcome === "extended",
    ).length,
  };

  const priorities: WeeklyRecaptureScorecard["priorities"] = [];

  if (metrics.closeoutRate < 0.8) {
    priorities.push({
      title: "Finish closeout on every completed visit",
      detail: "The machine is still leaking learning because completed work is not always becoming structured recap.",
      tone: "risk",
    });
  }
  if (metrics.closeoutQualityRate < 0.75) {
    priorities.push({
      title: "Raise closeout quality, not just closeout volume",
      detail: "Too many completed visits still lack proof-safe recap depth or a believable next-step seed.",
      tone: "focus",
    });
  }
  if (metrics.reviewCompleted < metrics.recapsSent) {
    priorities.push({
      title: "Push review asks through the last mile",
      detail: "Recaps are landing more often than review conversion. The ask flow needs operator attention.",
      tone: "trust",
    });
  }
  if (metrics.nextVisitConversions < metrics.nextVisitCaptured) {
    priorities.push({
      title: "Turn next probable visits into scheduled work",
      detail: "The machine knows the next visit more often than it is actually earning it.",
      tone: "growth",
    });
  }
  if (metrics.collectionRate < 1 && metrics.depositsRequested > 0) {
    priorities.push({
      title: "Tighten deposit collection before the visit feels locked",
      detail: "Approved work is getting ahead of collected money. Protect the promise by making deposits land earlier.",
      tone: "risk",
    });
  }
  if (metrics.callbackOpen > 0) {
    priorities.push({
      title: "Close callback issues faster",
      detail: "Open warranty or comeback work is a trust leak. Keep it visible until the customer feels it is finished.",
      tone: "trust",
    });
  }
  if (metrics.recurringLeads > metrics.recurringActive) {
    priorities.push({
      title: "Move recurring-account leads into a real lane",
      detail: "The account story gets stronger when leads become trials and trials become active cadence.",
      tone: "growth",
    });
  }
  if (metrics.proofReady < metrics.completedVisits) {
    priorities.push({
      title: "Tighten proof discipline",
      detail: "Good visits are still ending without reusable proof or permission-safe assets.",
      tone: "focus",
    });
  }

  if (priorities.length === 0) {
    priorities.push({
      title: "Keep the recapture machine consistent",
      detail: "The current weekly signal is healthy. Protect the habit and keep measuring the full loop.",
      tone: "focus",
    });
  }

  return {
    generatedAt: new Date().toISOString(),
    windowLabel: "Last 7-day operating view",
    metrics,
    priorities,
    weakCloseouts,
  };
}

export async function getProofDisciplineSnapshot(): Promise<ProofDisciplineSnapshot> {
  const promises = await getPromiseRecords();
  const completedPromises = promises.filter(
    (record) => record.status === "completed" || record.status === "follow-through-due",
  );
  const tasks = completedPromises
    .map((record) => {
      const proof = getProofDisciplineForPromise(record);
      return {
        promiseId: record.id,
        customerName: record.customer.name,
        owner: record.owner,
        serviceScope: record.serviceScope,
        territory: record.location.territory,
        proofScore: proof.proofScore,
        needsPermission: proof.needsPermission,
        approvedAssets: proof.approvedAssets,
        blockers: proof.blockers,
        nextStep: proof.nextStep,
      };
    })
    .filter((task) => task.proofScore < 100 || task.needsPermission)
    .sort((a, b) => a.proofScore - b.proofScore);

  return {
    generatedAt: new Date().toISOString(),
    summary: {
      completedVisits: completedPromises.length,
      proofReady: completedPromises.filter(
        (record) => getProofDisciplineForPromise(record).proofScore >= 70,
      ).length,
      proofWeak: tasks.length,
      permissionSafeAssets: completedPromises.reduce(
        (sum, record) => sum + getProofDisciplineForPromise(record).approvedAssets,
        0,
      ),
    },
    tasks,
  };
}

function getPublicCustomerLabel(name: string, territory: string) {
  const trimmed = name.trim();
  if (!trimmed) return `${territory} customer`;
  const parts = trimmed.split(/\s+/);
  const firstName = parts[0];
  const lastInitial = parts.length > 1 ? `${parts[parts.length - 1][0]}.` : "";
  return `${firstName} ${lastInitial}`.trim();
}

function getVehicleLabel(record: PromiseRecord) {
  const { year, make, model } = record.vehicle;
  return [year || undefined, make, model].filter(Boolean).join(" ");
}

function getPublicProofHeadline(record: PromiseRecord) {
  const proof = record.closeout?.proofCapture;
  const nextVisit = getNextProbableVisit(record);
  if (proof?.promiseThatMatteredMost) {
    return proof.promiseThatMatteredMost;
  }
  if (nextVisit?.service) {
    return `${nextVisit.service} with a clear next step`;
  }
  return `${record.serviceScope} with clear communication`;
}

function getPublicProofQuote(record: PromiseRecord) {
  const proof = record.closeout?.proofCapture;
  if (proof?.customerReliefQuote) {
    return proof.customerReliefQuote;
  }
  if (proof?.proofNotes) {
    return proof.proofNotes;
  }
  if (record.closeout?.customerConditionSummary) {
    return record.closeout.customerConditionSummary;
  }
  return record.closeout?.workPerformedSummary || "Clear communication and follow-through mattered.";
}

export async function getPublicProofSnapshot(): Promise<PublicProofSnapshot> {
  const promises = await getPromiseRecords();
  const completedPromises = promises.filter(
    (record) => record.status === "completed" || record.status === "follow-through-due",
  );

  const stories = completedPromises
    .map((record) => {
      const proof = record.closeout?.proofCapture;
      if (!proof) return null;

      const approvedAssets =
        proof.assets?.filter((asset) => asset.permissionStatus === "customer-approved") || [];

      if (
        approvedAssets.length === 0 ||
        !proof.customerReliefQuote ||
        !proof.promiseThatMatteredMost
      ) {
        return null;
      }

      const nextVisit = getNextProbableVisit(record);

      return {
        promiseId: record.id,
        headline: getPublicProofHeadline(record),
        quote: getPublicProofQuote(record),
        customerLabel: getPublicCustomerLabel(record.customer.name, record.location.territory),
        territoryLabel: record.location.city || record.location.territory,
        vehicleLabel: getVehicleLabel(record),
        serviceLabel: record.serviceScope,
        proofAssetCount: proof.assets.length,
        approvedAssetCount: approvedAssets.length,
        promiseThatMatteredMost: proof.promiseThatMatteredMost,
        bookingReason: proof.bookingReason,
        nextVisitLabel: nextVisit?.service,
      };
    })
    .filter((story): story is NonNullable<typeof story> => story !== null)
    .slice(0, 6);

  return {
    generatedAt: new Date().toISOString(),
    summary: {
      completedVisits: completedPromises.length,
      publicStories: stories.length,
      permissionSafeAssets: completedPromises.reduce(
        (sum, record) => sum + getProofDisciplineForPromise(record).approvedAssets,
        0,
      ),
    },
    stories,
  };
}

function getRecurringAccountReadinessBlockers(account: PromiseRecurringAccount) {
  const blockers: string[] = [];

  if (!account.primaryContactName) blockers.push("Primary contact missing");
  if (!account.targetLane) blockers.push("Target lane not defined");
  if (!account.decisionMakerConfirmed) blockers.push("Approval owner not confirmed");
  if (!account.pricingShared) blockers.push("Pricing not shared yet");
  if (!account.serviceMixDefined) blockers.push("Service mix not defined");
  if (!account.clusterWindowDefined) blockers.push("Clustered service window not defined");
  if (!account.nextTouchDueAt) blockers.push("Next touch date not set");
  if (account.status === "pitched" && !account.proposalSentAt) blockers.push("Proposal date missing");
  if (account.status === "trial-active" && !account.trialReviewDueAt) {
    blockers.push("Trial review date missing");
  }
  if ((account.status === "pitched" || account.status === "trial-active") && !account.proposalValueEstimate) {
    blockers.push("Proposal value estimate missing");
  }
  if (account.blockerSummary) blockers.push(account.blockerSummary);

  return blockers;
}

function getRecurringAccountHealthScore(account: PromiseRecurringAccount) {
  let score = 0;

  if (account.primaryContactName) score += 15;
  if (account.contactEmail || account.contactPhone) score += 10;
  if (account.targetLane) score += 10;
  if (account.decisionMakerConfirmed) score += 15;
  if (account.pricingShared) score += 15;
  if (account.serviceMixDefined) score += 15;
  if (account.clusterWindowDefined) score += 10;
  if (account.nextTouchDueAt) score += 10;
  if (account.monthlyValueEstimate !== undefined) score += 10;
  if (account.proposalSentAt) score += 10;
  if (account.trialReviewDueAt) score += 10;

  if (account.status === "trial-active") score += 10;
  if (account.status === "active") score += 20;
  if (account.status === "at-risk") score -= 15;

  return Math.max(0, Math.min(100, score));
}

function isRecurringAccountReadyToPitch(account: PromiseRecurringAccount) {
  return (
    account.status === "lead" &&
    !!account.accountName &&
    !!account.primaryContactName &&
    !!account.summary &&
    !!account.targetLane
  );
}

function isRecurringAccountReadyToActivate(account: PromiseRecurringAccount) {
  return (
    (account.status === "pitched" || account.status === "trial-active") &&
    !!account.decisionMakerConfirmed &&
    !!account.pricingShared &&
    !!account.serviceMixDefined &&
    !!account.clusterWindowDefined &&
    !!account.proposalSentAt &&
    !!account.proposalValueEstimate
  );
}

function getRecurringAccountProposalStage(account: PromiseRecurringAccount) {
  if (account.status === "trial-active") return "trial-live" as const;
  if (account.status === "active") return "activation-target" as const;
  if (account.trialReviewDueAt) return "review-due" as const;
  if (account.proposalSentAt) return "sent" as const;
  return "not-sent" as const;
}

function getCloseoutGapLabels(record: PromiseRecord) {
  const closeout = record.closeout;
  const proof = getProofDisciplineForPromise(record);

  return [
    !closeout?.workPerformedSummary ? "work-summary" : null,
    !closeout?.customerConditionSummary ? "customer-condition" : null,
    !closeout?.customerRecap?.status || closeout.customerRecap.status === "not-ready"
      ? "customer-recap"
      : null,
    !closeout?.reviewRequest?.status || closeout.reviewRequest.status === "not-ready"
      ? "review-ask"
      : null,
    !closeout?.maintenanceReminder?.status ||
    closeout.maintenanceReminder.status === "not-seeded"
      ? "reminder-seed"
      : null,
    !getNextProbableVisit(record) ? "next-visit" : null,
    proof.proofScore < 70 ? "proof-depth" : null,
    proof.approvedAssets === 0 ? "permission-safe-proof" : null,
  ].filter((entry): entry is string => Boolean(entry));
}

function getCloseoutSeverity(record: PromiseRecord): "critical" | "at-risk" | "repairable" {
  const gaps = getCloseoutGapLabels(record);
  const criticalGaps = new Set([
    "customer-recap",
    "review-ask",
    "next-visit",
    "permission-safe-proof",
  ]);
  const criticalCount = gaps.filter((gap) => criticalGaps.has(gap)).length;

  if (criticalCount >= 2 || gaps.length >= 6) return "critical";
  if (criticalCount >= 1 || gaps.length >= 4) return "at-risk";
  return "repairable";
}

function getWarrantyServiceBucket(serviceScope: string) {
  const normalized = serviceScope.toLowerCase();
  if (normalized.includes("brake")) return "Brake service";
  if (
    normalized.includes("battery") ||
    normalized.includes("no-start") ||
    normalized.includes("charging") ||
    normalized.includes("starter") ||
    normalized.includes("alternator")
  ) {
    return "No-start / electrical";
  }
  if (normalized.includes("diagnostic") || normalized.includes("check engine")) {
    return "Diagnostic";
  }
  if (normalized.includes("oil") || normalized.includes("maintenance")) {
    return "Maintenance";
  }
  if (normalized.includes("inspection")) return "Inspection";
  return "Other";
}

function summarizeCounts(values: string[], fallback: string) {
  const counts = new Map<string, number>();
  for (const value of values) {
    const key = value || fallback;
    counts.set(key, (counts.get(key) || 0) + 1);
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([label, count]) => ({ label, count }));
}

function isRecurringAccountActivationDue(account: PromiseRecurringAccount) {
  return account.status === "trial-active" && Boolean(account.activationTargetAt);
}

function getRecurringAccountNextMilestone(account: PromiseRecurringAccount) {
  if (account.status === "lead") {
    return account.proposalSentAt
      ? "Move from lead to pitched with one clear proposal conversation."
      : "Send the first real proposal and lock the next touch.";
  }

  if (account.status === "pitched") {
    return account.trialStartAt
      ? "Protect the trial launch and set the trial review date."
      : "Convert the proposal into a narrow paid or pilot trial.";
  }

  if (account.status === "trial-active") {
    return account.activationTargetAt
      ? "Use the trial to hit the activation target and move to active cadence."
      : "Set the activation target and make the trial decision explicit.";
  }

  if (account.status === "active") {
    return "Protect the active cadence and expand the account carefully.";
  }

  if (account.status === "at-risk") {
    return "Resolve the blocker and rebuild confidence before the account cools off.";
  }

  return "Keep the next touch visible and move the account forward intentionally.";
}

function getRecurringAccountRecommendedAction(account: PromiseRecurringAccount, overdue: boolean) {
  if (overdue) {
    return "Clear the overdue touch now and either move the account forward or record the real blocker.";
  }

  if (!account.decisionMakerConfirmed) {
    return "Confirm the real approval owner before treating this as a serious account opportunity.";
  }

  if (!account.pricingShared) {
    return "Share the recurring pricing shape and make sure the account knows what the first lane costs.";
  }

  if (!account.serviceMixDefined) {
    return "Define the exact recurring mix: inspections, maintenance, or uptime rescue coverage.";
  }

  if (!account.clusterWindowDefined) {
    return "Lock a believable clustered service window so the account sees how this reduces downtime.";
  }

  if (account.status === "lead") {
    return "Move this lead into a real pitch with a contact, a pain point, and one starter offer.";
  }

  if (account.status === "pitched") {
    if (!account.proposalSentAt) {
      return "Log the real proposal send date and make the next trial decision date visible.";
    }
    return "Convert the pitch into a trial decision with one narrow first visit.";
  }

  if (account.status === "trial-active") {
    if (!account.trialReviewDueAt) {
      return "Set the trial review date now so the account cannot drift without a decision.";
    }
    return "Use the trial results to earn active cadence, card-on-file terms, and a next recurring stop.";
  }

  if (account.status === "at-risk") {
    return "Resolve the current blocker fast and protect the account before the lane goes cold.";
  }

  return "Keep the cadence tight and keep the next touch visible before the account cools off.";
}

export async function getRecurringAccountStarterSnapshot(): Promise<RecurringAccountStarterSnapshot> {
  const [inbound, promises] = await Promise.all([getInboundRecords(), getPromiseRecords()]);
  const trackedPromises = promises.filter(
    (record) => record.recurringAccount && record.recurringAccount.status !== "not-account",
  );
  const worklist = trackedPromises
    .map((record) => {
      const account = record.recurringAccount!;
      const nextTouchAt = account.nextTouchDueAt ? new Date(account.nextTouchDueAt).getTime() : undefined;
      const now = Date.now();
      const overdue = nextTouchAt !== undefined && nextTouchAt < now;
      const daysUntilTouch =
        nextTouchAt !== undefined
          ? Math.ceil((nextTouchAt - now) / (1000 * 60 * 60 * 24))
          : undefined;

      const pressure: "overdue" | "due-now" | "watch" | "healthy" = overdue
        ? "overdue"
        : (daysUntilTouch ?? 99) <= 2
          ? "due-now"
          : account.status === "at-risk"
            ? "watch"
            : "healthy";

      return {
        promiseId: record.id,
        customerName: record.customer.name,
        owner: record.owner,
        territory: record.location.territory,
        status: account.status,
        overdue,
        daysUntilTouch,
        healthScore: getRecurringAccountHealthScore(account),
        pressure,
        readinessBlockers: getRecurringAccountReadinessBlockers(account),
        recommendedAction: getRecurringAccountRecommendedAction(account, overdue),
        lastActivity: account.activityHistory?.[0],
        nextMilestone: getRecurringAccountNextMilestone(account),
        proposalStage: getRecurringAccountProposalStage(account),
        proposalDecision: account.proposalDecision || "open",
        trialOutcome: account.trialOutcome || "unknown",
        recurringAccount: account,
      };
    })
    .sort((a, b) => {
      const pressureRank: Record<"overdue" | "due-now" | "watch" | "healthy", number> = {
        overdue: 0,
        "due-now": 1,
        watch: 2,
        healthy: 3,
      };
      if (pressureRank[a.pressure] !== pressureRank[b.pressure]) {
        return pressureRank[a.pressure] - pressureRank[b.pressure];
      }
      if (a.overdue !== b.overdue) return a.overdue ? -1 : 1;
      if (a.daysUntilTouch !== undefined && b.daysUntilTouch !== undefined) {
        return a.daysUntilTouch - b.daysUntilTouch;
      }
      if (a.daysUntilTouch !== undefined) return -1;
      if (b.daysUntilTouch !== undefined) return 1;
      return a.customerName.localeCompare(b.customerName);
    });

  const candidates = [
    ...inbound
      .filter(
        (record) =>
          record.marketingRole === "hero-b2b" ||
          /fleet|company|contractor|property manager|nonprofit|church/i.test(
            [
              record.requestedService,
              record.symptomSummary,
              record.notes.join(" "),
            ].join(" "),
          ),
      )
      .map((record) => ({
        sourceType: "inbound" as const,
        sourceId: record.id,
        customerName: record.customer.name,
        owner: record.owner,
        lane: record.marketingOffer || record.requestedService,
        territory: record.location.territory,
        whyThisFits:
          "This lead already sounds like multi-vehicle or account-based work instead of one-off consumer-only demand.",
        nextStep: "Reach out with the uptime starter offer and ask about vehicle count, cadence, and approval owner.",
      })),
    ...promises
      .filter((record) =>
        /fleet|company|contractor|property manager|nonprofit|church/i.test(
          [record.serviceScope, record.notes.join(" ")].join(" "),
        ),
      )
      .map((record) => ({
        sourceType: "promise" as const,
        sourceId: record.id,
        customerName: record.customer.name,
        owner: record.owner,
        lane: record.serviceScope,
        territory: record.location.territory,
        whyThisFits:
          "The promise record already hints at recurring, clustered, or account-style work worth turning into a lane.",
        nextStep: "Use the starter script and propose one recurring maintenance or inspection pattern.",
      })),
  ].slice(0, 12);

  const leads = trackedPromises.filter((record) => record.recurringAccount?.status === "lead").length;
  const pitched = trackedPromises.filter((record) => record.recurringAccount?.status === "pitched").length;
  const trialActive = trackedPromises.filter(
    (record) => record.recurringAccount?.status === "trial-active",
  ).length;
  const active = trackedPromises.filter((record) => record.recurringAccount?.status === "active").length;
  const atRisk = trackedPromises.filter((record) => record.recurringAccount?.status === "at-risk").length;
  const proposalDue = trackedPromises.filter(
    (record) =>
      record.recurringAccount?.status === "pitched" &&
      (!record.recurringAccount.proposalSentAt || !record.recurringAccount.proposalValueEstimate),
  ).length;
  const trialReviewDue = trackedPromises.filter(
    (record) =>
      record.recurringAccount?.status === "trial-active" &&
      !record.recurringAccount.trialReviewDueAt,
  ).length;
  const withTouchDate = worklist.filter((item) => item.daysUntilTouch !== undefined).length;
  const onTimeTouches = worklist.filter((item) => !item.overdue && item.daysUntilTouch !== undefined).length;
  const proposalValueInFlight = trackedPromises.reduce((sum, record) => {
    const account = record.recurringAccount;
    if (!account || account.status === "active") return sum;
    return sum + (account.proposalValueEstimate || account.monthlyValueEstimate || 0);
  }, 0);
  const proposalsWon = trackedPromises.filter(
    (record) => record.recurringAccount?.proposalDecision === "won",
  ).length;
  const proposalsLost = trackedPromises.filter(
    (record) => record.recurringAccount?.proposalDecision === "lost",
  ).length;
  const proposalsStalled = trackedPromises.filter(
    (record) => record.recurringAccount?.proposalDecision === "stalled",
  ).length;
  const successfulTrials = trackedPromises.filter(
    (record) => record.recurringAccount?.trialOutcome === "successful",
  ).length;
  const failedTrials = trackedPromises.filter(
    (record) => record.recurringAccount?.trialOutcome === "failed",
  ).length;
  const extendedTrials = trackedPromises.filter(
    (record) => record.recurringAccount?.trialOutcome === "extended",
  ).length;
  const activationValueInFlight = trackedPromises.reduce((sum, record) => {
    const account = record.recurringAccount;
    if (!account || !isRecurringAccountActivationDue(account)) return sum;
    return sum + (account.proposalValueEstimate || account.monthlyValueEstimate || 0);
  }, 0);
  const conversionBoard = [
    {
      stage: "needs-proposal" as const,
      label: "Needs proposal",
      count: worklist.filter((item) => item.proposalStage === "not-sent").length,
      estimatedMonthlyValue: worklist
        .filter((item) => item.proposalStage === "not-sent")
        .reduce(
          (sum, item) =>
            sum +
            (item.recurringAccount.proposalValueEstimate ||
              item.recurringAccount.monthlyValueEstimate ||
              0),
          0,
        ),
      detail: "Accounts that still need a real recurring proposal sent and logged.",
    },
    {
      stage: "proposal-sent" as const,
      label: "Proposal sent",
      count: worklist.filter(
        (item) => item.proposalStage === "sent" || item.proposalStage === "review-due",
      ).length,
      estimatedMonthlyValue: worklist
        .filter((item) => item.proposalStage === "sent" || item.proposalStage === "review-due")
        .reduce(
          (sum, item) =>
            sum +
            (item.recurringAccount.proposalValueEstimate ||
              item.recurringAccount.monthlyValueEstimate ||
              0),
          0,
        ),
      detail: "Proposal is live, but the trial decision still needs to be forced into the open.",
    },
    {
      stage: "trial-live" as const,
      label: "Trial live",
      count: worklist.filter((item) => item.proposalStage === "trial-live").length,
      estimatedMonthlyValue: worklist
        .filter((item) => item.proposalStage === "trial-live")
        .reduce(
          (sum, item) =>
            sum +
            (item.recurringAccount.proposalValueEstimate ||
              item.recurringAccount.monthlyValueEstimate ||
              0),
          0,
        ),
      detail: "Trials in motion that still need review dates, evidence, and a clean activation decision.",
    },
    {
      stage: "activation-due" as const,
      label: "Activation due",
      count: trackedPromises.filter(
        (record) => record.recurringAccount && isRecurringAccountActivationDue(record.recurringAccount),
      ).length,
      estimatedMonthlyValue: activationValueInFlight,
      detail: "Trials with an activation target that should not drift without a yes-or-no decision.",
    },
    {
      stage: "active-protection" as const,
      label: "Active protection",
      count: trackedPromises.filter((record) => record.recurringAccount?.status === "active").length,
      estimatedMonthlyValue: trackedPromises.reduce(
        (sum, record) =>
          sum +
          (record.recurringAccount?.status === "active"
            ? record.recurringAccount?.monthlyValueEstimate || 0
            : 0),
        0,
      ),
      detail: "Active accounts that now need retention, cadence discipline, and careful expansion.",
    },
  ];
  const ownerTargets = (["Dez", "Simon", "Unassigned"] as const)
    .map((owner) => {
      const owned = worklist.filter((item) => item.owner === owner);
      const activationDue = owned.filter((item) =>
        item.recurringAccount ? isRecurringAccountActivationDue(item.recurringAccount) : false,
      ).length;
      const activeCount = owned.filter((item) => item.status === "active").length;
      const estimatedMonthlyValue = owned.reduce(
        (sum, item) => sum + (item.recurringAccount.monthlyValueEstimate || 0),
        0,
      );

      let weeklyTarget = "No tracked account work assigned yet.";
      if (owner === "Dez") {
        weeklyTarget =
          activationDue > 0
            ? "Push one live trial into an activation decision this week."
            : owned.some((item) => item.proposalStage === "not-sent" || item.proposalStage === "sent")
              ? "Get one proposal into the field and attach a firm next decision date."
              : activeCount > 0
                ? "Protect the active accounts and tighten the next clustered stop."
                : "Identify one believable account lane and move it into a tracked pitch.";
      } else if (owner === "Simon") {
        weeklyTarget =
          activationDue > 0
            ? "Run the trial review with a real yes-or-no activation recommendation."
            : owned.some((item) => item.overdue)
              ? "Clear the overdue account touches and document the blocker honestly."
              : activeCount > 0
                ? "Protect service quality on active accounts so the lane compounds."
                : "Support the next proposal with cleaner operations proof and route discipline.";
      }

      return {
        owner,
        tracked: owned.length,
        overdue: owned.filter((item) => item.overdue).length,
        proposalDue: owned.filter(
          (item) => item.proposalStage === "not-sent" || item.proposalStage === "sent",
        ).length,
        activationDue,
        active: activeCount,
        estimatedMonthlyValue,
        weeklyTarget,
      };
    })
    .filter((item) => item.tracked > 0 || item.owner !== "Unassigned");

  return {
    generatedAt: new Date().toISOString(),
    summary: {
      tracked: trackedPromises.length,
      leads,
      pitched,
      dueNow: worklist.filter((item) => (item.daysUntilTouch ?? 99) <= 2).length,
      overdue: worklist.filter((item) => item.overdue).length,
      trialActive,
      active,
      atRisk,
      readyToPitch: trackedPromises.filter((record) =>
        record.recurringAccount ? isRecurringAccountReadyToPitch(record.recurringAccount) : false,
      ).length,
      readyToActivate: trackedPromises.filter((record) =>
        record.recurringAccount
          ? isRecurringAccountReadyToActivate(record.recurringAccount)
          : false,
      ).length,
      proposalDue,
      trialReviewDue,
      totalVehicles: trackedPromises.reduce(
        (sum, record) => sum + (record.recurringAccount?.vehicleCount || 0),
        0,
      ),
      totalMonthlyValueEstimate: trackedPromises.reduce(
        (sum, record) => sum + (record.recurringAccount?.monthlyValueEstimate || 0),
        0,
      ),
      activeMonthlyValueEstimate: trackedPromises.reduce(
        (sum, record) =>
          sum +
          (record.recurringAccount?.status === "active"
            ? record.recurringAccount?.monthlyValueEstimate || 0
            : 0),
        0,
      ),
      touchDisciplineRate: withTouchDate > 0 ? onTimeTouches / withTouchDate : 0,
      trialConversionRate: trialActive + active > 0 ? active / (trialActive + active) : 0,
      proposalValueInFlight,
      activationValueInFlight,
      proposalsWon,
      proposalsLost,
      proposalsStalled,
      successfulTrials,
      failedTrials,
      extendedTrials,
    },
    starterOffer: recurringAccountStarterOffer,
    outreachScripts: recurringAccountOutreachScripts,
    candidates,
    weeklyPlan: {
      headline:
        active > 0
          ? "Protect active accounts, move one trial forward, and keep the next touch honest."
          : "Move one pitched account into trial and keep overdue touches from rotting the lane.",
      focusAreas: [
        "Confirm the approval owner and one believable recurring pain point.",
        "Share simple recurring pricing and cluster-window logic instead of vague fleet language.",
        "Turn one account into the next real trial or active cadence win.",
      ],
      targets: [
        `${worklist.filter((item) => item.overdue).length} overdue account touch${
          worklist.filter((item) => item.overdue).length === 1 ? "" : "es"
        } to clear`,
        `${pitched} pitched account${pitched === 1 ? "" : "s"} ready to move toward trial`,
        `${active} active recurring account${active === 1 ? "" : "s"} worth protecting this week`,
        `${proposalDue} proposal${proposalDue === 1 ? "" : "s"} still missing send date or value`,
        `${trialReviewDue} trial review${trialReviewDue === 1 ? "" : "s"} still missing a decision date`,
        `${trackedPromises.filter((record) =>
          record.recurringAccount
            ? isRecurringAccountReadyToPitch(record.recurringAccount)
            : false,
        ).length} lead${trackedPromises.filter((record) =>
          record.recurringAccount
            ? isRecurringAccountReadyToPitch(record.recurringAccount)
            : false,
        ).length === 1 ? "" : "s"} ready for a real pitch`,
      ],
    },
    conversionBoard,
    ownerTargets,
    worklist,
  };
}

export async function getFieldExecutionSnapshot(): Promise<FieldExecutionSnapshot> {
  const promises = await getPromiseRecords();
  const tasks = promises
    .filter((record) => record.status !== "completed")
    .map((record) => {
      const completeness = getExecutionPacketCompleteness(record);
      const taskPriority: "high" | "medium" | "low" =
        completeness.closeoutNotReady ||
        completeness.missingComebackPrevention ||
        completeness.missingHandoffChecklist
          ? "high"
          : completeness.missingInspectionChecklist ||
              completeness.missingPartsChecklist ||
              completeness.missingPhotosChecklist
            ? "medium"
            : "low";

      return {
        promiseId: record.id,
        customerName: record.customer.name,
        owner: record.owner,
        territory: record.location.territory,
        serviceScope: record.serviceScope,
        scheduledWindowLabel: record.scheduledWindow.label,
        jobStage: record.jobStage,
        fieldExecution: record.fieldExecution,
        ...completeness,
        taskPriority,
        nextStep:
          completeness.closeoutNotReady
            ? "Finish the closeout summary before this completed visit goes cold."
            : completeness.missingComebackPrevention || completeness.missingHandoffChecklist
              ? "Add the handoff and comeback-prevention steps before this visit gets tighter."
              : completeness.missingPartsChecklist ||
                  completeness.missingPhotosChecklist ||
                  completeness.missingInspectionChecklist
                ? "Finish the execution packet before the visit gets tighter."
            : "Packet is usable. Keep stage and readiness current through the visit.",
      };
    })
    .sort((a, b) => {
      const priorityRank: Record<"high" | "medium" | "low", number> = {
        high: 0,
        medium: 1,
        low: 2,
      };
      const rankGap = priorityRank[a.taskPriority] - priorityRank[b.taskPriority];
      if (rankGap !== 0) return rankGap;
      return a.customerName.localeCompare(b.customerName);
    });

  return {
    generatedAt: new Date().toISOString(),
    total: tasks.length,
    needsPacket: tasks.filter(
      (task) =>
        task.missingInspectionChecklist ||
        task.missingPartsChecklist ||
        task.missingPhotosChecklist ||
        task.missingHandoffChecklist,
    ).length,
    packetReady: tasks.filter((task) => task.completionScore >= 80).length,
    confirmedToday: tasks.filter((task) => task.jobStage === "confirmed").length,
    onSiteNow: tasks.filter(
      (task) => task.jobStage === "on-site" || task.jobStage === "en-route",
    ).length,
    comebackPreventionWeak: tasks.filter((task) => task.missingComebackPrevention).length,
    closeoutAtRisk: tasks.filter((task) => task.closeoutNotReady).length,
    tasks,
  };
}

export async function getCollectionSnapshot(): Promise<CollectionSnapshot> {
  const promises = await getPromiseRecords();
  const tasks = promises
    .filter(
      (record) =>
        record.paymentCollection &&
        record.paymentCollection.status !== "paid" &&
        record.paymentCollection.status !== "not-requested",
    )
    .map((record) => ({
      promiseId: record.id,
      customerName: record.customer.name,
      owner: record.owner,
      territory: record.location.territory,
      serviceScope: record.serviceScope,
      status: record.paymentCollection?.status || "not-requested",
      method: record.paymentCollection?.method,
      amountCollected: record.paymentCollection?.amountCollected,
      balanceDueAmount: record.paymentCollection?.balanceDueAmount,
      depositRequestedAmount: record.paymentCollection?.depositRequestedAmount,
      invoiceReference: record.paymentCollection?.invoiceReference,
      writeOffReason: record.paymentCollection?.writeOffReason,
      balanceCheckoutReady:
        (record.paymentCollection?.status === "partial" ||
          record.paymentCollection?.status === "awaiting-payment") &&
        (record.paymentCollection?.balanceDueAmount || 0) > 0,
      collectionPriority: (
        record.paymentCollection?.status === "written-off"
          ? "low"
          : (record.paymentCollection?.balanceDueAmount || 0) >= 150
            ? "high"
            : record.paymentCollection?.status === "awaiting-payment"
              ? "medium"
              : "low"
      ) as "high" | "medium" | "low",
      nextStep:
        record.paymentCollection?.status === "deposit-requested"
          ? "Confirm the deposit landed before treating the promise as secure."
          : record.paymentCollection?.status === "partial"
            ? "Collect the remaining balance and record the final method."
            : record.paymentCollection?.status === "written-off"
              ? "Review why value leaked and whether this should reopen as an issue."
            : "Collect payment and lock the job as truly complete.",
    }))
    .sort((a, b) => {
      const priorityRank: Record<"high" | "medium" | "low", number> = {
        high: 0,
        medium: 1,
        low: 2,
      };
      const rankGap = priorityRank[a.collectionPriority] - priorityRank[b.collectionPriority];
      if (rankGap !== 0) return rankGap;
      return (b.balanceDueAmount || 0) - (a.balanceDueAmount || 0);
    });

  return {
    generatedAt: new Date().toISOString(),
    totalOpen: tasks.length,
    awaitingPayment: tasks.filter((task) => task.status === "awaiting-payment").length,
    partial: tasks.filter((task) => task.status === "partial").length,
    paid: promises.filter((record) => record.paymentCollection?.status === "paid").length,
    writtenOff: tasks.filter((task) => task.status === "written-off").length,
    totalBalanceOpen: tasks.reduce((sum, task) => sum + (task.balanceDueAmount || 0), 0),
    readyForBalanceCheckout: tasks.filter((task) => task.balanceCheckoutReady).length,
    tasks,
  };
}

export async function getWarrantySnapshot(): Promise<WarrantySnapshot> {
  const promises = await getPromiseRecords();
  const now = Date.now();
  const tasks = promises
    .filter(
      (record) =>
        record.warrantyCase &&
        record.warrantyCase.status !== "none" &&
        record.warrantyCase.status !== "resolved",
    )
    .map((record) => {
      const callbackDueAt = record.warrantyCase?.callbackDueAt;
      const overdue = callbackDueAt ? new Date(callbackDueAt).getTime() < now : false;
      const makeGoodPlanMissing = !record.warrantyCase?.makeGoodPlan;
      const preventionMissing = !record.warrantyCase?.preventionStep;
      const serviceBucket = getWarrantyServiceBucket(record.serviceScope);

      return {
        promiseId: record.id,
        customerName: record.customer.name,
        owner: record.owner,
        territory: record.location.territory,
        serviceScope: record.serviceScope,
        serviceBucket,
        status: record.warrantyCase?.status || "none",
        severity: record.warrantyCase?.severity,
        rootCause: record.warrantyCase?.rootCause,
        issueSummary: record.warrantyCase?.issueSummary,
        callbackDueAt,
        overdue,
        makeGoodPlanMissing,
        preventionMissing,
        warrantyCase: record.warrantyCase,
        nextStep:
          overdue
            ? "This callback is overdue. Own the make-good plan now before trust damage compounds."
            : makeGoodPlanMissing
              ? "Define the make-good plan clearly so the customer and the team know the recovery path."
              : preventionMissing
                ? "Record the prevention step so this issue teaches the system something."
                : record.warrantyCase?.status === "open"
                  ? "Own the callback plan before trust leakage becomes a public problem."
                  : "Monitor and close the loop with the customer before this becomes a comeback.",
      };
    })
    .sort((a, b) => {
      if (a.overdue !== b.overdue) return a.overdue ? -1 : 1;
      return (
        new Date(a.callbackDueAt || "9999-12-31").getTime() -
        new Date(b.callbackDueAt || "9999-12-31").getTime()
      );
    });

  const warrantyTracked = promises.filter(
    (record) => record.warrantyCase && record.warrantyCase.status !== "none",
  );

  return {
    generatedAt: new Date().toISOString(),
    open: tasks.filter((task) => task.status === "open").length,
    monitoring: tasks.filter((task) => task.status === "monitoring").length,
    resolved: promises.filter((record) => record.warrantyCase?.status === "resolved").length,
    overdue: tasks.filter((task) => task.overdue).length,
    trustRisk: tasks.filter((task) => task.severity === "trust-risk").length,
    downUnit: tasks.filter((task) => task.severity === "down-unit").length,
    preventionMissing: tasks.filter((task) => task.preventionMissing).length,
    patterns: {
      byRootCause: summarizeCounts(
        warrantyTracked.map((record) => record.warrantyCase?.rootCause || "unknown"),
        "unknown",
      ),
      byServiceBucket: summarizeCounts(
        warrantyTracked.map((record) => getWarrantyServiceBucket(record.serviceScope)),
        "Other",
      ),
      bySeverity: summarizeCounts(
        warrantyTracked.map((record) => record.warrantyCase?.severity || "watch"),
        "watch",
      ),
    },
    tasks,
  };
}
