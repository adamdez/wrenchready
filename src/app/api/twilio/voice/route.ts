import { NextResponse } from "next/server";
import { siteConfig } from "@/data/site";
import { readEnv } from "@/lib/env";

const XML_HEADERS = {
  "Content-Type": "text/xml; charset=utf-8",
} as const;

function xmlEscape(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function normalizePhone(value: string | undefined) {
  if (!value) return null;

  const digits = value.replace(/[^\d+]/g, "");

  if (/^\+\d{10,15}$/.test(digits)) return digits;
  if (/^\d{10}$/.test(digits)) return `+1${digits}`;
  if (/^1\d{10}$/.test(digits)) return `+${digits}`;

  return null;
}

function getCallerId() {
  const configuredCallerId = normalizePhone(
    readEnv("TWILIO_CALLER_ID_NUMBER", "My_Twilio_phone_number"),
  );
  if (configuredCallerId) return configuredCallerId;

  return normalizePhone(siteConfig.contact.phoneHref.replace(/^tel:/, ""));
}

function getForwardTimeoutSeconds() {
  const configuredValue = Number(readEnv("TWILIO_FORWARD_TIMEOUT_SECONDS"));

  if (!Number.isFinite(configuredValue)) return 20;

  return Math.min(Math.max(Math.trunc(configuredValue), 5), 60);
}

function buildUnavailableResponse() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">WrenchReady is unavailable right now. Please text this number and we will get back to you shortly.</Say>
</Response>`;
}

function buildForwardingResponse(forwardTo: string, callerId: string, timeout: number) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial answerOnBridge="true" callerId="${xmlEscape(callerId)}" timeout="${timeout}" action="/api/twilio/voicemail">
    <Number>${xmlEscape(forwardTo)}</Number>
  </Dial>
</Response>`;
}

function handleVoiceWebhook() {
  const forwardTo = normalizePhone(readEnv("TWILIO_FORWARD_TO_PHONE"));
  const callerId = getCallerId();

  if (!forwardTo || !callerId) {
    return new NextResponse(buildUnavailableResponse(), {
      status: 200,
      headers: XML_HEADERS,
    });
  }

  return new NextResponse(
    buildForwardingResponse(forwardTo, callerId, getForwardTimeoutSeconds()),
    {
      status: 200,
      headers: XML_HEADERS,
    },
  );
}

export function GET() {
  return handleVoiceWebhook();
}

export function POST() {
  return handleVoiceWebhook();
}
