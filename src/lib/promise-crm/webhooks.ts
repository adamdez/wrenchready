import { readEnv } from "@/lib/env";

type OpsWebhookEvent = {
  event: string;
  business: "wrenchready";
  payload: Record<string, unknown>;
};

function getOpsWebhookUrl() {
  return readEnv("WR_OPS_WEBHOOK_URL", "APPOINTMENT_WEBHOOK_URL") || "";
}

export async function sendOpsWebhook(event: OpsWebhookEvent) {
  const webhookUrl = getOpsWebhookUrl();
  if (!webhookUrl) return false;

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(event),
    });

    return response.ok;
  } catch {
    return false;
  }
}
