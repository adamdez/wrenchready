import Stripe from "stripe";
import { getAppBaseUrl } from "@/lib/app-url";
import { readEnv } from "@/lib/env";
import type { PromisePaymentMethod, PromiseRecord } from "@/lib/promise-crm/types";

let stripeClient: Stripe | null = null;

export function isStripeConfigured() {
  return Boolean(
    readEnv("STRIPE_SECRET_KEY") &&
      readEnv("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY", "STRIPE_PUBLISHABLE_KEY"),
  );
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

function toCents(amount?: number) {
  if (amount === undefined || Number.isNaN(amount) || amount <= 0) return undefined;
  return Math.round(amount * 100);
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
