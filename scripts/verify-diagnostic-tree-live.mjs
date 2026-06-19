#!/usr/bin/env node

import "./load-local-env.mjs";

const baseUrl = (
  process.argv[2] ||
  process.env.WRENCHREADY_FIELD_LIVE_BASE_URL ||
  "http://localhost:3000"
).replace(/\/$/, "");
const explicitPromiseId = process.argv[3] || process.env.WRENCHREADY_FIELD_LIVE_PROMISE_ID;
const opsUser = process.env.WR_OPS_AUTH_USER || "ops";
const opsPassword =
  process.env.WR_OPS_AUTH_PASSWORD ||
  process.env.WR_OPS_BASIC_PASSWORD ||
  process.env.JEFF_FIELD_ASSISTANT_TOOL_SECRET;
const toolSecret = process.env.JEFF_FIELD_ASSISTANT_TOOL_SECRET;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function basicAuth() {
  assert(
    opsPassword,
    "WR_OPS_AUTH_PASSWORD, WR_OPS_BASIC_PASSWORD, or JEFF_FIELD_ASSISTANT_TOOL_SECRET is required.",
  );
  return `Basic ${Buffer.from(`${opsUser}:${opsPassword}`).toString("base64")}`;
}

function toolHeaders() {
  assert(toolSecret, "JEFF_FIELD_ASSISTANT_TOOL_SECRET is required.");
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${toolSecret}`,
  };
}

async function requestText(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, options);
  const text = await response.text();

  return {
    response,
    text,
  };
}

async function requestJson(path, options = {}) {
  const { response, text } = await requestText(path, options);
  let json;

  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`${path} returned non-JSON: ${text.slice(0, 200)}`);
  }

  return {
    response,
    json,
  };
}

function promiseQueueRecords(queue) {
  return [
    ...(queue.promisesWaiting || []),
    ...(queue.tomorrowAtRisk || []),
    ...(queue.followThroughDue || []),
  ];
}

function fieldPacketIsUseful(record) {
  const packet = record?.fieldExecution;
  if (!packet) return false;

  return Boolean(
    packet.diagnosticTree?.length ||
      packet.mfgSpecs?.length ||
      packet.serviceDataChecks?.length ||
      packet.inspectionChecklist?.length,
  );
}

function choosePromise(records) {
  if (explicitPromiseId) {
    return records.find((record) => record.id === explicitPromiseId) || { id: explicitPromiseId };
  }

  return records.find(fieldPacketIsUseful) || records[0];
}

const unauthenticatedApi = await requestJson("/api/al/wrenchready/promises");
assert(
  unauthenticatedApi.response.status === 401,
  `Promise API should reject unauthenticated live checks; got ${unauthenticatedApi.response.status}.`,
);

const { response: queueResponse, json: queue } = await requestJson("/api/al/wrenchready/promises", {
  headers: {
    Authorization: basicAuth(),
  },
});
assert(queueResponse.ok, `Authenticated Promise queue should load; got ${queueResponse.status}.`);
assert(queue.success === true, "Authenticated Promise queue should return success=true.");

const records = promiseQueueRecords(queue);
assert(
  records.length > 0 || explicitPromiseId,
  "No Promise CRM records were available. Set WRENCHREADY_FIELD_LIVE_PROMISE_ID to verify a specific record.",
);

const selected = choosePromise(records);
assert(selected?.id, "A Promise CRM record id is required for diagnostic-tree verification.");

const detailPath = `/api/al/wrenchready/promises/${selected.id}`;
const { response: detailResponse, json: detail } = await requestJson(detailPath, {
  headers: {
    Authorization: basicAuth(),
  },
});
assert(detailResponse.ok, `Promise detail should load for ${selected.id}; got ${detailResponse.status}.`);
assert(detail.promise?.id === selected.id, "Promise detail should return the selected record.");
assert(detail.promise?.updatedAt, "Promise detail should expose updatedAt for live-status polling.");
assert(
  fieldPacketIsUseful(detail.promise),
  "Selected Promise record needs a field packet with diagnostic tree, mfg specs, service-data checks, or inspection steps.",
);
const capturedMfgSpecs = detail.promise.fieldExecution?.mfgSpecs?.length || 0;
const capturedServiceDataChecks = detail.promise.fieldExecution?.serviceDataChecks?.length || 0;

const opsPath = `/ops/promises/${selected.id}`;
const unauthenticatedOps = await requestText(opsPath);
assert(
  unauthenticatedOps.response.status === 401,
  `Ops Promise detail should reject unauthenticated access; got ${unauthenticatedOps.response.status}.`,
);

const { response: opsResponse, text: opsHtml } = await requestText(opsPath, {
  headers: {
    Authorization: basicAuth(),
  },
});
assert(opsResponse.ok, `Ops Promise detail should render; got ${opsResponse.status}.`);

for (const requiredText of [
  "Diagnostic tree",
  "Field diagnostics",
  "Source status",
  "source gates",
  "Ask Jeff",
  "Upload Proof",
  "OEM1Stop",
  "Live record current",
  `/jeff/messages?jobId=${selected.id}`,
  `/jeff/photo-drop?jobId=${selected.id}`,
]) {
  assert(opsHtml.includes(requiredText), `Ops Promise page should include ${requiredText}.`);
}

const { response: catalogResponse, json: catalog } = await requestJson("/api/al/wrenchready/jeff/tools", {
  headers: toolHeaders(),
});
assert(catalogResponse.ok, `Jeff tool catalog should load; got ${catalogResponse.status}.`);
const toolNames = catalog.assistant?.tools?.map((tool) => tool.name) || [];
assert(toolNames.includes("get_diagnostic_tree"), "Jeff tool catalog should expose get_diagnostic_tree.");

const { response: treeResponse, json: tree } = await requestJson(
  "/api/al/wrenchready/jeff/tools/get-diagnostic-tree",
  {
    method: "POST",
    headers: toolHeaders(),
    body: JSON.stringify({ jobId: selected.id }),
  },
);
assert(treeResponse.ok, `get_diagnostic_tree should return 200; got ${treeResponse.status}.`);
assert(tree.success === true, "get_diagnostic_tree should succeed for the selected Promise record.");
assert(
  tree.data?.fieldPageUrl?.includes(`/ops/promises/${selected.id}#diagnostic-tree`),
  "Diagnostic tree tool should return the mobile field-page anchor.",
);
assert(
  tree.data?.diagnosticTree?.steps?.length >= 2,
  "Diagnostic tree tool should return multiple field steps.",
);
assert(
  tree.data?.diagnosticTree?.sourceGates?.length >= 1,
  "Diagnostic tree tool should return source/stop gates.",
);
assert(
  tree.data?.diagnosticTree?.sourceCounts?.["licensed-source-required"] >= 1,
  "Diagnostic tree tool should flag licensed/OEM source requirements.",
);
if (capturedMfgSpecs === 0) {
  assert(
    tree.data?.diagnosticTree?.sourceGates?.some((gate) => /Manufacturer specs required/i.test(gate)),
    "Diagnostic tree should explicitly gate missing manufacturer specs.",
  );
}
if (capturedServiceDataChecks === 0) {
  assert(
    tree.data?.diagnosticTree?.sourceGates?.some((gate) => /Service data check required/i.test(gate)),
    "Diagnostic tree should explicitly gate missing service-data checks.",
  );
}
assert(
  tree.assistantSay && !tree.assistantSay.includes(".."),
  "Diagnostic tree spoken summary should avoid malformed punctuation.",
);

console.log(JSON.stringify({
  success: true,
  baseUrl,
  promiseId: selected.id,
  customer: detail.promise.customer?.name,
  updatedAt: detail.promise.updatedAt,
  diagnosticSteps: tree.data.diagnosticTree.steps.length,
  sourceGates: tree.data.diagnosticTree.sourceGates.length,
  licensedSourceRequired: tree.data.diagnosticTree.sourceCounts["licensed-source-required"],
  capturedMfgSpecs,
  capturedServiceDataChecks,
}, null, 2));
