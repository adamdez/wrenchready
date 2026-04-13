import { NextRequest, NextResponse } from "next/server";
import { siteConfig } from "@/data/site";
import { readEnv } from "@/lib/env";
import { sendHighRiskInboundAlert } from "@/lib/promise-crm/alerts";
import { createInboundRecord } from "@/lib/promise-crm/server";
import { sendOpsWebhook } from "@/lib/promise-crm/webhooks";

const XML_HEADERS = {
  "Content-Type": "text/xml; charset=utf-8",
} as const;

function normalizePhone(value: string | undefined) {
  if (!value) return null;
  const digits = value.replace(/[^\d+]/g, "");
  if (/^\+\d{10,15}$/.test(digits)) return digits;
  if (/^\d{10}$/.test(digits)) return `+1${digits}`;
  if (/^1\d{10}$/.test(digits)) return `+${digits}`;
  return null;
}

function getNotifyPhones(): string[] {
  const raw = readEnv("TWILIO_VOICEMAIL_NOTIFY_PHONES") ?? "";
  return raw
    .split(",")
    .map((p) => normalizePhone(p.trim()))
    .filter((p): p is string => p !== null);
}

function getTwilioFromNumber(): string {
  return (
    normalizePhone(readEnv("TWILIO_CALLER_ID_NUMBER", "My_Twilio_phone_number")) ??
    normalizePhone(siteConfig.contact.phoneHref.replace(/^tel:/, "")) ??
    ""
  );
}

async function sendSms(to: string, body: string) {
  const accountSid = readEnv("TWILIO_ACCOUNT_SID", "Twilio_Account_SID");
  const authToken = readEnv("TWILIO_AUTH_TOKEN", "Twilio_Auth_Token");
  const from = getTwilioFromNumber();

  if (!accountSid || !authToken || !from) {
    console.error("[voicemail] Missing Twilio credentials or from number — cannot send SMS");
    return;
  }

  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  const auth = Buffer.from(`${accountSid}:${authToken}`).toString("base64");

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ To: to, From: from, Body: body }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error(`[voicemail] SMS to ${to} failed: ${res.status} ${text}`);
  }
}

/**
 * Twilio hits this endpoint after the voicemail recording finishes.
 * Sends an SMS with the recording URL to all configured notify phones.
 */
async function handler(req: NextRequest) {
  const formData = await req.formData();
  const recordingUrl = formData.get("RecordingUrl") as string | null;
  const callerNumber = (formData.get("From") as string) ?? "Unknown";
  const duration = formData.get("RecordingDuration") as string | null;

  const notifyPhones = getNotifyPhones();

  if (recordingUrl && notifyPhones.length > 0) {
    const durationText = duration ? ` (${duration}s)` : "";
    const message = `New voicemail from ${callerNumber}${durationText}:\n${recordingUrl}.mp3`;

    await Promise.all(notifyPhones.map((phone) => sendSms(phone, message)));
  }

  const inbound = await createInboundRecord({
    source: "voicemail",
    customerName: "Voicemail lead",
    customerPhone: callerNumber,
    preferredContact: "call",
    vehicle: "Unknown vehicle",
    requestedService: "Voicemail callback needed",
    address: "Needs territory check",
    timingLabel: "Call back as soon as possible",
    notes: recordingUrl
      ? `Voicemail recording: ${recordingUrl}.mp3${duration ? ` (${duration}s)` : ""}`
      : "Voicemail received with no recording URL.",
    rawPayload: {
      callerNumber,
      recordingUrl,
      duration,
    },
  });

  await sendOpsWebhook({
    event: "twilio_voicemail_received",
    business: "wrenchready",
    payload: {
      callerNumber,
      recordingUrl,
      duration,
      inboundId: inbound?.id || null,
    },
  });

  if (inbound) {
    await sendHighRiskInboundAlert(inbound).catch(() => false);
  }

  return new NextResponse(
    `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">Thanks. We'll get back to you soon. Goodbye.</Say>
  <Hangup/>
</Response>`,
    { status: 200, headers: XML_HEADERS },
  );
}

export { handler as GET, handler as POST };
