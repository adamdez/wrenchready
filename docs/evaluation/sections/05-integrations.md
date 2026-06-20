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
