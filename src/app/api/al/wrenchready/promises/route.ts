import { NextResponse } from "next/server";
import {
  createPromiseFromInbound,
  getInboundRecord,
  getPromiseBoardSnapshot,
} from "@/lib/promise-crm/server";
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
  customerContacted: boolean;
  scopeConfirmed: boolean;
  priceExpectation: string;
  priceExpectationTbd: boolean;
  inspectionDeliverable?: string;
  customerPromiseSummary: string;
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
    typeof candidate.nextAction === "string" &&
    typeof candidate.customerContacted === "boolean" &&
    typeof candidate.scopeConfirmed === "boolean" &&
    typeof candidate.priceExpectation === "string" &&
    typeof candidate.priceExpectationTbd === "boolean" &&
    (candidate.inspectionDeliverable === undefined ||
      typeof candidate.inspectionDeliverable === "string") &&
    typeof candidate.customerPromiseSummary === "string"
  );
}

function hasMissingTiming(label: string) {
  const normalized = label.trim().toLowerCase();
  return (
    !normalized ||
    normalized === "no timing selected" ||
    normalized.includes("not selected") ||
    normalized.includes("tbd")
  );
}

function getPromotionBlockers(
  body: PromoteInboundPayload,
  inbound: Awaited<ReturnType<typeof getInboundRecord>>,
) {
  const isInspection = `${inbound?.requestedService || ""} ${inbound?.serviceLane || ""} ${
    inbound?.normalizedService || ""
  }`
    .toLowerCase()
    .includes("inspection");

  return [
    body.owner === "Unassigned" ? "Choose an owner before making a promise." : null,
    !body.customerContacted ? "Customer contact or contact attempt is required." : null,
    !body.serviceScope.trim() ? "Service scope is required." : null,
    !body.scopeConfirmed
      ? "Confirmed scope with the customer is required; submitted request text is not enough."
      : null,
    hasMissingTiming(body.scheduledWindowLabel)
      ? "A real promised window is required; 'No timing selected' cannot become a promise."
      : null,
    !body.priceExpectation.trim()
      ? body.priceExpectationTbd
        ? "Price TBD reason is required."
        : "Price, fee, or deposit expectation is required."
      : null,
    isInspection && !body.inspectionDeliverable?.trim()
      ? "Inspection promises require the paid/scoped deliverable."
      : null,
    !body.customerPromiseSummary.trim()
      ? "Customer-facing promise summary is required."
      : null,
  ].filter((blocker): blocker is string => Boolean(blocker));
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

    const inbound = await getInboundRecord(body.inboundId);
    if (!inbound) {
      return NextResponse.json({ error: "Inbound record not found." }, { status: 404 });
    }

    const blockers = getPromotionBlockers(body, inbound);
    if (blockers.length > 0) {
      return NextResponse.json(
        {
          error: "Promise creation is blocked until the required gates are complete.",
          blockers,
        },
        { status: 422 },
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
