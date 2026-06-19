import type {
  PromiseDiagnosticSourceStatus,
  PromiseDiagnosticTreeStep,
  PromiseFieldExecutionPacket,
  PromiseRecord,
} from "@/lib/promise-crm/types";

export type DiagnosticSourceStatusMeta = {
  label: string;
  shortLabel: string;
  priority: "safe" | "verify" | "blocked";
  description: string;
};

export type DiagnosticTreeSummary = {
  steps: PromiseDiagnosticTreeStep[];
  sourceCounts: Record<PromiseDiagnosticSourceStatus, number>;
  sourceGates: string[];
  missingFactoryData: boolean;
  generatedFrom: "explicit-tree" | "field-packet";
};

export const DIAGNOSTIC_SOURCE_STATUS_META: Record<
  PromiseDiagnosticSourceStatus,
  DiagnosticSourceStatusMeta
> = {
  "generic-sop": {
    label: "Generic SOP",
    shortLabel: "SOP",
    priority: "safe",
    description: "General diagnostic logic. Do not treat this as a vehicle-specific factory value.",
  },
  "wrenchready-verified": {
    label: "WrenchReady verified",
    shortLabel: "WR verified",
    priority: "safe",
    description: "WrenchReady-owned finding, preference, or field result from prior verified work.",
  },
  "public-source": {
    label: "Public source",
    shortLabel: "Public",
    priority: "verify",
    description: "Backed by a public source. Confirm recency and vehicle applicability before relying on it.",
  },
  "licensed-source-required": {
    label: "Licensed/OEM source required",
    shortLabel: "Source needed",
    priority: "verify",
    description: "Exact factory value, wiring, programming, relearn, or service procedure must be verified in licensed/OEM service data.",
  },
  "do-not-advise": {
    label: "Do not advise",
    shortLabel: "Blocked",
    priority: "blocked",
    description: "Do not guide this step without human review and authoritative service data.",
  },
};

const SOURCE_STATUSES = Object.keys(
  DIAGNOSTIC_SOURCE_STATUS_META,
) as PromiseDiagnosticSourceStatus[];

function cleanString(value: unknown) {
  return typeof value === "string" ? value.trim() || undefined : undefined;
}

function cleanList(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
    .filter(Boolean);
}

function stableStepId(prefix: string, value: string, index: number) {
  const slug =
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 36) || "step";

  return `${prefix}-${index + 1}-${slug}`;
}

export function normalizeDiagnosticSourceStatus(
  value: unknown,
): PromiseDiagnosticSourceStatus {
  return SOURCE_STATUSES.includes(value as PromiseDiagnosticSourceStatus)
    ? (value as PromiseDiagnosticSourceStatus)
    : "generic-sop";
}

export function inferDiagnosticSourceStatus(
  text: string,
  fallback: PromiseDiagnosticSourceStatus = "generic-sop",
): PromiseDiagnosticSourceStatus {
  const normalized = text.toLowerCase();

  if (
    normalized.includes("do not advise") ||
    normalized.includes("airbag") ||
    normalized.includes("srs") ||
    normalized.includes("hybrid high voltage") ||
    normalized.includes("high-voltage")
  ) {
    return "do-not-advise";
  }

  if (
    normalized.includes("licensed") ||
    normalized.includes("oem") ||
    normalized.includes("mitchell") ||
    normalized.includes("identifix") ||
    normalized.includes("alldata") ||
    normalized.includes("service data") ||
    normalized.includes("wiring diagram") ||
    normalized.includes("pinout") ||
    normalized.includes("connector view") ||
    normalized.includes("torque spec") ||
    normalized.includes("relearn") ||
    normalized.includes("programming") ||
    normalized.includes("factory spec")
  ) {
    return "licensed-source-required";
  }

  if (
    normalized.includes("wrenchready verified") ||
    normalized.includes("wr verified") ||
    normalized.includes("simon verified")
  ) {
    return "wrenchready-verified";
  }

  if (
    normalized.includes("nhtsa") ||
    normalized.includes("recall") ||
    normalized.includes("public source")
  ) {
    return "public-source";
  }

  return fallback;
}

