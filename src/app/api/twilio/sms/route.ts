import { NextRequest, NextResponse } from "next/server";
import { sendHighRiskInboundAlert } from "@/lib/promise-crm/alerts";
import { createInboundRecord } from "@/lib/promise-crm/server";
import { sendOpsWebhook } from "@/lib/promise-crm/webhooks";
import { readEnv } from "@/lib/env";
import { getOpsNotifyPhones, normalizePhone, sendTwilioSms } from "@/lib/twilio";

const XML_HEADERS = {
  "Content-Type": "text/xml; charset=utf-8",
} as const;
const REPLY_COMMAND = /^(?:reply|r)\s+(\+?1?\d{10,11})[\s,:-]+([\s\S]+)/i;

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
    `reply ${from} Your message`,
  ].join("\n");
}

async function handleOwnerReply(from: string, body: string) {
  const match = body.match(REPLY_COMMAND);

  if (!match) {
    return buildResponse(
      "Reply format: reply 5095550123 Your message. Send the customer's number first so WrenchReady can relay it from the business line.",
    );
  }

  const targetPhone = normalizePhone(match[1]);
  const outboundBody = match[2].trim();

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
  const formData = await request.formData();
  const from = normalizePhone((formData.get("From") as string | null) || "") || "";
  const body = (formData.get("Body") as string | null) || "";
  const profileName = (formData.get("ProfileName") as string | null) || "Text lead";
  const relayPhones = getRelayPhones();

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
    await sendHighRiskInboundAlert(inbound).catch(() => false);
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
