import "./load-local-env.mjs";

const baseUrl = (
  process.argv[2] ||
  process.env.NEXT_PUBLIC_APP_URL ||
  process.env.APP_URL ||
  "http://localhost:3000"
).replace(/\/$/, "");
const jobId = process.argv[3];
const secret = process.env.JEFF_FIELD_ASSISTANT_TOOL_SECRET || process.env.CRON_SECRET;

if (!secret) {
  throw new Error("Set JEFF_FIELD_ASSISTANT_TOOL_SECRET or CRON_SECRET before syncing Jeff's local mirror.");
}

const url = new URL(`${baseUrl}/api/al/wrenchready/jeff/sync`);
if (jobId) url.searchParams.set("jobId", jobId);

const response = await fetch(url, {
  headers: {
    Authorization: `Bearer ${secret}`,
  },
});
const text = await response.text();
let payload;

try {
  payload = JSON.parse(text);
} catch {
  throw new Error(`Jeff sync returned non-JSON: ${text.slice(0, 200)}`);
}

if (!response.ok) {
  throw new Error(`Jeff sync failed with ${response.status}: ${JSON.stringify(payload)}`);
}

console.log(JSON.stringify(payload, null, 2));