export function normalizeDiagnosticTreeStep(
  value: unknown,
  index: number,
): PromiseDiagnosticTreeStep | undefined {
  if (!value || typeof value !== "object") return undefined;
  const candidate = value as Record<string, unknown>;
  const title = cleanString(candidate.title);
  const instruction = cleanString(candidate.instruction);

  if (!title || !instruction) return undefined;

  const id = cleanString(candidate.id) || stableStepId("diag", `${title} ${instruction}`, index);
  const sourceStatus = normalizeDiagnosticSourceStatus(candidate.sourceStatus);

  return {
    id,
    title,
    instruction,
    sourceStatus,
    sourceLabel: cleanString(candidate.sourceLabel),
    sourceUrl: cleanString(candidate.sourceUrl),
    requiredTools: cleanList(candidate.requiredTools),
    expectedReading: cleanString(candidate.expectedReading),
    recordAs: cleanString(candidate.recordAs),
    stopPoint: cleanString(candidate.stopPoint),
    ifPass: cleanString(candidate.ifPass),
    ifFail: cleanString(candidate.ifFail),
    photoRequired: cleanString(candidate.photoRequired),
    safetyNote: cleanString(candidate.safetyNote),
    customerApprovalRequired:
      typeof candidate.customerApprovalRequired === "boolean"
        ? candidate.customerApprovalRequired
        : undefined,
  };
}

export function normalizeDiagnosticTree(
  value: unknown,
): PromiseDiagnosticTreeStep[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry, index) => normalizeDiagnosticTreeStep(entry, index))
    .filter((entry): entry is PromiseDiagnosticTreeStep => Boolean(entry));
}

function stepFromText(input: {
  prefix: string;
  item: string;
  index: number;
  titlePrefix: string;
  fallbackStatus?: PromiseDiagnosticSourceStatus;
  instructionPrefix?: string;
  stopPoint?: string;
  expectedReading?: string;
  recordAs?: string;
  sourceLabel?: string;
}) {
  const sourceStatus = inferDiagnosticSourceStatus(
    input.item,
    input.fallbackStatus || "generic-sop",
  );

  return {
    id: stableStepId(input.prefix, input.item, input.index),
    title: `${input.titlePrefix} ${input.index + 1}`,
    instruction: input.instructionPrefix
      ? `${input.instructionPrefix}: ${input.item}`
      : input.item,
    sourceStatus,
    sourceLabel:
      input.sourceLabel ||
      (sourceStatus === "licensed-source-required"
        ? "Licensed service data"
        : undefined),
    expectedReading: input.expectedReading,
    recordAs: input.recordAs,
    stopPoint: input.stopPoint,
  } satisfies PromiseDiagnosticTreeStep;
}

function buildApprovalGateStep(
  promise: Pick<PromiseRecord, "serviceScope" | "customerApproval" | "topRisks">,
): PromiseDiagnosticTreeStep {
  const approvalStatus = promise.customerApproval.status;
  const approvedScope =
    promise.customerApproval.requestedService || promise.serviceScope;
  const needsApproval =
    approvalStatus !== "approved" && approvalStatus !== "not-needed";

  return {
    id: "diag-approval-gate",
    title: "Scope and approval gate",
    instruction: `Confirm the active scope before wrenching: ${approvedScope}.`,
    sourceStatus: "wrenchready-verified",
    sourceLabel: "CRM approval state",
    recordAs: "approved scope confirmed / changed / blocked",
    stopPoint: needsApproval
      ? "Do not expand work, parts, pricing, or customer promises until approval is confirmed."
      : "Stop before any work outside this scope.",
    customerApprovalRequired: needsApproval,
    ifFail: promise.topRisks[0] || "Escalate the scope mismatch before continuing.",
  };
}

export function buildDiagnosticTreeSummary(
  promise: Pick<
    PromiseRecord,
    "serviceScope" | "customerApproval" | "topRisks" | "fieldExecution"
  >,
): DiagnosticTreeSummary {
  const packet = promise.fieldExecution;
  const explicitTree = normalizeDiagnosticTree(packet?.diagnosticTree);
  const steps =
    explicitTree.length > 0
      ? explicitTree
      : buildDiagnosticTreeFromFieldPacket(promise, packet);
  const sourceCounts = sourceStatusCounts(steps);
  const sourceGates = buildDiagnosticSourceGates(steps);

  return {
    steps,
    sourceCounts,
    sourceGates,
    missingFactoryData:
      sourceCounts["licensed-source-required"] > 0 ||
      sourceCounts["do-not-advise"] > 0,
    generatedFrom: explicitTree.length > 0 ? "explicit-tree" : "field-packet",
  };
}

