import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getStripeClient, mapStripePaymentMethod } from "@/lib/stripe";
import { getPromiseRecord, updatePromiseRecord } from "@/lib/promise-crm/server";
import { sendOpsWebhook } from "@/lib/promise-crm/webhooks";
import { readEnv } from "@/lib/env";

export const dynamic = "force-dynamic";

type StripePromisePaymentType = "visit-deposit" | "visit-balance";

function isStripePromisePaymentType(value: unknown): value is StripePromisePaymentType {
  return value === "visit-deposit" || value === "visit-balance";
}

function ignored(reason: string) {
  return NextResponse.json({ received: true, ignored: true, reason });
}

function isUsd(currency: string | null | undefined) {
  return currency?.toLowerCase() === "usd";
}

function validBusinessMetadata(metadata: Stripe.Metadata | null | undefined) {
  return metadata?.business === "wrenchready";
}

function sessionReference(session: Stripe.Checkout.Session) {
  return session.payment_intent?.toString() || session.id;
}

function amountFromCents(amount?: number | null) {
  return typeof amount === "number" ? amount / 100 : 0;
}

function paymentMethodFromSession(session: Stripe.Checkout.Session) {
  return mapStripePaymentMethod(session.payment_method_types?.[0]);
}

async function handleSuccessfulCheckout(
  session: Stripe.Checkout.Session,
  sourceEventType: string,
) {
  const promiseId = session.metadata?.promiseId;
  const paymentType = session.metadata?.paymentType;

  if (!validBusinessMetadata(session.metadata)) return ignored("non_wrenchready_metadata");
  if (!isUsd(session.currency)) return ignored("non_usd_session");
  if (!promiseId || !isStripePromisePaymentType(paymentType)) return ignored("missing_payment_metadata");
  if (session.payment_status !== "paid") return ignored("checkout_not_paid");

  const existing = await getPromiseRecord(promiseId);
  const reference = sessionReference(session);

  if (!existing) {
    return NextResponse.json({ received: true, missingPromise: true });
  }

  if (session.metadata?.customerToken && session.metadata.customerToken !== existing.customerAccess.token) {
    return ignored("customer_token_mismatch");
  }

  if (existing.paymentCollection?.lastPaymentReference === reference) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  const amountCollected = amountFromCents(session.amount_total);
  const priorCollected = existing.paymentCollection?.amountCollected || 0;
  const alreadyCaptured =
    paymentType === "visit-deposit"
      ? priorCollected >= amountCollected ||
        existing.paymentCollection?.status === "partial" ||
        existing.paymentCollection?.status === "paid" ||
        !!existing.paymentCollection?.depositPaidAt
      : existing.paymentCollection?.status === "paid" ||
        (existing.paymentCollection?.balanceDueAmount || 0) <= 0 ||
        !!existing.paymentCollection?.balancePaidAt;

  if (alreadyCaptured) {
    return NextResponse.json({ received: true, duplicate: true, alreadyCollected: true });
  }

  const existingBalance =
    paymentType === "visit-deposit"
      ? session.metadata?.balanceDueAmount
        ? Number(session.metadata.balanceDueAmount)
        : existing.paymentCollection?.balanceDueAmount
      : existing.paymentCollection?.balanceDueAmount;
  const totalCollected = priorCollected + amountCollected;
  const balanceDueAmount =
    existingBalance !== undefined
      ? Math.max(existingBalance - amountCollected, 0)
      : undefined;

  const updated = await updatePromiseRecord(promiseId, {
    paymentCollection: {
      ...existing.paymentCollection,
      status: balanceDueAmount && balanceDueAmount > 0 ? "partial" : "paid",
      processor: "stripe",
      method: paymentMethodFromSession(session),
      amountCollected: totalCollected,
      balanceDueAmount,
      collectedAt: new Date().toISOString(),
      depositPaidAt:
        paymentType === "visit-deposit"
          ? new Date().toISOString()
          : existing.paymentCollection?.depositPaidAt,
      balancePaidAt:
        paymentType === "visit-balance"
          ? new Date().toISOString()
          : existing.paymentCollection?.balancePaidAt,
      lastPaymentReference: reference,
      paymentSummary:
        balanceDueAmount && balanceDueAmount > 0
          ? paymentType === "visit-deposit"
            ? `Stripe deposit collected. ${balanceDueAmount.toFixed(2)} still due on the visit.`
            : `Stripe remaining balance collected. ${balanceDueAmount.toFixed(2)} still due on the visit.`
          : paymentType === "visit-deposit"
            ? "Stripe payment collected in full."
            : "Stripe remaining balance collected. The visit is now paid in full.",
    },
    jobStage:
      balanceDueAmount && balanceDueAmount > 0
        ? existing.jobStage || "confirmed"
        : "collected",
    nextAction:
      balanceDueAmount && balanceDueAmount > 0
        ? paymentType === "visit-deposit"
          ? "Deposit is recorded. Collect the remaining balance cleanly when the visit is complete."
          : "A balance payment landed, but money is still open. Clear the remaining balance before treating the job as fully collected."
        : "Payment is complete. Close the visit cleanly, ask for the review, and seed the next probable visit.",
    noteToAdd:
      paymentType === "visit-deposit"
        ? `Stripe reported ${sourceEventType} for a deposit checkout session.`
        : `Stripe reported ${sourceEventType} for a remaining-balance checkout session.`,
  });

  await sendOpsWebhook({
    event:
      paymentType === "visit-deposit"
        ? "promise_deposit_collected"
        : "promise_balance_collected",
    business: "wrenchready",
    payload: {
      promiseId: updated.id,
      customerName: updated.customer.name,
      amountCollected,
      balanceDueAmount: updated.paymentCollection?.balanceDueAmount || 0,
      method: updated.paymentCollection?.method || null,
      sessionId: session.id,
      sourceEventType,
    },
  }).catch(() => false);

  return NextResponse.json({ received: true });
}

