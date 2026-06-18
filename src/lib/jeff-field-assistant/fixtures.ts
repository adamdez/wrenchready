import type { JeffFieldJob } from "@/lib/jeff-field-assistant/types";

export const jeffFieldJobFixtures: JeffFieldJob[] = [
  {
    id: "jeff-fixture-ryan-ram",
    source: "jeff-fixture",
    customer: {
      name: "Ryan",
      phone: "+15095550101",
      preferredContact: "text",
    },
    vehicle: {
      year: 2014,
      make: "Ram",
      model: "1500",
      mileage: 148200,
    },
    location: {
      label: "Spokane Valley driveway",
      city: "Spokane Valley",
      territory: "Spokane Valley",
      accessNotes: "Driveway access is workable, but keep diagnostic time controlled.",
    },
    serviceScope: "No-power / no-start electrical diagnostic",
    owner: "Simon",
    jobStage: "on-site",
    scheduledWindow: {
      label: "Field test fixture",
    },
    readinessSummary:
      "Electrical diagnostic is active. Stay test-first and do not sell a module or starter without voltage and ground proof.",
    nextAction:
      "Confirm battery voltage, terminal condition, main grounds, and power distribution before recommending parts.",
    topRisks: [
      "Intermittent power loss can turn into parts guessing if voltage drop is skipped.",
      "Customer approval is required before any replacement recommendation becomes a repair.",
    ],
    notes: [
      "Use this fixture to test Jeff's short diagnostic coaching for no-power complaints.",
      "Exact wiring diagrams and OEM procedures must be verified outside the assistant before invasive work.",
    ],
    customerApproval: {
      status: "awaiting-approval",
      summary: "Diagnostic visit approved; repair parts are not approved yet.",
    },
    fieldExecution: {
      serviceGoal: "Prove no-power root cause before any part recommendation.",
      partsChecklist: ["Battery/terminal service supplies only; no repair part approved yet."],
      photosRequired: ["Battery terminals", "main ground points", "fuse/relay box", "dash/no-power state"],
      inspectionChecklist: [
        "Static battery voltage",
        "Voltage while attempting crank",
        "Terminal and cable condition",
        "Main fuse and ground inspection",
      ],
      handoffChecklist: ["Explain proven cause versus suspected cause before quoting repair."],
      comebackPreventionSteps: [
        "Record voltage readings and exact failed test before leaving.",
        "Do not replace parts from symptoms alone.",
      ],
      upsellFocus: [],
      closeoutSteps: ["Capture final diagnostic conclusion", "Request approval before repair"],
    },
    paymentCollection: {
      status: "not-requested",
      paymentSummary: "Diagnostic fee/payment status needs Dez confirmation before closeout.",
    },
    updatedAt: "2026-06-16T10:00:00-07:00",
  },
  {
    id: "jeff-fixture-tammy-chrysler",
    source: "jeff-fixture",
    customer: {
      name: "Tammy",
      phone: "+15095550102",
      preferredContact: "text",
    },
    vehicle: {
      year: 2010,
      make: "Chrysler",
      model: "Town & Country",
      mileage: 176900,
    },
    location: {
      label: "North Spokane driveway",
      city: "Spokane",
      territory: "Spokane",
      accessNotes: "Customer is available by text for authorization.",
    },
    serviceScope: "Battery / no-start diagnostic with low-voltage history",
    owner: "Simon",
    jobStage: "on-site",
    scheduledWindow: {
      label: "Field test fixture",
    },
    readinessSummary:
      "Battery/no-start visit is active. Verify battery health, charging voltage, and crank signal before calling a starter.",
    nextAction:
      "Ask Simon for static voltage, loaded voltage, terminal condition, and whether crank signal reaches the starter.",
    topRisks: [
      "Low-voltage history can mask another starting/charging issue.",
      "Customer has not approved replacement parts beyond diagnostic scope.",
    ],
    notes: [
      "Use this fixture for scan-tool email and same-call context tests.",
      "If a scan report VIN does not match this Chrysler, quarantine it for review.",
    ],
    customerApproval: {
      status: "awaiting-approval",
      summary: "Diagnostic approved; parts require approval.",
    },
    fieldExecution: {
      serviceGoal: "Separate battery, cable, charging, and starter evidence.",
      partsChecklist: ["Battery replacement only if failed by test and customer approves."],
      photosRequired: ["Battery label", "terminal/cable condition", "scan tool screen", "odometer"],
      inspectionChecklist: [
        "Static voltage",
        "Load-test result",
        "Charging voltage if vehicle starts",
        "Starter command/power check if no crank",
      ],
      handoffChecklist: ["State whether the failure is proven battery, charging, starter, or still diagnostic."],
      comebackPreventionSteps: [
        "Photograph failed test evidence.",
        "Record whether low-voltage codes are current or history.",
      ],
      upsellFocus: ["Charging-system retest if battery is replaced."],
      closeoutSteps: ["Record final voltage", "Capture customer-facing result", "Confirm payment status"],
    },
    paymentCollection: {
      status: "awaiting-payment",
      method: "link",
      processor: "stripe",
      balanceDueAmount: 0,
      paymentSummary: "Payment link readiness must be checked before customer-facing closeout.",
    },
    updatedAt: "2026-06-16T10:05:00-07:00",
  },
  {
    id: "jeff-fixture-kendra-subaru",
    source: "jeff-fixture",
    customer: {
      name: "Kendra",
      phone: "+15095550103",
      preferredContact: "text",
    },
    vehicle: {
      year: 2018,
      make: "Subaru",
      model: "Outback",
      mileage: 94110,
    },
    location: {
      label: "Five Mile driveway",
      city: "Spokane",
      territory: "Spokane",
      accessNotes: "Wide driveway, easy van access.",
    },
    serviceScope: "Battery replacement with charging-system confirmation",
    owner: "Simon",
    jobStage: "on-site",
    scheduledWindow: {
      label: "Field test fixture",
    },
    readinessSummary:
      "Battery job is active. Confirm correct group size and charging result before closeout.",
    nextAction:
      "Verify battery fitment, terminal condition, and charging voltage after replacement.",
    topRisks: ["Closeout is weak if charging result and final start proof are missing."],
    notes: [
      "Use this fixture to test near-instant closeout and payment readiness.",
    ],
    customerApproval: {
      status: "approved",
      requestedService: "Battery replacement if failed by test",
      summary: "Customer approved battery replacement if the battery fails testing.",
    },
    fieldExecution: {
      serviceGoal: "Replace failed battery and prove the charging system is not an immediate comeback risk.",
      partsChecklist: ["Correct Subaru battery group", "Terminal protection", "Receipt/core note"],
      photosRequired: ["Old battery label", "installed battery", "final voltage/charging reading"],
      inspectionChecklist: ["Load-test result", "Charging voltage", "Terminal condition"],
      handoffChecklist: ["Explain battery result and charging-system reading."],
      comebackPreventionSteps: [
        "Record final charging voltage.",
        "Log any alternator watchlist if charging result is borderline.",
      ],
      upsellFocus: ["Charging-system monitor if voltage is borderline."],
      closeoutSteps: ["Capture final work completed", "Confirm invoice amount", "Confirm payment collected"],
    },
    paymentCollection: {
      status: "partial",
      method: "link",
      processor: "stripe",
      depositRequestedAmount: 75,
      depositPaidAt: "2026-06-16T09:30:00-07:00",
      balanceDueAmount: 185,
      paymentSummary: "Deposit paid; remaining balance should be collected before Simon leaves.",
    },
    updatedAt: "2026-06-16T10:10:00-07:00",
  },
];
