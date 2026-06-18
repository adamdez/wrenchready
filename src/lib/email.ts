import { Resend } from "resend";
import { render } from "@react-email/render";
import { readEnv } from "@/lib/env";
import { PromiseOutboundEmail } from "@/emails/promise-outbound-email";
import {
  getGoogleWorkspaceIntegrationStatus,
  sendGoogleWorkspaceEmail,
} from "@/lib/google-workspace";

let resendClient: Resend | null = null;

export function isResendConfigured() {
  return Boolean(readEnv("RESEND_API_KEY"));
}

export function getOutboundEmailFrom() {
  return readEnv("WR_EMAIL_FROM") || "WrenchReady <onboarding@resend.dev>";
}

export function getJeffEmailFrom() {
  return readEnv("JEFF_EMAIL_FROM") || "Jeff <jeff@wrenchreadymobile.com>";
}

export function getJeffEmailAddress() {
  const from = getJeffEmailFrom();
  return from.match(/<([^>]+)>/)?.[1] || from;
}

export function getJeffEmailDeliveryStatus() {
  const googleWorkspace = getGoogleWorkspaceIntegrationStatus();
  const preferredProvider = readEnv("JEFF_EMAIL_DELIVERY_PROVIDER")?.toLowerCase();
  const googleReady = googleWorkspace.gmail.canSend;
  const resendReady = isResendConfigured();
  const provider =
    preferredProvider === "resend"
      ? resendReady ? "resend" : "none"
      : preferredProvider === "google-workspace"
        ? googleReady ? "google-workspace" : "none"
        : googleReady
          ? "google-workspace"
          : resendReady
            ? "resend"
            : "none";

  return {
    provider,
    ready: provider !== "none",
    resendReady,
    googleWorkspaceReady: googleReady,
    googleWorkspace,
  };
}

export function isJeffEmailSendingConfigured() {
  return getJeffEmailDeliveryStatus().ready;
}

function getResendClient() {
  const apiKey = readEnv("RESEND_API_KEY");
  if (!apiKey) {
    throw new Error("Resend API key is not configured.");
  }

  if (!resendClient) {
    resendClient = new Resend(apiKey);
  }

  return resendClient;
}

type PromiseOutboundEmailInput = {
  to: string;
  customerName: string;
  headline: string;
  subject?: string;
  body: string;
};

type JeffRecapEmailInput = {
  to: string;
  cc?: string[];
  subject: string;
  body: string;
  headline?: string;
  recipientName?: string;
  idempotencyKey?: string;
};

export async function sendPromiseOutboundEmail(input: PromiseOutboundEmailInput) {
  const resend = getResendClient();
  const html = await render(
    PromiseOutboundEmail({
      customerName: input.customerName,
      headline: input.headline,
      body: input.body,
    }),
  );

  return resend.emails.send({
    from: getOutboundEmailFrom(),
    to: input.to,
    subject: input.subject || input.headline,
    html,
  });
}

export async function sendJeffRecapEmail(input: JeffRecapEmailInput) {
  const delivery = getJeffEmailDeliveryStatus();
  const html = await render(
    PromiseOutboundEmail({
      customerName: input.recipientName || "Simon",
      headline: input.headline || input.subject,
      body: input.body,
    }),
  );

  if (delivery.provider === "google-workspace") {
    return sendGoogleWorkspaceEmail({
      to: input.to,
      cc: input.cc,
      subject: input.subject,
      html,
      text: input.body,
    });
  }

  const resend = getResendClient();
  return resend.emails.send(
    {
      from: getJeffEmailFrom(),
      to: input.to,
      cc: input.cc && input.cc.length > 0 ? input.cc : undefined,
      subject: input.subject,
      html,
    },
    {
      headers: {
        "Idempotency-Key":
          input.idempotencyKey ||
          `jeff-recap-${input.subject.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 80)}`,
      },
    },
  );
}
