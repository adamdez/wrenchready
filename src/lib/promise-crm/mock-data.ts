import { buildLegacyPromiseCustomerAccess } from "@/lib/promise-crm/customer-access";
import {
  getDefaultCustomerCertainty,
  getDefaultDayReadiness,
} from "@/lib/promise-crm/promise-readiness";
import type { InboundRecord, PromiseRecord } from "@/lib/promise-crm/types";

function withPromiseDefaults(
  record: Omit<
    PromiseRecord,
    "customerAccess" | "customerApproval" | "customerCertainty" | "dayReadiness"
  >,
): PromiseRecord {
  return {
    ...record,
    customerCertainty: getDefaultCustomerCertainty(),
    dayReadiness: getDefaultDayReadiness(),
    customerAccess: buildLegacyPromiseCustomerAccess(record.id),
    customerApproval: {
      status: "not-needed",
    },
  };
}

export const inboundRecords: InboundRecord[] = [
  {
    id: "inbound-1001",
    createdAt: "2026-04-12T08:14:00-07:00",
    source: "website",
    customer: {
      name: "Kelsey Morgan",
      phone: "(509) 998-4421",
      email: "kelsey@example.com",
      preferredContact: "text",
    },
    vehicle: {
      year: 2017,
      make: "Toyota",
      model: "RAV4",
      mileage: 102380,
    },
    location: {
      label: "South Hill driveway near 57th Ave",
      city: "Spokane",
      territory: "South Hill",
      accessNotes: "Flat driveway, room for van on right side.",
    },
    requestedService: "Check engine light evaluation",
    symptomSummary: "Check engine light came on yesterday. Car still drives normally.",
    owner: "Dez",
    readinessRisk: "medium",
    qualificationStatus: "new",
    preferredWindow: {
      label: "Tomorrow after 1:00 PM",
      startIso: "2026-04-13T13:00:00-07:00",
      endIso: "2026-04-13T17:00:00-07:00",
    },
    nextAction: "Confirm whether this stays diagnostic-first or becomes a quoted repair visit.",
    notes: [
      "Website intake came in with full address and phone.",
      "Good fit for paid evaluation and possible same-route follow-up.",
    ],
  },
  {
    id: "inbound-1002",
    createdAt: "2026-04-12T09:06:00-07:00",
    source: "phone",
    customer: {
      name: "Jerome Phillips",
      phone: "(509) 280-7744",
      preferredContact: "call",
    },
    vehicle: {
      year: 2014,
      make: "Ford",
      model: "F-150",
      mileage: 151220,
    },
    location: {
      label: "Spokane Valley business lot",
      city: "Spokane Valley",
      territory: "Spokane Valley",
      accessNotes: "Vehicle parked behind gate; customer can meet onsite.",
    },
    requestedService: "No-start / battery concern",
    symptomSummary: "Truck clicks once and dies. Customer needs same-day answer if possible.",
    owner: "Dez",
    readinessRisk: "high",
    qualificationStatus: "screening",
    preferredWindow: {
      label: "ASAP today",
      startIso: "2026-04-12T11:00:00-07:00",
      endIso: "2026-04-12T16:00:00-07:00",
    },
    nextAction: "Call back with battery-starter evaluation offer and confirm gate access.",
    notes: [
      "Strong urgent fit, but route only works if grouped with Valley stops.",
      "Could convert fast if arrival window is believable.",
    ],
  },
  {
    id: "inbound-1003",
    createdAt: "2026-04-12T10:42:00-07:00",
    source: "text",
    customer: {
      name: "Marisol Vega",
      phone: "(509) 620-1908",
      preferredContact: "text",
    },
    vehicle: {
      year: 2020,
      make: "Honda",
      model: "Pilot",
      mileage: 68840,
    },
    location: {
      label: "Liberty Lake residential driveway",
      city: "Liberty Lake",
      territory: "Liberty Lake",
      accessNotes: "Driveway slopes slightly downhill.",
    },
    requestedService: "Front brake inspection",
    symptomSummary: "Light grinding noise on braking. Customer asked whether it is safe to drive.",
    owner: "Unassigned",
    readinessRisk: "medium",
    qualificationStatus: "new",
    preferredWindow: {
      label: "Friday morning",
      startIso: "2026-04-17T08:00:00-07:00",
      endIso: "2026-04-17T12:00:00-07:00",
    },
    nextAction: "Screen parking slope, wheel fit, and whether same-visit pad-rotor scope is likely.",
    notes: [
      "Good service lane fit if driveway is safe enough.",
      "Could become a fast promise once photos of parking setup arrive.",
    ],
  },
];

const rawPromiseRecords: Omit<
  PromiseRecord,
  "customerAccess" | "customerApproval" | "customerCertainty" | "dayReadiness"
