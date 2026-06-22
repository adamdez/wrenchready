import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { readEnv } from "@/lib/env";
import {
  getJeffLocalDataPath,
  getJeffLocalDataRootStatus,
} from "@/lib/jeff-field-assistant/local-data";

export type JeffOpenAiUsageChannel =
  | "jeff-text"
  | "jeff-vision"
  | "jeff-eval"
  | "jeff-voice-vapi"
  | "unknown";

export type JeffOpenAiUsageStatus = "success" | "error" | "blocked";

export type JeffOpenAiTokenUsage = {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
};

export type JeffOpenAiUsageRecord = JeffOpenAiTokenUsage & {
  id: string;
  createdAt: string;
  day: string;
  channel: JeffOpenAiUsageChannel;
  purpose: string;
  model: string;
  status: JeffOpenAiUsageStatus;
  requestId?: string;
  responseId?: string;
  estimatedInputTokens?: number;
  estimatedOutputTokens?: number;
  conversationId?: string;
  jobId?: string;
  callId?: string;
  warning?: string;
  metadata?: Record<string, unknown>;
};

export type JeffOpenAiBudgetCheck = {
  allowed: boolean;
  mode: "off" | "warn" | "block";
  warnings: string[];
  storage: ReturnType<typeof getJeffLocalDataRootStatus>;
  usageToday: {
    day: string;
    calls: number;
    tokens: number;
  };
  budget: {
    tokenBudget?: number;
    callBudget?: number;
    warnRatio: number;
  };
};

const LOCAL_USAGE_FILE = getJeffLocalDataPath("openai-usage.json");
const MAX_USAGE_RECORDS = 5000;

function nowIso() {
  return new Date().toISOString();
}

function dayKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function makeId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function numberValue(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function envNumber(key: string) {
  const value = Number(readEnv(key));
  return Number.isFinite(value) && value > 0 ? value : undefined;
}

function envWarnRatio() {
  const value = Number(readEnv("JEFF_OPENAI_WARN_RATIO"));
  if (!Number.isFinite(value) || value <= 0 || value >= 1) return 0.8;
  return value;
}

function budgetMode() {
  const value = readEnv("JEFF_OPENAI_BUDGET_MODE")?.toLowerCase();
  if (value === "block") return "block" as const;
  if (value === "warn") return "warn" as const;
  return "warn" as const;
}

function actualOrEstimatedTokens(record: JeffOpenAiUsageRecord) {
  return (
    record.totalTokens ??
    ((record.inputTokens ?? record.estimatedInputTokens ?? 0) +
      (record.outputTokens ?? record.estimatedOutputTokens ?? 0))
  );
}

async function readUsageRecords(): Promise<JeffOpenAiUsageRecord[]> {
  try {
    const parsed = JSON.parse(await readFile(LOCAL_USAGE_FILE, "utf8"));
    if (!Array.isArray(parsed?.records)) return [];
    return parsed.records.filter((record: unknown): record is JeffOpenAiUsageRecord => {
      return isObject(record) && typeof record.id === "string" && typeof record.createdAt === "string";
    });
  } catch {
    return [];
  }
}

async function writeUsageRecords(records: JeffOpenAiUsageRecord[]) {
  const sorted = records
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, MAX_USAGE_RECORDS);
  const dir = path.dirname(LOCAL_USAGE_FILE);
  const tmp = path.join(dir, `.openai-usage-${process.pid}-${Date.now()}.tmp`);
  await mkdir(dir, { recursive: true });
  await writeFile(tmp, JSON.stringify({ records: sorted }, null, 2));
  await rename(tmp, LOCAL_USAGE_FILE);
}

function summarizeDay(records: JeffOpenAiUsageRecord[], day = dayKey()) {
  const today = records.filter((record) => record.day === day && record.status !== "blocked");
  return {
    day,
    calls: today.length,
    tokens: today.reduce((total, record) => total + actualOrEstimatedTokens(record), 0),
  };
}

export function extractOpenAiTokenUsage(responseBody: unknown): JeffOpenAiTokenUsage {
  if (!isObject(responseBody) || !isObject(responseBody.usage)) return {};
  return {
    inputTokens: numberValue(responseBody.usage.input_tokens),
    outputTokens: numberValue(responseBody.usage.output_tokens),
    totalTokens: numberValue(responseBody.usage.total_tokens),
  };
}

