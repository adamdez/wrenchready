import type { InboundRecord, PromiseRecord } from "@/lib/promise-crm/types";
import { readEnv } from "@/lib/env";
import { getOpsNotifyPhones, sendTwilioSms } from "@/lib/twilio";

function alertsEnabled() {
  if (process.env.NODE_ENV === "test") return false;
  return readEnv("WR_ENABLE_SMS_ALERTS") === "true";
}

async function sendOpsSms(message: string) {
  if (!alertsEnabled()) return false;

  const recipients = getOpsNotifyPhones();
  if (recipients.length === 0) return false;

  await Promise.all(recipients.map((to) => sendTwilioSms(to, message)));
  return true;
}

export async function sendHighRiskInboundAlert(inbound: InboundRecord) {
  if (inbound.readinessRisk !== "high") return false;

  return sendOpsSms(
    [
      "WrenchReady high-risk inbound",
      `${inbound.customer.name} / ${inbound.requestedService}`,
      `${inbound.location.territory} / ${inbound.owner}`,
      `Next: ${inbound.nextAction}`,
    ].join("\n"),
  );
}

export async function sendPromiseOpsAlert(promise: PromiseRecord) {
  if (promise.status !== "tomorrow-at-risk" && promise.status !== "follow-through-due") {
    return false;
  }

  const header =
    promise.status === "tomorrow-at-risk"
      ? "WrenchReady tomorrow-at-risk promise"
      : "WrenchReady follow-through due";

  const riskLine =
    promise.topRisks[0] || promise.nextAction || "Review promise detail in ops.";

  return sendOpsSms(
    [
      header,
      `${promise.customer.name} / ${promise.serviceScope}`,
      `${promise.scheduledWindow.label} / ${promise.owner}`,
      `Next: ${riskLine}`,
    ].join("\n"),
  );
}
