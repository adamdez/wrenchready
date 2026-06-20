// Authenticated UI screenshot pass for WrenchReady.
//
// Drives headless Chromium (Playwright) over the running dev/preview server and
// captures desktop + mobile screenshots of both the public site and the
// Basic-auth-protected /ops cockpit. Ops credentials are read from .env.local at
// runtime (WR_OPS_AUTH_USER / WR_OPS_AUTH_PASSWORD) and passed straight into the
// browser's HTTP auth — they are never logged or written anywhere.
//
// Prereqs:
//   1. Dev server running:   npm run dev        (defaults to http://localhost:3000)
//   2. Browser installed:    npx playwright install chromium   (one-time)
//
// Usage:
//   npm run ui:shots                       # default page set
//   BASE_URL=http://localhost:3000 npm run ui:shots
//   node scripts/ui-shots.mjs /ops /ops/tomorrow /services   # explicit paths
//
// Output: ./docs/evaluation/screenshots/<viewport>-<slug>.png  (+ JSON manifest to stdout)

import { chromium } from "playwright";
import { readFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const ENV_PATH = resolve(ROOT, ".env.local");
const OUT_DIR = resolve(ROOT, "docs/evaluation/screenshots");
const BASE_URL = process.env.BASE_URL || "http://localhost:3000";

const readEnvValue = (key) => {
  let text = "";
  try {
    text = readFileSync(ENV_PATH, "utf8");
  } catch {
    return "";
  }
  const m = text.match(new RegExp(`^\\s*${key}\\s*=\\s*(.*)$`, "m"));
  return m ? m[1].trim().replace(/^["']|["']$/g, "").trim() : "";
};

const DEFAULT_PATHS = [
  "/",
  "/services",
  "/locations",
  "/contact",
  "/ops",
  "/ops/promises",
  "/ops/tomorrow",
  "/ops/jeff",
  "/ops/collections",
  "/ops/insights",
  "/ops/parts",
  "/ops/field",
  "/ops/management",
];

const slug = (p) => (p === "/" ? "home" : p.replace(/^\/+/, "").replace(/\//g, "-"));

async function main() {
  const paths = process.argv.slice(2).length ? process.argv.slice(2) : DEFAULT_PATHS;
  const username = readEnvValue("WR_OPS_AUTH_USER");
  const password = readEnvValue("WR_OPS_AUTH_PASSWORD");
  const httpCredentials = username && password ? { username, password } : undefined;
  if (!httpCredentials) {
    console.warn("[ui-shots] No WR_OPS_AUTH_USER/PASSWORD in .env.local — /ops pages will 401.");
  }

  mkdirSync(OUT_DIR, { recursive: true });
  const browser = await chromium.launch();
  const manifest = [];

  const pass = async (label, viewport, isMobile) => {
    const ctx = await browser.newContext({ httpCredentials, viewport, isMobile, deviceScaleFactor: 1 });
    for (const path of paths) {
      const page = await ctx.newPage();
      const errors = [];
      page.on("console", (m) => m.type() === "error" && errors.push(m.text().slice(0, 160)));
      let status = 0;
      try {
        const resp = await page.goto(BASE_URL + path, { waitUntil: "networkidle", timeout: 30000 });
        status = resp ? resp.status() : 0;
        await page.waitForTimeout(600);
      } catch (e) {
        errors.push("NAV: " + String(e).slice(0, 140));
      }
      const file = resolve(OUT_DIR, `${label}-${slug(path)}.png`);
      await page.screenshot({ path: file, fullPage: !isMobile }).catch(() => {});
      manifest.push({ viewport: label, path, status, title: (await page.title().catch(() => "")).slice(0, 60), errors: errors.slice(0, 3), file });
      await page.close();
    }
    await ctx.close();
  };

  await pass("desktop", { width: 1440, height: 900 }, false);
  await pass("mobile", { width: 390, height: 844 }, true);
  await browser.close();

  console.log(JSON.stringify(manifest, null, 2));
  const bad = manifest.filter((m) => m.status >= 400 || m.status === 0);
  if (bad.length) console.warn(`[ui-shots] ${bad.length} page(s) returned >=400 or failed: ` + bad.map((b) => `${b.path}=${b.status}`).join(", "));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
