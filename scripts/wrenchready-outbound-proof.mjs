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
    limit: 10,
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
      args[key] = key === "limit" ? Number(argv[index + 1]) : argv[index + 1];
      index += 1;
    }
  }

  return args;
}

async function fetchOutboundSnapshot(baseUrl) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(new URL("/api/al/wrenchready/outbound", baseUrl), {
      signal: controller.signal,
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(body.error || `Outbound proof request failed with HTTP ${response.status}.`);
    }
    return body;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`Outbound proof request timed out after ${REQUEST_TIMEOUT_MS / 1000}s.`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function itemLine(item) {
  return [
    `- ${item.channelType} / ${item.status} / ${item.transport?.mode || "unknown"}: ${item.customerName} - ${item.headline}`,
    `  Next: ${item.transport?.nextStep || item.reason}`,
  ].join("\n");
}

function formatMarkdown(snapshot, limit) {
  const items = Array.isArray(snapshot.items) ? snapshot.items : [];
  const shown = items.slice(0, limit);
  const summary = snapshot.summary || {};

  return [
    "# WrenchReady Outbound Proof",
    "",
    `Generated: ${snapshot.generatedAt || new Date().toISOString()}`,
    "",
    "## Queue Summary",
    "",
    `- total: ${summary.total ?? items.length}`,
    `- send-ready: ${summary.sendReady ?? 0}`,
    `- draft-only: ${summary.draftOnly ?? 0}`,
    `- held: ${summary.held ?? 0}`,
    `- recap-ready: ${summary.recapReady ?? 0}`,
    `- review-ready: ${summary.reviewReady ?? 0}`,
    `- reminder-ready: ${summary.reminderReady ?? 0}`,
    `- delivered-today: ${summary.deliveredToday ?? 0}`,
    `- responded: ${summary.responded ?? 0}`,
    `- converted: ${summary.converted ?? 0}`,
    `- failed: ${summary.failed ?? 0}`,
    "",
    "## Draft Queue",
    "",
    ...(shown.length ? shown.map(itemLine) : ["- none"]),
    items.length > shown.length ? `\nShowing ${shown.length} of ${items.length} outbound items.` : "",
    "",
    "External action rule: this proof is read-only. It calls only GET /api/al/wrenchready/outbound and does not send customer messages, send review requests, create payment requests, update records, or fire webhooks.",
    "",
  ].join("\n");
}

const args = parseArgs(process.argv.slice(2));

try {
  const snapshot = await fetchOutboundSnapshot(args.baseUrl);
  const output =
    args.format === "json"
      ? `${JSON.stringify(snapshot, null, 2)}\n`
      : formatMarkdown(snapshot, args.limit);
  if (args.output) {
    fs.writeFileSync(args.output, output, "utf8");
  } else {
    process.stdout.write(output);
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
