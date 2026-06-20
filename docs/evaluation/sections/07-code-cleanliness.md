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
