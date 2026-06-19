import type {
  PromisePartItem,
  PromisePaymentCollection,
  PromiseQuotePacket,
  PromiseQuotePacketDocument,
  PromiseQuotePacketQaCheck,
  PromiseQuotePacketStatus,
  PromiseRecord,
} from "@/lib/promise-crm/types";
import {
  DIAGNOSTIC_SOURCE_STATUS_META,
  buildDiagnosticTreeSummary,
} from "@/lib/promise-crm/diagnostic-tree";

const QUOTE_PACKET_PREFIX = "__quote-packet::";

function toOptionalString(value: unknown) {
  return typeof value === "string" ? value.trim() || undefined : undefined;
}

function normalizeStringList(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
    .filter(Boolean);
}

function normalizeQaCheck(value: unknown): PromiseQuotePacketQaCheck | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Record<string, unknown>;
  const label = toOptionalString(candidate.label);
  const status =
    candidate.status === "pass" ||
    candidate.status === "needs-review" ||
    candidate.status === "blocked"
      ? candidate.status
      : undefined;

  if (!label || !status) return null;

  return {
    label,
    status,
    detail: toOptionalString(candidate.detail),
  };
}

function normalizeDocument(value: unknown, audience: "internal" | "customer") {
  if (!value || typeof value !== "object") return undefined;
  const candidate = value as Record<string, unknown>;
  const title = toOptionalString(candidate.title);
  const summary = toOptionalString(candidate.summary);
  const markdown = toOptionalString(candidate.markdown);

  if (!title || !summary || !markdown) return undefined;

  return {
    audience,
    title,
    summary,
    markdown,
  } satisfies PromiseQuotePacketDocument;
}

export function normalizePromiseQuotePacket(
  value?: PromiseQuotePacket | null,
): PromiseQuotePacket | undefined {
  if (!value || typeof value !== "object") return undefined;
  const candidate = value as Record<string, unknown>;
  const internalServicePlan = normalizeDocument(candidate.internalServicePlan, "internal");
  const externalCustomerQuote = normalizeDocument(candidate.externalCustomerQuote, "customer");

  if (!internalServicePlan || !externalCustomerQuote) return undefined;

  const status: PromiseQuotePacketStatus =
    candidate.status === "send-ready" || candidate.status === "blocked"
      ? candidate.status
      : "draft-for-review";
  const customerSendStatus =
    candidate.customerSendStatus === "ready-after-review" ||
    candidate.customerSendStatus === "sent"
      ? candidate.customerSendStatus
      : "not-sent";
  const paymentLinkStatus =
    candidate.paymentLinkStatus === "pending-review" ||
    candidate.paymentLinkStatus === "ready" ||
    candidate.paymentLinkStatus === "blocked"
      ? candidate.paymentLinkStatus
      : "not-created";
  const reviewOwner =
    candidate.reviewOwner === "Adam" ||
    candidate.reviewOwner === "Simon" ||
    candidate.reviewOwner === "Ops"
      ? candidate.reviewOwner
      : "Dez";

  return {
    version: "wrenchready-quote-packet-v1",
    generatedAt: toOptionalString(candidate.generatedAt) || new Date().toISOString(),
    generatedBy:
      candidate.generatedBy === "Codex" || candidate.generatedBy === "System"
        ? candidate.generatedBy
        : "Jeff",
    source: "promise-crm",
    status,
    customerSendStatus,
    paymentLinkStatus,
    reviewOwner,
    internalServicePlan,
    externalCustomerQuote,
    qaChecks: Array.isArray(candidate.qaChecks)
      ? candidate.qaChecks
          .map(normalizeQaCheck)
          .filter((entry): entry is PromiseQuotePacketQaCheck => Boolean(entry))
      : [],
    blockers: normalizeStringList(candidate.blockers),
    nextAction:
      toOptionalString(candidate.nextAction) ||
      "Review the internal service plan and customer quote before sending anything to the customer.",
  };
}

