import { getJeffEmailDeliveryStatus } from "@/lib/email";
import { readEnv } from "@/lib/env";
import { getGoogleMapsIntegrationStatus } from "@/lib/google-maps";
import { getGoogleWorkspaceIntegrationStatus } from "@/lib/google-workspace";
import { isStripeConfigured } from "@/lib/stripe";
import { getLatestSimonLocation } from "@/lib/jeff-field-assistant/location";
import { getJeffLocalMirrorStatus } from "@/lib/jeff-field-assistant/sync";
import { getJeffEmailIntegrationStatus } from "@/lib/jeff-field-assistant/email-ingest";

export type JeffCapabilityState = "ready" | "partial" | "blocked";

export type JeffCapability = {
  id: string;
  label: string;
  area: string;
  state: JeffCapabilityState;
  available: boolean;
  reason: string;
  whatJeffCanDo: string;
  whatJeffShouldSay: string;
  operatorAction?: string;
  missing?: string[];
  details?: Record<string, unknown>;
};

export type JeffCapabilityReport = {
  generatedAt: string;
  voiceStyle: string;
  summary: string;
  counts: Record<JeffCapabilityState, number>;
  capabilities: JeffCapability[];
  ready: JeffCapability[];
  partial: JeffCapability[];
  blocked: JeffCapability[];
  warnings: string[];
};

function envReady(...keys: string[]) {
  return keys.some((key) => Boolean(readEnv(key)));
}

function capability(input: Omit<JeffCapability, "available">): JeffCapability {
  return {
    ...input,
    available: input.state === "ready",
  };
}

function stateLabel(state: JeffCapabilityState) {
  if (state === "ready") return "ready";
  if (state === "partial") return "manual/partial";
  return "blocked";
}

function stateFromReadyPartial(ready: boolean, partial: boolean): JeffCapabilityState {
  if (ready) return "ready";
  if (partial) return "partial";
  return "blocked";
}

function unique(values: Array<string | undefined>) {
  return [...new Set(values.filter((value): value is string => Boolean(value)))];
}

function missingIf(condition: boolean, label: string) {
  return condition ? undefined : label;
}

