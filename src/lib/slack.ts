import { readEnv } from "@/lib/env";

function slackAlertsEnabled() {
  if (process.env.NODE_ENV === "test") return false;
  return readEnv("WR_ENABLE_SLACK_ALERTS")?.trim() === "true";
}

function getSlackWebhookUrl() {
  return readEnv("WR_SLACK_ALERT_WEBHOOK_URL");
}

export async function sendSlackAlert(text: string) {
  if (!slackAlertsEnabled()) return false;

  const webhookUrl = getSlackWebhookUrl();
  if (!webhookUrl) return false;

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text }),
    });

    return response.ok;
  } catch {
    return false;
  }
}
