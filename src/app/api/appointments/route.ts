import { NextRequest, NextResponse } from "next/server";
import { readEnv } from "@/lib/env";
import { sendHighRiskInboundAlert } from "@/lib/promise-crm/alerts";
import { createInboundFromAppointment } from "@/lib/promise-crm/server";
import { evaluateIntake } from "@/lib/promise-crm/intake";
import { sendOpsWebhook } from "@/lib/promise-crm/webhooks";

type AppointmentPayload = {
  fullName: string;
  email: string;
  phone: string;
  vehicle: string;
  serviceNeeded: string;
  address: string;
  timing: string;
  notes: string;
  smsConsent?: boolean;
};

function validatePayload(body: unknown): body is AppointmentPayload {
  if (!body || typeof body !== "object") return false;
  const b = body as Record<string, unknown>;
  return typeof b.vehicle === "string" && b.vehicle.length > 0;
}

async function storeToSupabase(payload: AppointmentPayload) {
  const url = readEnv("SUPABASE_URL");
  const key = readEnv("SUPABASE_ANON_KEY");
  if (!url || !key) return null;

  const res = await fetch(`${url}/rest/v1/appointments`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: key,
      Authorization: `Bearer ${key}`,
      Prefer: "return=representation",
    },
    body: JSON.stringify({
      full_name: payload.fullName,
      email: payload.email || null,
      phone: payload.phone || null,
      vehicle: payload.vehicle,
      service_needed: payload.serviceNeeded || null,
      address: payload.address || null,
      timing: payload.timing || null,
      notes: payload.notes || null,
      status: "new",
    }),
  });

  if (!res.ok) {
    console.error("Supabase insert failed:", await res.text());
    return null;
  }
  return res.json();
}

async function sendWebhook(payload: AppointmentPayload) {
  const evaluation = evaluateIntake(payload);
  return sendOpsWebhook({
    event: "website_appointment_request",
    business: "wrenchready",
    payload: {
      fullName: payload.fullName,
      email: payload.email || null,
      phone: payload.phone || null,
      vehicle: payload.vehicle,
      serviceNeeded: payload.serviceNeeded || null,
      address: payload.address || null,
      timing: payload.timing || null,
      notes: payload.notes || null,
      smsConsent: !!payload.smsConsent,
      intakeEvaluation: evaluation,
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!validatePayload(body)) {
      return NextResponse.json(
        { error: "Vehicle information is required." },
        { status: 400 },
      );
    }

    const evaluation = evaluateIntake(body);
    const [legacyResult, webhookResult, inboundResult] = await Promise.allSettled([
      storeToSupabase(body),
      sendWebhook(body),
      createInboundFromAppointment(body, evaluation),
    ]);

    if (inboundResult.status === "fulfilled" && inboundResult.value) {
      await sendHighRiskInboundAlert(inboundResult.value).catch(() => false);
    }

    return NextResponse.json({
      success: true,
      intakeEvaluation: evaluation,
      inboundCreated:
        inboundResult.status === "fulfilled" && !!inboundResult.value,
      legacyStored:
        legacyResult.status === "fulfilled" && !!legacyResult.value,
      webhookDelivered:
        webhookResult.status === "fulfilled" && webhookResult.value === true,
    });
  } catch {
    return NextResponse.json(
      { error: "Something went wrong. Please call or text us instead." },
      { status: 500 },
    );
  }
}
