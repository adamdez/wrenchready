#!/usr/bin/env node

import fs from "node:fs";
import process from "node:process";

const REQUEST_TIMEOUT_MS = 15000;

function loadEnvFile(path) {
  if (!fs.existsSync(path)) return;
  for (const line of fs.readFileSync(path, "utf8").split(/\r?\n/)) {
    if (!line.trim() || line.trim().startsWith("#")) continue;
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match) continue;
    let value = match[2].trim();
    if (
      (value.startsWith("\"") && value.endsWith("\"")) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[match[1]] ??= value;
  }
}

function parseArgs(argv) {
  const args = {
    baseUrl:
      process.env.WRENCHREADY_BASE_URL ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      "https://www.wrenchreadymobile.com",
    format: "markdown",
    output: "",
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--json") {
      args.format = "json";
      continue;
    }
    if (arg === "--markdown") {
      args.format = "markdown";
      continue;
    }
    if (arg.startsWith("--") && index + 1 < argv.length) {
      const key = arg.slice(2).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
      args[key] = argv[index + 1];
      index += 1;
    }
  }

  return args;
}

async function fetchProof(baseUrl) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(new URL("/api/al/wrenchready/persistence-proof", baseUrl), {
      signal: controller.signal,
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(body.error || `Persistence proof request failed with HTTP ${response.status}.`);
    }
    return body.proof ?? body;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`Persistence proof request timed out after ${REQUEST_TIMEOUT_MS / 1000}s.`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function checkLine(check) {
  return `- ${check.ok ? "PASS" : "REVIEW"} ${check.name}: ${check.detail}`;
}

function tableLine(table) {
  return `- ${table.reachable ? "PASS" : "REVIEW"} ${table.table}: ${
    table.reachable ? `reachable, sample rows ${table.sampleRows}` : table.error || "not reachable"
  }`;
}

function formatMarkdown(proof) {
  return [
    "# WrenchReady Promise CRM Persistence Proof",
    "",
    `Generated: ${proof.generatedAt}`,
    `Mode: ${proof.mode}`,
    `Project host: ${proof.projectHost || "missing"}`,
    `Credential kind: ${proof.credentialKind}`,
    `Write credential ready: ${proof.writeCredentialReady ? "yes" : "no"}`,
    "",
    "## Summary",
    "",
    proof.summary,
    "",
    "## Checks",
    "",
    ...proof.proofChecks.map(checkLine),
    "",
    "## Tables",
    "",
    ...(proof.tableProof.length ? proof.tableProof.map(tableLine) : ["- no table checks ran"]),
    "",
    "## Next Safest Action",
    "",
    `- ${proof.nextSafestAction}`,
    "",
    proof.externalActionRule,
    "",
  ].join("\n");
}

loadEnvFile(".env.local");
loadEnvFile(".env.production.local");

const args = parseArgs(process.argv.slice(2));

try {
  const proof = await fetchProof(args.baseUrl);
  const output = args.format === "json" ? `${JSON.stringify(proof, null, 2)}\n` : formatMarkdown(proof);
  if (args.output) {
    fs.writeFileSync(args.output, output, "utf8");
  } else {
    process.stdout.write(output);
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
