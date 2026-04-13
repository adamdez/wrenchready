import { NextResponse } from "next/server";
import { getPromiseOutboundSnapshot } from "@/lib/promise-crm/outbound-drafts";
import {
  getOutboundQueueSnapshot,
  getPromiseRecord,
  updatePromiseRecord,
} from "@/lib/promise-crm/server";
import { sendOpsWebhook } from "@/lib/promise-crm/webhooks";
import type { PromiseOutboundChannel } from "@/lib/promise-crm/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const snapshot = await getOutboundQueueSnapshot();
  return NextResponse.json({
    success: true,
    ...snapshot,
  });
}

type SendOutboundPayload = {
  promiseId: string;
  channelType: PromiseOutboundChannel;
  deliveryMethod?: "webhook";
};

function isSendOutboundPayload(value: unknown): value is SendOutboundPayload {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.promiseId === "string" &&
    (candidate.channelType === "review-ask" ||
      candidate.channelType === "maintenance-reminder" ||
      candidate.channelType === "closeout-recap") &&
    (candidate.deliveryMethod === undefined || candidate.deliveryMethod === "webhook")
  );
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!isSendOutboundPayload(body)) {
      return NextResponse.json({ error: "Outbound send payload is invalid." }, { status: 400 });
    }

    const promise = await getPromiseRecord(body.promiseId);
    if (!promise) {
      return NextResponse.json({ error: "Promise record not found." }, { status: 404 });
    }

    const outbound = getPromiseOutboundSnapshot(promise);
    const draft =
      body.channelType === "review-ask"
        ? outbound.reviewAsk
        : body.channelType === "maintenance-reminder"
          ? outbound.reminderSeed
          : outbound.closeoutRecap;

    if (draft.status === "not-ready") {
      return NextResponse.json({ error: "Outbound draft is not ready yet." }, { status: 400 });
    }

    const delivered = await sendOpsWebhook({
      event: "promise_outbound_requested",
      business: "wrenchready",
      payload: {
        promiseId: promise.id,
        channelType: body.channelType,
        customerName: promise.customer.name,
        customerPhone: promise.customer.phone,
        customerEmail: promise.customer.email || null,
        preferredChannel: draft.channel,
        subject: draft.subject || null,
        headline: draft.headline,
        body: draft.body,
        reason: draft.reason,
      },
    });

    if (!delivered) {
      return NextResponse.json(
        { error: "Outbound webhook delivery failed." },
        { status: 502 },
      );
    }

    const updated = await updatePromiseRecord(promise.id, {
      noteToAdd: `Outbound requested: ${draft.headline}.`,
      closeout:
        body.channelType === "review-ask"
          ? {
              reviewRequest: {
                status: "sent",
                sentAt: new Date().toISOString(),
                summary: draft.reason,
              },
            }
          : body.channelType === "maintenance-reminder"
            ? {
                maintenanceReminder: {
                  status: "scheduled",
                  service:
                    promise.closeout?.maintenanceReminder?.service ||
                    promise.closeout?.nextProbableVisit?.service ||
                    "Recommended follow-up",
                  summary: draft.reason,
                },
              }
            : {
                customerRecap: {
                  status: "sent",
                  sentAt: new Date().toISOString(),
                  channel: draft.channel,
                  summary: draft.reason,
                },
              },
    });

    return NextResponse.json({
      success: true,
      delivered: true,
      promise: updated,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to queue outbound." },
      { status: 500 },
    );
  }
}
