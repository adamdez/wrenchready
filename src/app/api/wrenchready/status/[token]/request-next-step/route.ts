import { getNextProbableVisit } from "@/lib/promise-crm/closeout-recapture";
import { NextResponse } from "next/server";
import {
  createInboundRecord,
  getPromiseRecordByCustomerToken,
  updatePromiseRecord,
} from "@/lib/promise-crm/server";
import { sendOpsWebhook } from "@/lib/promise-crm/webhooks";

type RouteContext = {
  params: Promise<{ token: string }>;
};

type NextStepRequestPayload = {
  customerMessage?: string;
};

export const dynamic = "force-dynamic";

function isNextStepRequestPayload(value: unknown): value is NextStepRequestPayload {
  if (!value || typeof value !== "object") return true;
  const candidate = value as Record<string, unknown>;
  return (
    candidate.customerMessage === undefined ||
    typeof candidate.customerMessage === "string"
  );
}

function getRecommendedServiceLabel(
  promise: Awaited<ReturnType<typeof getPromiseRecordByCustomerToken>>,
) {
  if (!promise) return "Recommended next step";

  const nextProbableVisit = getNextProbableVisit(promise);
  if (nextProbableVisit?.service) return nextProbableVisit.service;

  return (
    promise.customerApproval.requestedService ||
    promise.commercialOutcome?.convertedService ||
    promise.serviceScope
  );
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { token } = await context.params;
    const body = await request.json().catch(() => ({}));

    if (!isNextStepRequestPayload(body)) {
      return NextResponse.json(
        { error: "Request payload is invalid." },
        { status: 400 },
      );
    }

    const promise = await getPromiseRecordByCustomerToken(token);

    if (!promise) {
      return NextResponse.json({ error: "Promise record not found." }, { status: 404 });
    }

    const requestedService = getRecommendedServiceLabel(promise);
    const customerMessage = body.customerMessage?.trim() || undefined;
    const inbound = await createInboundRecord({
      source: "website",
      customerName: promise.customer.name,
      customerPhone: promise.customer.phone,
      customerEmail: promise.customer.email,
      preferredContact: promise.customer.preferredContact,
      vehicle: `${promise.vehicle.year} ${promise.vehicle.make} ${promise.vehicle.model}`,
      requestedService,
      address: promise.location.label,
      timingLabel: "Customer requested next step from status page",
      notes: customerMessage
        ? `Customer requested next step from status page. ${customerMessage}`
        : "Customer requested next step from status page.",
      rawPayload: {
        repeatRequestFromPromiseId: promise.id,
        customerStatusToken: token,
        priorServiceScope: promise.serviceScope,
      },
    });

    if (!inbound) {
      throw new Error("Unable to create a new inbound request for the next step.");
    }

    await updatePromiseRecord(promise.id, {
      status: "follow-through-due",
      nextAction:
        "Customer requested the next step from the status page. Review the inbound, confirm timing, and lock the next promise.",
      noteToAdd:
        customerMessage
          ? `Customer requested the next step from the status page. Note: ${customerMessage}`
          : "Customer requested the next step from the status page.",
    });

    await sendOpsWebhook({
      event: "manual_inbound_created",
      business: "wrenchready",
      payload: {
        inboundId: inbound.id,
        promiseId: promise.id,
        owner: promise.owner,
        requestedService,
        source: "customer-status-page",
      },
    });

    return NextResponse.json({
      success: true,
      inbound: {
        id: inbound.id,
        requestedService: inbound.requestedService,
        nextAction: inbound.nextAction,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to request the next step.",
      },
      { status: 500 },
    );
  }
}
