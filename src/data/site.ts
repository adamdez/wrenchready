export type Faq = {
  question: string;
  answer: string;
};

export type Service = {
  slug: string;
  name: string;
  seoTitle: string;
  headline: string;
  teaser: string;
  metaDescription: string;
  priceFrom: string;
  duration: string;
  idealFor: string[];
  includes: string[];
  trustPoints: string[];
  whyItWins: string[];
  faqs: Faq[];
  locationSlugs: string[];
  keywords: string[];
};

export type Location = {
  slug: string;
  name: string;
  seoTitle: string;
  headline: string;
  teaser: string;
  metaDescription: string;
  neighborhoods: string[];
  routeHighlights: string[];
  painPoints: string[];
  serviceSlugs: string[];
  faqs: Faq[];
  keywords: string[];
  geo?: { lat: number; lng: number };
  parentSlug?: string;
};

export const siteConfig = {
  name: "WrenchReady Mobile",
  domain: "https://wrenchreadymobile.com",
  locale: "en_US",
  city: "Spokane",
  state: "Washington",
  stateCode: "WA",
  description:
    "WrenchReady Mobile brings mobile car repair to your driveway or workplace in Spokane County — batteries, brakes, diagnostics, inspections, and routine maintenance with clear quotes and approval before added work.",
  shortDescription:
    "Mobile auto repair in Spokane built around honest screening, clear communication, and approval before added work.",
  areaServed: ["Spokane", "Spokane Valley", "Liberty Lake", "South Hill"],
  contact: {
    email: "admin@wrenchreadymobile.com",
    phoneDisplay: "(509) 590-7091",
    phoneHref: "tel:+15095907091",
    smsHref: "sms:+15095907091",
    schedule: "Spokane County mobile service",
  },
  globalKeywords: [
    "mobile mechanic Spokane WA",
    "mobile auto repair Spokane",
    "mobile brake repair Spokane",
    "battery replacement at home Spokane",
    "check engine light diagnostic Spokane",
    "pre purchase inspection Spokane",
    "mobile oil change Spokane",
    "no start mobile mechanic Spokane",
  ],
} as const;

export const launchStats = [
  { value: "0", label: "shop drop-off required" },
  { value: "< 15 min", label: "target first response window" },
  { value: "Spokane", label: "launch market and proving ground" },
  { value: "2 rules", label: "earn the next visit and protect wrench time" },
] as const;

export const operatingPrinciples = [
  {
    kicker: "Screen First",
    title: "We check whether the job fits before we schedule it.",
    copy:
      "If the job, parking, or timing is wrong for mobile service, we say so upfront instead of scheduling something that will not work.",
  },
  {
    kicker: "Protect the Work",
    title: "One person fixes cars. Another handles everything else.",
    copy:
      "Simon fixes cars. Dez handles calls, scheduling, and logistics so the day stays tight and the work actually gets done.",
  },
  {
    kicker: "Right Jobs First",
    title: "We lead with the work that fits driveways and parking lots.",
    copy:
      "No-starts, brakes, batteries, paid diagnostics, and inspections are the core of the business. Oil changes are available when they fit the route.",
  },
] as const;

export const trustPoints = [
  {
    kicker: "Clarity",
    title: "Photo-backed findings and plain-language next steps",
    copy:
      "You see what was done, what was found, and what matters now versus later — in normal language, not shop jargon.",
  },
  {
    kicker: "Convenience",
    title: "Home, driveway, curb, or workplace",
    copy:
      "The value is not only the repair. It is the time, ride coordination, and drop-off friction you never have to deal with.",
  },
  {
    kicker: "Focused Routes",
    title: "Spokane County coverage that stays realistic",
    copy:
      "We keep the service area focused so arrival windows are reliable and each visit gets the time it needs.",
  },
  {
    kicker: "Honest Screening",
    title: "We check the job before we schedule it",
    copy:
      "If the work is not a good mobile fit, we tell you early. That saves everyone time and keeps the service predictable.",
  },
] as const;

export const proofStatements = [
  "Simon turns wrenches. Dez handles operations. Two people, focused service.",
  "We lead with the work that fits mobile best: no-starts, brakes, diagnostics, and inspections.",
  "When the job is done, you get what was done, what was found, and what comes next — in plain language.",
] as const;

export const customerBenefits = [
  "No tow. No drop-off. No waiting room.",
  "Clear promise before the job is accepted",
  "You can actually see what we did",
  "Repeat bookings get easier, not harder",
] as const;

export const scopeGuardrails = [
  "No internal engine or transmission rebuild work",
  "No lift-dependent repairs or heavy rust battles",
  "No open-ended diagnostics without a defined first step",
  "No pretending every low-ticket job deserves a mobile slot",
  "No pretending every vehicle problem is a great mobile fit",
] as const;

export const processSteps = [
  {
    title: "Tell us what the car is doing",
    copy:
      "Send the vehicle info, where it is parked, and a short description of the issue.",
  },
  {
    title: "We tell you the right first appointment",
    copy:
      "Straightforward repair? We quote it. Needs diagnosis first? We say that clearly.",
  },
  {
    title: "We confirm the visit",
    copy:
      "You get a real appointment window and follow-up before the visit.",
  },
  {
    title: "You approve added work before it happens",
    copy:
      "If inspection changes the plan, we explain it first. No surprise scope.",
  },
] as const;

export const serviceLaneHighlights = [
  "No-start and battery work when the vehicle will not move",
  "Brake jobs that fit a driveway or parking lot",
  "Paid diagnostics that protect the first step",
  "Pre-purchase inspections that reduce bad-buy risk",
] as const;

export const launchWedges = [
  {
    slug: "battery-replacement",
    label: "Dead battery / won't start",
    shortLabel: "No-start help",
    firstPromise:
      "We test first so we do not sell the wrong battery or pretend every no-start is the same job.",
    whyNow:
      "High urgency, easy customer language, and one of the cleanest mobile fits in the category.",
  },
  {
    slug: "brake-repair",
    label: "Brake noise / brake repair",
    shortLabel: "Brake help",
    firstPromise:
      "We inspect first, tell you whether it stays a pad-and-rotor visit, and get approval before anything widens.",
    whyNow:
      "Strong safety-driven demand, strong ticket shape, and clear before-and-after proof.",
  },
] as const;

export const priorityServiceSlugs = [
  "battery-replacement",
  "brake-repair",
  "check-engine-diagnostics",
  "pre-purchase-inspection",
  "oil-change",
] as const;

export type Review = {
  name: string;
  vehicle: string;
  service: string;
  rating: number;
  text: string;
};

export const reviews: Review[] = [];

export const homeFaqs: Faq[] = [
  {
    question: "Do you only replace batteries?",
    answer:
      "No. Battery work is one of the clearest mobile jobs, but WrenchReady handles a wider set of high-fit services including no-start evaluation, brake work, paid diagnostics, inspections, and selected common repairs.",
  },
  {
    question: "What if I am not sure what is wrong?",
    answer:
      "If the problem is not obvious, we will say so. In those cases, diagnosis is the first service. We explain that upfront so you know what the visit is for and what happens after the findings.",
  },
  {
    question: "How does pricing work?",
    answer:
      "For straightforward jobs, you get a clear quote before work begins. If the problem is not obvious, the first step may be a paid diagnostic visit so the vehicle can be tested properly before a repair is approved.",
  },
  {
    question: "Will the price change once the technician arrives?",
    answer:
      "Only if the inspected vehicle shows something materially different from the original request. If that happens, you get a plain-English explanation and an approval request before added work moves forward.",
  },
  {
    question: "Will I know if the job changes?",
    answer:
      "Yes. If additional work is found, you get a clear explanation and approval request before anything moves forward. No surprise scope.",
  },
  {
    question: "Do I have to take my car to a shop?",
    answer:
      "Not for the services that fit mobile repair well. WrenchReady is designed for home, work, and parking-lot service when the job is a good field fit.",
  },
  {
    question: "How quickly can I get an appointment?",
    answer:
      "Most requests get a response within 15 minutes during service hours. Send us the vehicle, what you need, parking details, and your preferred day — we will follow up with availability and a clear next step.",
  },
  {
    question: "Is WrenchReady Mobile licensed and insured?",
    answer:
      "Yes. Full license, full insurance. Washington State RCW 46.71 compliant. You are covered when we are working on your driveway.",
  },
  {
    question: "Do you charge a diagnostic fee?",
    answer:
      "When the issue needs diagnosis, yes. That is explained clearly before the appointment so you know whether the visit is for testing, repair, or both. The fee may be credited toward approved repair work.",
  },
];

