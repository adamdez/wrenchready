import { NextResponse } from "next/server";
import { getPromiseRecord, updatePromiseRecord } from "@/lib/promise-crm/server";
import { sendOpsWebhook } from "@/lib/promise-crm/webhooks";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export const dynamic = "force-dynamic";

/**
 * Owner "approve & send" action for a prepared quote.
 *
 * Closes the quote loop: a quote draft is created with customerSendStatus
 * "not-sent" and nothing ever flips it, so the customer never sees the real
 * number and the derived quote-review operator task can never clear. This
 * route marks the reviewed quote sent so it surfaces on the customer status
 * page and the Stripe payment rails downstream can take over.
 */
export async function POST(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;

    const promise = await getPromiseRecord(id);
    if (!promise) {
      return NextResponse.json({ error: "Promise record not found." }, { status: 404 });
    }

    const quotePacket = promise.quotePacket;
    if (!quotePacket) {
      return NextResponse.json(
        { error: "There is no prepared quote to send for this promise yet." },
        { status: 409 },
      );
    }

    if (quotePacket.blockers.length > 0 || quotePacket.status === "blocked") {
      return NextResponse.json(
        {
          error: `Resolve quote blockers before sending: ${
            quotePacket.blockers.join("; ") || "quote is blocked"
          }.`,
        },
        { status: 409 },
      );
    }

    if (quotePacket.customerSendStatus === "sent") {
      return NextResponse.json({ success: true, alreadySent: true });
    }

    const hasPaymentPath = Boolean(
      promise.paymentCollection?.balanceCheckoutUrl ||
        promise.paymentCollection?.depositCheckoutUrl ||
        (promise.paymentCollection?.balanceDueAmount ?? 0) > 0 ||
        (promise.economics?.finalInvoiceAmount ?? 0) > 0,
    );

    const updated = await updatePromiseRecord(promise.id, {
      quotePacket: {
        ...quotePacket,
        customerSendStatus: "sent",
        paymentLinkStatus: hasPaymentPath ? "ready" : quotePacket.paymentLinkStatus,
        nextAction:
          "Quote sent to the customer. Watch for approval, then collect via secure checkout.",
      },
      nextAction:
        "Quote is live on the customer status page. Follow up for approval and payment.",
      noteToAdd: "Quote approved and marked sent to the customer from ops.",
    });

    await sendOpsWebhook({
      event: "promise_quote_sent",
      business: "wrenchready",
      payload: {
        promiseId: updated.id,
        customerName: updated.customer.name,
        origin: "ops",
      },
    }).catch(() => false);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to send the quote to the customer.",
      },
      { status: 500 },
    );
  }
}
