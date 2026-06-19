import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) return;

  for (const line of readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const separator = trimmed.indexOf("=");
    if (separator <= 0) continue;

    const key = trimmed.slice(0, separator).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key) || process.env[key] !== undefined) continue;

    let value = trimmed.slice(separator + 1).trim();
    const quote = value[0];
    if ((quote === "\"" || quote === "'") && value.endsWith(quote)) {
      value = value.slice(1, -1);
    }

    process.env[key] = value
      .replace(/\\r\\n/g, "")
      .replace(/\r?\n/g, "")
      .trim()
      .replace(/\\n/g, "\n");
  }
}

if (process.env.JEFF_ENV_FILE) {
  loadEnvFile(resolve(process.cwd(), process.env.JEFF_ENV_FILE));
}

for (const fileName of [".env.local", ".env.vercel.local", ".env.project.local"]) {
  loadEnvFile(resolve(process.cwd(), fileName));
}
