export type DispatchDecisionOption =
  | "book-now"
  | "quote-and-book-later"
  | "paid-diagnostic-first"
  | "bundle-only"
  | "decline";

export type DispatchDecisionRule = {
  id: string;
  lane: string;
  recommendedDecision: DispatchDecisionOption;
  useWhen: string[];
  avoidWhen: string[];
  firstPromise: string;
  pricingPosture: string[];
};

export type QuoteScript = {
  id: string;
  lane: string;
  triggerKeywords: string[];
  opener: string;
  firstStep: string;
  pricingLanguage: string;
  whatHappensNext: string;
  doNotSay: string[];
};

export type DrivewayAddOnPlay = {
  id: string;
  sourceLane: string;
  trigger: string;
  honestOffer: string;
  whyItFits: string;
  customerWords: string;
  closeoutSeed: string;
};

export type ProofCaptureChecklistItem = {
  label: string;
  whyItMatters: string;
};

export type ReviewAskScript = {
  id: string;
  lane: string;
  useWhen: string;
  ask: string;
  followUpNote: string;
};

export type ReminderSeedPlay = {
  id: string;
  lane: string;
  seedWhen: string;
  message: string;
  timingLogic: string;
};

export type PlaybookRecommendation = {
  dispatchRule?: DispatchDecisionRule;
  quoteScript?: QuoteScript;
  addOnPlays: DrivewayAddOnPlay[];
  reviewAskScript?: ReviewAskScript;
  reminderSeedPlay?: ReminderSeedPlay;
};

