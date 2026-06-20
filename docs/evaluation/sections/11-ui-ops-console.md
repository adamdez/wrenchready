## 11. UI/UX — Internal Ops Cockpit (/ops)

**Verdict.** The cockpit is a genuinely thoughtful, opinionated dispatch surface: the Promise Board's four-column queue (`promise-board.tsx`) and the single-pass `QuickDispatchForm` give the office a clear, prioritized "what do I touch next" loop, and `/ops/management` aggregates eight snapshots into a real review hub. But underneath the polish it is ~20 server-rendered dashboards with **no shared shell, no persistent navigation, no live refresh, no loading or error boundaries, and no optimistic updates**, glued together by copy-pasted action forms whose feedback states have silently diverged. The centerpiece edit surface is a 2,425-LOC / 120-`useState` monolith that stores structured data as pipe-delimited text in `<textarea>`s. The owner model is hardcoded to two people at the type level (`RecordOwner = "Dez" | "Simon" | "Unassigned"`), so the cockpit cannot represent — let alone coordinate — seven techs without a refactor.

**Score: 5 / 10**

### What's here

- **Routing/shell.** `/ops` is ~20 sibling route folders (`accounts, cadence, collections, field, field-assistant, follow-through, inbound, insights, jeff, management, outbound, owners, parts, playbooks, promises, proof, recapture, systems, tomorrow, warranty, wedges`). There is **no `src/app/ops/layout.tsx`** (`find src/app/ops -name layout.tsx` returns nothing) and the root layout renders no nav. `src/app/ops/page.tsx:4` is a 5-line `redirect("/ops/promises")`.
- **The board.** `src/app/ops/promises/page.tsx` is a `force-dynamic` server component that `getPromiseBoardSnapshot()` once and renders `<PromiseBoard>` (`src/components/promise-board.tsx`, 514 LOC) — a 4-column kanban (New Requests / Quote Review / Promised Jobs / Follow-Up Due) with a metrics strip and an embedded `QuickDispatchForm`.
- **The edit surface.** `src/app/ops/promises/[id]/page.tsx` (2,247 LOC) renders the detail view plus `PromiseStatusForm` (`src/components/promise-status-form.tsx`, 2,425 LOC, **120 `useState` calls**).
- **Action forms.** A family of per-task client forms — `collection-action-form.tsx` (186), `follow-through-action-form.tsx` (182), `warranty-action-form.tsx` (139), `closeout-quality-action-form.tsx` (180), `parts-planner-action-form.tsx` (227), `field-packet-action-form.tsx` (117), `outbound-action-form.tsx` (85), `recurring-account-action-form.tsx` (565), `ops-inbound-form.tsx`, `ops-payment-link-form.tsx` — each `"use client"`, each independently `fetch`-PATCHing `/api/al/wrenchready/promises/[id]` and calling `router.refresh()`.
- **Hub.** `src/app/ops/management/page.tsx:34-43` `Promise.all`s eight snapshots and renders an agenda of `<Link>`s out to the spoke dashboards (`page.tsx:146-167`) — the only real navigation aggregator in the app.

### Strengths

- **The board prioritizes work, not just lists it.** `promise-board.tsx:368-491` splits open records into quote-review vs. real-promise lanes (`isQuoteScheduleReview`, line 370-371), surfaces a count strip (`:403-422`), and renders a closing risk banner that flips teal/red on `promisedAtRiskCount` (`:493-511`). This is information-dense and scannable in the way a dispatch board needs to be.
- **Tap-to-act contact affordances.** `ContactActions` emits real `tel:`/`sms:`/`mailto:` links (`promise-board.tsx:146-180`, helpers `telHref`/`smsHref` at `:53-61`), and voicemail leads get an "Open recording" deep link scraped from notes (`:94-109`, `:251-261`). For a phone-first dispatch business this removes copy-paste friction.
- **One-pass intake is excellent.** `QuickDispatchForm` (`quick-dispatch-form.tsx`) saves a dispatched job in a single 12-column grid submit, returns a deep link to the created record on success (`:65-67`, `:88-95`), and explicitly reassures "No customer message was sent" (`:66`) — a smart guardrail against accidental customer contact.
- **A real review hub exists.** `management/page.tsx` is a legitimately good operator pattern: parallel-fetch every domain snapshot, compute one-line headlines, link straight to the spoke that needs work (`:45-70`, `:146-167`).
- **Consistent visual primitives.** The shared `.form-input`/`.form-textarea` classes, lucide iconography, and the `rounded-2xl border border-border bg-card/50` card idiom give the dashboards a coherent look even without a shared component layer.
- **Honest empty/failure copy on the board.** `promises/page.tsx:25-43` refuses to render demo data and shows a loud "Promise CRM unavailable" panel rather than silently showing stale/blank state — a good production instinct.

### Findings

