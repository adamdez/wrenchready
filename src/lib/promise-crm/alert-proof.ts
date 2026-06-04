import {
  buildHighRiskInboundAlertText,
  buildNewAppointmentAlertText,
  buildPromiseOpsAlertText,
} from "@/lib/promise-crm/alert-payloads";
import { getIntegrationSnapshot } from "@/lib/promise-crm/integrations";

const sampleInbound = {
  customer: {
    name: "Sample Customer",
    phone: "(509) 000-0000",
    email: "sample@example.com",
    preferredContact: "text" as const,
  },
  requestedService: "No-start diagnostic",
  location: {
    label: "Sample driveway",
    city: "Spokane",
    territory: "Spokane metro",
  },
  preferredWindow: {
    label: "Tomorrow morning",
  },
  readinessRisk: "high" as const,
  owner: "Dez" as const,
  nextAction: "Confirm location, symptoms, and dispatch fit before promising arrival.",
};

const samplePromise = {
  customer: sampleInbound.customer,
  serviceScope: "Battery/no-start follow-through",
  scheduledWindow: {
    label: "Tomorrow 9-11 AM",
  },
  owner: "Simon" as const,
  status: "tomorrow-at-risk" as const,
  topRisks: ["Parts and arrival window need final confirmation."],
  nextAction: "Confirm parts pickup and customer access.",
};

export async function getOpsAlertProofSnapshot() {
  const integrations = await getIntegrationSnapshot();
  const slackConfigured = integrations.opsSlackAlerts.configured;
  const smsConfigured = integrations.opsSmsAlerts.configured;

  const samples = [
    {
      name: "new appointment",
      shouldAlert: true,
      text: buildNewAppointmentAlertText(sampleInbound),
    },
    {
      name: "high-risk inbound",
      shouldAlert: true,
      text: buildHighRiskInboundAlertText(sampleInbound),
    },
    {
      name: "promise ops",
      shouldAlert: true,
      text: buildPromiseOpsAlertText(samplePromise),
    },
  ];

  return {
    generatedAt: new Date().toISOString(),
    deliveryState: {
      slackConfigured,
      slackSummary: integrations.opsSlackAlerts.summary,
      smsConfigured,
      smsSummary: integrations.opsSmsAlerts.summary,
    },
    proofChecks: [
      {
        name: "sample_alert_payloads_build",
        ok: samples.every((sample) => typeof sample.text === "string" && sample.text.length > 0),
        detail: "Sample new appointment, high-risk inbound, and promise ops alert text can be generated.",
      },
      {
        name: "slack_delivery_state_reported",
        ok: true,
        detail: slackConfigured
          ? "Slack delivery appears configured; keep sends approval-gated."
          : "Slack delivery is held because WR_ENABLE_SLACK_ALERTS and/or WR_SLACK_ALERT_WEBHOOK_URL is not configured.",
      },
      {
        name: "sms_delivery_state_reported",
        ok: true,
        detail: smsConfigured
          ? "SMS alert delivery appears configured; keep 10DLC and sends approval-gated."
          : "SMS alert delivery is held because WR_ENABLE_SMS_ALERTS and/or Twilio notify config is not enabled.",
      },
    ],
    samples,
    nextSafestAction: slackConfigured
      ? "Confirm the approved internal Slack destination and run one explicit supervised test alert only after Adam approves the exact test."
      : "Keep Slack alerts held; choose an approved internal channel/webhook target before enabling WR_ENABLE_SLACK_ALERTS.",
    externalActionRule:
      "This proof is read-only. It does not send Slack alerts, SMS alerts, customer messages, review requests, payment requests, or webhook events.",
  };
}