export function encodePromiseQuotePacket(value?: PromiseQuotePacket | null) {
  const normalized = normalizePromiseQuotePacket(value);
  if (!normalized) return null;
  return `${QUOTE_PACKET_PREFIX}${JSON.stringify(normalized)}`;
}

export function extractPromiseQuotePacket(notes: string[]) {
  let quotePacket: PromiseQuotePacket | undefined;
  const visibleNotes: string[] = [];

  for (const note of notes) {
    if (note.startsWith(QUOTE_PACKET_PREFIX)) {
      try {
        quotePacket = normalizePromiseQuotePacket(
          JSON.parse(note.slice(QUOTE_PACKET_PREFIX.length)),
        );
      } catch {
        // Keep malformed quote-packet state out of visible operator notes.
      }
      continue;
    }

    visibleNotes.push(note);
  }

  return { quotePacket, visibleNotes };
}

export function mergePromiseNotesWithQuotePacket(
  visibleNotes: string[],
  quotePacket?: PromiseQuotePacket | null,
) {
  const cleanedNotes = visibleNotes.filter((note) => !note.startsWith(QUOTE_PACKET_PREFIX));
  const encoded = encodePromiseQuotePacket(quotePacket);
  return encoded ? [...cleanedNotes, encoded] : cleanedNotes;
}

