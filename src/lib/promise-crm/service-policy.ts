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
  screeningQuestions: string[];
  redFlagTriggers: string[];
  dispatchGate: string;
  wedgePromise: string;
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
      wedgePromise:
        "We can tell you quickly whether this sounds like a real mobile no-start fit and give you a believable arrival window before we promise more.",
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
      screeningQuestions: [
        "Does the engine crank, click, or stay completely dead?",
        "Have you already tried a jump-start or battery replacement recently?",
        "Is the vehicle parked somewhere a mobile tech can safely work?",
      ],
      redFlagTriggers: [
        "Customer cannot describe crank/click/dead behavior.",
        "Vehicle is trapped in a garage, tight structure, or unsafe parking setup.",
        "Complaint sounds like broad electrical diagnosis instead of a clean no-start fit.",
      ],
      dispatchGate:
        "Do not promise dispatch until crank/no-crank behavior, worksite access, and paid-diagnosis fit are clear.",
    };
  }

  if (normalizedService === "brake-service") {
    const dispatchTier: DispatchTier = "dispatch-first";
    return {
      marketingOffer: "Brake help",
      marketingRole: "hero",
      dispatchTier,
      wedgePromise:
        "We make brake service feel clear: confirm the symptom, confirm the worksite, then promise a realistic window and honest brake path.",
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
      screeningQuestions: [
        "What brake symptom is the customer actually feeling: grinding, squeal, soft pedal, pull, or vibration?",
        "Has any shop already inspected brakes or quoted pads/rotors/calipers?",
        "Can the vehicle stay parked long enough for brake work and test verification?",
      ],
      redFlagTriggers: [
        "Customer only wants the cheapest pad swap with no inspection context.",
        "Vehicle access or parking setup makes wheel/brake work unrealistic.",
        "Symptoms suggest broader suspension or hydraulic diagnosis being treated like simple brakes.",
      ],
      dispatchGate:
        "Do not promise brake arrival until symptom, parking access, and likely parts path are believable enough to protect the route.",
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
      wedgePromise:
        "We sell scoped clarity, not vague reassurance. The customer should know exactly what the inspection buys them.",
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
      screeningQuestions: [
        "What decision does this inspection need to unlock?",
        "Is this consumer trust work, pre-purchase, or account-opening value?",
        "What exact deliverable does the customer expect at the end of the visit?",
      ],
      redFlagTriggers: [
        "The customer wants free reassurance instead of a paid scoped inspection.",
        "No clear decision or next step will come from the visit.",
        "The route cost outweighs the trust or deferred-work value.",
      ],
      dispatchGate:
        "Only dispatch when the inspection is paid, scoped, and tied to a real decision or follow-on value.",
    };
  }

  if (normalizedService === "oil-change") {
    const dispatchTier: DispatchTier = "bundle-only";
    return {
      marketingOffer: "Mobile oil change",
      marketingRole: "demand-capture",
      dispatchTier,
      wedgePromise:
        "This is retention or density work, not a hero rescue offer. We only promise it when the economics stay believable.",
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
      screeningQuestions: [
        "What else can be inspected or bundled while the vehicle is already on site?",
        "Is this retention density, fleet cadence, or just a one-off oil request?",
        "Does the worksite make this efficient enough to protect the route?",
      ],
      redFlagTriggers: [
        "Standalone oil-only request below the minimum ticket.",
        "No bundle, inspection, or retention value tied to the visit.",
        "Travel/setup cost overwhelms the ticket size.",
      ],
      dispatchGate:
        "Only dispatch oil-change work when it is bundled, route-filling, or tied to repeat-account density.",
    };
  }

  if (normalizedService === "paid-diagnostic" || serviceLane.includes("diagnostic")) {
    const dispatchTier: DispatchTier = "selective-screening";
    return {
      marketingOffer: "Check engine light evaluation",
      marketingRole: "hero",
      dispatchTier,
      wedgePromise:
        "We promise controlled diagnosis and honest next steps, not a cheap guess.",
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
      screeningQuestions: [
        "Is the issue mainly a check-engine light, drivability concern, or intermittent mystery?",
        "Has anyone already pulled codes or attempted repairs?",
        "Is the customer buying a diagnostic answer or expecting a same-visit fix?",
      ],
      redFlagTriggers: [
        "The customer expects a cheap instant answer to a broad electrical issue.",
        "Prior failed repairs suggest a deeper diagnostic rabbit hole.",
        "The job is being sold like a guaranteed repair instead of paid clarity.",
      ],
      dispatchGate:
        "Only dispatch once the customer accepts paid diagnostic scope and the complaint still fits mobile economics.",
    };
  }

  const dispatchTier: DispatchTier = "decline-standalone";
  return {
    marketingOffer: "Needs human screening",
    marketingRole: "demand-capture",
    dispatchTier,
    wedgePromise:
      "No promise gets made until a human tightens the scope into something believable and profitable.",
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
    screeningQuestions: [
      "What exact symptom or service is being requested?",
      "Can the job be translated into a believable mobile scope?",
      "Is there enough ticket, trust, or follow-on value to justify dispatch?",
    ],
    redFlagTriggers: [
      "Complaint is vague enough that route time would be spent discovering basic facts.",
      "Work sounds like broad shop-only or low-fit labor.",
      "No believable promise can be made without more human screening.",
    ],
    dispatchGate:
      "Hold the calendar until a human either sharpens the scope or declines the standalone request.",
  };
}
