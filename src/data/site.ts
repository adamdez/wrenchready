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

export type Review = {
  name: string;
  vehicle: string;
  service: string;
  rating: number;
  text: string;
};

export const reviews: Review[] = [
  {
    name: "Marcus T.",
    vehicle: "2019 Toyota RAV4",
    service: "Mobile Oil Change",
    rating: 5,
    text: "Simon showed up right on time, changed the oil in my driveway, and then walked me through a list of things he noticed during the inspection. No pressure, just clear notes on what matters now versus later. Already booked the next one.",
  },
  {
    name: "Jessica R.",
    vehicle: "2017 Honda CR-V",
    service: "Brake Service",
    rating: 5,
    text: "I was hearing a grinding sound and dreading the shop visit. Simon came to my house, inspected everything, and replaced the front pads and rotors same day. The photo report afterward was incredibly helpful — I could actually see what was done.",
  },
  {
    name: "David & Claire K.",
    vehicle: "2020 Subaru Outback",
    service: "Pre-Purchase Inspection",
    rating: 5,
    text: "We were buying a used Outback from a private seller. Simon met us at their house, inspected the whole vehicle, and sent us a photo report with every finding documented. His summary broke it into what was fine, what to negotiate on, and what to walk away from. We used his notes to drop the price by $800.",
  },
  {
    name: "Angela M.",
    vehicle: "2016 Ford Escape",
    service: "Battery Replacement",
    rating: 5,
    text: "Car would not start Monday morning before work. Simon tested the battery on-site, confirmed it was the issue, and had a new one installed before my first meeting. He also flagged a corroded terminal and a tired serpentine belt in his Now / Soon / Monitor notes — clear next steps instead of a surprise breakdown later.",
  },
  {
    name: "Tom L.",
    vehicle: "2018 Chevy Silverado",
    service: "Check Engine Diagnostics",
    rating: 5,
    text: "Check engine light came on and I had no idea what to expect. Simon ran the diagnostics in my driveway, explained what the codes meant in plain English, and gave me a Now / Soon / Monitor breakdown. No scare tactics, just honest answers.",
  },
];