export async function getJeffCapabilityReport(): Promise<JeffCapabilityReport> {
  const generatedAt = new Date().toISOString();
  const googleWorkspace = getGoogleWorkspaceIntegrationStatus();
  const googleMaps = getGoogleMapsIntegrationStatus();
  const email = getJeffEmailIntegrationStatus();
  const emailDelivery = getJeffEmailDeliveryStatus();
  const [location, localMirror] = await Promise.all([
    getLatestSimonLocation(),
    getJeffLocalMirrorStatus(),
  ]);
  const openAiReady = envReady("OPENAI_API_KEY");
  const toolSecretReady = envReady("JEFF_FIELD_ASSISTANT_TOOL_SECRET");
  const vapiAssistantReady = envReady("VAPI_JEFF_ASSISTANT_ID", "VAPI_ASSISTANT_ID");
  const vapiPhoneReady = envReady("VAPI_JEFF_PHONE_NUMBER_ID", "VAPI_PHONE_NUMBER_ID");
  const fieldPhoneReady = envReady("JEFF_FIELD_PHONE_NUMBER", "VAPI_JEFF_PHONE_NUMBER");
  const appPinReady = envReady("JEFF_FIELD_APP_PIN", "JEFF_FIELD_PHOTO_UPLOAD_PIN");
  const stripeReady = isStripeConfigured();
  const freshLocation = Boolean(location.location && !location.location.stale);
  const anyLocation = Boolean(location.location);

  const capabilities: JeffCapability[] = [
    capability({
      id: "voice-call",
      label: "Phone call with Jeff",
      area: "communication",
      state: stateFromReadyPartial(openAiReady && toolSecretReady && vapiAssistantReady && (vapiPhoneReady || fieldPhoneReady), openAiReady && toolSecretReady),
      reason: openAiReady && toolSecretReady && vapiAssistantReady && (vapiPhoneReady || fieldPhoneReady)
        ? "Vapi/OpenAI voice path and protected tool callbacks are configured."
        : "Voice is not fully production-ready until the Vapi assistant, Jeff phone number, OpenAI key, and tool secret are all present.",
      whatJeffCanDo: "Talk Simon through field troubleshooting and call WrenchReady tools when Vapi sends tool calls.",
      whatJeffShouldSay: "Call me and tell me the customer or vehicle you are on.",
      operatorAction: "Confirm the Vapi assistant, phone number, OpenAI key, and JEFF_FIELD_ASSISTANT_TOOL_SECRET after each deploy.",
      missing: unique([
        missingIf(openAiReady, "OPENAI_API_KEY"),
        missingIf(toolSecretReady, "JEFF_FIELD_ASSISTANT_TOOL_SECRET"),
        missingIf(vapiAssistantReady, "VAPI_JEFF_ASSISTANT_ID"),
        missingIf(vapiPhoneReady || fieldPhoneReady, "VAPI_JEFF_PHONE_NUMBER_ID or JEFF_FIELD_PHONE_NUMBER"),
      ]),
      details: {
        assistantConfigured: vapiAssistantReady,
        phoneConfigured: vapiPhoneReady || fieldPhoneReady,
        toolSecretConfigured: toolSecretReady,
      },
    }),
    capability({
      id: "app-message",
      label: "Message Jeff in the field app",
      area: "communication",
      state: openAiReady ? "ready" : "partial",
      reason: openAiReady
        ? "The phone-style message UI can save messages and get live Jeff replies."
        : "The message UI can save messages, but live text replies need OPENAI_API_KEY.",
      whatJeffCanDo: "Receive typed or dictated field messages, attach them to job context, run obvious tools, and reply in the app.",
      whatJeffShouldSay: "Send it here if calling is awkward. I can keep it with the job file.",
      operatorAction: appPinReady ? undefined : "Set JEFF_FIELD_APP_PIN for tighter field app access control.",
      missing: unique([missingIf(openAiReady, "OPENAI_API_KEY")]),
      details: { appPinConfigured: appPinReady },
    }),
    capability({
      id: "photo-file-upload",
      label: "Photos and files",
      area: "evidence",
      state: googleWorkspace.drive.canUpload ? "ready" : "partial",
      reason: googleWorkspace.drive.canUpload
        ? "Google Drive upload is available for durable photo/file storage."
        : "Photos/files can be captured in Jeff, but Drive is not fully connected for durable storage.",
      whatJeffCanDo: "Accept photos, scan reports, PDFs, and files from the message page or photo drop, then attach useful evidence to a job.",
      whatJeffShouldSay: "Send the photo here. If it matters to the job, pick the job first.",
      operatorAction: googleWorkspace.drive.canUpload ? undefined : "Set Google Workspace auth and GOOGLE_DRIVE_JOB_FOLDER_ID.",
      missing: googleWorkspace.drive.missing,
      details: { drive: googleWorkspace.drive },
    }),
    capability({
      id: "photo-analysis",
      label: "Photo analysis",
      area: "diagnostics",
      state: openAiReady ? "ready" : "blocked",
      reason: openAiReady
        ? "OpenAI vision/photo analysis is available."
        : "Jeff cannot inspect images without OPENAI_API_KEY.",
      whatJeffCanDo: "Use uploaded field photos as supporting evidence and ask for better angles when needed.",
      whatJeffShouldSay: "Upload the picture and I’ll look for visible clues, but we still verify with tests.",
      operatorAction: openAiReady ? undefined : "Set OPENAI_API_KEY.",
      missing: unique([missingIf(openAiReady, "OPENAI_API_KEY")]),
    }),
    capability({
      id: "email-send",
      label: "Send recap email",
      area: "communication",
      state: emailDelivery.ready ? "ready" : "blocked",
      reason: emailDelivery.ready
        ? `Jeff outbound email is configured through ${emailDelivery.provider}.`
        : "Jeff can draft recap content but cannot send email until an outbound provider is connected.",
      whatJeffCanDo: "Send Simon and Adam concise recaps only when the send tool confirms delivery.",
      whatJeffShouldSay: emailDelivery.ready
        ? "I can send the recap to Simon and Adam."
        : "I can draft the recap, but email sending is not connected yet.",
      operatorAction: emailDelivery.ready ? undefined : "Connect Google Workspace Gmail send or Resend for Jeff.",
      missing: email.outbound.ready ? [] : [email.outbound.note],
      details: { outbound: email.outbound, deliveryProvider: emailDelivery.provider },
    }),
    capability({
      id: "gmail-read",
      label: "Read Jeff Gmail / scan reports",
      area: "communication",
      state: googleWorkspace.gmail.canRead || email.inbound.ready ? "ready" : "blocked",
      reason: googleWorkspace.gmail.canRead
        ? "Google Workspace Gmail read is available."
        : email.inbound.ready
          ? "Inbound email webhook is available."
          : "No Gmail read or inbound mailbox forwarding path is connected yet.",
      whatJeffCanDo: "Check/ingest diagnostic emails and scan reports only when Gmail or inbound forwarding is connected.",
      whatJeffShouldSay: googleWorkspace.gmail.canRead || email.inbound.ready
        ? "I can check Jeff’s inbox for that report."
        : "I can’t check Jeff’s inbox yet. Forwarding or Gmail read still needs to be connected.",
      operatorAction: googleWorkspace.gmail.canRead || email.inbound.ready
        ? undefined
        : "Connect Google Workspace Gmail read or route jeff@wrenchreadymobile.com to the inbound endpoint.",
      missing: unique([...googleWorkspace.gmail.missing, email.inbound.ready ? undefined : email.inbound.note]),
      details: { gmail: googleWorkspace.gmail, inbound: email.inbound },
    }),
    capability({
      id: "calendar-sync",
      label: "Calendar and schedule mirror",
      area: "scheduling",
      state: googleWorkspace.calendar.canWrite ? "ready" : googleWorkspace.calendar.canRead ? "partial" : "blocked",
      reason: googleWorkspace.calendar.canWrite
        ? "Jeff can mirror CRM jobs to Google Calendar."
        : googleWorkspace.calendar.canRead
          ? "Jeff can see calendar configuration, but writes are intentionally disabled."
          : "Google Calendar is not connected.",
      whatJeffCanDo: "Use CRM as source of truth and mirror jobs to Calendar when writes are enabled.",
      whatJeffShouldSay: googleWorkspace.calendar.canWrite
        ? "I can mirror the CRM schedule to Calendar."
        : "I can discuss the schedule, but I can’t confirm or write calendar changes yet.",
      operatorAction: googleWorkspace.calendar.canWrite
        ? undefined
        : "Set Google Calendar auth/id and only enable GOOGLE_WORKSPACE_ALLOW_CALENDAR_WRITES=true when ready.",
      missing: googleWorkspace.calendar.canWrite
        ? []
        : unique([...googleWorkspace.calendar.missing, "GOOGLE_WORKSPACE_ALLOW_CALENDAR_WRITES=true"]),
      details: { calendar: googleWorkspace.calendar },
    }),
    capability({
      id: "location-aware-parts-store",
      label: "Nearby parts stores",
      area: "parts",
      state: googleMaps.ready && freshLocation ? "ready" : googleMaps.ready && anyLocation ? "partial" : googleMaps.ready ? "partial" : "blocked",
      reason: googleMaps.ready && freshLocation
        ? "Google Maps is configured and Simon has a fresh location check-in."
        : googleMaps.ready && anyLocation
          ? "Google Maps is configured, but Simon's last location is stale."
          : googleMaps.ready
            ? "Google Maps is configured, but Simon has not shared a location yet."
            : "Google Maps is not configured.",
      whatJeffCanDo: "Rank nearby parts stores by Simon's fresh location, while still requiring fitment and inventory verification.",
      whatJeffShouldSay: freshLocation
        ? "I can look for nearby stores from your current location."
        : "Tap Share Location first so I don’t send you across town from stale data.",
      operatorAction: googleMaps.ready ? "Have Simon tap Share Location when location-sensitive work starts." : "Set GOOGLE_MAPS_API_KEY.",
      missing: googleMaps.ready ? [] : googleMaps.missing,
      details: {
        maps: googleMaps,
        location: location.location || null,
        locationStorageStatus: location.storageStatus,
      },
    }),
    capability({
      id: "parts-purchase",
      label: "Buy or reserve parts",
      area: "parts",
      state: "blocked",
      reason: "Part purchase/reservation is intentionally blocked until fitment, vendor inventory, approval, payment authority, and writeback are built.",
      whatJeffCanDo: "Prepare an escalation with part, fitment questions, vendor, price/core-charge questions, and pickup timing.",
      whatJeffShouldSay: "I can prep the part details, but I can’t buy or reserve it yet.",
      operatorAction: "Build approval-gated parts inventory/order workflow before enabling this.",
      missing: [
        "approved purchase authority",
        "fitment verification source",
        "vendor inventory/checkout integration",
        "approval readback",
        "job writeback",
      ],
    }),
    capability({
      id: "invoice-payment",
      label: "Invoices and field payment",
      area: "money",
      state: stripeReady ? "partial" : "blocked",
      reason: stripeReady
        ? "Stripe is configured for secure payment links, but instant field invoice generation still needs a finished workflow."
        : "Stripe is not fully configured, so Jeff cannot create payment links reliably.",
      whatJeffCanDo: "Check payment/invoice context and avoid money promises unless CRM/payment state confirms it.",
      whatJeffShouldSay: stripeReady
        ? "I can help route payment-link work, but I need the invoice facts confirmed."
        : "I can note the payment need, but payment links are not ready yet.",
      operatorAction: stripeReady ? "Finish instant invoice/payment action flow." : "Set Stripe secret and publishable keys.",
      missing: stripeReady ? ["instant invoice action workflow"] : ["STRIPE_SECRET_KEY", "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"],
    }),
    capability({
      id: "job-memory",
      label: "Job files and durable memory",
      area: "memory",
      state: "ready",
      reason: "Jeff has a local/Supabase-backed job workspace and approved-memory path.",
      whatJeffCanDo: "Save job events, summaries, photos/files, and candidate memories; approved memories can be reused later.",
      whatJeffShouldSay: "I’ll save the useful job fact. Memory that affects future behavior still needs approval.",
      operatorAction: localMirror.root.durableAcrossDeployments
        ? "Supabase is still preferred for multi-device/team production durability."
        : "Supabase or another durable store is needed because this runtime local storage will not survive deployments.",
      details: { localMirrorRoot: localMirror.root, localMirrorFiles: localMirror.files },
    }),
  ];

  const ready = capabilities.filter((entry) => entry.state === "ready");
  const partial = capabilities.filter((entry) => entry.state === "partial");
  const blocked = capabilities.filter((entry) => entry.state === "blocked");
  const counts: Record<JeffCapabilityState, number> = {
    ready: ready.length,
    partial: partial.length,
    blocked: blocked.length,
  };

  return {
    generatedAt,
    voiceStyle:
      "Use capability status quietly. Be useful first. Do not recite system checks or narrate internal lookups unless Simon asks why something is unavailable.",
    summary: `${ready.length} ready, ${partial.length} partial, ${blocked.length} blocked.`,
    counts,
    capabilities,
    ready,
    partial,
    blocked,
    warnings: location.warnings,
  };
}

export function buildJeffCapabilityPromptContext(report: JeffCapabilityReport) {
  const lines = report.capabilities.map((entry) => (
    `- ${entry.label}: ${stateLabel(entry.state)}. ${entry.whatJeffCanDo} Say: "${entry.whatJeffShouldSay}"`
  ));

  return [
    "Live Jeff capability status. Use quietly; do not sound like a system dashboard.",
    report.voiceStyle,
    `Summary: ${report.summary}`,
    ...lines,
  ].join("\n");
}
