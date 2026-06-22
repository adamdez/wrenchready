import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function readText(path) {
  return readFileSync(resolve(ROOT, path), "utf8");
}

function add(checks, severity, title, detail) {
  checks.push({ severity, title, detail });
}

function contains(path, pattern) {
  return pattern.test(readText(path));
}

function main() {
  const checks = [];
  const modulePath = "src/lib/jeff-field-assistant/action-state.ts";
  const typesPath = "src/lib/jeff-field-assistant/types.ts";
  const toolsPath = "src/lib/jeff-field-assistant/tools.ts";
  const appChatPath = "src/lib/jeff-field-assistant/app-chat.ts";
  const vapiPath = "src/lib/jeff-field-assistant/vapi-server.ts";

  if (existsSync(resolve(ROOT, modulePath))) {
    add(checks, "pass", "Action-state module exists", modulePath);
  } else {
    add(checks, "blocker", "Action-state module is missing", "Jeff tool outcomes can drift back to free-text status.");
  }

  if (contains(typesPath, /actionState:\s*JeffActionStateSnapshot/)) {
    add(checks, "pass", "JeffToolResult requires typed actionState", typesPath);
  } else {
    add(checks, "blocker", "JeffToolResult does not require actionState", "Tool results need a typed state contract.");
  }

  if (
    contains(toolsPath, /makeJeffActionState/) &&
    contains(toolsPath, /function result<[\s\S]+actionState:/) &&
    contains(toolsPath, /function blocked<[\s\S]+actionState:/)
  ) {
    add(checks, "pass", "Tool result helpers stamp actionState", toolsPath);
  } else {
    add(checks, "blocker", "Tool result helpers do not stamp actionState", "Every helper-produced result should carry DRAFTED/SENT/BLOCKED/FAILED/VERIFIED.");
  }

  if (contains(appChatPath, /enforceJeffActionClaims/) && contains(appChatPath, /describeJeffActionState/)) {
    add(checks, "pass", "Message Jeff renders and guards action states", appChatPath);
  } else {
    add(checks, "blocker", "Message Jeff is not action-state guarded", "Assistant replies could claim sent/booked/charged without backend state.");
  }

  if (contains(vapiPath, /makeJeffActionState/) && contains(vapiPath, /unknown_tool/) && contains(vapiPath, /actionState:/)) {
    add(checks, "pass", "Vapi tool failure path includes actionState", vapiPath);
  } else {
    add(checks, "warn", "Vapi tool failure path may lack actionState", "Voice tools should also return typed failure/blocked states.");
  }

  if (contains(modulePath, /sent|booked|charged|ordered|reserved/) && contains(modulePath, /findUnsupportedJeffActionClaims/)) {
    add(checks, "pass", "Unsupported action-claim scanner is present", modulePath);
  } else {
    add(checks, "warn", "Unsupported action-claim scanner is missing or weak", "Jeff should not be able to free-text risky action claims.");
  }

  const order = { blocker: 0, warn: 1, pass: 2 };
  checks.sort((a, b) => order[a.severity] - order[b.severity] || a.title.localeCompare(b.title));

  console.log("\nJeff action-state integrity audit");
  console.log("=".repeat(42));
  for (const check of checks) {
    const tag = check.severity === "blocker" ? "BLOCKER" : check.severity === "warn" ? "WARN" : "PASS";
    console.log(`[${tag}] ${check.title}`);
    console.log(`       ${check.detail}`);
  }

  const blockers = checks.filter((check) => check.severity === "blocker");
  const warnings = checks.filter((check) => check.severity === "warn");
  console.log("=".repeat(42));
  console.log(`Blockers: ${blockers.length} | Warnings: ${warnings.length} | Passes: ${checks.length - blockers.length - warnings.length}`);
  if (blockers.length) process.exitCode = 1;
}

main();