export const dispatchDecisionRules: DispatchDecisionRule[] = [
  {
    id: "battery-no-start",
    lane: "Battery / No-start",
    recommendedDecision: "book-now",
    useWhen: [
      "Vehicle will not start and the parking setup is workable.",
      "Customer language points to battery, starter, or charging-system concern.",
      "Same-day urgency is real and the route can still stay tight.",
    ],
    avoidWhen: [
      "The vehicle is trapped in unsafe curbside or garage conditions.",
      "The customer expects a guaranteed full electrical diagnosis on the first stop.",
      "The worksite or access notes are still vague.",
    ],
    firstPromise:
      "We can start with a no-start evaluation and battery path, confirm what failed, and tell you clearly whether this stays a same-visit fix or needs a follow-up step.",
    pricingPosture: [
      "Protect the diagnostic first step if the failure is not obviously battery-only.",
      "Use same-day convenience language, not bargain language.",
      "If the battery is installed today, seed the charging-system retest in closeout.",
    ],
  },
  {
    id: "brakes",
    lane: "Brake service",
    recommendedDecision: "book-now",
    useWhen: [
      "Noise, grinding, or pad wear language is clear.",
      "Driveway or lot is flat enough for productive work.",
      "You can credibly offer an inspection-plus-repair path on the same visit.",
    ],
    avoidWhen: [
      "Severe rust, slope, or seized-hardware risk makes the visit unpredictable.",
      "Customer expects a final quote without inspection.",
      "Parking structure or curbside setup is weak.",
    ],
    firstPromise:
      "We will inspect the brake setup first, tell you whether it stays a pad-and-rotor visit, and confirm cost before anything changes.",
    pricingPosture: [
      "Lead with safety and clarity, not discount language.",
      "Quote the first axle or inspection path honestly before widening scope.",
      "Use rear-brake and tire-wear notes as closeout follow-through, not surprise upsells.",
    ],
  },
  {
    id: "diagnostics",
    lane: "Check-engine / diagnostic",
    recommendedDecision: "paid-diagnostic-first",
    useWhen: [
      "Customer knows the symptom but not the repair.",
      "Warning lights or vague drivability concern need a defined first answer.",
      "You want a trust-building entry offer that can convert into real repair.",
    ],
    avoidWhen: [
      "Customer expects exact repair certainty before diagnosis.",
      "The issue sounds open-ended, intermittent, and low-quality for mobile work.",
      "The customer is trying to shop the diagnosis itself as free advice.",
    ],
    firstPromise:
      "The first promise is a paid evaluation. We will inspect, scan, explain what the symptom likely means, and tell you clearly what the next repair step should be.",
    pricingPosture: [
      "Never blur diagnosis into free quoting.",
      "Be explicit about what the paid first step includes.",
      "Use the recap to turn findings into Now / Soon / Monitor, not a vague code printout.",
    ],
  },
  {
    id: "oil-change",
    lane: "Oil change / routine maintenance",
    recommendedDecision: "bundle-only",
    useWhen: [
      "It is attached to repeat maintenance, another higher-value stop, or route density.",
      "The visit can produce inspection notes and a next-step path.",
      "It helps keep a good household or fleet relationship active.",
    ],
    avoidWhen: [
      "It is a long-distance standalone cheap dispatch.",
      "The customer only values lowest price and nothing else.",
      "The route cannot support the travel drag.",
    ],
    firstPromise:
      "We can handle the oil service if it fits the route and we pair it with a quick inspection so you leave with a clean maintenance picture, not just a sticker reset.",
    pricingPosture: [
      "Do not market or quote this as the hero offer.",
      "Use bundle language and maintenance relationship language.",
      "Always seed the next maintenance reminder or follow-up item in closeout.",
    ],
  },
  {
    id: "starter-alternator",
    lane: "Starter / alternator",
    recommendedDecision: "quote-and-book-later",
    useWhen: [
      "Failure mode is understandable and diagnosis is already solid.",
      "Parts and parking setup can be confirmed before the visit.",
      "The customer understands there may be a first-step evaluation before install.",
    ],
    avoidWhen: [
      "You are still guessing whether it is battery, starter, or alternator.",
      "Access is tight enough to turn the job into driveway roulette.",
      "The customer wants the replacement quoted like a sure thing before screening.",
    ],
    firstPromise:
      "We will confirm whether this is really the starter or alternator path, then lock the install visit once parts, access, and price are all clear.",
    pricingPosture: [
      "Use evaluation-first language if the root cause is not proven.",
      "Avoid cheap part-swapping promises.",
      "Use follow-up recap to monitor charging or cable health after the repair.",
    ],
  },
  {
    id: "pre-purchase",
    lane: "Pre-purchase inspection",
    recommendedDecision: "book-now",
    useWhen: [
      "Buyer and seller timing are already defined.",
      "The inspection location is workable and the decision window is near-term.",
      "The customer values clarity before purchase, not cheapest possible advice.",
    ],
    avoidWhen: [
      "The customer wants a full mechanical guarantee from a quick walkaround.",
      "Seller access is unstable or location is not confirmed.",
      "The buyer expects repair negotiation and full inspection for the price of a quick opinion.",
    ],
    firstPromise:
      "We will inspect the vehicle where it sits, tell you what matters now versus later, and give you a plain-language summary before money changes hands.",
    pricingPosture: [
      "Sell trust and decision clarity, not discount mechanics.",
      "Keep scope tight and documented.",
      "Use the recap as a shareable proof asset when the inspection is strong.",
    ],
  },
  {
    id: "fleet-pm",
    lane: "Fleet / recurring maintenance",
    recommendedDecision: "quote-and-book-later",
    useWhen: [
      "Multiple vehicles can be clustered in one stop or one account relationship.",
      "The customer cares about uptime, scheduling, and repeatability.",
      "The work can be packaged into a clean recurring lane.",
    ],
    avoidWhen: [
      "It is a one-off fleet ask with no density and no repeat logic.",
      "The customer wants consumer-style convenience pricing on commercial logistics.",
      "Vehicle access, authorization, or payment ownership is fuzzy.",
    ],
    firstPromise:
      "We can build a repeatable maintenance or uptime lane for this account once the vehicle list, scheduling pattern, and approval path are all clear.",
    pricingPosture: [
      "Price for density and repeatability, not for being nice.",
      "Use account language, not one-off retail language.",
      "Anchor the relationship in recurring visits and cleaner route planning.",
    ],
  },
];

