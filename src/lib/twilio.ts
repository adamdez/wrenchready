import { siteConfig } from "@/data/site";
import { readEnv } from "@/lib/env";

export function normalizePhone(value: string | undefined) {
  if (!value) return null;

  const digits = value.replace(/[^\d+]/g, "");

  if (/^\+\d{10,15}$/.test(digits)) return digits;
  if (/^\d{10}$/.test(digits)) return `+1${digits}`;
  if (/^1\d{10}$/.test(digits)) return `+${digits}`;

  return null;
}

export function getTwilioFromNumber() {
  return (
    normalizePhone(readEnv("TWILIO_CALLER_ID_NUMBER", "My_Twilio_phone_number")) ??
    normalizePhone(siteConfig.contact.phoneHref.replace(/^tel:/, "")) ??
    ""
  );
}

export function getOpsNotifyPhones() {
  const raw = readEnv("TWILIO_VOICEMAIL_NOTIFY_PHONES") ?? "";

  return raw
    .split(",")
    .map((value) => normalizePhone(value.trim()))
    .filter((value): value is string => value !== null);
}

export async function sendTwilioSms(to: string, body: string) {
  const accountSid = readEnv("TWILIO_ACCOUNT_SID", "Twilio_Account_SID");
  const authToken = readEnv("TWILIO_AUTH_TOKEN", "Twilio_Auth_Token");
  const from = getTwilioFromNumber();

  if (!accountSid || !authToken || !from) {
    throw new Error("Missing Twilio credentials or from number.");
  }

  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  const auth = Buffer.from(`${accountSid}:${authToken}`).toString("base64");

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ To: to, From: from, Body: body }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Twilio SMS failed: ${response.status} ${text}`);
  }

  return response.json();
}
