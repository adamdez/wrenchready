# WrenchReady Evaluation Remediation Status

Updated: 2026-06-20

This file tracks the current remediation pass against the evaluation findings. It does not claim production deployment, secret rotation, Vercel env changes, Supabase migration application, or paid service setup.

| Finding / area | Status | File evidence | What changed | What remains |
| --- | --- | --- | --- | --- |
| Refuted ops access-control criticals | refuted | `src/proxy.ts` protects `/ops` and `/api/al/wrenchready/*`; `npm run verify:security -- http://localhost:3000` returned 16 unauthenticated protected paths rejected | No code change made for the refuted access-control claim | None for this finding; keep auth tests in security verifier |
| Twilio inbound webhook signatures | implemented | `src/lib/twilio-webhook.ts`; all `src/app/api/twilio/**/route.ts`; `scripts/verify-twilio-webhooks.mjs` | Added `X-Twilio-Signature` validation for SMS, voice, screen, fallback, voicemail, and recording completion routes; forged SMS probe returns 403 | Production must keep `TWILIO_AUTH_TOKEN` configured; otherwise routes fail closed with 503 |
| Owner SMS relay trusted `From` alone | implemented | `src/app/api/twilio/sms/route.ts` | Owner relay commands now require a configured `TWILIO_OWNER_RELAY_PIN` / `WR_OWNER_RELAY_PIN` in addition to signed Twilio ingress and an allowed relay phone | Human must set and share the relay PIN operationally |
| Public write endpoint abuse/rate limiting | implemented, production-durable blocked | `src/lib/rate-limit.ts`; `/api/appointments`; `/api/scheduling/availability`; `/api/wrenchready/status/[token]/*`; Twilio routes | Added shared rate-limit abstraction and wired practical limits into public write endpoints and Twilio ingress | In production, durable storage remains blocked until `WR_RATE_LIMIT_STORE=upstash`, `UPSTASH_REDIS_REST_URL`, and `UPSTASH_REDIS_REST_TOKEN` are configured; volatile fallback is not a real multi-instance solution |
| Stripe webhook only handled completed checkout | implemented | `src/app/api/webhook/stripe/route.ts` | Added metadata/business validation, USD validation, async payment success/failure handling, refund handling, dispute-created handling, and idempotent references | Full accounting reconciliation, dispute resolution workflows, and Stripe event backfill are still not implemented |
| Promise CRM read-modify-write overwrites | implemented | `src/lib/promise-crm/storage.ts` | Promise and inbound PATCHes now write `updated_at` and use `updated_at=eq.<last-known-value>` preconditions; zero-row writes become conflict errors | UI only reports the conflict message; no merge UI exists |
| `updated_at` not reliably updated | implemented | `src/lib/promise-crm/storage.ts`; `supabase/migrations/20260620090000_create_wrenchready_promise_crm.sql` | Code now sends `updated_at`; migration adds update triggers for inbound and promise tables | Supabase production migration must be reviewed and applied |
| Structured schedule start/end missing from updates | implemented | `src/components/promise-status-form.tsx`; `src/app/api/al/wrenchready/promises/[id]/route.ts`; `src/lib/promise-crm/storage.ts` | Promise update form/API/storage now accept and persist `scheduledWindowStartIso` and `scheduledWindowEndIso` | Full scheduler UX is still basic ISO text fields |
| Promise CRM core schema not migrated | implemented as scaffold, blocked for prod | `supabase/migrations/20260620090000_create_wrenchready_promise_crm.sql` | Added an idempotent checked-in migration for `wrenchready_inbound` and `wrenchready_promise`, including indexes, RLS, grants, and triggers | Human must apply to Supabase after drift review |
| Jeff Vapi tool failure breaks turn | implemented | `src/lib/jeff-field-assistant/vapi-server.ts`; `npm run verify:jeff:vapi` | Each Vapi tool call now has per-tool try/catch and returns a structured failure while preserving the rest of the tool turn | More granular operator alerting for repeated tool failures is still future work |
| Jeff text plumbing weaker than voice | partially implemented | `src/lib/jeff-field-assistant/app-chat.ts`; `npm run verify:jeff:scenarios` | Message Jeff's bounded tool-action layer now isolates each tool failure before model response | Tool selection is still heuristic, not full model-driven function calling parity with voice |
| Message Jeff phone photo/base64 failures | implemented | `src/components/jeff-messages-thread.tsx`; `scripts/verify-live-ui-remediation.mjs` | Client resizes image attachments before base64 upload; failed sends keep the draft and expose a Retry button | True offline outbox, service worker, and non-base64 multipart/presigned uploads are not implemented |
| Repeated-use mobile tap targets too small | implemented | `src/components/jeff-messages-thread.tsx`; `docs/evaluation/screenshots/remediation/mobile-jeff-messages.png` | Main Message Jeff controls are now at least 44px; live verifier asserts attach/send dimensions | Wider audit of every mobile ops control remains |
| Tailwind v4 `[--wr-*]` brand color bug | implemented | Bulk codemod across `src`; `src/app/globals.css`; `scripts/verify-tailwind-brand-tokens.mjs`; `npm run verify:brand-tokens` | Converted bare `[--wr-*]` to `[var(--wr-*)]`; added missing `--wr-amber`, `--wr-green`, `--wr-red`; added guard script | Untracked `_twtest_content.html` still contains the old test fixture token; not part of app source |
| Reduced motion support | implemented | `src/app/globals.css`; `src/components/motion/*` | Added global reduced-motion CSS and made shared Framer Motion components render immediately without motion when requested | Inline one-off motion blocks outside shared primitives may still need future audit |
| Homepage intake labels and SMS consent | implemented | `src/components/home-page.tsx`; `src/app/api/appointments/route.ts`; `docs/evaluation/screenshots/remediation/mobile-home-intake.png` | Added accessible labels, required SMS consent checkbox, and consistent `smsConsent` payload from homepage intake | Legal copy should still be reviewed by counsel |
| `Call or Text` mismatch and duplicate mobile CTA | implemented | `src/data/site.ts`; `src/components/home-page.tsx`; `src/components/site-shell.tsx` | Added `smsHref`; phone links now say Call, SMS link says Text, mobile bottom bar is Call/Text/Request | Other pages may still choose call-only links intentionally |
| `/ops/inbound` 404 | implemented | `src/app/ops/inbound/page.tsx`; `docs/evaluation/screenshots/remediation/desktop-ops-inbound.png` | Added inbound queue page with active/promoted/high-risk stats and capped active list | Advanced filtering/search is not implemented |
| Ops navigation/shell and unbounded lists | partially implemented | `src/app/ops/layout.tsx`; `src/app/ops/tomorrow/page.tsx`; `src/app/ops/parts/page.tsx` | Added shared ops nav; capped tomorrow and parts lists; collapsed parts update forms by default | Full operator IA, pagination, and per-tech grouping remain future work |
| Hard-coded FAL key in helper scripts | implemented in working tree, rotation blocked | `poll-rotor.py`; `composite-and-submit.py`; `gen-rotor-clip.py` | Removed hard-coded key and require `FAL_KEY` from environment | Literal key redacted from the eval docs 2026-06-21. The only real fix remains: revoke/delete the key on fal.ai — the app does not use fal.ai, so no replacement is needed. Git history still holds the old value, but it is moot once the key is revoked. |

## Verification Run

- `npm run verify:brand-tokens` passed.
- `npm run lint` passed with 8 pre-existing unused-import warnings in location/service pages.
- `npx tsc --noEmit` passed.
- `npm run build` passed after allowing network access for Google Font fetches; remaining warning is existing Turbopack NFT tracing around Jeff local-data imports.
- `npm run verify:twilio -- http://localhost:3000` passed; forged SMS webhook returned 403.
- `npm run verify:security -- http://localhost:3000` passed.
- `npm run verify:jeff:vapi -- http://localhost:3000` passed.
- `npm run verify:jeff:scenarios -- http://localhost:3000` passed.
- `npm run verify:jeff -- http://localhost:3000` passed.
- `npm run verify:live-ui -- http://localhost:3000` passed and produced screenshots in `docs/evaluation/screenshots/remediation/`.

## Still Bluntly Not Solved

- Durable production rate limiting is not solved until a shared external store is configured.
- Supabase production schema is not migrated just because the migration file exists.
- The exposed FAL credential still needs rotation and git-history handling.
- Message Jeff is more reliable, but text tool selection is still not true model function-calling parity.
- Offline field outbox is not implemented.
- Stripe handling is materially safer, but not a full ledger, payout, or dispute-management system.
