import { readEnv } from "@/lib/env";
import { hasPromiseCrmSupabase, supabaseRestRequest } from "@/lib/promise-crm/supabase";

export type IntegrationStatus = {
  configured: boolean;
  summary: string;
};

export type WrenchReadyIntegrationSnapshot = {
  supabase: IntegrationStatus;
  opsWebhook: IntegrationStatus;
  twilioVoice: IntegrationStatus;
  twilioMessaging: IntegrationStatus;
  twilioNotifications: IntegrationStatus;
  opsSmsAlerts: IntegrationStatus;
};

async function getSupabaseStatus(): Promise<IntegrationStatus> {
  if (!hasPromiseCrmSupabase()) {
    return {
      configured: false,
      summary: "Missing Supabase URL or service credential.",
    };
  }

  try {
    await supabaseRestRequest<unknown[]>("wrenchready_inbound?select=id&limit=1", {
      method: "GET",
    });

    return {
      configured: true,
      summary: "Supabase Promise CRM tables are reachable.",
    };
  } catch {
    return {
      configured: false,
      summary: "Supabase env exists, but Promise CRM tables are not reachable yet.",
    };
  }
}

export async function getIntegrationSnapshot(): Promise<WrenchReadyIntegrationSnapshot> {
  const opsWebhook = readEnv("WR_OPS_WEBHOOK_URL", "APPOINTMENT_WEBHOOK_URL");
  const twilioCallerId = readEnv("TWILIO_CALLER_ID_NUMBER", "My_Twilio_phone_number");
  const twilioForwardTo = readEnv("TWILIO_FORWARD_TO_PHONE");
  const twilioAccountSid = readEnv("TWILIO_ACCOUNT_SID", "Twilio_Account_SID");
  const twilioAuthToken = readEnv("TWILIO_AUTH_TOKEN", "Twilio_Auth_Token");
  const twilioNotifyPhones = readEnv("TWILIO_VOICEMAIL_NOTIFY_PHONES");
  const smsAlertsEnabled = readEnv("WR_ENABLE_SMS_ALERTS") === "true";
  const supabase = await getSupabaseStatus();

  return {
    supabase,
    opsWebhook: {
      configured: !!opsWebhook,
      summary: opsWebhook
        ? "Ops webhook target is configured."
        : "Missing WR_OPS_WEBHOOK_URL or APPOINTMENT_WEBHOOK_URL.",
    },
    twilioVoice: {
      configured: !!twilioCallerId && !!twilioForwardTo,
      summary:
        !!twilioCallerId && !!twilioForwardTo
          ? "Voice forwarding can present the business caller ID."
          : "Missing forward-to phone or caller ID number.",
    },
    twilioMessaging: {
      configured: !!twilioCallerId,
      summary: twilioCallerId
        ? "Messaging number is available for SMS intake."
        : "Missing business Twilio number.",
    },
    twilioNotifications: {
      configured: !!twilioAccountSid && !!twilioAuthToken && !!twilioNotifyPhones,
      summary:
        !!twilioAccountSid && !!twilioAuthToken && !!twilioNotifyPhones
          ? "Voicemail SMS notification path is configured."
          : "Missing Twilio API credential or voicemail notify phones.",
    },
    opsSmsAlerts: {
      configured:
        smsAlertsEnabled && !!twilioAccountSid && !!twilioAuthToken && !!twilioNotifyPhones,
      summary: smsAlertsEnabled
        ? "Internal SMS alerts are enabled."
        : "Internal SMS alerts are disabled until WR_ENABLE_SMS_ALERTS=true.",
    },
  };
}
