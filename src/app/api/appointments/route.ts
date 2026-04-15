import { NextRequest, NextResponse } from "next/server";
import { readEnv } from "@/lib/env";
import { sendPromiseOutboundEmail } from "@/lib/email";
import { sendHighRiskInboundAlert } from "@/lib/promise-crm/alerts";
import { createInboundFromAppointment } from "@/lib/promise-crm/server";
import { evaluateIntake } from "@/lib/promise-crm/intake";
import { sendOpsWebhook } from "@/lib/promise-crm/webhooks";
import schedulingEngine from "@/lib/scheduling/engine";

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

function buildSchedulingRead(payload: AppointmentPayload) {
  const availability = schedulingEngine.evaluateAvailability({
    service: payload.serviceNeeded || payload.notes || "unknown",
    vehicle: payload.vehicle,
    notes: payload.notes,
    desiredDate: payload.timing,
    address: {
      formatted: payload.address,
      city: payload.address,
      state: "WA",
    },
  });

  return {
    normalizedService: availability.serviceEstimate.normalizedService,
    territorySupported: availability.territorySupported,
    requiredIntegrationsReady: availability.requiredIntegrationsReady,
    missingIntegrations: availability.missingIntegrations,
    confidence: availability.serviceEstimate.rules.confidence,
    durationMinutes: availability.serviceEstimate.rules.durationMinutes,
    autoBook: availability.serviceEstimate.rules.autoBook,
    reasons: availability.serviceEstimate.reasons,
  };
}

async function sendCustomerConfirmationEmail(
  payload: AppointmentPayload,
  intakeEvaluation: ReturnType<typeof evaluateIntake>,
  schedulingRead: ReturnType<typeof buildSchedulingRead>,
) {
  if (!payload.email?.trim()) return false;

  const promiseFitMessage =
    intakeEvaluation.promiseFit === "strong"
      ? "This looks like a strong mobile-fit request, so the next step is a fast confirmation call or text."
      : intakeEvaluation.promiseFit === "conditional"
        ? "We received the request and need to confirm the worksite, scope, or timing before we promise a slot."
        : "We received the request and will screen the fit carefully before we promise timing.";

  const schedulingMessage = schedulingRead.territorySupported
    ? schedulingRead.requiredIntegrationsReady
      ? `We can evaluate live availability for this lane. Your requested timing was recorded as: ${payload.timing || "not specified"}.`
      : `Your requested timing was recorded as: ${payload.timing || "not specified"}. We are still confirming final timing manually so we do not over-promise.`
    : "Your address needs a manual territory check before we promise timing.";

  const body = [
    `We received your request for ${payload.vehicle}.`,
    promiseFitMessage,
    `Service lane: ${intakeEvaluation.serviceLane}.`,
    schedulingMessage,
    "If anything about the job, parking, or symptoms changes, reply to this email or call/text us so we can keep the promise honest.",
  ].join("\n\n");

  await sendPromiseOutboundEmail({
    to: payload.email.trim(),
    customerName: payload.fullName || "there",
    headline: "We received your WrenchReady request",
    subject: "WrenchReady request received",
    body,
  });

  return true;
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
    const schedulingRead = buildSchedulingRead(body);
    const [legacyResult, webhookResult, inboundResult, confirmationEmailResult] = await Promise.allSettled([
      storeToSupabase(body),
      sendWebhook(body),
      createInboundFromAppointment(body, evaluation),
      sendCustomerConfirmationEmail(body, evaluation, schedulingRead),
    ]);

    if (inboundResult.status === "fulfilled" && inboundResult.value) {
      await sendHighRiskInboundAlert(inboundResult.value).catch(() => false);
    }

    return NextResponse.json({
      success: true,
      intakeEvaluation: evaluation,
      schedulingRead,
      inboundCreated:
        inboundResult.status === "fulfilled" && !!inboundResult.value,
      legacyStored:
        legacyResult.status === "fulfilled" && !!legacyResult.value,
      webhookDelivered:
        webhookResult.status === "fulfilled" && webhookResult.value === true,
      confirmationEmailSent:
        confirmationEmailResult.status === "fulfilled" && confirmationEmailResult.value === true,
    });
  } catch (error) {
    console.error("Appointments route failed", error);
    return NextResponse.json(
      { error: "Something went wrong. Please call or text us instead." },
      { status: 500 },
    );
  }
}