export const quoteScripts: QuoteScript[] = [
  {
    id: "battery",
    lane: "Battery / no-start",
    triggerKeywords: ["battery", "no-start", "dead battery", "won't start", "wont start", "clicking"],
    opener:
      "We can help with that. The first thing we want to confirm is whether this stays a battery job or whether the starter or charging system is involved too.",
    firstStep:
      "We start with a no-start evaluation and battery test at the vehicle so we do not sell you the wrong fix.",
    pricingLanguage:
      "If it stays a straightforward battery replacement, we can usually give you the installed price clearly. If testing shows something deeper, we explain the next step before cost changes.",
    whatHappensNext:
      "Once we confirm the fit, we lock the arrival window, keep you updated, and leave you with a clear next-step note if the charging system still needs attention.",
    doNotSay: [
      "It is definitely the battery before we test it.",
      "We can diagnose every no-start for free over the phone.",
    ],
  },
  {
    id: "brakes",
    lane: "Brake service",
    triggerKeywords: ["brake", "grinding", "squeal", "rotor", "pads"],
    opener:
      "Brake noise is a good mobile fit as long as the parking setup is workable. We inspect first so we can tell you whether it stays a pad-and-rotor job or needs a different next step.",
    firstStep:
      "The first promise is the inspection and a clear brake path, not guessing at parts before we see the car.",
    pricingLanguage:
      "If it stays within the usual pad-and-rotor scope, we can quote the axle clearly. If the scope changes, we tell you before anything changes on the bill.",
    whatHappensNext:
      "If the setup is good and the job fits the driveway, we either do the work the same visit or lock the follow-up quickly with the right parts.",
    doNotSay: [
      "Every brake noise is the same price.",
      "We know it is just pads without inspecting.",
    ],
  },
  {
    id: "diagnostic",
    lane: "Check-engine / diagnostic",
    triggerKeywords: ["check engine", "diagnostic", "diagnosis", "light on", "warning light", "scan"],
    opener:
      "The right first step here is a paid evaluation. A warning light is a symptom, not the repair, and we want to give you a clean answer instead of guessing.",
    firstStep:
      "We inspect, scan, and explain what the light or symptom is pointing to so you know whether the next move is repair, monitor, or something better handled elsewhere.",
    pricingLanguage:
      "This first step is a diagnostic visit, and if the repair stays in our lane we can often apply that toward approved work.",
    whatHappensNext:
      "You leave with a plain-language recap and a Now / Soon / Monitor path so the next decision is clear instead of stressful.",
    doNotSay: [
      "We can tell you the repair price from the code alone.",
      "The scan itself is the diagnosis.",
    ],
  },
  {
    id: "starter",
    lane: "Starter",
    triggerKeywords: ["starter", "clicks", "single click", "won't crank"],
    opener:
      "Starter symptoms can overlap with battery issues, so the first move is confirming the failure mode before we lock the install.",
    firstStep:
      "We either verify the starter path or keep it in the evaluation lane so you are not paying for the wrong part.",
    pricingLanguage:
      "Once the starter path is confirmed and access looks good, we can quote the install clearly. Until then, we keep the first promise diagnostic and honest.",
    whatHappensNext:
      "If it is the starter, we line up the part, the access plan, and the install window. If not, we show you the real next step.",
    doNotSay: [
      "A clicking sound always means starter.",
      "We can quote the install with no screening.",
    ],
  },
  {
    id: "alternator",
    lane: "Alternator / charging system",
    triggerKeywords: ["alternator", "charging", "battery light", "voltage", "charging system"],
    opener:
      "Charging issues are worth screening carefully because we want to separate battery, cable, and alternator problems before promising the install.",
    firstStep:
      "We confirm the charging-system story first, then book the alternator path only if it stays clean and mobile-friendly.",
    pricingLanguage:
      "Once the charging issue is verified and the part path is right, we can quote the repair clearly. Before that, the honest first step is evaluation.",
    whatHappensNext:
      "After the repair, we use closeout to document any cable cleanup, retest, or monitor item so the next visit is obvious.",
    doNotSay: [
      "The battery light means alternator every time.",
      "We can guarantee it stays a one-visit install before screening.",
    ],
  },
  {
    id: "pre-purchase",
    lane: "Pre-purchase inspection",
    triggerKeywords: ["pre-purchase", "inspection", "used car", "buying", "seller"],
    opener:
      "That is a good fit for a pre-purchase inspection. The goal is a clear buying decision, not a vague once-over.",
    firstStep:
      "We meet the vehicle where it sits, inspect it with the purchase decision in mind, and tell you what matters now, what affects price, and what should make you walk away.",
    pricingLanguage:
      "This is a paid inspection visit because the value is in the clarity and the written recap, not in selling follow-up repair on the spot.",
    whatHappensNext:
      "After the inspection, you leave with a plain-language recap you can use immediately in your buying decision.",
    doNotSay: [
      "We can guarantee the vehicle long-term from one inspection.",
      "It is basically free if you buy the car.",
    ],
  },
  {
    id: "fleet",
    lane: "Fleet / recurring maintenance",
    triggerKeywords: ["fleet", "company vehicles", "contractor vans", "multiple vehicles", "property manager"],
    opener:
      "We can help there, but the right first move is understanding the vehicle count, cadence, and what uptime actually matters most to you.",
    firstStep:
      "We scope the account, cluster the work, and define the recurring pattern before we talk like this is a one-off retail appointment.",
    pricingLanguage:
      "Fleet pricing is based on density, repeatability, and the service pattern, not just on being cheaper per vehicle.",
    whatHappensNext:
      "Once the account shape is clear, we can propose a starter lane for preventive maintenance, inspections, or uptime-focused recurring service.",
    doNotSay: [
      "It is just the same as retail pricing for a bunch of vehicles.",
      "We can promise recurring service before the route pattern is clear.",
    ],
  },
];

