import "./load-local-env.mjs";

const args = process.argv.slice(2);

function argValue(name, fallback) {
  const prefix = `${name}=`;
  const entry = args.find((arg) => arg.startsWith(prefix));
  if (entry) return entry.slice(prefix.length);
  const index = args.indexOf(name);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
}

const apply = args.includes("--apply");
const baseUrl = (argValue("--base-url", process.env.NEXT_PUBLIC_APP_URL || "https://wrenchreadymobile.com") || "")
  .replace(/\/$/, "");
const model = argValue("--model", process.env.VAPI_JEFF_OPENAI_MODEL || "gpt-5.4-mini");
const voiceIdOverride = argValue("--voice", undefined);
const voiceProviderOverride = argValue("--voice-provider", undefined);
const voiceSpeedOverride = argValue("--voice-speed", undefined);
const voiceVersionOverride = argValue("--voice-version", undefined);
const vapiApiKey = process.env.VAPI_API_KEY;
const assistantId = process.env.VAPI_JEFF_ASSISTANT_ID || process.env.VAPI_ASSISTANT_ID;
const toolSecret = process.env.JEFF_FIELD_ASSISTANT_TOOL_SECRET;

if (!vapiApiKey) throw new Error("VAPI_API_KEY is required.");
if (!assistantId) throw new Error("VAPI_JEFF_ASSISTANT_ID is required.");
if (!toolSecret) throw new Error("JEFF_FIELD_ASSISTANT_TOOL_SECRET is required.");
if (!baseUrl) throw new Error("A production base URL is required.");
if (!model) throw new Error("A Vapi model id is required.");

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  const text = await response.text();
  let json;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`${url} returned non-JSON: ${text.slice(0, 300)}`);
  }

  if (!response.ok) {
    throw new Error(`${url} failed: ${response.status} ${JSON.stringify(json).slice(0, 300)}`);
  }

  return json;
}

function toolName(tool) {
  return tool?.function?.name || tool?.name;
}

function sortedToolNames(tools) {
  return (Array.isArray(tools) ? tools : []).map(toolName).filter(Boolean).sort();
}

function diffTools(liveTools, desiredTools) {
  const liveNames = sortedToolNames(liveTools);
  const desiredNames = sortedToolNames(desiredTools);

  return {
    liveNames,
    desiredNames,
    missing: desiredNames.filter((name) => !liveNames.includes(name)),
    extra: liveNames.filter((name) => !desiredNames.includes(name)),
  };
}

function safeAssistantSummary(assistant) {
  const tools = Array.isArray(assistant?.model?.tools) ? assistant.model.tools : [];
  return {
    id: assistant?.id,
    name: assistant?.name,
    model: assistant?.model?.model,
    voice: assistant?.voice,
    firstMessage: assistant?.firstMessage,
    serverUrl: assistant?.server?.url || assistant?.serverUrl,
    serverHeaderKeys: Object.keys(assistant?.server?.headers || {}),
    toolCount: tools.length,
    toolNames: sortedToolNames(tools),
    serverMessages: assistant?.serverMessages,
    startSpeakingPlan: assistant?.startSpeakingPlan,
    stopSpeakingPlan: assistant?.stopSpeakingPlan,
  };
}

