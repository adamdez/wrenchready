export const JEFF_ACTION_STATES = [
  "pending",
  "drafted",
  "sent",
  "blocked",
  "failed",
  "verified",
] as const;

export type JeffActionState = typeof JEFF_ACTION_STATES[number];

export type JeffActionCategory =
  | "diagnostic"
  | "field-note"
  | "photo"
  | "quote"
  | "parts"
  | "purchase"
  | "payment"
  | "booking"
  | "calendar"
  | "email"
  | "memory"
  | "knowledge"
  | "spec"
  | "closeout"
  | "admin"
  | "unknown";

export type JeffActionStateSnapshot = {
  state: JeffActionState;
  category: JeffActionCategory;
  statePhrase: string;
  allowedClaims: string[];
  forbiddenClaims: string[];
  idempotencyKey?: string;
  requiresHumanReview: boolean;
  recordedAt: string;
};

type ActionStateInput = {
  tool: string;
  success?: boolean;
  data?: unknown;
  assistantSay?: string;
  warnings?: string[];
  state?: JeffActionState;
  category?: JeffActionCategory;
};

type ClaimRule = {
  id: string;
  pattern: RegExp;
  allowed: (states: JeffActionStateSnapshot[]) => boolean;
  correction: string;
};

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function optionalString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function validState(value: unknown): value is JeffActionState {
  return typeof value === "string" && JEFF_ACTION_STATES.includes(value as JeffActionState);
}

function stringField(data: unknown, key: string) {
  return isObject(data) ? optionalString(data[key]) : undefined;
}

function booleanField(data: unknown, key: string) {
  return isObject(data) && typeof data[key] === "boolean" ? data[key] : undefined;
}

export function inferJeffActionCategory(tool: string): JeffActionCategory {
  if (/diagnostic/i.test(tool)) return "diagnostic";
  if (/field_note|field_event|record_field_note|record_field_event/i.test(tool)) return "field-note";
  if (/photo|image/i.test(tool)) return "photo";
  if (/quote/i.test(tool)) return "quote";
  if (/purchase|reserve/i.test(tool)) return "purchase";
  if (/parts|part_|nearby_parts/i.test(tool)) return "parts";
  if (/payment|stripe|invoice/i.test(tool)) return "payment";
  if (/booking|schedule_context/i.test(tool)) return "booking";
  if (/calendar/i.test(tool)) return "calendar";
  if (/email|gmail|recap/i.test(tool)) return "email";
  if (/memory/i.test(tool)) return "memory";
  if (/knowledge|search/i.test(tool)) return "knowledge";
  if (/vin|spec/i.test(tool)) return "spec";
  if (/closeout/i.test(tool)) return "closeout";
  if (/sync|capabilit|context/i.test(tool)) return "admin";
  return "unknown";
}

function stateFromData(input: ActionStateInput, category: JeffActionCategory): JeffActionState | undefined {
  const data = input.data;
  const emailStatus = stringField(data, "emailStatus");
  if (emailStatus === "sent" || emailStatus === "drafted" || emailStatus === "blocked" || emailStatus === "failed") {
    return emailStatus;
  }

  const quoteDraftStatus = stringField(data, "quoteDraftStatus");
  if (quoteDraftStatus?.startsWith("failed")) return "failed";
  if (quoteDraftStatus?.startsWith("blocked")) return "blocked";
  if (quoteDraftStatus === "ready-for-human-review") return "drafted";

  const customerSendStatus = stringField(data, "customerSendStatus");
  if (customerSendStatus === "sent") return "sent";

  const cartStatus = stringField(data, "cartStatus");
  if (cartStatus) return "drafted";

  const decision = stringField(data, "decision");
  if (category === "booking" && decision) return "drafted";

  const dryRun = booleanField(data, "dryRun");
  if (category === "calendar" && dryRun) return "verified";
  if (category === "calendar" && Array.isArray(isObject(data) ? data.synced : undefined)) return "sent";

  const reconciliation = isObject(data) && isObject(data.reconciliation) ? data.reconciliation : undefined;
  const reconciliationStatus = stringField(reconciliation, "status");
  if (category === "payment" && reconciliationStatus) {
    if (reconciliationStatus.startsWith("blocked")) return "blocked";
    if (reconciliationStatus.includes("failed")) return "failed";
    return "verified";
  }

  if (category === "field-note" && (isObject(data) && (data.event || data.fieldEventStorageStatus))) return "verified";
  if (category === "photo" && (isObject(data) && (data.photos || data.analysis))) return "verified";
  if (category === "closeout" && (isObject(data) && data.closeout)) return "drafted";
  if (category === "spec" && input.success) return "verified";
  if (category === "knowledge" && input.success) return "verified";

  return undefined;
}