export const drivewayAddOnPlays: DrivewayAddOnPlay[] = [
  {
    id: "battery-charging",
    sourceLane: "Battery / no-start",
    trigger: "Battery is replaced or confirmed weak, but charging certainty is still soft.",
    honestOffer: "Charging-system retest and terminal cleanup",
    whyItFits:
      "It protects the battery repair and gives the customer one clean next step instead of vague worry.",
    customerWords:
      "Your vehicle is starting again. The clean next step is a short charging-system retest and terminal cleanup so this does not turn into another no-start.",
    closeoutSeed: "Seed as Now or Soon depending on readings and corrosion severity.",
  },
  {
    id: "brake-rear-axle",
    sourceLane: "Brake service",
    trigger: "Front brake work solved the immediate issue but rear status or tire wear is relevant.",
    honestOffer: "Rear brake status check or tire-wear follow-up",
    whyItFits:
      "It extends the same safety conversation without sounding like a surprise add-on.",
    customerWords:
      "The front brakes are handled. The next thing to watch is the rear brake wear, so we should either monitor it or plan that follow-up before it becomes urgent.",
    closeoutSeed: "Use Now / Soon / Monitor instead of trying to force the add-on in the moment.",
  },
  {
    id: "oil-inspection",
    sourceLane: "Oil change / routine maintenance",
    trigger: "Routine visit surfaces inspection items worth timing honestly.",
    honestOffer: "Inspection-based maintenance next step",
    whyItFits:
      "Oil service only compounds if it leaves the customer with a real maintenance picture.",
    customerWords:
      "The oil service is done. The useful next step is this inspection-based maintenance item, and here is whether it matters now, soon, or just needs monitoring.",
    closeoutSeed: "Always seed a maintenance reminder from this lane.",
  },
  {
    id: "diagnostic-repair",
    sourceLane: "Check-engine / diagnostic",
    trigger: "The evaluation produced a clear repair path or a high-confidence next test.",
    honestOffer: "Approved repair or scoped follow-up diagnostic visit",
    whyItFits:
      "The customer already paid for clarity. The next step should feel like the logical continuation of that clarity.",
    customerWords:
      "The diagnostic visit gave us a clean first answer. The next step is this repair or scoped follow-up, and here is why it is the right move now.",
    closeoutSeed: "Use the recap to separate immediate repair from monitor items.",
  },
  {
    id: "pre-purchase-followup",
    sourceLane: "Pre-purchase inspection",
    trigger: "Inspection surfaced a negotiable issue or a clear post-purchase maintenance item.",
    honestOffer: "Post-purchase repair plan or maintenance baseline visit",
    whyItFits:
      "The customer already trusts the inspection. The next visit should feel like the natural continuation of that trust.",
    customerWords:
      "If you buy this vehicle, the smartest next step is a baseline visit for the first repairs and maintenance items we already documented.",
    closeoutSeed: "Use Soon items to preserve trust without forcing the sale before the car is purchased.",
  },
  {
    id: "fleet-baseline",
    sourceLane: "Fleet / recurring maintenance",
    trigger: "First fleet touch found repeatable issues or common maintenance timing across vehicles.",
    honestOffer: "Recurring baseline maintenance lane",
    whyItFits:
      "The value in fleet work comes from repeatability and fewer surprises, not from a one-off heroic repair day.",
    customerWords:
      "The best next step is a recurring maintenance lane so these same vehicles do not keep failing the same way on different weeks.",
    closeoutSeed: "Seed reminder and next-visit language at the account level, not only the single vehicle level.",
  },
];

