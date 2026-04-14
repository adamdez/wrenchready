import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getStripeClient, mapStripePaymentMethod } from "@/lib/stripe";
import { getPromiseRecord, updatePromiseRecord } from "@/lib/promise-crm/server";
import { sendOpsWebhook } from "@/lib/promise-crm/webhooks";
import { readEnv } from "@/lib/env";

export const dynamic = "force-dynamic";

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

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const promiseId = session.metadata?.promiseId;
    const paymentType = session.metadata?.paymentType;

    if (promiseId && (paymentType === "visit-deposit" || paymentType === "visit-balance")) {
      const existing = await getPromiseRecord(promiseId);
      const reference = session.payment_intent?.toString() || session.id;

      if (!existing) {
        return NextResponse.json({ received: true, missingPromise: true });
      }

      if (existing.paymentCollection?.lastPaymentReference === reference) {
        return NextResponse.json({ received: true, duplicate: true });
      }

      const amountCollected = (session.amount_total || 0) / 100;
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
          status: balanceDueAmount && balanceDueAmount > 0 ? "partial" : "paid",
          processor: "stripe",
          method: mapStripePaymentMethod(session.payment_method_types?.[0]),
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
            ? "Stripe reported a completed deposit checkout session."
            : "Stripe reported a completed remaining-balance checkout session.",
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
        },
      }).catch(() => false);
    }
  }

  return NextResponse.json({ received: true });
}
