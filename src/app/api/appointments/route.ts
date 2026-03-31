import { NextRequest, NextResponse } from "next/server";

type AppointmentPayload = {
  fullName: string;
  email: string;
  phone: string;
  vehicle: string;
  serviceNeeded: string;
  address: string;
  timing: string;
  notes: string;
};

function validatePayload(body: unknown): body is AppointmentPayload {
  if (!body || typeof body !== "object") return false;
  const b = body as Record<string, unknown>;
  return typeof b.vehicle === "string" && b.vehicle.length > 0;
}

async function storeToSupabase(payload: AppointmentPayload) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
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
  const webhookUrl = process.env.APPOINTMENT_WEBHOOK_URL;
  if (!webhookUrl) return;

  const lines = [
    `**New Appointment Request**`,
    `Name: ${payload.fullName || "Not provided"}`,
    `Phone: ${payload.phone || "Not provided"}`,
    `Email: ${payload.email || "Not provided"}`,
    `Vehicle: ${payload.vehicle}`,
    `Service: ${payload.serviceNeeded || "Not specified"}`,
    `Address: ${payload.address || "Not provided"}`,
    `Timing: ${payload.timing || "Not specified"}`,
    payload.notes ? `Notes: ${payload.notes}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: lines }),
    });
  } catch (err) {
    console.error("Webhook delivery failed:", err);
  }
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

    await Promise.allSettled([storeToSupabase(body), sendWebhook(body)]);

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Something went wrong. Please call or text us instead." },
      { status: 500 },
    );
  }
}
