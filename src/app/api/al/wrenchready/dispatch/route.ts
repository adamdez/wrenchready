import { NextResponse } from "next/server";
import {
  createInboundRecord,
  createPromiseFromInbound,
} from "@/lib/promise-crm/server";

export const dynamic = "force-dynamic";

type QuickDispatchPayload = {
  service: string;
  address: string;
  timing: string;
  owner: "Dez" | "Simon";
  customerName?: string;
  phone?: string;
  vehicle?: string;
  priceExpectation?: string;
  notes?: string;
};

function isQuickDispatchPayload(value: unknown): value is QuickDispatchPayload {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;

  return (
    typeof candidate.service === "string" &&
    typeof candidate.address === "string" &&
    typeof candidate.timing === "string" &&
    (candidate.owner === "Dez" || candidate.owner === "Simon") &&
    (candidate.customerName === undefined || typeof candidate.customerName === "string") &&
    (candidate.phone === undefined || typeof candidate.phone === "string") &&
    (candidate.vehicle === undefined || typeof candidate.vehicle === "string") &&
    (candidate.priceExpectation === undefined || typeof candidate.priceExpectation === "string") &&
    (candidate.notes === undefined || typeof candidate.notes === "string")
  );
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!isQuickDispatchPayload(body)) {
      return NextResponse.json(
        { error: "Quick dispatch requires service, address, time, and tech." },
        { status: 400 },
      );
    }

    const service = body.service.trim();
    const address = body.address.trim();
    const timing = body.timing.trim();

    if (!service || !address || !timing) {
      return NextResponse.json(
        { error: "Quick dispatch requires service, address, and time." },
        { status: 400 },
      );
    }

    const priceExpectation = body.priceExpectation?.trim() || "";
    const customerName = body.customerName?.trim() || "Quick dispatch job";
    const inbound = await createInboundRecord({
      source: "manual",
      customerName,
      customerPhone: body.phone?.trim() || "Unknown",
      customerEmail: "",
      preferredContact: "call",
      vehicle: body.vehicle?.trim() || "Unknown vehicle",
      requestedService: service,
      address,
      timingLabel: timing,
      notes:
        body.notes?.trim() ||
        `Quick dispatch logged after ${body.owner} was assigned by phone/text.`,
      rawPayload: {
        entryMode: "quick-dispatch",
        dispatchedOwner: body.owner,
        priceExpectation: priceExpectation || null,
      },
    });

    if (!inbound) {
      return NextResponse.json(
        { error: "Dispatch record could not be created." },
        { status: 500 },
      );
    }

    const promise = await createPromiseFromInbound({
      inboundId: inbound.id,
      owner: body.owner,
      serviceScope: service,
      scheduledWindowLabel: timing,
      readinessSummary: `${body.owner} was dispatched from a quick dispatch log.`,
      nextAction: "Complete the job, then record outcome, price, and any follow-up.",
      customerContacted: true,
      scopeConfirmed: true,
      priceExpectation: priceExpectation || "Price not captured in CRM at dispatch; capture final invoice after service.",
      priceExpectationTbd: !priceExpectation,
      customerPromiseSummary: `${body.owner} is dispatched for ${service} at ${timing}.`,
    });

    return NextResponse.json({
      success: true,
      inbound,
      promise,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to save dispatched job.",
      },
      { status: 500 },
    );
  }
}
