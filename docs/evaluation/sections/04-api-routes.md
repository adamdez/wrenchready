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
