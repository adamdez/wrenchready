import { NextRequest, NextResponse } from "next/server";
import { sendNewAppointmentAlert } from "@/lib/promise-crm/alerts";
import { createInboundRecord } from "@/lib/promise-crm/server";
import { sendOpsWebhook } from "@/lib/promise-crm/webhooks";
import { readEnv } from "@/lib/env";
import { enforceRateLimit } from "@/lib/rate-limit";
import { getOpsNotifyPhones, normalizePhone, sendTwilioSms } from "@/lib/twilio";
import { validateTwilioWebhook } from "@/lib/twilio-webhook";

const XML_HEADERS = {
  "Content-Type": "text/xml; charset=utf-8",
} as const;
const REPLY_COMMAND_WITH_PIN = /^(?:reply|r)\s+(\S+)\s+(\+?1?\d{10,15})[\s,:-]+([\s\S]+)/i;

function xmlEscape(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function buildResponse(message: string) {
  return new NextResponse(
    `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>${xmlEscape(message)}</Message>
</Response>`,
    { status: 200, headers: XML_HEADERS },
  );
}

function getRelayPhones() {
  const relayPhones = new Set<string>();
  const forwardTo = normalizePhone(readEnv("TWILIO_FORWARD_TO_PHONE"));

  if (forwardTo) {
    relayPhones.add(forwardTo);
  }

  for (const phone of getOpsNotifyPhones()) {
    relayPhones.add(phone);
  }

  return relayPhones;
}

function formatRelayMessage(profileName: string, from: string, body: string) {
  const sender = profileName && profileName !== "Text lead" ? `${profileName} ${from}` : from;
  return [
    `WR text from ${sender}`,
    body || "(empty message)",
    "",
    "Reply format:",
    `reply PIN ${from} Your message`,
  ].join("\n");
}

async function handleOwnerReply(from: string, body: string) {
  const relayPin = readEnv("TWILIO_OWNER_RELAY_PIN", "WR_OWNER_RELAY_PIN");

  if (!relayPin) {
    return buildResponse(
      "Owner SMS relay is disabled until TWILIO_OWNER_RELAY_PIN is configured.",
    );
  }

  const match = body.match(REPLY_COMMAND_WITH_PIN);

  if (!match) {
    return buildResponse(
      "Reply format: reply PIN 5095550123 Your message. The relay PIN is required before WrenchReady will send to a customer.",
    );
  }

  if (match[1] !== relayPin) {
    return buildResponse("Owner relay PIN was not accepted. Message was not sent.");
  }

  const targetPhone = normalizePhone(match[2]);
  const outboundBody = match[3].trim();

  if (!targetPhone || !outboundBody) {
    return buildResponse(
      "Could not parse that reply. Use: reply 5095550123 Your message",
    );
  }

  await sendTwilioSms(targetPhone, outboundBody);

  await sendOpsWebhook({
    event: "twilio_sms_relay_outbound",
    business: "wrenchready",
    payload: {
      operatorPhone: from,
      customerPhone: targetPhone,
      body: outboundBody,
    },
  }).catch(() => false);

  return buildResponse(`Sent from WrenchReady to ${targetPhone}.`);
}

async function handler(request: NextRequest) {
  const validation = await validateTwilioWebhook(request, { readFormData: true });
  if (!validation.ok) return validation.response;

  const formData = validation.formData ?? new FormData();
  const from = normalizePhone((formData.get("From") as string | null) || "") || "";
  const body = (formData.get("Body") as string | null) || "";
  const profileName = (formData.get("ProfileName") as string | null) || "Text lead";
  const relayPhones = getRelayPhones();
  const rateLimit = await enforceRateLimit(request, {
    keyPrefix: "twilio:sms",
    limit: 30,
    windowMs: 60_000,
    subject: from || undefined,
    responseKind: "twiml",
  });

  if (rateLimit) return rateLimit;

  if (relayPhones.has(from)) {
    return handleOwnerReply(from, body);
  }

  const inbound = await createInboundRecord({
    source: "text",
    customerName: profileName,
    customerPhone: from,
    preferredContact: "text",
    vehicle: "Unknown vehicle",
    requestedService: body || "Inbound text request",
    address: "Needs territory check",
    timingLabel: "No timing yet",
    notes: body,
    rawPayload: {
      from,
      body,
      profileName,
    },
  });

  await sendOpsWebhook({
    event: "twilio_sms_inbound",
    business: "wrenchready",
    payload: {
      from,
      body,
      inboundId: inbound?.id || null,
    },
  });

  if (inbound) {
    await sendNewAppointmentAlert(inbound).catch(() => false);
  }

  const relayTarget = normalizePhone(readEnv("TWILIO_FORWARD_TO_PHONE"));
  if (relayTarget) {
    await sendTwilioSms(relayTarget, formatRelayMessage(profileName, from, body)).catch(() => false);
  }

  return buildResponse(
    "Thanks for texting WrenchReady. We received your message and will screen the job before we promise timing.",
  );
}

export { handler as GET, handler as POST };