export function inferJeffActionState(input: ActionStateInput): JeffActionState {
  if (validState(input.state)) return input.state;

  const category = input.category || inferJeffActionCategory(input.tool);
  const dataState = stateFromData(input, category);
  if (dataState) return dataState;

  if (!input.success) {
    const statusText = [
      stringField(input.data, "status"),
      stringField(input.data, "emailStatus"),
      stringField(input.data, "quoteDraftStatus"),
      ...(input.warnings || []),
      input.assistantSay,
    ].filter(Boolean).join(" ").toLowerCase();

    return /fail|error/.test(statusText) ? "failed" : "blocked";
  }

  if (category === "quote" || category === "parts" || category === "booking" || category === "closeout") return "drafted";
  if (category === "email" || category === "calendar") return "sent";
  if (category === "purchase") return "blocked";
  return "verified";
}

function claimsFor(input: {
  category: JeffActionCategory;
  state: JeffActionState;
  data?: unknown;
}) {
  const allowed = new Set<string>();
  const forbidden = new Set<string>();
  const { category, state, data } = input;

  if (state === "blocked") allowed.add("blocked");
  if (state === "failed") allowed.add("failed");
  if (state === "drafted") allowed.add("drafted");
  if (state === "verified") allowed.add("verified");
  if (state === "sent") allowed.add("sent");

  if (category === "quote") {
    allowed.add("quote draft prepared");
    forbidden.add("sent to customer");
    forbidden.add("payment link created");
  }
  if (category === "purchase" || category === "parts") {
    forbidden.add("bought");
    forbidden.add("reserved");
    forbidden.add("ordered");
  }
  if (category === "booking") {
    allowed.add("booking recommendation drafted");
    forbidden.add("booked");
    forbidden.add("scheduled");
    forbidden.add("confirmed appointment");
  }
  if (category === "payment") {
    allowed.add("checked payment status");
    forbidden.add("charged customer");
    forbidden.add("created payment link");
  }
  if (category === "email" && state !== "sent") {
    forbidden.add("emailed");
    forbidden.add("sent");
  }
  if (category === "email" && state === "sent" && stringField(data, "providerMessageId")) {
    allowed.add("provider message id recorded");
  }

  return {
    allowedClaims: [...allowed],
    forbiddenClaims: [...forbidden],
  };
}

export function describeJeffActionState(input: {
  category: JeffActionCategory;
  state: JeffActionState;
  data?: unknown;
}) {
  const { category, state, data } = input;
  if (state === "blocked") return "State BLOCKED: no side effect happened.";
  if (state === "failed") return "State FAILED: the action did not complete.";

  if (category === "quote" && state === "drafted") {
    return "State DRAFTED: quote draft is ready for human review; it was not sent to the customer and no payment link was created.";
  }
  if (category === "purchase" || category === "parts") {
    return state === "drafted"
      ? "State DRAFTED: parts handoff/cart is prepared; no purchase, reservation, or order happened."
      : "State BLOCKED: no purchase, reservation, or order happened.";
  }
  if (category === "booking") {
    return "State DRAFTED: booking guidance/hold is prepared for review; no appointment is booked or promised.";
  }
  if (category === "payment" && state === "verified") {
    const updated = isObject(data) && isObject(data.reconciliation) && data.reconciliation.crmUpdated === true;
    return updated
      ? "State VERIFIED: Stripe/payment status was checked and the CRM was updated by backend reconciliation."
      : "State VERIFIED: Stripe/payment status was checked; no new charge or payment link was created.";
  }
  if (category === "email" && state === "sent") {
    return "State SENT: backend email transport confirmed the recap send.";
  }
  if (category === "email" && state === "drafted") {
    return "State DRAFTED: email recap is drafted; it was not sent.";
  }
  if (category === "calendar" && state === "sent") {
    return "State SENT: backend calendar sync wrote the mirror event.";
  }
  if (category === "field-note" && state === "verified") {
    return "State VERIFIED: field note/event was recorded by the backend.";
  }
  if (category === "photo" && state === "verified") {
    return "State VERIFIED: photo evidence/analysis was recorded by the backend.";
  }
  if (category === "spec" && state === "verified") {
    return "State VERIFIED: relay only the saved/verified spec values exactly as recorded.";
  }

  return `State ${state.toUpperCase()}: ${state} backend result recorded for ${category}.`;
}

