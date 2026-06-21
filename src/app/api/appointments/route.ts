import { NextRequest, NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { readEnv } from "@/lib/env";
import { sendPromiseOutboundEmail } from "@/lib/email";
import { sendHighRiskInboundAlert, sendNewAppointmentAlert } from "@/lib/promise-crm/alerts";
import { createInboundFromAppointment } from "@/lib/promise-crm/server";
import { evaluateIntake } from "@/lib/promise-crm/intake";
import { enforceRateLimit } from "@/lib/rate-limit";
import { sendOpsWebhook } from "@/lib/promise-crm/webhooks";
import schedulingEngine from "@/lib/scheduling/engine";
import { siteConfig } from "@/data/site";
import {
  createGoogleCalendarHold,
  deleteGoogleCalendarEvent,
  getGoogleWorkspaceIntegrationStatus,
} from "@/lib/google-workspace";

type AppointmentPayload = {
  fullName: string;
  email: string;
  phone: string;
  vehicle: string;
  zipCode: string;
  serviceNeeded: string;
  address: string;
  timing: string;
  notes: string;
  smsConsent?: boolean;
  sourceTag?: string;
  requestedSlotStartIso?: string;
  requestedSlotEndIso?: string;
  requestedSlotLabel?: string;
};

type CalendarHoldResult =
  | { created: true; eventId?: string; htmlLink?: string }
  | { created: false; reason: string };

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
      zipCode: payload.zipCode || null,
      serviceNeeded: payload.serviceNeeded || null,
      address: payload.address || null,
      timing: payload.timing || null,
      notes: payload.notes || null,
      smsConsent: !!payload.smsConsent,
      sourceTag: payload.sourceTag || null,
      intakeEvaluation: evaluation,
    },
  });
}

