import Stripe from "stripe";
import { getAppBaseUrl } from "@/lib/app-url";
import { readEnv } from "@/lib/env";
import type { PromisePaymentMethod, PromiseRecord } from "@/lib/promise-crm/types";

let stripeClient: Stripe | null = null;

export type StripePaymentReferenceKind =
  | "checkout_session"
  | "payment_intent"
  | "invoice"
  | "payment_link";

export type StripePaymentStatusMatch = {
  kind: StripePaymentReferenceKind;
  id: string;
  paid: boolean;
  status?: string | null;
  paymentStatus?: string | null;
  amountTotal?: number;
  amountPaid?: number;
  amountRemaining?: number;
  currency?: string | null;
  customerEmail?: string | null;
  createdAt?: string;
  paidAt?: string;
  checkoutSessionId?: string;
  paymentIntentId?: string;
  invoiceId?: string;
  paymentLinkId?: string;
  paymentLinkUrl?: string | null;
  hostedInvoiceUrl?: string | null;
  method?: PromisePaymentMethod;
  promiseId?: string;
  paymentType?: string;
  metadata?: Record<string, string>;
};

export type StripePaymentStatusCheck = {
  checkedAt: string;
  configured: boolean;
  mode: "live" | "test" | "unknown";
  promiseId?: string;
  searchedByPromiseId: boolean;
  references: {
    checkoutSessionIds: string[];
    paymentIntentIds: string[];
    invoiceIds: string[];
    paymentLinkIds: string[];
    paymentLinkUrls: string[];
  };
  matches: StripePaymentStatusMatch[];
  paidMatches: StripePaymentStatusMatch[];
  unpaidMatches: StripePaymentStatusMatch[];
  hasPaidStripePayment: boolean;
  totalPaidAmount?: number;
  latestPaidAt?: string;
  warnings: string[];
};

type StripePaymentStatusInput = {
  promiseId?: string;
  references?: string[];
  checkoutSessionIds?: string[];
  paymentIntentIds?: string[];
  invoiceIds?: string[];
  paymentLinkIds?: string[];
  paymentLinkUrls?: string[];
  searchPaymentIntentsByPromiseId?: boolean;
};

export function isStripeConfigured() {
  return Boolean(
    readEnv("STRIPE_SECRET_KEY") &&
      readEnv("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY", "STRIPE_PUBLISHABLE_KEY"),
  );
}

export function isStripeSecretConfigured() {
  return Boolean(readEnv("STRIPE_SECRET_KEY"));
}

export function getStripePublishableKey() {
  return readEnv("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY", "STRIPE_PUBLISHABLE_KEY");
}

export function getStripeClient() {
  const secretKey = readEnv("STRIPE_SECRET_KEY");
  if (!secretKey) {
    throw new Error("Stripe secret key is not configured.");
  }

  if (!stripeClient) {
    stripeClient = new Stripe(secretKey, {
      apiVersion: "2026-03-25.dahlia",
      typescript: true,
    });
  }

  return stripeClient;
}

function getStripeMode(): StripePaymentStatusCheck["mode"] {
  const secretKey = readEnv("STRIPE_SECRET_KEY") || "";
  if (secretKey.startsWith("sk_live_")) return "live";
  if (secretKey.startsWith("sk_test_")) return "test";
  return "unknown";
}

function toCents(amount?: number) {
  if (amount === undefined || Number.isNaN(amount) || amount <= 0) return undefined;
  return Math.round(amount * 100);
}

function fromCents(amount?: number | null) {
  return typeof amount === "number" ? amount / 100 : undefined;
}

function uniqueStrings(values: Array<string | undefined | null>) {
  return [...new Set(values.map((value) => value?.trim()).filter((value): value is string => Boolean(value)))];
}

function extractMatches(pattern: RegExp, text: string) {
  return [...text.matchAll(pattern)].map((match) => match[0]);
}

