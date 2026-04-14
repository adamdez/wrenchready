import { Resend } from "resend";
import { render } from "@react-email/render";
import { readEnv } from "@/lib/env";
import { PromiseOutboundEmail } from "@/emails/promise-outbound-email";

let resendClient: Resend | null = null;

export function isResendConfigured() {
  return Boolean(readEnv("RESEND_API_KEY"));
}

export function getOutboundEmailFrom() {
  return readEnv("WR_EMAIL_FROM") || "WrenchReady <onboarding@resend.dev>";
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