async function handleFailedCheckout(session: Stripe.Checkout.Session) {
  const promiseId = session.metadata?.promiseId;
  const paymentType = session.metadata?.paymentType;

  if (!validBusinessMetadata(session.metadata)) return ignored("non_wrenchready_metadata");
  if (!isUsd(session.currency)) return ignored("non_usd_session");
  if (!promiseId || !isStripePromisePaymentType(paymentType)) return ignored("missing_payment_metadata");

  const existing = await getPromiseRecord(promiseId);
  const reference = `${session.id}:async_failed`;

  if (!existing) {
    return NextResponse.json({ received: true, missingPromise: true });
  }

  if (existing.paymentCollection?.lastPaymentReference === reference) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  await updatePromiseRecord(promiseId, {
    paymentCollection: {
      ...existing.paymentCollection,
      status:
        existing.paymentCollection?.status === "partial"
          ? "partial"
          : paymentType === "visit-deposit"
            ? "deposit-requested"
            : "awaiting-payment",
      processor: "stripe",
      lastPaymentReference: reference,
      paymentSummary:
        paymentType === "visit-deposit"
          ? "Stripe reported the async deposit payment failed. Do not treat the visit as secured."
          : "Stripe reported the async balance payment failed. Do not treat the job as fully collected.",
    },
    nextAction:
      paymentType === "visit-deposit"
        ? "Deposit payment failed. Contact the customer or send a fresh checkout link before confirming the visit."
        : "Balance payment failed. Contact the customer before closing the job as collected.",
    noteToAdd:
      paymentType === "visit-deposit"
        ? "Stripe reported an async deposit payment failure."
        : "Stripe reported an async balance payment failure.",
  });

  return NextResponse.json({ received: true });
}

async function metadataForCharge(stripe: Stripe, charge: Stripe.Charge) {
  if (validBusinessMetadata(charge.metadata)) return charge.metadata;

  const paymentIntentId =
    typeof charge.payment_intent === "string"
      ? charge.payment_intent
      : charge.payment_intent?.id;

  if (!paymentIntentId) return charge.metadata;

  const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
  return {
    ...paymentIntent.metadata,
    ...charge.metadata,
  };
}

