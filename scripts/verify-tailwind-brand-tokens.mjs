import fs from "node:fs";
import path from "node:path";

const roots = ["src", "scripts"].map((value) => path.join(process.cwd(), value));
const brokenPattern = /\[--wr-/;
const offenders = [];

function walk(dir) {
  if (!fs.existsSync(dir)) return;

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    const relativePath = path.relative(process.cwd(), fullPath);

    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
      walk(fullPath);
      continue;
    }

    if (relativePath === "scripts/verify-tailwind-brand-tokens.mjs") continue;
    if (!/\.(css|js|jsx|mjs|ts|tsx)$/.test(entry.name)) continue;

    const content = fs.readFileSync(fullPath, "utf8");
    if (brokenPattern.test(content)) {
      offenders.push(relativePath);
    }
  }
}

for (const root of roots) walk(root);

if (offenders.length) {
  console.error("Bare [--wr-*] Tailwind arbitrary values are broken. Use [var(--wr-*)].");
  for (const offender of offenders) console.error(`- ${offender}`);
  process.exit(1);
}

console.log("Tailwind brand token arbitrary values are valid.");
