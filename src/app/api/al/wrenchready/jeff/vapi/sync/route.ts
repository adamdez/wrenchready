import { NextResponse } from "next/server";
import { readEnv } from "@/lib/env";
import { authorizeJeffToolRequest } from "@/lib/jeff-field-assistant/tools";
import { getJeffVapiPilotConfig } from "@/lib/jeff-field-assistant/vapi-server";

export const dynamic = "force-dynamic";

type SyncRequest = {
  apply?: boolean;
  model?: string;
  voiceId?: string;
  voiceVersion?: number;
};

type VapiAssistant = Record<string, unknown>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function toolName(tool: unknown) {
  if (!isRecord(tool)) return undefined;
  const fn = tool.function;

  if (typeof tool.name === "string") return tool.name;
  if (isRecord(fn) && typeof fn.name === "string") return fn.name;

  return undefined;
}

function sortedToolNames(tools: unknown) {
  return (Array.isArray(tools) ? tools : []).map(toolName).filter(Boolean).sort();
}

function diffTools(liveTools: unknown, desiredTools: unknown) {
  const liveNames = sortedToolNames(liveTools);
  const desiredNames = sortedToolNames(desiredTools);

  return {
    liveNames,
    desiredNames,
    missing: desiredNames.filter((name) => !liveNames.includes(name)),
    extra: liveNames.filter((name) => !desiredNames.includes(name)),
  };
}

function objectValue(value: unknown) {
  return isRecord(value) ? value : {};
}

function arrayValue(value: unknown) {
  return Array.isArray(value) ? value : [];
}

function safeAssistantSummary(assistant: VapiAssistant) {
  const model = objectValue(assistant.model);
  const server = objectValue(assistant.server);
  const headers = objectValue(server.headers);
  const tools = arrayValue(model.tools);

  return {
    id: assistant.id,
    name: assistant.name,
    model: model.model,
    voice: assistant.voice,
    firstMessage: assistant.firstMessage,
    serverUrl: server.url || assistant.serverUrl,
    serverHeaderKeys: Object.keys(headers),
    toolCount: tools.length,
    toolNames: sortedToolNames(tools),
    startSpeakingPlan: assistant.startSpeakingPlan,
    stopSpeakingPlan: assistant.stopSpeakingPlan,
  };
}

async function fetchJson(url: string, options: RequestInit = {}) {
  const response = await fetch(url, options);
  const text = await response.text();
  let json: unknown;

  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`${url} returned non-JSON: ${text.slice(0, 300)}`);
  }

  if (!response.ok) {
    throw new Error(`${url} failed: ${response.status} ${JSON.stringify(json).slice(0, 300)}`);
  }

  return objectValue(json);
}

export async function POST(request: Request) {
  const auth = authorizeJeffToolRequest(request);
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.message }, { status: auth.status });
  }

  const body = (await request.json().catch(() => ({}))) as SyncRequest;
  const vapiApiKey = readEnv("VAPI_API_KEY");
  const assistantId = readEnv("VAPI_JEFF_ASSISTANT_ID", "VAPI_ASSISTANT_ID");
  const toolSecret = readEnv("JEFF_FIELD_ASSISTANT_TOOL_SECRET");
  const config = getJeffVapiPilotConfig();

  const missing = [
    vapiApiKey ? undefined : "VAPI_API_KEY",
    assistantId ? undefined : "VAPI_JEFF_ASSISTANT_ID or VAPI_ASSISTANT_ID",
    toolSecret ? undefined : "JEFF_FIELD_ASSISTANT_TOOL_SECRET",
  ].filter((value): value is string => Boolean(value));

  if (missing.length > 0) {
    return NextResponse.json(
      { success: false, error: "Jeff Vapi sync is not configured.", missing },
      { status: 503 },
    );
  }

  try {
    const live = await fetchJson(`https://api.vapi.ai/assistant/${assistantId}`, {
      headers: { Authorization: `Bearer ${vapiApiKey}` },
    });
    const liveModel = objectValue(live.model);
    const liveServer = objectValue(live.server);
    const liveVoice = objectValue(live.voice);
    const voiceId =
      typeof body.voiceId === "string" && body.voiceId.trim()
        ? body.voiceId.trim()
        : typeof liveVoice.voiceId === "string"
          ? liveVoice.voiceId
          : "Kai";
    const voiceVersion =
      typeof body.voiceVersion === "number" && Number.isFinite(body.voiceVersion)
        ? body.voiceVersion
        : typeof liveVoice.version === "number"
          ? liveVoice.version
          : 2;
    const model =
      typeof body.model === "string" && body.model.trim()
        ? body.model.trim()
        : readEnv("VAPI_JEFF_OPENAI_MODEL") || String(liveModel.model || config.model.model);
    const beforeDiff = diffTools(liveModel.tools, config.model.tools);
    const patch = {
      firstMessage: config.firstMessage,
      server: {
        ...liveServer,
        url: config.serverUrl,
        headers: {
          ...objectValue(liveServer.headers),
          [config.serverAuthHeader || "X-Vapi-Secret"]: toolSecret,
        },
      },
      serverMessages: live.serverMessages,
      startSpeakingPlan: config.startSpeakingPlan,
      stopSpeakingPlan: config.stopSpeakingPlan,
      model: {
        provider: "openai",
        model,
        messages: config.model.messages,
        tools: config.model.tools,
      },
      voice: {
        provider: "vapi",
        voiceId,
        version: voiceVersion,
      },
    };

    if (!body.apply) {
      return NextResponse.json({
        success: true,
        dryRun: true,
        target: { assistantId, model, voiceId, voiceVersion },
        before: safeAssistantSummary(live),
        diff: beforeDiff,
        patchSummary: {
          model: patch.model.model,
          voice: patch.voice,
          toolCount: patch.model.tools.length,
          serverUrl: patch.server.url,
          serverHeaderKeys: Object.keys(patch.server.headers || {}),
          startSpeakingPlan: patch.startSpeakingPlan,
          stopSpeakingPlan: patch.stopSpeakingPlan,
        },
      });
    }

    const updated = await fetchJson(`https://api.vapi.ai/assistant/${assistantId}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${vapiApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(patch),
    });
    const updatedModel = objectValue(updated.model);
    const updatedVoice = objectValue(updated.voice);
    const afterDiff = diffTools(updatedModel.tools, config.model.tools);

    if (updatedModel.model !== model) {
      throw new Error(`Vapi assistant model mismatch after patch: expected ${model}, got ${updatedModel.model}`);
    }
    if (updatedVoice.provider !== "vapi" || updatedVoice.voiceId !== voiceId || updatedVoice.version !== voiceVersion) {
      throw new Error("Vapi assistant voice mismatch after patch.");
    }
    if (afterDiff.missing.length > 0 || afterDiff.extra.length > 0) {
      throw new Error(`Vapi assistant tool mismatch after patch: ${JSON.stringify(afterDiff)}`);
    }

    return NextResponse.json({
      success: true,
      dryRun: false,
      target: { assistantId, model, voiceId, voiceVersion },
      before: {
        model: liveModel.model,
        voice: live.voice,
        toolCount: arrayValue(liveModel.tools).length,
        missingTools: beforeDiff.missing,
        startSpeakingPlan: live.startSpeakingPlan,
        stopSpeakingPlan: live.stopSpeakingPlan,
      },
      after: safeAssistantSummary(updated),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Jeff Vapi sync failed.",
      },
      { status: 502 },
    );
  }
}
