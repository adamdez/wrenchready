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
};

export const siteConfig = {
  name: "Wrench Ready Mobile",
  domain: "https://wrenchreadymobile.com",
  locale: "en_US",
  city: "Spokane",
  state: "Washington",
  stateCode: "WA",
  description:
    "Wrench Ready Mobile delivers high-trust maintenance, brake service, battery replacement, diagnostics, and pre-purchase inspections across Spokane County without the shop drop-off.",
  shortDescription:
    "Mobile auto service built around trust, clarity, and protecting your time.",
  areaServed: ["Spokane", "Spokane Valley", "Liberty Lake", "South Hill"],
  contact: {
    email: "admin@wrenchreadymobile.com",
    phoneDisplay: "(509) 309-0617",
    phoneHref: "tel:+15093090617",
    smsHref: "sms:+15093090617",
    schedule: "Weeknight and Saturday appointments by request",
  },
  globalKeywords: [
    "mobile mechanic Spokane WA",
    "mobile auto repair Spokane",
    "mobile oil change Spokane",
    "mobile brake repair Spokane",
    "battery replacement Spokane",
    "check engine light diagnostic Spokane",
    "pre purchase inspection Spokane",
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
    kicker: "Earn The Next Visit",
    title: "Every job should make the next booking easier.",
    copy:
      "Recommendations are framed around honesty, evidence, and what actually helps the customer, not what inflates one invoice.",
  },
  {
    kicker: "Protect Wrench Time",
    title: "Admin, routing, and follow-up exist to keep Simon producing.",
    copy:
      "The business is engineered so the wrench stays on paid work while intake, scheduling, reminders, and communication are handled cleanly around it.",
  },
  {
    kicker: "Driveway-Safe Scope",
    title: "Focused service lanes beat pretending every repair is mobile.",
    copy:
      "Routine maintenance, brake work, batteries, diagnostics, and inspections are the lanes that build repeat business without sacrificing reliability.",
  },
] as const;

export const trustPoints = [
  {
    kicker: "Clarity",
    title: "Photo-backed findings and plain-language next steps",
    copy:
      "Customers should know what was done, what was found, and what matters now versus later.",
  },
  {
    kicker: "Convenience",
    title: "Home, driveway, curb, or workplace",
    copy:
      "The value is not only the repair. It is the time, ride coordination, and drop-off friction you never have to deal with.",
  },
  {
    kicker: "Discipline",
    title: "Tight route planning for better arrival windows",
    copy:
      "Coverage is intentionally focused so schedule promises stay believable and repeatable.",
  },
  {
    kicker: "Growth",
    title: "Built to convert local search and future ads",
    copy:
      "The service and city structure already supports stronger Google Ads message match once campaigns go live.",
  },
] as const;

export const proofStatements = [
  "Spokane is the proving ground for a regional operating system, not a random side hustle.",
  "The model is built around high-frequency, driveway-safe work with real repeat value.",
  "The public promise is simple: convenient, honest mobile service with clearer communication than a rushed counter visit.",
] as const;

export const customerBenefits = [
  "No tow bill for a battery, brake, or no-start visit",
  "No waiting room for routine service or inspection work",
  "Written priorities instead of vague upsells",
  "A cleaner service record you can actually revisit later",
] as const;

export const scopeGuardrails = [
  "No internal engine or transmission rebuild work",
  "No lift-dependent repairs or heavy rust battles",
  "No open-ended diagnostics without a defined first step",
  "No pretending every vehicle problem is a great mobile fit",
] as const;

export const processSteps = [
  {
    title: "Send the vehicle, symptom, and address",
    copy:
      "Year, make, model, the service or issue, and where the car is parked qualify most requests fast.",
  },
  {
    title: "We screen fit before promising a slot",
    copy:
      "The route, parking setup, and service lane all get checked before the appointment is confirmed.",
  },
  {
    title: "Service happens where the vehicle already is",
    copy:
      "Routine maintenance and light repair are completed on site with inspection notes and practical communication throughout.",
  },
  {
    title: "You leave with a smarter next step",
    copy:
      "The goal is not just one invoice. It is a cleaner plan for what matters now, soon, and later.",
  },
] as const;

export const serviceLaneHighlights = [
  "Routine maintenance that keeps family and commuter vehicles on schedule",
  "Brake and battery work with strong urgency and local search intent",
  "Symptom-based diagnostics that lead to real decisions instead of part guessing",
  "Pre-purchase inspections that build authority before the first repair sale",
] as const;

