// Re-judge a prior eval run WITHOUT re-calling Jeff. Loads the captured replies
// from eval-jeff-results.json and re-scores each with the CURRENT judge prompt in
// eval-jeff-behavior.mjs. Use this to tune the judge (rubric/calibration) and see
// the effect on the SAME Jeff replies — no thread pollution, no Jeff-variance, fast.
//
// Prereqs: an eval-jeff-results.json from `npm run eval:jeff -- --json`, OPENAI_API_KEY in .env.local.
// Usage:   node scripts/rejudge-jeff.mjs            (re-score the default dump)
//          node scripts/rejudge-jeff.mjs <path>     (re-score a specific dump)

import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DUMP = process.argv[2] || resolve(ROOT, "eval-jeff-results.json");

// Import the eval's TESTS + judge WITHOUT triggering its main() run.
process.env.JEFF_EVAL_IMPORT = "1";
const { TESTS, judgeReply, DIM_KEYS } = await import("./eval-jeff-behavior.mjs");

// Map every scored unit id -> its prompt text + goodLooksLike (+ multi-turn lineage).
const byId = new Map();
for (const t of TESTS) {
  if (Array.isArray(t.turns)) {
    t.turns.forEach((turn, i) => byId.set(`${t.id}#${i + 1}`, { text: turn.simon, goodLooksLike: turn.goodLooksLike, baseId: t.id, turnIndex: i + 1 }));
  } else {
    byId.set(t.id, { text: t.text, goodLooksLike: t.goodLooksLike });
  }
}

const dump = JSON.parse(readFileSync(DUMP, "utf8"));
const results = dump.results || [];
const resById = new Map(results.map((r) => [r.id, r]));

function priorContextFor(baseId, n) {
  const lines = [];
  for (let k = 1; k < n; k++) {
    const meta = byId.get(`${baseId}#${k}`);
    const res = resById.get(`${baseId}#${k}`);
    if (meta && res) lines.push(`Turn ${k} — Simon: ${meta.text}\n          Jeff: ${res.reply}`);
  }
  return lines.join("\n");
}

async function mapPool(items, n, fn) {
  const out = new Array(items.length);
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await fn(items[idx], idx);
    }
  }
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, worker));
  return out;
}

console.log(`\nRe-judging ${results.length} captured replies from ${DUMP}\n${"=".repeat(64)}`);

let done = 0;
const rejudged = await mapPool(results, 6, async (r) => {
  const meta = byId.get(r.id);
  if (!meta) return { ...r, newJudge: { available: false, error: "id not in TESTS" } };
  const prior = meta.baseId ? priorContextFor(meta.baseId, meta.turnIndex) : "";
  const newJudge = await judgeReply({ text: meta.text, goodLooksLike: meta.goodLooksLike }, r.reply, prior);
  process.stdout.write(`\r  judged ${++done}/${results.length}`);
  const newFinalGood = r.detPass && newJudge.available && newJudge.good;
  return { ...r, newJudge, newFinalGood };
});
console.log("\n");

const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);
const flips = [];
for (const r of rejudged) {
  if (r.newJudge?.available && r.finalGood !== r.newFinalGood) {
    flips.push(`${r.finalGood ? "GOOD→BAD" : "BAD→GOOD"}  ${r.id}${r.newJudge.hardFail ? ` (hardFail=${r.newJudge.hardFail})` : ""}`);
  }
}

function block(label, set) {
  const oldGood = set.filter((r) => r.finalGood).length;
  const newGood = set.filter((r) => r.newFinalGood).length;
  console.log(`  ${label.padEnd(22)} old ${pct(oldGood, set.length)}% (${oldGood}/${set.length})   →   new ${pct(newGood, set.length)}% (${newGood}/${set.length})`);
}

console.log("HEADLINE & SUBSETS (old stored judge → new re-judge, same Jeff replies):");
block("% GOOD (all)", rejudged);
block("diagnostic-tree", rejudged.filter((r) => r.category === "diagnostic-tree"));
block("banter", rejudged.filter((r) => r.category.startsWith("banter")));

const judged = rejudged.filter((r) => r.newJudge?.available);
const hardFails = {};
for (const r of judged) if (r.newJudge.hardFail) hardFails[r.newJudge.hardFail] = (hardFails[r.newJudge.hardFail] || 0) + 1;
console.log(`\nHard-fail rate (new judge): ${pct(Object.values(hardFails).reduce((a, b) => a + b, 0), judged.length)}%  ${Object.keys(hardFails).length ? JSON.stringify(hardFails) : "(none ✓)"}`);

const dimSums = Object.fromEntries(DIM_KEYS.map((k) => [k, 0]));
for (const r of judged) for (const k of DIM_KEYS) dimSums[k] += r.newJudge.scores[k];
console.log(`Mean judge dimension (new): ${DIM_KEYS.map((k) => `${k} ${(dimSums[k] / judged.length).toFixed(2)}`).join("  ")}`);

console.log(`\nVerdict flips (${flips.length}):`);
for (const f of flips.sort()) console.log(`  ${f}`);

// Show any diagnostic-tree turns STILL failing under the new judge (genuine issues, not calibration).
const stillBadDiag = rejudged.filter((r) => r.category === "diagnostic-tree" && r.newJudge?.available && !r.newFinalGood);
if (stillBadDiag.length) {
  console.log(`\nDiag-tree turns still failing under new judge (${stillBadDiag.length}) — real issues, not calibration:`);
  for (const r of stillBadDiag) console.log(`  ${r.id}: ${(r.newJudge.reason || "").replace(/\s+/g, " ").slice(0, 180)}`);
}

const out = resolve(ROOT, "eval-jeff-results.rejudged.json");
writeFileSync(out, JSON.stringify({ source: DUMP, judgeModel: dump.judgeModel, results: rejudged.map((r) => ({ id: r.id, category: r.category, detPass: r.detPass, oldFinalGood: r.finalGood, newFinalGood: r.newFinalGood, newJudge: r.newJudge })) }, null, 2));
console.log(`\nWrote ${out}\n`);
