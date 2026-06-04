import { readEnv } from "@/lib/env";
import {
  getPromiseCrmSupabaseConnection,
  hasPromiseCrmSupabase,
  supabaseRestRequest,
  type PromiseCrmSupabaseCredentialKind,
} from "@/lib/promise-crm/supabase";

export type IntegrationStatus = {
  configured: boolean;
  summary: string;
};

type PromiseCrmPersistenceMode =
  | "live-supabase"
  | "read-only-supabase-risk"
  | "configured-unreachable"
  | "demo-fallback";

type PromiseCrmTableProof = {
  table: "wrenchready_inbound" | "wrenchready_promise";
  reachable: boolean;
  sampleRows: number;
  error: string | null;
};

export type PromiseCrmPersistenceProof = {
  mode: PromiseCrmPersistenceMode;
  summary: string;
  generatedAt: string;
  projectHost: string | null;
  credentialKind: PromiseCrmSupabaseCredentialKind;
  writeCredentialReady: boolean;
  tableProof: PromiseCrmTableProof[];
  proofChecks: Array<{
    name: string;
    ok: boolean;
    detail: string;
  }>;
  nextSafestAction: string;
  externalActionRule: string;
};

export type WrenchReadyIntegrationSnapshot = {
  supabase: IntegrationStatus;
  promiseCrmPersistence: PromiseCrmPersistenceProof;
  opsWebhook: IntegrationStatus;
  twilioVoice: IntegrationStatus;
  twilioMessaging: IntegrationStatus;
  twilioNotifications: IntegrationStatus;
  opsSmsAlerts: IntegrationStatus;
  opsSlackAlerts: IntegrationStatus;
};

function checkLine(name: string, ok: boolean, detail: string) {
  return { name, ok, detail };
}

async function readTableProof(table: PromiseCrmTableProof["table"]): Promise<PromiseCrmTableProof> {
  try {
    const rows = await supabaseRestRequest<Array<{ id: string }>>(`${table}?select=id&limit=1`, {
      method: "GET",
    });

    return {
      table,
      reachable: true,
      sampleRows: rows.length,
      error: null,
    };
  } catch (error) {
    return {
      table,
      reachable: false,
      sampleRows: 0,
      error: error instanceof Error ? error.message : "Could not reach Promise CRM table.",
    };
  }
}

export async function getPromiseCrmPersistenceProof(): Promise<PromiseCrmPersistenceProof> {
  const connection = getPromiseCrmSupabaseConnection();

  if (!hasPromiseCrmSupabase()) {
    return {
      mode: "demo-fallback",
      summary: "Promise CRM is using demo/runtime fallback because Supabase URL or credential is missing.",
      generatedAt: new Date().toISOString(),
      projectHost: connection.projectHost,
      credentialKind: connection.credentialKind,
      writeCredentialReady: false,
      tableProof: [],
      proofChecks: [
        checkLine(
          "supabase_env_present",
          false,
          "Missing Supabase URL or credential; Promise CRM writes cannot be treated as persistent.",
        ),
      ],
      nextSafestAction: "Configure Supabase URL plus a server-only service role or secret key, then rerun this proof.",
      externalActionRule:
        "This proof is read-only. Do not migrate, overwrite, message customers, or change live records without Adam approval.",
    };
  }

  const tableProof = await Promise.all([
    readTableProof("wrenchready_inbound"),
    readTableProof("wrenchready_promise"),
  ]);
  const tablesReachable = tableProof.every((table) => table.reachable);
  const writeCredentialReady = connection.writeCredentialReady;
  const mode: PromiseCrmPersistenceMode = tablesReachable
    ? writeCredentialReady
      ? "live-supabase"
      : "read-only-supabase-risk"
    : "configured-unreachable";
  const summary =
    mode === "live-supabase"
      ? "Promise CRM is pointed at reachable Supabase tables with a server-side write credential."
      : mode === "read-only-supabase-risk"
        ? "Promise CRM can read Supabase, but only an anon/publishable credential is visible; live writes are not safe."
        : "Supabase env exists, but one or more Promise CRM tables are not reachable.";
  const firstError = tableProof.find((table) => table.error)?.error || null;

  return {
    mode,
    summary,
    generatedAt: new Date().toISOString(),
    projectHost: connection.projectHost,
    credentialKind: connection.credentialKind,
    writeCredentialReady,
    tableProof,
    proofChecks: [
      checkLine(
        "supabase_env_present",
        connection.configured,
        connection.configured
          ? `Supabase env is present for ${connection.projectHost || "unknown host"}.`
          : "Missing Supabase URL or credential.",
      ),
      checkLine(
        "server_write_credential",
        writeCredentialReady,
        writeCredentialReady
          ? "Server-only service role or secret key is visible."
          : `Credential kind is ${connection.credentialKind}; live Promise CRM writes should stay held.`,
      ),
      checkLine(
        "promise_tables_reachable",
        tablesReachable,
        tablesReachable
          ? "Inbound and promise tables are reachable through the Supabase REST API."
          : firstError || "One or more Promise CRM tables are not reachable.",
      ),
    ],
    nextSafestAction:
      mode === "live-supabase"
        ? "Treat Promise CRM as live storage after one supervised create/update test in a non-customer test record."
        : mode === "read-only-supabase-risk"
          ? "Add a server-only service role or secret key before trusting customer-facing Promise CRM writes."
          : "Rerun the Promise CRM schema and verify table grants/RLS for service_role before using this as live storage.",
    externalActionRule:
      "This proof is read-only. Do not migrate, overwrite, message customers, or change live records without Adam approval.",
  };
}

export async function getIntegrationSnapshot(): Promise<WrenchReadyIntegrationSnapshot> {
  const opsWebhook = readEnv("WR_OPS_WEBHOOK_URL", "APPOINTMENT_WEBHOOK_URL");
  const twilioCallerId = readEnv("TWILIO_CALLER_ID_NUMBER", "My_Twilio_phone_number");
  const twilioForwardTo = readEnv("TWILIO_FORWARD_TO_PHONE");
  const twilioAccountSid = readEnv("TWILIO_ACCOUNT_SID", "Twilio_Account_SID");
  const twilioAuthToken = readEnv("TWILIO_AUTH_TOKEN", "Twilio_Auth_Token");
  const twilioNotifyPhones = readEnv("TWILIO_VOICEMAIL_NOTIFY_PHONES");
  const smsAlertsEnabled = readEnv("WR_ENABLE_SMS_ALERTS")?.trim() === "true";
  const slackAlertsEnabled = readEnv("WR_ENABLE_SLACK_ALERTS")?.trim() === "true";
  const slackWebhook = readEnv("WR_SLACK_ALERT_WEBHOOK_URL");
  const promiseCrmPersistence = await getPromiseCrmPersistenceProof();

  return {
    supabase: {
      configured: promiseCrmPersistence.mode === "live-supabase",
      summary: promiseCrmPersistence.summary,
    },
    promiseCrmPersistence,
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
    opsSlackAlerts: {
      configured: slackAlertsEnabled && !!slackWebhook,
      summary:
        slackAlertsEnabled && slackWebhook
          ? "Internal Slack alerts are enabled with a webhook target."
          : slackAlertsEnabled
            ? "Internal Slack alerts are enabled, but WR_SLACK_ALERT_WEBHOOK_URL is missing."
            : "Internal Slack alerts are disabled until WR_ENABLE_SLACK_ALERTS=true.",
    },
  };
}