export function getServicesInPriorityOrder(list: Service[] = services) {
  const rank = new Map<string, number>(priorityServiceSlugs.map((slug, index) => [slug, index]));
  return [...list].sort((left, right) => {
    const leftRank = rank.get(left.slug) ?? priorityServiceSlugs.length;
    const rightRank = rank.get(right.slug) ?? priorityServiceSlugs.length;
    return leftRank - rightRank;
  });
}

export const services: Service[] = [
  {
    slug: "oil-change",
    name: "Mobile Oil Change",
    seoTitle: "Mobile Oil Change in Spokane, WA",
    headline: "Oil change at your place, with a quick look around.",
    teaser:
      "Fresh oil, the right filter, and a simple inspection so routine maintenance stays convenient without turning into a shop day.",
    metaDescription:
      "Book a mobile oil change in Spokane, WA. Fresh oil, the right filter, and a quick inspection — routine maintenance at your driveway or workplace with clear notes on what to watch next.",
    priceFrom: "From $85",
    duration: "45-60 minutes",
    idealFor: [
      "Commuter cars and family SUVs that need routine maintenance without a drop-off",
      "Busy professionals who want an efficient maintenance stop already in the route",
      "Owners who want inspection notes and timing guidance, not just a windshield sticker",
    ],
    includes: [
      "Fresh oil and filter, right spec for your car",
      "Quick fluid and light check while we're there",
      "Service light reset if the car will let us",
      "Notes on anything else worth watching",
    ],
    trustPoints: [
      "You get fresh oil, the right filter, and a quick look around while the car is already parked.",
      "We call out anything worth watching without turning a simple service into a scare pitch.",
      "Best for routine maintenance, repeat customers, or bundling with a second job on the same visit.",
    ],
    whyItWins: [
      "Routine maintenance without a shop trip",
      "Easy to bundle with another service on the same visit",
      "Builds a maintenance rhythm so nothing gets missed",
      "Best for repeat customers and route-friendly scheduling",
    ],
    faqs: [
      {
        question: "Do I need to stay with the vehicle during the oil change?",
        answer:
          "Nope. Stay inside, keep working. Just make sure the car's easy to get to and the parking's safe.",
      },
      {
        question: "Do you reset the maintenance light?",
        answer:
          "Yeah, if the car will let us. Some vehicles need a specific button combo we'll explain.",
      },
      {
        question: "Is this just a quick drain-and-fill?",
        answer:
          "No. We look around while we're there — fluids, leaks, tires, belts. You get a quick list of what's worth watching.",
      },
    ],
    locationSlugs: ["spokane", "spokane-valley", "south-hill", "liberty-lake"],
    keywords: [
      "mobile oil change Spokane",
      "oil change at home Spokane",
      "mobile mechanic oil change Spokane",
      "oil service Spokane Valley",
    ],
  },
  {
    slug: "brake-repair",
    name: "Mobile Brake Service",
    seoTitle: "Mobile Brake Repair in Spokane, WA",
    headline: "Brake service with an inspection first.",
    teaser:
      "Squealing, grinding, vibration, or soft pedal? We inspect the system, explain what is worn, and quote the work clearly before anything changes.",
    metaDescription:
      "Need mobile brake repair in Spokane, WA? WrenchReady Mobile handles brake pad and rotor service at your home or workplace with clear inspection notes.",
    priceFrom: "From $280 per axle",
    duration: "1.5-2.5 hours",
    idealFor: [
      "Drivers hearing squealing or grinding and wanting a clean first answer before the car gets worse",
      "Families who cannot spare the logistics of dropping off a vehicle for common brake work",
      "Customers who value inspection notes and practical follow-up instead of vague counter talk",
    ],
    includes: [
      "Full brake system inspection first",
      "Pad and rotor replacement if that's the fix",
      "Everything torqued properly and tested before we leave",
      "Notes on what comes next, if anything",
    ],
    trustPoints: [
      "We inspect first so you know whether it is pads, rotors, or something else before parts go on.",
      "Most brake jobs fit well in a driveway or parking lot when the surface is safe and level.",
      "You leave with a clear answer on what was done and whether anything else needs attention.",
    ],
    whyItWins: [
      "Brake noise creates real urgency — customers want a fast, clear answer",
      "One of the highest-value mobile jobs with obvious before-and-after results",
      "Most pad-and-rotor work fits a driveway or parking lot perfectly",
      "Inspection-first approach builds trust and avoids unnecessary parts",
    ],
    faqs: [
      {
        question: "Can you replace brakes in an apartment lot or office parking area?",
        answer:
          "Usually. Level ground and a couple hours is all we need. Just mention the parking situation when you book.",
      },
      {
        question: "What if the noise is not just pads and rotors?",
        answer:
          "We check first before we start replacing parts. If it's something different, we'll tell you what it looks like and what comes next.",
      },
      {
        question: "Do you handle every brake issue mobile?",
        answer:
          "Pad and rotor work, yeah. Stuff with rust buildup or hydraulic issues might need a shop lift. We'll be upfront about it.",
      },
    ],
    locationSlugs: ["spokane", "spokane-valley", "south-hill"],
    keywords: [
      "mobile brake repair Spokane",
      "brake pads at home Spokane",
      "mobile mechanic brakes Spokane Valley",
      "brake service South Hill Spokane",
    ],
  },
  {
    slug: "battery-replacement",
    name: "Battery Replacement",
    seoTitle: "Mobile Battery Replacement in Spokane, WA",
    headline: "Battery service that starts with a test.",
    teaser:
      "If the car will not start, we come to you, test the battery and charging system, and replace the battery only if that is the real problem.",
    metaDescription:
      "Get mobile battery replacement in Spokane, WA with on-site testing, installation, and a clear explanation of what caused the no-start condition.",
    priceFrom: "From $180 installed",
    duration: "30-45 minutes",
    idealFor: [
      "Vehicles that suddenly will not start at home or at work",
      "Drivers who want a test first instead of guessing at the part",
      "Urgent weekday or weekend issues where a tow would cost more time than the repair",
    ],
    includes: [
      "Battery test to confirm it's the problem",
      "Install a new one if needed",
      "Quick check of terminals and charging system",
      "Straight answer if something else is going on",
    ],
    trustPoints: [
      "We test before replacing so you are not paying for the wrong part.",
      "This is one of the cleanest mobile jobs because we can usually solve it where the car already sits.",
      "If the battery is not the problem, we will say that before swapping anything.",
    ],
    whyItWins: [
      "The car is already stuck — mobile service meets the problem where it is",
      "Simple, clear promise: test first, replace only if the battery is the issue",
      "Fast turnaround keeps the disruption to under an hour in most cases",
      "If the problem is the starter or alternator, you find out before wasting money on the wrong part",
    ],
    faqs: [
      {
        question: "Can you come to my house if the car will not start?",
        answer:
          "Yes. Send us the address and we'll be there. That's exactly what this service is for.",
      },
      {
        question: "What if the battery is not the real problem?",
        answer:
          "We test it first. If it's the starter or alternator, we'll tell you that instead of swapping a battery that won't fix it.",
      },
      {
        question: "How long does mobile battery replacement take?",
        answer:
          "Usually 30-45 minutes start to finish, assuming we can get the right battery and the parking setup is clear.",
      },
    ],
    locationSlugs: ["spokane", "spokane-valley", "liberty-lake", "south-hill"],
    keywords: [
      "battery replacement at home Spokane",
      "mobile battery replacement Spokane",
      "car wont start Spokane mobile mechanic",
      "mobile mechanic battery Spokane Valley",
    ],
  },
  {
    slug: "check-engine-diagnostics",
    name: "Check Engine Diagnostics",
    seoTitle: "Check Engine Light Diagnostics in Spokane, WA",
    headline: "Check engine light on? Start with diagnosis.",
    teaser:
      "We scan the codes, explain what they actually mean, and tell you the next step without guessing from the light alone.",
    metaDescription:
      "Book check-engine light diagnostics in Spokane, WA with a mobile mechanic who starts from the symptom, screens the job honestly, and explains the next repair step clearly.",
    priceFrom: "From $150",
    duration: "45-75 minutes",
    idealFor: [
      "Drivers who know the symptom but not the repair",
      "Customers who want a real first answer before approving larger work",
      "Households that need a trustworthy explanation in normal language",
    ],
    includes: [
      "We listen to the symptom, then scan the codes",
      "We tell you what they mean in plain English",
      "Honest next step — fix it, monitor it, or get a different opinion",
      "Fee may be credited toward approved repair when the scope stays in-house",
    ],
    trustPoints: [
      "A warning light is a symptom, not a part. We start there.",
      "You get plain-English findings instead of a code printout with no context.",
      "If the next step is not a good mobile fit, we will tell you that early.",
    ],
    whyItWins: [
      "Customers with a warning light need a clear answer, not a parts swap",
      "Paid diagnostics set the right expectation: testing is the service",
      "Findings often lead to a repair that can be handled the same visit or scheduled next",
      "Plain-English explanations build the kind of trust that earns repeat work",
    ],
    faqs: [
      {
        question: "If the check-engine light is on, do I book a repair or a diagnostic visit?",
        answer:
          "Start with diagnostics. We'll figure out if it's a quick fix or something bigger.",
      },
      {
        question: "Do you credit the diagnostic fee toward the repair?",
        answer:
          "Usually, if we end up doing the work and it's something we can handle.",
      },
      {
        question: "Can every warning-light issue be handled mobile?",
        answer:
          "Not all of them. Some stuff needs a lift or a shop. We'll know pretty quick and tell you straight.",
      },
    ],
    locationSlugs: ["spokane", "spokane-valley", "liberty-lake"],
    keywords: [
      "check engine light diagnostic Spokane",
      "mobile diagnostics Spokane",
      "car diagnostic at home Spokane",
      "mobile mechanic check engine Spokane Valley",
    ],
  },
  {
    slug: "pre-purchase-inspection",
    name: "Pre-Purchase Inspection",
    seoTitle: "Pre-Purchase Inspection in Spokane, WA",
    headline: "Know what you're buying before money changes hands.",
    teaser:
      "We meet you at the seller's location, inspect the vehicle, and give you a plain summary of what looks solid, what should change the price, and what should make you walk away.",
    metaDescription:
      "Need a pre-purchase inspection in Spokane, WA? WrenchReady Mobile checks used vehicles on site and gives buyers a clearer picture before money changes hands.",
    priceFrom: "From $150",
    duration: "45-75 minutes",
    idealFor: [
      "Private-party vehicle buyers who need an independent mechanical look before committing",
      "Families comparing multiple used vehicles and trying to avoid the wrong one",
      "Customers who value a plain-language explanation more than a rushed thumbs-up",
    ],
    includes: [
      "Full walkthrough of the vehicle at the seller's place",
      "Check for leaks, lights, tire condition, brake wear, obvious problems",
      "A summary: what's solid, what should affect the price, what's a deal-killer",
      "Notes and photos you can reference later",
    ],
    trustPoints: [
      "You get a calm second set of eyes before money changes hands.",
      "We point out what looks solid, what should change the price, and what should stop the deal.",
      "The goal is a practical driveway inspection, not a rushed thumbs-up or a sales pitch.",
    ],
    whyItWins: [
      "Buyers get an honest second opinion at the seller's location before committing",
      "Even when no repair happens, the inspection builds trust for future work",
      "One of the best referral-generating services — buyers tell friends",
      "A good inspection often leads to follow-up maintenance after the purchase",
    ],
    faqs: [
      {
        question: "Can you inspect a used car at the seller's house or lot?",
        answer:
          "Yeah, that's where we do it. Give us the address, the car details, and any timing the seller's mentioned.",
      },
      {
        question: "Is this the same as a full shop inspection?",
        answer:
          "No, this is a driveway inspection. We catch the big stuff and the red flags, not everything a lift can show.",
      },
      {
        question: "Will you tell me if I should walk away?",
        answer:
          "We'll give you a breakdown: what's fine, what should change the price, what's a deal-breaker. You make the call.",
      },
    ],
    locationSlugs: ["spokane", "spokane-valley", "liberty-lake", "south-hill"],
    keywords: [
      "pre purchase inspection Spokane",
      "used car inspection Spokane",
      "mobile vehicle inspection Spokane",
      "pre purchase inspection Spokane Valley",
    ],
  },
];

