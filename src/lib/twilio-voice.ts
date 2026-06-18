import { siteConfig } from "@/data/site";
import { readEnv } from "@/lib/env";

export const TWILIO_XML_HEADERS = {
  "Content-Type": "text/xml; charset=utf-8",
} as const;

export function xmlEscape(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

export function normalizePhone(value: string | undefined) {
  if (!value) return null;

  const digits = value.replace(/[^\d+]/g, "");

  if (/^\+\d{10,15}$/.test(digits)) return digits;
  if (/^\d{10}$/.test(digits)) return `+1${digits}`;
  if (/^1\d{10}$/.test(digits)) return `+${digits}`;

  return null;
}

export function getTwilioCallerId() {
  const configuredCallerId = normalizePhone(
    readEnv("TWILIO_CALLER_ID_NUMBER", "My_Twilio_phone_number"),
  );
  if (configuredCallerId) return configuredCallerId;

  return normalizePhone(siteConfig.contact.phoneHref.replace(/^tel:/, ""));
}

export function getSecondsEnv(
  keys: string[],
  { fallback, min, max }: { fallback: number; min: number; max: number },
) {
  const configuredValue = Number(readEnv(...keys));

  if (!Number.isFinite(configuredValue)) return fallback;

  return Math.min(Math.max(Math.trunc(configuredValue), min), max);
}

export function readBooleanEnv(key: string, fallback: boolean) {
  const value = readEnv(key);

  if (!value) return fallback;

  return /^(1|true|yes|on)$/i.test(value);
}

export function buildUnavailableTwiml() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">WrenchReady is unavailable right now. Please text this number and we will get back to you shortly.</Say>
</Response>`;
}

export function buildEmptyTwiml() {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<Response/>`;
}

export function buildVoicemailRecordingTwiml() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">Hey, you've reached WrenchReady Mobile Mechanic. We can't get to the phone right now. Leave your name, number, and a short message and we'll get back to you as soon as possible.</Say>
  <Record maxLength="120" playBeep="true" action="/api/twilio/voicemail/complete" transcribe="false" />
  <Say voice="alice">We didn't receive a message. Feel free to text this number instead. Goodbye.</Say>
</Response>`;
}
