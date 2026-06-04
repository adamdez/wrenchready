#!/usr/bin/env node

import fs from "node:fs";
import process from "node:process";

const REQUEST_TIMEOUT_MS = 15000;

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

async function fetchAlertProof(baseUrl) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(new URL("/api/al/wrenchready/alert-proof", baseUrl), {
      signal: controller.signal,
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(body.error || `Alert proof request failed with HTTP ${response.status}.`);
    }
    return body.alertProof ?? body;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`Alert proof request timed out after ${REQUEST_TIMEOUT_MS / 1000}s.`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function formatMarkdown(snapshot) {
  return [
    "# WrenchReady Alert Proof",
    "",
    `Generated: ${snapshot.generatedAt}`,
    "",
    "## Delivery State",
    "",
    `- Slack: ${snapshot.deliveryState.slackConfigured ? "configured" : "held"} - ${snapshot.deliveryState.slackSummary}`,
    `- SMS: ${snapshot.deliveryState.smsConfigured ? "configured" : "held"} - ${snapshot.deliveryState.smsSummary}`,
    "",
    "## Proof Checks",
    "",
    ...snapshot.proofChecks.map((check) => `- ${check.ok ? "OK" : "CHECK"} ${check.name}: ${check.detail}`),
    "",
    "## Sample Alert Text",
    "",
    ...snapshot.samples.flatMap((sample) => [
      `### ${sample.name}`,
      "",
      "```text",
      sample.text || "No alert text generated.",
      "```",
      "",
    ]),
    "## Next Safest Action",
    "",
    snapshot.nextSafestAction,
    "",
    snapshot.externalActionRule,
    "",
  ].join("\n");
}

const args = parseArgs(process.argv.slice(2));

try {
  const snapshot = await fetchAlertProof(args.baseUrl);
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
