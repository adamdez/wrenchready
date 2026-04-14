import { readEnv } from "@/lib/env";
import { isResendConfigured } from "@/lib/email";
import type {
  OutboundTransportPolicy,
  PromiseOutboundChannel,
} from "@/lib/promise-crm/types";

function envEnabled(...keys: string[]) {
  const value = readEnv(...keys);
  if (!value) return false;
  const normalized = value.toLowerCase();
  return normalized === "true" || normalized === "1" || normalized === "yes" || normalized === "on";
}

function isWebhookReady() {
  return Boolean(readEnv("WR_OPS_WEBHOOK_URL", "APPOINTMENT_WEBHOOK_URL"));
}

export function getOutboundTransportPolicy(
  channelType: PromiseOutboundChannel,
  preferredChannel: "email" | "text",
): OutboundTransportPolicy {
  const webhookReady = isWebhookReady();
  const emailEnabled = envEnabled("WR_ENABLE_EMAIL_OUTBOUND") || !readEnv("WR_ENABLE_EMAIL_OUTBOUND");
  const textEnabled = envEnabled("WR_ENABLE_TEXT_OUTBOUND");
  const directEmailReady = isResendConfigured() && emailEnabled;

  if (preferredChannel === "text") {
    return {
      mode: textEnabled && webhookReady ? "webhook" : "held",
      enabled: textEnabled && webhookReady,
      destinationLabel: textEnabled && webhookReady ? "Text via ops webhook" : "Held until text channel is cleared",
      reason:
        textEnabled && webhookReady
          ? `${channelType} can hand off to the text-capable webhook path.`
          : "Text outbound stays held until compliance and transport are both live.",
      nextStep:
        textEnabled && webhookReady
          ? "Queue this touch through the webhook transport."
          : "Keep the draft visible, but do not treat it as production-ready text yet.",
    };
  }

  if (directEmailReady) {
    return {
      mode: "direct-email",
      enabled: true,
      destinationLabel: "Direct email via Resend",
      reason: `${channelType} can send now through the first-party email transport.`,
      nextStep: "Send the email directly from the promise record and log the result.",
    };
  }

  return {
    mode: webhookReady && emailEnabled ? "webhook" : "held",
    enabled: webhookReady && emailEnabled,
    destinationLabel: webhookReady && emailEnabled ? "Email via ops webhook" : "Held until email transport is confirmed",
    reason:
      webhookReady && emailEnabled
        ? `${channelType} is clear to route through the email-oriented webhook path.`
        : "Email outbound still needs the production transport setting confirmed.",
    nextStep:
      webhookReady && emailEnabled
        ? "Queue this touch for webhook delivery."
        : "Confirm the production email handoff before treating this as send-ready.",
  };
}