export const proofCaptureChecklist: ProofCaptureChecklistItem[] = [
  {
    label: "Take one clean before/after or during-work photo when the customer setup allows it.",
    whyItMatters: "Real visual proof compounds trust faster than generic copy.",
  },
  {
    label: "Capture the plain-language recap used at closeout.",
    whyItMatters: "This becomes case-study proof, training material, and better future messaging.",
  },
  {
    label: "Log whether the customer was asked for a review and by which channel.",
    whyItMatters: "Review systems fail when the ask is fuzzy or nobody owns it.",
  },
  {
    label: "Save permissioned customer text praise or relief language when it happens.",
    whyItMatters: "Real customer wording becomes better proof than invented testimonials.",
  },
  {
    label: "Tag which proof asset belongs to which service lane and neighborhood.",
    whyItMatters: "Local proof becomes stronger when it lines up with the exact service and geography we market.",
  },
  {
    label: "Capture one sentence on why the customer booked and what part of the promise mattered most.",
    whyItMatters: "This helps sharpen ads, quote scripts, and what we lead with on the site.",
  },
];

export const reviewAskScripts: ReviewAskScript[] = [
  {
    id: "same-day-rescue",
    lane: "Battery / no-start",
    useWhen: "A same-day rescue brought relief and the customer feels the problem is truly off their shoulders.",
    ask: "If today made your week easier, would you mind leaving a quick review while the visit is still fresh? It helps other Spokane drivers trust that we actually show up and keep our word.",
    followUpNote: "Tie the ask to relief and reliability, not to begging for stars.",
  },
  {
    id: "safety-confidence",
    lane: "Brake service",
    useWhen: "The safety issue was handled cleanly and the customer can feel the difference immediately.",
    ask: "If the brake visit felt clear and easy today, a short review about the experience would help a lot. People are usually looking for someone they can actually trust with this kind of repair.",
    followUpNote: "Anchor the ask in trust and clarity, not discount language.",
  },
  {
    id: "clarity-after-diagnostic",
    lane: "Check-engine / diagnostic",
    useWhen: "The customer left with a calm, useful answer even if the repair is not finished yet.",
    ask: "If the diagnostic visit gave you a clearer answer than you had before, a quick review about the clarity and communication would mean a lot.",
    followUpNote: "This works especially well when the visit reduced stress, not just when it closed a big ticket.",
  },
  {
    id: "decision-help",
    lane: "Pre-purchase inspection",
    useWhen: "The inspection helped the buyer make a confident decision quickly.",
    ask: "If the inspection helped you make a better buying decision today, would you leave a short review about the clarity of the recap and what stood out most?",
    followUpNote: "Keep the tone professional and decision-focused.",
  },
];

export const reminderSeedPlays: ReminderSeedPlay[] = [
  {
    id: "charging-retest",
    lane: "Battery / no-start",
    seedWhen: "A battery or no-start visit ends with charging or cable confidence still needing one clean follow-up.",
    message: "We should keep the charging-system retest visible so this repair does not quietly drift back into another no-start event.",
    timingLogic: "Seed same day. If it is not scheduled within 72 hours, escalate the reminder.",
  },
  {
    id: "brake-monitor",
    lane: "Brake service",
    seedWhen: "Front work is complete but rear wear, tire wear, or fluid condition still deserves timed follow-up.",
    message: "The immediate brake problem is handled. The next reminder should keep the rear or follow-up safety item from becoming urgent later.",
    timingLogic: "Seed at closeout and tie it to the next realistic inspection window, not arbitrary calendar spam.",
  },
  {
    id: "maintenance-lane",
    lane: "Oil change / routine maintenance",
    seedWhen: "Routine work surfaced filters, fluids, or monitor items that should become the next easy visit.",
    message: "This reminder should make the next maintenance step feel obvious and low-friction, not like a generic coupon blast.",
    timingLogic: "Seed immediately and group the next likely items into one believable follow-up ask.",
  },
  {
    id: "fleet-repeatability",
    lane: "Fleet / recurring maintenance",
    seedWhen: "The first fleet touch proved there is repeatable service rhythm or recurring failure pattern.",
    message: "The reminder should reinforce uptime and repeatability, not one-off retail urgency.",
    timingLogic: "Seed at the account level with the next cluster window already implied.",
  },
];

function pickByKeyword<T extends { triggerKeywords?: string[] }>(
  items: T[],
  text: string,
) {
  const normalized = text.toLowerCase();
  return items.find((item) =>
    (item.triggerKeywords || []).some((keyword) => normalized.includes(keyword)),
  );
}

