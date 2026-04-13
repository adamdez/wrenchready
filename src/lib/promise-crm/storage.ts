import {
  extractPromiseCloseout,
  getNextProbableVisit,
  hasDeferredWorkCaptured,
  mergePromiseCloseout,
  mergePromiseNotesWithCloseout,
} from "@/lib/promise-crm/closeout-recapture";
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
  computeReadinessScore,
  extractPromiseReadinessState,
  getDefaultCustomerCertainty,
  getDefaultDayReadiness,
  getPromiseReadinessBlockers,
  mergePromiseNotesWithReadinessState,
  normalizePromiseCustomerCertainty,
  normalizePromiseDayReadiness,
} from "@/lib/promise-crm/promise-readiness";
import { evaluateIntake, type IntakeEvaluation } from "@/lib/promise-crm/intake";
import { inboundRecords, promiseRecords } from "@/lib/promise-crm/mock-data";
import { hasPromiseCrmSupabase, supabaseRestRequest } from "@/lib/promise-crm/supabase";
import type {
  FollowThroughSummary,
  FollowThroughTask,
  InboundRecord,
  MarketingOfferPerformance,
  OwnerDailyPriority,
  OwnerExecutionMetrics,
  OwnerExecutionSnapshot,
  PromiseBoardMetrics,
  PromiseCloseout,
  CloseoutRecaptureSnapshot,
  PromiseCustomerCertainty,
  PromiseCustomerApproval,
  PromiseDayReadiness,
  PromiseEconomicsRollup,
  PromiseEconomicsSnapshot,
  PromiseRecord,
  TomorrowReadinessSnapshot,
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
  serviceScope?: string;
  scheduledWindowLabel?: string;
  readinessSummary?: string;
  nextAction?: string;
  topRisks?: string[];
  noteToAdd?: string;
  economics?: PromiseEconomicsSnapshot | null;
  commercialOutcome?: PromiseRecord["commercialOutcome"] | null;
  closeout?: PromiseCloseout | null;
  followThroughDueAt?: string | null;
  followThroughResolution?: PromiseRecord["followThroughResolution"] | null;
  customerApproval?: PromiseCustomerApproval | null;
  customerCertainty?: PromiseCustomerCertainty | null;
  dayReadiness?: PromiseDayReadiness | null;
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
    updated,
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
  const { followThroughHistory, followThroughResolution, visibleNotes } =
    extractFollowThroughResolution(notesWithoutOutcome);
  const { closeout, visibleNotes: notesWithoutCloseout } = extractPromiseCloseout(visibleNotes);
  const {
    customerAccess,
    customerApproval,
    visibleNotes: visibleNotesWithoutCustomerState,
  } = extractPromiseCustomerState(notesWithoutCloseout, row.id);
  const {
    customerCertainty,
    dayReadiness,
    visibleNotes: visibleNotesWithoutReadinessState,
  } = extractPromiseReadinessState(visibleNotesWithoutCustomerState);
  return {
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
    customerCertainty,
    dayReadiness,
    customerAccess,
    customerApproval,
    economics,
    commercialOutcome,
    closeout,
    followThroughDueAt: row.follow_through_due_at || undefined,
    followThroughResolution,
    followThroughHistory,
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
    return sortNewestFirst(uniqueById([...getRuntimeState().promises, ...promiseRecords]));
  }

  try {
    return await listSupabasePromiseRecords();
  } catch {
    return sortNewestFirst(uniqueById([...getRuntimeState().promises, ...promiseRecords]));
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
  const outcome = promise.commercialOutcome;
  const closeout = promise.closeout;
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

  if (promise.status === "completed" && !closeout) {
    candidates.push({
      reason: "open-follow-through",
      summary:
        "Visit is completed, but the structured closeout is still missing. Recap, deferred work, review ask, and reminder seed still need to be captured.",
      recommendedAction:
        "Finish the closeout so this completed job turns into a review signal and the next probable visit.",
    });
  } else if (promise.status === "completed" && closeout && hasDeferredWorkCaptured(closeout)) {
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

  if (promise.status === "follow-through-due" || dueAt) {
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

  const nextCandidate = candidates.find(
    (candidate) =>
      !isFollowThroughReasonResolved(promise.followThroughHistory, candidate.reason),
  );

  if (!nextCandidate) return null;

  const { reason, summary, recommendedAction } = nextCandidate;

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
      ...mergePromiseNotesWithReadinessState(
        mergePromiseNotesWithCustomerState(
          ["Promoted from inbound record.", ...inbound.notes],
          customerAccess,
        ),
        getDefaultCustomerCertainty(),
        getDefaultDayReadiness(),
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
  const nextCustomerCertainty =
    updates.customerCertainty === undefined
      ? current.customerCertainty
      : normalizePromiseCustomerCertainty(updates.customerCertainty);
  const nextDayReadiness =
    updates.dayReadiness === undefined
      ? current.dayReadiness
      : normalizePromiseDayReadiness(updates.dayReadiness);

  const patch = {
    owner: updates.owner ?? current.owner,
    readiness_risk: updates.readinessRisk ?? current.readinessRisk,
    status: updates.status ?? current.status,
    service_scope: updates.serviceScope ?? current.serviceScope,
    scheduled_window_label:
      updates.scheduledWindowLabel ?? current.scheduledWindow.label,
    readiness_summary: updates.readinessSummary ?? current.readinessSummary,
    next_action: updates.nextAction ?? current.nextAction,
    top_risks: updates.topRisks ?? current.topRisks,
    notes: mergePromiseNotesWithReadinessState(
      mergePromiseNotesWithCustomerState(
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
        current.customerAccess,
        nextCustomerApproval,
      ),
      nextCustomerCertainty,
      nextDayReadiness,
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
          extractPromiseCloseout(
            extractFollowThroughResolution(
              extractCommercialOutcome(extractPromiseEconomics(patch.notes).visibleNotes).visibleNotes,
            ).visibleNotes,
          ).visibleNotes,
          current.id,
        ).visibleNotes,
      ).visibleNotes,
      customerCertainty: nextCustomerCertainty,
      dayReadiness: nextDayReadiness,
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
          extractPromiseCloseout(
            extractFollowThroughResolution(
              extractCommercialOutcome(extractPromiseEconomics(patch.notes).visibleNotes).visibleNotes,
            ).visibleNotes,
          ).visibleNotes,
          current.id,
        ).visibleNotes,
      ).visibleNotes,
      customerCertainty: nextCustomerCertainty,
      dayReadiness: nextDayReadiness,
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

  return completedPromises.reduce<CloseoutRecaptureSnapshot>(
    (summary, record) => {
      const closeout = record.closeout;

      summary.completedPromises += 1;
      if (closeout) summary.closeoutCompleted += 1;
      if (closeout?.reviewRequest?.status === "ready") summary.reviewReady += 1;
      if (closeout?.reviewRequest?.status === "sent") summary.reviewSent += 1;
      if (closeout?.reviewRequest?.status === "completed") summary.reviewCompleted += 1;
      if (closeout?.maintenanceReminder?.status === "seeded") summary.reminderSeeded += 1;
      if (closeout?.maintenanceReminder?.status === "scheduled") summary.reminderScheduled += 1;
      if (getNextProbableVisit(record)) summary.nextProbableVisitCaptured += 1;
      summary.nowItems += closeout?.now.length || 0;
      summary.soonItems += closeout?.soon.length || 0;
      summary.monitorItems += closeout?.monitor.length || 0;
      summary.deferredValueOpen += record.commercialOutcome?.deferredValueAmount || 0;
      return summary;
    },
    {
      completedPromises: 0,
      closeoutCompleted: 0,
      reviewReady: 0,
      reviewSent: 0,
      reviewCompleted: 0,
      reminderSeeded: 0,
      reminderScheduled: 0,
      nextProbableVisitCaptured: 0,
      nowItems: 0,
      soonItems: 0,
      monitorItems: 0,
      deferredValueOpen: 0,
    },
  );
}
