import { readEnv } from "@/lib/env";
import { getIntegrationSnapshot } from "@/lib/promise-crm/integrations";
import type { SystemReadinessItem, SystemsReadinessSnapshot } from "@/lib/promise-crm/types";
import { getGoogleReviewUrl } from "@/lib/review-destination";

function directEmailProviderConfigured() {
  return Boolean(
    readEnv(
      "RESEND_API_KEY",
      "POSTMARK_SERVER_TOKEN",
      "SENDGRID_API_KEY",
      "MAILGUN_API_KEY",
    ),
  );
}

function directPaymentsConfigured() {
  return Boolean(
    readEnv(
      "STRIPE_SECRET_KEY",
      "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
      "PAYPAL_CLIENT_ID",
      "PAYPAL_SECRET",
    ),
  );
}

function bnplConfigured() {
  return Boolean(
    readEnv(
      "AFFIRM_PUBLIC_API_KEY",
      "AFFIRM_PRIVATE_API_KEY",
      "KLARNA_API_KEY",
      "AFTERPAY_API_KEY",
    ),
  );
}

function jeffFieldAssistantConfigured() {
  return Boolean(
    readEnv("OPENAI_API_KEY") &&
      readEnv("VAPI_JEFF_ASSISTANT_ID", "VAPI_ASSISTANT_ID") &&
      readEnv("VAPI_JEFF_PHONE_NUMBER_ID", "VAPI_PHONE_NUMBER_ID") &&
      readEnv("JEFF_FIELD_ASSISTANT_TOOL_SECRET"),
  );
}

function jeffPhotoDropConfigured() {
  return Boolean(readEnv("OPENAI_API_KEY"));
}