function normalizeStripeReferences(input: StripePaymentStatusInput) {
  const joinedReferences = (input.references || []).join("\n");
  const allReferenceText = [
    joinedReferences,
    ...(input.paymentLinkUrls || []),
  ].join("\n");

  return {
    checkoutSessionIds: uniqueStrings([
      ...(input.checkoutSessionIds || []),
      ...extractMatches(/\bcs_(?:test|live)_[A-Za-z0-9_]+\b/g, joinedReferences),
    ]),
    paymentIntentIds: uniqueStrings([
      ...(input.paymentIntentIds || []),
      ...extractMatches(/\bpi_[A-Za-z0-9_]+\b/g, joinedReferences),
    ]),
    invoiceIds: uniqueStrings([
      ...(input.invoiceIds || []),
      ...extractMatches(/\bin_[A-Za-z0-9_]+\b/g, joinedReferences),
    ]),
    paymentLinkIds: uniqueStrings([
      ...(input.paymentLinkIds || []),
      ...extractMatches(/\bplink_[A-Za-z0-9_]+\b/g, joinedReferences),
    ]),
    paymentLinkUrls: uniqueStrings([
      ...(input.paymentLinkUrls || []),
      ...extractMatches(/https:\/\/buy\.stripe\.com\/[^\s)>,"]+/g, allReferenceText),
    ]).map((url) => url.replace(/[).,]+$/, "")),
  };
}

function isoFromStripeSeconds(value?: number | null) {
  return typeof value === "number" ? new Date(value * 1000).toISOString() : undefined;
}

function metadataFromStripe(value?: Stripe.Metadata | null) {
  return value ? { ...value } : undefined;
}

function paymentIntentId(value: Stripe.Checkout.Session["payment_intent"]) {
  if (!value) return undefined;
  return typeof value === "string" ? value : value.id;
}

function invoiceId(value: unknown) {
  if (!value) return undefined;
  if (typeof value === "string") return value;
  if (typeof value === "object" && "id" in value && typeof value.id === "string") return value.id;
  return undefined;
}

function paymentIntentMethod(paymentIntent: Stripe.PaymentIntent) {
  const paymentMethodTypes = paymentIntent.payment_method_types || [];
  return mapStripePaymentMethod(paymentMethodTypes[0]);
}

function checkoutSessionMatch(session: Stripe.Checkout.Session): StripePaymentStatusMatch {
  const metadata = metadataFromStripe(session.metadata);
  const paid = session.payment_status === "paid";

  return {
    kind: "checkout_session",
    id: session.id,
    checkoutSessionId: session.id,
    paymentIntentId: paymentIntentId(session.payment_intent),
    invoiceId: invoiceId(session.invoice),
    paid,
    status: session.status,
    paymentStatus: session.payment_status,
    amountTotal: fromCents(session.amount_total),
    amountPaid: paid ? fromCents(session.amount_total) : undefined,
    currency: session.currency,
    customerEmail: session.customer_details?.email || session.customer_email || null,
    createdAt: isoFromStripeSeconds(session.created),
    paidAt: paid ? isoFromStripeSeconds(session.created) : undefined,
    method: mapStripePaymentMethod(session.payment_method_types?.[0]),
    promiseId: metadata?.promiseId,
    paymentType: metadata?.paymentType,
    metadata,
  };
}

function paymentIntentMatch(paymentIntent: Stripe.PaymentIntent): StripePaymentStatusMatch {
  const metadata = metadataFromStripe(paymentIntent.metadata);
  const paid = paymentIntent.status === "succeeded";

  return {
    kind: "payment_intent",
    id: paymentIntent.id,
    paymentIntentId: paymentIntent.id,
    invoiceId: invoiceId((paymentIntent as { invoice?: unknown }).invoice),
    paid,
    status: paymentIntent.status,
    amountTotal: fromCents(paymentIntent.amount),
    amountPaid: fromCents(paymentIntent.amount_received),
    amountRemaining:
      typeof paymentIntent.amount === "number" && typeof paymentIntent.amount_received === "number"
        ? fromCents(Math.max(paymentIntent.amount - paymentIntent.amount_received, 0))
        : undefined,
    currency: paymentIntent.currency,
    createdAt: isoFromStripeSeconds(paymentIntent.created),
    paidAt: paid ? isoFromStripeSeconds(paymentIntent.created) : undefined,
    method: paymentIntentMethod(paymentIntent),
    promiseId: metadata?.promiseId,
    paymentType: metadata?.paymentType,
    metadata,
  };
}