function idempotencyKeyFor(input: ActionStateInput) {
  const data = isObject(input.data) ? input.data : {};
  return optionalString(data.idempotencyKey) ||
    optionalString(data.providerMessageId) ||
    optionalString(data.promiseId) ||
    optionalString(data.eventId) ||
    optionalString(data.conversationId);
}

export function makeJeffActionState(input: ActionStateInput): JeffActionStateSnapshot {
  const category = input.category || inferJeffActionCategory(input.tool);
  const state = inferJeffActionState({ ...input, category });
  const claims = claimsFor({ category, state, data: input.data });

  return {
    state,
    category,
    statePhrase: describeJeffActionState({ category, state, data: input.data }),
    ...claims,
    idempotencyKey: idempotencyKeyFor(input),
    requiresHumanReview:
      state === "blocked" ||
      state === "failed" ||
      state === "drafted" ||
      category === "quote" ||
      category === "booking" ||
      category === "purchase",
    recordedAt: new Date().toISOString(),
  };
}

export function normalizeJeffActionState(value: unknown, fallback: ActionStateInput): JeffActionStateSnapshot {
  if (!isObject(value)) return makeJeffActionState(fallback);
  const category = optionalString(value.category) as JeffActionCategory | undefined;
  const state = optionalString(value.state);
  return makeJeffActionState({
    ...fallback,
    category,
    state: validState(state) ? state : undefined,
  });
}

const claimRules: ClaimRule[] = [
  {
    id: "sent",
    pattern: /\b(i|jeff|we)\s+(sent|texted|emailed)\b/i,
    allowed: (states) => states.some((state) => state.category === "email" && state.state === "sent"),
    correction: "No backend email/SMS send state is recorded.",
  },
  {
    id: "booked",
    pattern: /\b(i|jeff|we)\s+(booked|scheduled|confirmed)\b/i,
    allowed: () => false,
    correction: "No backend booking confirmation state is recorded.",
  },
  {
    id: "money",
    pattern: /\b(i|jeff|we)\s+(charged|billed|approved|created a payment link|sent a payment link)\b/i,
    allowed: () => false,
    correction: "No backend charge, approval, or payment-link state is recorded.",
  },
  {
    id: "parts-order",
    pattern: /\b(i|jeff|we)\s+(ordered|reserved|bought|purchased)\b/i,
    allowed: () => false,
    correction: "No backend purchase, reservation, or order state is recorded.",
  },
];

function appearsNegated(sentence: string, matchIndex: number) {
  const prefix = sentence.slice(Math.max(0, matchIndex - 48), matchIndex).toLowerCase();
  return /\b(no|not|never|didn'?t|did not|don'?t|do not|cannot|can'?t|couldn'?t|could not|won'?t|will not|wasn'?t|isn'?t)\b/.test(prefix);
}

export function findUnsupportedJeffActionClaims(reply: string, states: JeffActionStateSnapshot[]) {
  const findings: string[] = [];
  const sentences = reply
    .split(/(?<=[.!?])\s+|\n+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);

  for (const sentence of sentences) {
    for (const rule of claimRules) {
      const match = rule.pattern.exec(sentence);
      if (!match || appearsNegated(sentence, match.index) || rule.allowed(states)) continue;
      findings.push(`${rule.id}: ${rule.correction}`);
    }
  }

  return [...new Set(findings)];
}

export function enforceJeffActionClaims(reply: string, states: JeffActionStateSnapshot[]) {
  const findings = findUnsupportedJeffActionClaims(reply, states);
  if (findings.length === 0) return { reply, warnings: [] as string[] };

  const stateLines = states
    .filter((state) => state.requiresHumanReview || state.state === "sent" || state.state === "verified")
    .slice(0, 3)
    .map((state) => state.statePhrase);
  const correction = [
    "State check: I did not send, book, charge, approve, order, reserve, or promise anything unless the backend state above says so.",
    ...stateLines,
  ].join(" ");

  return {
    reply: correction,
    warnings: findings,
  };
}