>[] = [
  {
    id: "promise-2001",
    inboundId: "inbound-0909",
    createdAt: "2026-04-11T14:20:00-07:00",
    updatedAt: "2026-04-12T08:50:00-07:00",
    customer: {
      name: "Ashley Nguyen",
      phone: "(509) 731-0023",
      preferredContact: "text",
    },
    vehicle: {
      year: 2018,
      make: "Subaru",
      model: "Outback",
      mileage: 94110,
    },
    location: {
      label: "North Spokane driveway near Five Mile",
      city: "Spokane",
      territory: "Spokane",
      accessNotes: "Wide driveway, easy van access.",
    },
    serviceScope: "Battery test, replacement if failed, charging system check",
    owner: "Simon",
    readinessRisk: "low",
    status: "promises-waiting",
    scheduledWindow: {
      label: "Today 2:00 PM to 3:00 PM",
      startIso: "2026-04-12T14:00:00-07:00",
      endIso: "2026-04-12T15:00:00-07:00",
    },
    readinessSummary: "Customer confirmed. Correct battery still needs final parts hold.",
    nextAction: "Lock parts pickup and send en-route text by 1:15 PM.",
    topRisks: ["Battery group size not reserved yet."],
    notes: [
      "Promise is clear and likely profitable.",
      "Good candidate for same-day five-star experience and review ask.",
    ],
  },
  {
    id: "promise-2002",
    inboundId: "inbound-0910",
    createdAt: "2026-04-11T16:05:00-07:00",
    updatedAt: "2026-04-12T09:20:00-07:00",
    customer: {
      name: "Brian Hall",
      phone: "(509) 851-1192",
      preferredContact: "call",
    },
    vehicle: {
      year: 2016,
      make: "Chevrolet",
      model: "Tahoe",
      mileage: 132400,
    },
    location: {
      label: "South Hill office parking structure",
      city: "Spokane",
      territory: "South Hill",
      accessNotes: "Level 2 parking deck, height clearance needs confirmation.",
    },
    serviceScope: "Front brake inspection and quoted pad-rotor replacement if approved",
    owner: "Dez",
    readinessRisk: "medium",
    status: "promises-waiting",
    scheduledWindow: {
      label: "Tomorrow 10:00 AM to 12:00 PM",
      startIso: "2026-04-13T10:00:00-07:00",
      endIso: "2026-04-13T12:00:00-07:00",
    },
    readinessSummary: "Customer wants office visit, but parking clearance is not confirmed.",
    nextAction: "Confirm van clearance and send approval path for possible same-visit brake work.",
    topRisks: ["Parking structure height may block van access."],
    notes: [
      "If deck does not work, move vehicle to street or rescope location before promise breaks.",
    ],
  },
  {
    id: "promise-2003",
    inboundId: "inbound-0911",
    createdAt: "2026-04-11T18:42:00-07:00",
    updatedAt: "2026-04-12T07:58:00-07:00",
    customer: {
      name: "Dana Harper",
      phone: "(509) 747-9088",
      preferredContact: "text",
    },
    vehicle: {
      year: 2019,
      make: "Kia",
      model: "Sorento",
      mileage: 82115,
    },
    location: {
      label: "Liberty Lake seller address",
      city: "Liberty Lake",
      territory: "Liberty Lake",
      accessNotes: "Seller only available before noon.",
    },
    serviceScope: "Pre-purchase inspection with photo-backed summary",
    owner: "Simon",
    readinessRisk: "low",
    status: "promises-waiting",
    scheduledWindow: {
      label: "Tomorrow 9:00 AM to 10:15 AM",
      startIso: "2026-04-13T09:00:00-07:00",
      endIso: "2026-04-13T10:15:00-07:00",
    },
    readinessSummary: "Strong fit. Seller address and timing already confirmed.",
    nextAction: "Send buyer reminder and prep inspection checklist tonight.",
    topRisks: [],
    notes: [
      "High-trust visit that can create referral loop even if no repair follows.",
    ],
  },
  {
    id: "promise-3001",
    inboundId: "inbound-0883",
    createdAt: "2026-04-10T11:10:00-07:00",
    updatedAt: "2026-04-12T08:05:00-07:00",
    customer: {
      name: "Renee Foster",
      phone: "(509) 981-4451",
      preferredContact: "call",
    },
    vehicle: {
      year: 2015,
      make: "Jeep",
      model: "Grand Cherokee",
      mileage: 127550,
    },
    location: {
      label: "Spokane Valley apartment lot",
      city: "Spokane Valley",
      territory: "Spokane Valley",
      accessNotes: "Tight parking; customer can move to overflow row.",
    },
    serviceScope: "Check engine evaluation with likely evap follow-up",
    owner: "Dez",
    readinessRisk: "high",
    status: "tomorrow-at-risk",
    scheduledWindow: {
      label: "Tomorrow 1:00 PM to 2:30 PM",
      startIso: "2026-04-13T13:00:00-07:00",
      endIso: "2026-04-13T14:30:00-07:00",
    },
    readinessSummary: "Promise exists, but parking, code scope, and route timing are still unstable.",
    nextAction: "Get overflow-row confirmation and tighten diagnostic scope before noon.",
    topRisks: [
      "Parking may not support productive work.",
      "Open-ended diagnostic risk if customer expects exact repair onsite.",
    ],
    notes: [
      "Classic promise-break candidate if not narrowed down now.",
    ],
  },
  {
    id: "promise-3002",
    inboundId: "inbound-0887",
    createdAt: "2026-04-10T16:55:00-07:00",
    updatedAt: "2026-04-12T08:40:00-07:00",
    customer: {
      name: "Tony Ramirez",
      phone: "(509) 600-0201",
      preferredContact: "text",
    },
    vehicle: {
      year: 2013,
      make: "Nissan",
      model: "Altima",
      mileage: 163200,
    },
    location: {
      label: "Downtown curbside spot",
      city: "Spokane",
      territory: "Spokane",
      accessNotes: "Metered street parking only.",
    },
    serviceScope: "Battery-no-start visit with starter fallback decision",
    owner: "Simon",
    readinessRisk: "high",
    status: "tomorrow-at-risk",
    scheduledWindow: {
      label: "Tomorrow 3:30 PM to 4:30 PM",
      startIso: "2026-04-13T15:30:00-07:00",
      endIso: "2026-04-13T16:30:00-07:00",
    },
    readinessSummary: "Great customer need, but curbside setup makes timing fragile.",
    nextAction: "Require customer to relocate to safer lot or downgrade promise now.",
    topRisks: [
      "Street setup may kill wrench time.",
      "Potential starter issue could turn this into a non-battery visit.",
    ],
    notes: [
      "Do not preserve promise wording if the worksite stays weak.",
    ],
  },
  {
    id: "promise-4001",
    inboundId: "inbound-0820",
    createdAt: "2026-04-08T15:25:00-07:00",
    updatedAt: "2026-04-12T08:10:00-07:00",
    customer: {
      name: "Leah Sanders",
      phone: "(509) 870-6624",
      preferredContact: "text",
    },
    vehicle: {
      year: 2021,
      make: "Mazda",
      model: "CX-5",
      mileage: 41340,
    },
    location: {
      label: "South Hill home",
      city: "Spokane",
      territory: "South Hill",
    },
    serviceScope: "Completed oil change with 25-point inspection and deferred brake note",
    owner: "Dez",
    readinessRisk: "low",
    status: "follow-through-due",
    scheduledWindow: {
      label: "Completed April 10",
      startIso: "2026-04-10T11:00:00-07:00",
      endIso: "2026-04-10T12:00:00-07:00",
    },
    readinessSummary: "Service completed. Customer needs recap and review ask.",
    nextAction: "Send inspection recap, brake follow-up note, and review request today.",
    topRisks: ["Deferred work will go cold if recap waits another day."],
    notes: [
      "Great candidate for next-visit engine.",
    ],
    followThroughDueAt: "2026-04-12T15:00:00-07:00",
  },
  {
    id: "promise-4002",
    inboundId: "inbound-0824",
    createdAt: "2026-04-08T17:40:00-07:00",
    updatedAt: "2026-04-12T08:25:00-07:00",
    customer: {
      name: "Cameron Price",
      phone: "(509) 441-2900",
      preferredContact: "email",
      email: "cprice@example.com",
    },
    vehicle: {
      year: 2012,
      make: "Toyota",
      model: "Camry",
      mileage: 144900,
    },
    location: {
      label: "Spokane Valley office lot",
      city: "Spokane Valley",
      territory: "Spokane Valley",
    },
    serviceScope: "Completed battery replacement with alternator watchlist",
    owner: "Simon",
    readinessRisk: "medium",
    status: "follow-through-due",
    scheduledWindow: {
      label: "Completed April 11",
      startIso: "2026-04-11T13:30:00-07:00",
      endIso: "2026-04-11T14:10:00-07:00",
    },
    readinessSummary: "Battery job closed, but alternator readings need a follow-up recommendation.",
    nextAction: "Send alternator monitor guidance and offer future charging-system test.",
    topRisks: ["Customer may assume battery solved everything unless we close the loop."],
    notes: [
      "Follow-through here protects trust and future diagnostic revenue.",
    ],
    followThroughDueAt: "2026-04-12T16:30:00-07:00",
  },
];

export const promiseRecords: PromiseRecord[] = rawPromiseRecords.map(withPromiseDefaults);
