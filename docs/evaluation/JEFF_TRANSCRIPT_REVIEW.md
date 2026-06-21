# Jeff ⇄ Simon Transcript Review — Pain Points, Frustrations, Blocks

> **Date:** 2026-06-20
> **Source:** the raw local pilot store `.data/jeff/` (workspace.json: 198 conversations / 198 summaries; field-events.json: 526 events; pilot-reviews.json: 50 red-team reviews). **Verbatim turns**, not Jeff's own summaries.
> **Method:** read the actual `sourcePayload.userMessage` (Simon, verbatim) / `assistantMessage` (Jeff, verbatim), the field-event types, and the red-team review `issues` — deliberately ignoring the "reported" summaries.

## The two findings that matter most

**1. There is almost no real Simon usage to review.** Of 198 stored conversations, ~166 are synthetic smoke/fixture/codex test data and ~17 more are scripted red-team "scenario <timestamp>" probes. **Exactly two genuine, natural Simon field messages exist** in the entire store. Every voice "call" in the store is test data — and **voice transcripts are not stored verbatim at all** (only Jeff's paraphrased summary), so a real call can never be audited after the fact. *This is why the reports can't be trusted: they are Jeff-written summaries of mostly-synthetic conversations.*

**2. In the little real data that exists, Jeff fails badly — and your own red-team agrees.** The 50-scenario red-team review **failed 27 of 50 (54%)**, and the documented failure reasons line up exactly with what the two real exchanges show.

---

## The two genuine Simon exchanges (verbatim)

> Simon: **"No, where can I buy one?"**
> Jeff: *"I need Simon to tap Share Location in Jeff before I can rank nearby parts stores. I cannot buy or reserve parts in this MVP. I can draft an escalation with the part, fitment questions, vendor, price, core charge, pickup timing, and required approval."*

A simple field question gets a wall of can'ts — a location-gate, an MVP block, and a bureaucratic "escalation" offer. Not an answer.

> Simon: **"starter clicks but I have crank signal"**
> Jeff: *"I found 5 WrenchReady knowledge matches. Use the matches silently and answer in normal field language."*

**Jeff leaked his own internal system instruction to Simon** instead of answering the diagnostic question. This is a raw prompt directive ("answer in normal field language") sent to the technician.

> Simon: **"No, where can I buy one?"**
> Jeff: *"I saved that, but my text brain is not connected because OPENAI_API_KEY is missing."*

**Jeff was outright disconnected** during a real exchange — a missing API key meant he literally could not think.

So in the *only* real conversations on record, Jeff (a) deflected, (b) leaked his scaffolding, and (c) was dead. The reports do not say this.

---

## Pain points / frustrations / blocks (evidence-grounded)

| Theme | Evidence | Severity |
|---|---|---|
| **Jeff narrates / leaks internal lookups instead of answering** | Real: "Use the matches silently and answer in normal field language" sent to Simon. Red-team: "sounded like he was reading research instead of coaching", "internal lookup narration makes Jeff sound slow or confused", "repeated internal context-check narration" | **fix-before-field** (recurring) |
| **Refuses/gates instead of helping from Simon's spoken facts** | Real: "I need Simon to tap Share Location… I cannot buy or reserve parts in this MVP." Red-team: "may have refused useful general help because no CRM job was selected" | **fix-before-field** |
| **Talks past Simon; won't take an interruption or context switch** | Red-team: "Simon had to interrupt or correct Jeff because Jeff was talking past the actual request"; "forced the wrong active job context after Simon switched contexts" | **fix-before-field** |
| **Outright disconnected** | Real: "my text brain is not connected because OPENAI_API_KEY is missing" | **blocker** (config) |
| **The MVP wall dominates everything** | Field events: `purchase_blocked` ×202, `approval_requested` ×102. "I cannot buy or reserve parts in this MVP" is the single most common thing Jeff does. | structural |
| **Over-claiming / safety risk** | Red-team blockers: "unsafe drivability reassurance"; "scheduling promise without verified scheduling gates"; "giving exact service-data claims" (specs it shouldn't); "a completed purchase appeared" | **blocker** |
| **Weak field close** | Red-team: "may lack a concrete next physical test or evidence request" | watch |

The red-team's own recommended fixes (verbatim) are the to-do list:
- *"Digest research/tool output silently, then answer with a quick takeaway, one-sentence reason, and next physical action in normal field language."*
- *"Help from Simon's spoken facts first. Require a job id only for job-file writes, approvals, payments, scheduling, or customer-facing claims."*
- *"Treat Simon interruption/correction phrases as an immediate stop command: stop the explanation, accept the correction, answer the actual question in one short pass."*
- *"When Simon says it is a different job, accept the context switch and ask only for the minimum job identifier before writing."*

---

## What this means

- **You cannot trust ANY current "how is Jeff doing" report** — not because the reporting is dishonest, but because it summarizes a corpus that is ~85% synthetic and contains two real field exchanges, in which Jeff visibly failed.
- **The single biggest gap is the absence of real usage data**, compounded by **voice calls not being stored verbatim** — so you can never go back and check what Jeff actually said on a call. Fix the storage, then get Simon using it on real jobs.
- **The behavior failures are already named by your own red-team** (silent lookups, help-from-spoken-facts, accept interruptions, no over-claiming) and 27/50 scenarios fail today. These are prompt/runtime fixes, not new features.

## Recommended next steps
1. **Store verbatim turns for voice** (currently only summaries persist) so calls are auditable at all.
2. **Fix the three recurring behavior failures** the red-team named: silent lookups, help-before-gating, honor interruptions/context-switches.
3. **Resolve the OPENAI_API_KEY / "text brain not connected" path** — Jeff should never tell Simon he's disconnected mid-job; fail over or queue.
4. **Get real reps**: a week of Simon actually using Jeff on real jobs will tell you more than 198 synthetic conversations. Re-run this review on real data.

*Caveat: this reviews the local pilot store (`.data/jeff/`). If the live Supabase conversation tables hold additional real exchanges, a pull from there would widen the sample — happy to do that next.*