function invoiceMatch(invoice: Stripe.Invoice): StripePaymentStatusMatch {
  const invoiceWithRuntimeFields = invoice as Stripe.Invoice & {
    customer_email?: string | null;
    hosted_invoice_url?: string | null;
    status_transitions?: { paid_at?: number | null } | null;
  };
  const metadata = metadataFromStripe(invoice.metadata);
  const paid = invoice.status === "paid";

  return {
    kind: "invoice",
    id: invoice.id || "unknown-invoice",
    invoiceId: invoice.id || undefined,
    paid,
    status: invoice.status,
    amountTotal: fromCents(invoice.amount_due),
    amountPaid: fromCents(invoice.amount_paid),
    amountRemaining: fromCents(invoice.amount_remaining),
    currency: invoice.currency,
    customerEmail: invoiceWithRuntimeFields.customer_email || null,
    createdAt: isoFromStripeSeconds(invoice.created),
    paidAt: paid
      ? isoFromStripeSeconds(invoiceWithRuntimeFields.status_transitions?.paid_at || invoice.created)
      : undefined,
    promiseId: metadata?.promiseId,
    paymentType: metadata?.paymentType,
    metadata,
    hostedInvoiceUrl: invoiceWithRuntimeFields.hosted_invoice_url,
  };
}

function paymentLinkUrlKey(url: string) {
  return url.trim().replace(/\/+$/, "");
}

async function findPaymentLinksByUrl(
  stripe: Stripe,
  urls: string[],
  warnings: string[],
) {
  if (urls.length === 0) return [];

  const wanted = new Set(urls.map(paymentLinkUrlKey));
  const found: Stripe.PaymentLink[] = [];
  let startingAfter: string | undefined;

  for (let page = 0; page < 5; page += 1) {
    const links = await stripe.paymentLinks.list({
      limit: 100,
      ...(startingAfter ? { starting_after: startingAfter } : {}),
    });

    for (const link of links.data) {
      if (link.url && wanted.has(paymentLinkUrlKey(link.url))) found.push(link);
    }

    if (!links.has_more || found.length === urls.length) break;
    startingAfter = links.data.at(-1)?.id;
  }

  if (found.length < urls.length) {
    warnings.push(
      "One or more Stripe payment-link URLs did not match the first 500 Payment Links. A Stripe dashboard check may still be needed.",
    );
  }

  return found;
}

async function listCheckoutSessionsForPaymentLink(stripe: Stripe, paymentLinkId: string) {
  return stripe.checkout.sessions.list({
    limit: 20,
    payment_link: paymentLinkId,
  });
}

function sortNewestMatches(matches: StripePaymentStatusMatch[]) {
  return [...matches].sort(
    (a, b) =>
      new Date(b.paidAt || b.createdAt || 0).getTime() -
      new Date(a.paidAt || a.createdAt || 0).getTime(),
  );
}

function totalUniquePaidAmount(matches: StripePaymentStatusMatch[]) {
  const seen = new Set<string>();
  let total = 0;

  for (const match of matches) {
    if (!match.paid) continue;
    const key = match.paymentIntentId || match.checkoutSessionId || match.invoiceId || match.id;
    if (seen.has(key)) continue;
    seen.add(key);
    total += match.amountPaid || match.amountTotal || 0;
  }

  return total > 0 ? total : undefined;
}

