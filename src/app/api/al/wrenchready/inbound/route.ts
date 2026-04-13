import { NextResponse } from "next/server";
import { sendHighRiskInboundAlert } from "@/lib/promise-crm/alerts";
import { createInboundFromAppointment, getInboundRecords } from "@/lib/promise-crm/server";
import { sendOpsWebhook } from "@/lib/promise-crm/webhooks";

export async function GET() {
  const inbound = await getInboundRecords();

  return NextResponse.json({
    success: true,
    total: inbound.length,
    inbound,
  });
}

type ManualInboundPayload = {
  fullName: string;
  email?: string;
  phone: string;
  vehicle: string;
  serviceNeeded: string;
  address: string;
  timing?: string;
  notes?: string;
  smsConsent?: boolean;
};

function isManualInboundPayload(value: unknown): value is ManualInboundPayload {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;

  return (
    typeof candidate.fullName === "string" &&
    typeof candidate.phone === "string" &&
    typeof candidate.vehicle === "string" &&
    typeof candidate.serviceNeeded === "string" &&
    typeof candidate.address === "string"
  );
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!isManualInboundPayload(body)) {
      return NextResponse.json(
        { error: "Manual inbound requires name, phone, vehicle, service, and address." },
        { status: 400 },
      );
    }

    const inbound = await createInboundFromAppointment({
      fullName: body.fullName,
      email: body.email || "",
      phone: body.phone,
      vehicle: body.vehicle,
      serviceNeeded: body.serviceNeeded,
      address: body.address,
      timing: body.timing || "",
      notes: body.notes || "",
      smsConsent: body.smsConsent || false,
    });

    await sendOpsWebhook({
      event: "manual_inbound_created",
      business: "wrenchready",
      payload: {
        inboundId: inbound?.id || null,
        fullName: body.fullName,
        phone: body.phone,
        serviceNeeded: body.serviceNeeded,
      },
    });

    if (inbound) {
      await sendHighRiskInboundAlert(inbound).catch(() => false);
    }

    return NextResponse.json({
      success: true,
      inbound,
    });
  } catch {
    return NextResponse.json(
      { error: "Unable to create inbound record." },
      { status: 500 },
    );
  }
}