**A11-01 — The owner model is hardcoded to two named people at the type level; the cockpit cannot represent 7 techs.**
Severity: High · Category: architecture
Location: `src/lib/promise-crm/types.ts:3`; `src/components/promise-status-form.tsx:128,716-718`; `src/lib/scheduling/engine.ts:402-412`
Evidence: `export type RecordOwner = "Dez" | "Simon" | "Unassigned";` (`types.ts:3`). The detail form's owner dropdown is three literal `<option>`s — `Unassigned`/`Dez`/`Simon` (`promise-status-form.tsx:716-718`) with state typed `useState<"Dez" | "Simon" | "Unassigned">` (`:128`). The scheduling engine hardcodes operator copy ("Simon's shared calendar… Dez will confirm timing manually", `engine.ts:402-412`). The field worklist shows `task.owner` only as a flat string tag (`field/page.tsx:53`), and neither `field` nor `tomorrow` groups tasks by tech.
Why it matters: The stated goal is scaling to ~7 field technicians, and the cockpit is "the ultimate assistant for both the techs and the office." A two-tech enum baked into a shared type forces a code change (and a data migration) for every hire, every assignment dropdown is wrong, and there is no per-tech route/worklist view to coordinate a 7-person field. This is the single biggest gap between the product's mission and its UI.
Recommendation: Replace the literal union with a `Technician` entity (id, name, active) loaded from data; render owner pickers from that roster; add a per-tech grouping/filter to `field` and `tomorrow` so the office can see each tech's day.

**A11-02 — No shared shell or persistent navigation across ~20 dashboards.**
Severity: High · Category: ux
Location: absence of `src/app/ops/layout.tsx`; `src/app/ops/field/page.tsx:19-22` (and 17 more)
Evidence: There is no `layout.tsx` under `/ops`. 18 dashboards expose a single "Back to Promise Board" `<Link>` as their only chrome (e.g. `field/page.tsx:19-22`); a `grep` of distinct `/ops/*` hrefs shows most spokes link to exactly one other route. The only aggregator is `/ops/management`, but `/ops` itself redirects to `/ops/promises` (`page.tsx:4`), not the hub.
Why it matters: A busy dispatcher cannot jump from Collections to Warranty to Parts without bouncing through the board or hand-typing URLs. There is no global nav, breadcrumb, or command bar, so the ~20 surfaces feel like 20 disconnected pages rather than one cockpit. This directly taxes the core loop (intake → dispatch → closeout → collect), which spans four different dashboards.
Recommendation: Add an `ops/layout.tsx` with a persistent sidebar/topbar listing the dashboards (grouped by stage), highlighting the active route and showing live counts; make `/ops` land on the management hub.

**A11-03 — `promise-status-form.tsx`: a 2,425-LOC, 120-`useState` form is both a UX and a maintainability hazard.**
Severity: High · Category: cleanliness
Location: `src/components/promise-status-form.tsx:126-686`
Evidence: 120 `useState` declarations in one component (`grep -c useState`), one `handleSubmit` assembling a deeply nested ~150-field payload (`:496-669`), 336 control/state matches across the file. There is no field-level validation, no dirty tracking, and the entire form mounts flat regardless of job stage.
Why it matters: A single mega-form means the operator scrolls past dozens of irrelevant fields (recurring-account trials, proof capture, warranty reserve %) to update one thing; every keystroke re-renders a 120-state tree; and any change risks one of ~150 fields. It is the hardest file in the cockpit to evolve safely and the slowest to edit in practice.
Recommendation: Split into stage-scoped panels (intake / closeout / collection / recurring) backed by a shared `useResourceForm` hook; render only the panels relevant to the current `jobStage`; add per-field validation and a dirty/`disabled`-until-changed save.

**A11-04 — Structured data is stored and edited as pipe-delimited text in `<textarea>`s.**
Severity: Medium · Category: data-integrity
Location: `src/components/promise-status-form.tsx:44-124,540-575`
Evidence: Recap items and proof assets are serialized to `"title | detail | amount"` / `"kind | label | note | url | permission"` strings (`formatRecapItems` `:44-52`, `formatProofAssets` `:77-91`) and re-parsed by splitting on `|` and `\n` (`parseRecapItems` `:54-75`, `parseProofAssets` `:93-124`). `topRisks` is split on `\n` (`:515-518`).
Why it matters: A pipe character in any free-text field silently corrupts the row; there is no structure, validation, or per-item add/remove UI — the operator must hand-maintain a fragile DSL. This is brittle data entry for an operations system of record and a real source of bad records.
Recommendation: Replace the pipe textareas with repeatable structured rows (add/remove item, typed inputs); persist arrays of objects directly rather than round-tripping through a delimiter format.

**A11-05 — Error feedback is silently invisible in ~5 action forms.**
Severity: Medium · Category: ux
Location: `src/components/collection-action-form.tsx:172-174`; `warranty-action-form.tsx`; `closeout-quality-action-form.tsx`; `parts-planner-action-form.tsx`; `field-packet-action-form.tsx`
Evidence: These forms render feedback as `<p className="mt-3 text-sm text-muted-foreground">{feedback}</p>` (`collection-action-form.tsx:172-174`) — the **same muted gray for "Saved." and for an error message** assigned in the `catch` (`:62` vs `:66-68`). Other forms got this right: `follow-through-action-form.tsx:152-155` and `outbound-action-form.tsx:53-55` switch to `border-red-500/20 … text-red-200` on `status !== "success"`.
Why it matters: When a PATCH fails, the operator sees the error text in the identical gray used for success, so a failed save reads as a successful one. In a money/collection/warranty workflow that means missed updates and false confidence. The divergence is a direct symptom of copy-paste-without-abstraction.
Recommendation: Extract a shared `<FormFeedback status message />` (and ideally a `useActionForm` hook owning `saving`/`feedback`/PATCH/`router.refresh`) so success vs. error styling is correct and uniform everywhere.

