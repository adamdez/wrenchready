# WrenchReady — Comprehensive Product Evaluation

> **Date:** 2026-06-19
> **Scope:** Full repo — engineering, code cleanliness, UI/UX
> **Method:** 13-dimension multi-agent audit with adversarial verification of high-severity findings
> **Depth:** Reviewed at senior-engineer depth

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
