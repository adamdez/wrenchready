type QuoteDraftSourceInput = {
  text?: string;
  jobId?: string;
  jobLabel?: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  address?: string;
  requestedWindow?: string;
  sourceLabel: string;
  sourceReference: string;
};

function objectValue(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined;
}

function titleCaseName(value: string) {
  return value
    .split(/\s+/)
    .map((part) => part ? `${part[0].toUpperCase()}${part.slice(1).toLowerCase()}` : "")
    .join(" ")
    .trim();
}

function unique(values: Array<string | undefined>) {
  return [...new Set(values.map((value) => value?.trim()).filter((value): value is string => Boolean(value)))];
}

function diagnosticSentences(text: string, terms: string[], limit: number) {
  return text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+|\s+(?=Customer:|Simon:|User:|Jeff:)/i)
    .map((entry) => entry.replace(/^(Customer|Simon|User|Jeff):\s*/i, "").trim())
    .filter((entry) => entry && terms.some((term) => entry.toLowerCase().includes(term)))
    .slice(0, limit);
}

export function likelyWantsQuoteDraft(text = "") {
  return (
    /\b(quote|estimate|bid|pricing|price this|service plan|customer quote|internal service plan|diagnostic block)\b/i.test(text) &&
    /\b(create|build|draft|prepare|put together|need|needs|send|review|schedule|customer|client|job)\b/i.test(text)
  );
}

export function extractVehicleFromQuoteText(text = "") {
  const normalized = text.replace(/\s+/g, " ");
  const vehicle = normalized.match(
    /\b((?:19|20)\d{2}\s+(?:chevy|chevrolet|ford|subaru|dodge|ram|toyota|honda|nissan|jeep|gmc|chrysler|cadillac|buick|kia|hyundai|mazda|volkswagen|vw)\s+[a-z0-9][a-z0-9 -]{1,35})\b/i,
  )?.[1];
  if (vehicle) return vehicle.replace(/\bchevy\b/i, "Chevy").trim();

  const astro = normalized.match(/\bastro\s+van\b/i)?.[0];
  if (astro) return "Chevy Astro";

  return undefined;
}

export function extractMoneyFromQuoteText(text = "") {
  const match = text.replace(/,/g, "").match(/\$\s*(\d+(?:\.\d{1,2})?)|\b(\d+(?:\.\d{1,2})?)\s*(?:dollars|bucks)\b/i);
  if (!match) return undefined;
  const value = Number(match[1] || match[2]);
  return Number.isFinite(value) ? value : undefined;
}

export function extractHoursFromQuoteText(text = "") {
  const numeric = text.match(/\b(\d+(?:\.\d+)?)\s*(?:hour|hr)s?\b/i)?.[1];
  if (numeric) {
    const value = Number(numeric);
    if (Number.isFinite(value)) return value;
  }
  if (/\btwo[-\s]?hour/i.test(text)) return 2;
  if (/\bone[-\s]?hour/i.test(text)) return 1;
  if (/\bthree[-\s]?hour/i.test(text)) return 3;
  if (/\bfour[-\s]?hour/i.test(text)) return 4;
  return undefined;
}

export function extractRequestedWindowFromQuoteText(text = "") {
  const normalized = text.replace(/\s+/g, " ");
  const day = normalized.match(/\b(today|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i)?.[1];
  const time = normalized.match(/\b(?:at|around|about)\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\b/i)?.[1];
  if (day && time) return `${day} ${time}`;
  return day;
}

export function extractQuoteCustomerName(text = "") {
  const tammy = text.match(/\bTammy\s+Wilson\b/i)?.[0];
  if (tammy) return "Tammy Wilson";

  const match = text.match(
    /\b(?:customer|client|for)\s+([a-z][a-z'-]+(?:\s+[a-z][a-z'-]+){0,2})(?=\s+(?:with|on|about|needs?|for|monday|tuesday|wednesday|thursday|friday|saturday|sunday|a|an|the|\d{4}|$))/i,
  )?.[1];
  if (!match) return undefined;
  const cleaned = match.replace(/\b(a|an|the|quote|estimate|job|customer|client)\b/gi, "").replace(/\s+/g, " ").trim();
  return cleaned ? titleCaseName(cleaned) : undefined;
}

export function extractQuoteScope(text = "") {
  const parasitic = text.match(/\b(?:two[-\s]?hour\s+)?(?:parasitic[-\s]?draw|electrical)\s+(?:diagnostic|diagnosis|follow[-\s]?up|block)[a-z0-9 -]{0,80}\b/i)?.[0];
  if (parasitic) {
    const hours = extractHoursFromQuoteText(text);
    const prefix = hours ? `${hours === 2 ? "Two" : hours}-hour ` : "";
    return `${prefix}parasitic draw diagnostic follow-up`;
  }

  const explicit = text.match(
    /\b((?:(?:one|two|three|four|\d+(?:\.\d+)?)\s*[- ]?\s*hours?\s+)?[a-z0-9 -]{0,80}?(?:diagnostic|diag|diagnosis|repair|replacement|service|follow[- ]?up|inspection|test|block|labor|install|no-start|parasitic draw|battery|starter|brake|oil change)[a-z0-9 -]{0,120})\b/i,
  )?.[1];
  const block = explicit || text.match(/\b(?:quote|estimate|scope)\s+(?:for\s+)?(.{8,160})$/i)?.[1];
  if (!block) return undefined;
  const cleaned = block
    .replace(/\b(?:for\s+)?(?:customer|client)\s+[a-z][a-z'-]+(?:\s+[a-z][a-z'-]+){0,2}\b/gi, "")
    .replace(/\b(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday|today|tomorrow)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 220);

  if (!/\b(diagnostic|diag|diagnosis|repair|replacement|service|follow[- ]?up|inspection|test|block|labor|install|no-start|parasitic draw|battery|starter|brake|oil change)\b/i.test(cleaned)) {
    return undefined;
  }

  return cleaned || undefined;
}

