import "./load-local-env.mjs";

const baseUrl = (process.argv[2] || "https://wrenchreadymobile.com").replace(/\/$/, "");
const opsUser = process.env.WR_OPS_AUTH_USER || "ops";
const opsPassword =
  process.env.WR_OPS_AUTH_PASSWORD ||
  process.env.WR_OPS_BASIC_PASSWORD ||
  process.env.JEFF_FIELD_ASSISTANT_TOOL_SECRET;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function basicAuth(username = opsUser, password = opsPassword) {
  assert(password, "WR_OPS_AUTH_PASSWORD, WR_OPS_BASIC_PASSWORD, or JEFF_FIELD_ASSISTANT_TOOL_SECRET is required.");
  return `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`;
}

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, options);
  const text = await response.text();
  return {
    path,
    status: response.status,
    contentType: response.headers.get("content-type") || "",
    text,
  };
}

function redTeamCount(text) {
  return (text.match(/Red Team|red-team|jeff-fixture|mock customer/gi) || []).length;
}

const protectedOpsPaths = [
  "/ops/promises",
  "/api/al/wrenchready/alert-proof",
  "/api/al/wrenchready/dispatch",
  "/api/al/wrenchready/follow-through",
  "/api/al/wrenchready/inbound",
  "/api/al/wrenchready/inbound/security-probe",
  "/api/al/wrenchready/integrations",
  "/api/al/wrenchready/outbound",
  "/api/al/wrenchready/owners/Simon",
  "/api/al/wrenchready/persistence-proof",
  "/api/al/wrenchready/promises",
  "/api/al/wrenchready/promises/security-probe",
  "/api/al/wrenchready/promises/security-probe/checkout-link",
  "/api/al/wrenchready/promises/security-probe/outbound",
  "/api/al/wrenchready/systems",
  "/api/al/wrenchready/tomorrow",
];

const publicToolGuardPaths = [
  "/api/al/wrenchready/jeff/tools",
  "/api/al/wrenchready/jeff/sync",
];

const protectedResults = [];
for (const path of protectedOpsPaths) {
  const result = await request(path);
  protectedResults.push({ path, status: result.status, contentType: result.contentType });
  assert(result.status === 401, `${path} should reject unauthenticated requests; got ${result.status}.`);
  assert(redTeamCount(result.text) === 0, `${path} leaked test/fixture text while unauthenticated.`);
  assert(!/Tammy|Kendra|Stuart|Chris|Kasha|Simon|Dez/i.test(result.text), `${path} leaked likely CRM data while unauthenticated.`);
}

for (const path of publicToolGuardPaths) {
  const result = await request(path);
  assert(result.status === 401, `${path} should reject unauthenticated tool requests; got ${result.status}.`);
}

if (process.env.WR_OPS_AUTH_USER && opsPassword) {
  const wrongUser = await request("/api/al/wrenchready/promises", {
    headers: { Authorization: basicAuth("wrong-user") },
  });
  assert(wrongUser.status === 401, "Promise CRM API should reject correct password with wrong username.");
}

const authenticatedQueue = await request("/api/al/wrenchready/promises", {
  headers: { Authorization: basicAuth() },
});
assert(authenticatedQueue.status === 200, `Authenticated Promise CRM API should work; got ${authenticatedQueue.status}.`);
assert(authenticatedQueue.contentType.includes("application/json"), "Authenticated Promise CRM API should return JSON.");

let queueJson;
try {
  queueJson = JSON.parse(authenticatedQueue.text);
} catch {
  throw new Error("Authenticated Promise CRM API returned invalid JSON.");
}

const queue = [
  ...(queueJson.inbound || []),
  ...(queueJson.promisesWaiting || []),
  ...(queueJson.tomorrowAtRisk || []),
  ...(queueJson.followThroughDue || []),
];

assert(queueJson.success === true, "Authenticated Promise CRM API should return success=true.");
assert(redTeamCount(authenticatedQueue.text) === 0, "Authenticated Promise CRM queue should not contain red-team or fixture records.");

const authenticatedOps = await request("/ops/promises", {
  headers: { Authorization: basicAuth() },
});
assert(authenticatedOps.status === 200, `Authenticated ops page should render; got ${authenticatedOps.status}.`);
assert(redTeamCount(authenticatedOps.text) === 0, "Authenticated ops page should not contain red-team or fixture records.");

console.log(JSON.stringify({
  success: true,
  baseUrl,
  protectedUnauthenticated: protectedResults.length,
  authenticatedQueueRecords: queue.length,
  publicToolGuards: publicToolGuardPaths.length,
}, null, 2));