function formatCurrency(value?: number) {
  if (value === undefined) return "Not captured";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

function vehicleLabel(promise: PromiseRecord) {
  return `${promise.vehicle.year || ""} ${promise.vehicle.make} ${promise.vehicle.model}`
    .replace(/\s+/g, " ")
    .trim();
}

function firstName(name: string) {
  return name.trim().split(/\s+/)[0] || name;
}

function mapHref(address: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

function phoneHref(phone: string) {
  const digits = phone.replace(/\D/g, "");
  return digits ? `tel:+1${digits.length === 10 ? digits : digits.slice(-10)}` : undefined;
}

function smsHref(phone: string) {
  const digits = phone.replace(/\D/g, "");
  return digits ? `sms:+1${digits.length === 10 ? digits : digits.slice(-10)}` : undefined;
}

function bulletList(items: string[], fallback: string) {
  const values = items.length ? items : [fallback];
  return values.map((item) => `- ${item}`).join("\n");
}

function numberedList(items: string[], fallback: string) {
  const values = items.length ? items : [fallback];
  return values.map((item, index) => `${index + 1}. ${item}`).join("\n");
}

function diagnosticTreeList(promise: PromiseRecord) {
  const tree = buildDiagnosticTreeSummary(promise);

  if (!tree.steps.length) {
    return "1. Confirm customer complaint, record evidence, and define the next approval point.";
  }

  return tree.steps.map((step, index) => {
    const source = DIAGNOSTIC_SOURCE_STATUS_META[step.sourceStatus];
    const extras = [
      `source: ${source.label}`,
      step.expectedReading ? `expected: ${step.expectedReading}` : undefined,
      step.recordAs ? `record: ${step.recordAs}` : undefined,
      step.stopPoint ? `stop: ${step.stopPoint}` : undefined,
    ].filter(Boolean).join("; ");

    return `${index + 1}. ${step.title}: ${step.instruction} (${extras})`;
  }).join("\n");
}

function paymentLinkFromCollection(payment?: PromisePaymentCollection) {
  return payment?.balanceCheckoutUrl || payment?.depositCheckoutUrl;
}

function paymentStatusLabel(payment?: PromisePaymentCollection) {
  if (!payment) return "Not requested";
  if (payment.status === "paid") return "Paid";
  if (payment.status === "awaiting-payment") return "Awaiting payment";
  if (payment.status === "partial") return "Partial payment";
  if (payment.status === "deposit-requested") return "Deposit requested";
  if (payment.status === "written-off") return "Written off";
  return "Not requested";
}

function quoteAmount(promise: PromiseRecord) {
  return (
    promise.customerApproval.requestedAmount ??
    promise.economics?.quotedAmount ??
    promise.economics?.finalInvoiceAmount
  );
}

function laborHoursLabel(promise: PromiseRecord) {
  return promise.economics?.laborHours !== undefined
    ? `${promise.economics.laborHours.toFixed(2)} hr`
    : "Time not captured";
}

function approvedScopeLabel(promise: PromiseRecord) {
  const amount = quoteAmount(promise);
  const service =
    promise.customerApproval.requestedService ||
    promise.customerApproval.summary ||
    promise.serviceScope;

  return amount !== undefined ? `${formatCurrency(amount)} - ${service}` : service;
}

function partsSummary(parts: PromisePartItem[] = []) {
  if (!parts.length) return ["No parts approved or priced for this quote packet."];

  return parts.map((part) => {
    const details = [
      part.partNumber ? `Part # ${part.partNumber}` : undefined,
      part.vendor,
      part.vendorLocation,
      part.estimatedCost !== undefined ? `WrenchReady cost ${formatCurrency(part.estimatedCost)}` : undefined,
      part.status ? `Status: ${part.status}` : undefined,
      part.fitmentNotes,
    ].filter(Boolean);

    return `${part.quantity || 1}x ${part.label}${details.length ? ` (${details.join("; ")})` : ""}`;
  });
}

function customerSafeCaveats(promise: PromiseRecord) {
  const risks = promise.topRisks.filter(
    (risk) =>
      !/internal|ops|crm|stripe id|payment intent|provider|supabase/i.test(risk) &&
      !/human review is required|payment link|checkout request/i.test(risk),
  );
  const defaults = [
    "Parts, module replacement, key/fob work, and repair labor beyond this quoted scope are not included unless WrenchReady explains the added work and gets approval first.",
    "If the diagnostic block does not fully solve the issue, WrenchReady will explain what is proven, what is still suspected, and what the next quote would cover.",
  ];

  return risks.length ? risks : defaults;
}

function buildQaChecks(promise: PromiseRecord): PromiseQuotePacketQaCheck[] {
  const amount = quoteAmount(promise);
  const paymentLink = paymentLinkFromCollection(promise.paymentCollection);
  const externalText = [
    promise.customerApproval.customerMessage,
    promise.customerApproval.summary,
    promise.serviceScope,
  ].join(" ");
  const scheduleNeedsReview = /needs|pending|review|confirm|exact/i.test(
    promise.scheduledWindow.label,
  );

  return [
    {
      label: "Customer and contact",
      status: promise.customer.name && promise.customer.phone ? "pass" : "blocked",
      detail: promise.customer.phone
        ? `${promise.customer.name}, ${promise.customer.phone}`
        : "Customer phone is missing.",
    },
    {
      label: "Vehicle",
      status: promise.vehicle.make && promise.vehicle.model ? "pass" : "blocked",
      detail: vehicleLabel(promise),
    },
    {
      label: "Quote amount",
      status: amount !== undefined ? "pass" : "blocked",
      detail: amount !== undefined ? formatCurrency(amount) : "Amount is missing.",
    },
    {
      label: "Schedule window",
      status: scheduleNeedsReview ? "needs-review" : "pass",
      detail: promise.scheduledWindow.label,
    },
    {
      label: "Payment link",
      status: paymentLink ? "needs-review" : "pass",
      detail: paymentLink
        ? "A payment link exists; verify amount and job match before customer send."
        : "No payment link created by this draft workflow.",
    },
    {
      label: "Customer copy safety",
      status: /ops|crm|internal|stripe id|payment intent|supabase/i.test(externalText)
        ? "blocked"
        : "pass",
      detail: "External draft avoids internal system wording and IDs.",
    },
    {
      label: "Stop points",
      status:
        promise.fieldExecution?.handoffChecklist.length ||
        promise.fieldExecution?.partsChecklist.length
          ? "pass"
          : "needs-review",
      detail: "Extra parts, repair labor, and customer send stay approval-gated.",
    },
  ];
}

function qaBlockers(qaChecks: PromiseQuotePacketQaCheck[]) {
  return qaChecks
    .filter((check) => check.status !== "pass")
    .map((check) => `${check.label}: ${check.detail || check.status}`);
}

function buildInternalMarkdown(promise: PromiseRecord, qaChecks: PromiseQuotePacketQaCheck[]) {
  const amount = quoteAmount(promise);
  const paymentLink = paymentLinkFromCollection(promise.paymentCollection);
  const fieldExecution = promise.fieldExecution;
  const contactLine = [
    `Customer: ${promise.customer.name}`,
    promise.customer.phone ? `Call / text: ${promise.customer.phone}` : undefined,
    promise.customer.email ? `Email: ${promise.customer.email}` : undefined,
  ].filter((entry): entry is string => Boolean(entry));
  const links = [
    promise.customer.phone && phoneHref(promise.customer.phone)
      ? `Call customer: [${promise.customer.phone}](${phoneHref(promise.customer.phone)})`
      : undefined,
    promise.customer.phone && smsHref(promise.customer.phone)
      ? `Text customer: [${promise.customer.phone}](${smsHref(promise.customer.phone)})`
      : undefined,
    promise.location.label ? `Open map: [${promise.location.label}](${mapHref(promise.location.label)})` : undefined,
    `Customer status: ${promise.customerAccess.sharePath}`,
    paymentLink ? `Payment: ${paymentLink}` : "Payment: not created for this review draft",
  ].filter((entry): entry is string => Boolean(entry));
  const stopPoints = [
    "Stop before parts replacement unless the part, fitment, price, and customer approval are recorded.",
    "Stop before billing beyond the approved quote amount.",
    "Stop before telling the customer this is final or send-ready until Adam/Dez approves the packet.",
    ...promise.topRisks
      .filter((risk) => /parts|approval|window|schedule|proof|module|contact/i.test(risk))
      .slice(0, 4),
  ];

  return [
    "# WrenchReady Mobile",
    "",
    "Spokane's Premier Mobile Auto Service",
    "",
    "# INTERNAL SERVICE PLAN",
    "",
    `## ${promise.customer.name}`,
    "",
    `## ${vehicleLabel(promise)} - ${promise.serviceScope}`,
    "",
    `Internal field note: ${approvedScopeLabel(promise)}. Customer send, payment link creation, and any added repair/parts work require the recorded approval path.`,
    "",
    "## Simon: Contact + Job Location",
    "",
    bulletList(contactLine, "Customer contact not captured."),
    `- Job location: [${promise.location.label || "Address needed"}](${mapHref(promise.location.label || promise.location.city || "Spokane WA")})`,
    `- Before arrival: ${promise.location.accessNotes || promise.scheduledWindow.label || "Confirm arrival window and access before dispatch."}`,
    "",
    "## Vehicle",
    "",
    `- Vehicle: ${vehicleLabel(promise)}`,
    `- VIN: ${promise.notes.find((note) => /^VIN:/i.test(note)) || "Needed before parts/fitment if not already captured."}`,
    `- Odometer: ${promise.vehicle.mileage ? promise.vehicle.mileage.toLocaleString() : "Not captured"}`,
    "- Source notes: Promise CRM / Jeff quote draft / attached job evidence.",
    "",
    "## Concern",
    "",
    `- ${promise.serviceScope}`,
    `- Approved scope: ${approvedScopeLabel(promise)}`,
    `- What must be confirmed before deeper work: ${promise.customerApproval.customerMessage || promise.customerApproval.summary || "State what is proven versus suspected before recommending repair parts."}`,
    "",
    "## Invoice Path",
    "",
    `- Starting quote: ${amount !== undefined ? formatCurrency(amount) : "Amount not captured"}`,
    `- Labor block: ${laborHoursLabel(promise)}`,
    "- Follow-up invoice path: create only after diagnosis, parts/pricing, and approval are reviewed.",
    "- Billing rule: repairs, parts, additional testing, or work beyond approved diagnostic scope need separate approval.",
    `- Stripe/payment status: ${paymentStatusLabel(promise.paymentCollection)}${promise.paymentCollection?.invoiceReference ? ` - ${promise.paymentCollection.invoiceReference}` : ""}`,
    "- Stripe required: every customer-send quote needs a job-specific Stripe link or explicit pending reason.",
    "- Stop point: no customer send, payment link, parts purchase, or repair promise until review passes.",
    "",
    "## Diagnostic / Repair Flow",
    "",
    diagnosticTreeList(promise),
    "",
    "## Buttons + Links",
    "",
    bulletList(links as string[], "No links captured."),
    "",
    "## Invoice Separation / Final Invoice",
    "",
    `- Quote draft: ${amount !== undefined ? formatCurrency(amount) : "pending amount"} for ${promise.serviceScope}`,
    "- Final invoice: create after human review, customer approval, and payment-link verification.",
    "- Van stock: do not bill unless used and approved.",
    "- Customer approval rule: customer-facing scope must match the external quote and approval card.",
    "",
    "## Photo / Proof Checklist",
    "",
    bulletList(
      fieldExecution?.photosRequired || [],
      "VIN/vehicle, odometer, concern evidence, meter/scanner readings, suspected area, and final proof.",
    ),
    "",
    "## Tools, Specs + Parts Notes",
    "",
    "### Required Tools / Equipment",
    "",
    bulletList(
      fieldExecution?.requiredTools || [],
      "Not captured. Confirm the actual tool/equipment list before dispatch.",
    ),
    "",
    "### Manufacturer Specs / Service Data",
    "",
    bulletList(
      fieldExecution?.mfgSpecs || [],
      "Not captured. Confirm service data, torque specs, reset/learn procedures, and safety steps before repair work.",
    ),
    "",
    "### Service Data Checks",
    "",
    bulletList(
      fieldExecution?.serviceDataChecks || [],
      "Check OE/service-data procedure, TSBs, wiring diagrams, relearn/reset steps, and battery/voltage prerequisites as applicable.",
    ),
    "",
    "### Fitment Cautions",
    "",
    bulletList(
      fieldExecution?.fitmentCautions || [],
      "No fitment cautions captured. Verify VIN/engine/options before parts ordering.",
    ),
    "",
    "### Parts Notes",
    "",
    bulletList(
      [
        ...(fieldExecution?.partsChecklist || []),
        ...partsSummary(fieldExecution?.partsPlan),
      ],
      "No approved parts for this quote packet.",
    ),
    "",
    "## Stop Points",
    "",
    bulletList([...new Set(stopPoints)], "Stop before extra work or billing beyond approved scope."),
    "",
    "## QA Before Send",
    "",
    bulletList(
      qaChecks.map((check) => `${check.status.toUpperCase()} - ${check.label}: ${check.detail || ""}`),
      "QA not generated.",
    ),
  ].join("\n");
}

function buildExternalMarkdown(promise: PromiseRecord) {
  const amount = quoteAmount(promise);
  const paymentLink = paymentLinkFromCollection(promise.paymentCollection);
  const serviceScope =
    promise.customerApproval.requestedService ||
    promise.customerApproval.summary ||
    promise.serviceScope;

  return [
    "# WrenchReady Mobile",
    "",
    "Spokane's Premier Mobile Auto Service",
    "",
    "# CUSTOMER QUOTE",
    "",
    `## ${firstName(promise.customer.name)}, we are ready to start with ${vehicleLabel(promise)}.`,
    "",
    promise.customerApproval.customerMessage ||
      `This quote is for ${serviceScope}. WrenchReady will explain any added parts or repair time and get approval before moving forward.`,
    "",
    "## Vehicle",
    "",
    `- ${vehicleLabel(promise)}`,
    "- VIN: to be confirmed if parts or fitment become part of the next step.",
    "",
    "## Location",
    "",
    `- ${promise.location.label || "Location to be confirmed"}`,
    promise.location.accessNotes ? `- ${promise.location.accessNotes}` : "- Access details to be confirmed before arrival.",
    "",
    "## Diagnostic / Quote",
    "",
    `- ${amount !== undefined ? formatCurrency(amount) : "Amount pending review"}`,
    `- Scope: ${serviceScope}`,
    `- Schedule: ${promise.scheduledWindow.label}`,
    "",
    "## What Is Included First",
    "",
    numberedList(
      promise.fieldExecution?.inspectionChecklist || [],
      "Work through the approved diagnostic scope and document what is proven.",
    ),
    "",
    "## Price Breakdown",
    "",
    "| Line Item | What It Covers | Status / Price |",
    "| --- | --- | --- |",
    `| Diagnostic / service block | ${serviceScope} | ${amount !== undefined ? formatCurrency(amount) : "Pending review"} |`,
    "| Possible follow-up | Parts, modules, key/fob work, or repair labor outside this scope | Separate quote and approval required |",
    "",
    "## Payment",
    "",
    `- Amount due now: ${paymentLink ? formatCurrency(amount) : "Not requested yet"}`,
    `- Stripe link: ${paymentLink || "Pending office review; not created for this draft."}`,
    "",
    "## Not Included Without Approval",
    "",
    bulletList(customerSafeCaveats(promise), "Additional parts, repair labor, or extra diagnostic time."),
    "",
    "## Important Note",
    "",
    "This is a review draft until WrenchReady confirms the final appointment window, customer-send approval, and payment-link status.",
    "",
    "## Next Step",
    "",
    "WrenchReady will review this quote, confirm the timing and payment path, then send the customer-safe version for approval.",
  ].join("\n");
}

export function buildPromiseQuotePacket(
  promise: PromiseRecord,
  options: {
    generatedAt?: string;
    generatedBy?: PromiseQuotePacket["generatedBy"];
    reviewOwner?: PromiseQuotePacket["reviewOwner"];
  } = {},
): PromiseQuotePacket {
  const qaChecks = buildQaChecks(promise);
  const blockers = qaBlockers(qaChecks);
  const hasHardBlocker = qaChecks.some((check) => check.status === "blocked");
  const amount = quoteAmount(promise);
  const paymentLink = paymentLinkFromCollection(promise.paymentCollection);
  const status: PromiseQuotePacketStatus = hasHardBlocker ? "blocked" : "draft-for-review";
  const generatedAt = options.generatedAt || new Date().toISOString();
  const internalMarkdown = buildInternalMarkdown(promise, qaChecks);
  const externalMarkdown = buildExternalMarkdown(promise);
  const packetSummary = [
    promise.serviceScope,
    amount !== undefined ? formatCurrency(amount) : "amount pending",
    promise.scheduledWindow.label,
  ].join(" / ");

  return {
    version: "wrenchready-quote-packet-v1",
    generatedAt,
    generatedBy: options.generatedBy || "Jeff",
    source: "promise-crm",
    status,
    customerSendStatus: "not-sent",
    paymentLinkStatus: paymentLink ? "pending-review" : "not-created",
    reviewOwner: options.reviewOwner || "Dez",
    internalServicePlan: {
      audience: "internal",
      title: `${promise.customer.name} - Internal Service Plan`,
      summary: `Internal plan for ${packetSummary}.`,
      markdown: internalMarkdown,
    },
    externalCustomerQuote: {
      audience: "customer",
      title: `${promise.customer.name} - Customer Quote Draft`,
      summary: `Customer quote draft for ${packetSummary}.`,
      markdown: externalMarkdown,
    },
    qaChecks,
    blockers,
    nextAction: hasHardBlocker
      ? "Fix blocked quote facts before this packet can be reviewed for customer send."
      : "Adam/Dez review the internal plan and customer quote draft before customer send or payment-link creation.",
  };
}