export async function checkStripePaymentReferences(
  input: StripePaymentStatusInput,
): Promise<StripePaymentStatusCheck> {
  const checkedAt = new Date().toISOString();
  const references = normalizeStripeReferences(input);
  const warnings: string[] = [];

  if (!isStripeSecretConfigured()) {
    return {
      checkedAt,
      configured: false,
      mode: "unknown",
      promiseId: input.promiseId,
      searchedByPromiseId: false,
      references,
      matches: [],
      paidMatches: [],
      unpaidMatches: [],
      hasPaidStripePayment: false,
      warnings: ["STRIPE_SECRET_KEY is not configured, so Stripe payment status cannot be checked."],
    };
  }

  const stripe = getStripeClient();
  const matches: StripePaymentStatusMatch[] = [];

  for (const sessionId of references.checkoutSessionIds) {
    try {
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      matches.push(checkoutSessionMatch(session));
    } catch (error) {
      warnings.push(
        error instanceof Error
          ? `Stripe checkout session ${sessionId} could not be read: ${error.message}`
          : `Stripe checkout session ${sessionId} could not be read.`,
      );
    }
  }

  const paymentIntentIds = new Set(references.paymentIntentIds);
  for (const match of matches) {
    if (match.paymentIntentId) paymentIntentIds.add(match.paymentIntentId);
  }

  if (input.searchPaymentIntentsByPromiseId && input.promiseId) {
    try {
      const search = await stripe.paymentIntents.search({
        query: `metadata['promiseId']:'${input.promiseId.replace(/'/g, "\\'")}'`,
        limit: 10,
      });
      for (const paymentIntent of search.data) paymentIntentIds.add(paymentIntent.id);
    } catch (error) {
      warnings.push(
        error instanceof Error
          ? `Stripe payment search for promise ${input.promiseId} failed: ${error.message}`
          : `Stripe payment search for promise ${input.promiseId} failed.`,
      );
    }
  }

  for (const intentId of paymentIntentIds) {
    try {
      const paymentIntent = await stripe.paymentIntents.retrieve(intentId);
      matches.push(paymentIntentMatch(paymentIntent));
    } catch (error) {
      warnings.push(
        error instanceof Error
          ? `Stripe payment intent ${intentId} could not be read: ${error.message}`
          : `Stripe payment intent ${intentId} could not be read.`,
      );
    }
  }

  for (const invoiceIdValue of references.invoiceIds) {
    try {
      const invoice = await stripe.invoices.retrieve(invoiceIdValue);
      matches.push(invoiceMatch(invoice));
    } catch (error) {
      warnings.push(
        error instanceof Error
          ? `Stripe invoice ${invoiceIdValue} could not be read: ${error.message}`
          : `Stripe invoice ${invoiceIdValue} could not be read.`,
      );
    }
  }

  const paymentLinkIds = new Set(references.paymentLinkIds);
  try {
    const foundLinks = await findPaymentLinksByUrl(stripe, references.paymentLinkUrls, warnings);
    for (const link of foundLinks) paymentLinkIds.add(link.id);
  } catch (error) {
    warnings.push(
      error instanceof Error
        ? `Stripe payment-link URL lookup failed: ${error.message}`
        : "Stripe payment-link URL lookup failed.",
    );
  }

  for (const paymentLinkIdValue of paymentLinkIds) {
    try {
      const sessions = await listCheckoutSessionsForPaymentLink(stripe, paymentLinkIdValue);
      for (const session of sessions.data) {
        const sessionMatch = checkoutSessionMatch(session);
        matches.push({
          ...sessionMatch,
          kind: "payment_link",
          id: paymentLinkIdValue,
          paymentLinkId: paymentLinkIdValue,
          paymentLinkUrl: references.paymentLinkUrls.find(Boolean) || null,
        });
      }
    } catch (error) {
      warnings.push(
        error instanceof Error
          ? `Stripe payment link ${paymentLinkIdValue} could not be checked: ${error.message}`
          : `Stripe payment link ${paymentLinkIdValue} could not be checked.`,
      );
    }
  }

  const newestMatches = sortNewestMatches(matches);
  const paidMatches = newestMatches.filter((match) => match.paid);
  const unpaidMatches = newestMatches.filter((match) => !match.paid);

  return {
    checkedAt,
    configured: true,
    mode: getStripeMode(),
    promiseId: input.promiseId,
    searchedByPromiseId: Boolean(input.searchPaymentIntentsByPromiseId && input.promiseId),
    references,
    matches: newestMatches,
    paidMatches,
    unpaidMatches,
    hasPaidStripePayment: paidMatches.length > 0,
    totalPaidAmount: totalUniquePaidAmount(paidMatches),
    latestPaidAt: paidMatches[0]?.paidAt || paidMatches[0]?.createdAt,
    warnings,
  };
}

