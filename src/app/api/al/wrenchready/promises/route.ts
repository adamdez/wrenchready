import { NextResponse } from "next/server";
import { createPromiseFromInbound, getPromiseBoardSnapshot } from "@/lib/promise-crm/server";
import { sendOpsWebhook } from "@/lib/promise-crm/webhooks";

export const dynamic = "force-dynamic";

export async function GET() {
  const snapshot = await getPromiseBoardSnapshot();

  return NextResponse.json({
    success: true,
    ...snapshot,
  });
}

type PromoteInboundPayload = {
  inboundId: string;
  owner: "Dez" | "Simon" | "Unassigned";
  serviceScope: string;
  scheduledWindowLabel: string;
  readinessSummary: string;
  nextAction: string;
};

function isPromoteInboundPayload(value: unknown): value is PromoteInboundPayload {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;

  return (
    typeof candidate.inboundId === "string" &&
    typeof candidate.owner === "string" &&
    typeof candidate.serviceScope === "string" &&
    typeof candidate.scheduledWindowLabel === "string" &&
    typeof candidate.readinessSummary === "string" &&
    typeof candidate.nextAction === "string"
  );
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!isPromoteInboundPayload(body)) {
      return NextResponse.json(
        { error: "Promise creation requires inboundId, owner, service scope, window, summary, and next action." },
        { status: 400 },
      );
    }

    const promise = await createPromiseFromInbound(body);

    await sendOpsWebhook({
      event: "promise_created",
      business: "wrenchready",
      payload: {
        inboundId: body.inboundId,
        promiseId: promise?.id || null,
        owner: body.owner,
        serviceScope: body.serviceScope,
      },
    });

    return NextResponse.json({
      success: true,
      promise,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to create promise record.",
      },
      { status: 500 },
    );
  }
}