async function buildSchedulingRead(payload: AppointmentPayload) {
  const availability = await schedulingEngine.evaluateAvailability({
    service: payload.serviceNeeded || payload.notes || "unknown",
    vehicle: payload.vehicle,
    notes: payload.notes,
    desiredDate: payload.timing,
    address: {
      formatted: [payload.address, payload.zipCode].filter(Boolean).join(", "),
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
    customerWindowSummary: availability.customerWindowSummary,
    candidateSlots: availability.candidateSlots,
    calendarTruth: availability.calendarTruth,
    routeTruthReady: availability.routeTruthReady,
    safeToOfferCustomerSlots: availability.safeToOfferCustomerSlots,
  };
}

function requestedSlot(payload: AppointmentPayload) {
  if (!payload.requestedSlotStartIso || !payload.requestedSlotEndIso) return null;

  const start = new Date(payload.requestedSlotStartIso);
  const end = new Date(payload.requestedSlotEndIso);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) return null;

  return {
    startIso: start.toISOString(),
    endIso: end.toISOString(),
    label: payload.requestedSlotLabel || `${start.toISOString()} to ${end.toISOString()}`,
  };
}

function selectedSlotStillAvailable(
  slot: NonNullable<ReturnType<typeof requestedSlot>>,
  schedulingRead: Awaited<ReturnType<typeof buildSchedulingRead>>,
) {
  return schedulingRead.candidateSlots.some(
    (candidate) =>
      candidate.startIso === slot.startIso &&
      candidate.endIso === slot.endIso &&
      candidate.calendarVerified,
  );
}

function calendarHoldEventId(slot: NonNullable<ReturnType<typeof requestedSlot>>) {
  return `aa${createHash("sha256")
    .update(`${slot.startIso}|${slot.endIso}`)
    .digest("hex")
    .slice(0, 30)}`;
}

async function createWebsiteCalendarHold(
  payload: AppointmentPayload,
  slot: NonNullable<ReturnType<typeof requestedSlot>>,
): Promise<CalendarHoldResult> {
  const status = getGoogleWorkspaceIntegrationStatus();
  if (!status.calendar.canWrite) {
    return {
      created: false as const,
      reason: status.calendar.missing.length
        ? status.calendar.missing.join(", ")
        : "GOOGLE_WORKSPACE_ALLOW_CALENDAR_WRITES is not enabled",
    };
  }

  const serviceLabel = payload.serviceNeeded || "Website request";
  const customerName = payload.fullName || "New customer";
  const eventId = calendarHoldEventId(slot);
  const event = await createGoogleCalendarHold({
    eventId,
    summary: `WR HOLD: ${serviceLabel} / ${customerName}`,
    location: payload.address || undefined,
    startIso: slot.startIso,
    endIso: slot.endIso,
    description: [
      "Website #book request hold.",
      `Customer: ${customerName}`,
      payload.phone ? `Phone: ${payload.phone}` : undefined,
      payload.email ? `Email: ${payload.email}` : undefined,
      `Vehicle: ${payload.vehicle}`,
      `Service: ${serviceLabel}`,
      payload.address ? `Address: ${payload.address}` : undefined,
      payload.notes ? `Notes: ${payload.notes}` : undefined,
      "Confirm route fit, parts readiness, and worksite constraints before promising the visit.",
    ].filter(Boolean).join("\n"),
    privateExtendedProperties: {
      wrenchreadySource: "website-book-form",
      wrenchreadyHoldType: "customer-requested-slot",
      wrenchreadySlotKey: eventId,
    },
  });

  return {
    created: true as const,
    eventId: event.id || eventId,
    htmlLink: event.htmlLink,
  };
}

async function sendCustomerConfirmationEmail(
  payload: AppointmentPayload,
  intakeEvaluation: ReturnType<typeof evaluateIntake>,
  schedulingRead: Awaited<ReturnType<typeof buildSchedulingRead>>,
) {
  if (!payload.email?.trim()) return false;

  const promiseFitMessage =
    intakeEvaluation.promiseFit === "strong"
      ? "This looks like a good fit for mobile service. We will follow up by call or text to confirm timing and next steps."
      : intakeEvaluation.promiseFit === "conditional"
        ? "We got your request. Before we promise a slot, we just need to confirm the worksite, scope, or timing."
        : "We got your request and will review the fit carefully before we promise timing.";

  const schedulingMessage = schedulingRead.territorySupported
    ? `${schedulingRead.customerWindowSummary} We recorded your requested timing as: ${payload.timing || "not specified"}.`
    : "Your address needs a quick service-area check before we promise timing.";

  const body = [
    `We got your request for your ${payload.vehicle}.`,
    promiseFitMessage,
    `Requested service: ${payload.serviceNeeded || intakeEvaluation.serviceLane}.`,
    schedulingMessage,
    `If anything changes, reply to this email or call/text WrenchReady at ${siteConfig.contact.phoneDisplay}.`,
    `WrenchReady Mobile\n${siteConfig.contact.phoneDisplay}\n${siteConfig.contact.email}`,
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
    const rateLimit = await enforceRateLimit(request, {
      keyPrefix: "public:appointments",
      limit: 8,
      windowMs: 60_000,
    });

    if (rateLimit) return rateLimit;

    const body = await request.json();

    if (!validatePayload(body)) {
      return NextResponse.json(
        { error: "Vehicle information is required." },
        { status: 400 },
      );
    }

    const selectedSlot = requestedSlot(body);
    const normalizedBody = {
      ...body,
      timing: selectedSlot?.label || body.timing,
    };
    const evaluation = evaluateIntake(normalizedBody);
    const schedulingRead = await buildSchedulingRead(normalizedBody);

    if (selectedSlot && !selectedSlotStillAvailable(selectedSlot, schedulingRead)) {
      return NextResponse.json(
        {
          error: "That calendar window is no longer available. Please check openings again.",
          schedulingRead,
        },
        { status: 409 },
      );
    }

    const calendarHoldResult: CalendarHoldResult = selectedSlot
      ? await createWebsiteCalendarHold(normalizedBody, selectedSlot).catch((error) => ({
          created: false as const,
          reason: error instanceof Error ? error.message : "Calendar hold failed",
        }))
      : { created: false as const, reason: "No calendar slot selected" };

    if (selectedSlot && !calendarHoldResult.created) {
      return NextResponse.json(
        {
          error: "We could not hold that calendar window. Please check openings again or submit without a selected slot.",
          schedulingRead,
          calendarHold: calendarHoldResult,
        },
        { status: 503 },
      );
    }

    const inbound = await createInboundFromAppointment(normalizedBody, evaluation);

    if (!inbound) {
      if (calendarHoldResult.created && calendarHoldResult.eventId) {
        await deleteGoogleCalendarEvent(calendarHoldResult.eventId).catch(() => null);
      }

      return NextResponse.json(
        { error: "We could not save your request. Please call or text us instead." },
        { status: 503 },
      );
    }

    const [legacyResult, webhookResult, confirmationEmailResult] = await Promise.allSettled([
      storeToSupabase(normalizedBody),
      sendWebhook(normalizedBody),
      sendCustomerConfirmationEmail(normalizedBody, evaluation, schedulingRead),
    ]);

    await sendNewAppointmentAlert(inbound).catch(() => false);
    await sendHighRiskInboundAlert(inbound).catch(() => false);

    return NextResponse.json({
      success: true,
      intakeEvaluation: evaluation,
      schedulingRead,
      inboundCreated: true,
      legacyStored:
        legacyResult.status === "fulfilled" && !!legacyResult.value,
      webhookDelivered:
        webhookResult.status === "fulfilled" && webhookResult.value === true,
      confirmationEmailSent:
        confirmationEmailResult.status === "fulfilled" && confirmationEmailResult.value === true,
      calendarHold: calendarHoldResult,
    });
  } catch (error) {
    console.error("Appointments route failed", error);
    return NextResponse.json(
      { error: "Something went wrong. Please call or text us instead." },
      { status: 500 },
    );
  }
}