function numberValue(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

function stringValue(value) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

const [live, desiredPayload] = await Promise.all([
  fetchJson(`https://api.vapi.ai/assistant/${assistantId}`, {
    headers: { Authorization: `Bearer ${vapiApiKey}` },
  }),
  fetchJson(`${baseUrl}/api/al/wrenchready/jeff/vapi/config`, {
    headers: { Authorization: `Bearer ${toolSecret}` },
  }),
]);

const desired = desiredPayload.config;
if (!desired?.model?.tools?.length) {
  throw new Error("Production Jeff config did not return tool schemas.");
}

const beforeDiff = diffTools(live.model?.tools, desired.model.tools);
const liveVoice = live.voice && typeof live.voice === "object" ? live.voice : {};
const voiceProvider = stringValue(voiceProviderOverride) || stringValue(liveVoice.provider) || "11labs";
const voiceId = stringValue(voiceIdOverride) || stringValue(liveVoice.voiceId) || "cjVigY5qzO86Huf0OWal";
const targetElevenLabsSpeed = numberValue(voiceSpeedOverride ?? process.env.JEFF_VOICE_SPEED) ?? 1;
const voiceSpeed =
  numberValue(voiceSpeedOverride) ??
  (voiceProvider === "11labs" && (numberValue(liveVoice.speed) ?? 1) < targetElevenLabsSpeed
    ? targetElevenLabsSpeed
    : numberValue(liveVoice.speed));
const voiceVersion = numberValue(voiceVersionOverride) ?? numberValue(liveVoice.version);
const voicePatch = {
  ...liveVoice,
  provider: voiceProvider,
  voiceId,
  ...(voiceSpeed ? { speed: voiceSpeed } : {}),
  ...(voiceProvider === "vapi" && voiceVersion ? { version: voiceVersion } : {}),
};
const patch = {
  firstMessage: desired.firstMessage,
  server: {
    ...(live.server || {}),
    url: desired.serverUrl,
    headers: {
      ...(live.server?.headers || {}),
      [desired.serverAuthHeader || "X-Vapi-Secret"]: toolSecret,
    },
  },
  serverMessages: live.serverMessages,
  startSpeakingPlan: desired.startSpeakingPlan,
  stopSpeakingPlan: desired.stopSpeakingPlan,
  model: {
    provider: "openai",
    model,
    messages: desired.model.messages,
    tools: desired.model.tools,
  },
  voice: {
    ...voicePatch,
  },
};

if (!apply) {
  console.log(JSON.stringify({
    dryRun: true,
    target: { assistantId, baseUrl, model, voiceProvider, voiceId, voiceSpeed, voiceVersion },
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
  }, null, 2));
  process.exit(0);
}

const updated = await fetchJson(`https://api.vapi.ai/assistant/${assistantId}`, {
  method: "PATCH",
  headers: {
    Authorization: `Bearer ${vapiApiKey}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify(patch),
});

const afterDiff = diffTools(updated.model?.tools, desired.model.tools);
if (updated.model?.model !== model) {
  throw new Error(`Vapi assistant model mismatch after patch: expected ${model}, got ${updated.model?.model}`);
}
if (updated.voice?.provider !== voiceProvider || updated.voice?.voiceId !== voiceId) {
  throw new Error("Vapi assistant voice mismatch after patch.");
}
if (voiceSpeed && updated.voice?.speed !== voiceSpeed) {
  throw new Error(`Vapi assistant voice speed mismatch after patch: expected ${voiceSpeed}, got ${updated.voice?.speed}`);
}
if (voiceProvider === "vapi" && voiceVersion && updated.voice?.version !== voiceVersion) {
  throw new Error(`Vapi assistant voice version mismatch after patch: expected ${voiceVersion}, got ${updated.voice?.version}`);
}
if (afterDiff.missing.length > 0 || afterDiff.extra.length > 0) {
  throw new Error(`Vapi assistant tool mismatch after patch: ${JSON.stringify(afterDiff)}`);
}

console.log(JSON.stringify({
  success: true,
  target: { assistantId, baseUrl, model, voiceProvider, voiceId, voiceSpeed, voiceVersion },
  before: {
    model: live.model?.model,
    voice: live.voice,
    toolCount: Array.isArray(live.model?.tools) ? live.model.tools.length : 0,
    missingTools: beforeDiff.missing,
    startSpeakingPlan: live.startSpeakingPlan,
    stopSpeakingPlan: live.stopSpeakingPlan,
  },
  after: safeAssistantSummary(updated),
}, null, 2));
