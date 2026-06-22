import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function readText(path) {
  return readFileSync(resolve(ROOT, path), "utf8");
}

function optionalText(path) {
  const full = resolve(ROOT, path);
  return existsSync(full) ? readFileSync(full, "utf8") : "";
}

function envVal(key) {
  if (process.env[key]) return process.env[key].trim();
  const env = optionalText(".env.local");
  const match = env.match(new RegExp(`^\\s*${key}\\s*=\\s*(.*)$`, "m"));
  return match ? match[1].trim().replace(/^["']|["']$/g, "").trim() : "";
}

function add(checks, severity, title, detail) {
  checks.push({ severity, title, detail });
}

function codeContains(path, pattern) {
  return pattern.test(readText(path));
}

function gitCommit() {
  try {
    return execFileSync("git", ["rev-parse", "--short", "HEAD"], {
      cwd: ROOT,
      encoding: "utf8",
    }).trim();
  } catch {
    return "";
  }
}

function sameCommit(a, b) {
  if (!a || !b) return false;
  return a.startsWith(b) || b.startsWith(a);
}

function summarizeEval(checks) {
  const path = resolve(ROOT, "eval-jeff-results.json");
  if (!existsSync(path)) {
    add(checks, "warn", "No saved Jeff eval result found", "Run npm run eval:jeff -- --quick before the next live field session.");
    return;
  }

  const data = JSON.parse(readFileSync(path, "utf8"));
  const stat = statSync(path);
  const createdAt = Date.parse(data.createdAt || "") || stat.mtimeMs;
  const ageHours = Math.round((Date.now() - createdAt) / 36_000) / 100;
  const currentCommit = gitCommit();
  const resultCommit = typeof data.gitCommit === "string" ? data.gitCommit : "";
  const total = Number(data.total || 0);
  const goodCount = Number(data.goodCount || 0);
  const headlinePct = Number(data.headlinePct || 0);
  const diagTreePct = Number(data.diagTreeAccuracyPct || 0);

  if (!data.createdAt || !resultCommit) {
    add(
      checks,
      "warn",
      "Saved Jeff eval result lacks freshness metadata",
      "Re-run npm run eval:jeff -- --json after this change so the audit can verify timestamp and commit.",
    );
  } else if (ageHours > 36) {
    add(
      checks,
      "warn",
      "Saved Jeff eval result is stale",
      `Eval snapshot is ${ageHours} hours old. Re-run npm run eval:jeff -- --json before live field testing.`,
    );
  }

  if (currentCommit && resultCommit && !sameCommit(currentCommit, resultCommit)) {
    add(
      checks,
      "warn",
      "Saved Jeff eval result was generated on another commit",
      `eval=${resultCommit}; current=${currentCommit}. Re-run npm run eval:jeff -- --json for this code.`,
    );
  }

  if (total && headlinePct >= 80) {
    add(checks, "pass", "Saved Jeff eval is reasonably healthy", `${headlinePct}% good (${goodCount}/${total}).`);
  } else {
    add(
      checks,
      "warn",
      "Saved Jeff eval is still below live-confidence level",
      `${headlinePct || "unknown"}% good (${goodCount || "?"}/${total || "?"}); diag-tree ${diagTreePct || "unknown"}%. Use a narrow pilot, not open-ended field reliance.`,
    );
  }
}

function main() {
  const checks = [];

  const appChat = "src/lib/jeff-field-assistant/app-chat.ts";
  const tools = "src/lib/jeff-field-assistant/tools.ts";
  const vapiServer = "src/lib/jeff-field-assistant/vapi-server.ts";
  const usageModule = "src/lib/jeff-field-assistant/openai-usage.ts";
  const actionStateModule = "src/lib/jeff-field-assistant/action-state.ts";
  const proofLoopScript = "scripts/verify-jeff-single-job-proof-loop.mjs";

  if (existsSync(resolve(ROOT, usageModule))) {
    add(checks, "pass", "OpenAI usage module exists", usageModule);
  } else {
    add(checks, "blocker", "OpenAI usage module is missing", "Backend-owned OpenAI calls cannot be traced.");
  }

  if (existsSync(resolve(ROOT, actionStateModule)) && codeContains(appChat, /enforceJeffActionClaims/)) {
    add(checks, "pass", "Jeff action-state integrity layer exists", actionStateModule);
  } else {
    add(
      checks,
      "blocker",
      "Jeff action-state integrity layer is missing",
      "Tool outcomes need typed DRAFTED/SENT/BLOCKED/FAILED/VERIFIED states before live testing.",
    );
  }

  if (existsSync(resolve(ROOT, proofLoopScript))) {
    add(checks, "pass", "Single-job proof-loop verifier exists", proofLoopScript);
  } else {
    add(
      checks,
      "blocker",
      "Single-job proof-loop verifier is missing",
      "Jeff needs an executable one-job gate before expanding field testing.",
    );
  }

  if (codeContains(appChat, /recordOpenAiUsage/) && codeContains(appChat, /checkOpenAiBudget/)) {
    add(checks, "pass", "Message Jeff text calls are instrumented", appChat);
  } else {
    add(checks, "blocker", "Message Jeff text calls are not instrumented", appChat);
  }

  if (codeContains(tools, /field-photo-analysis/) && codeContains(tools, /session-photo-analysis/)) {
    add(checks, "pass", "Jeff photo analysis calls are instrumented", tools);
  } else {
    add(checks, "blocker", "Jeff photo analysis calls are not fully instrumented", tools);
  }

  if (codeContains(vapiServer, /hasUnsafeDriveReassurance/)) {
    add(checks, "pass", "Vapi transcript safety review avoids broad safe-to-drive false positives", vapiServer);
    add(
      checks,
      "warn",
      "Vapi transcript safety review remains heuristic",
      "Treat transcript flags as review prompts, not as proof that drivability guidance was safe.",
    );
  } else {
    add(checks, "warn", "Vapi transcript safety review may be stale", "Check for false positives on 'not safe to drive'.");
  }

  if (envVal("JEFF_OPENAI_DAILY_TOKEN_BUDGET") || envVal("JEFF_OPENAI_DAILY_CALL_BUDGET")) {
    add(
      checks,
      "pass",
      "Jeff OpenAI daily budget env is configured locally",
      `mode=${envVal("JEFF_OPENAI_BUDGET_MODE") || "warn"}`,
    );
  } else {
    add(
      checks,
      "blocker",
      "No local Jeff OpenAI daily budget is configured",
      "Set JEFF_OPENAI_DAILY_TOKEN_BUDGET or JEFF_OPENAI_DAILY_CALL_BUDGET before more live field testing.",
    );
  }

  if (
    (envVal("JEFF_OPENAI_DAILY_TOKEN_BUDGET") || envVal("JEFF_OPENAI_DAILY_CALL_BUDGET")) &&
    (envVal("JEFF_OPENAI_BUDGET_MODE") || "warn").toLowerCase() !== "block"
  ) {
    add(
      checks,
      "warn",
      "Jeff OpenAI budget is warn-only",
      "Use JEFF_OPENAI_BUDGET_MODE=block for a hard local cap during aggressive testing.",
    );
  }

  const textModel = envVal("JEFF_FIELD_TEXT_MODEL") || envVal("JEFF_FIELD_REASONING_MODEL") || "gpt-5.5";
  if (/mini|nano|small/i.test(textModel)) {
    add(checks, "pass", "Message Jeff text model is cost-conscious", textModel);
  } else {
    add(
      checks,
      "warn",
      "Message Jeff text model is quality-first and may be expensive",
      `${textModel}. Consider a cheaper default with escalation for hard diagnostic/spec cases.`,
    );
  }

  const vapiModel = envVal("VAPI_JEFF_OPENAI_MODEL") || "gpt-5.4-mini";
  if (/mini|nano|small/i.test(vapiModel)) {
    add(checks, "pass", "Vapi voice model target is cost-conscious", vapiModel);
  } else {
    add(checks, "warn", "Vapi voice model target may be expensive", vapiModel);
  }

  if (envVal("VAPI_JEFF_ASSISTANT_ID") && envVal("VAPI_JEFF_PHONE_NUMBER_ID") && envVal("JEFF_FIELD_ASSISTANT_TOOL_SECRET")) {
    add(checks, "pass", "Local Vapi live-call env looks complete", "assistant, phone number, and tool secret are present.");
  } else {
    add(
      checks,
      "warn",
      "Local Vapi live-call env is incomplete or only configured in Vercel",
      "Verify VAPI_JEFF_ASSISTANT_ID, VAPI_JEFF_PHONE_NUMBER_ID, and JEFF_FIELD_ASSISTANT_TOOL_SECRET before live voice testing.",
    );
  }

  if (envVal("JEFF_LOCAL_DATA_DIR")) {
    add(checks, "pass", "Jeff local data root is explicitly configured", "JEFF_LOCAL_DATA_DIR is set.");
  } else {
    add(
      checks,
      "warn",
      "Jeff pilot stores may be local/tmp depending on runtime",
      "Vehicle specs, usage logs, and pilot reviews are not durable production truth unless mirrored to a durable store.",
    );
  }

  add(
    checks,
    "warn",
    "Vapi voice model token/cost usage is not visible to this backend",
    "Backend can see Vapi tool calls and end-of-call reports, but Vapi/OpenAI voice token usage must be checked in Vapi/OpenAI dashboards until a Vapi usage feed is wired.",
  );

  summarizeEval(checks);

  const order = { blocker: 0, warn: 1, pass: 2 };
  checks.sort((a, b) => order[a.severity] - order[b.severity] || a.title.localeCompare(b.title));

  console.log("\nJeff live-readiness wiring audit");
  console.log("=".repeat(40));
  for (const check of checks) {
    const tag = check.severity === "blocker" ? "BLOCKER" : check.severity === "warn" ? "WARN" : "PASS";
    console.log(`[${tag}] ${check.title}`);
    console.log(`       ${check.detail}`);
  }

  const blockers = checks.filter((check) => check.severity === "blocker");
  const warnings = checks.filter((check) => check.severity === "warn");
  console.log("=".repeat(40));
  console.log(`Blockers: ${blockers.length} | Warnings: ${warnings.length} | Passes: ${checks.length - blockers.length - warnings.length}`);
  if (blockers.length) process.exitCode = 1;
}

main();