async function handleRefundedCharge(stripe: Stripe, charge: Stripe.Charge) {
  const metadata = await metadataForCharge(stripe, charge);
  const promiseId = metadata.promiseId;
  const paymentType = metadata.paymentType;

  if (!validBusinessMetadata(metadata)) return ignored("non_wrenchready_metadata");
  if (!isUsd(charge.currency)) return ignored("non_usd_charge");
  if (!promiseId || !isStripePromisePaymentType(paymentType)) return ignored("missing_payment_metadata");

  const existing = await getPromiseRecord(promiseId);
  const refundedAmount = amountFromCents(charge.amount_refunded);
  const reference = `${charge.id}:refunded:${charge.amount_refunded}`;

  if (!existing) {
    return NextResponse.json({ received: true, missingPromise: true });
  }

  if (existing.paymentCollection?.lastPaymentReference === reference) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  const priorCollected = existing.paymentCollection?.amountCollected || 0;
  const amountCollected = Math.max(0, priorCollected - refundedAmount);
  const balanceDueAmount = (existing.paymentCollection?.balanceDueAmount || 0) + refundedAmount;

  await updatePromiseRecord(promiseId, {
    paymentCollection: {
      ...existing.paymentCollection,
      status: amountCollected > 0 ? "partial" : "awaiting-payment",
      processor: "stripe",
      amountCollected,
      balanceDueAmount,
      lastPaymentReference: reference,
      paymentSummary: `Stripe refund recorded for ${refundedAmount.toFixed(2)}. Reconcile the customer balance before closing the visit.`,
    },
    jobStage: existing.jobStage === "collected" ? "confirmed" : existing.jobStage,
    nextAction:
      "A Stripe refund changed the money state. Verify the customer balance and update the closeout before treating this job as collected.",
    noteToAdd: `Stripe reported a ${refundedAmount.toFixed(2)} refund for this promise.`,
  });

  return NextResponse.json({ received: true });
}

async function chargeForDispute(stripe: Stripe, dispute: Stripe.Dispute) {
  if (typeof dispute.charge !== "string") return dispute.charge as Stripe.Charge | null;
  return stripe.charges.retrieve(dispute.charge);
}

async function handleDisputeCreated(stripe: Stripe, dispute: Stripe.Dispute) {
  const charge = await chargeForDispute(stripe, dispute);
  const metadata = charge ? await metadataForCharge(stripe, charge) : dispute.metadata;
  const promiseId = metadata?.promiseId;
  const paymentType = metadata?.paymentType;

  if (!validBusinessMetadata(metadata)) return ignored("non_wrenchready_metadata");
  if (!isUsd(dispute.currency)) return ignored("non_usd_dispute");
  if (!promiseId || !isStripePromisePaymentType(paymentType)) return ignored("missing_payment_metadata");

  const existing = await getPromiseRecord(promiseId);
  const disputeAmount = amountFromCents(dispute.amount);
  const reference = `${dispute.id}:dispute`;

  if (!existing) {
    return NextResponse.json({ received: true, missingPromise: true });
  }

  if (existing.paymentCollection?.lastPaymentReference === reference) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  await updatePromiseRecord(promiseId, {
    paymentCollection: {
      ...existing.paymentCollection,
      status:
        (existing.paymentCollection?.amountCollected || 0) > disputeAmount
          ? "partial"
          : "awaiting-payment",
      processor: "stripe",
      balanceDueAmount: (existing.paymentCollection?.balanceDueAmount || 0) + disputeAmount,
      lastPaymentReference: reference,
      paymentSummary: `Stripe dispute opened for ${disputeAmount.toFixed(2)}. Treat collection as unresolved until the dispute is closed.`,
    },
    jobStage: existing.jobStage === "collected" ? "confirmed" : existing.jobStage,
    nextAction:
      "Stripe dispute opened. Preserve evidence, check the customer recap, and do not mark this job collected until the dispute is resolved.",
    noteToAdd: `Stripe reported a dispute for ${disputeAmount.toFixed(2)}.`,
  });

  return NextResponse.json({ received: true });
}

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  const webhookSecret = readEnv("STRIPE_WEBHOOK_SECRET");

  if (!signature || !webhookSecret) {
    return NextResponse.json(
      { error: "Stripe webhook is not configured." },
      { status: 503 },
    );
  }

  const body = await request.text();
  const stripe = getStripeClient();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid Stripe signature." },
      { status: 400 },
    );
  }

  if (
    event.type === "checkout.session.completed" ||
    event.type === "checkout.session.async_payment_succeeded"
  ) {
    return handleSuccessfulCheckout(event.data.object as Stripe.Checkout.Session, event.type);
  }

  if (event.type === "checkout.session.async_payment_failed") {
    return handleFailedCheckout(event.data.object as Stripe.Checkout.Session);
  }

  if (event.type === "charge.refunded") {
    return handleRefundedCharge(stripe, event.data.object as Stripe.Charge);
  }

  if (event.type === "charge.dispute.created") {
    return handleDisputeCreated(stripe, event.data.object as Stripe.Dispute);
  }

  return NextResponse.json({ received: true });
}
