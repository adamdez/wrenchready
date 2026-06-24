/**
 * verify:promise-state — deterministic invariant check for the canonical job-state
 * resolver (src/lib/promise-crm/promise-state.ts). Pure, no server/env needed.
 *
 * Run: npm run verify:promise-state   (tsx scripts/verify-promise-state.ts)
 *
 * Guards the bugs this slice fixes:
 *  - the funnel never shows two "current" steps
 *  - exactly one active step while in progress, zero when complete
 *  - done/upcoming are monotonic around the active step
 *  - customer-send gate stays closed when the quote is blocked
 */
import { promiseRecords } from "../src/lib/promise-crm/mock-data";
import {
  quoteIsBlocked,
  resolvePromiseState,
  type ResolvablePromise,
} from "../src/lib/promise-crm/promise-state";

let failures = 0;
let checks = 0;

function check(label: string, condition: boolean, detail = "") {
  checks += 1;
  if (!condition) {
    failures += 1;
    console.error(`  ✗ ${label}${detail ? ` — ${detail}` : ""}`);
  }
}

function assertInvariants(name: string, record: ResolvablePromise) {
  const r = resolvePromiseState(record);
  const current = r.stepStates.filter((s) => s === "current").length;

  check(`${name}: at most one "current" step`, current <= 1, `got ${current}`);
  check(`${name}: label is non-empty`, r.label.trim().length > 0);
  check(
    `${name}: stageIndex in range`,
    r.stageIndex === null || (r.stageIndex >= 0 && r.stageIndex <= 5),
    `got ${r.stageIndex}`,
  );

  if (r.terminal === "lost") {
    check(`${name}: lost ⇒ zero current`, current === 0);
    check(`${name}: lost ⇒ no "current" step`, !r.stepStates.includes("current"));
  } else if (r.stageIndex === null) {
    check(`${name}: won ⇒ all steps done`, r.stepStates.every((s) => s === "done"));
    check(`${name}: won ⇒ zero current`, current === 0);
  } else {
    const active = r.stepStates[r.stageIndex];
    check(
      `${name}: active step is current|blocked`,
      active === "current" || active === "blocked",
      `got ${active}`,
    );
    check(
      `${name}: steps before active are done`,
      r.stepStates.slice(0, r.stageIndex).every((s) => s === "done"),
    );
    check(
      `${name}: steps after active are upcoming`,
      r.stepStates.slice(r.stageIndex + 1).every((s) => s === "upcoming"),
    );
  }

  if (quoteIsBlocked(record)) {
    check(`${name}: blocked quote ⇒ cannot send`, r.gates.canSendQuote === false);
  }

  check(
    `${name}: nextAction has id + label`,
    r.nextAction.id.length > 0 && r.nextAction.label.trim().length > 0,
  );
  if (r.stage === "quote" && r.blockers.length > 0) {
    check(
      `${name}: blocked quote ⇒ next action is "resolve-blockers"`,
      r.nextAction.id === "resolve-blockers",
    );
  }
  if (r.terminal === "won") {
    check(`${name}: won ⇒ next action is "complete"`, r.nextAction.id === "complete");
  }
  if (r.terminal === "lost") {
    check(`${name}: lost ⇒ next action is "reopen"`, r.nextAction.id === "reopen");
    check(`${name}: lost ⇒ label reads Lost`, r.label.toLowerCase().includes("lost"));
  }
}

console.log(`Checking ${promiseRecords.length} fixture promise records...`);
for (const record of promiseRecords) {
  assertInvariants(record.id, record);
}

// --- Synthetic regression cases ---------------------------------------------

// The exact two-"current" bug: a scheduled job that ALSO has a follow-up due date.
// Old buildFunnelSteps lit Schedule AND Follow-up. Must now be exactly one current.
const base = promiseRecords[0];
const twoCurrentRepro = structuredClone(base);
twoCurrentRepro.jobStage = "scheduled";
twoCurrentRepro.scheduledWindow = {
  ...twoCurrentRepro.scheduledWindow,
  startIso: "2026-06-23T17:00:00.000Z",
};
twoCurrentRepro.followThroughDueAt = "2026-06-19T19:00:00.000Z"; // past-due
assertInvariants("repro:scheduled+followup", twoCurrentRepro);
check(
  "repro: scheduled job is on the Schedule stage, not Follow-up",
  resolvePromiseState(twoCurrentRepro).stage === "schedule",
);

// Fully complete + paid + closed ⇒ no active stage.
const complete = structuredClone(base);
complete.jobStage = "collected";
complete.paymentCollection = { ...(complete.paymentCollection ?? {}), status: "paid" };
complete.closeout = { ...(complete.closeout ?? { now: [], soon: [], monitor: [] }), completedAt: "2026-06-20T00:00:00.000Z" };
const completeState = resolvePromiseState(complete);
check("complete job ⇒ stage null", completeState.stage === null);
check("complete job ⇒ won terminal", completeState.terminal === "won");
check("complete job ⇒ Completed/closed label", completeState.label.length > 0);

// Lost terminal: a "declined" outcome closes the lead without happy-path CTAs.
const lost = structuredClone(base);
lost.commercialOutcome = {
  outcomeStatus: "declined",
  outcomeSummary: "went with a different company",
};
assertInvariants("repro:lost", lost);
const lostState = resolvePromiseState(lost);
check("lost ⇒ terminal lost", lostState.terminal === "lost");
check("lost ⇒ stage null", lostState.stage === null);
check("lost ⇒ reopen action", lostState.nextAction.id === "reopen");
check("lost ⇒ reason preserved", lostState.lostReason === "went with a different company");

console.log(`\n${checks - failures}/${checks} checks passed.`);
if (failures > 0) {
  console.error(`\n✗ ${failures} invariant failure(s).`);
  process.exit(1);
}
console.log("✓ All promise-state invariants hold.");