export const locations: Location[] = [
  {
    slug: "spokane",
    name: "Spokane",
    seoTitle: "Mobile Mechanic in Spokane, WA",
    headline: "Mobile mechanic for Spokane — less downtime, clearer answers.",
    teaser:
      "From neighborhood driveways to workday parking lots, Spokane is our home base. We handle no-starts, brakes, diagnostics, and inspections on site — with oil changes available when they fit the route.",
    metaDescription:
      "Looking for a mobile mechanic in Spokane, WA? WrenchReady Mobile comes to your driveway or workplace for batteries, brakes, diagnostics, and inspections — with clear quotes and honest screening.",
    neighborhoods: ["Downtown Spokane", "North Spokane", "East Central", "Audubon"],
    routeHighlights: [
      "Residential driveways, office lots, and central parking make mobile service practical here.",
      "Good fit for no-start calls, brake work, diagnostics, and after-work appointments.",
      "The city's mix of neighborhoods supports tighter routes and more reliable arrival windows.",
      "Strong area for customers who want the repair handled without a tow or shop drop-off.",
    ],
    painPoints: [
      "Shop drop-offs can eat half a workday when the repair is routine.",
      "Parking, commute timing, and family schedules make short mobile visits far more practical.",
      "Spokane drivers want a straight answer about whether mobile service fits their job — not a vague promise that everything works everywhere.",
    ],
    serviceSlugs: [
      "battery-replacement",
      "brake-repair",
      "check-engine-diagnostics",
      "pre-purchase-inspection",
      "oil-change",
    ],
    faqs: [
      {
        question: "Do you cover all of Spokane?",
        answer:
          "We cover most of Spokane and focus on routes that let us show up on time. Send the address and we will confirm whether your location fits the current schedule.",
      },
      {
        question: "Can service happen at my workplace in Spokane?",
        answer:
          "Often yes, especially for maintenance, batteries, and many brake jobs. Parking restrictions and employer rules should be included with the request.",
      },
      {
        question: "Is Spokane your primary service area?",
        answer:
          "Yes. Spokane is our home base, which means the tightest routes, fastest response times, and the deepest service coverage.",
      },
    ],
    keywords: [
      "mobile mechanic Spokane WA",
      "mobile auto repair Spokane",
      "Spokane mobile mechanic",
      "mechanic at home Spokane",
    ],
    geo: { lat: 47.6588, lng: -117.4260 },
  },
  {
    slug: "spokane-valley",
    name: "Spokane Valley",
    seoTitle: "Mobile Mechanic in Spokane Valley, WA",
    headline: "Mobile mechanic for Spokane Valley — no drive to Spokane needed.",
    teaser:
      "No-start, brake, battery, and diagnostic work at your home or workplace in the Valley. Routine maintenance is also available when it fits the schedule.",
    metaDescription:
      "Need a mobile mechanic in Spokane Valley, WA? WrenchReady Mobile handles batteries, brakes, diagnostics, and inspections at your home or workplace in the Valley.",
    neighborhoods: ["Veradale", "Dishman", "Greenacres", "Opportunity"],
    routeHighlights: [
      "Residential density helps keep arrival windows tighter.",
      "Strong fit for multi-car households that want two jobs handled without two shop trips.",
      "After-work and Saturday appointments make sense here.",
      "Batteries, brakes, and routine maintenance are especially practical in Valley neighborhoods.",
    ],
    painPoints: [
      "Commuters in Spokane Valley often need maintenance handled without sacrificing the workday.",
      "Two-car and three-car households benefit from a mechanic that can service the vehicle where it already sits.",
      "Valley drivers want an honest answer about whether mobile service fits their address and schedule — not a vague promise.",
    ],
    serviceSlugs: [
      "battery-replacement",
      "brake-repair",
      "check-engine-diagnostics",
      "pre-purchase-inspection",
      "oil-change",
    ],
    faqs: [
      {
        question: "Do Spokane Valley appointments usually happen at home?",
        answer:
          "Many do — the Valley has great driveway and neighborhood access. Office-lot service also works well when you share the parking details early.",
      },
      {
        question: "Will you travel from Spokane into the Valley for a small job?",
        answer:
          "That depends on the day's schedule and how many other appointments are nearby. Send the details and we will tell you honestly whether the trip makes sense for your job.",
      },
      {
        question: "Is Spokane Valley service different from Spokane?",
        answer:
          "Travel time, parking, and the kinds of jobs we see are different enough that Valley appointments get their own scheduling. Send the address and we will confirm fit for your area.",
      },
    ],
    keywords: [
      "mobile mechanic Spokane Valley",
      "mobile auto repair Spokane Valley",
      "oil change Spokane Valley mobile",
      "battery replacement Spokane Valley",
    ],
    geo: { lat: 47.6732, lng: -117.2394 },
  },
  {
    slug: "liberty-lake",
    name: "Liberty Lake",
    seoTitle: "Mobile Mechanic in Liberty Lake, WA",
    headline: "Mobile mechanic in Liberty Lake — service without losing your afternoon.",
    teaser:
      "Batteries, brakes, diagnostics, and inspections at your driveway or office lot in Liberty Lake. Maintenance is available when it fits the schedule.",
    metaDescription:
      "Looking for a mobile mechanic in Liberty Lake, WA? WrenchReady Mobile covers battery, brake, diagnostic, and inspection jobs on site, with routine maintenance also available.",
    neighborhoods: ["River District", "Legacy Ridge", "Meadowwood", "Liberty Lake Village"],
    routeHighlights: [
      "Home driveways and workplace lots make on-site service practical.",
      "Higher-value jobs travel well here because the convenience payoff is clear.",
      "Great fit for inspections, diagnostics, batteries, and other scheduled visits.",
      "Useful for drivers who care as much about time certainty as the repair itself.",
    ],
    painPoints: [
      "Liberty Lake drivers often value time certainty as much as the repair itself.",
      "A quick mobile visit can be easier than reshuffling work or school pickup around a shop drop-off.",
      "Tighter scheduling still matters even in Liberty Lake — we confirm route fit before booking so the arrival window is reliable.",
    ],
    serviceSlugs: [
      "battery-replacement",
      "brake-repair",
      "check-engine-diagnostics",
      "pre-purchase-inspection",
      "oil-change",
    ],
    faqs: [
      {
        question: "Is Liberty Lake part of the regular service area?",
        answer:
          "Yes. Liberty Lake is part of the regular Spokane County service area. We confirm route fit when you book so the arrival window is reliable.",
      },
      {
        question: "Are workplace appointments possible in Liberty Lake?",
        answer:
          "Often yes. Office parking-lot service is one of the better use cases for mobile maintenance and battery work when access is straightforward.",
      },
      {
        question: "What kinds of Liberty Lake jobs make the most sense mobile?",
        answer:
          "Routine maintenance, batteries, diagnostics, and pre-purchase inspections are some of the cleanest fits because they pair well with on-site convenience.",
      },
    ],
    keywords: [
      "mobile mechanic Liberty Lake",
      "battery replacement Liberty Lake",
      "pre purchase inspection Liberty Lake",
      "mobile diagnostics Liberty Lake",
    ],
    geo: { lat: 47.6741, lng: -117.1073 },
  },
  {
    slug: "south-hill",
    name: "South Hill",
    seoTitle: "Mobile Mechanic in South Hill Spokane, WA",
    headline: "Mobile mechanic on South Hill — driveway service for families.",
    teaser:
      "We come to your driveway for no-starts, brakes, batteries, diagnostics, and inspections. No school-run logistics or waiting rooms. Oil changes available when they fit the schedule.",
    metaDescription:
      "Need a mobile mechanic on South Hill in Spokane, WA? WrenchReady Mobile comes to your driveway for batteries, brakes, diagnostics, and inspections. Maintenance available when it fits the schedule.",
    neighborhoods: ["Lincoln Heights", "Moran Prairie", "Comstock", "Manito"],
    routeHighlights: [
      "Residential driveways make at-home service practical.",
      "Family schedules create steady demand for after-school and after-work appointments.",
      "Batteries, brakes, inspections, and routine maintenance all fit well here.",
      "Good area for repeat household maintenance without shop logistics.",
    ],
    painPoints: [
      "Families on South Hill do not want a routine service to turn into a full afternoon of logistics.",
      "Driveway access, hill grades, and street parking all affect how mobile service works — we factor that in before scheduling.",
      "Not every repair in a hilly residential area is a great mobile fit, and we will tell you that upfront.",
    ],
    serviceSlugs: [
      "battery-replacement",
      "brake-repair",
      "check-engine-diagnostics",
      "pre-purchase-inspection",
      "oil-change",
    ],
    faqs: [
      {
        question: "Do at-home appointments work well on South Hill?",
        answer:
          "Yes, most South Hill neighborhoods have great driveway access for mobile service. Just mention the parking setup and any hill-grade concerns when you book.",
      },
      {
        question: "Is South Hill service different from the rest of Spokane?",
        answer:
          "The scheduling and access are a little different. South Hill has more residential driveways and family households, so appointment windows and the kinds of jobs we see tend to center on at-home convenience and repeat maintenance.",
      },
      {
        question: "Can you handle brakes and batteries on South Hill?",
        answer:
          "Those are two of the strongest local-fit jobs, along with routine maintenance and pre-purchase inspections.",
      },
    ],
    keywords: [
      "mobile mechanic South Hill Spokane",
      "mobile oil change South Hill Spokane",
      "mobile brake repair South Hill Spokane",
      "battery replacement South Hill Spokane",
    ],
    geo: { lat: 47.6309, lng: -117.4067 },
  },
  {
    slug: "downtown-spokane",
    name: "Downtown Spokane",
    seoTitle: "Mobile Mechanic in Downtown Spokane, WA",
    headline:
      "Battery, diagnostic, and no-start work during your lunch break.",
    teaser:
      "Park in your office lot, text us the spot number, stay at your desk. High-fit work gets the downtown treatment without pretending every repair belongs in a garage.",
    metaDescription:
      "Book a mobile mechanic in Downtown Spokane, WA. Battery, diagnostic, brake, and inspection work at your office lot or parking garage during the workday.",
    neighborhoods: ["West End", "Riverside", "Davenport District"],
    routeHighlights: [
      "Central location keeps arrival windows tight for downtown appointments",
      "Office-lot access makes weekday lunch-hour and end-of-day service practical",
      "Parking structures with adequate clearance work for most routine service",
      "Quick turnaround jobs like battery swaps and oil changes fit the downtown schedule well",
    ],
    painPoints: [
      "Leaving the office to drop off a car at a shop means lost productivity and an expensive rideshare back.",
      "Parking garages downtown are inconvenient for shops to reach, but perfect for a mobile mechanic who shows up where the vehicle already sits.",
    ],
    serviceSlugs: [
      "battery-replacement",
      "check-engine-diagnostics",
      "brake-repair",
      "pre-purchase-inspection",
      "oil-change",
    ],
    faqs: [
      {
        question:
          "Can you work on a car in a downtown parking garage?",
        answer:
          "Many garages work fine as long as there is adequate overhead clearance and a stable, level surface. Share your garage location when booking so we can confirm fit before scheduling.",
      },
      {
        question:
          "How do lunch-hour appointments work downtown?",
        answer:
          "Battery replacements and oil changes often fit inside a lunch break. We arrive on time, handle the job while you are at your desk, and text you when it is done.",
      },
      {
        question:
          "Is metered street parking okay for service?",
        answer:
          "Short-duration jobs like battery swaps can work at a meter, but longer services need a lot or garage spot. Mention the parking situation when you request so we can plan properly.",
      },
    ],
    keywords: [
      "mobile mechanic downtown Spokane",
      "oil change downtown Spokane",
      "battery replacement downtown Spokane WA",
      "lunch hour car service Spokane",
    ],
    geo: { lat: 47.6588, lng: -117.4260 },
    parentSlug: "spokane",
  },
  {
    slug: "north-spokane",
    name: "North Spokane",
    seoTitle: "Mobile Mechanic in North Spokane, WA",
    headline:
      "Service at your driveway, not downtown.",
    teaser:
      "No drive to the south side for a battery, brake, or diagnostic visit. No juggling pickups and drop-offs. We come to Five Mile, Indian Trail, wherever the route makes sense.",
    metaDescription:
      "Need a mobile mechanic in North Spokane? Battery, brake, diagnostic, and inspection work at your driveway. No shop drop-off required.",
    neighborhoods: ["Five Mile", "Indian Trail", "Shadle-Garland"],
    routeHighlights: [
      "Residential layouts with easy driveway access for on-site work",
      "After-work and Saturday appointments work well for family households",
      "North Side appointments group naturally for tighter arrival windows",
      "Multi-vehicle homes benefit most from repeat driveway visits",
    ],
    painPoints: [
      "Driving south into downtown or the Valley for a routine service eats an hour of family time each way.",
      "Scheduling two vehicles around a single shop visit means doubling the drop-off logistics.",
      "North Spokane families want a predictable arrival window, not a vague 'sometime today' promise.",
    ],
    serviceSlugs: [
      "battery-replacement",
      "check-engine-diagnostics",
      "brake-repair",
      "pre-purchase-inspection",
      "oil-change",
    ],
    faqs: [
      {
        question:
          "Do you come all the way up to Five Mile and Indian Trail?",
        answer:
          "Yes, North Spokane including Five Mile and Indian Trail is part of the regular service area. Route fit is confirmed when you book.",
      },
      {
        question:
          "Can you service multiple cars in one visit?",
        answer:
          "Absolutely. Multi-vehicle appointments are one of the best reasons to go mobile. Mention all the vehicles when you request so we can schedule enough time.",
      },
      {
        question:
          "Are evening appointments available in North Spokane?",
        answer:
          "Weeknight appointments are available by request and are popular in residential neighborhoods where people want service after the commute.",
      },
    ],
    keywords: [
      "mobile mechanic North Spokane",
      "oil change North Spokane WA",
      "brake repair North Spokane",
      "mobile auto repair north side Spokane",
    ],
    geo: { lat: 47.7148, lng: -117.4116 },
    parentSlug: "spokane",
  },
  {
    slug: "east-central-spokane",
    name: "East Central Spokane",
    seoTitle: "Mobile Mechanic in East Central Spokane, WA",
    headline:
      "Practical mobile repair for East Central households that need honest service without the shop markup.",
    teaser:
      "East Central is one of Spokane's most accessible neighborhoods for mobile work — compact blocks, curbside access, and households that benefit when the mechanic comes to them instead of the other way around. High-fit battery, brake, and diagnostic service at a fair price, right where the car sits.",
    metaDescription:
      "Mobile mechanic serving East Central Spokane. Battery, brake, and diagnostic work at your home. No tow or drop-off needed.",
    neighborhoods: ["Sprague District", "Liberty Park", "Napa-Lidgerwood"],
    routeHighlights: [
      "Compact neighborhood blocks keep travel between stops minimal",
      "Curbside and alley access works well for most routine service",
      "Budget-conscious households benefit most from shop-free convenience",
      "Central location bridges routes between downtown and the Valley",
    ],
    painPoints: [
      "A shop visit for a simple oil change or battery can cost an entire morning plus a ride back home.",
      "Households managing tight budgets need transparent pricing without surprise shop fees for the waiting room and the lift.",
    ],
    serviceSlugs: [
      "battery-replacement",
      "brake-repair",
      "check-engine-diagnostics",
      "pre-purchase-inspection",
      "oil-change",
    ],
    faqs: [
      {
        question:
          "Is curbside service an option in East Central?",
        answer:
          "Yes, as long as the vehicle is on a safe, stable surface with enough room to work. Street parking with adequate space works for most maintenance and battery jobs.",
      },
      {
        question:
          "Are your prices the same as a shop?",
        answer:
          "Mobile service eliminates the overhead of a bay, a waiting room, and a service counter. That keeps pricing competitive while you skip the drop-off entirely.",
      },
    ],
    keywords: [
      "mobile mechanic East Central Spokane",
      "affordable oil change East Central Spokane",
      "battery replacement East Central Spokane",
      "mobile auto repair East Central",
    ],
    geo: { lat: 47.6531, lng: -117.3877 },
    parentSlug: "spokane",
  },
  {
    slug: "veradale",
    name: "Veradale",
    seoTitle: "Mobile Mechanic in Veradale, WA",
    headline:
      "Driveway auto service for Veradale's multi-vehicle households and weekend warriors.",
    teaser:
      "Veradale's suburban layout and garage-lined streets make it one of the easiest areas in the Valley to service on site. Families juggling two or three vehicles get every car maintained without a single shop trip — just pull it out of the garage and the mechanic handles the rest.",
    metaDescription:
      "Mobile mechanic in Veradale, WA. Oil changes, brakes, batteries & pre-purchase inspections at your driveway. No shop drop-off for Spokane Valley families.",
    neighborhoods: ["Sullivan Corridor", "Vista Meadows", "Valleyway"],
    routeHighlights: [
      "Suburban driveways and wide streets provide ideal workspace",
      "Multi-vehicle homes create natural opportunities for bundled visits",
      "Close proximity to I-90 keeps route logistics efficient",
      "Pre-purchase inspections thrive with private-party used car sales in the area",
    ],
    painPoints: [
      "Driving each vehicle to the shop individually turns a simple maintenance cycle into a week-long project.",
      "Weekend plans evaporate when the shop is 20 minutes away and the wait is two hours.",
      "Used car buyers in Veradale need a second opinion at the seller's driveway, not at a shop across town.",
    ],
    serviceSlugs: [
      "oil-change",
      "brake-repair",
      "battery-replacement",
      "pre-purchase-inspection",
    ],
    faqs: [
      {
        question:
          "Can you service all three of our family vehicles in one visit?",
        answer:
          "Yes, multi-vehicle driveway appointments are one of the best uses of mobile service. Let us know the vehicles and services when you book so the schedule has enough time.",
      },
      {
        question:
          "Do you do pre-purchase inspections in Veradale?",
        answer:
          "Absolutely. Veradale has plenty of private-party listings, and meeting at the seller's location is exactly how mobile inspections are designed to work.",
      },
      {
        question:
          "How far in advance should I book for a weekend appointment?",
        answer:
          "Saturday slots fill quickly. Requesting a few days ahead gives the best chance of a time that works, especially for multi-car visits.",
      },
    ],
    keywords: [
      "mobile mechanic Veradale",
      "oil change Veradale Spokane Valley",
      "brake repair Veradale WA",
      "pre-purchase inspection Veradale",
    ],
    geo: { lat: 47.6530, lng: -117.1890 },
    parentSlug: "spokane-valley",
  },
  {
    slug: "dishman",
    name: "Dishman",
    seoTitle: "Mobile Mechanic in Dishman, Spokane Valley, WA",
    headline:
      "Quick-turnaround mobile service for Dishman commuters who cannot afford a full day at the shop.",
    teaser:
      "Dishman sits right along the Valley's busiest commuter corridors, which means the car needs to be available when you are. Mobile service here replaces the shop detour with a driveway visit that fits around the daily commute instead of replacing it.",
    metaDescription:
      "Mobile mechanic in Dishman, Spokane Valley. Fast oil changes, brake service & battery replacement at your home. Skip the shop wait on Sprague Ave.",
    neighborhoods: ["Dishman Hills", "Sprague at Bowdish", "Bowdish Corridor"],
    routeHighlights: [
      "Dense residential streets keep appointment-to-appointment travel tight",
      "Close to the Sprague corridor, so appointments fit easily into the day",
      "Commuter households want fast turnaround without losing the vehicle",
      "Strong demand for batteries and brakes from high-mileage commuter cars",
    ],
    painPoints: [
      "Dropping the car at a shop on Sprague means finding a ride home and back — mobile service skips both trips.",
      "Commuter vehicles rack up miles fast, making convenient maintenance critical to avoiding bigger breakdowns.",
    ],
    serviceSlugs: [
      "oil-change",
      "brake-repair",
      "battery-replacement",
    ],
    faqs: [
      {
        question:
          "Can you work on my car while I am at home in Dishman?",
        answer:
          "That is the entire point. As long as the vehicle is parked somewhere safe and accessible, you do not need to be with it for most routine jobs.",
      },
      {
        question:
          "Is Dishman close enough for same-day appointments?",
        answer:
          "Dishman is one of the denser parts of the Valley, which makes it easier to fit into the day's route. Same-day depends on the current schedule, but the area is well-positioned.",
      },
    ],
    keywords: [
      "mobile mechanic Dishman",
      "oil change Dishman Spokane Valley",
      "battery replacement Dishman WA",
      "mobile brake repair Dishman",
    ],
    geo: { lat: 47.6607, lng: -117.2806 },
    parentSlug: "spokane-valley",
  },
  {
    slug: "greenacres",
    name: "Greenacres",
    seoTitle: "Mobile Mechanic in Greenacres, Spokane Valley, WA",
    headline:
      "Repeat-ready mobile maintenance for Greenacres families who keep their cars on schedule.",
    teaser:
      "Greenacres packs a lot of family vehicles into a tight residential footprint. That density is exactly why mobile service works so well here — regular oil changes, seasonal brake checks, and battery swaps happen at the house instead of eating into a Saturday at the shop.",
    metaDescription:
      "Mobile mechanic in Greenacres, Spokane Valley. Oil changes, brake repair, batteries & inspections at your home. Family car maintenance without the shop trip.",
    neighborhoods: ["Greenacres Road", "Barker Road area", "Trentwood"],
    routeHighlights: [
      "Tight residential density supports efficient multi-stop routing",
      "Family households with multiple vehicles drive repeat bookings",
      "Saturday morning appointment blocks are a natural fit here",
      "Used-car buying activity makes pre-purchase inspections a consistent request",
    ],
    painPoints: [
      "Keeping two or three family cars on a maintenance schedule is nearly impossible when each one requires a separate shop trip.",
      "The shop nearest Greenacres fills up fast — mobile service means no waitlist for a routine oil change.",
      "Parents managing school pickups and sports schedules need a service window that respects the family calendar.",
    ],
    serviceSlugs: [
      "oil-change",
      "brake-repair",
      "battery-replacement",
      "pre-purchase-inspection",
    ],
    faqs: [
      {
        question:
          "Do you come out to Greenacres regularly?",
        answer:
          "Yes. Greenacres is part of the core Spokane Valley service area, and residential density here makes it a natural stop on most route days.",
      },
      {
        question:
          "Can you inspect a used car I am thinking about buying in Greenacres?",
        answer:
          "That is exactly how pre-purchase inspections work. We meet at the seller's address, inspect the vehicle, and give you a practical summary before you commit.",
      },
      {
        question:
          "What if I need oil changes for two cars on the same day?",
        answer:
          "Multi-vehicle visits are encouraged. It is more efficient for the route and usually saves you time compared to scheduling two separate appointments.",
      },
    ],
    keywords: [
      "mobile mechanic Greenacres",
      "oil change Greenacres Spokane Valley",
      "brake repair Greenacres WA",
      "pre-purchase inspection Greenacres",
    ],
    geo: { lat: 47.6629, lng: -117.2244 },
    parentSlug: "spokane-valley",
  },
  {
    slug: "river-district",
    name: "River District",
    seoTitle: "Mobile Mechanic in River District, Liberty Lake, WA",
    headline:
      "Premium mobile auto service for River District professionals who expect precision and punctuality.",
    teaser:
      "The River District attracts households that chose Liberty Lake for quality of life — and that includes not wasting a morning at an auto shop. Diagnostics, maintenance, and inspections happen on your schedule, in your driveway, with clear communication from start to finish.",
    metaDescription:
      "Mobile mechanic in River District, Liberty Lake. Oil changes, diagnostics, battery service & pre-purchase inspections at your home. Professional-grade convenience.",
    neighborhoods: ["River District West", "Trailhead at Liberty Lake", "Harvard Road corridor"],
    routeHighlights: [
      "Newer developments with wide driveways and clean garage access",
      "Professional households book higher-value diagnostic and inspection work",
      "Quiet streets and planned layouts make on-site service seamless",
      "Liberty Lake appointments pair well with nearby stops in the same trip",
    ],
    painPoints: [
      "Professionals here value their time at a premium — a two-hour shop detour is not worth it for a 45-minute oil change.",
      "Newer vehicles with check-engine lights need a diagnostic first, not a guessing game at a counter.",
    ],
    serviceSlugs: [
      "oil-change",
      "battery-replacement",
      "check-engine-diagnostics",
      "pre-purchase-inspection",
    ],
    faqs: [
      {
        question:
          "Can you service newer vehicles in the River District?",
        answer:
          "Yes. Routine maintenance, battery replacement, and diagnostics are fully compatible with newer models. We confirm vehicle compatibility when you book.",
      },
      {
        question:
          "How does diagnostic service work at my home?",
        answer:
          "We start with the symptom you describe, run a structured diagnostic workflow on site, and deliver findings in plain language. If the repair fits the mobile lane, we can often handle it the same visit or schedule a follow-up.",
      },
      {
        question:
          "Is the River District inside the regular Liberty Lake route?",
        answer:
          "Yes. The River District is one of the anchor neighborhoods in the Liberty Lake service area, making it a strong fit for scheduled and same-week appointments.",
      },
    ],
    keywords: [
      "mobile mechanic River District Liberty Lake",
      "oil change River District Liberty Lake",
      "check engine diagnostic Liberty Lake WA",
      "pre-purchase inspection River District",
    ],
    geo: { lat: 47.6771, lng: -117.1164 },
    parentSlug: "liberty-lake",
  },
  {
    slug: "legacy-ridge",
    name: "Legacy Ridge",
    seoTitle: "Mobile Mechanic in Legacy Ridge, Liberty Lake, WA",
    headline:
      "Garage-to-driveway auto service for Legacy Ridge families who keep their SUVs running without the shop shuffle.",
    teaser:
      "Legacy Ridge's planned community layout — wide streets, double garages, and family SUVs in every other driveway — is exactly the kind of environment mobile mechanics thrive in. Pull the vehicle out, we handle the rest, and you never leave the neighborhood.",
    metaDescription:
      "Mobile mechanic in Legacy Ridge, Liberty Lake. Brake repair, oil changes & battery service at your driveway. Family SUV maintenance without leaving home.",
    neighborhoods: ["Legacy Ridge Loop", "Country Vista Drive", "Molter Road area"],
    routeHighlights: [
      "Planned community with consistent driveway access and wide streets",
      "Family SUVs and crossovers dominate — bread-and-butter maintenance work",
      "Low-traffic streets create a safe, comfortable work environment",
      "Proximity to other Liberty Lake neighborhoods supports efficient routing",
    ],
    painPoints: [
      "Family SUVs need regular maintenance, but hauling kids out of car seats for a shop trip defeats the convenience of owning one.",
      "Legacy Ridge is far enough from the nearest shops that even a 'quick' oil change burns 90 minutes round-trip.",
    ],
    serviceSlugs: [
      "oil-change",
      "brake-repair",
      "battery-replacement",
    ],
    faqs: [
      {
        question:
          "Can you work in a Legacy Ridge driveway?",
        answer:
          "Yes. The driveways in Legacy Ridge are some of the best in the area for mobile service — flat, spacious, and easy to access.",
      },
      {
        question:
          "Do you service SUVs and crossovers?",
        answer:
          "They are the most common vehicles in this neighborhood and a great fit for mobile service. Mention the year, make, and model when requesting so we confirm everything upfront.",
      },
      {
        question:
          "How soon after moving in can I book?",
        answer:
          "Anytime. If the vehicle is parked at your Legacy Ridge address, you are in the service area. No account setup or membership required.",
      },
    ],
    keywords: [
      "mobile mechanic Legacy Ridge Liberty Lake",
      "oil change Legacy Ridge",
      "brake repair Legacy Ridge Liberty Lake",
      "mobile auto service Legacy Ridge WA",
    ],
    geo: { lat: 47.6700, lng: -117.1100 },
    parentSlug: "liberty-lake",
  },
  {
    slug: "meadowwood",
    name: "Meadowwood",
    seoTitle: "Mobile Mechanic in Meadowwood, Liberty Lake, WA",
    headline:
      "Maintenance-first mobile service for Meadowwood's established homes and aging vehicle fleets.",
    teaser:
      "Meadowwood is a settled neighborhood where vehicles have real miles on them and maintenance actually matters. Mobile service here is not about luxury — it is about keeping the daily driver reliable with brake checks, oil changes, and diagnostics that happen at the house instead of across town.",
    metaDescription:
      "Mobile mechanic in Meadowwood, Liberty Lake. Oil changes, brake service, batteries & diagnostics for established homes. Keep aging vehicles reliable at home.",
    neighborhoods: ["Meadowwood Lane", "Appleway corridor", "Henry Road area"],
    routeHighlights: [
      "Established homes with mature landscaping and easy street access",
      "Aging vehicles benefit from proactive maintenance and early diagnostics",
      "Owners in this neighborhood value long-term reliability over flash",
      "Maintenance-conscious households benefit from regular driveway visits",
    ],
    painPoints: [
      "Older vehicles need more frequent attention, and each shop trip adds friction that makes people skip maintenance.",
      "A check-engine light on a 10-year-old car needs a diagnostic, not a panic trip to the dealer.",
      "Meadowwood residents want practical advice about what to fix now versus what can wait, not a hard upsell.",
    ],
    serviceSlugs: [
      "oil-change",
      "brake-repair",
      "battery-replacement",
      "check-engine-diagnostics",
    ],
    faqs: [
      {
        question:
          "Is mobile service worthwhile for an older vehicle?",
        answer:
          "Often more worthwhile. Older cars benefit the most from regular maintenance and honest diagnostics, and mobile service removes the friction that makes owners skip visits.",
      },
      {
        question:
          "Can you diagnose a check-engine light on an older car at my house?",
        answer:
          "Yes. The diagnostic workflow is designed to start from the symptom and work forward. Older vehicles sometimes have more straightforward diagnostic paths than newer ones.",
      },
      {
        question:
          "Do you recommend what to fix now versus later?",
        answer:
          "Every visit includes Now / Soon / Monitor notes so you know what matters today and what can wait. That is especially useful for vehicles with accumulating miles.",
      },
    ],
    keywords: [
      "mobile mechanic Meadowwood Liberty Lake",
      "oil change Meadowwood Liberty Lake",
      "check engine diagnostic Meadowwood",
      "mobile brake repair Meadowwood WA",
    ],
    geo: { lat: 47.6670, lng: -117.1000 },
    parentSlug: "liberty-lake",
  },
  {
    slug: "lincoln-heights",
    name: "Lincoln Heights",
    seoTitle: "Mobile Mechanic in Lincoln Heights, South Hill Spokane, WA",
    headline:
      "At-home auto service for Lincoln Heights families who need the car back before the school run.",
    teaser:
      "Lincoln Heights sits right in the heart of South Hill's family corridor. The hill roads and packed school-zone mornings make a shop trip feel like an expedition. Mobile service flips the equation: the mechanic drives to you, works in the driveway, and the vehicle is ready without rearranging the entire day.",
    metaDescription:
      "Mobile mechanic in Lincoln Heights, South Hill Spokane. Oil changes, brakes, batteries & inspections at your home. Family-friendly driveway service.",
    neighborhoods: ["Lincoln Heights Village", "29th Avenue corridor", "Regal Street area"],
    routeHighlights: [
      "Central South Hill location keeps arrival windows tight for the area",
      "Family vehicles with steady maintenance needs create reliable repeat demand",
      "Driveway-friendly residential lots with clear access in most seasons",
      "Pre-purchase inspections pair well with the active used-car market nearby",
    ],
    painPoints: [
      "Navigating South Hill traffic to a shop and back can turn a 30-minute brake job into a three-hour ordeal.",
      "Families with one car need it back fast — a driveway appointment means the vehicle is never out of reach.",
      "Used car shoppers in Lincoln Heights benefit from inspections at the seller's house rather than a faraway shop.",
    ],
    serviceSlugs: [
      "oil-change",
      "brake-repair",
      "battery-replacement",
      "pre-purchase-inspection",
    ],
    faqs: [
      {
        question:
          "Do you work on hill driveways in Lincoln Heights?",
        answer:
          "Most Lincoln Heights driveways are workable. If the slope is steep or the surface is uneven, mention it when booking so we can confirm the setup is safe for the service.",
      },
      {
        question:
          "Can I schedule while the kids are at school?",
        answer:
          "That is one of the most popular windows. Mid-morning driveway appointments let the car get serviced and be ready before pickup time.",
      },
      {
        question:
          "Do you offer pre-purchase inspections in this area?",
        answer:
          "Yes. Lincoln Heights and the surrounding South Hill neighborhoods see plenty of private-party vehicle sales. We meet at the seller's address and give you a decision-ready summary.",
      },
    ],
    keywords: [
      "mobile mechanic Lincoln Heights Spokane",
      "oil change Lincoln Heights South Hill",
      "brake repair Lincoln Heights Spokane WA",
      "pre-purchase inspection Lincoln Heights",
    ],
    geo: { lat: 47.6392, lng: -117.3936 },
    parentSlug: "south-hill",
  },
  {
    slug: "moran-prairie",
    name: "Moran Prairie",
    seoTitle: "Mobile Mechanic in Moran Prairie, South Hill Spokane, WA",
    headline:
      "Repeat-friendly mobile maintenance for Moran Prairie's growing subdivisions and young families.",
    teaser:
      "Moran Prairie is expanding fast, and the new households moving in need reliable maintenance that keeps up with their pace. Newer subdivisions mean fresh driveways, two-car garages, and families that want oil changes and brake checks handled at home instead of across the hill at a crowded shop.",
    metaDescription:
      "Mobile mechanic in Moran Prairie, South Hill Spokane. Oil changes, brakes & battery replacement in newer subdivisions. Growing families, driveway service.",
    neighborhoods: ["Moran Vista", "Palouse Highway area", "57th Avenue corridor"],
    routeHighlights: [
      "Newer subdivisions with flat, wide driveways ideal for mobile work",
      "New households moving in means more families discovering mobile service",
      "Young families with multiple vehicles create strong repeat potential",
      "Southern South Hill position anchors routes toward Palouse Highway",
    ],
    painPoints: [
      "New residents have not found a trusted mechanic yet — mobile service meets them where they live from day one.",
      "Growing families add vehicles faster than they add free time for shop visits.",
    ],
    serviceSlugs: [
      "oil-change",
      "brake-repair",
      "battery-replacement",
    ],
    faqs: [
      {
        question:
          "Are the new subdivisions on Moran Prairie in the service area?",
        answer:
          "Yes. Newer developments around Moran Prairie are part of the South Hill coverage zone and typically have excellent driveway access for on-site service.",
      },
      {
        question:
          "Can you maintain our cars on a regular schedule?",
        answer:
          "That is the goal. After the first visit, we can set reminders based on your mileage and driving patterns so the next oil change or brake check is never a surprise.",
      },
      {
        question:
          "Do you work on newer vehicles with warranty considerations?",
        answer:
          "Routine maintenance like oil changes and brake work does not void manufacturer warranties when performed to spec with quality parts. We document everything clearly.",
      },
    ],
    keywords: [
      "mobile mechanic Moran Prairie Spokane",
      "oil change Moran Prairie South Hill",
      "brake repair Moran Prairie WA",
      "mobile auto service Moran Prairie",
    ],
    geo: { lat: 47.6170, lng: -117.3700 },
    parentSlug: "south-hill",
  },
  {
    slug: "comstock",
    name: "Comstock",
    seoTitle: "Mobile Mechanic in Comstock, South Hill Spokane, WA",
    headline:
      "Neighborhood-scale mobile service for Comstock's established homes and the families who have stayed for decades.",
    teaser:
      "Comstock's tree-lined blocks near Manito Park are home to older houses, well-loved vehicles, and residents who prefer a mechanic they can trust over a faceless chain. Mobile service fits the neighborhood character: personal, practical, and built around keeping the car on the road without the shop detour.",
    metaDescription:
      "Mobile mechanic in Comstock, South Hill Spokane. Oil changes, brakes, batteries & diagnostics for established families near Manito Park. Honest driveway service.",
    neighborhoods: ["Manito Park area", "Grand Boulevard corridor", "33rd Avenue"],
    routeHighlights: [
      "Walkable neighborhood with steady residential density and mature lots",
      "Established families maintain vehicles long-term, driving repeat service",
      "Proximity to Manito Park and Grand Boulevard creates recognizable landmarks",
      "Mix of older and newer vehicles means diverse service needs in a compact area",
    ],
    painPoints: [
      "Older homes near Manito mean street parking and tight lots — a mobile mechanic adapts to the space instead of requiring a shop bay.",
      "Established families do not want to start over with a new shop. They want consistent service from someone who remembers their car.",
      "A check-engine light on a reliable older vehicle needs context, not a sales pitch for a new car.",
    ],
    serviceSlugs: [
      "oil-change",
      "brake-repair",
      "battery-replacement",
      "check-engine-diagnostics",
    ],
    faqs: [
      {
        question:
          "Can you work on street-parked vehicles near Manito Park?",
        answer:
          "Yes, as long as the spot has enough space and the vehicle will not need to move during service. Mention the parking situation when you book so we can plan appropriately.",
      },
      {
        question:
          "Do you work on older vehicles that might need more attention?",
        answer:
          "Older vehicles are some of the best candidates for mobile service. Regular maintenance and honest diagnostics keep them reliable without the hassle of repeated shop visits.",
      },
      {
        question:
          "Is Comstock inside the regular South Hill service area?",
        answer:
          "Yes. Comstock is one of the core South Hill neighborhoods and a natural fit on most route days given its central location and residential density.",
      },
    ],
    keywords: [
      "mobile mechanic Comstock Spokane",
      "oil change Comstock South Hill",
      "check engine diagnostic Comstock Spokane",
      "battery replacement Comstock South Hill WA",
    ],
    geo: { lat: 47.6400, lng: -117.4200 },
    parentSlug: "south-hill",
  },
];

