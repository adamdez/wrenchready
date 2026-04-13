import type {
  PromiseCustomerCertainty,
  PromiseDayReadiness,
} from "@/lib/promise-crm/types";

const CUSTOMER_CERTAINTY_PREFIX = "__certainty::";
const DAY_READINESS_PREFIX = "__dayreadiness::";

function normalizeBoolean(value: unknown) {
  return value === true;
}

export function getDefaultCustomerCertainty(): PromiseCustomerCertainty {
  return {
    contactConfirmed: false,
    arrivalWindowShared: false,
    pricingExpectationShared: false,
    updatesPlanShared: false,
    followUpExplained: false,
  };
}

export function getDefaultDayReadiness(): PromiseDayReadiness {
  return {
    customerConfirmed: false,
    locationConfirmed: false,
    partsConfirmed: false,
    toolsConfirmed: false,
    routeLocked: false,
    paymentMethodReady: false,
  };
}

export function normalizePromiseCustomerCertainty(
  value?: Partial<PromiseCustomerCertainty> | null,
): PromiseCustomerCertainty {
  const defaults = getDefaultCustomerCertainty();

  if (!value || typeof value !== "object") {
    return defaults;
  }

  return {
    contactConfirmed: normalizeBoolean(value.contactConfirmed),
    arrivalWindowShared: normalizeBoolean(value.arrivalWindowShared),
    pricingExpectationShared: normalizeBoolean(value.pricingExpectationShared),
    updatesPlanShared: normalizeBoolean(value.updatesPlanShared),
    followUpExplained: normalizeBoolean(value.followUpExplained),
  };
}

export function normalizePromiseDayReadiness(
  value?: Partial<PromiseDayReadiness> | null,
): PromiseDayReadiness {
  const defaults = getDefaultDayReadiness();

  if (!value || typeof value !== "object") {
    return defaults;
  }

  return {
    customerConfirmed: normalizeBoolean(value.customerConfirmed),
    locationConfirmed: normalizeBoolean(value.locationConfirmed),
    partsConfirmed: normalizeBoolean(value.partsConfirmed),
    toolsConfirmed: normalizeBoolean(value.toolsConfirmed),
    routeLocked: normalizeBoolean(value.routeLocked),
    paymentMethodReady: normalizeBoolean(value.paymentMethodReady),
  };
}

export function encodePromiseCustomerCertainty(value: PromiseCustomerCertainty) {
  return `${CUSTOMER_CERTAINTY_PREFIX}${JSON.stringify(value)}`;
}

export function encodePromiseDayReadiness(value: PromiseDayReadiness) {
  return `${DAY_READINESS_PREFIX}${JSON.stringify(value)}`;
}

export function extractPromiseReadinessState(notes: string[]) {
  let customerCertainty = getDefaultCustomerCertainty();
  let dayReadiness = getDefaultDayReadiness();
  const visibleNotes: string[] = [];

  for (const note of notes) {
    if (note.startsWith(CUSTOMER_CERTAINTY_PREFIX)) {
      try {
        const parsed = JSON.parse(note.slice(CUSTOMER_CERTAINTY_PREFIX.length));
        customerCertainty = normalizePromiseCustomerCertainty(parsed);
      } catch {
        customerCertainty = getDefaultCustomerCertainty();
      }
      continue;
    }

    if (note.startsWith(DAY_READINESS_PREFIX)) {
      try {
        const parsed = JSON.parse(note.slice(DAY_READINESS_PREFIX.length));
        dayReadiness = normalizePromiseDayReadiness(parsed);
      } catch {
        dayReadiness = getDefaultDayReadiness();
      }
      continue;
    }

    visibleNotes.push(note);
  }

  return {
    customerCertainty,
    dayReadiness,
    visibleNotes,
  };
}

export function mergePromiseNotesWithReadinessState(
  visibleNotes: string[],
  customerCertainty: PromiseCustomerCertainty,
  dayReadiness: PromiseDayReadiness,
) {
  const cleanedNotes = visibleNotes.filter(
    (note) =>
      !note.startsWith(CUSTOMER_CERTAINTY_PREFIX) &&
      !note.startsWith(DAY_READINESS_PREFIX),
  );

  return [
    ...cleanedNotes,
    encodePromiseCustomerCertainty(customerCertainty),
    encodePromiseDayReadiness(dayReadiness),
  ];
}

export function computeReadinessScore(
  customerCertainty: PromiseCustomerCertainty,
  dayReadiness: PromiseDayReadiness,
) {
  const values = [
    customerCertainty.contactConfirmed,
    customerCertainty.arrivalWindowShared,
    customerCertainty.pricingExpectationShared,
    customerCertainty.updatesPlanShared,
    customerCertainty.followUpExplained,
    dayReadiness.customerConfirmed,
    dayReadiness.locationConfirmed,
    dayReadiness.partsConfirmed,
    dayReadiness.toolsConfirmed,
    dayReadiness.routeLocked,
    dayReadiness.paymentMethodReady,
  ];

  const completed = values.filter(Boolean).length;
  return Math.round((completed / values.length) * 100);
}

export function getPromiseReadinessBlockers(
  customerCertainty: PromiseCustomerCertainty,
  dayReadiness: PromiseDayReadiness,
) {
  const blockers: string[] = [];

  if (!customerCertainty.contactConfirmed) blockers.push("Customer contact not confirmed");
  if (!customerCertainty.arrivalWindowShared) blockers.push("Arrival window not shared clearly");
  if (!customerCertainty.pricingExpectationShared) blockers.push("Pricing expectation not shared");
  if (!customerCertainty.updatesPlanShared) blockers.push("Update plan not explained");
  if (!customerCertainty.followUpExplained) blockers.push("Follow-up expectation not explained");
  if (!dayReadiness.customerConfirmed) blockers.push("Customer not confirmed for the visit");
  if (!dayReadiness.locationConfirmed) blockers.push("Parking or location details not confirmed");
  if (!dayReadiness.partsConfirmed) blockers.push("Parts not confirmed");
  if (!dayReadiness.toolsConfirmed) blockers.push("Tools or equipment not confirmed");
  if (!dayReadiness.routeLocked) blockers.push("Route timing not locked");
  if (!dayReadiness.paymentMethodReady) blockers.push("Payment method or collection path not ready");

  return blockers;
}