export const homeFaqs: Faq[] = [
  {
    question: "What kind of work does Wrench Ready Mobile focus on first?",
    answer:
      "The launch site is built around routine maintenance, brake service, battery replacement, diagnostics, and pre-purchase inspections because those are high-demand, driveway-safe jobs with strong repeat value.",
  },
  {
    question: "Do I need to know the exact repair before I book?",
    answer:
      "No. If the issue is a symptom, start with diagnostics. The business is designed to give you a clearer first answer before guessing at parts.",
  },
  {
    question: "Why is the service area focused instead of broad?",
    answer:
      "Because tight service zones protect punctuality, customer experience, and billable wrench time. Strong local density beats overpromising a giant map.",
  },
  {
    question: "Why separate service pages and city pages this early?",
    answer:
      "Because local SEO and Google Ads both work better when each page matches a specific service intent or geographic search instead of forcing everything into one generic homepage.",
  },
];

export const services: Service[] = [
  {
    slug: "oil-change",
    name: "Mobile Oil Change",
    seoTitle: "Mobile Oil Change in Spokane, WA",
    headline: "Oil change service that happens where the vehicle already sits.",
    teaser:
      "Synthetic and synthetic-blend oil changes with filter replacement, service light reset when possible, and a 25-point inspection that turns routine work into a smarter next visit.",
    metaDescription:
      "Book a mobile oil change in Spokane, WA with filter replacement, a 25-point inspection, and honest next-step recommendations at your home or workplace.",
    priceFrom: "From $85",
    duration: "45-60 minutes",
    idealFor: [
      "Commuter cars and family SUVs that need routine maintenance without a drop-off",
      "Busy professionals who would rather stay at work while the service happens",
      "Owners who want inspection notes and timing guidance, not just a windshield sticker",
    ],
    includes: [
      "Oil and filter replacement based on the vehicle's requirements",
      "Fluid, leak, light, tire, and visible wear inspection",
      "Service light reset when the vehicle allows it",
      "Clear Now / Soon / Monitor recommendations when anything else stands out",
    ],
    trustPoints: [
      "Oil changes become repeat-booking engines when the inspection is useful and honest",
      "Routine maintenance is one of the strongest mobile-fit jobs for homes and workplaces",
      "The page sets expectations clearly instead of implying a full-shop menu",
    ],
    whyItWins: [
      "High search frequency with strong local relevance",
      "Great fit for home and office convenience messaging",
      "Natural path into repeat maintenance reminders and deferred work",
      "Strong landing-page match for future Google Ads",
    ],
    faqs: [
      {
        question: "Do I need to stay with the vehicle during the oil change?",
        answer:
          "Not necessarily. As long as the vehicle is accessible and the parking setup is safe, many customers keep working nearby while the service happens.",
      },
      {
        question: "Do you reset the maintenance light?",
        answer:
          "Yes, when the vehicle allows it and the service is complete. If a manufacturer-specific procedure is required, that becomes part of the visit review.",
      },
      {
        question: "Is this just a quick drain-and-fill?",
        answer:
          "No. The service lane is designed to include useful inspection context so small issues are caught early and the next visit is easier to plan.",
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
    headline: "Brake service without the tow, the waiting room, or the half-day detour.",
    teaser:
      "Front or rear brake service with clear inspection notes, safe fit screening, torque-critical discipline, and transparent next steps for Spokane drivers who need the car back fast.",
    metaDescription:
      "Need mobile brake repair in Spokane, WA? Wrench Ready Mobile handles brake pad and rotor service at your home or workplace with clear inspection notes.",
    priceFrom: "From $280 per axle",
    duration: "1.5-2.5 hours",
    idealFor: [
      "Drivers hearing squealing or grinding and wanting a clean first answer before the car gets worse",
      "Families who cannot spare the logistics of dropping off a vehicle for common brake work",
      "Customers who value inspection notes and practical follow-up instead of vague counter talk",
    ],
    includes: [
      "Brake system inspection focused on pad, rotor, and visible hardware condition",
      "Pad and rotor replacement for qualifying vehicles and safe locations",
      "Torque-critical closeout and post-service check procedure",
      "Written notes on anything that should be handled now, soon, or monitored",
    ],
    trustPoints: [
      "Brake work converts best when scope is clear and site safety is screened first",
      "The page makes it obvious that not every brake complaint is the same repair",
      "Clear process protects customer safety and schedule reliability",
    ],
    whyItWins: [
      "Strong urgency intent from real search behavior",
      "High-value service lane with immediate practical benefit",
      "Excellent message match for future Google Ads",
      "Easy to explain before-and-after value on the page",
    ],
    faqs: [
      {
        question: "Can you replace brakes in an apartment lot or office parking area?",
        answer:
          "Often yes, provided the surface is safe and the vehicle can stay parked for the service window. Parking restrictions and tight access should be mentioned in the first message.",
      },
      {
        question: "What if the noise is not just pads and rotors?",
        answer:
          "That is why the appointment starts with brake inspection and fit screening, not a blind parts swap. If the car needs a different first step, the visit should surface it quickly.",
      },
      {
        question: "Do you handle every brake issue mobile?",
        answer:
          "No. Common brake service is a great mobile fit, while more complex hydraulic, rust-heavy, or access-limited cases may need a different plan.",
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
    headline: "No-start battery help where the vehicle already sits.",
    teaser:
      "Battery testing and replacement for Spokane drivers who need a fast, trustworthy answer in the driveway, at work, or in a parking lot before the day falls apart.",
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
      "Battery test and installation on qualifying vehicles",
      "Terminal and basic charging-system observations during the visit",
      "Core handling and cleanup notes when required",
      "Clear direction if the failure points somewhere beyond the battery itself",
    ],
    trustPoints: [
      "Urgent no-start traffic converts better when the page promises clarity first",
      "Battery pages are natural entry points for repeat customers and review requests",
      "Testing before replacing helps the brand feel honest instead of opportunistic",
    ],
    whyItWins: [
      "Strong emergency search intent",
      "Simple, high-clarity promise for the landing page",
      "Fast turnaround that matches mobile convenience",
      "Natural bridge into charging-system and starter follow-up",
    ],
    faqs: [
      {
        question: "Can you come to my house if the car will not start?",
        answer:
          "Yes. That is one of the clearest mobile-fit jobs. Send the address, parking setup, and what the vehicle is doing now so the request can be screened quickly.",
      },
      {
        question: "What if the battery is not the real problem?",
        answer:
          "The service lane starts with testing. If the issue points toward the starter, alternator, or another electrical fault, the next step should be explained before guessing at parts.",
      },
      {
        question: "How long does mobile battery replacement take?",
        answer:
          "Most qualifying battery replacements fit comfortably inside a short on-site visit once the correct battery and location details are confirmed.",
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
    headline: "A diagnostic visit built around symptoms, not guesses.",
    teaser:
      "When the check-engine light turns on or the vehicle starts acting up, Wrench Ready Mobile begins with a structured diagnostic appointment so the next decision is grounded in evidence.",
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
      "Symptom intake and basic diagnostic workflow for qualifying vehicles",
      "Code scan and context review as part of the visit, not as the whole answer",
      "Repair recommendation or next-step plan based on the findings",
      "Diagnostic fee can be credited toward approved repair where appropriate",
    ],
    trustPoints: [
      "The page avoids pretending a warning light equals one part",
      "Explaining the process builds more trust than listing random components",
      "This is where the brand proves it can slow down and think, not just sell",
    ],
    whyItWins: [
      "High-intent search traffic with strong conversion value",
      "Better fit for symptom-based searches than generic repair pages",
      "Excellent bridge into repair approval and follow-up work",
      "Natural opportunity to establish authority and honesty",
    ],
    faqs: [
      {
        question: "If the check-engine light is on, do I book a repair or a diagnostic visit?",
        answer:
          "Start with diagnostics unless the repair is already verified. Most customers search the symptom first, so the site is built to meet that reality honestly.",
      },
      {
        question: "Do you credit the diagnostic fee toward the repair?",
        answer:
          "Often yes, when the repair is approved and the job fits the mobile service lane. Diagnostics should lead to decisions, not dead ends.",
      },
      {
        question: "Can every warning-light issue be handled mobile?",
        answer:
          "No. Some cases need more time, more tooling, or a shop environment. Screening the symptom and the vehicle context first is part of protecting customer trust.",
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
    headline: "A second set of trained eyes before you buy the car.",
    teaser:
      "Mobile pre-purchase inspections help Spokane buyers move with more confidence by checking the vehicle at the seller's location and flagging the issues that matter most.",
    metaDescription:
      "Need a pre-purchase inspection in Spokane, WA? Wrench Ready Mobile checks used vehicles on site and gives buyers a clearer picture before money changes hands.",
    priceFrom: "From $150",
    duration: "45-75 minutes",
    idealFor: [
      "Private-party vehicle buyers who need an independent mechanical look before committing",
      "Families comparing multiple used vehicles and trying to avoid the wrong one",
      "Customers who value a plain-language explanation more than a rushed thumbs-up",
    ],
    includes: [
      "On-site visual and functional inspection for qualifying vehicles",
      "Check of obvious leaks, lights, wear items, and warning indicators",
      "A practical summary of what should stop the deal, change the price, or simply be watched",
      "Clear documentation that can be revisited after the appointment",
    ],
    trustPoints: [
      "Inspection pages position the brand as an advisor before it becomes a repair option",
      "This service helps earn referrals because it puts honesty ahead of the sale",
      "The copy avoids pretending the inspection replaces a full lift inspection",
    ],
    whyItWins: [
      "Excellent trust builder for a young brand",
      "Strong long-tail organic intent",
      "Creates referral opportunities even when no repair is sold that day",
      "Builds authority for future maintenance work after the purchase",
    ],
    faqs: [
      {
        question: "Can you inspect a used car at the seller's house or lot?",
        answer:
          "Yes, when the vehicle access and location are workable. The first message should include the address, the vehicle details, and any timing limits from the seller.",
      },
      {
        question: "Is this the same as a full shop inspection?",
        answer:
          "No. It is a mobile-fit inspection built to catch obvious concerns, warning signs, and deal-changing issues before you buy.",
      },
      {
        question: "Will you tell me if I should walk away?",
        answer:
          "The goal is to give you a usable decision brief: what is fine, what should affect the price, and what should make you keep shopping.",
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
    headline: "Mobile mechanic coverage for Spokane drivers who need less downtime and clearer answers.",
    teaser:
      "From neighborhood driveways to workday parking lots, Spokane is the launch market for Wrench Ready Mobile's maintenance, brake, battery, diagnostic, and inspection lanes.",
    metaDescription:
      "Looking for a mobile mechanic in Spokane, WA? Wrench Ready Mobile is building focused service routes for oil changes, brake work, battery replacement, diagnostics, and inspections.",
    neighborhoods: ["Downtown Spokane", "North Spokane", "East Central", "Audubon"],
    routeHighlights: [
      "Broadest mix of residential driveways and workday parking demand",
      "High search volume for urgent battery, brake, and diagnostic requests",
      "Strong fit for weeknight appointments after work hours",
      "Foundational city page for organic rankings and future city campaigns",
    ],
    painPoints: [
      "Shop drop-offs can eat half a workday when the repair is routine.",
      "Parking, commute timing, and family schedules make short mobile visits far more practical.",
      "Drivers need a simple explanation of fit fast, not a vague promise that every job can be handled anywhere.",
    ],
    serviceSlugs: [
      "oil-change",
      "brake-repair",
      "battery-replacement",
      "check-engine-diagnostics",
    ],
    faqs: [
      {
        question: "Do you cover all of Spokane?",
        answer:
          "The site starts with Spokane routes that make sense operationally, not with vague everywhere-service claims. Send the address and the appointment request flow will help confirm fit.",
      },
      {
        question: "Can service happen at my workplace in Spokane?",
        answer:
          "Often yes, especially for maintenance, batteries, and many brake jobs. Parking restrictions and employer rules should be included with the request.",
      },
      {
        question: "Is Spokane the main launch market?",
        answer:
          "Yes. Spokane is the proving ground for the business model, which is why this city has the deepest service coverage from the start.",
      },
    ],
    keywords: [
      "mobile mechanic Spokane WA",
      "mobile auto repair Spokane",
      "Spokane mobile mechanic",
      "mechanic at home Spokane",
    ],
  },
  {
    slug: "spokane-valley",
    name: "Spokane Valley",
    seoTitle: "Mobile Mechanic in Spokane Valley, WA",
    headline: "Mobile mechanic service for Spokane Valley homes, commuters, and household fleets.",
    teaser:
      "Spokane Valley is one of the strongest early coverage zones for Wrench Ready Mobile thanks to dense neighborhoods, practical parking, and repeat maintenance demand.",
    metaDescription:
      "Need a mobile mechanic in Spokane Valley, WA? Wrench Ready Mobile is building focused local service routes for oil changes, brakes, batteries, and diagnostics.",
    neighborhoods: ["Veradale", "Dishman", "Greenacres", "Opportunity"],
    routeHighlights: [
      "Dense residential routes support better arrival windows",
      "Household multi-car maintenance needs create repeat-visit potential",
      "Strong fit for after-work appointments and Saturday service blocks",
      "Natural city page for batteries, brakes, and routine maintenance",
    ],
    painPoints: [
      "Commuters in Spokane Valley often need maintenance handled without sacrificing the workday.",
      "Two-car and three-car households benefit from a mechanic that can service the vehicle where it already sits.",
      "A location-specific page keeps Valley traffic from landing on a generic Spokane promise.",
    ],
    serviceSlugs: [
      "oil-change",
      "brake-repair",
      "battery-replacement",
      "pre-purchase-inspection",
    ],
    faqs: [
      {
        question: "Do Spokane Valley appointments usually happen at home?",
        answer:
          "Many do, because the Valley has strong driveway and neighborhood access. Office-lot service can also work when the location details are shared early.",
      },
      {
        question: "Will you travel from Spokane into the Valley for a small job?",
        answer:
          "That depends on route density and timing. The page exists so Valley requests can be screened against a realistic local route, not a vague maybe.",
      },
      {
        question: "Why does Spokane Valley have its own page?",
        answer:
          "Because search intent, travel time, and service expectations are different enough that the area deserves its own local copy and conversion path.",
      },
    ],
    keywords: [
      "mobile mechanic Spokane Valley",
      "mobile auto repair Spokane Valley",
      "oil change Spokane Valley mobile",
      "battery replacement Spokane Valley",
    ],
  },
  {
    slug: "liberty-lake",
    name: "Liberty Lake",
    seoTitle: "Mobile Mechanic in Liberty Lake, WA",
    headline: "Mobile mechanic support for Liberty Lake drivers who need convenience without cutting corners.",
    teaser:
      "Liberty Lake routes are built for busy professionals, household SUVs, and used-car inspections where a mobile visit saves time and adds clarity.",
    metaDescription:
      "Looking for a mobile mechanic in Liberty Lake, WA? Wrench Ready Mobile covers qualifying maintenance, battery, diagnostic, and inspection jobs on site.",
    neighborhoods: ["River District", "Legacy Ridge", "Meadowwood", "Liberty Lake Village"],
    routeHighlights: [
      "Strong fit for home and office parking-lot service",
      "High-value appointments justify the longer route more often",
      "Great local match for pre-purchase inspections and diagnostics",
      "Ideal for a clean suburban convenience message",
    ],
    painPoints: [
      "Liberty Lake drivers often value time certainty as much as the repair itself.",
      "A quick mobile visit can be easier than reshuffling work or school pickup around a shop drop-off.",
      "The page stays honest about routing because tighter scheduling still matters even in high-value areas.",
    ],
    serviceSlugs: [
      "battery-replacement",
      "check-engine-diagnostics",
      "pre-purchase-inspection",
      "oil-change",
    ],
    faqs: [
      {
        question: "Is Liberty Lake part of the regular service area?",
        answer:
          "Yes, for qualifying requests that fit the route and service lane. Liberty Lake is important enough to have its own page, but the business still screens for schedule fit first.",
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
  },
  {
    slug: "south-hill",
    name: "South Hill",
    seoTitle: "Mobile Mechanic in South Hill Spokane, WA",
    headline: "Mobile mechanic service for South Hill households that want honest maintenance without the shop shuffle.",
    teaser:
      "South Hill is a strong early coverage zone thanks to family vehicles, neighborhood driveways, and the kind of routine maintenance demand mobile service handles well.",
    metaDescription:
      "Need a mobile mechanic on South Hill in Spokane, WA? Wrench Ready Mobile is building focused routes for oil changes, brakes, batteries, and inspections.",
    neighborhoods: ["Lincoln Heights", "Moran Prairie", "Comstock", "Manito"],
    routeHighlights: [
      "Residential density makes repeat maintenance visits more efficient",
      "Family schedules create strong demand for at-home service windows",
      "Brake, oil, and inspection requests are a natural fit here",
      "Ideal local page for convenience-led messaging and repeat booking",
    ],
    painPoints: [
      "Families on South Hill do not want a routine service to turn into a full afternoon of logistics.",
      "A local page helps signal that the service understands neighborhood access and real schedule pressure.",
      "Clear scope matters because not every repair in a hilly residential area is a great mobile fit.",
    ],
    serviceSlugs: [
      "oil-change",
      "brake-repair",
      "battery-replacement",
      "pre-purchase-inspection",
    ],
    faqs: [
      {
        question: "Do at-home appointments work well on South Hill?",
        answer:
          "Yes, many of the neighborhood setups are exactly why a focused South Hill page makes sense. Safe driveway access and clear parking notes still matter.",
      },
      {
        question: "Why separate South Hill from Spokane on the site?",
        answer:
          "Because the service promise is slightly different. South Hill pages lean into residential convenience and repeat household maintenance needs.",
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
  },
];

export function getServiceBySlug(slug: string) {
  return services.find((service) => service.slug === slug);
}

export function getLocationBySlug(slug: string) {
  return locations.find((location) => location.slug === slug);
}
