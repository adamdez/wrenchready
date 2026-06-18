import { NextResponse } from "next/server";
import { readEnv } from "@/lib/env";
import {
  buildJeffOrientationSystemPrompt,
  getJeffOrientationFirstMessage,
} from "@/lib/jeff-field-assistant/orientation";
import { authorizeJeffToolRequest } from "@/lib/jeff-field-assistant/tools";
import { getJeffVapiPilotConfig } from "@/lib/jeff-field-assistant/vapi-server";

export const dynamic = "force-dynamic";

type OrientationCallRequest = {
  phoneNumber?: string;
  recipientName?: string;
  dryRun?: boolean;
};

function normalizeUsPhoneNumber(value: unknown) {
  if (typeof value !== "string") return undefined;

  const trimmed = value.trim();
  const digits = trimmed.replace(/\D/g, "");

  if (trimmed.startsWith("+") && /^\+\d{10,15}$/.test(trimmed.replace(/[^\d+]/g, ""))) {
    return trimmed.replace(/[^\d+]/g, "");
  }

  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;

  return undefined;
}

function publicCallSummary(call: Record<string, unknown>) {
  return {
    id: call.id,
    status: call.status,
    type: call.type,
    createdAt: call.createdAt,
    assistantId: call.assistantId,
    phoneNumberId: call.phoneNumberId,
  };
}

function parseJsonText(text: string) {
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return { raw: text.slice(0, 500) };
  }
}

export async function POST(request: Request) {
  const auth = authorizeJeffToolRequest(request);
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.message }, { status: auth.status });
  }

  const body = (await request.json().catch(() => ({}))) as OrientationCallRequest;
  const phoneNumber = normalizeUsPhoneNumber(body.phoneNumber);
  const recipientName = typeof body.recipientName === "string" ? body.recipientName.trim() : "";
  const dryRun = Boolean(body.dryRun);

  if (!phoneNumber) {
    return NextResponse.json(
      { success: false, error: "A valid US phone number is required." },
      { status: 400 },
    );
  }

  const vapiApiKey = readEnv("VAPI_API_KEY");
  const assistantId = readEnv("VAPI_JEFF_ASSISTANT_ID", "VAPI_ASSISTANT_ID");
  const phoneNumberId = readEnv("VAPI_JEFF_PHONE_NUMBER_ID", "VAPI_PHONE_NUMBER_ID");
  const toolSecret = readEnv("JEFF_FIELD_ASSISTANT_TOOL_SECRET");
  const config = getJeffVapiPilotConfig();

  const missing = [
    vapiApiKey ? undefined : "VAPI_API_KEY",
    assistantId ? undefined : "VAPI_JEFF_ASSISTANT_ID or VAPI_ASSISTANT_ID",
    phoneNumberId ? undefined : "VAPI_JEFF_PHONE_NUMBER_ID or VAPI_PHONE_NUMBER_ID",
    toolSecret ? undefined : "JEFF_FIELD_ASSISTANT_TOOL_SECRET",
  ].filter((value): value is string => Boolean(value));

  if (missing.length > 0) {
    return NextResponse.json(
      {
        success: false,
        error: "Jeff orientation call is not configured.",
        missing,
      },
      { status: 503 },
    );
  }

  const payload = {
    name: `Jeff orientation ${recipientName || "call"}`.slice(0, 40),
    assistantId,
    phoneNumberId,
    customer: {
      number: phoneNumber,
      name: (recipientName || "Jeff orientation recipient").slice(0, 40),
    },
    assistantOverrides: {
      firstMessage: getJeffOrientationFirstMessage({ recipientName }),
      firstMessageMode: "assistant-speaks-first",
      maxDurationSeconds: 900,
      metadata: {
        purpose: "jeff-orientation-call",
        recipientName: recipientName || null,
      },
      startSpeakingPlan: config.startSpeakingPlan,
      stopSpeakingPlan: config.stopSpeakingPlan,
      server: {
        url: config.serverUrl,
        headers: {
          [config.serverAuthHeader || "X-Vapi-Secret"]: toolSecret,
        },
      },
      model: {
        provider: "openai",
        model: readEnv("VAPI_JEFF_OPENAI_MODEL") || config.model.model,
        messages: [
          {
            role: "system",
            content: buildJeffOrientationSystemPrompt({ recipientName }),
          },
        ],
        tools: config.model.tools,
      },
    },
  };

  if (dryRun) {
    return NextResponse.json({
      success: true,
      dryRun: true,
      call: {
        name: payload.name,
        assistantId: payload.assistantId,
        phoneNumberId: payload.phoneNumberId,
        customer: payload.customer,
        firstMessage: payload.assistantOverrides.firstMessage,
        model: payload.assistantOverrides.model.model,
        toolCount: payload.assistantOverrides.model.tools.length,
        serverUrl: payload.assistantOverrides.server.url,
        startSpeakingPlan: payload.assistantOverrides.startSpeakingPlan,
        stopSpeakingPlan: payload.assistantOverrides.stopSpeakingPlan,
      },
    });
  }

  const response = await fetch("https://api.vapi.ai/call", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${vapiApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const text = await response.text();
  const json = parseJsonText(text);

  if (!response.ok) {
    return NextResponse.json(
      {
        success: false,
        error: "Vapi failed to create the orientation call.",
        status: response.status,
        details: JSON.stringify(json).slice(0, 500),
      },
      { status: 502 },
    );
  }

  return NextResponse.json({
    success: true,
    dryRun: false,
    call: publicCallSummary(json as Record<string, unknown>),
  });
}
