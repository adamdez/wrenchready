import type { InboundRecord, PromiseRecord } from "@/lib/promise-crm/types";
import {
  buildHighRiskInboundAlertText,
  buildNewAppointmentAlertText,
  buildPromiseOpsAlertText,
} from "@/lib/promise-crm/alert-payloads";
import { readEnv } from "@/lib/env";
import { sendSlackAlert } from "@/lib/slack";
import { getOpsNotifyPhones, sendTwilioSms } from "@/lib/twilio";

function alertsEnabled() {
  if (process.env.NODE_ENV === "test") return false;
  return readEnv("WR_ENABLE_SMS_ALERTS")?.trim() === "true";
}

async function sendOpsSms(message: string) {
  if (!alertsEnabled()) return false;

  const recipients = getOpsNotifyPhones();
  if (recipients.length === 0) return false;

  await Promise.all(recipients.map((to) => sendTwilioSms(to, message)));
  return true;
}

async function sendOpsSlack(message: string) {
  return sendSlackAlert(message);
}

async function sendOpsAlerts(message: string) {
  const [smsSent, slackSent] = await Promise.all([
    sendOpsSms(message),
    sendOpsSlack(message),
  ]);

  return smsSent || slackSent;
}

export async function sendNewAppointmentAlert(inbound: InboundRecord) {
  return sendOpsAlerts(buildNewAppointmentAlertText(inbound));
}

export async function sendHighRiskInboundAlert(inbound: InboundRecord) {
  const message = buildHighRiskInboundAlertText(inbound);
  return message ? sendOpsAlerts(message) : false;
}

export async function sendPromiseOpsAlert(promise: PromiseRecord) {
  const message = buildPromiseOpsAlertText(promise);
  return message ? sendOpsAlerts(message) : false;
}