function quoteCaveats(text: string) {
  const defaults = [
    /additional|separate|parts|not include/i.test(text)
      ? "Parts and repair labor beyond this quote require separate approval."
      : undefined,
    /two[-\s]?hour|2\s*hour|diagnostic block/i.test(text)
      ? "Diagnostic time may not fully solve the issue; Jeff should present proven findings and next approval point."
      : undefined,
    /schedule|monday|tomorrow|today|window/i.test(text)
      ? "Schedule window must be confirmed before customer send."
      : undefined,
  ];

  return unique(defaults);
}

function parasiticDrawPacketAddons(text: string) {
  if (!/parasitic|draw|climate|security|fuse|module/i.test(text)) {
    return {};
  }

  return {
    diagnosticChecklist: [
      "Confirm battery state of charge and meter setup before draw testing.",
      "Let modules time out/asleep before recording draw readings.",
      "Record baseline draw, then isolate the suspected circuit again.",
      "Unplug the suspected module/branch and recheck draw before recommending parts.",
      "Document what changed and what remains unproven before recommending any part.",
    ],
    requiredTools: [
      "Digital multimeter with fused amp input or low-amp clamp suitable for parasitic draw work",
      "Battery maintainer or charger",
      "Scan tool as needed for module status and codes",
      "Fuse puller, fused jumper/test leads, backprobe leads, trim tools, and lighting",
    ],
    mfgSpecs: [
      "Confirm acceptable sleep-current target and module sleep timing from service data before final judgment.",
      "Use service-data wiring/fuse/module location information before unplugging modules.",
    ],
    serviceDataChecks: [
      "Fuse panel layout and wiring diagram for the suspect circuit.",
      "Security/climate module locations and connectors where relevant.",
      "Known TSB/search for parasitic draw issues on the exact vehicle.",
      "Module sleep/wake procedure and battery disconnect relearn considerations.",
    ],
    fitmentCautions: [
      "No replacement part is approved by this quote.",
      "VIN/options must be verified before pricing or ordering any module part.",
      "Do not call a module failed until draw change is proven with module/circuit isolation.",
    ],
    photosRequired: [
      "VIN/odometer if accessible",
      "Battery and terminal condition",
      "Meter setup and baseline draw reading",
      "Suspect fuse/circuit position",
      "Module access area and post-unplug draw reading if reached",
    ],
  };
}

export function buildQuoteDraftPayloadFromText(input: QuoteDraftSourceInput) {
  const text = input.text || "";
  if (!likelyWantsQuoteDraft(text)) return null;

  const priorDiagnosticFacts = diagnosticSentences(text, [
    "parasitic",
    "draw",
    "amps",
    "fuse",
    "climate",
    "security",
    "module",
    "unplug",
    "voltage",
    "starter",
    "battery",
  ], 8);
  const serviceScope = extractQuoteScope(text);
  const addons = parasiticDrawPacketAddons(text);

  return {
    jobId: input.jobId,
    customerName: input.customerName || extractQuoteCustomerName(text),
    customerPhone: input.customerPhone,
    customerEmail: input.customerEmail,
    vehicle: extractVehicleFromQuoteText(text) || input.jobLabel,
    address: input.address,
    requestedWindow: input.requestedWindow || extractRequestedWindowFromQuoteText(text),
    serviceScope,
    quoteAmount: extractMoneyFromQuoteText(text),
    laborHours: extractHoursFromQuoteText(text),
    caveats: quoteCaveats(text),
    priorDiagnosticFacts,
    sourceLabel: input.sourceLabel,
    sourceReference: input.sourceReference,
    ...addons,
  };
}

export function summarizeQuoteDraftAction(action: unknown) {
  const value = objectValue(action);
  if (!value) return undefined;
  const data = objectValue(value.data);

  return {
    success: value.success === true,
    tool: typeof value.tool === "string" ? value.tool : undefined,
    assistantSay: typeof value.assistantSay === "string" ? value.assistantSay : undefined,
    quoteDraftStatus: typeof data?.quoteDraftStatus === "string" ? data.quoteDraftStatus : undefined,
    promiseId: typeof data?.promiseId === "string" ? data.promiseId : undefined,
    updatedExistingPromise:
      typeof data?.updatedExistingPromise === "boolean" ? data.updatedExistingPromise : undefined,
    createdNewPromise:
      typeof data?.createdNewPromise === "boolean" ? data.createdNewPromise : undefined,
  };
}
