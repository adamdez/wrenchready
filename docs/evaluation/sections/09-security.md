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
