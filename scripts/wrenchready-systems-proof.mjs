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

async function fetchSystems(baseUrl) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(new URL("/api/al/wrenchready/systems", baseUrl), {
      signal: controller.signal,
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(body.error || `Systems proof request failed with HTTP ${response.status}.`);
    }
    return body.systems ?? body;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`Systems proof request timed out after ${REQUEST_TIMEOUT_MS / 1000}s.`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function systemLine(item) {
  return `- ${item.status.toUpperCase()} ${item.name}: ${item.summary} Next: ${item.nextStep}`;
}

function formatMarkdown(snapshot) {
  return [
    "# WrenchReady Systems Proof",
    "",
    `Generated: ${snapshot.generatedAt}`,
    "",
    "## Needs Now",
    "",
    ...(snapshot.needsNow.length ? snapshot.needsNow.map(systemLine) : ["- none"]),
    "",
    "## Needs Soon",
    "",
    ...(snapshot.needsSoon.length ? snapshot.needsSoon.map(systemLine) : ["- none"]),
    "",
    "## All Systems",
    "",
    ...snapshot.systems.map(systemLine),
    "",
    "External action rule: this proof is read-only. It does not send alerts, review asks, customer messages, payment requests, or webhook events.",
    "",
  ].join("\n");
}

loadEnvFile(".env.local");
loadEnvFile(".env.production.local");

const args = parseArgs(process.argv.slice(2));

try {
  const snapshot = await fetchSystems(args.baseUrl);
  const output = args.format === "json" ? `${JSON.stringify(snapshot, null, 2)}\n` : formatMarkdown(snapshot);
  if (args.output) {
    fs.writeFileSync(args.output, output, "utf8");
  } else {
    process.stdout.write(output);
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