export const homeFaqs: Faq[] = [
  {
    question: "What kind of work does Wrench Ready Mobile focus on?",
    answer:
      "We focus on five driveway-safe service lanes: routine maintenance (oil changes), brake service, battery replacement, check-engine diagnostics, and pre-purchase inspections. These are high-demand jobs with strong repeat value that work well in a home or workplace setting. We deliberately avoid vague 'we do everything' promises because focused lanes mean better results, better parts availability, and more predictable scheduling.",
  },
  {
    question: "Do I need to know the exact repair before I book?",
    answer:
      "Not at all. If you are dealing with a symptom — a noise, a warning light, or something that just does not feel right — start with a diagnostic visit. The business is designed to give you a clearer first answer before anyone starts guessing at parts. Send us the vehicle, the symptom, and your location, and we will screen the job and explain what the right first step looks like.",
  },
  {
    question: "What is the Now / Soon / Monitor framework?",
    answer:
      "After every service or inspection, you receive prioritized recommendations sorted into three buckets: Now (needs attention before the next drive or very soon), Soon (should be scheduled in the coming weeks), and Monitor (worth watching but not urgent). This framework replaces vague upsells with evidence-based planning so you always know what actually matters and what can wait.",
  },
  {
    question: "Why is the service area focused instead of county-wide?",
    answer:
      "Tight service zones protect punctuality, customer experience, and billable wrench time. When routes are focused, arrival windows stay realistic and repeatable. We would rather be reliably on time in a defined area than overpromise a giant map and leave customers waiting. As route density grows, the coverage area expands naturally.",
  },
  {
    question: "What does the 25-point inspection include?",
    answer:
      "Every qualifying visit includes a structured inspection covering fluids, filters, belts, hoses, tires, brakes, lights, battery condition, and visible wear items. You receive photo-backed findings and plain-language notes so nothing is a mystery. The inspection is designed to catch small issues early and give you a smarter plan for the next visit — not to generate a scare list.",
  },
  {
    question: "How quickly can I get an appointment?",
    answer:
      "Most requests are scheduled within the same week, often within a few days. Battery and urgent brake situations can sometimes be accommodated faster depending on the route. Send your request with the vehicle details, service needed, and preferred day — we will confirm fit and timing quickly so you are not left guessing.",
  },
  {
    question: "Is Wrench Ready Mobile licensed and insured?",
    answer:
      "Yes. Wrench Ready Mobile is a fully licensed and insured mobile auto repair business operating in compliance with Washington State requirements including RCW 46.71 for automotive repair. Every visit carries full liability coverage so you can feel confident about the work happening in your driveway or workplace lot.",
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
    geo: { lat: 47.6588, lng: -117.4260 },
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
    geo: { lat: 47.6732, lng: -117.2394 },
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
    geo: { lat: 47.6741, lng: -117.1073 },
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
    geo: { lat: 47.6309, lng: -117.4067 },
  },
  {
    slug: "downtown-spokane",
    name: "Downtown Spokane",
    seoTitle: "Mobile Mechanic in Downtown Spokane, WA",
    headline:
      "Lunchtime oil changes and after-hours battery swaps for downtown Spokane's workforce.",
    teaser:
      "Office parking garages, surface lots, and street-level spots all become service bays when the mechanic comes to you. Downtown workers can schedule maintenance around the workday instead of burning PTO at a shop across town.",
    metaDescription:
      "Book a mobile mechanic in Downtown Spokane, WA. Oil changes, battery replacement & diagnostics at your office lot or parking garage during the workday.",
    neighborhoods: ["West End", "Riverside", "Davenport District"],
    routeHighlights: [
      "Concentrated demand within a walkable core reduces windshield time",
      "Office-lot access enables weekday lunch-hour and end-of-day appointments",
      "Parking structures with adequate clearance support most routine service",
      "High foot traffic area builds word-of-mouth referrals faster",
    ],
    painPoints: [
      "Leaving the office to drop off a car at a shop means lost productivity and an expensive rideshare back.",
      "Parking garages downtown are inconvenient for shops to reach, but perfect for a mobile mechanic who shows up where the vehicle already sits.",
    ],
    serviceSlugs: [
      "oil-change",
      "battery-replacement",
      "check-engine-diagnostics",
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
      "After-work auto service for North Spokane families who would rather stay home than sit in a waiting room.",
    teaser:
      "North Spokane's wide residential streets and long driveways were practically built for mobile mechanics. Families up here juggle school runs, sports practice, and commute schedules — a driveway appointment keeps the car available when life needs it most.",
    metaDescription:
      "Need a mobile mechanic in North Spokane? Oil changes, brake repair, battery replacement & diagnostics at your driveway. No shop drop-off required.",
    neighborhoods: ["Five Mile", "Indian Trail", "Shadle-Garland"],
    routeHighlights: [
      "Residential layouts with easy driveway access for on-site work",
      "After-work and Saturday demand from family households",
      "Efficient route clustering with other North Side appointments",
      "Strong repeat-booking potential from multi-vehicle homes",
    ],
    painPoints: [
      "Driving south into downtown or the Valley for a routine service eats an hour of family time each way.",
      "Scheduling two vehicles around a single shop visit means doubling the drop-off logistics.",
      "North Spokane families want a predictable arrival window, not a vague 'sometime today' promise.",
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
      "East Central is one of Spokane's most accessible neighborhoods for mobile work — compact blocks, curbside access, and households that benefit when the mechanic comes to them instead of the other way around. Straightforward service at a fair price, right where the car sits.",
    metaDescription:
      "Mobile mechanic serving East Central Spokane. Affordable oil changes, brake repair & battery replacement at your home. No tow or drop-off needed.",
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
      "oil-change",
      "brake-repair",
      "battery-replacement",
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
      "Proximity to Sprague corridor makes it a natural route hub",
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
      "Liberty Lake route anchoring makes additional nearby stops more viable",
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
          "They are the most common vehicles in this neighborhood and a great fit for our service lanes. Mention the year, make, and model when requesting so we confirm everything upfront.",
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
      "Strong repeat-booking opportunity from maintenance-conscious households",
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
      "Central South Hill location makes it a natural anchor for neighborhood routes",
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
      "Growing population drives steady new-customer acquisition",
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
