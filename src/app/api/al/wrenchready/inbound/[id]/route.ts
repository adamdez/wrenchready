import { NextResponse } from "next/server";
import { sendHighRiskInboundAlert } from "@/lib/promise-crm/alerts";
import { getInboundRecord, updateInboundRecord } from "@/lib/promise-crm/server";
import { sendOpsWebhook } from "@/lib/promise-crm/webhooks";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const inbound = await getInboundRecord(id);

  if (!inbound) {
    return NextResponse.json({ error: "Inbound record not found." }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    inbound,
  });
}

type UpdateInboundPayload = {
  owner?: "Dez" | "Simon" | "Unassigned";
  qualificationStatus?: "new" | "screening" | "promoted";
  readinessRisk?: "low" | "medium" | "high";
  nextAction?: string;
  preferredWindowLabel?: string;
  noteToAdd?: string;
};

function isUpdateInboundPayload(value: unknown): value is UpdateInboundPayload {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;

  return (
    (candidate.owner === undefined || typeof candidate.owner === "string") &&
    (candidate.qualificationStatus === undefined ||
      typeof candidate.qualificationStatus === "string") &&
    (candidate.readinessRisk === undefined || typeof candidate.readinessRisk === "string") &&
    (candidate.nextAction === undefined || typeof candidate.nextAction === "string") &&
    (candidate.preferredWindowLabel === undefined ||
      typeof candidate.preferredWindowLabel === "string") &&
    (candidate.noteToAdd === undefined || typeof candidate.noteToAdd === "string")
  );
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = await request.json();

    if (!isUpdateInboundPayload(body)) {
      return NextResponse.json(
        { error: "Inbound update payload is invalid." },
        { status: 400 },
      );
    }

    const inbound = await updateInboundRecord(id, body);

    await sendOpsWebhook({
      event: "inbound_updated",
      business: "wrenchready",
      payload: {
        inboundId: inbound.id,
        owner: inbound.owner,
        qualificationStatus: inbound.qualificationStatus,
        readinessRisk: inbound.readinessRisk,
      },
    });

    await sendHighRiskInboundAlert(inbound).catch(() => false);

    return NextResponse.json({
      success: true,
      inbound,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to update inbound record.",
      },
      { status: 500 },
    );
  }
}
