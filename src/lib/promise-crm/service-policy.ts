import type {
  AcceptancePolicy,
  DispatchTier,
  MarketingRole,
  ServiceClass,
} from "@/lib/promise-crm/types";

export type ServicePolicy = {
  marketingOffer: string;
  marketingRole: MarketingRole;
  dispatchTier: DispatchTier;
  followOnPath: string[];
  serviceClass: ServiceClass;
  acceptancePolicy: AcceptancePolicy;
  pricingGuardrails: string[];
};

function mapDispatchTierToAcceptancePolicy(dispatchTier: DispatchTier): AcceptancePolicy {
  if (dispatchTier === "dispatch-first") return "dispatch-first";
  if (dispatchTier === "selective-screening") return "screen-hard";
  if (dispatchTier === "bundle-only") return "accept-if-bundled";
  return "decline-if-standalone";
}

export function resolveServicePolicy(
  normalizedService: string,
  serviceLane: string,
): ServicePolicy {
  if (normalizedService === "battery-no-start") {
    const dispatchTier: DispatchTier = "dispatch-first";
    return {
      marketingOffer: "No-start help",
      marketingRole: "hero",
      dispatchTier,
      followOnPath: [
        "Battery replacement",
        "Starter or alternator repair",
        "Cable or terminal cleanup",
      ],
      serviceClass: "hero-core",
      acceptancePolicy: mapDispatchTierToAcceptancePolicy(dispatchTier),
      pricingGuardrails: [
        "Enforce minimum ticket before dispatch.",
        "Charge paid diagnosis if the battery/no-start complaint is not clearly a replacement fit.",
        "Use same-day surcharge when urgency compresses the route.",
      ],
    };
  }

  if (normalizedService === "brake-service") {
    const dispatchTier: DispatchTier = "dispatch-first";
    return {
      marketingOffer: "Brake help",
      marketingRole: "hero",
      dispatchTier,
      followOnPath: [
        "Pads and rotors",
        "Brake fluid or caliper work",
        "Rear brake follow-up",
      ],
      serviceClass: "hero-core",
      acceptancePolicy: mapDispatchTierToAcceptancePolicy(dispatchTier),
      pricingGuardrails: [
        "Protect parts markup and bundle pads/rotors or fluid when the fit is real.",
        "Do not promise a narrow window until worksite access is confirmed.",
        "Avoid underpriced inspections that should become paid brake diagnosis.",
      ],
    };
  }

  if (normalizedService === "inspection") {
    const dispatchTier: DispatchTier = "selective-screening";
    return {
      marketingOffer: "Inspection",
      marketingRole: serviceLane.toLowerCase().includes("fleet")
        ? "hero-b2b"
        : "hero",
      dispatchTier,
      followOnPath: [
        "Deferred repair list",
        "Follow-up approved repairs",
        "Repeat maintenance or fleet program",
      ],
      serviceClass: "selective",
      acceptancePolicy: mapDispatchTierToAcceptancePolicy(dispatchTier),
      pricingGuardrails: [
        "Keep this paid and clearly scoped.",
        "Use only when the inspection creates trust, deferred work, or account-opening value.",
        "Decline vague or low-value one-off inspections that burn route time.",
      ],
    };
  }

  if (normalizedService === "oil-change") {
    const dispatchTier: DispatchTier = "bundle-only";
    return {
      marketingOffer: "Mobile oil change",
      marketingRole: "demand-capture",
      dispatchTier,
      followOnPath: [
        "Inspection and maintenance upsell",
        "Filters, wipers, and fluids",
        "Deferred brake or repair work",
      ],
      serviceClass: "never-standalone",
      acceptancePolicy: mapDispatchTierToAcceptancePolicy(dispatchTier),
      pricingGuardrails: [
        "Do not dispatch below the minimum ticket.",
        "Bundle with inspection, filter, or retention work.",
        "Use as route-fill or fleet density work, not the hero offer.",
      ],
    };
  }

  if (normalizedService === "paid-diagnostic" || serviceLane.includes("diagnostic")) {
    const dispatchTier: DispatchTier = "selective-screening";
    return {
      marketingOffer: "Check engine light evaluation",
      marketingRole: "hero",
      dispatchTier,
      followOnPath: [
        "Approved diagnostic repair",
        "Sensor, ignition, or EVAP repair",
        "Deeper scoped diagnosis when the fit is still good",
      ],
      serviceClass: "selective",
      acceptancePolicy: mapDispatchTierToAcceptancePolicy(dispatchTier),
      pricingGuardrails: [
        "Collect a paid diagnostic fee before promising a full repair outcome.",
        "Credit the fee only when the approved repair economics support it.",
        "Do not market this like a cheap answer; sell clarity and controlled next steps.",
      ],
    };
  }

  const dispatchTier: DispatchTier = "decline-standalone";
  return {
    marketingOffer: "Needs human screening",
    marketingRole: "demand-capture",
    dispatchTier,
    followOnPath: [
      "Human qualification before any route decision",
      "Bundle into a believable, profitable job if possible",
    ],
    serviceClass: "never-standalone",
    acceptancePolicy: mapDispatchTierToAcceptancePolicy(dispatchTier),
    pricingGuardrails: [
      "Unknown work should not be dispatched without human qualification.",
      "Protect the route by declining low-fit standalone jobs.",
      "Only proceed if the work can be bundled into a believable, profitable promise.",
    ],
  };
}
