import { NextResponse } from "next/server";
import { getPromiseRecordByCustomerToken, updatePromiseRecord } from "@/lib/promise-crm/server";
import type { CustomerApprovalStatus } from "@/lib/promise-crm/types";
import { sendOpsWebhook } from "@/lib/promise-crm/webhooks";

type RouteContext = {
  params: Promise<{ token: string }>;
};

type ApprovalDecisionPayload = {
  decision?: "approved" | "declined";
  customerMessage?: string;
};

export const dynamic = "force-dynamic";

function isApprovalDecisionPayload(value: unknown): value is ApprovalDecisionPayload {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;

  return (
    (candidate.decision === "approved" || candidate.decision === "declined") &&
    (candidate.customerMessage === undefined ||
      typeof candidate.customerMessage === "string")
  );
}

function getDecisionSummary(status: CustomerApprovalStatus) {
  if (status === "approved") {
    return "Customer approved the recommended next step from the public status page.";
  }

  return "Customer declined the recommended next step from the public status page.";
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { token } = await context.params;
    const body = await request.json();

    if (!isApprovalDecisionPayload(body)) {
      return NextResponse.json(
        { error: "Approval payload is invalid." },
        { status: 400 },
      );
    }

    const promise = await getPromiseRecordByCustomerToken(token);

    if (!promise) {
      return NextResponse.json({ error: "Promise record not found." }, { status: 404 });
    }

    if (promise.customerApproval.status !== "awaiting-approval") {
      return NextResponse.json(
        { error: "This approval request is no longer waiting on a customer response." },
        { status: 409 },
      );
    }

    const decisionStatus: CustomerApprovalStatus =
      body.decision === "approved" ? "approved" : "declined";
    const respondedAt = new Date().toISOString();
    const customerMessage = body.customerMessage?.trim() || undefined;

    const updated = await updatePromiseRecord(promise.id, {
      status: "follow-through-due",
      nextAction:
        decisionStatus === "approved"
          ? "Customer approved the next step. Confirm schedule, parts, and visit timing."
          : "Customer declined for now. Send recap, park the work clearly, and set the right follow-through path.",
      followThroughDueAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      customerApproval: {
        ...promise.customerApproval,
        status: decisionStatus,
        respondedAt,
        customerMessage,
      },
      commercialOutcome:
        decisionStatus === "approved"
          ? {
              outcomeStatus: "approved-repair",
              convertedService:
                promise.customerApproval.requestedService ||
                promise.commercialOutcome?.convertedService ||
                promise.serviceScope,
              outcomeSummary:
                customerMessage ||
                promise.customerApproval.summary ||
                getDecisionSummary(decisionStatus),
            }
          : {
              outcomeStatus: "deferred-work",
              convertedService:
                promise.customerApproval.requestedService ||
                promise.commercialOutcome?.convertedService,
              deferredValueAmount:
                promise.customerApproval.requestedAmount ||
                promise.commercialOutcome?.deferredValueAmount,
              outcomeSummary:
                customerMessage ||
                promise.customerApproval.summary ||
                getDecisionSummary(decisionStatus),
            },
      noteToAdd:
        decisionStatus === "approved"
          ? "Customer approved the next step from the public status page."
          : "Customer declined the next step from the public status page.",
    });

    await sendOpsWebhook({
      event: "promise_updated",
      business: "wrenchready",
      payload: {
        promiseId: updated.id,
        owner: updated.owner,
        status: updated.status,
        readinessRisk: updated.readinessRisk,
        customerApprovalStatus: updated.customerApproval.status,
      },
    });

    return NextResponse.json({
      success: true,
      promise: {
        id: updated.id,
        customerApproval: updated.customerApproval,
        commercialOutcome: updated.commercialOutcome,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to capture customer approval.",
      },
      { status: 500 },
    );
  }
}