export function getDispatchDecisionRuleForText(text: string) {
  const normalized = text.toLowerCase();

  if (normalized.includes("battery") || normalized.includes("no-start") || normalized.includes("won't start") || normalized.includes("wont start")) {
    return dispatchDecisionRules.find((rule) => rule.id === "battery-no-start");
  }
  if (normalized.includes("brake")) {
    return dispatchDecisionRules.find((rule) => rule.id === "brakes");
  }
  if (normalized.includes("check engine") || normalized.includes("diagnostic") || normalized.includes("light")) {
    return dispatchDecisionRules.find((rule) => rule.id === "diagnostics");
  }
  if (normalized.includes("oil")) {
    return dispatchDecisionRules.find((rule) => rule.id === "oil-change");
  }
  if (normalized.includes("starter") || normalized.includes("alternator") || normalized.includes("charging")) {
    return dispatchDecisionRules.find((rule) => rule.id === "starter-alternator");
  }
  if (normalized.includes("pre-purchase") || normalized.includes("used car") || normalized.includes("seller")) {
    return dispatchDecisionRules.find((rule) => rule.id === "pre-purchase");
  }
  if (normalized.includes("fleet") || normalized.includes("company vehicles") || normalized.includes("contractor")) {
    return dispatchDecisionRules.find((rule) => rule.id === "fleet-pm");
  }

  return undefined;
}

export function getQuoteScriptForText(text: string) {
  return pickByKeyword(quoteScripts, text);
}

export function getDrivewayAddOnPlaysForText(text: string) {
  const normalized = text.toLowerCase();

  if (normalized.includes("battery") || normalized.includes("no-start") || normalized.includes("charging")) {
    return drivewayAddOnPlays.filter((play) => play.id === "battery-charging");
  }
  if (normalized.includes("brake")) {
    return drivewayAddOnPlays.filter((play) => play.id === "brake-rear-axle");
  }
  if (normalized.includes("oil")) {
    return drivewayAddOnPlays.filter((play) => play.id === "oil-inspection");
  }
  if (normalized.includes("check engine") || normalized.includes("diagnostic")) {
    return drivewayAddOnPlays.filter((play) => play.id === "diagnostic-repair");
  }
  if (normalized.includes("pre-purchase") || normalized.includes("used car")) {
    return drivewayAddOnPlays.filter((play) => play.id === "pre-purchase-followup");
  }
  if (normalized.includes("fleet") || normalized.includes("company vehicle")) {
    return drivewayAddOnPlays.filter((play) => play.id === "fleet-baseline");
  }

  return [];
}

export function getReviewAskScriptForText(text: string) {
  const normalized = text.toLowerCase();

  if (
    normalized.includes("battery") ||
    normalized.includes("no-start") ||
    normalized.includes("charging")
  ) {
    return reviewAskScripts.find((script) => script.id === "same-day-rescue");
  }
  if (normalized.includes("brake")) {
    return reviewAskScripts.find((script) => script.id === "safety-confidence");
  }
  if (normalized.includes("check engine") || normalized.includes("diagnostic")) {
    return reviewAskScripts.find((script) => script.id === "clarity-after-diagnostic");
  }
  if (normalized.includes("pre-purchase") || normalized.includes("used car")) {
    return reviewAskScripts.find((script) => script.id === "decision-help");
  }

  return undefined;
}

export function getReminderSeedPlayForText(text: string) {
  const normalized = text.toLowerCase();

  if (
    normalized.includes("battery") ||
    normalized.includes("no-start") ||
    normalized.includes("charging")
  ) {
    return reminderSeedPlays.find((play) => play.id === "charging-retest");
  }
  if (normalized.includes("brake")) {
    return reminderSeedPlays.find((play) => play.id === "brake-monitor");
  }
  if (normalized.includes("oil") || normalized.includes("maintenance")) {
    return reminderSeedPlays.find((play) => play.id === "maintenance-lane");
  }
  if (normalized.includes("fleet") || normalized.includes("company vehicle")) {
    return reminderSeedPlays.find((play) => play.id === "fleet-repeatability");
  }

  return undefined;
}

export function getPlaybookRecommendation(text: string): PlaybookRecommendation {
  return {
    dispatchRule: getDispatchDecisionRuleForText(text),
    quoteScript: getQuoteScriptForText(text),
    addOnPlays: getDrivewayAddOnPlaysForText(text),
    reviewAskScript: getReviewAskScriptForText(text),
    reminderSeedPlay: getReminderSeedPlayForText(text),
  };
}
