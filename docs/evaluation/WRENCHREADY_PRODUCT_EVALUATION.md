# WrenchReady — Comprehensive Product Evaluation

> **Date:** 2026-06-19
> **Scope:** Full repo — engineering, code cleanliness, UI/UX
> **Method:** 13-dimension multi-agent audit with adversarial verification of high-severity findings
> **Depth:** Reviewed at senior-engineer depth

---

## ⚠️ Post-Assembly Reviewer Reconciliation (read first)

After the 13 sections were written, the lead reviewer independently re-checked the **access-control critical findings**, because the sections disagreed: Section 9 (Security) discovered `src/proxy.ts`, while Sections 1 and 4 did not (it uses Next 16's unusual `proxy.ts` filename instead of `middleware.ts`, so two agents missed it). Ground truth, verified directly against the code:

- **`src/proxy.ts` is a real Next 16 edge gate** that enforces HTTP Basic auth on `/ops` **and** an allowlist of CRM APIs: `alert-proof, dispatch, follow-through, inbound, integrations, outbound, owners, persistence-proof, promises, systems, tomorrow` (`src/proxy.ts:5-18`). Every non-`jeff` child of `/api/al/wrenchready/*` is in that allowlist.
- **The Jeff tool routes are gated centrally** by `createJeffToolRoute` → `authorizeJeffToolRequest`, which is **timing-safe and fails closed in production** (503 when the secret is unset) — `src/lib/jeff-field-assistant/route-handler.ts:8`, `src/lib/jeff-field-assistant/tools.ts:2296`. So the ~30 tool routes are protected even though their files never mention auth.

**Consequence — the critical list shrinks from 4 to 2:**

| Finding | As written | Corrected verdict |
|---|---|---|
| **A5-01** Unsigned Twilio webhooks | CRITICAL | **CONFIRMED critical** — genuinely exploitable. |
| **A8-01** Committed FAL API key | CRITICAL | **CONFIRMED critical** — rotate + purge history now. |
| **A1-03** "No access control on `/ops`/`/jeff`" | CRITICAL | **REFUTED** — `proxy.ts` gates `/ops`; Jeff routes gated by the tool factory. |
| **A4-01** "Entire ops/CRM API namespace unauthenticated" | CRITICAL | **OVERSTATED → downgrade to MEDIUM** and reframe (below). |

**The real, residual access-control issue (still worth fixing, but not critical):** authorization is split across **two independent mechanisms** — a hand-maintained prefix **allowlist** in `proxy.ts` and the Jeff tool-secret factory — with no single enforced boundary. That is fragile by omission: any *new* `/api/al/wrenchready/*` prefix, or any non-factory Jeff route (e.g. `messages`, `photos/upload`, `files/[jobId]`, `location/check-in`) that forgets to call `app-auth`, is silently public. Additionally, the `proxy.ts` Basic-auth password check uses a non-constant-time `Array.includes` comparison (`src/proxy.ts:104`), unlike the timing-safe PIN/tool paths. **Recommended fix:** invert to default-deny (gate everything except an explicit public allowlist of webhooks + customer-token routes), make the password compare timing-safe, and add a test asserting every CRM/Jeff route requires auth.

Everything else in this report (the data-integrity / persistence races, the Stripe webhook coverage gap, the unmigrated multi-tenant DB, the UI/UX findings) stands as written and was not affected by this reconciliation. Treat the section-level severity on A1-03 and A4-01 as superseded by this note.

> **Follow-up completed:** a live rendered / on-device UI pass was subsequently run (`next dev`, real browser, desktop + mobile) — see **[LIVE_UI_PASS_2026-06-19.md](./LIVE_UI_PASS_2026-06-19.md)**. It **confirmed** the brand-color bug (A13-01: 132 broken tokens on the homepage; `bg-[--wr-blue]/10` renders transparent) and the form-a11y/SMS-consent gap (A10-01: 9 fields, 0 labels), and **refuted at runtime** the access-control criticals (`/ops` and the ops API both return 401 unauthenticated).

---

## Executive Summary

WrenchReady is a Next.js 16 App Router platform built to run a mobile-mechanic dispatch service company end to end — the "ultimate assistant for techs and office" — and to carry that operation from a founder-plus-one cadence up to roughly seven technicians. It is unusually ambitious for its size: three named domain engines (the **promise-crm** dispatch system of record, the **jeff-field-assistant** AI voice/text co-pilot for technicians, and a **scheduling** engine with real timezone math), a public marketing site engineered for conversion and SEO, an internal ops cockpit, and customer-facing payment surfaces — all in one repository wired to Supabase, Stripe, Twilio, Vapi, and Google Workspace.

The overall maturity verdict is **promising but pre-production for the money- and PII-bearing paths**. This is a design-forward, product-literate founder build: the *thinking* is consistently good — the domain is modeled with real care, the authority guardrails that matter most (Jeff cannot purchase parts, cannot create payment links from a draft, cannot credit a job without a provable Stripe match) are enforced in code rather than prose, and the marketing surface is genuinely polished. But the *substrate* underneath that thinking is uneven. The system of record persists its entire promise aggregate as prefix-encoded strings inside one free-text `notes` JSONB array, mutated by unguarded read-modify-write with no concurrency control — a design that makes lost updates structurally guaranteed precisely under the concurrent-writer load (techs + Jeff + payment webhooks) the product is built to reach.

The single most important **strength** is the **discipline of the code-enforced boundaries**. TypeScript strict is on with no build-error suppression, `any` is effectively absent, all `JSON.parse` sites are guarded, and the engine dependency graph is acyclic and facade-enforced. Most importantly, the highest-stakes authority and money rules in Jeff and in the Stripe reconciliation path are enforced mechanically and backed by a red-team harness — the team demonstrably knows how to put a hard wall where it counts.

The single most important **risk** is **data integrity and access control on the operations and money paths**. Verified live, the WrenchReady tables run on a shared multi-tenant Supabase project with RLS enabled but **zero policies** — authz is the service-role key alone — the Promise-CRM core tables have **no checked-in migration** (hand-edited live schema), inbound Twilio webhooks accept **unsigned, forgeable** requests that can inject records and relay outbound SMS from the business line, and a live FAL API key is **committed to git**. These are not stylistic debts; they are correctness, security, and data-integrity blockers that should gate any expansion to seven technicians.

Net: WrenchReady has the bones of a strong product and a team capable of doing the hard parts right (it does several of them right today). It is held back by a concentrated set of foundational persistence and security decisions that are individually fixable but collectively load-bearing. The remediation path is clear and front-loaded — close the four critical findings and the data-integrity races first, then pay down the monolith/test debt, then build the multi-tech scale features the owner model currently cannot even represent.

---

## Overall Scorecard

| Dimension | Score (/10) | One-line assessment |
|---|---|---|
| 1. Architecture & Module Structure | 7 | Cleanly decomposed, facade-enforced engines, undone by god-files and a missing access-control layer. |
| 2. Jeff AI Field-Assistant Subsystem | 6.5 | Excellent code-enforced authority guardrails atop divergent, undertested, untested-monolith plumbing. |
| 3. Promise-CRM Dispatch Engine | 5 | Beautiful type model, foundationally weak persistence (notes-blob + lost updates, no tests). |
| 4. API Route Design & Backend Contracts | 5 | Consistent shapes and a strong Jeff factory, but the ops CRM namespace is unauthenticated. |
| 5. Third-Party Integrations | 5.5 | Happy path competent (Stripe, Google), but unsigned Twilio and no timeouts/retries. |
| 6. Data Layer, Persistence & Scheduling | 4.5 | Strong Jeff tables and DST-safe scheduling; CRM is unmigrated, race-prone, multi-tenant, RLS-without-policies. |
| 7. Code Cleanliness & TypeScript Quality | 6.5 | Top-decile type safety; real DRY/monolith debt and no schema validation or logging. |
| 8. Build, Tooling, Config & Developer Experience | 5 | Sane build gates; no CI, no unit tests, env sprawl, and a committed live secret. |
| 9. Security & Access Control | 6.5 | Real `proxy.ts` gate + timing-safe auth; live exposures are unsigned Twilio and zero rate limiting. |
| 10. UI/UX — Public Marketing Site | 7 | The most polished surface; undercut by unlabeled intake form and no reduced-motion fallback. |
| 11. UI/UX — Internal Ops Cockpit (/ops) | 5 | Good operator instincts; no shared shell and an owner model that cannot represent 7 techs. |
| 12. UI/UX — Field (Jeff) & Customer Surfaces | 6 | Genuinely mobile-first; zero offline resilience and base64 photo path over cellular. |
| 13. Design System, Component Library & Accessibility | 5 | Cohesive visual language; a Tailwind v4 bug strips brand color and the primitive library is dead code. |

**Composite (weighted) score: 5.8 / 10 — Grade: C+.**

*Weighting rationale:* correctness/security/data-integrity dimensions and the core domain engines were weighted ~1.5× (Architecture, Jeff, Promise-CRM, Data/Persistence, Security), the contract layer ~1.25× (API), and peripheral surfaces (Build/DX, the three UI/UX surfaces, Design System) ~0.75–1.0×, because for a system of record handling money, PII, and dispatch, a data-integrity flaw outweighs a styling gap. Under that weighting the strong type-safety and boundary discipline cannot fully offset the foundational persistence and access-control risks, which is why the composite lands in the upper-C band rather than the B range the marketing site alone might suggest.

---

## Top Findings (Prioritized & Verified)

> Drawn from across all 13 dimensions, ranked by verified severity and blast radius. All items below were confirmed (or severity-adjusted) by the adversarial verification pass; refuted items are excluded.

1. **[CRITICAL] Inbound Twilio webhooks accept unsigned, forgeable requests** — `src/app/api/twilio/sms/route.ts:91-141` (A5-01 / A9-01). A spoofed inbound can inject CRM records and relay real outbound SMS from the business line; fix by validating `X-Twilio-Signature` on every `twilio/*` route and rejecting 403 on mismatch.
2. **[CRITICAL] Entire `/api/al/wrenchready/*` ops/CRM namespace is unauthenticated and browser-reachable** — `src/app/api/al/wrenchready/promises/route.ts:11,100` (A4-01). Anonymous callers can read and mutate the system of record; fix by gating all ops routes (and pages) behind session/PIN middleware, excluding only webhooks and customer-token routes.
3. **[CRITICAL] No access-control layer on `/ops` or `/jeff` page surfaces** — `next.config.ts:17-74`; absent `src/middleware.ts`/`ops/layout.tsx` (A1-03). PII-bearing surfaces depend on 45 independent decisions instead of one boundary; fix with a single authenticating gate (now partially addressed by `src/proxy.ts` per A9, but the API namespace remains open).
4. **[CRITICAL] Live FAL API key hardcoded in committed Python scripts (also in git HEAD)** — `composite-and-submit.py:44` (A8-01). A working credential is exposed in history; rotate immediately, move to env, purge history with `git filter-repo`, and add a secret scanner to CI.
5. **[HIGH] Read-modify-write on the promise notes blob has no concurrency control — lost updates are structurally guaranteed** — `src/lib/promise-crm/storage.ts:2227` / `storage.ts:2300` (A3-02 / A6-04). Concurrent writers silently overwrite each other; fix with optimistic concurrency (`updated_at`/version guard, retry on zero rows) or atomic DB-side merge.
6. **[HIGH] Entire promise aggregate persisted as prefix-encoded strings inside one `notes` JSONB array** — `src/lib/promise-crm/storage.ts:2335` (A3-01 / A6-05 / A7-05). Money/approval/closeout state is unqueryable and merge-order-fragile; promote high-value sub-objects to real columns/child tables.
7. **[HIGH] RLS enabled on every table but zero policies exist; WrenchReady shares a multi-tenant database** — `supabase/migrations/...jeff_field_event.sql:58` and shared project `tsisorwqxmizndrcidub` (A6-01 / A6-02). The only authz is the service-role key with no tenant isolation; move to a dedicated project/role and add explicit policies (or a CI-asserted server-only model).
8. **[HIGH] Promise-CRM core tables have no migration — schema drift on a hand-edited DB** — `src/lib/promise-crm/storage.ts:864` (A6-03, verified, held at high). 51 live rows with no checked-in DDL; reverse-engineer migrations via `supabase db pull` and forbid dashboard DDL.
9. **[HIGH] Stripe webhook only handles `checkout.session.completed`** — `src/app/api/webhook/stripe/route.ts:34` (A5-02). Async settlements, refunds, and disputes never update job state, silently desyncing balances; add the async/refund/dispute handlers or restrict to synchronous payment methods.
10. **[HIGH] Ops checkout-link route creates Stripe sessions and mutates payment state with no auth** — `src/app/api/al/wrenchready/promises/[id]/checkout-link/route.ts:26-145` (A5-04). An open money-path endpoint; gate it behind the operator auth used elsewhere.
11. **[HIGH] No timeout or retry on any outbound integration fetch** — `src/lib/google-workspace.ts:223` (A5-03). A slow upstream hangs the serverless invocation; wrap outbound fetch in `AbortSignal.timeout(~8s)` with bounded retry and move side-channel webhooks off the response path.
12. **[HIGH] No rate limiting or bot defense on any public write endpoint** — `src/app/api/appointments/route.ts:248` (A4-05 / A9-02). Paid-API ingress and the public booking form are abuse-open; add per-IP/per-token rate limiting and a Turnstile/hCaptcha check.
13. **[HIGH] Tailwind v4 bare-variable shorthand silently strips brand color from 304 class usages across 27 files** — `src/components/home-page.tsx:111-117` (A13-01). The homepage and customer checkout render with missing brand color; codemod `-[--wr-(x)]` to `-[var(--wr-x)]` and add a CI guard.
14. **[HIGH] Primary homepage intake form has no `<label>` elements and no SMS consent** — `src/components/home-page.tsx:526-618` (A10-01). Accessibility and compliance gap on the busiest conversion surface; add hidden labels, port the consent checkbox, and extract one shared intake component.
15. **[HIGH] Owner model is hardcoded to two named people at the type level — cockpit cannot represent 7 techs** — `src/lib/promise-crm/types.ts:3` (A11-01). The product's stated scaling goal is unrepresentable as built; replace the literal union with a data-loaded Technician entity.

---

## Biggest Strengths

- **Code-enforced authority guardrails in Jeff** (Dim 2): purchase/reserve is hard-blocked, quote drafts cannot create payment links or customer sends, and Stripe reconciliation refuses to touch the CRM unless the payment provably maps to the job — all asserted by a red-team harness.
- **Single-source-of-truth enforced in code, not docs** (Dim 1): `getPromiseRecords()` throws when Supabase is down and demo/in-memory paths are gated behind an explicit flag, so production reads fail closed.
- **Top-decile TypeScript hygiene** (Dim 7): strict mode on, no build-error suppression, effectively zero `any`/`@ts-ignore`/`eslint-disable`, all 22 `JSON.parse` sites guarded, and no empty catch blocks across ~62K LOC.
- **Disciplined, coherent domain model** (Dim 3): board status, execution stage, and commercial outcome are modeled as distinct closed unions, with a pure, trivially-testable read-model snapshot layer on top.
- **Correct, idempotent Stripe webhook** (Dim 5 / Dim 9): signature verified against the raw body, fails closed without the secret, and dedupes on `lastPaymentReference` so redelivered events never double-credit.
- **Strong, declaratively-constrained Jeff data layer** (Dim 6): rich CHECK constraints, partial indexes, a unique partial index on `call_id`, FK cascades, and a fail-safe dual-write mirror — verified live.
- **A genuine Next 16 edge gate plus timing-safe auth** (Dim 9): `src/proxy.ts` Basic-auth-protects `/ops` and listed CRM APIs, primary auth paths use `crypto.timingSafeEqual`, and the public status page is deliberately PII-minimized with high-entropy tokens.
- **Conversion- and SEO-literate marketing site** (Dim 10): on-brand evidence-led copy, layered JSON-LD with cross-linked `@id`s, optimized hero media, and honest screening-branched success messaging.

---

## Remediation Roadmap

### Now (this week — correctness / security / data-integrity blockers)
- Rotate and purge the committed FAL key; add a secret scanner to pre-commit/CI (A8-01).
- Add `X-Twilio-Signature` validation to every `twilio/*` route, 403 on mismatch (A5-01 / A9-01).
- Put the entire `/api/al/wrenchready/*` ops namespace and the ops checkout-link route behind operator auth (A4-01 / A5-04); extend `proxy.ts` matchers to the API routes.
- Add optimistic-concurrency guards to all promise read-modify-write paths to stop guaranteed lost updates (A3-02 / A6-04).
- Close the RLS-without-policies / multi-tenant DB exposure: move to a dedicated project or add explicit policies + a CI assertion (A6-01 / A6-02).
- Reverse-engineer the unmigrated Promise-CRM schema into checked-in migrations (A6-03).
- Add async-payment / refund / dispute handling and currency validation to the Stripe webhook (A5-02 / A5-05).
- Add rate limiting + bot defense on public write ingress (A4-05 / A9-02); add outbound fetch timeouts/retries (A5-03).

### Next (this month — debt, decomposition, test coverage)
- Adopt a schema-validation library (Zod) at every untrusted boundary — API bodies, Vapi payloads, prefixed-note decoders — replacing the ~600-line hand guard (A4-03 / A7-04).
- Decompose the god-files: `tools.ts` (5,765 LOC) and `storage.ts` (4,029 LOC) into capability barrels; split the 2,425-LOC / 120-`useState` promise form (A1-01 / A1-02 / A7-01 / A11-03).
- Stand up a unit-test framework (vitest) over pure money/state/encode-decode logic, plus CI (`tsc` → lint → gitleaks → smoke) (A8-02 / A8-03 / A3-07).
- Unify Jeff's voice/text dispatch on LLM function-calling and add per-handler error isolation (A2-02 / A2-04).
- Add structured logging and error monitoring; consolidate the ~18 `formatCurrency` and ~9 `isObject` copies into shared utils (A7-06 / A7-02 / A7-03).
- Fix the Tailwind v4 brand-color shorthand and resolve the dead-vs-adopted primitive library + reduced-motion / contrast a11y gaps (A13-01 / A13-02 / A13-03 / A13-05 / A10-02).

### Later (scale-readiness for 7 techs)
- Replace the two-person owner union with a Technician roster entity and add per-tech grouping/filtering across the field and tomorrow dashboards (A11-01).
- Add a shared ops shell with persistent nav, live counts, loading/error boundaries, and live refresh across the ~20 dashboards (A11-02 / A11-06 / A11-07).
- Persist structured per-technician time windows and consider a DB-level `tstzrange EXCLUDE` constraint so double-booking is impossible at the data layer (A6-06).
- Add offline/slow-network resilience (service worker + retry outbox) and move in-chat photos off base64-in-JSON to presigned direct upload for field use over cellular (A12-01 / A12-02).
- Promote the remaining notes-encoded record families to first-class columns/tables and enable `noUncheckedIndexedAccess` (A6-05 / A7-08).

---

## Coverage & Method Notes

- **UI/UX sections (10–13) are static code review.** Findings on layout, touch targets, contrast, motion, and rendered brand-color breakage were derived by reading source and design tokens, not by observing the running app. A **live rendered / on-device pass is a recommended follow-up** — particularly to confirm the Tailwind v4 color-stripping blast radius (A13-01) on the homepage and customer checkout, the sub-44px touch targets and iOS input-zoom risk on the field surfaces (A12-03), and the LCP/reduced-motion behavior (A10-02).
- **Adversarial verification was applied to high-severity findings.** Critical/high items were independently re-checked rather than taken at face value; this pass **refuted** the "no middleware" alarm (Next 16's `proxy.ts` is a real gate, A9) and **down-graded** several findings on closer inspection (e.g. Jeff's safety guardrails A2-01 high→medium, the monolith decomposition A7-01 high→medium), while **confirming** the data-integrity and webhook-signature findings. The post-verification severity tally is **4 critical, 26 high, 40 medium, 28 low, 2 info**.
- **Areas warranting deeper inspection:** (1) the live Supabase tenancy and RLS posture deserve a dedicated security review beyond the code-level confirmation; (2) Jeff's *model behavior* (as opposed to its plumbing) is only checked by a post-hoc keyword reviewer — a live-model eval harness is needed to validate the prompt-only safety guardrails (A2-01 / A2-06); (3) payment-state edge cases (async settlement, refunds, disputes, currency) merit end-to-end testing against Stripe test mode once handlers exist.

---

## How to Read This Report

This document is the front matter. Each numbered section that follows is a self-contained, senior-depth review of one dimension, with a narrative assessment, an enumerated strengths list, and structured findings. **Findings carry stable IDs** of the form `A<dimension>-<n>` (e.g. `A3-02` = Promise-CRM, finding 2); the Top Findings list and Remediation Roadmap above reference those IDs so you can trace any prioritized item back to its full write-up — file/line location, impact, and recommended fix — in the relevant section. Severity tags (`critical` / `high` / `medium` / `low` / `info`) reflect the **post-verification** severity; where verification adjusted a severity, the section notes both the original and corrected value. Locations are given as `file:line` against the repository as reviewed. Read the Executive Summary and Scorecard for the verdict, the Top Findings and Roadmap for what to do, and the individual sections when you need the evidence behind a call.

## Section Index

1. [Architecture & Module Structure](./01-architecture.md)
2. [Jeff AI Field-Assistant Subsystem](./02-jeff-subsystem.md)
3. [Promise-CRM Dispatch Engine](./03-promise-crm.md)
4. [API Route Design & Backend Contracts](./04-api-routes.md)
5. [Third-Party Integrations](./05-integrations.md)
6. [Data Layer, Persistence & Scheduling](./06-data-persistence.md)
7. [Code Cleanliness & TypeScript Quality](./07-code-cleanliness.md)
8. [Build, Tooling, Config & Developer Experience](./08-build-tooling-config.md)
9. [Security & Access Control](./09-security.md)
10. [UI/UX — Public Marketing Site](./10-ui-marketing.md)
11. [UI/UX — Internal Ops Cockpit (/ops)](./11-ui-ops-console.md)
12. [UI/UX — Field (Jeff) & Customer Surfaces](./12-ui-field-customer.md)
13. [Design System, Component Library & Accessibility](./13-design-system-a11y.md)


<div style="page-break-after: always;"></div>

---

## 1. Architecture & Module Structure

**Verdict.** WrenchReady is a competently decomposed Next.js App Router monolith with three clearly-named domain engines, a disciplined store boundary (Supabase as single source of truth, demo/in-memory strictly opt-in), and clean one-directional dependencies between engines — genuinely better layering than most startups at this stage. It is held back by a handful of god-files that quietly absorb 8+ concerns each (`tools.ts` 5,765 LOC, `storage.ts` 4,029 LOC), an inconsistent `/api` URL taxonomy, a flat 38-file component bucket, and one real store-drift hazard in Jeff's bidirectional local mirror. The decomposition will scale to 7 techs functionally, but the monoliths and the total absence of an access-control layer on `/ops` are the load-bearing risks.

**Score: 7/10**

### What's here

The system is a single Next.js 16 App Router application (no microservices, no separate API server) organized into four web surfaces plus an API tree, sitting on three domain libraries.

```
                       ┌───────────────────────── src/app (App Router) ─────────────────────────┐
  PUBLIC / MARKETING   │  (ads)/lp/*  services/*  locations/*  tools/*  contact  page.tsx         │
  OPS COCKPIT          │  /ops/* (promises, inbound, follow-through, collections, jeff, ...)      │
  FIELD APP (tech)     │  /jeff, /jeff/messages, /jeff/photo-drop, /j                             │
  CUSTOMER SURFACE     │  /status/[token]                                                         │
  API TREE             │  /api/al/wrenchready/*   /api/wrenchready/status/*   /api/twilio/*        │
                       │  /api/scheduling  /api/appointments  /api/webhook/stripe                 │
                       └───────────────┬──────────────────────┬──────────────────────┬───────────┘
                                       │ server components     │ route handlers       │
                                       ▼ call lib directly     ▼ orchestrate libs     ▼
        ┌───────────────────────── src/lib (domain engines) ──────────────────────────┐
        │                                                                              │
        │   jeff-field-assistant/ ──────────► promise-crm/ ◄────────── scheduling/     │
        │   (AI assistant, ~16K LOC)          (CRM/dispatch, ~14K LOC)  (availability)  │
        │     index.ts  (barrel)                server.ts (barrel)        engine.ts     │
        │     tools.ts 5765  vapi-server 1831   storage.ts 4029           config.ts     │
        │     persistence.ts 1393               types.ts 1337             types.ts      │
        │     session/app-chat/email-ingest     + 30 domain submodules                  │
        │           │                                  │                                │
        │           └──────────► promise-crm/supabase.ts ◄──── (shared REST client)     │
        └──────────────────────────────────┬───────────────────────────────────────────┘
                                            ▼
                            Supabase (REST/PostgREST)  ── SoT
                            .data/jeff or os.tmpdir()  ── local mirror / pilot fallback
                            mock-data.ts               ── demo fallback (opt-in flag only)
                  External: Stripe · Twilio · Google Workspace · Vapi · Resend · Slack · Maps
```

**Engine boundaries.** Three libraries with explicit barrels:
- `promise-crm/server.ts` (`src/lib/promise-crm/server.ts:1`) is a 40-line facade re-exporting the storage + submodule surface. **41** app/component files import the engine and **0** reach into `storage.ts` directly (verified by grep) — the boundary is real.
- `jeff-field-assistant/index.ts` (`src/lib/jeff-field-assistant/index.ts:1`) is a similar barrel; **27** of 27 tool routes import through it.
- `scheduling/` is a leaf-ish shared service consumed by `/api/scheduling`, `/api/appointments`, and `jeff/tools.ts`.

**Dependency direction (verified):** `jeff-field-assistant → promise-crm` (7 import sites), `scheduling → promise-crm/server`, `jeff → scheduling`. Critically, **`promise-crm` imports nothing from `jeff-field-assistant`** (grep returns empty) — there is no cycle, and the lower-level CRM stays independent of the higher-level assistant. This is the single best structural property of the codebase.

**Store boundary.** `promise-crm/storage.ts` resolves reads/writes through `hasPromiseCrmSupabase()` (`src/lib/promise-crm/supabase.ts:42`); when Supabase is absent it throws `crmUnavailable` unless `WR_ENABLE_PROMISE_CRM_DEMO_FALLBACK === "true"` (`src/lib/promise-crm/storage.ts:302`). The in-memory `globalThis.__wrenchreadyPromiseCrmState` (`storage.ts:348`) and `mock-data.ts` are reachable **only** behind that flag. So the "three competing memories" the team worried about (mock vs Supabase vs CRM) is, for the CRM path, actually fail-closed by default.

### Strengths

- **Single-source-of-truth is enforced in code, not just docs.** `getPromiseRecords()` throws rather than silently serving stale mock data when Supabase is down (`src/lib/promise-crm/storage.ts:892-906`), and the demo path is gated on an explicit env flag (`storage.ts:302-303`). The Promise Board page even renders a hard "Promise CRM unavailable… not showing demo or fallback data" error state instead of degrading (`src/app/ops/promises/page.tsx:25-44`). This directly answers the drift-checks in `docs/planning/WRENCHREADY_SINGLE_SOURCE_OF_TRUTH.md:98`.
- **Acyclic, one-directional engine graph.** `promise-crm` has zero imports from `jeff-field-assistant`; the assistant depends on the CRM and not vice-versa (verified by grep). Layering is respected end-to-end.
- **App never reaches past the facade.** 0 of 41 CRM consumers import `storage.ts` directly; all go through `server.ts`. Same for the Jeff tool routes via `index.ts`.
- **Thin, uniform route handlers via a factory.** `createJeffToolRoute` (`src/lib/jeff-field-assistant/route-handler.ts:6`) centralizes auth + JSON parsing + error shaping, so all 27 tool routes collapse to ~4 lines (e.g. `src/app/api/al/wrenchready/jeff/tools/get-active-field-job/route.ts:5`). Business logic stays in lib; routes stay trivial.
- **Clean data flow in server components.** Pages are async server components that call lib functions directly (`src/app/ops/promises/page.tsx:15`, `src/app/status/[token]/page.tsx:25`) rather than fetching their own API — no needless self-HTTP hop, correct App Router idiom.
- **Centralized, defensive config reader.** `readEnv(...keys)` (`src/lib/env.ts:13`) trims, strips wrapping quotes, and supports ordered key fallbacks (e.g. `SUPABASE_SERVICE_ROLE_KEY || SUPABASE_SECRET_KEY || anon`), so credential naming drift across Vercel/Supabase doesn't break the app.
- **Runtime-aware local storage.** `getJeffLocalDataRoot()` correctly switches to `os.tmpdir()` on Vercel and reports `durableAcrossDeployments: false` (`src/lib/jeff-field-assistant/local-data.ts:13-28`) — the ephemerality is at least acknowledged in code.

### Findings

**1. `tools.ts` (5,765 LOC) is a god-module spanning 8+ unrelated concerns**
- **Severity:** High
- **Location:** `src/lib/jeff-field-assistant/tools.ts:1` (37 exported functions)
- **Evidence:** A single file exports request authorization (`authorizeJeffToolRequest`), file retrieval (`getJeffFieldFiles`), review queues (`getJeffMemoryReviewQueue`, `getJeffWorkspaceReviewQueue`), capabilities/knowledge (`getJeffCapabilities`, `searchWrenchReadyKnowledge`), field context (`getActiveFieldJob`, `getFieldBrief`), photo analysis (`analyzeFieldPhoto`), Gmail/Calendar sync (`syncJeffGmailInbox`, `syncJeffCalendar`), quoting (`prepareQuoteDraftForReview`), payments (`checkStripePaymentStatus`), parts (`preparePartsCartForSimon`, `purchaseOrReservePartBlocked`), and Vapi schema generation (`getJeffVapiToolSchemas`). The `index.ts` barrel re-exports ~30 of these from this one file (`src/lib/jeff-field-assistant/index.ts:1-34`).
- **Why it matters:** A 5.7K-LOC file with this many axes of change is a merge-conflict magnet and an onboarding wall. With 7 techs and an office team iterating, multiple concerns will be edited concurrently in one file. It also defeats tree-shaking and makes the auth function (`authorizeJeffToolRequest`) — a security-critical primitive — live in the same blast radius as photo-analysis prompt glue.
- **Recommendation:** Split along the concern seams into `tools/auth.ts`, `tools/field-context.ts`, `tools/photos.ts`, `tools/google-sync.ts`, `tools/quoting.ts`, `tools/parts.ts`, `tools/vapi-schemas.ts`, keeping `index.ts` as the stable public barrel so no call sites change.

**2. `storage.ts` (4,029 LOC) conflates the data-access layer with domain merge logic**
- **Severity:** High
- **Location:** `src/lib/promise-crm/storage.ts:1`
- **Evidence:** The file's import header alone pulls in ~15 domain submodules (closeout-recapture, economics, quote-packet, execution-ops, readiness, customer-access, follow-through, etc. — `storage.ts:1-77`) and the file interleaves Supabase row mapping (`mapInboundRow` `:394`, `mapPromiseRow`), the in-memory runtime state (`getRuntimeState` `:348`), demo fallbacks (`:311-317`), and ~30 read/write orchestration functions. Persistence concerns (PostgREST row shapes) and business reconciliation (`reconcilePromiseRecord`) live in the same module.
- **Why it matters:** The persistence layer cannot be swapped or unit-tested in isolation because domain merge logic is welded to the REST mapping. Every new promise field touches the row types, the mapper, and the update orchestrator in one place. This is the file the team flagged as highest-risk, and the diagnosis (missing module boundary) is correct.
- **Recommendation:** Extract a `promise-crm/repository.ts` (pure Supabase row<->domain mapping + REST calls) and keep `storage.ts` as the orchestration layer that composes the repository with the already-well-factored submodules. The submodules prove the team can decompose; the storage god-file is the one place they didn't.

**3. No access-control layer on `/ops` or `/jeff` web surfaces (no middleware, no layout gate)**
- **Severity:** Critical
- **Location:** `next.config.ts:17-74`; absence of `src/middleware.ts` and `src/app/ops/layout.tsx` (verified: only `(ads)`, `hero-review`, and root `layout.tsx` exist)
- **Evidence:** `/ops` and `/jeff` get only an `X-Robots-Tag: noindex` header (`next.config.ts:20-72`). `ops/page.tsx` simply `redirect("/ops/promises")` with no auth (`src/app/ops/page.tsx:1`), and `ops/promises/page.tsx` calls `getPromiseBoardSnapshot()` directly with no PIN/session/cookie check (`src/app/ops/promises/page.tsx:15`). Grep for `authoriz|getSession|cookies()` across `src/app/ops` returns nothing. The PIN check (`authorizeJeffFieldAppRequest`, `src/lib/jeff-field-assistant/app-auth.ts:30`) protects only the Jeff *API* routes, not the rendered `/ops` pages.
- **Why it matters:** The entire dispatch cockpit — customer names, phones, addresses, economics, payment state — is server-rendered to anyone who knows the URL. This is an architecture-level gap (there is no place in the layering where authz is centralized), which is precisely why a per-route patchwork has holes. The security section owns depth; the architectural point is that an App Router app handling PII needs either `middleware.ts` or an authenticating `layout.tsx` boundary, and has neither.
- **Recommendation:** Introduce `src/middleware.ts` (or an authenticating `ops/layout.tsx` + `jeff/layout.tsx`) that enforces a session/PIN for all `/ops/*` and `/jeff/*` page routes, so access control is a structural boundary rather than 45 independent decisions.

**4. Jeff's bidirectional local mirror is a store-drift vector on Vercel**
- **Severity:** Medium
- **Location:** `src/lib/jeff-field-assistant/persistence.ts:1010-1061` (`syncJeffFieldEventMirror`), read path `:1102-1110`
- **Evidence:** Even when Supabase is the source of truth, `listPersistedJeffFieldEvents` syncs Supabase→local and then **returns the local mirror** (`persistence.ts:1108`), and `syncJeffFieldEventMirror` pushes *every* local-only event up to Supabase (`:1029,:1037`). On Vercel the mirror lives in `os.tmpdir()` (`local-data.ts:13`), which is per-lambda-instance and ephemeral. So instance A's tmp can hold events instance B never sees, and the "push all local-only events" logic can resurrect or duplicate records depending on which warm instance serves the request.
- **Why it matters:** This is exactly the "competing memories" failure the SoT doc warns about (`docs/planning/WRENCHREADY_SINGLE_SOURCE_OF_TRUTH.md:104-106`). Reading the mirror instead of Supabase when Supabase is configured means field-event reads are non-deterministic across serverless instances.
- **Recommendation:** When `hasPromiseCrmSupabase()` is true, read straight from Supabase and treat the local file as write-through cache only (never the read source, never a push origin). Reserve the bidirectional mirror for the genuinely offline/no-Supabase pilot case.

**5. Inconsistent `/api` URL taxonomy makes the API tree hard to reason about**
- **Severity:** Low
- **Location:** `src/app/api/*` (six top-level groups: `al`, `appointments`, `scheduling`, `twilio`, `webhook`, `wrenchready`)
- **Evidence:** Internal Jeff/CRM endpoints live under `/api/al/wrenchready/*`, customer-facing status under `/api/wrenchready/status/*`, while `/api/appointments`, `/api/scheduling`, `/api/twilio/*`, and `/api/webhook/stripe` sit at the root. The `al/wrenchready` prefix (an org/tenant artifact) appears on internal routes but not on the equally-internal `/api/twilio` or `/api/scheduling`.
- **Why it matters:** With no middleware, the URL prefix is the only signal of a route's trust tier (public vs operator vs webhook), yet the prefixes don't encode that consistently. It complicates writing a single matcher when authz is eventually added, and raises the cognitive cost of the 73-route tree.
- **Recommendation:** Normalize to trust-tier-prefixed groups (e.g. `/api/internal/*`, `/api/public/*`, `/api/webhooks/*`) so a future `middleware.ts` matcher and the reader both get the boundary for free.

**6. Shared Supabase client is misplaced inside the CRM engine**
- **Severity:** Low
- **Location:** `src/lib/promise-crm/supabase.ts:68` (`supabaseRestRequest`)
- **Evidence:** The generic Supabase REST primitive is imported by `jeff-field-assistant/persistence.ts:3` and `jeff-field-assistant/media.ts` as well as the CRM's own modules. So the assistant engine depends on a file *named* and *folder-scoped* as if it were CRM-private.
- **Why it matters:** It muddies the otherwise-clean engine boundary: a reader can't tell from the import graph that `supabase.ts` is shared infrastructure rather than a CRM internal, and a future CRM refactor could accidentally break Jeff.
- **Recommendation:** Promote it to `src/lib/supabase.ts` (or `src/lib/data/supabase.ts`) as explicit shared infrastructure; both engines import the same neutral module.

**7. Flat 38-file component bucket with no surface grouping**
- **Severity:** Low
- **Location:** `src/components/*.tsx` (38 files at the top level, plus `ui/` and `motion/`)
- **Evidence:** `home-page.tsx`, `marketing.tsx`, `promise-board.tsx`, `promise-status-form.tsx` (2,425 LOC), `customer-promise-approval.tsx`, `jeff-photo-drop-form.tsx`, and ~25 `*-action-form.tsx` operator forms all sit side-by-side in one directory with no `ops/`, `customer/`, `jeff/`, or `marketing/` subfolders, even though the rest of the app (routes, libs) is cleanly grouped by surface.
- **Why it matters:** The foldering coherence that's strong at the route/lib level breaks down here; it's harder to see which components belong to the access-controlled ops surface vs the public marketing surface — the same trust-tier ambiguity as finding #5, at the component layer.
- **Recommendation:** Group components by surface (`components/ops/`, `components/customer/`, `components/jeff/`, `components/marketing/`) mirroring the route groups.

### Score rationale

A 7 reflects a codebase whose *macro* architecture is clearly above its life stage: three well-named engines with an acyclic, one-directional dependency graph; an enforced facade boundary (0/41 consumers bypass it); a fail-closed single-source-of-truth that the team explicitly worried about and actually solved in code; thin factory-generated route handlers; and correct App Router server-component data flow. Those are not accidents — they're deliberate, verifiable structure.

It is not higher because the *micro* architecture has two genuine god-files (`tools.ts`, `storage.ts`) that conflate 8+ concerns and a persistence layer with domain logic, an inconsistent API taxonomy, a flat component bucket, and a real (if bounded) store-drift hazard in Jeff's mirror. It is not lower because none of these are correctness-fatal to the decomposition — they're debt that's localized and refactorable behind the existing barrels. The one finding that drags hardest is structural-but-cross-cutting: there is no architectural seam for access control on `/ops`/`/jeff` (no middleware, no gating layout), which is the kind of missing boundary that a 7-tech scale-up must close before it scales. Fix the two god-files and add the authz boundary and this is an 8.5.


<div style="page-break-after: always;"></div>

---

## 2. Jeff AI Field-Assistant Subsystem

**Verdict.** Jeff is the most ambitious and most carefully-reasoned subsystem in the codebase: a 28-tool surface with a genuinely strong "speak only from tool state, fail closed before money/customer promises" doctrine that is enforced in code at the points that matter most (purchase/reserve is a hard server-side block; quote drafts cannot create payment links or customer sends; Stripe reconciliation refuses to touch the CRM unless the payment provably maps to the job). The design is undermined by two structural problems: the safety guardrails most people would call "guardrails" (don't invent torque specs, don't hard-book, don't reassure on drivability) are **prompt-only**, with the sole code-side check being a *post-hoc keyword reviewer that runs after the call has already ended*; and the voice and text paths use **two completely different tool-dispatch mechanisms** (Vapi function-calling vs. regex intent-matching), which doubles the surface area and means the text "brain" never actually function-calls. Add a 5,765-LOC god-module with zero unit tests and the engineering quality is "impressively disciplined product thinking sitting on fragile, untested plumbing."

**Score: 6.5 / 10**

### What's here

The subsystem is `src/lib/jeff-field-assistant/` (~14.7K LOC across 25 files) plus ~30 thin API routes under `src/app/api/al/wrenchready/jeff/`.

- **Tool surface** — `tools.ts` (5,765 LOC) defines ~25 exported tool functions and the Vapi JSON schema catalog (`getJeffVapiToolSchemas`, `tools.ts:5237`; 28 `name:` schema entries). Each tool returns a uniform discriminated union via `result()` / `blocked()` helpers (`tools.ts:2030`, `tools.ts:2040`): `{ success, tool, assistantSay, data, warnings }`.
- **Voice path** — Vapi posts to `src/app/api/al/wrenchready/jeff/vapi/server/route.ts`, which authorizes then calls `handleJeffVapiServerPayload` (`vapi-server.ts:1740`). `tool-calls` messages dispatch through a static `toolHandlers` map (`vapi-server.ts:113-141`) in `handleToolCalls` (`vapi-server.ts:836`). This is real LLM function-calling.
- **Text path** — `app-chat.ts` (1,447 LOC) does **not** give the model tools. `runMessageActionTools` (`app-chat.ts:725`) pre-runs tools based on regex intent heuristics (`likelyWants*`, `app-chat.ts:523-582`), injects their results as plaintext context (`buildActionContext`, `app-chat.ts:905`), and the OpenAI `/v1/responses` call carries no `tools` array (`app-chat.ts:1235`) — the model only writes prose.
- **Prompt construction** — `prompt.ts` assembles a large static system prompt + `buildJeffOperatingContextPrompt()` (`operating-context.ts:138`, a hand-authored "forced SOP packet") + `jeffCoreMemory` (`memory.ts:1`). `capabilities.ts` produces a live ready/partial/blocked capability report from env/integration probes.
- **Guardrail enforcement** — There is no exported constant named `JEFF_CUSTOMER_CALL_GUARDRAILS`; the guardrails live as prose in `prompt.ts` and `memory.ts`. The only code that inspects model *output* is `reviewJeffTranscript` (`vapi-server.ts:~1600-1730`), a keyword scanner that runs on `end-of-call-report` (`vapi-server.ts:1764`) — i.e. after the call.
- **Testing** — No unit/integration framework (no vitest/jest in `package.json`). Verification is five bespoke `.mjs` scripts that hit a live server (`scripts/verify-jeff-*.mjs`, 1,777 LOC).

### Strengths

- **Money/purchase authority is enforced in code, not just prose.** `purchaseOrReservePartBlocked` (`tools.ts:5187`) unconditionally returns `blocked(...)` with `purchaseStatus: "blocked"` and logs an escalation — there is no code path that buys or reserves. The red-team script asserts this (`verify-jeff-red-team.mjs:145-146`). This is the single most important boundary and it is real.
- **Quote drafts cannot leak into customer-facing money.** `prepareQuoteDraftForReview` (`tools.ts:1568`) blocks on missing facts (`tools.ts:1634`), and when an inferred CRM job already has a customer payment surface it refuses to attach and forks a separate draft (`hasCustomerPaymentSurface` → `targetPromiseId` gate, `tools.ts:1667-1682`). The red-team verifies `paymentLinkCreated === false`, `checkoutUrl === null`, `customerSendStatus === "not-sent"` (`verify-jeff-red-team.mjs:206-208`).
- **Stripe reconciliation is conservative and source-honest.** `stripeCheckCanReconcile` (`tools.ts:619`) only writes the CRM if a *paid* Stripe match provably ties to the job (`stripePaymentMatchesJob`, `tools.ts:608`), and the assistant copy explicitly distinguishes "Stripe shows" from "I did not change the job record because that Stripe reference is not safely tied to this CRM job" (`tools.ts:4392-4398`). It also fails closed when the secret is absent (`tools.ts:4233`).
- **Uniform fail-soft tool contract.** The `result`/`blocked` union (`tools.ts:2030-2058`) means a blocked tool still returns a speakable `assistantSay` and structured `data`, so the model can keep helping rather than crashing. This is the right shape for a voice agent.
- **Diagnostic-tree source-gating is defense-in-depth.** `src/lib/promise-crm/diagnostic-tree.ts` classifies steps into `do-not-advise` (airbag/SRS/HV, `:100-106`) and `licensed-source-required` (torque spec, wiring, pinout, relearn, programming, `:109-124`) *before* the tool returns, and `get_diagnostic_tree` surfaces the first source gate in `assistantSay` (`tools.ts:2914-2921`). The gating exists in data, not only in the prompt.
- **Auth fails closed in production.** `authorizeJeffToolRequest` (`tools.ts:2296`) returns 503 in production when the tool secret is unset, and uses a length-checked `timingSafeEqual` comparison (`secretsMatch`, `tools.ts:520`). Every tool route wraps through `createJeffToolRoute` (`route-handler.ts:6`).
- **Capability honesty.** `capabilities.ts` derives ready/partial/blocked from real integration probes (Stripe secret, Drive upload, Maps key, fresh location) and feeds it to the prompt so Jeff can truthfully say what is wired (`buildJeffCapabilityPromptContext`, `capabilities.ts:377`). This is a thoughtful answer to "don't let the model claim capabilities it doesn't have."

### Findings

**1. Safety guardrails (torque specs, drivability, hard-booking) are prompt-only; the sole code check is post-hoc.**
**Severity: High.**
**Location:** `vapi-server.ts:1655-1698` (reviewer), `vapi-server.ts:1764` (runs on `end-of-call-report`); rules in `prompt.ts:50-53` and `memory.ts:33,40`.
**Evidence:** "Never invent exact manufacturer specs… or torque values" is prose in `prompt.ts:53`. The only output-inspecting code, `reviewJeffTranscript`, scans the transcript for strings like `"torque spec"`, `"appointment is booked"`, `"safe to drive"` (`vapi-server.ts:1657,1678,1692`) and records a `JeffPilotTranscriptReview` issue — but it only runs after the call ends (`shouldReviewTranscript` gates on `end-of-call-report`, `vapi-server.ts:1732-1734`). By then Jeff has already told the customer the wrong torque value or "yes it's booked."
**Why it matters:** For a real dispatch business, the dangerous failure modes are an invented torque spec on a safety-critical fastener, a hard-booked slot that breaks the route, or a drivability reassurance on an unsafe vehicle. None of these are prevented at generation time — only flagged for an operator's later review, and even then only if the exact keyword appears. A model paraphrase ("tighten it to about 80 foot-pounds") evades the substring match entirely.
**Recommendation:** Treat the high-risk guardrails as a real-time gate, not a retro report. Options: (a) require licensed-spec values to come *only* from a `get_diagnostic_tree`/service-data tool result and post-process the model turn to redact numeric specs not present in a tool result; (b) make "booked/confirmed" assertions impossible unless an `evaluate_booking_request` tool returned a confirmed slot in the same turn; (c) at minimum, run the transcript reviewer per-turn (on partial transcripts) so an operator can intervene mid-call. Promote it from a keyword scan to a structured claim-vs-tool-result check.

**2. Voice and text use two divergent tool-dispatch mechanisms; the text brain never function-calls.**
**Severity: High.**
**Location:** `vapi-server.ts:113-141` + `:836-867` (voice: real function-calling) vs. `app-chat.ts:725-845` + `:1235` (text: regex intent + no `tools` array).
**Evidence:** The voice path dispatches whatever tool the LLM calls via `toolHandlers[call.name]`. The text path instead decides tools by brittle regex — e.g. `likelyWantsPurchaseBlocked` is `/\b(buy|order|reserve|cart|purchase|pay for|checkout|pick up|pickup)\b/i` (`app-chat.ts:561-563`), and `buildQuoteDraftPayloadFromText` heuristically reconstructs a quote payload from raw text (`app-chat.ts:774`). The OpenAI request body in `app-chat.ts:1235` carries no `tools`/`tool_choice`; the model only sees pre-computed action results as context (`app-chat.ts:1224`).
**Why it matters:** Every tool's behavior must now be reasoned about twice, and the two paths can diverge silently. The text path systematically under- and over-triggers: a typed "should I just grab the starter on the way?" trips `likelyWantsPurchaseBlocked`, while "I'll swap in the alternator from the van" gets no parts handling because `likelyWantsPartStore` (`app-chat.ts:556`) requires both a part noun and a store/buy verb. Worse, a real intent the regex misses means the *model never gets the tool result and may hallucinate the answer* — exactly the failure the tool architecture exists to prevent. This is the largest maintainability liability in the subsystem.
**Recommendation:** Unify on LLM function-calling for both surfaces. The text path should pass the same schema catalog (`getJeffVapiToolSchemas`) to the responses API and run a tool loop, deleting the `likelyWants*` heuristics. If a fast deterministic pre-pass is wanted for latency, keep it as an *optimization* layered on top of real tool-calling, not the only path.

**3. `tools.ts` is a 5,765-LOC god-module with no unit tests.**
**Severity: Medium.**
**Location:** `src/lib/jeff-field-assistant/tools.ts` (entire file); test gap in `package.json` (no vitest/jest; only `scripts/verify-jeff-*.mjs`).
**Evidence:** One file holds: input normalization, job matching/scoring (`scoreJob`, `tools.ts:802`), Stripe reconciliation math (`reconcilePaymentCollectionFromStripe`, `tools.ts:640`), photo-analysis prompt building, quote-draft assembly, the auth function, *and* the Vapi schema catalog. The only tests are end-to-end `.mjs` scripts that require a running server and live secrets (`verify-jeff-red-team.mjs:76` asserts the secret env var exists before it will run). Pure functions like `stripeCheckCanReconcile`, `factsConflictWithJob` (`tools.ts:1291`), and `jobReferenceConflict` (`tools.ts:1375`) encode real business risk and are completely untested in isolation.
**Why it matters:** The most safety-relevant logic (does this Stripe payment belong to this job? does this quote conflict with the selected job?) is exactly the logic that deserves table-driven unit tests, and it's buried in a file too large to navigate and reachable only through a live HTTP harness. Refactoring is high-risk because nothing fast catches a regression.
**Recommendation:** Decompose by concern: `tools/stripe.ts`, `tools/quote-draft.ts`, `tools/parts.ts`, `tools/job-matching.ts`, `tools/schema.ts`, `tools/auth.ts`. Extract the pure helpers and add a vitest suite covering `stripeCheckCanReconcile`, `reconcilePaymentCollectionFromStripe`, `jobReferenceConflict`, and `factsConflictWithJob` with fixtures. The `result`/`blocked` contract makes these trivially testable.

**4. Per-call tool dispatch has no per-handler error isolation; one throwing tool fails the whole turn.**
**Severity: Medium.**
**Location:** `vapi-server.ts:856` inside the `for` loop of `handleToolCalls` (`:836-867`); outer catch in `vapi/server/route.ts:18-28`.
**Evidence:** `const toolResult = await handler(...)` is awaited with no surrounding try/catch. Most handlers internally return `blocked()` on failure, but ones that call into the CRM (`getActiveFieldJob` → `resolveFieldJob` → `findJob`, or `updatePromiseRecord` inside `checkStripePaymentStatus`/`preparePartsCartForSimon`) can throw if Supabase/CRM access fails. A throw escapes the loop, skips the remaining tool results for that turn, and the route's catch returns a single `{ error }` with HTTP 500 — which Vapi sees as a tool-batch failure rather than per-tool degradation.
**Why it matters:** A transient CRM error during a live customer call turns one failed lookup into a total tool outage for that turn, and the model loses the results of sibling tool calls it may have needed. The system's whole "fail soft, keep helping" philosophy is bypassed at the dispatch layer.
**Recommendation:** Wrap each handler call in try/catch and convert thrown errors into a `blocked(call.name, "…couldn't complete that lookup…", {}, [message])` result, so the batch always returns one result per call. This matches the contract every handler already uses internally.

**5. In-process runtime state for field events/photos is volatile on serverless.**
**Severity: Medium.**
**Location:** `tools.ts:272-289` (`getRuntimeState` on `globalThis.__wrenchreadyJeffFieldState`), used by `saveEvent` (`tools.ts:~2086`, `getRuntimeState().events = [event, ...].slice(0, 500)`).
**Evidence:** Field events and photo analyses are held in a module-global array capped at 500 (`tools.ts` `saveEvent`). On Vercel each lambda instance has its own `globalThis`, and instances are recycled. `saveEvent` does also call `persistJeffFieldEvent`, so there is a durable path, but reads like `getEventsForJob`/`getRecentJeffMessages` that consult `getRuntimeState().events` will see only events created by the *same warm instance*.
**Why it matters:** "Simon, I see the note you just sent" can be true on one instance and false on the next, producing inconsistent recall mid-conversation and undercutting the "a call only counts if facts are saved somewhere Dez can inspect" non-negotiable (`operating-context.ts:64`). The capability report even flags this for the local mirror (`capabilities.ts:347-349`).
**Recommendation:** Make the durable store (Supabase) the read path of record for events/messages within a conversation; treat the in-memory array purely as a best-effort cache, and key reads on the persisted store so behavior is identical across instances.

**6. The "red-team" verification proves plumbing, not model behavior.**
**Severity: Low.**
**Location:** `scripts/verify-jeff-red-team.mjs` (612 LOC).
**Evidence:** Every assertion checks deterministic tool/route behavior — 401s on missing secret (`:79-85`), `purchaseStatus === "blocked"` (`:146`), no payment link (`:206`), no PII in public HTML (`:97,100`). There is no assertion that exercises an actual model turn for hallucinated torque values, fabricated approval, or a drivability promise.
**Why it matters:** The name implies adversarial coverage of Jeff's *reasoning*, but the genuinely AI-specific risks (Finding 1) are untested. The suite gives false confidence that "red-team" passing means the assistant won't invent specs.
**Recommendation:** Add a small eval harness that runs scripted prompts through the live model and asserts on the response (no numeric torque spec without a tool source; "booked" only after a confirmed booking tool result; refusal to assert payment without a Stripe match). Keep it separate from the plumbing checks and run it in CI against a cheap model.

**7. Tool parameters are caller-trusted; `withLiveSessionParameters` only fills gaps.**
**Severity: Low.**
**Location:** `vapi-server.ts:1288-1301`; e.g. `getActiveFieldJob`/`checkStripePaymentStatus` accept `jobId`, `promiseId`, `stripeReference` straight from `call.parameters`.
**Evidence:** `withLiveSessionParameters` merges session-derived `sessionId`/`callId`/`conversationId` but uses `parameters.x || liveSession.x`, so a model- or caller-supplied value wins (`:1297-1299`). All other fields pass through untouched. Since the Vapi server route is authenticated by shared secret, the practical trust boundary is "anything holding the tool secret," but there is no check that, e.g., a `jobId`/`promiseId` argument belongs to the caller's active session before a CRM write (`checkStripePaymentStatus` will reconcile any job whose references match).
**Why it matters:** A confused-deputy / cross-job write is possible if the model is steered (prompt-injected via a customer transcript or a malformed Vapi payload) into passing another job's id. Reconciliation guards mitigate the worst case, but quote drafts and field events are written with weaker job-ownership checks.
**Recommendation:** Where a tool mutates a CRM record, validate the target id against the live session's `activeJobId` (or require an explicit operator-confirmed override), rather than trusting the argument unconditionally.

### Score rationale

The product-level safety reasoning here is genuinely above-average: the money and authority boundaries that would sink a real dispatch business are enforced in code with conservative, source-honest defaults, and the uniform `result`/`blocked` contract plus live capability honesty show a designer who understood the failure modes of LLM agents. That earns real credit and keeps this above the midpoint.

It is held back from a 7-8 by structural debt that is not cosmetic: the marquee "don't hallucinate specs / don't over-promise" guardrails are prompt-only with merely a post-hoc keyword reviewer (Finding 1); the two-headed dispatch architecture means the text path can silently skip tools and let the model freelance (Finding 2); the core logic is an untested 5.7K-LOC monolith (Finding 3); and the dispatch loop lacks the per-tool error isolation the rest of the system is designed around (Finding 4). These are the kinds of gaps that hold at a 7-person pilot scale but become incidents as call volume grows. **6.5/10** reflects strong, deliberate boundary engineering on top of fragile, undertested plumbing.


<div style="page-break-after: always;"></div>

---

## 3. Promise-CRM Dispatch Engine

**Verdict.** The Promise-CRM is the most ambitious subsystem in WrenchReady: a richly-typed domain model (promises, inbound, jobs, quotes, payments, closeout, warranty, recurring accounts, operator tasks) wrapped in a large set of well-factored read-model "snapshot" builders that drive the entire ops UI. The *type-level* domain design is genuinely strong and coherent. The *persistence* design is the opposite: the entire nested promise aggregate is serialized into a single `notes` JSONB string-array via prefix-encoded blobs, mutated through unguarded read-modify-write over PostgREST with no transactions, no optimistic concurrency, and no version column — a lost-update and TOCTOU hazard that gets worse, not better, as you add the 7 techs the business is scaling toward. There are zero automated tests over any of this money- and state-bearing code.

**Score: 5.0 / 10**

### What's here

The directory is ~12.2K LOC across 33 files. Structurally it splits into three layers:

1. **Domain model** — `types.ts` (1,337 LOC) defines ~120 exported types: the `PromiseRecord` aggregate (`types.ts:521`) and `InboundRecord` (`types.ts:490`), plus nested value objects for economics, payment collection, customer approval, warranty, recurring accounts, field-execution packets, quote packets, closeout, and a large family of derived "snapshot" view types.
2. **Persistence + read models** — `storage.ts` (4,029 LOC) is the hub. It owns CRUD (`createPromiseFromInbound`, `updatePromiseRecord`, `createInboundRecord`), the Supabase REST mapping (`mapPromiseRow`/`mapInboundRow`), and ~20 `get*Snapshot`/`get*Worklist` read-model builders. `supabase.ts` is a thin PostgREST client.
3. **Feature modules** — each cross-cutting concern is its own encode/decode + compute module: `economics.ts`, `quote-packet.ts`, `closeout-recapture.ts`, `execution-ops.ts`, `playbooks.ts` (626 LOC of static SOP content), `diagnostic-tree.ts`, `service-policy.ts`, `operating-cadence.ts`, `operator-tasks.ts` (587 LOC), plus `customer-access.ts`, `commercial-outcome.ts`, `follow-through-resolution.ts`, `outbound-*`, `promise-readiness.ts`.

The persistence strategy is "Supabase-or-throw": `getPromiseRecords()` (`storage.ts:892`) reads live from Supabase REST and otherwise throws `crmUnavailable`, unless `WR_ENABLE_PROMISE_CRM_DEMO_FALLBACK=true` (`storage.ts:302`), in which case it merges a `globalThis`-held in-memory cache (`getRuntimeState`, `storage.ts:348`) with static `mock-data.ts`. In production (Supabase configured), the `globalThis` runtime cache is effectively dead for reads — every read hits Supabase REST fresh with `cache: "no-store"` (`supabase.ts:101`).

### Strengths

- **The domain vocabulary is unusually disciplined.** Status, stage, and outcome are modeled as distinct closed unions — `PromiseStatus` (`types.ts:20`), `PromiseJobStage` (`types.ts:43`), `CommercialOutcomeStatus` (`types.ts:102`), `CustomerApprovalStatus` (`types.ts:55`), `PromisePaymentCollectionStatus` (`types.ts:304`). This separation of "where is the promise in the board" vs. "where is the job in execution" vs. "what was the commercial result" is the right decomposition for a dispatch business and is rare to see done this cleanly.
- **Operator tasks are a properly normalized table** with deterministic, idempotent ids. `taskId()` (`operator-tasks.ts:91`) derives a stable id from `sourceKind`/`sourceId`/`type`, so re-deriving the same task upserts rather than duplicates, and the table has real typed columns (`20260619125000_create_wrenchready_operator_task.sql`). This is the model the rest of the engine should have followed.
- **Money crosses the Stripe boundary in integer cents.** `toCents`/`fromCents` (`stripe.ts:110`) use `Math.round(amount * 100)`, so the actual payment amounts sent to Stripe are correct even though internal economics are floats.
- **The read-model/snapshot layer is consistent and testable-in-principle.** Each `get*Snapshot` is a pure transform over `getPromiseRecords()` (e.g. `getTomorrowReadinessSnapshot` `storage.ts:951`, `getFollowThroughWorklist` `storage.ts:1080`), with computation isolated in small modules (`computeReadinessScore`, `computePromiseEconomics`). The functional purity here is real and would make this layer easy to unit-test if anyone wrote tests.
- **Encode/decode is defensive.** Every extractor (`extractPromiseEconomics` `economics.ts:44`, `extractPromiseCustomerState` `customer-access.ts:118`) wraps `JSON.parse` in try/catch and drops malformed blobs out of the visible-notes list rather than throwing, so a single corrupt note can't brick a record read.

### Findings

**1. The entire promise aggregate is persisted as prefix-encoded strings inside one `notes` JSONB array**
- **Severity:** High
- **Location:** `economics.ts:38-73`, `customer-access.ts:108-173`, `storage.ts:2335-2372`, schema `docs/planning/WRENCHREADY_PROMISE_CRM_SUPABASE.sql:78`
- **Evidence:** `wrenchready_promise` has flat columns plus `notes jsonb not null default '[]'`. Economics, customer access, customer approval, closeout, commercial outcome, follow-through resolution, field execution, payment collection, warranty case, recurring account, outbound history, and the quote packet are *all* serialized into that one array as strings prefixed `__economics::`, `__customer_approval::`, `__quote-packet::`, etc. `mergePromiseNotesWithEconomics` (`economics.ts:65`) filters out the old prefixed entry and appends `${PREFIX}${JSON.stringify(...)}`. On write, `updatePromiseRecord` builds `patch.notes` by nesting eleven merge calls (`storage.ts:2335`); on read, `mapPromiseRow` unwinds them through eleven nested extractors.
- **Why it matters:** This makes the relational store opaque. You cannot query "all promises with an open balance," "sum of deferred value," or "approvals awaiting response" in SQL — every aggregate must load *all* rows and decode every blob in app code. Indexing, partial reads, RLS on sub-fields, and BI/reporting are impossible. The 11-level nesting is fragile: a future contributor must keep merge-order and extract-order consistent or silently drop a field, and there's no schema enforcing that economics is numeric. For a business whose value proposition is "the operating system that runs every aspect of dispatch," the operating data is effectively un-queryable.
- **Recommendation:** Promote the high-value sub-objects to real columns (`economics jsonb`, `payment_collection jsonb`, `customer_approval jsonb`, `closeout jsonb`) or normalized child tables. Keep `notes` for actual human notes only. This is a migration, but it unlocks SQL reporting and removes the merge/extract ordering hazard.

**2. Read-modify-write on the notes blob has no concurrency control — lost updates are structurally guaranteed under concurrent edits**
- **Severity:** High
- **Location:** `storage.ts:2227-2453` (`updatePromiseRecord`), `supabase.ts:68-123`
- **Evidence:** `updatePromiseRecord` does `const current = await getPromiseRecord(id)` (`storage.ts:2228`), recomputes the *entire* `notes` array from `current.notes` plus the patch, then `PATCH wrenchready_promise?id=eq.${id}` with the whole `notes` array (`storage.ts:2445`). There is no version column, no `If-Match`/`updated_at` precondition, and no transaction. The PATCH unconditionally overwrites `notes`.
- **Why it matters:** Two near-simultaneous updates to *different* fields of the same promise (e.g. Jeff posts economics while the office updates the schedule, or a webhook marks a payment paid while an operator edits readiness) both read the same `current`, and the second write clobbers the first's encoded blob entirely — including fields the second writer never touched. With one operator today this is rare; with 7 techs plus Jeff (AI voice agent) plus Stripe/Twilio webhooks all mutating promises, it is a when-not-if data-loss bug. This is the classic lost-update anomaly, amplified because the whole aggregate rides in one column.
- **Recommendation:** Add an `updated_at`/`version` optimistic-concurrency guard (`PATCH ... &updated_at=eq.<read value>`, retry on empty result), or move to column-scoped PATCHes so writers only touch their own field. Per-field columns (Finding 1) largely dissolves this.

**3. Approval/payment state transitions are unvalidated — any status can move to any status**
- **Severity:** Medium
- **Location:** `customer-access.ts:15-26` (`normalizeApprovalStatus`), `storage.ts:2249-2252`
- **Evidence:** `normalizeApprovalStatus` only checks that the value is a member of the enum; it enforces no transition rules. `updatePromiseRecord` accepts any `customerApproval` and stores it. The only transition guard in the system lives in the *customer-facing* route (`approval/route.ts:54` checks `status !== "awaiting-approval"` → 409), not in the storage layer. Internal/Jeff/Codex callers via `updatePromiseRecord` can set `approved` directly with no `requestedAmount`, or move `declined` back to `approved`, with nothing stopping them. Likewise `PromisePaymentCollectionStatus` has no state-machine; `paid` → `awaiting-payment` is representable.
- **Why it matters:** Money- and consent-bearing state (customer approved $X of work; deposit collected) has no invariant enforcement at the trust boundary. A buggy Jeff tool call or a bad payload can flip a declined job to approved or zero out a collected amount, and nothing rejects it.
- **Recommendation:** Centralize a `canTransition(from, to)` guard for `CustomerApprovalStatus` and `PromisePaymentCollectionStatus` and apply it in `updatePromiseRecord`, not only in the one public route. Require `requestedAmount` before `approved`.

**4. `createPromiseFromInbound` performs two un-transacted writes and silently swallows the inbound-promotion failure**
- **Severity:** Medium
- **Location:** `storage.ts:1817-1833`
- **Evidence:** The live path runs `Promise.all([POST wrenchready_promise, PATCH wrenchready_inbound ...].catch(() => undefined)])`. The inbound PATCH that marks the source record `promoted` is wrapped in `.catch(() => undefined)`, so if it fails the error is discarded while the promise is still created.
- **Why it matters:** A failed promotion leaves an inbound record that is still `new`/`screening` while a promise already exists for it. `isOperatorQueueInbound` (`storage.ts:813`) keys off `qualificationStatus !== "promoted"`, so the lead re-appears in the inbound queue and can be double-promoted into a second promise. There is no idempotency key on promise creation, so the duplicate is real.
- **Recommendation:** Make promotion atomic (a Postgres RPC/transaction) or at minimum surface the PATCH failure and reconcile. Add an idempotency guard keyed on `inbound_id` to block double promotion.

**5. `reconcilePromiseStatus` overrides caller-supplied `status`, making most explicit status writes no-ops**
- **Severity:** Medium
- **Location:** `storage.ts:730-736`, applied at `storage.ts:2283`
- **Evidence:** `reconcilePromiseStatus` returns `completed`/`follow-through-due` if there's a completed-execution signal, else collapses to `tomorrow-at-risk` only if the *incoming* status was already `tomorrow-at-risk`, otherwise `promises-waiting`. `updatePromiseRecord` feeds the merged record through this and stores `resolvedStatus`, ignoring `updates.status` in every case except the `tomorrow-at-risk` passthrough. The public approval route sends `status: "follow-through-due"` (`approval/route.ts:73`) but unless an execution-complete signal exists, the stored status is silently rewritten to `promises-waiting`.
- **Why it matters:** This is surprising, undocumented action-at-a-distance. A caller that "sets status" usually doesn't get the status it asked for, and the board metrics derive from the rewritten value. It also reads as redundant with `getOperatorQueueRecords`, which re-buckets by status anyway. The coupling between an explicit field and a derived rule is a correctness and debuggability trap.
- **Recommendation:** Either make status fully derived (and remove it from the write API) or fully explicit (respect the caller). The current half-and-half is the worst of both.

**6. Economics aggregate uses an average-of-ratios and hardcoded cost defaults**
- **Severity:** Low
- **Location:** `economics.ts:86-100`, `storage.ts:936-947` (`getPromiseEconomicsRollup`)
- **Evidence:** `computePromiseEconomics` defaults `supportCost = 20`, `cardFeePercent = 3`, `warrantyReservePercent = 2` (`economics.ts:86`) — magic numbers baked into the profit formula. `getPromiseEconomicsRollup` computes `averageNetProfitPerClockHour` as the mean of each promise's `netProfitPerClockHour` (`storage.ts:944`), i.e. an average of ratios, not `totalNetProfit / totalClockHours`. A 0.5-hr $300 job and a 5-hr $300 job are weighted equally, badly skewing the per-hour metric the owner uses to judge job mix.
- **Why it matters:** This is the number the business uses to decide which services are worth dispatching. Average-of-ratios overweights tiny jobs and will mislead the "which wedge to lead with" decisions the cadence engine is built to inform. Hardcoded support/fee defaults silently mix modeled and assumed costs.
- **Recommendation:** Compute the rollup as `totalNetProfit / totalClockHours`. Hoist the cost defaults to named config and record on the snapshot whether each cost was modeled or assumed.

**7. No tests over money, state, or the encode/decode round-trip; and read amplification in the cadence engine**
- **Severity:** Medium
- **Location:** repo-wide (no `*.test.ts`/`*.spec.ts` exist); `operating-cadence.ts:17-26`, `storage.ts` (20 call sites of `getPromiseRecords()`)
- **Evidence:** A repo search finds zero test files. The merge→store→extract round-trip (the only thing keeping the aggregate intact) is entirely unverified. Separately, `getWeeklyOperatingCadenceSnapshot` (`operating-cadence.ts:17`) `Promise.all`s 8 snapshot builders, *each* of which independently calls `getPromiseRecords()` — a full Supabase REST read + full notes-decode of every promise. One cadence page load fans out to ~8 full-table reads with `cache: "no-store"`; there is no per-request memoization.
- **Why it matters:** The most fragile, highest-stakes logic in the app (encode order, extract order, economics math, status reconciliation) has no regression net, on a stack the AGENTS.md explicitly warns is a breaking-change Next.js. The read amplification is fine at demo scale but scales O(snapshots × rows) exactly as the promise table grows toward the 7-tech volume.
- **Recommendation:** Add unit tests for `mergePromiseNotesWith*`/`extract*` round-trips and `computePromiseEconomics` first — they're pure and cheap to cover. Add a per-request cache (or a single `getPromiseRecords()` passed into the snapshot builders) for the cadence path.

### Score rationale

The type-level domain model and the pure read-model layer are genuinely good — 8-ish work in isolation, and `operator-tasks.ts` shows the team knows how to do normalized, idempotent persistence when they choose to. But the core persistence decision (the whole aggregate encoded into one `notes` blob, mutated by unguarded read-modify-write with no transactions, no concurrency control, and no schema for sub-fields) is a foundational liability for a *multi-writer dispatch system*, and it is precisely the dimension that has to be sound to dispatch 7 techs plus an AI agent plus payment webhooks concurrently. Combined with no tests over money/state logic, an unenforced approval/payment state machine, a silently-swallowed promotion write, and a status-reconciliation rule that overrides callers, the risk profile lands this at a **5.0** — it works today at single-operator scale and the surface architecture is thoughtful, but the data layer will not hold under the concurrency the product is explicitly built to reach.


<div style="page-break-after: always;"></div>

---

## 4. API Route Design & Backend Contracts

**Verdict:** The 73-route surface is internally consistent in its *shape* — almost every handler returns `NextResponse.json`, uses `force-dynamic`, and validates bodies with hand-rolled type guards — and the Jeff tool routes in particular show genuine discipline via a shared route factory. But the contract layer has two structural problems that a top org would block on: the entire `/api/al/wrenchready/*` operations namespace (board reads, promise creation/mutation, inbound, owners) has **no authentication at all** and is called from the browser, and the Twilio webhooks perform **no signature validation**. Validation is also ad-hoc (no schema library; one giant 600-line hand-written guard for the promise PATCH), and HTTP-status usage, while better than typical, is uneven.

**Score: 5/10**

### What's here

The API tree is organized into four namespaces with distinct contracts:

- **`/api/al/wrenchready/*`** — the operations/CRM backend (~30 routes). REST-ish: `GET /promises` returns the board, `POST /promises` promotes an inbound, `PATCH /promises/[id]` mutates, `GET /owners/[owner]`, `GET|POST /inbound`, plus `dispatch`, `follow-through`, `tomorrow`, `systems`, `outbound`, and proof endpoints. The `jeff/*` subtree holds the field-assistant session/messages/photos/files routes, Google sync routes, the Vapi webhook (`jeff/vapi/server`), and **~28 one-tool-per-file routes under `jeff/tools/*`**.
- **`/api/wrenchready/status/[token]/*`** — the customer-facing surface: `approval`, `deposit`, `balance`, `request-next-step`. Token-in-path is the only credential (by design — opaque bearer URL).
- **`/api/twilio/*`** — TwiML webhooks for voice, SMS, voicemail, call screening (return `text/xml`).
- **`/api/webhook/stripe`** and **`/api/appointments`**, **`/api/scheduling/availability`** — external/public ingress.

Common conventions that *are* applied consistently:
- `export const dynamic = "force-dynamic"` on 61/73 route files (the 12 without it are the Twilio TwiML routes, `appointments`, `availability`, `integrations`, and `inbound` — all genuinely dynamic anyway, so the omission is cosmetic).
- Body validation via custom `isXxxPayload(value: unknown): value is Xxx` type guards, not a schema validator.
- JSON envelope: success responses carry `{ success: true, ...data }`; errors carry `{ error: string }` (sometimes `{ success: false, error }` in the Jeff subtree — see inconsistency below).
- `try/catch` → `500 { error }` wrapper on most mutation routes.
- **No `zod` (absent from `package.json`), no `runtime` config, no streaming, no rate limiting anywhere.**

### Strengths

- **Jeff tool routes use a shared factory** — `createJeffToolRoute(handler)` (`src/lib/jeff-field-assistant/route-handler.ts:6`) centralizes auth, JSON parsing with `.catch(() => ({}))`, and error envelope for ~25 tool endpoints, so each route file is a clean two-liner (`src/app/api/al/wrenchready/jeff/tools/record-field-note/route.ts:5`). This is the right abstraction and keeps the contract uniform across the tool surface.
- **Stripe webhook verifies signatures correctly** — `stripe.webhooks.constructEvent(body, signature, webhookSecret)` over the raw `request.text()` body, returning `400` on failure and `503` when unconfigured (`src/app/api/webhook/stripe/route.ts:21-32`). It is also **idempotent**: it dedupes on `lastPaymentReference` and an `alreadyCaptured` check before mutating (`src/app/api/webhook/stripe/route.ts:47-65`) — a genuinely production-minded touch.
- **The Jeff tool/Vapi auth is timing-safe and multi-header tolerant** — `authorizeJeffToolRequest` uses `secretsMatch` (constant-time) and accepts `Bearer`, `x-jeff-field-secret`, or `x-vapi-secret`, and **fails closed in production** when the secret is unset (`503`, `src/lib/jeff-field-assistant/tools.ts:2296-2323`). The cron sync route layers a `CRON_SECRET` bearer check on top (`src/app/api/al/wrenchready/jeff/sync/route.ts:8-17`).
- **Customer status routes use opaque high-entropy tokens** for new records — `wr_${crypto.randomUUID().replace(/-/g, "")}` (`src/lib/promise-crm/customer-access.ts:29`) — and enforce **state-machine guards** before mutating: approval rejects unless `status === "awaiting-approval"` (`409`, `.../approval/route.ts:54-59`), deposit rejects double-collection (`409`, `.../deposit/route.ts:38-48`).
- **Thoughtful status-code use in places** — `422` for business-rule gate failures with a structured `blockers[]` array (`src/app/api/al/wrenchready/promises/route.ts:117-125`), `409` for slot-no-longer-available and `503` for failed calendar hold in the appointments route (`src/app/api/appointments/route.ts:267-293`), `502` when Stripe returns no URL (`.../deposit/route.ts:67-72`).
- **Appointments route handles partial failure gracefully** — `Promise.allSettled` for the legacy Supabase store / webhook / email side-effects, and compensating delete of the calendar hold if the inbound write fails (`src/app/api/appointments/route.ts:297-312`).

### Findings

**The entire `/api/al/wrenchready/*` ops namespace is unauthenticated and browser-reachable**
- **Severity: Critical**
- **Location:** `src/app/api/al/wrenchready/promises/route.ts:11,100`, `src/app/api/al/wrenchready/promises/[id]/route.ts:70,686`, `src/app/api/al/wrenchready/inbound/route.ts:6,41`, `src/app/api/al/wrenchready/owners/[owner]/route.ts:15`
- **Evidence:** `GET /promises` (full CRM board including customer names/phones/economics), `POST /promises` (creates promises), `PATCH /promises/[id]` (mutates payment state, closeout, owner), `GET|POST /inbound`, and `GET /owners/[owner]` contain **no auth call whatsoever** — no `authorizeJeffToolRequest`, no PIN, no session check. `grep` confirms only 2 of the non-Jeff/non-webhook routes reference any authorization helper. These routes are fetched directly from client components (e.g. `promote-inbound-form.tsx`, `promise-status-form.tsx`, `collection-action-form.tsx` all `fetch("/api/al/wrenchready/...")`), so they are public HTTP endpoints, not server-internal calls. There is **no `src/middleware.ts`** and **no `src/app/ops/layout.tsx`**; `next.config.ts:20-56` only adds `X-Robots-Tag: noindex` to `/ops`, which is not access control.
- **Why it matters:** Anyone who can reach the deployment URL can enumerate the full customer book (PII: names, phone, email, addresses, job economics), create/alter promises, mark jobs paid, change owners, and inject inbound records. This is the company's entire operational and financial system exposed without a credential. The PIN/secret infrastructure that *does* protect the Jeff subtree was simply never wired to the ops subtree.
- **Recommendation:** Add a `src/middleware.ts` that enforces a session/PIN cookie for all `/ops` pages and `/api/al/wrenchready/*` routes (excluding the Stripe/Twilio webhooks and the customer `status` routes), or reuse `authorizeJeffToolRequest`-style header auth on every ops mutation handler. Fail closed in production exactly as the Jeff auth already does.

**Twilio webhooks perform no `X-Twilio-Signature` validation**
- **Severity: High**
- **Location:** `src/app/api/twilio/sms/route.ts:91-143`, `src/app/api/twilio/voice/route.ts:38-64`, `src/app/api/twilio/voicemail/route.ts`, `src/app/api/twilio/voice/screen/route.ts`
- **Evidence:** A repo-wide grep for `validateRequest` / `x-twilio-signature` / `TWILIO_AUTH_TOKEN` finds Twilio's auth token used only for an *outbound* Basic-auth API call in `voicemail/complete/route.ts:39`, never for inbound webhook verification. The SMS handler blindly trusts the `From` field from `formData` and, if `From` matches a relay phone, executes an **operator command path** that sends SMS from the business line to arbitrary numbers (`src/app/api/twilio/sms/route.ts:58-89,98-99`).
- **Why it matters:** Without signature validation, anyone can POST forged TwiML webhooks. By spoofing `From` to equal `TWILIO_FORWARD_TO_PHONE`, an attacker reaches `handleOwnerReply` and can send SMS to any number *from the business's Twilio line* (toll fraud / impersonation / smishing), and can inject fake inbound leads at will. Forged voice webhooks can also redirect call forwarding.
- **Recommendation:** Validate `X-Twilio-Signature` against `TWILIO_AUTH_TOKEN` and the full request URL + params on every `/api/twilio/*` route (Twilio's `validateRequest`), rejecting with `403` on mismatch. Do not authorize the operator-reply path on `From` alone.

**No schema validator; validation is a 600-line hand-written guard that is structurally lenient**
- **Severity: Medium**
- **Location:** `src/app/api/al/wrenchready/promises/[id]/route.ts:271-684` (`isUpdatePromisePayload` + ~20 sub-guards)
- **Evidence:** `zod` is not a dependency. The promise PATCH validator is ~400 lines of nested `typeof` checks. It only asserts *shape*, never *values*: `status`/`jobStage`/`paymentCollection.status`/`warrantyCase.severity` are validated as `typeof === "string"` with no enum membership check (`:553,659,661`), `economics` accepts any object whose values are numbers including negatives/NaN (`isEconomicsPayload`, `:271-278`), and `noteToAdd`/free-text fields have no length bound. The valid body is then spread wholesale into `updatePromiseRecord(id, { ...body, ... })` (`:722`).
- **Why it matters:** Maintaining ~600 lines of bespoke guards across many routes is error-prone and they have already drifted (the enum gaps above). Spreading an under-validated body into the persistence layer means a caller can set arbitrary string statuses or negative economics that downstream code assumes are constrained. A schema validator would make these contracts declarative, self-documenting, and consistent.
- **Recommendation:** Adopt `zod` (or `valibot`), define one schema per payload, and `parse()` at the route boundary, returning the flattened issues as the `400` body. This collapses hundreds of lines and closes the enum/range gaps for free.

**Legacy customer-access tokens are deterministic and guessable**
- **Severity: Medium**
- **Location:** `src/lib/promise-crm/customer-access.ts:36-39`
- **Evidence:** `buildLegacyPromiseCustomerAccess(promiseId)` derives the token as `wr_legacy_${promiseId.replace(/-/g, "")}` — a pure function of the promise UUID, with no secret. The customer status routes (`approval`, `deposit`, `balance`, `request-next-step`) treat possession of the token as full authorization to approve work and create Stripe deposit checkouts (`.../deposit/route.ts:14-15`).
- **Why it matters:** Although a v4 UUID is itself hard to guess, promise IDs appear in ops webhooks, logs, and the ops UI, and any leak of a promiseId trivially yields the customer token (and thus the ability to approve work / trigger payment flows) for legacy records — the token adds no independent entropy beyond the ID. The new-token path (`:29`) is fine; the legacy path is the weak link.
- **Recommendation:** Migrate legacy records to randomly generated tokens, or HMAC the promiseId with a server secret so the token is not reconstructable from a leaked ID.

**No rate limiting on any public ingress route**
- **Severity: Medium**
- **Location:** `src/app/api/appointments/route.ts:248`, `src/app/api/scheduling/availability/route.ts:14`, `src/app/api/twilio/sms/route.ts:91`, `src/app/api/wrenchready/status/[token]/*`
- **Evidence:** A repo-wide grep for `rate.?limit|upstash|@vercel/kv|429` returns nothing. The public appointment route performs Google Calendar writes, Supabase inserts, outbound email, and webhooks per request (`:308-315`); the availability route runs a scheduling engine per request; the status routes create Stripe checkout sessions per request.
- **Why it matters:** These unauthenticated endpoints each fan out to paid third-party APIs (Stripe, Google, Resend, Twilio). An unthrottled attacker can exhaust quota, run up cost, spam the ops team with fake leads/alerts, and brute-force customer status tokens — there is no `429` anywhere to slow this.
- **Recommendation:** Add IP/token-based rate limiting (Upstash Ratelimit or Vercel KV) on `appointments`, `availability`, `twilio/*`, and `status/[token]/*`, returning `429` with `Retry-After`.

**Error-envelope and status-code conventions are inconsistent across namespaces**
- **Severity: Low**
- **Location:** `src/app/api/al/wrenchready/jeff/tools/route.ts:11`, `src/lib/jeff-field-assistant/route-handler.ts:9,19` vs `src/app/api/al/wrenchready/promises/route.ts:105,145`
- **Evidence:** The Jeff subtree returns `{ success: false, error }`; the ops/promises/status subtree returns bare `{ error }`. Validation failures are `400` in most routes but the promise-creation gate returns `422` (`promises/route.ts:124`) while equally "unprocessable" failures elsewhere are `400`. `appointments` validates *only* `vehicle` (`validatePayload`, `:38-42`) despite the form sending name/phone/etc., so a body missing every field but `vehicle` is accepted. The `inbound` POST swallows the underlying error and always returns a generic `500` (`inbound/route.ts:83-88`).
- **Why it matters:** Clients consuming both namespaces must branch on two error shapes, and inconsistent codes make programmatic handling and observability harder. The thin `appointments` guard lets malformed leads through to downstream side-effects.
- **Recommendation:** Standardize on a single error envelope (`{ success: false, error, code? }`) and a documented status-code policy (`400` malformed, `422` business-rule, `401/403` auth, `409` conflict). Tighten `validatePayload` to assert the fields the route actually depends on.

### Score rationale

The route layer is more disciplined than a typical speed-optimized startup codebase: a clean factory for the tool routes, correct and idempotent Stripe webhook handling, timing-safe fail-closed auth on the Jeff/Vapi surface, opaque tokens for new customer links, and thoughtful `409/422/502/503` usage with `Promise.allSettled` partial-failure handling. Those are real, cited strengths that pull the score up. But two of the findings are not stylistic — they are exploitable: the **entire operations/CRM namespace ships with no authentication while being called from the browser** (full PII + financial-state exposure and mutation), and the **Twilio webhooks accept forged, unsigned requests** (toll fraud / lead injection). Combined with the absence of any schema validator (600 lines of drifting hand guards), no rate limiting on paid-API ingress, and guessable legacy tokens, the contract layer "works" for the happy path but carries serious, concrete security and maintainability debt. That is squarely a **5/10**: functional and locally well-structured, but with critical gaps a production deployment must not have.


<div style="page-break-after: always;"></div>

---

## 5. Third-Party Integrations

**Verdict:** The integration layer is competent at the "happy path" — Stripe webhook signatures are verified, Google Workspace OAuth/JWT is implemented correctly with scoped tokens and a sane refresh cache, and the Jeff tool/Vapi/inbound-email endpoints use timing-safe shared-secret auth. But three classes of problems hold it back from production-grade: **Twilio webhooks have no signature validation at all** (voice, SMS, voicemail are fully spoofable, and the SMS route will send real outbound texts on a forged inbound), **payment-state correctness has real gaps** (only `checkout.session.completed` is handled, so delayed/async methods and refunds/disputes silently never update state, and currency is never validated), and **no outbound fetch anywhere has a timeout or retry**, which on Vercel means a slow Twilio/Google/Slack call can hang a serverless invocation to its platform limit. The financial-correctness logic that *is* present (idempotency via `lastPaymentReference`, `alreadyCaptured` guards) is thoughtful, which makes the missing pieces more glaring.

**Score: 5.5 / 10**

### What's here

| Integration | Lib | Routes | Auth / verification |
| --- | --- | --- | --- |
| Stripe | `src/lib/stripe.ts` (584) | `webhook/stripe`, `status/[token]/{deposit,balance}`, `al/.../checkout-link` | Webhook: `constructEvent` signature check ✅. Checkout routes: **none** ❌ |
| Twilio voice/SMS/VM | `twilio.ts`, `twilio-voice.ts` | `twilio/voice{,/fallback,/screen,/screen/accept}`, `twilio/sms`, `twilio/voicemail{,/complete}` | **No `X-Twilio-Signature` validation anywhere** ❌ |
| Google Workspace | `google-workspace.ts` (688) | gmail/calendar/drive sync (Jeff-secret gated) | OAuth refresh-token + service-account JWT ✅; calendar writes env-gated ✅ |
| Vapi ("Jeff") | `jeff-field-assistant/vapi-server.ts` | `jeff/vapi/{server,config,sync}` | `authorizeJeffToolRequest` shared secret ✅ |
| Resend / Gmail email | `email.ts`, `emails/*` | recap/outbound senders | Resend idempotency key ✅ (Gmail path lacks it) |
| Slack | `slack.ts` (32) | (lib only) | Incoming webhook, fire-and-forget ✅ |
| Google Maps | `google-maps.ts` (320) | (lib only) | Places + Routes v2, API key ✅ |
| Ops webhook | `promise-crm/webhooks.ts` | outbound to n8n | **Unsigned POST** ⚠️ |

Secrets are read through a single `readEnv` normalizer (`src/lib/env.ts:13`) that trims and strips quotes — reasonable. The only browser-exposed key is `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (`stripe.ts:84`), which is correct (publishable keys are public by design). No secret is logged.

### Strengths

- **Stripe webhook signature verification is done correctly**, reading the *raw* body before parsing and returning 400 on failure: `src/app/api/webhook/stripe/route.ts:21-32`. Returning 503 when the secret/signature is absent (`:14-19`) is the right fail-closed posture.
- **Payment idempotency is genuinely handled**, not hand-waved. The webhook dedupes on `lastPaymentReference` (`webhook/stripe/route.ts:47-49`) and has a second `alreadyCaptured` guard keyed on status/`depositPaidAt`/`balancePaidAt` (`:53-65`), so a redelivered event won't double-credit. The checkout-creation routes also short-circuit when a live checkout URL already exists (`status/[token]/deposit/route.ts:50-64`).
- **Google Workspace auth is implemented carefully**: scoped token cache keyed by `mode::sorted-scopes` with a 60s expiry skew (`google-workspace.ts:244-269`), correct RS256 service-account JWT assembly with optional domain-wide `sub` delegation (`:191-220`), and OAuth-refresh preferred over service-account (`:252-263`). Calendar *writes* are gated behind an explicit `GOOGLE_WORKSPACE_ALLOW_CALENDAR_WRITES=true` flag (`:179`, `:496-501`) — a good blast-radius control.
- **Jeff tool / Vapi / inbound-email endpoints use timing-safe shared-secret auth** with multi-header fallback (`tools.ts:2296-2323`, `email/inbound/route.ts:16-32`), and fail closed in production when the secret is unset (`tools.ts:2299-2305`).
- **Vapi sync verifies its own write** — after PATCHing the assistant it re-reads and throws on model/voice/tool drift (`vapi/sync/route.ts:206-220`), and defaults to a `dryRun` unless `apply:true`. Genuinely defensive.
- **TwiML is XML-escaped** via a shared `xmlEscape` before interpolating caller IDs / forward numbers (`twilio-voice.ts:8-15`, used at `voice/route.ts:32-34`), preventing TwiML injection through phone-number fields.

### Findings

**Twilio webhooks have no request-signature validation**
- **Severity:** Critical
- **Location:** `src/app/api/twilio/sms/route.ts:91-141`, `src/app/api/twilio/voicemail/route.ts:69-128`, `src/app/api/twilio/voice/route.ts:38-64` (all of `twilio/*`)
- **Evidence:** None of the Twilio routes read or verify `X-Twilio-Signature`. The SMS handler trusts the POSTed `From` field and, if it matches a relay phone, executes `handleOwnerReply` which **sends a real outbound SMS** through the business Twilio account (`sms/route.ts:98-99` → `:76 sendTwilioSms(targetPhone, outboundBody)`). The inbound path also creates CRM records and fires `sendTwilioSms(relayTarget, ...)` on every request (`:133-135`).
- **Why it matters:** Anyone who discovers the public webhook URL can forge an inbound SMS with `From` set to the owner's number and have WrenchReady relay arbitrary texts to arbitrary `To` numbers from the business line — toll fraud, spam, and customer-impersonation in one. Forged voicemail posts inject fake inbound leads with attacker-controlled `RecordingUrl` strings that get SMS'd to staff. The fix is mechanical (validate with the auth token + full URL) and Twilio documents it; its absence is the single highest-risk item in this dimension.
- **Recommendation:** Add `twilio.validateRequest(authToken, signature, url, params)` (or an HMAC-SHA1 equivalent) as a guard in every `twilio/*` route, rejecting with 403 on mismatch. Validate against the exact public URL Twilio is configured to hit (mind the proxy/`x-forwarded-proto`).

**Stripe webhook only handles `checkout.session.completed` — async payments, refunds, and disputes never update state**
- **Severity:** High
- **Location:** `src/app/api/webhook/stripe/route.ts:34`; cf. `src/lib/stripe.ts:577-582`
- **Evidence:** The handler branches solely on `event.type === "checkout.session.completed"`. But `mapStripePaymentMethod` maps `cashapp → "cash-app-pay"` (`stripe.ts:577-578`) and Cash App Pay (and several wallet/redirect methods) settle **asynchronously** — Stripe emits `checkout.session.async_payment_succeeded` / `...async_payment_failed`, not a synchronous `completed` with `payment_status: "paid"`. There is no handler for those, nor for `charge.refunded`, `charge.dispute.created`, or `payment_intent.payment_failed`.
- **Why it matters:** A customer who pays a deposit via Cash App can have the money captured by Stripe while the promise record is never marked paid — the office chases a "missing" deposit that actually cleared. Conversely, refunds and chargebacks never revert `paymentCollection.status` from `paid`, so the CRM reports collected revenue that was clawed back. For an "operating system" tracking real money, this is a correctness gap, not cosmetics.
- **Recommendation:** Handle `checkout.session.async_payment_succeeded` with the same crediting logic, and add at least `charge.refunded` / `charge.dispute.created` handlers that reopen the balance and flag ops. Restrict the enabled `payment_method_types` to synchronous methods if async handling won't ship soon.

**No timeout or retry on any outbound integration fetch**
- **Severity:** High
- **Location:** `src/lib/twilio.ts:45`, `src/lib/google-workspace.ts:223,274,525,623,658`, `src/lib/google-maps.ts:151,193`, `src/lib/slack.ts:19`, `src/lib/promise-crm/webhooks.ts:18`, `src/app/api/al/.../vapi/sync/route.ts:87`
- **Evidence:** Every raw `fetch` is called without `signal: AbortSignal.timeout(...)` and without any retry/backoff. `grep -n "AbortSignal\|timeout\|retry"` across the integration libs returns nothing (the lone `backoffSeconds` in `vapi-server.ts:777` is a Vapi *speaking-plan* config value, not an HTTP retry). The Stripe **SDK** calls have built-in timeouts/retries; the dozens of hand-rolled `fetch`es do not.
- **Why it matters:** On Vercel a hung upstream (Twilio API slow, Gmail 5xx, Slack edge stall) ties up the serverless invocation until the platform max duration, burning execution budget and degrading the calling request. A flaky Google token endpoint takes down email send with no retry. The voice/SMS routes are user-facing call flows where a hung `sendTwilioSms` can stall a TwiML response and drop the caller into Twilio's default error handling.
- **Recommendation:** Wrap outbound `fetch` in a small helper with `AbortSignal.timeout(~8s)` and a bounded retry (2 attempts, jittered backoff) for idempotent GETs and Twilio/Slack/webhook POSTs. Make ops/Slack webhooks fire on `after()`/`waitUntil` rather than blocking the response.

**Ops `checkout-link` route mutates state and creates Stripe sessions with no authentication**
- **Severity:** High
- **Location:** `src/app/api/al/wrenchready/promises/[id]/checkout-link/route.ts:26-145`
- **Evidence:** Unlike the Jeff tool routes (which call `authorizeJeffToolRequest`) and the inbound-email route (shared secret), this `/api/al/...` route performs **no** auth check. A `grep` for `auth|secret|cookie|session` in `src/app/api/al/wrenchready/promises/` returns only Stripe-session variable names. There is no `src/middleware.ts` (confirmed absent), so there is no ambient gate. Any unauthenticated POST with a known/guessed promise `id` creates a real Stripe Checkout Session and writes `paymentCollection` (`depositCheckoutUrl`, status transitions) onto the record.
- **Why it matters:** Promise IDs flow through customer-facing surfaces; an attacker can enumerate them to spin up checkout sessions and overwrite payment state (e.g., flip `status` to `awaiting-payment`/`deposit-requested`, plant a checkout URL). This is an authz hole that happens to sit on the money path. (Broader authz is covered in the auth section; called out here because it directly enables Stripe abuse.)
- **Recommendation:** Gate every `/api/al/*` mutating route behind the same operator auth used elsewhere (shared secret or session), or add middleware. The customer-token `status/[token]/{deposit,balance}` routes are better — they at least bind to a per-promise capability token (`deposit/route.ts:15`).

**Webhook trusts `amount_total` as USD dollars without checking `currency`**
- **Severity:** Medium
- **Location:** `src/app/api/webhook/stripe/route.ts:51`
- **Evidence:** `const amountCollected = (session.amount_total || 0) / 100;` — the `/100` minor-unit conversion and the `currency` field are never reconciled. Checkout sessions are always created as `usd` (`stripe.ts:506`), but the webhook will credit *any* `checkout.session.completed` carrying a matching `promiseId`/`paymentType` in metadata, regardless of currency or that it originated from this app's session creator.
- **Why it matters:** Zero-decimal currencies (JPY) or a future multi-currency change would mis-record amounts by 100x. More practically, the webhook authorizes crediting purely on attacker-influenceable metadata — combined with no validation that the session was created by this system, a crafted session with the right metadata could write payment state. Defense-in-depth: assert `currency === "usd"` and that the session/PI metadata `business === "wrenchready"`.
- **Recommendation:** Validate `session.currency` and `metadata.business` before crediting; map minor units via a currency-aware helper rather than a hardcoded `/100`.

**Payment-link resolution paginates up to 500 links linearly**
- **Severity:** Low
- **Location:** `src/lib/stripe.ts:271-303`
- **Evidence:** `findPaymentLinksByUrl` lists Payment Links 100 at a time for up to 5 pages and string-matches URLs in memory; if not found it appends a warning that "the first 500 Payment Links" were searched (`:296-300`).
- **Why it matters:** This is O(n) over the account's entire Payment Link history with a hard 500 cap. As the business scales it will silently fail to resolve older links and burn extra API calls per status check. It works today only because the account is young.
- **Recommendation:** Store the `plink_…` id (or the resolved session id) on the promise record at creation time so status checks are a direct `retrieve`, not a scan.

**`secretsMatch` leaks secret length before the constant-time compare**
- **Severity:** Low
- **Location:** `src/lib/jeff-field-assistant/tools.ts:520-524`; same pattern at `email/inbound/route.ts:16-19`
- **Evidence:** `return providedBuffer.length === expectedBuffer.length && timingSafeEqual(...)` — the early length comparison short-circuits before `timingSafeEqual`, so response timing reveals whether the supplied secret matched the expected length.
- **Why it matters:** Minor. It narrows brute-force search space by leaking length; the constant-time compare itself is otherwise correct. Acceptable for a shared bearer secret but worth noting given the code already reaches for `timingSafeEqual` to be careful.
- **Recommendation:** Hash both inputs to a fixed width (e.g. SHA-256) and `timingSafeEqual` the digests, removing the length branch.

**Outbound ops/Slack webhooks are unsigned and silently swallow all failures**
- **Severity:** Low
- **Location:** `src/lib/promise-crm/webhooks.ts:13-30`, `src/lib/slack.ts:12-31`
- **Evidence:** `sendOpsWebhook` POSTs unsigned JSON to `WR_OPS_WEBHOOK_URL` and returns `false` inside a bare `catch {}`; callers further `.catch(() => false)` (e.g. `webhook/stripe/route.ts:135`). Slack is identical. There is no HMAC, no delivery log, no dead-letter.
- **Why it matters:** The receiving n8n/ops endpoint cannot verify these events came from WrenchReady (anyone who learns the URL can inject fake `promise_deposit_collected` events), and a silently dropped webhook means an ops automation just never fires with no trace. For a system whose thesis is "keep systems in sync without manual copy-paste," undetected webhook loss is a real operational gap.
- **Recommendation:** Sign outbound webhooks with an HMAC header the receiver verifies, and record delivery outcomes (at minimum a structured log / counter) instead of swallowing them.

### Score rationale

The fundamentals that are hard to get right are present and correct — Stripe signature verification on the raw body, real idempotency guards, scoped Google OAuth/JWT with write-gating, timing-safe internal auth, XML-escaped TwiML, and a self-verifying Vapi sync. That floor keeps this above the "serious problems" tier. But the dimension is dragged down by one **critical** issue (unauthenticated, fully spoofable Twilio webhooks that can send real SMS from the business line) and a cluster of **high**-severity gaps that each touch money or availability: incomplete Stripe event coverage (async settlement, refunds, disputes all unhandled), universally missing fetch timeouts/retries on a serverless platform, and an unauthenticated checkout-creation route. None of these are exotic — they're the standard hardening checklist for exactly this Stripe+Twilio+Google stack — which is why a 5.5 is calibrated: solid scaffolding, but not yet safe to run a real cash-handling dispatch business on without the Twilio and payment-event fixes.


<div style="page-break-after: always;"></div>

---

## 6. Data Layer, Persistence & Scheduling

**Verdict.** The Jeff field-assistant tables are genuinely well-designed — disciplined CHECK constraints, sensible partial indexes, and a thoughtful dual-write/mirror pattern with graceful Supabase→local fallback. But the data layer as a whole is held together by conventions rather than by the database: the entire Promise CRM (the system of record for jobs, money, and schedule) runs **unmigrated**, **mutates by lost-update-prone read-modify-write**, and smuggles a dozen structured domain objects through a free-text `notes` JSONB array. RLS is enabled on every table but **zero policies exist** (verified live), so the only thing protecting production data is the service-role key — on a **shared multi-tenant "Al Boreland" database** that also holds other businesses' constitutions, vault documents, and memories. The scheduling engine is the strongest single file here, but its double-booking guard is effectively blind because 50 of 51 live promises carry no structured time window. The public `/api/appointments` writer targets a table that **does not exist**.

**Score: 4.5 / 10**

### What's here

Two persistence regimes coexist:

1. **Jeff field assistant** (`src/lib/jeff-field-assistant/persistence.ts`, 1393 LOC) — migration-managed Supabase tables (`wrenchready_jeff_field_event`, `_memory`, `_conversation`, `_conversation_summary`, `_job_workspace_snapshot`, `_media`, `wrenchready_operator_task`) with a `.data/jeff/*.json` local mirror (`local-data.ts`). Every write goes to Supabase *and* the local file; reads prefer Supabase and fall back to local on error.

2. **Promise CRM** (`src/lib/promise-crm/storage.ts`, 4029 LOC) — Supabase tables `wrenchready_promise` and `wrenchready_inbound`, **with no migration in the repo**. The fallback is an in-process `globalThis` runtime cache plus static `mock-data.ts`, gated behind `WR_ENABLE_PROMISE_CRM_DEMO_FALLBACK`.

Both regimes reach Postgres through one thin REST helper, `src/lib/promise-crm/supabase.ts`, which selects a credential (`SUPABASE_SERVICE_ROLE_KEY` > `SUPABASE_SECRET_KEY` > anon) and refuses writes unless a service-role/secret key is present (`supabase.ts:84`).

The scheduling engine (`src/lib/scheduling/engine.ts`, 471 LOC) computes availability from `BUSINESS_HOURS`, Google Calendar busy blocks, and internal Promise CRM windows, with timezone-correct slot math.

**Live database facts (verified via Supabase MCP against project `tsisorwqxmizndrcidub`, "Al Boreland"):** 51 promises, 18 inbound, 517 field events, 220 conversations, 75 memories, 39 media rows, 48 operator tasks. RLS enabled on all WrenchReady tables; **no policies on any of them**. The database is shared with non-WrenchReady tables (`constitutions`, `trajectories`, `vault_documents`, `al_memories`, `cost_events`, `security_events`, `al_jobs`).

### Strengths

- **Strong declarative constraints on the Jeff tables.** Every enum-like column is a real `CHECK` (e.g. 18 event types in `wrenchready_jeff_field_event`, migration `20260617143001...sql:6-27`), and `wrenchready_jeff_memory.memory` is length-bounded `char_length(memory) between 3 and 1200` (`20260617143023...sql:18`). This is verified live in the DB, not just in the file.
- **Purposeful indexing, including partial indexes.** e.g. `wrenchready_jeff_memory_candidate_idx ... where status = 'candidate'` (`20260617143023...sql:59-61`) and `wrenchready_jeff_conversation_call_id_idx` is a *unique* partial index preventing duplicate call ingestion (`20260617153121...sql:39-41`). The composite `(job_id, timestamp desc)` indexes match the actual query shapes in `persistence.ts`.
- **A real FK with cascade** between conversation summaries and conversations (`20260617153121...sql:52`, `on delete cascade`), confirmed live.
- **Disciplined credential gating.** Writes are blocked at the REST layer unless a privileged key is configured (`supabase.ts:82-86`), and the connection-status type distinguishes `service-role`/`secret`/`anon`/`none` (`supabase.ts:6`).
- **Genuinely correct timezone math in scheduling.** `makeZonedDate`/`getZonedDateParts` (`engine.ts:19-67`) derive the zone offset via `Intl.DateTimeFormat` round-tripping rather than hardcoding, so DST transitions in `America/Los_Angeles` are handled. Slot generation respects per-service duration and before/after buffers (`engine.ts:252-274`) and a 120-minute minimum lead time (`engine.ts:17,231,260`).
- **Conservative availability posture.** Customer slots are only offered when calendar reads succeed, writes are enabled, route truth is ready, and the territory matches — otherwise it degrades to "Dez confirms manually" (`engine.ts:431-462`). It fails safe.
- **Fallback never silently drops Jeff data.** On Supabase failure, every Jeff write still lands in the local mirror and surfaces a warning string (`persistence.ts:1079-1085, 1138-1144`).

### Findings

**1. RLS enabled on every table but zero policies — production data protected only by the service-role key**
*Severity: High.* *Location:* all `supabase/migrations/*` (e.g. `20260617143001...sql:58`), live advisor `rls_enabled_no_policy` × 10 WrenchReady tables.
*Evidence:* Every migration does `enable row level security` then grants CRUD only to `service_role`; no `create policy` exists anywhere in the repo. The live security advisor returns `rls_enabled_no_policy` for `wrenchready_promise`, `wrenchready_inbound`, `wrenchready_jeff_*` (all), and `wrenchready_operator_task`. Effectively this is default-deny for anon/authenticated roles, which is *safe today* only because the app always connects with the service-role key (`supabase.ts:26`).
*Why it matters:* There is no defense-in-depth. If an `anon`/`authenticated` Supabase key is ever exposed client-side (and the codebase already reads `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `supabase.ts:22-24`), the *intended* deny is real, but the moment anyone adds a permissive policy or a public read path, customer PII (names, phones, emails, addresses in `wrenchready_promise`/`_inbound`) is exposed with no row scoping. RLS-with-no-policy is a latent trap: it reads as "secured" in dashboards while providing no actual authorization logic.
*Recommendation:* Either (a) keep service-role-only access but document explicitly that these tables are server-only and add a CI assertion that no `NEXT_PUBLIC_SUPABASE_*` key can perform writes, or (b) add explicit `service_role`-scoped policies and, if any client access is ever needed, real per-row policies. Do not leave RLS "on" with no policies as the security model.

**2. WrenchReady runs on a shared multi-tenant database with no schema isolation**
*Severity: High.* *Location:* `.env.local` `SUPABASE_URL=https://tsisorwqxmizndrcidub.supabase.co` (project "Al Boreland"); live `list_tables`.
*Evidence:* The same Postgres instance and the same service-role credential serve `public.constitutions`, `public.trajectories` (223 rows), `public.vault_documents` (118 rows), `public.al_memories`, `public.cost_events`, `public.security_events`, and `public.al_jobs` alongside the WrenchReady tables. Migration `20260617225155_drop_stale_al_boreland_schema.sql` explicitly drops an `al_boreland` schema "not used by the WrenchReady app," confirming the environments are entangled.
*Why it matters:* One leaked/over-scoped service-role key compromises *every* business on the instance, not just WrenchReady. There is no blast-radius containment, noisy-neighbor protection, independent backup/restore, or per-tenant rate limiting. For "the operating system of a real dispatch business" with customer PII, sharing a DB with unrelated AI-agent doctrine tables is an avoidable structural risk.
*Recommendation:* Move WrenchReady to its own Supabase project (or at minimum a dedicated `wrenchready` schema with a scoped role whose grants exclude the other tables). Rotate the service-role key on separation.

**3. Promise CRM tables (`wrenchready_promise`, `wrenchready_inbound`) have no migration — schema drift between code and DB**
*Severity: High.* *Location:* `supabase/migrations/` (no file references `wrenchready_promise`); live schema exists with 51/18 rows.
*Evidence:* `grep -rln "wrenchready_promise" supabase/migrations/` returns nothing, yet the tables exist in production with CHECK constraints (`owner = ANY ('Dez','Simon','Unassigned')`, `status = ANY (...)`), a FK `wrenchready_promise_inbound_id_fkey`, and `notes`/`raw_payload`/`top_risks` as `jsonb`. The migration list shows no DDL for them. There is even an orphaned function `set_wrenchready_promise_updated_at` in the DB (security advisor `function_search_path_mutable`) with **no trigger attached** (`pg_trigger` returns empty for these tables) — evidence the schema was hand-edited in the dashboard, intentions half-applied.
*Why it matters:* The system of record for jobs, customer PII, and scheduling cannot be reproduced from the repo. A new environment, a restore, or a teammate's local stack will be missing the core tables. The TypeScript row types in `storage.ts` (e.g. `SupabasePromiseRow`) are the only "schema," and nothing keeps them in sync with the live table.
*Recommendation:* Reverse-engineer the live `wrenchready_promise`/`wrenchready_inbound` definitions into checked-in migrations (Supabase CLI `db pull`), wire or delete the orphaned `updated_at` function, and treat dashboard DDL as forbidden going forward.

**4. Read-modify-write updates are lost-update races (no optimistic concurrency)**
*Severity: High.* *Location:* `storage.ts:updatePromiseRecord` (~line 2300) and `updateInboundRecord` (~line 2156).
*Evidence:* Every mutation does `const current = await getPromiseRecord(id)` → build a fully merged record in app memory → `PATCH wrenchready_promise?id=eq.${id}` with the whole `notes` array and derived fields. There is no `If-Match`, no version column, no conditional `updated_at` predicate. Two concurrent writers (e.g. the cron sync, Jeff's voice tools, and an ops user on `/ops/promises/[id]`) each read the same base and the second PATCH overwrites the first.
*Why it matters:* The `notes` JSONB array is the dumping ground for economics, closeout, outbound history, follow-through, quote packets, etc. (see Finding 5). A lost update here silently erases financial/closeout state, not just a label. With multiple techs and an AI agent writing concurrently, this *will* corrupt records.
*Recommendation:* Add an `updated_at`/`version` column and make PATCH conditional (`...&updated_at=eq.<read-time>`), retry on zero-rows-affected; or push the merge into the DB with `jsonb` operators / an RPC so the read-modify-write is atomic.

**5. Structured domain state is serialized into a free-text `notes` array**
*Severity: Medium.* *Location:* `storage.ts:497-528` (extract chain), `storage.ts:2335-2412` (merge chain); supporting modules `economics.ts`, `closeout-recapture.ts`, `quote-packet.ts`, `outbound-history.ts`, `follow-through-resolution.ts`, `execution-ops.ts`, `promise-readiness.ts`.
*Evidence:* On read, a row's `notes` is run through `extractPromiseEconomics → extractCommercialOutcome → extractPromiseExecutionOps → extractFollowThrough... → extractPromiseCloseout → extractPromiseOutboundHistory → extractPromiseReadinessState → extractPromiseQuotePacket`, each peeling its object out of the note strings and returning `visibleNotes`. On write the inverse `mergePromiseNotesWith*` chain re-encodes them. At least nine structured objects (including money: economics, quote packet, payment collection) live inside one `jsonb` text array.
*Why it matters:* None of this is queryable, constrained, or indexable at the DB level — you cannot `WHERE economics.total > x` or enforce that a quote packet is well-formed. Parsing is brittle string-matching; a malformed note silently yields a default object. It also amplifies Finding 4: the entire blob is rewritten on every update. This is a schema-design smell that will not scale to 7 techs and real reporting.
*Recommendation:* Promote the high-value structured objects (economics, quote packet, payment, closeout) to typed columns or child tables with their own constraints; keep `notes` for genuine free text only.

**6. Internal double-booking guard is blind — 50 of 51 live promises have no structured time window**
*Severity: Medium.* *Location:* `engine.ts:293-305` (`internalScheduleBusyBlocks`) vs `storage.ts:updatePromiseRecord` patch body.
*Evidence:* The engine builds internal busy blocks from `record.scheduledWindow.startIso/endIso` (`engine.ts:298-300`). But the promise PATCH body sets only `scheduled_window_label` — it never includes `scheduled_window_start`/`scheduled_window_end` (verified: the `patch` object at `storage.ts:2328-2376` has no structured-window keys). Live query: `count(*) where scheduled_window_start is not null = 1` out of 51. So `internalScheduleBusyBlocks` returns essentially one block; the rest of the schedule is invisible to conflict detection. Buffer/overlap math itself is correct (`intervalsOverlap`, `engine.ts:193-195`), but it has almost no data to act on.
*Why it matters:* The product's headline promise is conflict-free dispatch. Today the internal calendar contributes no protection against double-booking; only Google Calendar busy blocks do. As tech count grows, slots will be offered over existing internal commitments.
*Recommendation:* Persist structured `scheduled_window_start/end` on every schedule update (parse the chosen slot's ISO bounds), and backfill the 50 label-only promises. Consider a DB exclusion constraint (`tstzrange` + `EXCLUDE USING gist`) per technician to make double-booking impossible at the data layer.

**7. Public `/api/appointments` writes to a non-existent table using the anon key**
*Severity: Medium.* *Location:* `src/app/api/appointments/route.ts:44-72`.
*Evidence:* `storeToSupabase` POSTs to `${url}/rest/v1/appointments` with `SUPABASE_ANON_KEY` (route:46), bypassing the `supabase.ts` helper entirely. Live check: `to_regclass('public.appointments')` is `null` — the table does not exist. On failure the function logs `"Supabase insert failed:"` and returns `null`; the route continues.
*Why it matters:* The customer-facing booking surface's persistence is dead. Bookings are not stored in this path (they presumably survive only via the calendar-hold / Promise CRM flow, if at all). It also demonstrates a second, divergent Supabase access pattern with its own (anon) credential and no shared timeout/error handling.
*Recommendation:* Delete the dead path or point it at a real, migrated table through the shared `supabaseRestRequest` helper with a privileged key; add a smoke test asserting the insert returns a row.

**8. Local `.data` mirror drift and non-durable Vercel fallback**
*Severity: Medium.* *Location:* `local-data.ts:9-29`, `persistence.ts:1063-1120, 1010-1061`.
*Evidence:* On Vercel the local mirror root is `os.tmpdir()/wrenchready-jeff` and `getJeffLocalDataRootStatus()` reports `durableAcrossDeployments: false` (`local-data.ts:13-14, 27`). Reads for field events go through `syncJeffFieldEventMirror` which pulls Supabase→local and pushes local→Supabase by id-diff (`persistence.ts:1024-1037`), but **memory/conversation/workspace writes mirror locally with no reconciliation** — if a Supabase write succeeds but the local write is from an older deploy's tmp dir, the two stores diverge. The mirror is "last-writer per file, top-500/1000 by recency" (`local-data.ts` slices in `persistence.ts:595, 612, 547-552`), so older rows silently age out of the local copy.
*Why it matters:* Per-serverless-instance tmp dirs mean the "mirror" is really per-lambda scratch, not a coherent second store. The fallback-to-local-on-read path (`persistence.ts:1113-1118`) can serve a *stale or truncated* view during a Supabase blip and present it as authoritative.
*Recommendation:* Treat Supabase as the single source of truth in production; disable the local mirror on Vercel (or make it read-through cache only), and reconcile memory/conversation/workspace the same way field events are, or not at all.

**9. `wrenchready_promise.updated_at` is never updated**
*Severity: Low.* *Location:* `storage.ts` patch body (no `updated_at` key); live `pg_trigger` empty for the table.
*Evidence:* The PATCH body for promise updates omits `updated_at`, and there is no DB trigger maintaining it (the `set_wrenchready_promise_updated_at` function is orphaned — Finding 3). `updated_at` therefore stays at the insert default `now()`.
*Why it matters:* Any logic or reporting that relies on `updated_at` (staleness detection, sync ordering, "tomorrow at risk" recency) is using a frozen value. Several Jeff tables order by `updated_at desc` for *their* tables; if the same assumption leaks to promises it is wrong.
*Recommendation:* Attach the existing function as a `BEFORE UPDATE` trigger (and set its `search_path`), or include `updated_at: new Date().toISOString()` in the patch.

**10. `function_search_path_mutable` on five SECURITY-relevant functions**
*Severity: Low.* *Location:* live security advisor.
*Evidence:* `set_wrenchready_promise_updated_at`, `match_al_memories_text/_vector`, `match_vault_documents_text/_vector` all have role-mutable `search_path`.
*Why it matters:* Mutable `search_path` on functions is a standard privilege-escalation vector (schema shadowing). Low impact here because the WrenchReady ones aren't `SECURITY DEFINER` and the match functions belong to the co-tenant, but it's flagged on the same instance the app trusts.
*Recommendation:* `ALTER FUNCTION ... SET search_path = ''` (or an explicit schema) on all of them.

### Score rationale

The Jeff subsystem alone would score ~7: it is migration-managed, constraint-rich, well-indexed, and fails safe. The scheduling engine's timezone handling is the best code in this dimension. But the Promise CRM — which holds the money, the customers, and the schedule — drags the score down hard: it is **unmigrated** (Finding 3), **race-prone** (Finding 4), **schema-smells structured data into free text** (Finding 5), and its **double-booking guard is non-functional in production** (Finding 6, proven: 1/51 rows). Layer on a **shared multi-tenant DB** (Finding 2), **RLS-with-no-policies as the entire authz model** (Finding 1), and a **dead public booking writer** (Finding 7), and the durability/integrity story is weak for a system meant to run a real business. Nothing here is unrecoverable — these are fixable with migrations, optimistic concurrency, structured columns, and a dedicated project — but as it stands the data layer is "works in the pilot, will bite at scale." **4.5 / 10.**


<div style="page-break-after: always;"></div>

---

## 7. Code Cleanliness & TypeScript Quality

**Verdict:** This is an unusually type-disciplined codebase for an early-stage startup. TypeScript `strict` is on, the build does *not* suppress type or lint errors, raw `any` is effectively absent (2 occurrences, both in domain strings not types), there are zero `@ts-ignore`/`@ts-expect-error`, zero `eslint-disable`, exactly one non-null assertion, and every `JSON.parse` is inside a `try/catch`. Error handling is consistent and intentional (no empty catches; wrapped via a shared `crmUnavailable` helper). The debt is not in type *safety* — it is in **scale and duplication**: a handful of 1,400–5,765-line monoliths, a 2,425-line / 119-`useState` React form, `formatCurrency` reimplemented ~18 times, `isObject`/`optionalString` reimplemented ~9 times, no schema-validation library despite a large untrusted webhook/AI surface, no structured error monitoring, and a near-total absence of explanatory comments in the two biggest engine files.

**Score: 6.5/10**

### What's here

- **Compiler config** (`tsconfig.json:1`): `strict: true`, `noEmit`, `isolatedModules`, `moduleResolution: bundler`, path alias `@/*`. Notably *missing*: `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride` — so only the baseline `strict` bundle is in force.
- **Build gates** (`next.config.ts`): no `typescript.ignoreBuildErrors` and no `eslint.ignoreDuringBuilds`. Type and lint failures break the Vercel build. This is the single most important cleanliness signal and it is set correctly.
- **Lint** (`eslint.config.mjs`): stock `next/core-web-vitals` + `next/typescript`. No custom rules (e.g. no `max-lines`, no `complexity`, no import-order enforcement), so the monolith growth is unchecked by tooling.
- **Scale**: ~62,384 LOC TS/TSX. Eleven files exceed 1,000 lines, topped by `src/lib/jeff-field-assistant/tools.ts` (5,765), `src/lib/promise-crm/storage.ts` (4,029), `src/components/promise-status-form.tsx` (2,425), and `src/app/ops/promises/[id]/page.tsx` (2,247).
- **Shared utilities**: essentially one — `src/lib/utils.ts` contains only `cn()`. There is no shared `format`/`validation`/`time` module, which is the root cause of the duplication findings below.
- **Boundary typing idiom**: tool/route entry points take `payload: unknown` and narrow via hand-rolled guards (`isObject`, `optionalString`, `as Record<string, unknown>`). This is *safe* (no blind trust of input types) but verbose and unvalidated at the field level.

### Strengths

- **Near-zero escape hatches.** `grep` for `any` types returns 2 hits, both false positives in strings (`service-policy.ts:90`, `:197` — the word "any" in a prompt). Zero `@ts-ignore`/`@ts-expect-error`/`@ts-nocheck`, zero `eslint-disable`, one non-null assertion in the entire `src` tree. Only two `as unknown as` double-casts exist, both narrowly scoped to `window.gtag` (`src/components/analytics.tsx:131,141`). For a 62K-LOC codebase this is exceptional.
- **All `JSON.parse` is guarded.** All 22 call sites are wrapped in `try/catch` with sane fallbacks, e.g. the generic `parseJsonLine<T>` (`src/lib/promise-crm/execution-ops.ts:28`) and `extractPromiseEconomics` (`src/lib/promise-crm/economics.ts:48`). No unprotected parse of external/stored data.
- **Disciplined error handling, no swallowing.** Zero empty `catch {}` blocks across the tree. CRM storage funnels failures through one helper and decides demo-fallback-vs-throw consistently, e.g. `storage.ts:902`: `if (demoFallbackEnabled()) return getDemoPromiseRecords(); throw crmUnavailable("Promise CRM live promise read failed.", error);`. Only 5 `console.*` calls exist app-wide, all in API routes — the code is not littered with debug noise.
- **Precise domain types.** `tools.ts:91-149` defines tight input types (`ActiveJobInput`, `RecordEventInput`, `CoreMemoryInput`, …) and imports a rich type vocabulary from `types.ts` (1,337 LOC) rather than leaning on `any`. `as const` is used 90 times for literal unions — idiomatic and correct.
- **Centralized auth helpers.** API authorization is not copy-pasted: routes import `authorizeJeffToolRequest` / `authorizeJeffFieldAppRequest` (e.g. `src/app/api/al/wrenchready/jeff/tools/route.ts:9`) from a single source, with a timing-safe PIN check in `app-auth.ts`.
- **Consistent micro-conventions.** The `payload: unknown` → `isObject(payload) ? payload : {}` → field-by-field `optionalString(...)` pattern is applied uniformly across all 37 exported tool functions (e.g. `tools.ts:2679` `getActiveFieldJob`), making the engine predictable to read despite its size.

### Findings

**Monolith engine and form files with no structural decomposition**
- **Severity:** High
- **Location:** `src/lib/jeff-field-assistant/tools.ts:1` (5,765 LOC, 37 exported functions); `src/lib/promise-crm/storage.ts:1` (4,029 LOC); `src/components/promise-status-form.tsx:126` (single component spanning lines 126–2,425, **119 `useState` calls**)
- **Evidence:** `tools.ts` exports 37 async tool handlers in one file (`prepareQuoteDraftForReview` at :1568 through `getJeffAssistantConfig` at :5748). `PromiseStatusForm` is one function containing 119 `useState` hooks — `awk 'NR>=126' | grep -c useState` returns 119. `storage.ts` is the second-largest file in the repo.
- **Why it matters:** These files are merge-conflict magnets, defeat code-splitting/tree-shaking, blow up the React component's re-render surface (119 independent state atoms in one component is a performance and correctness hazard — any setState re-runs the whole 2,300-line render), and make review and onboarding slow. The 2,247-line `ops/promises/[id]/page.tsx` compounds the same problem on the page side.
- **Recommendation:** Split `tools.ts` by capability domain (jobs, photos/media, memory, scheduling, payments, parts, schemas) into a `tools/` directory re-exported through one barrel; keep the `payload: unknown` contract. Decompose `PromiseStatusForm` into per-section subcomponents and consolidate state into a `useReducer` (or a few grouped objects). Add an ESLint `max-lines` warning to stop regression.

**`formatCurrency` duplicated ~18 times; no shared formatting/util layer**
- **Severity:** Medium
- **Location:** 18 near-identical definitions, e.g. `src/app/ops/insights/page.tsx:22`, `src/app/ops/accounts/page.tsx:17`, `src/components/customer-deposit-checkout.tsx:13`, `src/lib/promise-crm/quote-packet.ts:160`, `src/lib/jeff-field-assistant/tools.ts:566` (`formatMoney`)
- **Evidence:** Each is the same `new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value)`, diverging only in the undefined fallback string — `"Not set"` (`accounts/page.tsx`), `"TBD"` (`customer-deposit-checkout.tsx`), `"$0"` elsewhere. `src/lib/utils.ts` contains only `cn()`.
- **Why it matters:** This is the canonical copy-paste smell, and the divergent fallbacks are a *latent inconsistency bug* — the same null value renders three different ways across the ops UI. A pricing/format policy change requires editing 18 files.
- **Recommendation:** Add `src/lib/format.ts` exporting `formatCurrency(value?: number, opts?)` with a single configurable fallback, and replace all copies. Do the same for `formatList`/`parseList`/`formatPhone`.

**Core narrowing helpers (`isObject`, `optionalString`) reimplemented ~9 times**
- **Severity:** Medium
- **Location:** `src/lib/jeff-field-assistant/tools.ts:299-303`, `media.ts:74-82`, `persistence.ts:205-209`, `session.ts:61-71`, `app-chat.ts:118`, plus more — `rg -l 'function isObject'` returns 9 files
- **Evidence:** Identical `function isObject(value: unknown): value is Record<string, unknown>` and `optionalString` bodies recur across the Jeff engine and elsewhere.
- **Why it matters:** These are the load-bearing input-validation primitives. Nine copies means nine places to fix if the narrowing rule changes, and risks subtle drift in what counts as a valid object/string at trust boundaries.
- **Recommendation:** Extract to `src/lib/guards.ts` (e.g. `isObject`, `optionalString`, `optionalNumber`, `optionalStringList`) and import everywhere.

**No schema-validation library despite a large untrusted input surface**
- **Severity:** High
- **Location:** Hand-rolled validation throughout — `src/app/api/al/wrenchready/promises/[id]/route.ts:275-430` (dozens of `as Record<string, unknown>` + manual `typeof` chains), `tools.ts` (37 handlers re-narrowing `payload: unknown`). `package.json` has no `zod`/`yup`/`valibot`/`ajv`.
- **Evidence:** `promises/[id]/route.ts` validates nested request bodies with deeply nested manual checks such as `typeof (nextProbableVisit as Record<string, unknown>).reason === "string"` (:401). There are ~41 hand-written `is*` type-guard functions across `src`. JSON parsed out of CRM "note" prefixes is cast `as T` with no runtime validation (`execution-ops.ts:31`).
- **Why it matters:** This surface receives Vapi/Twilio webhooks, AI tool calls, and the public `/api/al/*` endpoints. Hand-rolled guards are verbose, easy to get subtly wrong (a missing field check silently passes `undefined` through), and the `JSON.parse(...) as T` casts trust persisted blobs that could be malformed. Schema validation would collapse hundreds of lines into declarative, exhaustively-checked schemas.
- **Recommendation:** Adopt Zod for API route bodies, Vapi tool payloads, and the prefixed-note decoders. Derive TS types from schemas (`z.infer`) to also remove the manual `*Input` types.

**Structured data smuggled through free-text `notes[]` as magic-prefixed JSON**
- **Severity:** Medium
- **Location:** `src/lib/promise-crm/economics.ts:48`, `execution-ops.ts:23-31` (`__job-stage::`, `__field-packet::`, `__payment-collection::`, `__warranty-case::`, `__recurring-account::`), `customer-access.ts:126`, `quote-packet.ts:137`, `closeout-recapture.ts:341`, `commercial-outcome.ts:45`, `promise-readiness.ts:87`, `follow-through-resolution.ts:120`
- **Evidence:** At least ~10 distinct typed record families are serialized as `${PREFIX}${JSON.stringify(obj)}` and stored inside a promise's `notes` string array, then recovered via `JSON.parse(note.slice(PREFIX.length))` and filtered out of the user-visible note list (`economics.ts:44-62`).
- **Why it matters:** This is a cleanliness/data-modeling smell that leaks into type safety: structured CRM state (economics, payments, warranties) lives in stringly-typed note text instead of columns/tables, every read is a parse-and-pray `as T`, and a stray user note beginning with `__` could collide. It's clever for shipping fast on a flat schema, but it's fragile and undiscoverable.
- **Recommendation:** Promote these record families to first-class Supabase columns/JSONB fields or related tables; at minimum, validate them with a schema on decode rather than casting.

**No structured logging or error monitoring**
- **Severity:** Medium
- **Location:** Whole repo. `grep -i 'sentry|datadog|pino|winston|logtail' package.json` → none. Only 5 `console.*` calls exist (`api/appointments/route.ts:71,331`, `api/scheduling/availability/route.ts:35`, `api/twilio/voicemail/complete/route.ts:43,61`)
- **Evidence:** 171 `catch` blocks but only 5 console statements and no observability SDK; 36 `.catch(() => undefined)` silent swallows (e.g. `storage.ts:1830`) and 40 `catch {` blocks discard the error entirely.
- **Why it matters:** For "the operating system of a real dispatch business," failures in payment checks, scheduling, Twilio SMS, and AI tool calls vanish with no breadcrumb. The intentional demo-fallback design (`demoFallbackEnabled()`) means a live integration can silently degrade to mock data and nobody is paged.
- **Recommendation:** Add a thin logger (`src/lib/log.ts`) and wire Sentry (or Axiom/Logtail). Log on the throw-vs-fallback decision branches and on every silent `.catch(() => undefined)` so degraded-mode operation is observable.

**Two largest engine files are essentially uncommented**
- **Severity:** Low
- **Location:** `src/lib/promise-crm/storage.ts` (4,029 LOC, **0** comment lines); `src/lib/jeff-field-assistant/tools.ts` (5,765 LOC, 3 comment lines)
- **Evidence:** `grep -c '//' storage.ts` → 0; `grep -c '//' tools.ts` → 3.
- **Why it matters:** The most complex, business-critical logic in the system (CRM persistence, AI tool semantics) carries the least explanation. The code is reasonably self-documenting via good naming, but non-obvious decisions (demo-fallback rules, match-scoring thresholds like `score < 20` at `tools.ts:847`, the note-prefix protocol) deserve rationale comments. Where comments *do* exist they are high-signal (e.g. `economics.ts:53` "Keep malformed internal notes out of the visible note list.") — there just aren't enough.
- **Recommendation:** Add module-level doc comments explaining each engine's contract and inline comments at the magic thresholds and the fallback decision points.

**`noUncheckedIndexedAccess` disabled while code indexes arrays freely**
- **Severity:** Low
- **Location:** `tsconfig.json:1` (flag absent); usage e.g. `tools.ts:848` and `:2691` `matches[0].score === matches[1].score`, `:2722` `matchScore: matches[0].score`
- **Evidence:** The flag is not set, so `matches[0]` is typed non-`undefined` even though `matches` may be empty; the code guards some sites with `matches.length > 1` but accesses `matches[0].score` (`:2722`) after only a `!selected` early-return, relying on logic rather than the type system.
- **Why it matters:** Enabling the flag would force explicit handling of empty-array access and is the highest-leverage remaining strictness upgrade for a codebase that does heavy array/record indexing.
- **Recommendation:** Turn on `noUncheckedIndexedAccess` (and consider `exactOptionalPropertyTypes`), then fix the fallout — most will be cheap optional-chaining or guard additions.

**Per-route auth boilerplate repetition**
- **Severity:** Info
- **Location:** ~15 routes repeat `const auth = authorizeJeff...(request); if (!auth.authorized) { return ... }` (e.g. `api/al/wrenchready/jeff/messages/route.ts:13`, `location/check-in/route.ts:8`, `google/gmail/sync/route.ts:8`)
- **Evidence:** The *helper* is shared, but the guard-and-return wrapper is hand-copied into every handler.
- **Why it matters:** Low risk (the security logic is centralized), but it's the kind of repetition where one route forgets the check. A wrapper would make the check structural.
- **Recommendation:** Provide a `withJeffAuth(handler)` higher-order route wrapper so authorization can't be omitted.

### Score rationale

The type-safety fundamentals are top-decile: strict mode enforced at build time, virtually no `any`/`ts-ignore`/non-null escapes, universally guarded `JSON.parse`, no swallowed exceptions, and consistent, readable boundary-narrowing conventions. That alone floors the score well above average. It is pulled down from "great" by structural debt that is real and would bite a scaling team: 5,765- and 4,029-line engine files, a 119-`useState` mega-form, ~18× `formatCurrency` and ~9× `isObject` duplication caused by an almost-empty shared-util layer, the absence of a schema-validation library across a large untrusted webhook/AI surface (where validation is instead hand-rolled and occasionally cast-trusting), structured business state smuggled through note strings, and no error monitoring on a system that intentionally falls back to mock data on failure. None of these are correctness time-bombs today, but each is a clear, namable barrier to the stated goal of scaling to seven techs. **6.5/10** — clean, rigorous TypeScript with serious organizational and DRY debt concentrated in a few oversized files.


<div style="page-break-after: always;"></div>

---

## 8. Build, Tooling, Config & Developer Experience

**Verdict:** The build/config baseline is conventional and sane for a Next.js 16 app — strict TypeScript, a clean Turbopack/PostCSS/Tailwind v4 setup, a passing lint run, and no `ignoreBuildErrors` escape hatches. But the "test" story is integration smoke-scripts that all require a live server, there is **zero CI**, env management is a sprawl of five on-disk `.env*` files with a 77-vs-25 key mismatch, and the repo ships **a live FAL API key hardcoded into three committed Python files**. A new engineer can `npm run dev` quickly, but cannot run any test offline, has no `.env.example`-to-runtime contract enforcement, and would inherit cross-platform (Windows-path) breakage and a leaked credential.

**Score: 5.0 / 10**

### What's here

Root config surface (all present, all small and readable):

- `next.config.ts` (78 lines): a `www`→apex 301 redirect, `X-Robots-Tag: noindex` headers for `/ops*` and `/jeff*`, and `turbopack.root = process.cwd()`.
- `tsconfig.json`: `strict: true`, `noEmit`, `moduleResolution: "bundler"`, `target: "ES2017"`, `@/*` path alias.
- `eslint.config.mjs` (flat config): just `eslint-config-next` core-web-vitals + typescript presets, nothing custom.
- `vercel.json`: one daily cron (`/api/al/wrenchready/jeff/sync` at `0 12 * * *`), framework pinned to `nextjs`.
- `components.json` (shadcn, `base-nova` style), `postcss.config.mjs` (Tailwind v4 plugin only).
- `package.json`: 13 runtime deps, 8 devDeps, **no test framework**, 16 npm scripts (5 of them `verify:*`, plus `sync:*`/`google:oauth`/`call:jeff` operational scripts).

"Test harness": `scripts/verify-*.mjs` (7 files, ~2,100 LOC). Every one imports `./load-local-env.mjs` and hits a running HTTP server via `fetch` (`scripts/verify-jeff-field-assistant.mjs:5`, `scripts/verify-wrenchready-api-security.mjs:3`). They are hand-rolled `assert()` integration probes, not unit tests.

Env management: `.env.example` (118 lines, 77 keys), plus on-disk `.env.local`, `.env.local.backup-20260618-070059`, `.env.project.local`, `.env.vercel.local`. Runtime access goes through `src/lib/env.ts` `readEnv(...keys)` (fallback-chain lookup with quote/CRLF normalization) and `scripts/load-local-env.mjs` (a mini dotenv loader that reads `.env.local`, `.env.vercel.local`, `.env.project.local` in order).

Stray repo artifacts: 6 Python media-generation scripts (`gen-favicons.py`, `composite-and-submit.py`, `gen-rotor-clip.py`, `poll-rotor.py`, `stitch-mobile.py`, `gen-rotor-clip.py`) and 4 `*-probe.json` ffprobe dumps, all committed.

### Strengths

- **No build-error suppression.** `next.config.ts` does *not* set `typescript.ignoreBuildErrors` or `eslint.ignoreDuringBuilds` (verified by grep — none present). Combined with `strict: true` (`tsconfig.json:7`) and `noEmit` (`tsconfig.json:8`), type and lint errors actually fail the Vercel build. This is the single most important DX guardrail and it's correctly in place.
- **Lint is green and meaningful enough.** `npm run lint` returns `0 errors, 9 warnings` — all `no-unused-vars` (e.g. `src/app/locations/[slug]/page.tsx:3`). The flat config inherits Next's core-web-vitals + TS rules (`eslint.config.mjs:6`), so it catches real React/Next foot-guns rather than being a no-op.
- **Centralized, defensive env reader.** `readEnv` (`src/lib/env.ts:13`) supports multi-key fallback and strips quotes/escaped CRLF (`src/lib/env.ts:4`), which is genuinely useful given Google service-account private keys and quoted review URLs in the env set. 36 source files use it; only ~10 touch `process.env` directly.
- **Clean secret-ignore baseline for env files.** `.gitignore` has both `.env*` (`!.env.example`) and a trailing `.env*.local`, and `git check-ignore` confirms `.env.local`, `.env.local.backup-*`, and `.env.vercel.local` are all ignored — so the *dotenv* secrets are not committed.
- **Pinned framework versions.** `next`, `react`, `react-dom`, and `eslint-config-next` are exact-pinned (`package.json:31`, `:46`), reducing "works on my machine" drift on the critical path.

### Findings

**Live FAL API key hardcoded in committed Python scripts**
- **Severity: Critical**
- **Location:** `composite-and-submit.py:44`, `gen-rotor-clip.py:6`, `poll-rotor.py:5` (and confirmed in committed `HEAD`)
- **Evidence:** `FAL_KEY = "<REDACTED — exposed fal.ai key; revoke/delete it on fal.ai>"` appeared verbatim in three tracked files (now read from `process.env`). The literal value was also committed to version history, not just the working tree. Key value redacted from this doc 2026-06-21; it remains valid until revoked on fal.ai.
- **Why it matters:** This is a real, active fal.ai credential committed to the repo. Anyone with repo access (or anyone the repo is ever shared/published to) can run paid video-generation jobs on this account. Unlike the `.env*` files, these `.py` files are *not* gitignored and *not* in `.vercelignore`, so they also ship into the Vercel build context.
- **Recommendation:** Rotate the FAL key immediately. Remove it from the files, read it from `process.env`/an env var, and purge it from git history (`git filter-repo`). Add a secret scanner (gitleaks/trufflehog) to a pre-commit hook and CI.

**No CI pipeline at all**
- **Severity: High**
- **Location:** repo root — no `.github/`, `.gitlab-ci.yml`, or `.circleci/` exists (verified by `ls`/`find`).
- **Evidence:** The only quality gates are whatever Vercel runs on deploy (build + the implicit `next lint` if configured) and manually-invoked `verify:*` scripts. Nothing runs lint, typecheck, the verify suite, or a secret scan on push/PR.
- **Why it matters:** For a business that is the "operating system" for live dispatch, money (Stripe), and customer PII, there is no automated gate preventing a broken `tsc`, a regressed auth check, or a newly-leaked secret from reaching `main`. The verify scripts exist but nothing enforces them.
- **Recommendation:** Add a minimal GitHub Actions workflow: `npm ci` → `npx tsc --noEmit` → `npm run lint` → gitleaks. Add a deploy-gated job that runs the `verify:security` / `verify:jeff` scripts against the Vercel preview URL.

**No unit-test framework; "tests" are server-dependent integration probes**
- **Severity: High**
- **Location:** `package.json:11-17`, `scripts/verify-*.mjs`
- **Evidence:** There is no `jest`/`vitest`/`node:test` dependency and no `"test"` npm script. All 7 verify scripts call `fetch(${baseUrl}...)` against `http://localhost:3000` or production (`scripts/verify-jeff-field-assistant.mjs:5`, `:21`; `scripts/verify-wrenchready-api-security.mjs:3`). None can run without a booted server + real env + (for some) `.data/jeff/*.json` fixtures on disk.
- **Why it matters:** The two largest, highest-risk modules — `jeff-field-assistant/tools.ts` (5,765 LOC) and `promise-crm/storage.ts` (4,029 LOC) — have no isolated, fast, deterministic tests. Pure logic (pricing math, diagnostic-tree gating, env normalization) cannot be exercised in milliseconds; every "test" needs the whole app up. This makes refactoring the monolith files dangerous and slows the feedback loop to seconds-per-server-boot.
- **Recommendation:** Add `vitest`, extract pure functions, and write unit tests for pricing/quote logic, `readEnv`, and auth helpers. Keep the `verify:*` scripts as a separate "e2e/smoke" tier wired into CI against previews.

**`.env.example` does not match the real env contract; no startup validation**
- **Severity: Medium**
- **Location:** `.env.example` (77 keys) vs `.env.local` (25 keys); `src/lib/env.ts`
- **Evidence:** `.env.example` lists 77 keys; the working `.env.local` defines only 25. `readEnv` returns `undefined` silently for missing keys (`src/lib/env.ts:21`) — there is no schema/validation (no `zod`/`envalid`) and no boot-time assertion that required vars are present.
- **Why it matters:** A new engineer can't tell which of 77 keys are actually required vs aspirational, and a missing critical secret (e.g. `STRIPE_WEBHOOK_SECRET`, `JEFF_FIELD_ASSISTANT_TOOL_SECRET`) surfaces as a runtime `undefined`/401 deep in a request path rather than a clear startup error. The example file overstates the surface and the runtime understates the failure.
- **Recommendation:** Define a validated env schema (zod) for *required* vars, fail fast at boot with a readable message, and regenerate `.env.example` from it so the example is the contract. Mark optional/feature-flag vars distinctly.

**Cross-platform rot: hardcoded Windows paths in scripts and agent docs**
- **Severity: Medium**
- **Location:** `composite-and-submit.py:8`, `:11`; `stitch-mobile.py` (`BASE = r"c:\Users\adamd\Desktop\Simon\..."`); `gen-favicons.py:4` (`r"public\logo-assets\..."`); `CLAUDE.md` (4 hardcoded `C:\...` vault paths)
- **Evidence:** Scripts embed absolute `C:\Users\adamd\Desktop\Simon\wrenchreadymobile.com\...` paths, but the repo now lives at `/Users/dez/Desktop/Codex Projects/WrenchReady/...` (note the space). `CLAUDE.md` points doctrine at `C:\Users\adamd\Desktop\al-boreland-vault\...` which does not exist on this machine.
- **Why it matters:** These scripts are dead on the current (macOS) host and will silently fail or write to the wrong place. The agent-instruction file references a vault path that can't resolve, undermining the "source of truth" claims it makes. It signals config that was never made portable.
- **Recommendation:** Either delete the one-shot media scripts (they're build-time asset generation, not app code) or parameterize paths via `argv`/env and move them under `scripts/media/`. Update `CLAUDE.md` paths or make them relative.

**One-shot media-gen artifacts committed to the app repo**
- **Severity: Low**
- **Location:** root: `gen-favicons.py`, `composite-and-submit.py`, `gen-rotor-clip.py`, `poll-rotor.py`, `stitch-mobile.py`, `gen-rotor-clip.py`; `hero-probe.json`, `mobile-probe.json`, `rotor-probe.json`, `rotor-v8-probe.json`
- **Evidence:** 6 Python scripts + 4 ffprobe JSON dumps sit in the repo root and are git-tracked. `.gitignore` already excludes *some* generation scripts (`gen-clips*.py`, `stitch-hero*.py`, etc.) — proving the intent to keep these out — but these specific ones slipped through. They are also not in `.vercelignore`, so they're uploaded to every deploy.
- **Why it matters:** Repo-root clutter raises the "what is this?" cost for new contributors, the probe JSONs are throwaway debug output, and (per the Critical finding) some of these scripts are the secret-leak vector. None of it is part of the Next.js app.
- **Recommendation:** Move durable asset-gen tooling into `scripts/media/` with a README, delete the `*-probe.json` dumps, and add `*.py` / `*-probe.json` to `.gitignore` and `.vercelignore`.

**Env-file sprawl with an unmanaged secret-bearing backup**
- **Severity: Low**
- **Location:** `.env.local`, `.env.local.backup-20260618-070059`, `.env.project.local`, `.env.vercel.local`
- **Evidence:** Five `.env*` files on disk including a timestamped `.backup-` copy. `scripts/load-local-env.mjs:35` hardcodes a precedence list of three of them. They are correctly gitignored, but the backup is an ad-hoc, manually-created secret copy with no rotation/cleanup discipline.
- **Why it matters:** Manual `.env.local.backup-<timestamp>` files accumulate plaintext secrets on disk and are easy to accidentally `git add -f`, copy into a shared drive, or leave behind. The 3-file load order is also implicit tribal knowledge — a new dev won't know which file wins.
- **Recommendation:** Standardize on `.env.local` + Vercel-managed env (pull via `vercel env pull`), delete ad-hoc backups, and document the precedence in the README.

**`target: ES2017` is needlessly conservative**
- **Severity: Info**
- **Location:** `tsconfig.json:4`
- **Evidence:** `"target": "ES2017"` (the Next.js scaffold default) while the project runs React 19 / Next 16 on modern Node and modern browsers.
- **Why it matters:** Minor — it forces downleveling of `async/await`, optional chaining, etc. that every supported runtime handles natively, producing slightly larger output. No correctness impact; flagged only for completeness.
- **Recommendation:** Bump to `ES2022` to match the actual runtime floor. Low priority.

### Score rationale

The fundamentals that *prevent* shipping broken code are present and correct: strict TS with no build-error suppression, a green and non-trivial lint config, pinned framework versions, a centralized env reader, and correctly-gitignored dotenv files. That floor keeps this out of "serious problems" territory and is worth real credit.

But this dimension is dragged down hard by three things a top org would never ship: **a live API key committed to source** (Critical), **no CI whatsoever** (High), and **no offline/unit test capability** for a 62K-LOC app whose two biggest files are 4–6K-LOC monoliths handling money and dispatch (High). Add the env-contract mismatch, Windows-path rot, and repo-root clutter, and the new-engineer onboarding story is: clones fine, `npm run dev` works, but cannot test anything without standing up the full stack + real secrets, inherits a leaked credential, and trips over dead cross-platform scripts. That is a working-but-significant-debt profile. **5.0/10.**


<div style="page-break-after: always;"></div>

---

## 9. Security & Access Control

**Verdict.** The security posture is meaningfully better than the "no `src/middleware.ts`" inventory note implies: Next.js 16 renamed the middleware file to `proxy`, and `src/proxy.ts` is a real, compiled edge gate that enforces HTTP Basic auth on `/ops` and a curated list of CRM APIs, with a host-based rewrite for `ops.wrenchreadymobile.com`. Secret comparisons are mostly timing-safe, the Stripe webhook signature is verified correctly, no secrets are committed, and the public customer surface is deliberately PII-minimized. The two real exposures are (1) **inbound Twilio webhooks have no signature validation**, so anyone can forge SMS/voice payloads to inject CRM records and trigger outbound SMS from the business line, and (2) there is **no rate limiting or bot defense anywhere**, leaving every public write endpoint (booking, status-token actions, Twilio) open to abuse. A handful of secondary issues (derivable legacy status tokens, non-timing-safe PIN check on photo upload, fail-open auth when secrets are unset outside production) round out the debt.

**Score: 6.5/10**

### What's here

- **Edge auth gate — `src/proxy.ts`.** This *is* the middleware (Next 16 `PROXY_FILENAME = 'proxy'`, confirmed in `node_modules/next/dist/lib/constants.js:289`). It HTTP-Basic-protects `/ops` and the listed `/api/al/wrenchready/*` CRM routes (`src/proxy.ts:5-18`), accepts any of three env passwords (`src/proxy.ts:20-26`), and rewrites the `ops.wrenchreadymobile.com` host onto `/ops/*` (`src/proxy.ts:124-130`). Matcher: `/((?!_next/static|_next/image).*)` (`src/proxy.ts:135-137`).
- **Two secondary auth schemes for the Jeff engine.** A shared bearer/`x-vapi-secret` check (`authorizeJeffToolRequest`, `src/lib/jeff-field-assistant/tools.ts:2296`) guards every `/api/.../jeff/tools/*` route via `createJeffToolRoute` (`src/lib/jeff-field-assistant/route-handler.ts:6-31`), the Vapi server route, session/files/google-sync routes. A separate timing-safe PIN (`app-auth.ts`) guards the field mobile app surface (`/api/.../jeff/messages`, `/jeff/location/check-in`).
- **Public, token-scoped customer surface.** `/status/[token]` and `/api/wrenchready/status/[token]/{approval,deposit,balance,request-next-step}` are intentionally unauthenticated and scoped by an opaque token (`src/lib/promise-crm/customer-access.ts:28-34`).
- **Webhooks.** Stripe (`src/app/api/webhook/stripe/route.ts`) verifies signatures; Twilio (`/api/twilio/*`) and Vapi-via-tool-secret are the inbound integration surfaces.
- **Data layer.** All CRM persistence is server-side PostgREST against Supabase using a service-role/secret key (`src/lib/promise-crm/supabase.ts:16-40`), so Row-Level Security is *not* the trust boundary — the proxy + per-route checks are.
- **Verification harness.** `scripts/verify-wrenchready-api-security.mjs` probes 16 protected paths expecting `401`, asserts no CRM/fixture leakage in unauthenticated bodies, and confirms authenticated access works.

### Strengths

- **The "no middleware" gap is a false alarm.** `src/proxy.ts` is the genuine Next 16 middleware and is compiled into the build (`.next/server/middleware.js` present, derived from the `proxy` source per `node_modules/next/dist/build/index.js:644` `middleware-to-proxy`). `/ops` is *not* merely `noindex`'d — it is Basic-auth-gated (`src/proxy.ts:121-122`).
- **Stripe webhook is done correctly.** Raw body + signature header are passed to `stripe.webhooks.constructEvent` and a bad signature returns `400` (`src/app/api/webhook/stripe/route.ts:21-32`); idempotency is enforced via `lastPaymentReference` (`:47-49`).
- **Timing-safe secret comparisons in the core auth paths.** `app-auth.ts:12-16`, `tools.ts:520-523`, and `email/inbound/route.ts:16-20` all use `crypto.timingSafeEqual` with a length pre-check.
- **Customer status page is PII-minimized by design.** It renders vehicle/service/territory and a business phone, but routes the customer's own message/condition text through `customerSafeText`/`customerSafeScheduleLabel` sanitizers (`src/app/status/[token]/page.tsx:276-281, 355`) and never prints the customer's phone, email, or street address.
- **Primary status tokens have strong entropy.** New records get `wr_` + a full v4 UUID hex (`customer-access.ts:29`), and records created through the live path always call `createPromiseCustomerAccess()` (`storage.ts:1737, 2057`).
- **No committed secrets / no secret logging.** Only `.env.example` is tracked (`git ls-files | grep env`); `.env.local` and friends are gitignored (`.gitignore` `.env*` + `.env*.local`), and a grep for `console.*` over `secret|password|token|apikey|bearer|pin` returns nothing.
- **No SSRF in the Maps/parts tools.** `google-maps.ts` only ever `fetch`es two hard-coded Google endpoints (`:58-59`); user input is confined to request *bodies*, never the URL.

### Findings

**1. Inbound Twilio webhooks accept unsigned requests (forgeable SMS/voice → record injection + outbound SMS from business line)**
- **Severity:** High
- **Location:** `src/app/api/twilio/sms/route.ts:91-141`; all of `src/app/api/twilio/voice/*` and `voicemail/*`; no `X-Twilio-Signature` validation exists anywhere (grep for `validateRequest`/`twilio-signature` returns nothing).
- **Evidence:** The SMS handler reads `From`/`Body`/`ProfileName` straight off `formData` with no signature check, then (a) creates a CRM inbound record (`createInboundRecord`, `:102`), (b) fires ops alerts, and (c) **if the spoofed `From` matches a relay/ops phone, parses a `reply <number> <msg>` command and sends an arbitrary SMS from the WrenchReady business line** via `sendTwilioSms` (`:58-89, 98-99`). `TWILIO_AUTH_TOKEN` is configured (`.env.example`) but only used for *outbound* API auth, never to validate inbound webhooks.
- **Why it matters:** These endpoints are public (not in `proxy.ts` `PROTECTED_PREFIXES`). An attacker who knows the (guessable) route path can forge inbound texts to pollute the CRM/dispatch queue, spam Slack/SMS alerts, and—by spoofing the operator's caller ID in `From`—coerce the system into sending SMS to arbitrary numbers from the business's A2P-registered line, creating spam/compliance (10DLC) and reputational exposure.
- **Recommendation:** Validate `X-Twilio-Signature` against `TWILIO_AUTH_TOKEN` and the full request URL on every Twilio route (Twilio's `validateRequest`), rejecting with `403` on mismatch. Do not trust `From` for the operator-reply path—gate the relay command behind the validated signature, not just a phone-number match.

**2. No rate limiting, throttling, or bot defense on any public write endpoint**
- **Severity:** High
- **Location:** Whole app — grep for `rateLimit|ratelimit|throttle|upstash|captcha|turnstile|recaptcha` over `src/` returns nothing. Affected: `src/app/api/appointments/route.ts:248`, `src/app/api/wrenchready/status/[token]/{deposit,balance,approval,request-next-step}/route.ts`, `src/app/api/twilio/sms/route.ts`.
- **Evidence:** `/api/appointments` is an unauthenticated POST that writes to Supabase, creates a calendar hold, sends a customer email, and fires a webhook per call (`route.ts:308-315`); `/status/[token]/request-next-step` creates a new inbound record and mutates the promise on every POST (`request-next-step/route.ts:64-96`); the deposit/balance routes create real Stripe Checkout sessions.
- **Why it matters:** Each of these is a cheap, unauthenticated lever for cost/abuse amplification — Resend email floods, Google Calendar pollution, CRM/queue spam, Stripe session churn, and Twilio billing — with no IP/identity throttle. For a 7-tech business this is a denial-of-wallet and operational-noise risk, not just theoretical.
- **Recommendation:** Add per-IP + per-token rate limits (e.g. Upstash Ratelimit in `proxy.ts`, which already sees every request) and a bot check (Turnstile/hCaptcha) on the public booking form. At minimum, throttle `/api/appointments` and the status-token mutation routes.

**3. Legacy/migrated customer status tokens are derivable from the promise UUID (IDOR on records lacking a stored token)**
- **Severity:** Medium
- **Location:** `src/lib/promise-crm/customer-access.ts:36-42, 66-68, 127-131, 151`; consumed in `src/lib/promise-crm/storage.ts:519`.
- **Evidence:** When a promise row has no stored `__customer_access::` note, the loader falls back to `buildLegacyPromiseCustomerAccess(row.id)`, which mints the token as `` `wr_legacy_${promiseId.replace(/-/g, "")}` `` — i.e. the token *is* the record's own UUID with hyphens stripped. `getPromiseRecordByCustomerToken` matches on that token (`storage.ts:913-916`), so anyone who learns a promise's `id` (it appears in webhook payloads, `request-next-step` echoes `customerStatusToken`, and ops/API responses) can reconstruct the public status URL and drive approval/deposit/balance actions for that customer.
- **Why it matters:** The token is supposed to be an independent bearer secret; for legacy records it collapses to a non-secret identifier, defeating its purpose. A v4 UUID is still ~122 bits, so this is gated by knowing/leaking the id rather than brute force — hence Medium, not High — but the id is treated as low-sensitivity elsewhere.
- **Recommendation:** Backfill a random `wr_` token for every record at migration time and remove the derivable legacy path (or make the legacy token an HMAC of the id under a server secret). Treat promise `id` as non-authenticating.

**4. Auth checks fail *open* when secrets are unset outside production**
- **Severity:** Medium
- **Location:** `src/lib/jeff-field-assistant/tools.ts:2298-2306`; `src/lib/jeff-field-assistant/app-auth.ts:34-42`; `src/lib/promise-crm/supabase.ts` (write key fallback).
- **Evidence:** `authorizeJeffToolRequest` returns `{ authorized: true }` when `JEFF_FIELD_ASSISTANT_TOOL_SECRET` is unset and `isProductionRuntime()` is false (`tools.ts:2298-2306`); `authorizeJeffFieldAppRequest` likewise returns `authorized: true` with no PIN outside production (`app-auth.ts:34-42`). Production-detection relies on `NODE_ENV === "production" || VERCEL_ENV === "production"` (`app-auth.ts:8-10`) — preview/branch Vercel deployments report `VERCEL_ENV=preview`, so they fail open if the secret isn't also set there.
- **Why it matters:** Any Vercel **preview** deployment that omits these env vars exposes the entire Jeff tool/data surface (field notes, customer/job context, gmail/calendar sync, parts purchasing) with no auth. Preview URLs are routinely shared and indexed.
- **Recommendation:** Fail *closed* by default — require the secret in all non-local environments, or treat "secret unset" as `503` everywhere except an explicit `NODE_ENV==="development"` localhost check. Ensure preview envs inherit the secrets.

**5. Photo-upload and Vapi-tool PIN comparisons are not timing-safe / not constant-time**
- **Severity:** Low
- **Location:** `src/app/api/al/wrenchready/jeff/photos/upload/route.ts:48`; `src/app/api/al/wrenchready/jeff/sync/route.ts:12`.
- **Evidence:** The photo-drop route compares the PIN with plain `!==` (`formString(formData, "pin") !== requiredPin`, `:48`) instead of the `timingSafeEqual` helper used in `app-auth.ts`. The cron route compares `authorization === \`Bearer ${cronSecret}\`` with `===` (`sync/route.ts:12`). Both are inconsistent with the codebase's own timing-safe convention.
- **Why it matters:** Theoretical timing side-channel on a short numeric PIN; combined with Finding 2 (no rate limit) a brute-force/oracle attack is more plausible than usual. The cron path falls back to the timing-safe `authorizeJeffToolRequest`, lowering its impact.
- **Recommendation:** Route both through the existing `secretsMatch`/`timingSafeEqual` helper.

**6. PII flows to third parties and is base64-inlined; thin input validation on public booking**
- **Severity:** Low
- **Location:** `src/app/api/appointments/route.ts:38-42, 44-75`; `src/app/api/al/wrenchready/jeff/photos/upload/route.ts:73-79`.
- **Evidence:** `validatePayload` only checks that `vehicle` is a non-empty string (`:41`) — `email`, `phone`, `address`, `notes` are unvalidated free text forwarded to Supabase, Resend, Google Calendar, and the ops webhook. Field photos are read into memory and embedded as `data:` base64 URLs (`upload/route.ts:73-79`) rather than streamed to object storage, and customer addresses/phones/emails are written into Google Calendar event descriptions (`appointments/route.ts:185-200`).
- **Why it matters:** Unvalidated PII fan-out widens the breach surface and the data-residency footprint (no per-field validation, no all-list of recipients), and base64-in-DB photo storage is both a memory/size risk and an exfiltration convenience. Not exploitable on its own, but poor hygiene for a system holding customer PII + VINs + photos.
- **Recommendation:** Add schema validation (e.g. zod) on `/api/appointments`, normalize/validate email and phone, and move photo bytes to object storage with signed URLs instead of inlined data URLs.

### Score rationale

This is a security model that was clearly *thought about*, which is why it lands above the midpoint: a real edge auth gate (correctly using Next 16's `proxy` convention), timing-safe comparisons in the primary auth paths, a properly verified Stripe webhook, deliberate PII minimization on the public status page, high-entropy primary tokens, no committed secrets, no SSRF, and an actual `verify:security` harness that asserts `401` on protected routes. That foundation is genuinely solid for a young, single-operator-scale codebase.

It is held well short of "8+" by two issues that are directly exploitable today — **unsigned Twilio webhooks** (forged inbound records and outbound SMS from the business line) and the **complete absence of rate limiting** across every public write path — plus a cluster of medium/low debt: **fail-open auth on preview deployments**, **derivable legacy status tokens**, non-timing-safe PIN checks, and thin input validation with broad PII fan-out. None of these are catastrophic in isolation, but together they're exactly the gaps an attacker (or an abusive script) would reach for first. Closing Findings 1 and 2 would move this to a 7.5–8.


<div style="page-break-after: always;"></div>

---

## 10. UI/UX — Public Marketing Site

**Verdict.** The public site is the strongest-presenting surface in the codebase: a coherent dark-glass design system, disciplined breakpoint usage, image/video optimization via `next/Image` + poster posters, rich structured data, and copy that is genuinely on-brand (evidence-led, no-pressure, "we screen the job first"). It would plausibly convert a Spokane vehicle owner. But it carries real, code-cited debt that costs conversions and accessibility: the primary homepage intake form has zero `<label>` elements and no TCPA/SMS consent (while the secondary form does), the LCP H1 is animated from `opacity: 0` with no `prefers-reduced-motion` fallback anywhere in the app, error/success state changes are not announced to assistive tech, and "Call or Text" CTAs use `tel:` only so the texting promise silently fails. **Score: 7/10.**

### What's here

The marketing surface is a Next.js App Router site rendered through a shared `SiteShell` (`src/components/site-shell.tsx`) that bails out for `/ops`, `/jeff`, and `/ops-slate` paths (`site-shell.tsx:175`). Inventory of public surfaces:

- **Homepage** — `src/app/page.tsx` (server: metadata + JSON-LD) wrapping `src/components/home-page.tsx` (1439 LOC client component) with the primary `IntakeForm` (`home-page.tsx:185`).
- **Services** — `src/app/services/page.tsx` + `services/[slug]/page.tsx` (statically generated, `dynamicParams = false`, `services/[slug]/page.tsx:15-21`) rendering `service-page-client.tsx`.
- **Locations** — `src/app/locations/page.tsx` + `locations/[slug]/page.tsx` rendering `location-page-client.tsx`, with city/neighborhood hierarchy.
- **Contact** — `src/app/contact/page.tsx` → `contact-page-client.tsx` → `launch-request-form.tsx` (the *other* intake form, 522 LOC).
- **Conversion tools** — `tools/symptom-checker/page.tsx` → `symptom-checker.tsx` (3-step guided picker), `results/page.tsx` (proof gallery, `force-dynamic`), `hero-review/`.
- **Paid-ad route group** — `src/app/(ads)/lp/{mobile-mechanic,brake-repair,oil-change}/page.tsx` under a dedicated `(ads)/layout.tsx` with its own header/sticky CTA and `robots: { index: false }`.
- **Legal/system** — `privacy/`, `terms/`, `not-found.tsx`.
- **SEO surfaces** — `lib/seo.ts` (`buildMetadata` with canonical + OG + Twitter), `app/sitemap.ts`, `app/robots.ts`, `app/manifest.ts`, `app/opengraph-image.tsx`, `structured-data.tsx`, `llms.txt/route.ts`, `llms-full.txt/route.ts`.
- **Motion** — `framer-motion` via `components/motion/fade-in.tsx`, `motion/animated-text.tsx`, plus a portrait/landscape autoplay hero video (`home-page.tsx:643-674`).

Responsive coverage is real, not cosmetic: `home-page.tsx` alone contains 58 `sm:`, 26 `lg:` utility prefixes, with phone-first patterns like the horizontally-scrolling trust strip (`home-page.tsx:752`) and a fixed bottom mobile CTA bar (`site-shell.tsx:441`).

### Strengths

- **Genuinely on-brand, no-pressure copy.** The "earn the next visit / evidence-led" thesis is executed in the actual strings: "A warning light is a symptom, not a repair order" (`home-page.tsx:90`), "If it is not a good mobile fit, we say so early" (`home-page.tsx:152-155`), and an explicit anti-fabrication stance in the social-proof empty state: "We do not publish fabricated testimonials." (`home-page.tsx:1090`). This is rare discipline for a conversion page.
- **Honest, conditional success messaging tied to real screening output.** Both forms branch the confirmation copy on `intakeEvaluation.promiseFit` (`home-page.tsx:405-409`, `launch-request-form.tsx:175-180`) and surface a "Screening read" / "Scheduling read" panel — the marketing layer reflects the actual dispatch logic instead of a generic "thanks!".
- **Strong, layered structured data.** The homepage emits `Organization` + `AutoRepair/AutomotiveBusiness` + `FAQPage` with `@id` cross-linking, geo, `areaServed`, and per-service `Offer` pricing (`page.tsx:55-149`); service pages add `Service` + `BreadcrumbList` + `FAQPage` (`services/[slug]/page.tsx:63-142`). `aggregateRating`/`review` are only emitted when real proof exists (`page.tsx:128-148`) — consistent with the no-fabrication stance.
- **Disciplined image/video handling.** Hero uses separate 9:16 mobile and 16:9 desktop `<video>` with `poster`, `muted`, `playsInline`, `loop` (`home-page.tsx:643-674`); all `next/Image` instances set `sizes` and `loading="lazy"` except the priority logo (`home-page.tsx:684`). LP hero image is correctly marked `priority` (`(ads)/lp/mobile-mechanic/page.tsx:87`).
- **Good responsive/IA fundamentals.** Sticky header collapses to a spring-animated drawer (`site-shell.tsx:81-167`), a persistent mobile CTA bar keeps Call/Request one tap away (`site-shell.tsx:441-466`), and `scroll-padding-top: 5rem` (`globals.css:90`) prevents anchored sections hiding under the sticky header.
- **The symptom-checker is a real conversion asset.** `symptom-checker.tsx` maps 23 symptoms → service slug + urgency tier, and routes urgent cases to phone while routing convenience cases to the form (`symptom-checker.tsx:257-275`) — urgency-appropriate CTAs, not a one-size funnel.
- **SEO hygiene.** Every page builds canonical + OG + Twitter via one helper (`lib/seo.ts:24-46`); `robots.ts` explicitly allow-lists AI crawlers (GPTBot, ClaudeBot, PerplexityBot) while disallowing `/ops`, `/jeff`, `/api`, `/status` (`robots.ts:5-44`); LP pages and the `(ads)` group are `noindex` (`(ads)/layout.tsx:23`, `lp/mobile-mechanic/page.tsx:22`) so paid traffic doesn't dilute organic.

### Findings

**Primary homepage intake form has no `<label>` elements and no SMS consent — while the secondary form has both.**
- Severity: High
- Location: `src/components/home-page.tsx:526-618` (form fields), vs `src/components/launch-request-form.tsx:312-500`
- Evidence: The homepage `IntakeForm` — the single highest-traffic conversion surface — uses placeholder-only inputs with zero `<label htmlFor>` or `aria-label` (`grep` for `<label`/`htmlFor`/`aria-label` in `home-page.tsx` returns nothing). Inputs are e.g. `<input type="text" name="year" placeholder="Year" ... />` (`home-page.tsx:527`). It also collects phone and submits to `/api/appointments` with **no SMS-consent checkbox**. The contact-page form (`LaunchRequestForm`) does it correctly: real `<label>` wrappers (`launch-request-form.tsx:312`) and an explicit TCPA consent checkbox with STOP/HELP language and Privacy/Terms links, sending `smsConsent` to the API (`launch-request-form.tsx:479-500`, `:126`).
- Why it matters: (1) Accessibility — placeholder-as-label fails WCAG 1.3.1/4.1.2; placeholders vanish on input, screen readers may not announce the field, and label-less fields hurt autofill. (2) Compliance/conversion — the brand markets "call or **text**" and the business sends Twilio SMS, but the busiest form captures phone numbers with no documented consent, which is a TCPA exposure the secondary form already mitigates. The two forms are inconsistent, so the safer pattern exists but isn't used where it matters most.
- Recommendation: Add visually-hidden `<label htmlFor>` to every homepage field and port the `smsConsent` checkbox (and its STOP/HELP + Privacy/Terms copy) from `LaunchRequestForm` into `IntakeForm`. Better: extract one shared form component so the two intake surfaces cannot drift.

**LCP hero heading animates from `opacity: 0` with a per-word blur and no reduced-motion fallback.**
- Severity: High
- Location: `src/components/motion/animated-text.tsx:21-47`; used at `src/components/home-page.tsx:689-694`
- Evidence: `AnimatedHeading` is the homepage H1 (the LCP element) and renders each word with `variants={{ hidden: { opacity: 0, y: 20, filter: "blur(8px)" }, ... }}` driven by `whileInView` (`animated-text.tsx:32-39`). There is **no** `prefers-reduced-motion` / `useReducedMotion` handling anywhere in the app (grep across `src/` for `prefers-reduced-motion` and `useReducedMotion` returns nothing; `globals.css` has no reduced-motion block). Nearly every section also wraps content in `FadeIn`, which starts at `opacity: 0` (`fade-in.tsx:33`).
- Why it matters: The largest text paint starts invisible and depends on framer-motion hydrating and firing before it's painted — this delays/penalizes LCP on the mobile phones that are most of the audience, and on a slow/failed JS load the headline (and many sections) can remain blank. Vestibular-sensitive users get blur+slide animation on every fold with no opt-out, an WCAG 2.3.3 / motion-sensitivity gap.
- Recommendation: Render the H1 statically (or `animate` only transform, never `opacity`, on the LCP element) and add a global `@media (prefers-reduced-motion: reduce)` rule plus `useReducedMotion()` short-circuits in `FadeIn`/`AnimatedHeading`/`Stagger` to fall back to `opacity: 1` with no transform.

**"Call or Text" CTAs use `tel:` only — the texting half of the promise silently does nothing.**
- Severity: Medium
- Location: `src/data/site.ts:57` (`phoneHref: "tel:+15093090617"`), consumed at `home-page.tsx:725`, `:1426`, `site-shell.tsx:147`/`:232`/`:444`, `launch-request-form.tsx:224`/`:513`
- Evidence: Buttons labeled "Call or Text {phone}" (e.g. `home-page.tsx:729`) and the mobile bar's "Call" (`site-shell.tsx:444`) all point to `siteConfig.contact.phoneHref`, which is a `tel:` URI. There is no `sms:` href anywhere (grep for `sms:` in `src/` returns only the `LinkButton` scheme check at `marketing.tsx:80`, never an actual href).
- Why it matters: On a phone, tapping a button that says "Text" opens the dialer, not Messages. For a mobile-mechanic audience that often prefers texting a no-start, this is friction on the exact CTA the brand leans on hardest. It also slightly undercuts the credibility of "we respond within 15 minutes."
- Recommendation: Either relabel to "Call" where the href is `tel:`, or add a distinct `smsHref` (`sms:+1509...`) and render a real text CTA next to the call CTA, especially in the mobile CTA bar.

**Mobile CTA bar has three buttons, two of which are labeled "Request" and both go to `/contact`.**
- Severity: Medium
- Location: `src/components/site-shell.tsx:441-466`
- Evidence: The fixed mobile bar renders `Call` (`tel:`), then a "Request" `Link href="/contact"` (`:450-456`), then a third button with a calendar icon that *also* says "Request" and *also* links to `/contact` (`:457-463`). Two of three slots are duplicate destination + near-duplicate label.
- Why it matters: This is prime, persistent mobile real estate. A duplicated CTA wastes a third of it, looks like a bug, and creates choice ambiguity ("what's the difference between Request and Request?"). The calendar-icon button implies scheduling but lands on the same contact form.
- Recommendation: Make the three actions distinct — e.g. Call / Text / Request — or drop to two buttons (Call + Request). If a "Book" scheduling flow is intended, point it at the `#book` intake instead of repeating `/contact`.

**Form errors and success transitions are not announced to assistive tech (no live regions).**
- Severity: Medium
- Location: `src/components/home-page.tsx:521-525` and the `submitted` block `:393`; `src/components/launch-request-form.tsx:305-309` and `:166`
- Evidence: Error banners render conditionally as plain `<div>`s with no `role="alert"`/`aria-live` (grep for `aria-live`/`role="alert"`/`role="status"` across the three form/contact components returns nothing). The success state replaces the form entirely with a `<motion.div>` (`home-page.tsx:393`) that is also not announced.
- Why it matters: A screen-reader user who submits with a validation error ("Add the vehicle, service, and address…", `home-page.tsx:268`) or succeeds gets no spoken feedback; focus is not moved to the message either. This is a WCAG 4.1.3 (Status Messages) failure on the core conversion path.
- Recommendation: Wrap error banners in `role="alert"` (assertive) and the success panel in `role="status"` / `aria-live="polite"`, and move focus to the confirmation heading on success.

**Hero autoplay background video ships on mobile with no `prefers-reduced-motion` or data-saver guard.**
- Severity: Low
- Location: `src/components/home-page.tsx:644-658`
- Evidence: The mobile branch unconditionally renders `<video autoPlay muted loop playsInline>` sourcing `/wrenchready-hero-loop-mobile.mp4` (`home-page.tsx:646-655`). There is a `poster` fallback, but the video always autoplays; no reduced-motion or `Save-Data` check gates it.
- Why it matters: Autoplaying video over cellular burns the customer's data and battery and conflicts with reduced-motion preferences. The poster already exists, so honoring the preference is cheap.
- Recommendation: Gate `autoPlay` behind `useReducedMotion()` (fall back to the existing poster image) and consider `preload="none"` / a `Save-Data` check on the mobile source.

**`/results` is `force-dynamic`, so the proof page (and the homepage proof query) re-hit the CRM on every request with no ISR.**
- Severity: Low
- Location: `src/app/results/page.tsx:5` (`export const dynamic = "force-dynamic"`); `src/app/page.tsx:38` (`await getPublicProofSnapshot()`)
- Evidence: `results/page.tsx` opts fully out of caching; the homepage awaits `getPublicProofSnapshot()` on every render (with a `.catch` to empty, `page.tsx:38-41`). Proof stories change rarely (they require manual approval per the copy).
- Why it matters: Every public hit does a live CRM/Supabase read for content that's effectively static between approvals — added latency on the LCP-critical homepage and unnecessary load, for no freshness benefit a customer would notice.
- Recommendation: Use `revalidate` (ISR, e.g. 300s) or tag-based revalidation triggered when a proof story is approved, instead of `force-dynamic` + per-request fetch.

**`/results` and `/contact` heros have no `<h1>` (the page title is rendered as an `<h2>` via `SectionHeading`).**
- Severity: Low
- Location: `src/app/results/page.tsx:20-25` and `src/components/marketing.tsx:114-119`; contrast `contact-page-client.tsx:22-26` (which *does* use `<h1>`)
- Evidence: `SectionHeading` always renders its `title` as `<h2>` (`marketing.tsx:117`). `results/page.tsx` uses `SectionHeading` as the page's lead heading, so the document has no `<h1>`. (Service and location pages correctly use a real `<h1>` — `service-page-client.tsx:46`, `location-page-client.tsx:50`.)
- Why it matters: A missing top-level `<h1>` weakens document outline for SEO and screen-reader navigation on an indexable proof page that's linked from the homepage and footer.
- Recommendation: Give `/results` a real `<h1>` (either a dedicated hero heading or a `SectionHeading` variant whose title level is configurable).

### Score rationale

This is clearly the most polished part of WrenchReady and reflects a designer's eye: a consistent OKLCH token system, layered structured data that respects the no-fabrication ethic, real phone-first responsive work, and copy that actually embodies the brand thesis rather than pasting generic "trusted local mechanic" filler. Those are 8–9 level strengths.

It lands at **7/10** because the conversion-critical and accessibility-critical details are uneven: the *primary* intake form is the weakest of the two (no labels, no consent) while the secondary one is done right, the LCP H1 animates from invisible with no reduced-motion escape hatch across the entire app, the headline "text us" CTA can't actually text, the persistent mobile bar duplicates a CTA, and form status changes are silent to assistive tech. None of these are catastrophic, but each one directly taxes either conversion or accessibility on the surface that exists to convert and must be usable by everyone — and the fact that a correct pattern (the contact form's labels + consent) already exists in-repo but isn't applied to the busiest form is exactly the kind of drift a top org wouldn't ship. Fixing the High findings would credibly move this to 8.5. Note: this is a static code review; LCP, CLS, and the actual rendered animation timing should be confirmed with a Lighthouse/field run on a throttled mobile device.


<div style="page-break-after: always;"></div>

---

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


<div style="page-break-after: always;"></div>

---

## 12. UI/UX — Field (Jeff) & Customer Surfaces

**Verdict.** The two human-critical surfaces are well-considered for a v1 and clearly built mobile-first: the field hub uses large 80px tap rows, the message thread is a credible iMessage-style composer with dictation/attachments/optimistic send, and the customer status page is a polished, trust-forward payment/approval flow on top of Stripe Checkout. But both surfaces have real field-grade gaps: there is **no offline/slow-network resilience anywhere** (no retry, no queue, no `navigator.onLine` handling), the message attachment path ships **base64 data URLs over cellular** with a hard 2.5 MB cap, several primary tap targets sit **below the 44px minimum**, and the customer status page renders inside the **full marketing site chrome** rather than a focused payment surface. Touch ergonomics are decent but not audited; live device testing on a glare-bright phone with a flaky LTE connection is required to confirm.

**Score: 6/10**

### What's here

Field surface (`/jeff`, bare-chrome — `src/components/site-shell.tsx:175` returns `children` directly for any `/jeff` path):
- `src/app/jeff/page.tsx` — mobile hub: live-session card, four primary action rows (Message, Call, Share Location, Field Docs) plus a photo-drop fallback row.
- `src/app/jeff/messages/page.tsx` + `src/components/jeff-messages-thread.tsx` (663 LOC) — the chat surface: PIN gate, job-file selector, dictation (Web Speech API), attachments, optimistic send, auto-grow composer.
- `src/components/jeff-photo-drop-form.tsx` (377 LOC) — standalone multipart photo upload with client-side image resize.
- `src/components/jeff-share-location-button.tsx` — geolocation check-in with inline PIN entry.
- `src/app/jeff/docs/page.tsx` — static five-card field reference. `src/app/j/page.tsx` — a one-line redirect shortcut to `/jeff/messages`.
- PWA: `src/app/manifest.ts` (standalone, scoped to `/jeff`, portrait) + `appleWebApp` in `src/app/layout.tsx:32`. There is **no service worker** (no file under `public/`), so the PWA is installable but not offline-capable.

Customer surface (`/status/[token]`, **full marketing chrome** — not in the bare-chrome list at `src/components/site-shell.tsx:175`):
- `src/app/status/[token]/page.tsx` (520 LOC) — server-rendered status dashboard: hero, vehicle/service/location/contact grid, promise timeline, recap, pricing snapshot.
- Four client action components: `customer-promise-approval.tsx`, `customer-deposit-checkout.tsx`, `customer-balance-checkout.tsx`, `customer-next-step-request.tsx` — each posts to a `/api/wrenchready/status/[token]/*` route; checkouts redirect to Stripe Checkout (`window.location.href = data.url`).

PIN auth is timing-safe (`src/lib/jeff-field-assistant/app-auth.ts:12`), header-based (`X-Jeff-App-Pin`), and the PIN is persisted in `localStorage` under `wrenchready.jeff.fieldAppPin` and auto-replayed on load.

### Strengths

- **Genuinely mobile-first field hub.** Action rows are `min-h-20` (80px) with 44px icon chips and `ChevronRight` affordances (`src/app/jeff/page.tsx:81-95`), comfortably one-thumb. The CTA grid degrades to a single column and the hub is capped at `max-w-md` (`:44`).
- **Optimistic send with correct rollback.** The thread appends a `pending-${Date.now()}` bubble, clears the composer, and on error restores the exact text + attachments and removes the optimistic message (`src/components/jeff-messages-thread.tsx:361-395`). This is the right pattern for a flaky-network composer and is implemented carefully.
- **Client-side image downscale before upload.** Photo drop resizes to a 1600px max dimension at JPEG q0.78 and skips the work when already small (`src/components/jeff-photo-drop-form.tsx:66-99`) — meaningfully reduces cellular payloads for the multipart path.
- **Capture-friendly file inputs.** `accept="image/*"` on both surfaces (`jeff-photo-drop-form.tsx:280`, `jeff-messages-thread.tsx:608`) lets the OS offer the camera directly; labels read "Take or choose photos."
- **Dictation for greasy hands.** Web Speech API mic toggle with clear listening state and graceful unsupported-browser fallback (`jeff-messages-thread.tsx:289-343`), plus a sticky `inputMode="numeric"` PIN pad (`:481`) — both reduce typing friction.
- **Trust-forward customer payment UX.** Checkout copy names the wallet options ("card, Apple Pay, Google Pay, Cash App Pay … through Stripe Checkout", `customer-deposit-checkout.tsx:50-53`), shows a bold amount, a `aria-live`-style error region, and a "paid"/"received" terminal state so a customer can't double-pay (`:36-45`). Approval is a clear two-button Approve / Not-now with an optional note (`customer-promise-approval.tsx:84-127`).
- **Defensive customer copy.** Status text runs through `customerSafeText` / `customerSafeScheduleLabel` filters (`src/app/status/[token]/page.tsx:276,355`) so internal language never leaks to the customer — a real trust safeguard.

### Findings

**No offline or slow-network resilience on either surface**
- **Severity:** High
- **Location:** `src/components/jeff-messages-thread.tsx:367-395`; `src/components/jeff-photo-drop-form.tsx:158-180`; `src/components/jeff-share-location-button.tsx:98-127`; absence of any `public/sw.js`/service worker.
- **Evidence:** Every network action is a single bare `fetch` with no retry, no timeout (except geolocation's 12s), no offline detection, and no persistent queue. On send failure the thread restores the draft and shows a notice (`:388-392`) — but the tech must manually re-tap Send; if the photo upload `fetch` rejects, the selected files survive only in component state and are lost on reload (`:172-179`). The manifest declares a PWA (`src/app/manifest.ts`) but there is no service worker, so the installed app is **blank when offline**. A mobile mechanic in a metal-roofed shop or rural driveway is precisely the dead-zone user this fails for.
- **Why it matters:** The core field loop (photo → note → send) is the product's reason to exist on a phone. With no queue/retry, a dropped packet at the wrong moment means re-shooting photos or losing a note — the highest-friction failure for the target user.
- **Recommendation:** Add a service worker for offline shell + an outbox queue (IndexedDB) that retries sends/uploads with backoff and a visible "queued / retrying / failed" state. At minimum, auto-retry transient failures and persist pending attachments across reload.

**Message attachments are base64 data URLs capped at 2.5 MB**
- **Severity:** High
- **Location:** `src/components/jeff-messages-thread.tsx:105,149-167,371-376`
- **Evidence:** `fileToAttachment` `FileReader.readAsDataURL`s each file into a base64 string embedded in the JSON POST body (`:154-159`), with `MAX_ATTACHMENT_BYTES = 2_500_000` (`:105`). Base64 inflates payloads ~33%, and unlike the photo-drop path there is **no client-side image resize here** — a modern phone photo (4–8 MB) is rejected outright with "is too large for Jeff message upload v1" (`:151`). So the most natural action ("snap a photo in the chat and send") fails on a default-camera image and forces the tech to the separate photo-drop screen.
- **Why it matters:** Inconsistent capability between the two photo paths is confusing in the field, and shipping raw base64 over LTE is slow and battery-costly. The 2.5 MB ceiling effectively breaks in-chat photos from a real phone camera.
- **Recommendation:** Run the same `resizeImage` downscale used in photo-drop before attaching in the thread, and move to multipart upload (or a presigned direct-to-storage PUT) instead of base64-in-JSON.

**Several primary tap targets are below the 44px minimum**
- **Severity:** Medium
- **Location:** `src/components/jeff-messages-thread.tsx:425-437` (job `<select>` `h-10` = 40px), `:598-655` (composer Attach/Mic/Send buttons all `h-10 w-10` = 40px); `src/components/customer-promise-approval.tsx:129` / `customer-deposit-checkout.tsx:72` (`py-2.5` ≈ 40px tall pills).
- **Evidence:** The thread's most-used controls — attach, mic, send, and the job selector — are 40px; Apple HIG and WCAG 2.5.5 target ≥44px. The hub rows are correctly sized (80px), but the controls the tech actually taps repeatedly are not. There is also no `viewport` export and no `maximumScale` lock, so iOS will zoom on the 16px-below PIN/select inputs unless font-size ≥16px (the composer textarea is `text-sm` = 14px, `:628`), causing layout jumps when focusing.
- **Why it matters:** 40px targets plus input-zoom are exactly the failure modes for greasy hands in sunlight; mis-taps on Send/Attach slow the loop.
- **Recommendation:** Bump repeated-use controls to ≥44px, raise composer/select font-size to ≥16px (or add a `viewport` with controlled scaling), and verify with on-device testing.

**Customer status page renders inside full marketing chrome**
- **Severity:** Medium
- **Location:** `src/components/site-shell.tsx:175` (only `/ops*`, `/ops-slate`, `/jeff*` get bare chrome); `src/app/status/[token]/page.tsx:108`
- **Evidence:** Because `/status` is absent from the bare-chrome allowlist, a customer opening their unique status link gets the entire marketing site: sticky header with Home/Services/Book-now nav, mobile hamburger, and the full marketing footer wrapping a payment/approval surface. A focused, distraction-free payment page builds more trust and reduces the chance a paying customer wanders off into the marketing funnel mid-checkout.
- **Why it matters:** This is a transactional, token-authed surface where a customer is about to approve work or pay a balance; surrounding it with "Book your next service" nav dilutes the action and looks less like a secure portal.
- **Recommendation:** Give `/status/[token]` a slimmed chrome (logo + phone only), or add it to the bare-chrome branch and render a minimal trust header.

**Photo-drop page does not enforce the PIN gate the messages page does**
- **Severity:** Medium
- **Location:** `src/app/jeff/photo-drop/page.tsx:22-31` vs `src/app/jeff/messages/page.tsx:27-32`; `src/components/jeff-photo-drop-form.tsx:126-130,313-323`
- **Evidence:** The messages page checks `appAuth.required` and refuses to load thread/jobs until a PIN is supplied (`messages/page.tsx:29-30`). The photo-drop page calls `getJeffPhotoDropJobs(...)` unconditionally and renders the job list with no PIN gate (`photo-drop/page.tsx:23`); the form only shows a PIN field when `uploadPinConfigured` is true (`jeff-photo-drop-form.tsx:313`), and `canSubmit` only requires the PIN in that case (`:130`). The actual upload route still authorizes server-side, but the **UX is inconsistent**: one field surface front-loads the PIN, the other surfaces job/customer names before any auth. (Security correctness is covered in the authz section; here the concern is the divergent, confusing field-app login model.)
- **Why it matters:** Two different login experiences for the same field app increases tech confusion and leaks job/customer labels into a less-gated page.
- **Recommendation:** Unify the field-app auth UX — gate photo-drop the same way as messages, sharing one PIN-unlock flow.

**No upload progress, multi-image preview, or per-file removal in photo drop; thread has no image thumbnails**
- **Severity:** Low
- **Location:** `src/components/jeff-photo-drop-form.tsx:288-296,364-373`; `src/components/jeff-messages-thread.tsx:531-548`
- **Evidence:** Photo drop lists selected files as text rows (`name / KB`) with no thumbnail and no way to remove one file (re-selecting replaces the whole set, `:132-136`); the upload button shows only a spinner + "Uploading" with no percentage (`:371-372`) — on slow cellular the tech can't tell a 4-photo upload from a hang. In the thread, image attachments render as a generic `FileDown` download link rather than an inline thumbnail (`:534-545`), so the tech can't visually confirm the right photo was attached.
- **Why it matters:** Without thumbnails/progress, the field user can't verify the right image is going to the right job, and can't distinguish "slow" from "stuck."
- **Recommendation:** Add image thumbnails (object URLs) in both selection lists, per-file remove in photo drop, and real upload progress via `XMLHttpRequest`/`fetch` streams.

**Customer approval/checkout error recovery is shallow; status page can be a dead end with no actionable CTA**
- **Severity:** Low
- **Location:** `src/components/customer-deposit-checkout.tsx:75-97`; `src/components/customer-promise-approval.tsx:61-63`; `src/app/status/[token]/page.tsx:241-256`
- **Evidence:** On checkout error the handler sets feedback **and** calls `router.refresh()` (`customer-deposit-checkout.tsx:95`), which can re-render and visually clear the just-shown error mid-read; there is no retry guidance beyond the raw error string. The approval card returns `null` when status isn't `awaiting-approval` (`customer-promise-approval.tsx:61`), and each checkout returns `null` when no amount is due — so a customer arriving at a state with nothing pending sees a long informational page with **no primary action**, only "Call/Email" at the very bottom (`status/[token]/page.tsx:501-514`). The redirect to Stripe is `window.location.href` with no `target`/intermediate state, which is fine but offers no "return to status" breadcrumb if they bounce.
- **Why it matters:** The customer surface is a conversion/payment funnel; refreshing away an error and dead-end states reduce completed payments and approvals.
- **Recommendation:** Drop the `router.refresh()` on error (keep the message visible), add a retry affordance, and always surface a single clear next action (or an explicit "nothing needed right now" confirmation) near the top of the status page.

**Accessibility gaps on the customer surface**
- **Severity:** Low
- **Location:** `src/components/customer-promise-approval.tsx:72-82`; `src/components/customer-deposit-checkout.tsx:66-70`; color tokens throughout `src/app/status/[token]/page.tsx`
- **Evidence:** Feedback/error banners are plain `<div>`s with no `role="status"`/`aria-live`, so screen-reader users get no announcement on success/failure (contrast the field thread, which does use `aria-live="polite"` at `jeff-messages-thread.tsx:472`). The dark theme renders `text-muted-foreground` on `bg-background/60` for most body copy; contrast is not verified and several muted-on-translucent combos are visually low. No `enterKeyHint`/`inputMode` on the customer note textareas.
- **Why it matters:** This is a public, customer-facing payment page; AT users and low-vision users on a bright phone are part of the audience.
- **Recommendation:** Add `aria-live` to the customer feedback regions, audit contrast against WCAG AA, and label form controls explicitly.

### Score rationale

The field hub and message composer show real product thinking — optimistic send with correct rollback, dictation, capture-friendly inputs, client-side resize on the photo path, and a timing-safe PIN — which is above typical startup-v1 quality and pulls the score toward the upper-middle. What holds it at **6** rather than 7–8 is the cluster of field-reality gaps that a "ultimate assistant for the tech in a driveway" can't really have: zero offline/retry resilience despite shipping a PWA shell, an in-chat photo path that base64s and rejects real camera images, sub-44px primary controls with input-zoom risk, and a divergent auth UX between the two upload surfaces. The customer surface is polished and trust-forward on the payment copy but loses points for living inside marketing chrome, shallow error recovery (refresh-clears-error), possible dead-end states, and missing `aria-live`/contrast verification. None of these are catastrophic, but together they are exactly the friction points that matter most for these two human-critical surfaces. Several ergonomic claims (tap accuracy, glare contrast, LTE behavior) need on-device testing to fully confirm.


<div style="page-break-after: always;"></div>

---

## 13. Design System, Component Library & Accessibility

**Verdict:** WrenchReady has a confident, cohesive *visual* design language — a well-considered OKLCH dark-theme token set, a documented brand guide, tasteful glass/mesh/orb motion primitives, and descriptive alt text on real imagery. But the engineering substrate underneath it is weak: a full shadcn/base-ui primitive library sits almost entirely unused (the app is built from ~76 raw `<button>`s and bespoke `.form-input` CSS), there is a **proven, repo-wide Tailwind v4 bug** that silently strips brand color from 304 class usages across 27 files (including the public homepage and customer checkout), accessibility is thin (zero `prefers-reduced-motion`, no `htmlFor`, custom focus styling only living in the dead primitive layer), and two core token pairs fail WCAG AA contrast. This reads as a design-forward founder build where the visual surface was hand-tuned but the systematic plumbing (component reuse, a11y, build-correctness) was never closed out.

**Score: 5 / 10**

### What's here

- **Token system** — `src/app/globals.css:7-82` defines a dark-only theme in OKLCH: semantic shadcn tokens (`--background`, `--card`, `--primary`, `--muted-foreground`, …) plus a parallel brand ramp (`--wr-blue`, `--wr-blue-soft/strong`, `--wr-teal`, `--wr-gold`, `--wr-purple`, `--wr-surface*`, `--wr-glow`). The `@theme inline` block (`globals.css:53-82`) registers **only** the semantic tokens as Tailwind utilities; the `--wr-*` ramp is not registered, so it can only be reached via inline `style` or arbitrary-value classes.
- **Brand guide** — `docs/WRENCHREADY_BRAND_GUIDE.md` is genuinely good: documents the palette with OKLCH + approx hex (WR Blue `#4AA3E8`), typography (Space Grotesk display / Inter body), logo dark-bg-only rules, photography/video specs, and CTA copy standards. The CSS tokens match the guide's OKLCH values exactly.
- **Primitive library** — `src/components/ui/` has 14 base-ui/react ("base-nova") primitives: `button`, `card`, `dialog`, `sheet`, `tabs`, `select`, `accordion`, `badge`, `input`, `label`, `textarea`, `tooltip`, `separator`, `tooltip`. These are well-authored (CVA variants, `focus-visible` rings, `aria-invalid` handling, `sr-only` close labels).
- **Motion** — `src/components/motion/{fade-in,animated-text,gradient-orbs}.tsx` (framer-motion): `FadeIn`/`Stagger` scroll reveals, `AnimatedHeading` per-word blur-in, `HeroGradientBg`/`SectionOrbs` infinite-loop floating orbs. Plus CSS keyframes in `globals.css:219-313` (`shimmer`, `float`, `pulse-glow`, `gradient-shift`, mesh backgrounds).
- **Shell** — `src/components/site-shell.tsx:169-469` renders the marketing header/footer/mobile-nav and short-circuits for `/ops`, `/jeff`, `/ops-slate` (`site-shell.tsx:175-177`), so the internal ops surface is chromeless.
- **Typography** — fonts wired via `next/font/google` in `src/app/layout.tsx:9-19`, exposed as `--font-display` / `--font-body`, applied globally in `globals.css:111-119`.

### Strengths

- **Disciplined OKLCH token foundation, faithful to the brand guide.** `globals.css:7-51` is a clean single source of truth; the `@theme inline` mapping (`globals.css:53-74`) wires semantic tokens to Tailwind, and `--radius` drives a derived radius scale (`globals.css:75-81`). Brand-guide OKLCH values match the CSS exactly (e.g. WR Blue `oklch(0.62 0.19 255)` in both).
- **The primitives that exist are correctly built.** `src/components/ui/button.tsx:6-41` is a proper CVA with `focus-visible:ring-3 focus-visible:ring-ring/50`, `aria-invalid` states, and disabled handling; `dialog.tsx:62-76` ships a `sr-only` "Close" label; `input.tsx:12` and `badge.tsx:8` carry full focus-visible + aria-invalid treatment. This is production-grade — it's just unused.
- **Imagery accessibility is a real strength.** All 21 `alt=` values are descriptive and contextual, not filename dumps — e.g. `home-page.tsx` `alt="WrenchReady technician inspecting brake pad wear at a customer's driveway"`. Zero raw `<img>` tags; everything routes through `next/image` (`grep`: 0 `<img`, 5 `next/image` imports), getting lazy-loading and sizing for free. The brand mark carries `alt="WrenchReady"` (`site-shell.tsx:21`).
- **No click-div soup.** Zero `<div onClick>` handlers repo-wide; interactive elements are real `<button>`/`<a>`/`<Link>`. Forms use **implicit label association** (`<label>` wrapping the control, e.g. `outbound-result-form.tsx:83-96`), which is valid for assistive tech despite `htmlFor` being absent.
- **Foreground body text contrast is excellent.** `--foreground` (`oklch(0.95 …)`) on `--background` (`oklch(0.08 …)`) computes to ~18:1 — far above AA.
- **Dark-theme discipline is enforced structurally.** `<html className="… dark">` is hardcoded (`layout.tsx:75`); there is no theme toggle and no light-mode code path, matching the brand's "dark-theme only" rule (`BRAND_GUIDE.md:75`).

### Findings

**Tailwind v4 bare-variable shorthand is broken across the app — 304 brand-color classes render with no color**
- **Severity: High**
- **Location:** `src/components/home-page.tsx:111-117` (55 uses), `src/app/ops/promises/[id]/page.tsx` (55), `src/components/promise-board.tsx` (18), `src/components/marketing.tsx` (15), `src/app/status/[token]/page.tsx:68-77` (10), `src/components/site-shell.tsx:418` — 304 total across 27 files.
- **Evidence:** The codebase uses the Tailwind v3 arbitrary-property shorthand `bg-[--wr-teal]`, `text-[--wr-gold]`, `border-[--wr-blue]/20`. This form was **removed in Tailwind v4**, and the project runs `tailwindcss@4.2.2`. Compiling the exact classes through the project's own `@tailwindcss/postcss` produces invalid CSS:
  ```css
  .bg-\[--wr-teal\]   { background-color: --wr-teal; }   /* invalid value → discarded */
  .border-\[--wr-blue\] { border-color: --wr-blue; }     /* invalid value → discarded */
  .text-\[var\(--wr-gold\)\] { color: var(--wr-gold); }  /* the correct form */
  ```
  The bare token emits `background-color: --wr-teal` (no `var()`), which every browser rejects as an invalid declaration. There are **0** uses of the correct `[var(--wr-*)]` form anywhere. The breakage spans `bg-` (91), `border-` (88), `text-` (27), gradient stops `from-/via-/to-` (13), `shadow-` (5), `fill-` (1).
- **Why it matters:** This silently drains brand color from the marketing homepage, the customer-facing status/checkout pages (`status/[token]`, `customer-deposit-checkout`, `customer-balance-checkout`), and the entire ops dispatch surface. Concretely, success-state banners lose their color cue: `outbound-result-form.tsx:74` styles the success message `border-[--wr-teal]/20 bg-[--wr-teal]/10 text-[--wr-teal-soft]` — all three are no-ops, so "success" renders as uncolored default text, collapsing a semantic UX signal. Because the failure is silent (invalid CSS is dropped, not errored), it can persist indefinitely. The brand guide insists teal/gold are deliberate semantic colors (`BRAND_GUIDE.md:56-62`); the implementation doesn't deliver them.
- **Recommendation:** Codemod `-\[--wr-([a-z-]+)\]` → `-[var(--wr-$1)]` across `src/`, **or** register the `--wr-*` ramp in the `@theme inline` block so first-class utilities (`bg-wr-teal`) exist. Then add a CI guard (a grep/ESLint rule) rejecting the bare `[--…]` form so it can't regress. Verify visually after — this touches the homepage and checkout.

**The shadcn/base-ui primitive library is dead code — the app is hand-rolled instead**
- **Severity: Medium**
- **Location:** `src/components/ui/*` (14 files); consumers: only `src/components/marketing.tsx` (button, accordion, tabs) and the two `ui/` files that reference each other.
- **Evidence:** Repo-wide, exactly **3** files import from `@/components/ui/` (`grep -rl`), and `<Button` appears **4** times vs **76** raw `<button>` elements. `card`, `sheet`, `select`, `input`, `label`, `textarea`, `badge`, `separator`, `tooltip`, `dialog` are imported by **zero** app files. Forms instead use bespoke global classes `.form-input` / `.form-textarea` (`globals.css:337-364`) and raw `<select>`/`<button>` (e.g. `outbound-result-form.tsx:87-95`).
- **Why it matters:** The investment in a consistent, accessible primitive layer is wasted — and worse, the app loses what those primitives provide. Every raw `<button>` and `<select>` re-implements (or omits) focus rings, disabled states, and aria handling ad hoc; there is no enforced single source for button/badge/dialog styling, so visual and behavioral drift is inevitable as the app grows toward the stated 7-tech scale. It also misleads future contributors, who reasonably assume `ui/` is the component contract.
- **Recommendation:** Decide and commit: either (a) adopt the primitives (migrate forms/buttons to `Button`/`Input`/`Select`/`Label`, deleting `.form-input`), gaining a11y for free, or (b) delete the unused primitives and document the bespoke pattern as canonical. The current half-state is the worst of both.

**No `prefers-reduced-motion` support anywhere — continuous and entrance animation is unconditional**
- **Severity: Medium (Accessibility)**
- **Location:** `src/components/motion/gradient-orbs.tsx:49-60`, `animated-text.tsx:21-47`, `fade-in.tsx:32-41`; CSS keyframes `globals.css:219-313`.
- **Evidence:** `grep` finds **0** occurrences of `prefers-reduced-motion` (CSS or JS) and **0** of framer's `useReducedMotion()`. Orbs animate `repeat: Infinity` (`gradient-orbs.tsx:55-58`); `.float`/`.pulse-glow`/`.btn-shimmer`/`.animated-gradient` are infinite CSS loops (`globals.css:242,253,275,283`) with no `@media (prefers-reduced-motion: reduce)` guard. `AnimatedHeading` animates `filter: blur(8px)→blur(0px)` on heading text content (`animated-text.tsx:33-39`).
- **Why it matters:** WCAG 2.1 SC 2.3.3 (and vestibular-disorder guidance) expects motion to honor the OS reduce-motion setting. Perpetually moving blurred orbs and per-word blur-in on headings are exactly the patterns that trigger motion sickness; users who set the system preference get no relief. The blur-on-text entrance is also a momentary legibility cost for everyone.
- **Recommendation:** Add a global `@media (prefers-reduced-motion: reduce) { *, ::before, ::after { animation: none !important; transition: none !important; } }` to `globals.css`, and gate framer animations with `useReducedMotion()` (return static variants when reduced). At minimum, disable the infinite orb/float loops.

**Custom `focus-visible` styling lives only in the unused primitives; the real app relies on a single global outline**
- **Severity: Medium (Accessibility)**
- **Location:** All 29 `focus-visible` declarations are in `src/components/ui/*` (`focus-visible by dir`: 29/29 in `components/ui`). App-authored interactive elements have none; the only keyboard-focus affordance is the global `@apply … outline-ring/50` at `globals.css:121-124`.
- **Evidence:** The 76 raw `<button>`s (e.g. mobile-nav close `site-shell.tsx:102-107`, menu trigger `site-shell.tsx:242-248`) and the bespoke `.form-input` (`globals.css:337-364`) define `:focus` styling for inputs but **no `:focus-visible`** for buttons/links; `.form-input:focus` (`globals.css:359-363`) styles inputs only. Custom anchors/buttons inherit just the faint `outline-ring/50`.
- **Why it matters:** Keyboard users get an inconsistent, low-contrast focus indicator across the most-used controls (header CTA, mobile nav, ops action buttons), while the strong `focus-visible:ring-3` rings sit in components nobody renders. This degrades keyboard navigability of the dispatch console the office staff live in.
- **Recommendation:** Define a project-wide focus-visible utility (or adopt the `Button` primitive). Add a visible `:focus-visible` ring to `.form-input`/links and audit the ops surface with keyboard-only navigation.

**Primary CTA text and muted body text fail WCAG AA contrast on the dark surface**
- **Severity: Medium (Accessibility)**
- **Location:** `globals.css:17-18` (`--primary` / `--primary-foreground`), `globals.css:23` (`--muted-foreground`); muted-with-opacity at `site-shell.tsx:378,399,406`.
- **Evidence:** Converting the OKLCH tokens to sRGB luminance and computing WCAG ratios:
  - `--primary-foreground` on `--primary` (the site-wide primary button, `bg-primary text-primary-foreground`, e.g. `site-shell.tsx:223`): **≈3.5:1** — below AA 4.5 for normal text.
  - `--muted-foreground` on `--background`: **≈4.3:1** — below AA 4.5; this token is the default body-copy color across marketing and ops (e.g. footer paragraph `site-shell.tsx:269`).
  - `text-muted-foreground/70` (footer legal/contact, `site-shell.tsx:378,399,406`): **≈3.0:1** — clearly failing.
- **Why it matters:** The primary CTA ("Request Service") is the single most important interactive label on the site, and it doesn't meet AA. Large swaths of supporting copy sit just under threshold, and the `/70` legal text fails outright — relevant given the site makes licensing/compliance claims that should be readable.
- **Recommendation:** Darken `--primary` slightly or use a darker `--primary-foreground` to reach ≥4.5:1 on the button; raise `--muted-foreground` lightness (e.g. `oklch(0.62 …)`) to clear AA; stop using `/70` opacity on already-muted text. Validate with an OKLCH-aware contrast checker.

**Legacy `[--wr-*]` color arbitrary-value `class` for the footer compliance badge is doubly broken**
- **Severity: Low**
- **Location:** `src/components/site-shell.tsx:418-421`.
- **Evidence:** The RCW-compliance badge uses `border-[--wr-teal]/15 bg-[--wr-teal]/5 … text-[--wr-teal]` — three instances of the broken bare-variable form (per the High finding above) compounded with opacity modifiers on an already-invalid value, so the badge renders with no teal border/background/text.
- **Why it matters:** A trust-signal badge ("Licensed • Insured • RCW 46.71 Compliant") in the footer loses its visual styling entirely, undermining the credibility cue on every public page.
- **Recommendation:** Fold into the codemod from the High finding; this badge is a good visual-regression spot-check.

**Decorative icons are not hidden from assistive tech**
- **Severity: Low (Accessibility)**
- **Location:** repo-wide; e.g. lucide icons throughout `site-shell.tsx` (`Phone`, `Wrench`, `MapPin`, `ArrowRight`, …) and the inline Google SVG at `site-shell.tsx:295-300`.
- **Evidence:** `grep` finds **0** `aria-hidden` attributes repo-wide. The hand-rolled Google "G" SVG (`site-shell.tsx:295`) and decorative lucide glyphs carry no `aria-hidden="true"`; `role=` appears once total (`ops/jeff/section-jump-button.tsx:26`).
- **Why it matters:** Mostly benign for icons placed adjacent to visible text (the text label carries the meaning), but icon-only controls — e.g. the mobile menu toggle (`site-shell.tsx:242`, mitigated by `aria-label="Open menu"`) and the close button (`site-shell.tsx:102`, which has **no** accessible name) — can announce confusingly or as unlabeled. The close button is the concrete gap: a screen reader reads it as an empty button.
- **Recommendation:** Add `aria-hidden="true"` to purely decorative SVGs and `aria-label="Close menu"` to the mobile-nav close button (`site-shell.tsx:102-107`).

**`CountUp` component is a no-op masquerading as an animated counter**
- **Severity: Low (Cleanliness)**
- **Location:** `src/components/motion/animated-text.tsx:58-85`.
- **Evidence:** `CountUp` nests three `motion.span`s that only fade opacity and renders `{target}` statically (`animated-text.tsx:78-80`) — there is no `useMotionValue`/`animate` count, no interpolation. It "counts up" to nothing; the number simply appears.
- **Why it matters:** Dead/misleading abstraction; future devs will assume it animates. Minor, but it's debt in the motion layer.
- **Recommendation:** Implement with framer's `useMotionValue` + `useTransform`/`animate`, or delete it and render the number directly.

### Score rationale

The *visual* design system earns real credit: a coherent OKLCH dark theme that matches a thoughtful brand guide, good imagery alt text, no click-div soup, valid implicit form labeling, and a tasteful motion vocabulary. That alone keeps this out of "serious problems" territory. But three things drag it to the middle: (1) a **proven build bug** silently removing brand color from 304 usages across the public homepage, customer checkout, and the ops console — the kind of latent defect that should never survive in a shipping product; (2) an accessible primitive library that is **dead code**, with the app hand-rolling 76 raw buttons and bespoke form CSS, leaving custom focus-visible styling stranded where nothing renders it; and (3) genuine a11y gaps — zero reduced-motion support against infinite orb/blur animations, and two core token pairs (primary CTA text, muted body text) failing WCAG AA. None are individually catastrophic, but together they show a surface that was art-directed by eye rather than engineered as a system. A 5 reflects "works and looks good, but carries significant, partly-invisible debt and below-bar accessibility." Fixing the Tailwind shorthand (a mechanical codemod) and committing to either adopting or deleting the primitive layer would move this to a 7 quickly.