export type Market = {
  slug: string;
  name: string;
  state: string;
  stateCode: string;
  cities: string[];
};

export const markets: Market[] = [
  {
    slug: "spokane-county",
    name: "Spokane County",
    state: "Washington",
    stateCode: "WA",
    cities: ["spokane", "spokane-valley", "liberty-lake", "south-hill"],
  },
];

export function getServiceBySlug(slug: string) {
  return services.find((service) => service.slug === slug);
}

export function getLocationBySlug(slug: string) {
  return locations.find((location) => location.slug === slug);
}

export function getCityLocations() {
  return locations.filter((l) => !l.parentSlug);
}

export function getNeighborhoodLocations() {
  return locations.filter((l) => !!l.parentSlug);
}

export function getChildLocations(parentSlug: string) {
  return locations.filter((l) => l.parentSlug === parentSlug);
}

export function getSiblingLocations(location: Location) {
  if (!location.parentSlug) return [];
  return locations.filter(
    (l) => l.parentSlug === location.parentSlug && l.slug !== location.slug,
  );
}

export function getLocationsByService(serviceSlug: string) {
  return locations.filter((l) => l.serviceSlugs.includes(serviceSlug));
}

export function getMarketForCity(citySlug: string) {
  return markets.find((m) => m.cities.includes(citySlug));
}
