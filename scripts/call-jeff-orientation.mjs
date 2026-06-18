import "./load-local-env.mjs";

const args = process.argv.slice(2);

function argValue(name, fallback) {
  const prefix = `${name}=`;
  const entry = args.find((arg) => arg.startsWith(prefix));
  if (entry) return entry.slice(prefix.length);
  const index = args.indexOf(name);
  if (index >= 0 && args[index + 1]) return args[index + 1];
  return fallback;
}

const baseUrl = (argValue("--base-url", process.env.NEXT_PUBLIC_APP_URL || "https://wrenchreadymobile.com") || "")
  .replace(/\/$/, "");
const phoneNumber = argValue("--phone", "");
const recipientName = argValue("--name", "");
const dryRun = args.includes("--dry-run");
const secret = process.env.JEFF_FIELD_ASSISTANT_TOOL_SECRET;

if (!baseUrl) throw new Error("--base-url or NEXT_PUBLIC_APP_URL is required.");
if (!phoneNumber) throw new Error("--phone is required.");
if (!secret) throw new Error("JEFF_FIELD_ASSISTANT_TOOL_SECRET is required.");

const response = await fetch(`${baseUrl}/api/al/wrenchready/jeff/orientation-call`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${secret}`,
  },
  body: JSON.stringify({
    phoneNumber,
    recipientName,
    dryRun,
  }),
});

const text = await response.text();
let json;
try {
  json = text ? JSON.parse(text) : {};
} catch {
  throw new Error(`Orientation call endpoint returned non-JSON: ${text.slice(0, 500)}`);
}

if (!response.ok || json.success === false) {
  throw new Error(`Orientation call failed: ${response.status} ${JSON.stringify(json, null, 2)}`);
}

console.log(JSON.stringify(json, null, 2));