**A11-06 — No `loading.tsx` / `error.tsx` boundaries; every dashboard is a blocking `force-dynamic` fetch.**
Severity: Medium · Category: ux
Location: all `src/app/ops/*/page.tsx` (`export const dynamic = "force-dynamic"`); absence of any `loading.tsx`/`error.tsx`
Evidence: `find src/app/ops -name loading.tsx` and `-name error.tsx` both return **zero** files. Every dashboard `await`s its snapshot at the top level (e.g. `field/page.tsx:14-15`, `management/page.tsx:34-43`) with no `<Suspense>`. Only the board hand-rolls a failure panel (`promises/page.tsx:19-43`); every other spoke has no try/catch, so a snapshot throw escapes to the framework default.
Why it matters: With no streaming skeleton, the operator gets a blank tab for the full duration of the server fetch on every navigation — painful on a cockpit reopened dozens of times a day. With no route-level error boundary, a single failing query (e.g. `getCollectionSnapshot`) blanks the whole page instead of degrading gracefully.
Recommendation: Add `loading.tsx` skeletons and `error.tsx` boundaries per `/ops` segment (or one at the `ops/layout` level); wrap the eight `management` snapshots so one failure doesn't take down the hub.

**A11-07 — No live refresh: a dispatch board shows stale data until a manual reload or a mutation.**
Severity: Medium · Category: ux
Location: all `src/app/ops/*/page.tsx` except `jeff`; mutation forms rely solely on `router.refresh()`
Evidence: `grep` for `setInterval|useSWR|revalidate|useEffect` across `src/app/ops/*/page.tsx` matches **only `jeff/page.tsx`**. Dashboards snapshot once on the server; the data only updates when the operator's own mutation triggers `router.refresh()` (e.g. `collection-action-form.tsx:64`, `promise-status-form.tsx:681`, `quick-dispatch-form.tsx:70`).
Why it matters: A dispatch board left open all day silently goes stale — new inbound calls, a tech marking a job on-site, another operator's edits never appear without an F5. For a multi-operator office coordinating a live field, the "Today Queue" can actively mislead. The "Snapshot {time}" label (`promise-board.tsx:393-395`) is the only hint, and it doesn't move.
Recommendation: Add lightweight polling (`router.refresh()` on an interval) or a revalidation/realtime channel for the high-churn boards (promises, inbound, field, tomorrow), with a visible "last updated / refresh" control.

**A11-08 — No optimistic updates and no keyboard/efficiency affordances for a high-frequency operator tool.**
Severity: Low · Category: ux
Location: all `/ops` mutation forms; `grep onKeyDown|accessKey|hotkey|kbd src/app/ops` → none
Evidence: `useOptimistic`/"optimistic" appears only in `jeff-messages-thread.tsx`, never in ops forms — every save shows "Saving…" then waits for a full server round-trip + `router.refresh()` before the UI reflects the change. No keyboard shortcuts, command palette, or `accessKey` exist anywhere in `/ops` (only `jeff-messages-thread.tsx` and `ui/tooltip.tsx` use `onKeyDown`).
Why it matters: The core loop is high-frequency, repetitive data entry. Without optimistic UI each action feels laggy; without shortcuts (jump-to-dashboard, save, next record) a power dispatcher is stuck mousing through full-page reloads. These are exactly the affordances that separate a cockpit from a CRUD admin.
Recommendation: Add `useOptimistic` to the small action forms; introduce a command palette / global hotkeys for navigation and save; support "save & next" on the detail form.

### Score rationale

The cockpit clears the bar for a fast-moving startup: the Promise Board genuinely prioritizes the operator's day, `QuickDispatchForm` and the `tel:`/`sms:` affordances make the intake/contact loop fast, and `/ops/management` is a real review hub — these are above-baseline product instincts (pulling the score up from a 3-4). But the foundation has structural debt that bites daily: no shared shell or navigation across ~20 surfaces (A11-02), no loading/error boundaries and no live refresh on a board meant to run all day (A11-06, A11-07), copy-pasted forms with **broken error visibility** in money-handling flows (A11-05), and a 2,425-LOC / 120-state form persisting structured data as fragile pipe-text (A11-03, A11-04). Most damning against the product's own thesis: the owner model is hardcoded to two people at the type level with no per-tech views (A11-01), so the cockpit as built cannot coordinate the 7 techs it exists to enable. Solid and shippable for two operators today; **5/10** — meaningful debt and a clear ceiling before it can run the business it's named for.
