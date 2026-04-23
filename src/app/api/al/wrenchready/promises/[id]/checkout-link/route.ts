import { NextResponse } from "next/server";
import {
  createPromiseBalanceCheckoutSession,
  createPromiseDepositCheckoutSession,
  isStripeConfigured,
} from "@/lib/stripe";
import { getPromiseRecord, updatePromiseRecord } from "@/lib/promise-crm/server";
import { sendOpsWebhook } from "@/lib/promise-crm/webhooks";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type CheckoutLinkPayload = {
  kind?: "deposit" | "balance";
};

export const dynamic = "force-dynamic";

function isCheckoutLinkPayload(value: unknown): value is CheckoutLinkPayload {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return candidate.kind === "deposit" || candidate.kind === "balance";
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = await request.json();

    if (!isCheckoutLinkPayload(body)) {
      return NextResponse.json({ error: "Checkout request payload is invalid." }, { status: 400 });
    }

    const promise = await getPromiseRecord(id);
    if (!promise) {
      return NextResponse.json({ error: "Promise record not found." }, { status: 404 });
    }

    if (!isStripeConfigured()) {
      return NextResponse.json({ error: "Stripe is not configured yet." }, { status: 503 });
    }

    if (body.kind === "deposit") {
      const existing = promise.paymentCollection;
      const depositAmount = existing?.depositRequestedAmount;

      if (!depositAmount || depositAmount <= 0) {
        return NextResponse.json(
          { error: "No deposit amount is recorded for this promise." },
          { status: 409 },
        );
      }

      if (existing?.depositCheckoutUrl && !existing.depositPaidAt) {
        return NextResponse.json({ success: true, existingCheckout: true, url: existing.depositCheckoutUrl });
      }

      const session = await createPromiseDepositCheckoutSession(promise);
      if (!session.url) {
        return NextResponse.json({ error: "Stripe did not return a deposit checkout URL." }, { status: 502 });
      }

      const updated = await updatePromiseRecord(promise.id, {
        paymentCollection: {
          ...existing,
          status: existing?.status === "partial" ? "partial" : "deposit-requested",
          processor: "stripe",
          depositRequestedAt: new Date().toISOString(),
          depositSessionId: session.id,
          depositCheckoutUrl: session.url,
          paymentSummary:
            existing?.paymentSummary || "Deposit checkout created from ops for a live customer handoff.",
        },
        nextAction: "Secure the visit by getting the deposit completed before treating this as fully locked.",
        noteToAdd: "Stripe deposit checkout created from the ops payment action.",
      });

      await sendOpsWebhook({
        event: "promise_deposit_checkout_created",
        business: "wrenchready",
        payload: {
          promiseId: updated.id,
          customerName: updated.customer.name,
          depositRequestedAmount: updated.paymentCollection?.depositRequestedAmount || null,
          sessionId: session.id,
          origin: "ops",
        },
      }).catch(() => false);

      return NextResponse.json({ success: true, url: session.url });
    }

    const existing = promise.paymentCollection;
    const balanceAmount = existing?.balanceDueAmount;

    if (!balanceAmount || balanceAmount <= 0) {
      return NextResponse.json(
        { error: "There is no remaining balance recorded for this promise." },
        { status: 409 },
      );
    }

    if (existing?.status === "paid") {
      return NextResponse.json({ error: "This promise is already fully paid." }, { status: 409 });
    }

    if (existing?.balanceCheckoutUrl && !existing.balancePaidAt) {
      return NextResponse.json({ success: true, existingCheckout: true, url: existing.balanceCheckoutUrl });
    }

    const session = await createPromiseBalanceCheckoutSession(promise);
    if (!session.url) {
      return NextResponse.json({ error: "Stripe did not return a balance checkout URL." }, { status: 502 });
    }

    const updated = await updatePromiseRecord(promise.id, {
      paymentCollection: {
        ...existing,
        status: existing?.status === "partial" ? "partial" : "awaiting-payment",
        processor: "stripe",
        balanceRequestedAt: new Date().toISOString(),
        balanceSessionId: session.id,
        balanceCheckoutUrl: session.url,
        paymentSummary:
          existing?.paymentSummary ||
          "Remaining-balance checkout created from ops for field collection.",
      },
      nextAction: "Use secure checkout in the field to close the visit cleanly without office phone tag.",
      noteToAdd: "Stripe remaining-balance checkout created from the ops payment action.",
    });

    await sendOpsWebhook({
      event: "promise_balance_checkout_created",
      business: "wrenchready",
      payload: {
        promiseId: updated.id,
        customerName: updated.customer.name,
        balanceDueAmount: updated.paymentCollection?.balanceDueAmount || null,
        sessionId: session.id,
        origin: "ops",
      },
    }).catch(() => false);

    return NextResponse.json({ success: true, url: session.url });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to create secure checkout from ops.",
      },
      { status: 500 },
    );
  }
}