function buildDiagnosticTreeFromFieldPacket(
  promise: Pick<PromiseRecord, "serviceScope" | "customerApproval" | "topRisks"> & {
    vehicle?: PromiseRecord["vehicle"];
  },
  packet?: PromiseFieldExecutionPacket,
) {
  const steps: PromiseDiagnosticTreeStep[] = [buildApprovalGateStep(promise)];
  const vehicle = promise.vehicle
    ? [promise.vehicle.year || undefined, promise.vehicle.make, promise.vehicle.model]
        .filter(Boolean)
        .join(" ")
    : "this exact vehicle";

  for (const [index, item] of (packet?.inspectionChecklist || []).entries()) {
    steps.push(stepFromText({
      prefix: "diag-check",
      item,
      index,
      titlePrefix: "Diagnostic check",
      recordAs: "test performed / reading / result",
    }));
  }

  for (const [index, item] of (packet?.mfgSpecs || []).entries()) {
    steps.push(stepFromText({
      prefix: "diag-spec",
      item,
      index,
      titlePrefix: "Factory spec",
      fallbackStatus: "licensed-source-required",
      instructionPrefix: "Verify exact spec before relying on it",
      recordAs: "source used / value found / reading compared",
      sourceLabel: "OEM or licensed service data",
    }));
  }

  if (!packet?.mfgSpecs?.length) {
    steps.push({
      id: "diag-mfg-specs-required",
      title: "Manufacturer specs required",
      instruction:
        `Open OEM or licensed service data for ${vehicle} and record job-specific values before relying on exact specs.`,
      sourceStatus: "licensed-source-required",
      sourceLabel: "OEM or licensed service data",
      recordAs: "service-data source / exact value / reading compared",
      stopPoint:
        "Do not use guessed specs, wiring values, torque values, relearn steps, or customer-facing conclusions until source-backed values are recorded.",
    });
  }

  for (const [index, item] of (packet?.serviceDataChecks || []).entries()) {
    steps.push(stepFromText({
      prefix: "diag-service-data",
      item,
      index,
      titlePrefix: "Service data lookup",
      fallbackStatus: "licensed-source-required",
      instructionPrefix: "Open service data and verify",
      recordAs: "source opened / procedure title / result",
      sourceLabel: "OEM or licensed service data",
    }));
  }

  if (!packet?.serviceDataChecks?.length) {
    steps.push({
      id: "diag-service-data-required",
      title: "Service data check required",
      instruction:
        `Check OEM/licensed service data for ${vehicle}: applicable procedure, wiring/fuse path, TSBs, resets/relearns, and safety prerequisites before advising exact repair steps.`,
      sourceStatus: "licensed-source-required",
      sourceLabel: "OEM or licensed service data",
      recordAs: "procedure title / source used / applies or not",
      stopPoint:
        "Do not coach exact wiring, programming, relearn, torque, or module steps until this check is complete.",
    });
  }

  if (steps.length === 1) {
    steps.push({
      id: "diag-generic-first-check",
      title: "Confirm complaint",
      instruction:
        "Reproduce or verify the customer complaint, then record the exact symptom, condition, and first measurement before recommending parts.",
      sourceStatus: "generic-sop",
      recordAs: "symptom confirmed / not reproduced / needs more information",
      stopPoint:
        "Do not recommend parts until a test result supports the next step.",
    });
  }

  return steps;
}

function sourceStatusCounts(steps: PromiseDiagnosticTreeStep[]) {
  const counts = SOURCE_STATUSES.reduce(
    (accumulator, status) => ({
      ...accumulator,
      [status]: 0,
    }),
    {} as Record<PromiseDiagnosticSourceStatus, number>,
  );

  for (const step of steps) {
    counts[step.sourceStatus] += 1;
  }

  return counts;
}

function buildDiagnosticSourceGates(steps: PromiseDiagnosticTreeStep[]) {
  const gates = new Set<string>();

  for (const step of steps) {
    if (step.sourceStatus === "licensed-source-required") {
      gates.add(`${step.title}: verify in licensed/OEM service data before using exact values or procedures.`);
    }
    if (step.sourceStatus === "do-not-advise") {
      gates.add(`${step.title}: do not coach this step without human review and authoritative service data.`);
    }
    if (step.stopPoint) {
      gates.add(`${step.title}: ${step.stopPoint}`);
    }
  }

  return [...gates];
}
