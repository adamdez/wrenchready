import { resolveServicePolicy } from "@/lib/promise-crm/service-policy";
import type {
  AcceptancePolicy,
  DispatchTier,
  MarketingRole,
  PromiseFit,
  ReadinessRisk,
  ServiceClass,
} from "@/lib/promise-crm/types";

type IntakePayload = {
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

export type IntakeEvaluation = {
  normalizedService: string;
  serviceLane: string;
  territory: string;
  readinessRisk: ReadinessRisk;
  promiseFit: PromiseFit;
  marketingOffer: string;
  marketingRole: MarketingRole;
  dispatchTier: DispatchTier;
  followOnPath: string[];
  serviceClass: ServiceClass;
  acceptancePolicy: AcceptancePolicy;
  pricingGuardrails: string[];
  nextAction: string;
};

function normalizeText(value: string) {
  return value.trim().toLowerCase();
}

function inferService(serviceNeeded: string, notes: string) {
  const haystack = `${serviceNeeded} ${notes}`.toLowerCase();

  if (
    haystack.includes("no-start") ||
    haystack.includes("wont start") ||
    haystack.includes("won't start") ||
    haystack.includes("dead battery") ||
    haystack.includes("battery")
  ) {
    return {
      normalizedService: "battery-no-start",
      serviceLane: "No-start / battery / charging",
    };
  }

  if (haystack.includes("brake")) {
    return {
      normalizedService: "brake-service",
      serviceLane: "Brake service",
    };
  }

  if (
    haystack.includes("check engine") ||
    haystack.includes("diagnostic") ||
    haystack.includes("engine light")
  ) {
    return {
      normalizedService: "paid-diagnostic",
      serviceLane: "Check-engine / diagnostic evaluation",
    };
  }

  if (haystack.includes("inspection") || haystack.includes("pre-purchase")) {
    return {
      normalizedService: "inspection",
      serviceLane: "Inspection",
    };
  }

  if (haystack.includes("oil")) {
    return {
      normalizedService: "oil-change",
      serviceLane: "Maintenance / retention",
    };
  }

  return {
    normalizedService: "unknown",
    serviceLane: "Needs human screening",
  };
}

function inferTerritory(address: string) {
  const normalizedAddress = normalizeText(address);

  if (normalizedAddress.includes("liberty lake")) return "Liberty Lake";
  if (normalizedAddress.includes("valley")) return "Spokane Valley";
  if (normalizedAddress.includes("south hill")) return "South Hill";
  if (normalizedAddress.includes("spokane")) return "Spokane";

  return "Needs territory check";
}

function inferReadinessRisk(payload: IntakePayload, normalizedService: string): ReadinessRisk {
  const haystack = `${payload.serviceNeeded} ${payload.notes} ${payload.address}`.toLowerCase();

  if (
    normalizedService === "unknown" ||
    haystack.includes("apartment") ||
    haystack.includes("street parking") ||
    haystack.includes("garage") ||
    haystack.includes("steep") ||
    haystack.includes("downtown")
  ) {
    return "high";
  }

  if (
    normalizedService === "paid-diagnostic" ||
    haystack.includes("not sure") ||
    haystack.includes("grinding") ||
    haystack.includes("click")
  ) {
    return "medium";
  }

  return "low";
}

export function evaluateIntake(payload: IntakePayload): IntakeEvaluation {
  const service = inferService(payload.serviceNeeded, payload.notes);
  const territory = inferTerritory(payload.address);
  const readinessRisk = inferReadinessRisk(payload, service.normalizedService);
  const policy = resolveServicePolicy(service.normalizedService, service.serviceLane);

  if (readinessRisk === "high") {
    return {
      ...service,
      territory,
      readinessRisk,
      promiseFit: "review",
      ...policy,
      nextAction: "Human screening required before any arrival window is promised. Protect the route and confirm this fits the rate card before dispatch.",
    };
  }

  if (readinessRisk === "medium") {
    return {
      ...service,
      territory,
      readinessRisk,
      promiseFit: "conditional",
      ...policy,
      nextAction: "Confirm fit, worksite, and service scope before turning this into a promise. Do not loosen pricing guardrails to win the lead.",
    };
  }

  return {
    ...service,
    territory,
    readinessRisk,
    promiseFit: "strong",
    ...policy,
    nextAction: "Good mobile fit. Confirm window, owner, and pricing guardrails, then move to promise.",
  };
}

export function buildOpsWebhookMessage(payload: IntakePayload, evaluation: IntakeEvaluation) {
  return [
    `**New WrenchReady Intake**`,
    `Name: ${payload.fullName || "Not provided"}`,
    `Phone: ${payload.phone || "Not provided"}`,
    `Email: ${payload.email || "Not provided"}`,
    `Vehicle: ${payload.vehicle}`,
    `Requested service: ${payload.serviceNeeded || "Not specified"}`,
    `Service lane: ${evaluation.serviceLane}`,
    `Marketing offer: ${evaluation.marketingOffer}`,
    `Marketing role: ${evaluation.marketingRole}`,
    `Dispatch tier: ${evaluation.dispatchTier}`,
    `Territory: ${evaluation.territory}`,
    `Readiness risk: ${evaluation.readinessRisk}`,
    `Promise fit: ${evaluation.promiseFit}`,
    `Follow-on path: ${evaluation.followOnPath.join(", ")}`,
    `Timing: ${payload.timing || "Not specified"}`,
    `Address: ${payload.address || "Not provided"}`,
    payload.notes ? `Notes: ${payload.notes}` : "",
    `Next action: ${evaluation.nextAction}`,
  ]
    .filter(Boolean)
    .join("\n");
}