async function createPromiseCheckoutSession(
  promise: PromiseRecord,
  input: {
    amount: number;
    paymentType: "visit-deposit" | "visit-balance";
    productName: string;
    description: string;
    successParam: string;
    cancelParam: string;
  },
) {
  const stripe = getStripeClient();
  const amount = toCents(input.amount);
  if (!amount) throw new Error("No payment amount is recorded on this promise yet.");

  const baseUrl = getAppBaseUrl();
  const token = promise.customerAccess.token;
  const serviceLabel = promise.customerApproval.requestedService || promise.serviceScope;

  return stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: promise.customer.email || undefined,
    billing_address_collection: "auto",
    phone_number_collection: { enabled: true },
    success_url: `${baseUrl}/status/${token}?${input.successParam}=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl}/status/${token}?${input.cancelParam}=cancelled`,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: amount,
          product_data: {
            name: input.productName,
            description: input.description,
          },
        },
      },
    ],
    metadata: {
      business: "wrenchready",
      promiseId: promise.id,
      customerToken: token,
      paymentType: input.paymentType,
      serviceScope: promise.serviceScope,
      balanceDueAmount: promise.paymentCollection?.balanceDueAmount?.toString() || "",
    },
    payment_intent_data: {
      metadata: {
        business: "wrenchready",
        promiseId: promise.id,
        customerToken: token,
        paymentType: input.paymentType,
        serviceLabel,
      },
    },
  });
}

export async function createPromiseDepositCheckoutSession(promise: PromiseRecord) {
  const depositAmount = promise.paymentCollection?.depositRequestedAmount;
  if (!depositAmount) {
    throw new Error("No deposit amount is recorded on this promise yet.");
  }

  const serviceLabel = promise.customerApproval.requestedService || promise.serviceScope;

  return createPromiseCheckoutSession(promise, {
    amount: depositAmount,
    paymentType: "visit-deposit",
    productName: "WrenchReady visit deposit",
    description: `${serviceLabel} deposit to lock the visit and keep the promise real.`,
    successParam: "deposit",
    cancelParam: "deposit",
  });
}

export async function createPromiseBalanceCheckoutSession(promise: PromiseRecord) {
  const balanceAmount = promise.paymentCollection?.balanceDueAmount;
  if (!balanceAmount) {
    throw new Error("No remaining balance is recorded on this promise yet.");
  }

  const serviceLabel = promise.customerApproval.requestedService || promise.serviceScope;

  return createPromiseCheckoutSession(promise, {
    amount: balanceAmount,
    paymentType: "visit-balance",
    productName: "WrenchReady remaining balance",
    description: `${serviceLabel} remaining balance to close the visit cleanly.`,
    successParam: "balance",
    cancelParam: "balance",
  });
}

export function mapStripePaymentMethod(
  paymentMethodType?: string | null,
): PromisePaymentMethod | undefined {
  switch (paymentMethodType) {
    case "card":
      return "card";
    case "cashapp":
      return "cash-app-pay";
    case "link":
      return "link";
    default:
      return "card";
  }
}
