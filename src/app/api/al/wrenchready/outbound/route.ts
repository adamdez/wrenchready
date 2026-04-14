import { NextResponse } from "next/server";
import { sendPromiseOutboundEmail } from "@/lib/email";
import { getPromiseOutboundSnapshot } from "@/lib/promise-crm/outbound-drafts";
import { getOutboundTransportPolicy } from "@/lib/promise-crm/outbound-transport";
import {
  getOutboundQueueSnapshot,
  getPromiseRecord,
  updatePromiseRecord,
} from "@/lib/promise-crm/server";
import { sendOpsWebhook } from "@/lib/promise-crm/webhooks";
import type {
  PromiseOutboundChannel,
  PromiseOutboundConversionType,
  PromiseOutboundEventStatus,
} from "@/lib/promise-crm/types";

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
};

function isSendOutboundPayload(value: unknown): value is SendOutboundPayload {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.promiseId === "string" &&
    (candidate.channelType === "review-ask" ||
      candidate.channelType === "maintenance-reminder" ||
      candidate.channelType === "closeout-recap")
  );
}

function buildOutboundCloseoutUpdate(
  channelType: PromiseOutboundChannel,
  channel: "email" | "text",
  headline: string,
  reason: string,
  promise: Awaited<ReturnType<typeof getPromiseRecord>>,
) {
  return {
    noteToAdd: channel === "email" ? `Outbound email sent: ${headline}.` : `Outbound requested: ${headline}.`,
    outboundEvent: {
      id: crypto.randomUUID(),
      recordedAt: new Date().toISOString(),
      channelType,
      status: "delivered" as const,
      channel,
      headline,
      summary: reason,
      actor: "System" as const,
    },
    closeout:
      channelType === "review-ask"
        ? {
            reviewRequest: {
              status: "sent" as const,
              sentAt: new Date().toISOString(),
              summary: reason,
            },
          }
        : channelType === "maintenance-reminder"
          ? {
              maintenanceReminder: {
                status: "scheduled" as const,
                service:
                  promise?.closeout?.maintenanceReminder?.service ||
                  promise?.closeout?.nextProbableVisit?.service ||
                  "Recommended follow-up",
                summary: reason,
              },
            }
          : {
              customerRecap: {
                status: "sent" as const,
                sentAt: new Date().toISOString(),
                channel,
                summary: reason,
              },
            },
  };
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

    const transport = getOutboundTransportPolicy(body.channelType, draft.channel);
    if (!transport.enabled) {
      return NextResponse.json(
        {
          error: transport.reason,
          transport,
        },
        { status: 409 },
      );
    }

    let delivered = false;

    if (transport.mode === "direct-email") {
      if (!promise.customer.email) {
        return NextResponse.json(
          {
            error: "This customer does not have an email address on file yet.",
            transport,
          },
          { status: 409 },
        );
      }

      const result = await sendPromiseOutboundEmail({
        to: promise.customer.email,
        customerName: promise.customer.name,
        headline: draft.headline,
        subject: draft.subject,
        body: draft.body,
      });
      delivered = !result.error;
    } else if (transport.mode === "webhook") {
      delivered = await sendOpsWebhook({
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
    }

    if (!delivered) {
      await updatePromiseRecord(promise.id, {
        outboundEvent: {
          id: crypto.randomUUID(),
          recordedAt: new Date().toISOString(),
          channelType: body.channelType,
          status: "failed",
          channel: draft.channel,
          headline: draft.headline,
          summary:
            transport.mode === "direct-email"
              ? "Direct email delivery failed before the outbound touch could be completed."
              : "Webhook delivery failed before the outbound request could be handed off.",
          actor: "System",
        },
      }).catch(() => undefined);

      return NextResponse.json(
        {
          error:
            transport.mode === "direct-email"
              ? "Direct email delivery failed."
              : "Outbound webhook delivery failed.",
        },
        { status: 502 },
      );
    }

    const updated = await updatePromiseRecord(
      promise.id,
      buildOutboundCloseoutUpdate(body.channelType, draft.channel, draft.headline, draft.reason, promise),
    );

    await sendOpsWebhook({
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
        reason:
          transport.mode === "direct-email"
            ? `Direct email delivery completed: ${draft.reason}`
            : draft.reason,
      },
    }).catch(() => false);

    return NextResponse.json({
      success: true,
      delivered: true,
      transport,
      promise: updated,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to queue outbound." },
      { status: 500 },
    );
  }
}

type CompleteOutboundPayload = {
  promiseId: string;
  channelType: PromiseOutboundChannel;
  status: Exclude<PromiseOutboundEventStatus, "delivered">;
  summary?: string;
  actor?: "Dez" | "Simon" | "Unassigned" | "System";
  conversionType?: PromiseOutboundConversionType;
};

function isCompleteOutboundPayload(value: unknown): value is CompleteOutboundPayload {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;

  return (
    typeof candidate.promiseId === "string" &&
    (candidate.channelType === "review-ask" ||
      candidate.channelType === "maintenance-reminder" ||
      candidate.channelType === "closeout-recap") &&
    (candidate.status === "responded" ||
      candidate.status === "converted" ||
      candidate.status === "failed") &&
    (candidate.summary === undefined || typeof candidate.summary === "string") &&
    (candidate.actor === undefined || typeof candidate.actor === "string") &&
    (candidate.conversionType === undefined || typeof candidate.conversionType === "string")
  );
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();

    if (!isCompleteOutboundPayload(body)) {
      return NextResponse.json({ error: "Outbound completion payload is invalid." }, { status: 400 });
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

    const updated = await updatePromiseRecord(promise.id, {
      noteToAdd: body.summary ? `Outbound result: ${body.summary}` : undefined,
      outboundEvent: {
        id: crypto.randomUUID(),
        recordedAt: new Date().toISOString(),
        channelType: body.channelType,
        status: body.status,
        channel: draft.channel,
        headline: draft.headline,
        summary: body.summary,
        actor: body.actor || "System",
        conversionType: body.conversionType,
      },
      closeout:
        body.channelType === "review-ask" && body.status === "converted"
          ? {
              reviewRequest: {
                status: "completed",
                summary: body.summary || "Customer completed the review flow.",
              },
            }
          : body.channelType === "closeout-recap" && body.status !== "failed"
            ? {
                customerRecap: {
                  status: "sent",
                  summary: body.summary || "Customer recap landed and was acknowledged.",
                },
              }
            : body.channelType === "maintenance-reminder" && body.status === "converted"
              ? {
                  maintenanceReminder: {
                    status: "scheduled",
                    service:
                      promise.closeout?.maintenanceReminder?.service ||
                      promise.closeout?.nextProbableVisit?.service ||
                      "Recommended follow-up",
                    summary: body.summary || "Reminder converted into a next-step action.",
                  },
                }
              : undefined,
    });

    await sendOpsWebhook({
      event: "promise_outbound_result_recorded",
      business: "wrenchready",
      payload: {
        promiseId: promise.id,
        channelType: body.channelType,
        status: body.status,
        conversionType: body.conversionType || null,
        summary: body.summary || null,
      },
    }).catch(() => false);

    return NextResponse.json({
      success: true,
      promise: updated,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to record outbound result." },
      { status: 500 },
    );
  }
}