export async function getSystemsReadinessSnapshot(): Promise<SystemsReadinessSnapshot> {
  const integrations = await getIntegrationSnapshot();
  const reviewUrl = getGoogleReviewUrl();
  const textOutboundEnabled = readEnv("WR_ENABLE_TEXT_OUTBOUND") === "true";
  const emailProviderReady = directEmailProviderConfigured();
  const paymentsReady = directPaymentsConfigured();
  const bnplReady = bnplConfigured();

  const systems: SystemReadinessItem[] = [
    {
      name: "Promise CRM data + webhook spine",
      status:
        integrations.supabase.configured && integrations.opsWebhook.configured
          ? "ready"
          : "configure-now",
      priority: "now",
      summary:
        integrations.supabase.configured && integrations.opsWebhook.configured
          ? "The central inbound -> promise -> follow-through spine is live."
          : "The central record and handoff path still need configuration.",
      whyItMatters:
        "Without one spine, the business falls back into scattered notes and broken promises.",
      nextStep:
        integrations.supabase.configured && integrations.opsWebhook.configured
          ? "Keep operating from one record and resist side systems."
          : "Finish Supabase and webhook configuration before adding more surface area.",
      accessNeed: integrations.supabase.configured && integrations.opsWebhook.configured ? "none" : "config",
    },
    {
      name: "Voice intake",
      status: integrations.twilioVoice.configured ? "ready" : "configure-now",
      priority: "now",
      summary: integrations.twilioVoice.summary,
      whyItMatters:
        "Missed calls are lost trust and lost revenue in a local service business.",
      nextStep: integrations.twilioVoice.configured
        ? "Keep routing calls into the same inbound queue."
        : "Finish caller ID and forward-to setup.",
      accessNeed: integrations.twilioVoice.configured ? "none" : "config",
    },
    {
      name: "Jeff field assistant",
      status: jeffFieldAssistantConfigured() ? "ready" : "configure-now",
      priority: "now",
      summary: jeffFieldAssistantConfigured()
        ? "The Simon tech expert has OpenAI, Vapi identity, phone routing, and tool-secret configuration visible."
        : "Jeff's field assistant tools are built, but OpenAI, Vapi assistant/phone ids, or the tool secret still need configuration.",
      whyItMatters:
        "Simon needs a callable tech expert that reads the same job context as texts, photos, approvals, invoices, and payment status.",
      nextStep: jeffFieldAssistantConfigured()
        ? "Place controlled test calls and review transcripts before enabling broader field use."
        : "Set OPENAI_API_KEY, create the Jeff Vapi assistant, connect the field number, and set JEFF_FIELD_ASSISTANT_TOOL_SECRET for protected tool calls.",
      accessNeed: jeffFieldAssistantConfigured() ? "none" : "config",
    },
    {
      name: "Jeff Photo Drop",
      status: jeffPhotoDropConfigured() ? "ready" : "configure-now",
      priority: "now",
      summary: jeffPhotoDropConfigured()
        ? "The field photo upload path can attach images to Jeff's job context and run OpenAI photo analysis."
        : "The field photo upload path is built, but OpenAI photo analysis still needs configuration.",
      whyItMatters:
        "Voice alone is not enough in the field; Simon needs Jeff to see terminals, labels, scan screens, leaks, and completed work proof.",
      nextStep: jeffPhotoDropConfigured()
        ? "Bookmark /jeff on Simon's phone and run a live session upload during a test call."
        : "Set OPENAI_API_KEY, then bookmark /jeff on Simon's phone for the first field test.",
      accessNeed: jeffPhotoDropConfigured() ? "none" : "config",
    },
    {
      name: "Text outbound",
      status: textOutboundEnabled ? "ready" : "held",
      priority: "now",
      summary: textOutboundEnabled
        ? "Text outbound is cleared to move through production transport."
        : "Text outbound should stay held until 10DLC and transport are truly live.",
      whyItMatters:
        "Text can tighten the promise loop, but only if the channel is compliant and trustworthy.",
      nextStep: textOutboundEnabled
        ? "Start with the highest-signal recap and reminder touches only."
        : "Do not rely on text as a production promise channel yet.",
      accessNeed: textOutboundEnabled ? "none" : "config",
    },
    {
      name: "Email outbound",
      status: emailProviderReady ? "ready" : "configure-now",
      priority: "now",
      summary: emailProviderReady
        ? "A direct email provider is visible in app configuration."
        : "No direct email provider is visible in app env yet.",
      whyItMatters:
        "Email is the safest first production channel for recap, review, and reminder touches while text stays held.",
      nextStep: emailProviderReady
        ? "Route recap, review, and reminder sends through one owned template path."
        : "Either confirm n8n email delivery or add a direct provider like Resend.",
      accessNeed: emailProviderReady ? "none" : "config",
    },
    {
      name: "Google review destination",
      status: reviewUrl ? "ready" : "configure-now",
      priority: "now",
      summary: reviewUrl
        ? "A review destination is configured for review asks."
        : "No review destination URL is configured yet.",
      whyItMatters:
        "Review asks only compound trust if they land somewhere real and easy.",
      nextStep: reviewUrl
        ? "Use the same review destination in every review ask path."
        : "Copy the Google Business Profile review link into app env.",
      accessNeed: reviewUrl ? "none" : "config",
    },
    {
      name: "Internal Slack alerts",
      status: integrations.opsSlackAlerts.configured ? "ready" : "held",
      priority: "now",
      summary: integrations.opsSlackAlerts.summary,
      whyItMatters:
        "Internal alerts are useful only when they go to a real ops surface and stay separate from customer sends.",
      nextStep: integrations.opsSlackAlerts.configured
        ? "Use Slack for internal review packets and urgent ops alerts only."
        : "Configure WR_ENABLE_SLACK_ALERTS and WR_SLACK_ALERT_WEBHOOK_URL after the target channel is approved.",
      accessNeed: integrations.opsSlackAlerts.configured ? "none" : "config",
    },
    {
      name: "Modern payments and wallets",
      status: paymentsReady ? "ready" : "buy-or-provision",
      priority: "soon",
      summary: paymentsReady
        ? "A production payment processor is visible in app configuration."
        : "Stripe is the chosen payment rail, but the production keys are not configured yet for Apple Pay, wallet-first checkout, or deposit links.",
      whyItMatters:
        "Approvals, deposits, and easy mobile payment are part of keeping promises and lifting approval rate.",
      nextStep: paymentsReady
        ? "Use one processor as the money surface and keep approvals tied to the promise record."
        : "Add the Stripe keys and webhook secret so deposit checkout can move from code-ready to production-ready.",
      accessNeed: paymentsReady ? "none" : "purchase",
    },
    {
      name: "BNPL",
      status: bnplReady ? "ready" : "buy-or-provision",
      priority: "later",
      summary: bnplReady
        ? "A BNPL rail appears to be configured."
        : "No BNPL rail is configured yet.",
      whyItMatters:
        "BNPL matters for higher-ticket approvals, but it is not the first blocker in the promise spine.",
      nextStep: bnplReady
        ? "Test BNPL only on the right repair classes and approval moments."
        : "Add BNPL after the base payment processor is live and the approval flow is clean.",
      accessNeed: bnplReady ? "none" : "purchase",
    },
  ];

  return {
    generatedAt: new Date().toISOString(),
    companyGoal:
      "Create demand, make clear promises, keep them visibly, and turn that trust into repeat and recurring revenue.",
    buildGoal:
      "Give WrenchReady one operating spine for inbound, promise, readiness, closeout, recapture, and recurring-account growth.",
    systems,
    needsNow: systems.filter((item) => item.priority === "now" && item.status !== "ready"),
    needsSoon: systems.filter((item) => item.priority !== "now" && item.status !== "ready"),
  };
}
