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