function estimateTokenText(value: unknown): string {
  if (typeof value === "string") {
    if (value.startsWith("data:image/")) return "[image data]";
    if (value.length > 500 && /^https?:\/\//i.test(value)) return "[url]";
    return value;
  }
  if (Array.isArray(value)) return value.map(estimateTokenText).join("\n");
  if (!isObject(value)) return "";

  return Object.entries(value)
    .map(([key, entry]) => {
      if (key === "image_url") return "[image input]";
      if (key === "url" && typeof entry === "string" && entry.startsWith("data:image/")) return "[image data]";
      return estimateTokenText(entry);
    })
    .filter(Boolean)
    .join("\n");
}

export function estimateOpenAiRequestTokens(requestBody: unknown) {
  return Math.ceil(estimateTokenText(requestBody).length / 4);
}

export async function checkOpenAiBudget(input: {
  channel: JeffOpenAiUsageChannel;
  purpose: string;
  model: string;
  estimatedInputTokens?: number;
  estimatedOutputTokens?: number;
}): Promise<JeffOpenAiBudgetCheck> {
  const tokenBudget = envNumber("JEFF_OPENAI_DAILY_TOKEN_BUDGET");
  const callBudget = envNumber("JEFF_OPENAI_DAILY_CALL_BUDGET");
  const warnRatio = envWarnRatio();
  const mode = tokenBudget || callBudget ? budgetMode() : "off";
  const records = await readUsageRecords();
  const usageToday = summarizeDay(records);
  const predictedTokens =
    usageToday.tokens + (input.estimatedInputTokens ?? 0) + (input.estimatedOutputTokens ?? 0);
  const predictedCalls = usageToday.calls + 1;
  const warnings: string[] = [];
  const blockReasons: string[] = [];

  if (tokenBudget && usageToday.tokens >= tokenBudget * warnRatio) {
    warnings.push(`Jeff OpenAI usage is at ${usageToday.tokens}/${tokenBudget} tokens today.`);
  }
  if (callBudget && usageToday.calls >= callBudget * warnRatio) {
    warnings.push(`Jeff OpenAI usage is at ${usageToday.calls}/${callBudget} calls today.`);
  }
  if (tokenBudget && predictedTokens > tokenBudget) {
    const message = `This ${input.channel} ${input.purpose} call may exceed today's Jeff OpenAI token budget (${predictedTokens}/${tokenBudget}).`;
    warnings.push(message);
    blockReasons.push(message);
  }
  if (callBudget && predictedCalls > callBudget) {
    const message = `This ${input.channel} ${input.purpose} call may exceed today's Jeff OpenAI call budget (${predictedCalls}/${callBudget}).`;
    warnings.push(message);
    blockReasons.push(message);
  }

  return {
    allowed: mode !== "block" || blockReasons.length === 0,
    mode,
    warnings,
    storage: getJeffLocalDataRootStatus(),
    usageToday,
    budget: {
      tokenBudget,
      callBudget,
      warnRatio,
    },
  };
}

export async function recordOpenAiUsage(input: {
  channel: JeffOpenAiUsageChannel;
  purpose: string;
  model: string;
  status: JeffOpenAiUsageStatus;
  usage?: JeffOpenAiTokenUsage;
  estimatedInputTokens?: number;
  estimatedOutputTokens?: number;
  requestId?: string;
  responseId?: string;
  conversationId?: string;
  jobId?: string;
  callId?: string;
  warning?: string;
  metadata?: Record<string, unknown>;
}): Promise<{ record: JeffOpenAiUsageRecord; warning?: string }> {
  const record: JeffOpenAiUsageRecord = {
    id: makeId("jeff-openai-usage"),
    createdAt: nowIso(),
    day: dayKey(),
    channel: input.channel,
    purpose: input.purpose,
    model: input.model,
    status: input.status,
    inputTokens: input.usage?.inputTokens,
    outputTokens: input.usage?.outputTokens,
    totalTokens: input.usage?.totalTokens,
    estimatedInputTokens: input.estimatedInputTokens,
    estimatedOutputTokens: input.estimatedOutputTokens,
    requestId: input.requestId,
    responseId: input.responseId,
    conversationId: input.conversationId,
    jobId: input.jobId,
    callId: input.callId,
    warning: input.warning,
    metadata: input.metadata,
  };

  try {
    const records = await readUsageRecords();
    await writeUsageRecords([record, ...records]);
    return { record };
  } catch (error) {
    return {
      record,
      warning: error instanceof Error ? error.message : "Jeff OpenAI usage logging failed.",
    };
  }
}

export function summarizeOpenAiUsage(record?: JeffOpenAiUsageRecord) {
  if (!record) return undefined;
  return {
    id: record.id,
    createdAt: record.createdAt,
    channel: record.channel,
    purpose: record.purpose,
    model: record.model,
    status: record.status,
    inputTokens: record.inputTokens,
    outputTokens: record.outputTokens,
    totalTokens: record.totalTokens,
    estimatedInputTokens: record.estimatedInputTokens,
    estimatedOutputTokens: record.estimatedOutputTokens,
  };
}

export function summarizeOpenAiBudget(check?: JeffOpenAiBudgetCheck) {
  if (!check) return undefined;
  return {
    mode: check.mode,
    warnings: check.warnings,
    usageToday: check.usageToday,
    budget: check.budget,
    storage: check.storage,
  };
}
