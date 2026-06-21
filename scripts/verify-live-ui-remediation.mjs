import "./load-local-env.mjs";
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const baseUrl = (process.argv[2] || "http://localhost:3000").replace(/\/$/, "");
const screenshotDir = path.join(process.cwd(), "docs", "evaluation", "screenshots", "remediation");
fs.mkdirSync(screenshotDir, { recursive: true });

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function basicAuthHeader() {
  const user = process.env.WR_OPS_AUTH_USER || "ops";
  const password =
    process.env.WR_OPS_AUTH_PASSWORD ||
    process.env.WR_OPS_BASIC_PASSWORD ||
    process.env.JEFF_FIELD_ASSISTANT_TOOL_SECRET;

  assert(password, "Ops auth password is required for live UI verification.");
  return `Basic ${Buffer.from(`${user}:${password}`).toString("base64")}`;
}

async function pageWithTracking(context) {
  const page = await context.newPage();
  const issues = [];
  page.on("console", (message) => {
    if (message.type() === "error") issues.push(`console: ${message.text()}`);
  });
  page.on("pageerror", (error) => {
    issues.push(`pageerror: ${error.message}`);
  });
  return { page, issues };
}

async function expectNoOverlay(page) {
  const overlay = await page.locator("[data-nextjs-dialog], .vite-error-overlay, #webpack-dev-server-client-overlay").count();
  assert(overlay === 0, "Framework error overlay is visible.");
}

async function screenshot(page, name) {
  await page.screenshot({
    path: path.join(screenshotDir, `${name}.png`),
    fullPage: true,
  });
}

async function getCustomerToken(request) {
  const response = await request.get(`${baseUrl}/api/al/wrenchready/promises`, {
    headers: { Authorization: basicAuthHeader() },
  });
  assert(response.ok(), `Could not fetch Promise CRM queue: ${response.status()}`);
  const body = await response.json();
  const records = [
    ...(body.promisesWaiting || []),
    ...(body.tomorrowAtRisk || []),
    ...(body.followThroughDue || []),
    ...(body.completed || []),
  ];
  const token = records.find((record) => record.customerAccess?.token)?.customerAccess?.token;
  assert(token, "No customer status token was available from the Promise CRM queue.");
  return token;
}

const browser = await chromium.launch({ headless: true });
const results = [];

try {
  const mobile = await browser.newContext({
    baseURL: baseUrl,
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const desktop = await browser.newContext({
    baseURL: baseUrl,
    viewport: { width: 1440, height: 900 },
    extraHTTPHeaders: { Authorization: basicAuthHeader() },
  });

  {
    const { page, issues } = await pageWithTracking(mobile);
    await page.goto("/", { waitUntil: "networkidle" });
    await expectNoOverlay(page);
    await page.getByPlaceholder("Year").fill("2017");
    await page.getByPlaceholder("Make").fill("Toyota");
    await page.getByPlaceholder("Model").fill("Camry");
    await page.getByLabel("Service needed").selectOption("brake-repair");
    await page.getByLabel("Problem description").fill("Brake pedal pulses and the car shakes when stopping.");
    await page.getByLabel("Vehicle location").fill("99201");
    await page.getByLabel("Your name").fill("Live UI Probe");
    await page.getByRole("textbox", { name: "Phone number" }).fill("5095550101");
    await page.getByLabel("Email for written confirmation").fill("probe@example.com");
    await page.getByRole("checkbox").check();
    await page.locator("form").locator('button[type="submit"]').click();
    await page.getByText("Request received.").waitFor({ timeout: 15000 });
    await screenshot(page, "mobile-home-intake");
    results.push({ flow: "mobile_home_intake", ok: issues.length === 0, issues });
    await page.close();
  }

  {
    const { page, issues } = await pageWithTracking(mobile);
    await page.goto("/jeff/messages", { waitUntil: "networkidle" });
    await expectNoOverlay(page);
    await page.getByPlaceholder("Message Jeff").fill("Stop talking and listen for a second. This is a different job.");
    await screenshot(page, "mobile-jeff-messages");
    const attachButtonBox = await page.getByLabel("Attach photo or file").boundingBox();
    const sendButtonBox = await page.getByLabel("Send message").boundingBox();
    assert(attachButtonBox && attachButtonBox.width >= 44 && attachButtonBox.height >= 44, "Attach button is below 44px.");
    assert(sendButtonBox && sendButtonBox.width >= 44 && sendButtonBox.height >= 44, "Send button is below 44px.");
    results.push({ flow: "mobile_jeff_messages", ok: issues.length === 0, issues });
    await page.close();
  }

  {
    const { page, issues } = await pageWithTracking(desktop);
    await page.goto("/ops", { waitUntil: "networkidle" });
    await expectNoOverlay(page);
    await page.getByRole("link", { name: "Inbound" }).waitFor({ timeout: 10000 });
    await screenshot(page, "desktop-ops-shell");
    results.push({ flow: "desktop_ops_shell", ok: issues.length === 0, issues });
    await page.close();
  }

  {
    const { page, issues } = await pageWithTracking(desktop);
    await page.goto("/ops/inbound", { waitUntil: "networkidle" });
    await expectNoOverlay(page);
    await page.getByText("Inbound Queue").waitFor({ timeout: 10000 });
    assert(!(await page.getByText("404").count()), "/ops/inbound rendered a 404.");
    await screenshot(page, "desktop-ops-inbound");
    results.push({ flow: "desktop_ops_inbound", ok: issues.length === 0, issues });
    await page.close();
  }

  {
    const token = await getCustomerToken(desktop.request);
    const { page, issues } = await pageWithTracking(desktop);
    await page.goto(`/status/${token}`, { waitUntil: "networkidle" });
    await expectNoOverlay(page);
    await page.getByText(/promise|approval|status/i).first().waitFor({ timeout: 10000 });
    await screenshot(page, "desktop-customer-status");
    results.push({ flow: "desktop_customer_status", ok: issues.length === 0, issues });
    await page.close();
  }

  const failed = results.filter((result) => !result.ok);
  assert(failed.length === 0, `Live UI verifier found browser issues: ${JSON.stringify(failed, null, 2)}`);

  console.log(JSON.stringify({
    success: true,
    baseUrl,
    screenshotDir: path.relative(process.cwd(), screenshotDir),
    results,
  }, null, 2));
} finally {
  await browser.close();
}
