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
