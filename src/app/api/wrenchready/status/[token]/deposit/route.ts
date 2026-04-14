import { NextResponse } from "next/server";
import { createPromiseDepositCheckoutSession, isStripeConfigured } from "@/lib/stripe";
import { getPromiseRecordByCustomerToken, updatePromiseRecord } from "@/lib/promise-crm/server";
import { sendOpsWebhook } from "@/lib/promise-crm/webhooks";

type RouteContext = {
  params: Promise<{ token: string }>;
};

export const dynamic = "force-dynamic";

export async function POST(_request: Request, context: RouteContext) {
  try {
    const { token } = await context.params;
    const promise = await getPromiseRecordByCustomerToken(token);

    if (!promise) {
      return NextResponse.json({ error: "Promise record not found." }, { status: 404 });
    }

    if (!isStripeConfigured()) {
      return NextResponse.json(
        { error: "Stripe is not configured yet for deposit checkout." },
        { status: 503 },
      );
    }

    const depositAmount = promise.paymentCollection?.depositRequestedAmount;
    if (!depositAmount || depositAmount <= 0) {
      return NextResponse.json(
        { error: "This promise does not have a deposit amount recorded yet." },
        { status: 409 },
      );
    }

    const existingCollection = promise.paymentCollection;

    if (
      existingCollection?.status === "paid" ||
      existingCollection?.status === "partial" ||
      (existingCollection?.amountCollected || 0) >= depositAmount ||
      existingCollection?.depositPaidAt
    ) {
      return NextResponse.json(
        { error: "The visit deposit has already been collected for this promise." },
        { status: 409 },
      );
    }

    if (
      existingCollection?.status === "awaiting-payment" &&
      existingCollection.depositSessionId &&
      existingCollection.depositCheckoutUrl
    ) {
      return NextResponse.json({
        success: true,
        existingCheckout: true,
        url: existingCollection.depositCheckoutUrl,
        promise: {
          id: promise.id,
          paymentCollection: existingCollection,
        },
      });
    }

    const session = await createPromiseDepositCheckoutSession(promise);
    if (!session.url) {
      return NextResponse.json(
        { error: "Stripe did not return a checkout URL." },
        { status: 502 },
      );
    }

    const updated = await updatePromiseRecord(promise.id, {
      paymentCollection: {
        ...existingCollection,
        status: "awaiting-payment",
        processor: "stripe",
        depositRequestedAt:
          existingCollection?.depositRequestedAt || new Date().toISOString(),
        depositSessionId: session.id,
        depositCheckoutUrl: session.url,
        paymentSummary:
          existingCollection?.paymentSummary ||
          "Deposit checkout created to secure the visit.",
      },
      nextAction:
        "Customer approved the work. Deposit checkout is live and needs to be completed before the visit is treated as secure.",
      noteToAdd: "Stripe deposit checkout created from the public status page.",
    });

    await sendOpsWebhook({
      event: "promise_deposit_checkout_created",
      business: "wrenchready",
      payload: {
        promiseId: updated.id,
        customerName: updated.customer.name,
        depositRequestedAmount: updated.paymentCollection?.depositRequestedAmount || null,
        sessionId: session.id,
      },
    }).catch(() => false);

    return NextResponse.json({
      success: true,
      url: session.url,
      promise: {
        id: updated.id,
        paymentCollection: updated.paymentCollection,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to create deposit checkout.",
      },
      { status: 500 },
    );
  }
}
