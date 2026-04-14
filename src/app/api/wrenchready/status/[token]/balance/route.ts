import { NextResponse } from "next/server";
import { createPromiseBalanceCheckoutSession, isStripeConfigured } from "@/lib/stripe";
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
        { error: "Stripe is not configured yet for balance checkout." },
        { status: 503 },
      );
    }

    const existingCollection = promise.paymentCollection;
    const balanceAmount = existingCollection?.balanceDueAmount;

    if (!balanceAmount || balanceAmount <= 0) {
      return NextResponse.json(
        { error: "There is no remaining balance recorded for this promise." },
        { status: 409 },
      );
    }

    if (existingCollection?.status === "paid" || balanceAmount <= 0) {
      return NextResponse.json(
        { error: "This promise is already fully paid." },
        { status: 409 },
      );
    }

    if (
      existingCollection?.balanceSessionId &&
      existingCollection?.balanceCheckoutUrl &&
      existingCollection?.balancePaidAt === undefined
    ) {
      return NextResponse.json({
        success: true,
        existingCheckout: true,
        url: existingCollection.balanceCheckoutUrl,
        promise: {
          id: promise.id,
          paymentCollection: existingCollection,
        },
      });
    }

    const session = await createPromiseBalanceCheckoutSession(promise);
    if (!session.url) {
      return NextResponse.json(
        { error: "Stripe did not return a checkout URL." },
        { status: 502 },
      );
    }

    const updated = await updatePromiseRecord(promise.id, {
      paymentCollection: {
        ...existingCollection,
        status: existingCollection?.status === "partial" ? "partial" : "awaiting-payment",
        processor: "stripe",
        balanceRequestedAt: new Date().toISOString(),
        balanceSessionId: session.id,
        balanceCheckoutUrl: session.url,
        paymentSummary:
          existingCollection?.paymentSummary ||
          "Remaining balance checkout created to close the visit cleanly.",
      },
      nextAction:
        "The remaining balance can now be paid online to close the visit without extra phone tag.",
      noteToAdd: "Stripe remaining-balance checkout created from the public status page.",
    });

    await sendOpsWebhook({
      event: "promise_balance_checkout_created",
      business: "wrenchready",
      payload: {
        promiseId: updated.id,
        customerName: updated.customer.name,
        balanceDueAmount: updated.paymentCollection?.balanceDueAmount || null,
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
        error:
          error instanceof Error ? error.message : "Unable to create balance checkout.",
      },
      { status: 500 },
    );
  }
}
