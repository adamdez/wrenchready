# WrenchReady — Live Rendered / On-Device UI Pass

> **Date:** 2026-06-19
> **Method:** `next dev` booted on `:3000`; surfaces driven in a real browser at desktop (1280×800) and mobile (375×812, iPhone-class) viewports. Findings backed by **computed-style inspection** and **runtime HTTP probes**, not screenshots alone.
> **Companion to:** `WRENCHREADY_PRODUCT_EVALUATION.md` (the static 13-dimension audit). This pass validates the UI findings that could only be confirmed against the running app.

---

## Headline: what the live pass changed

| Static finding | Live verdict | Evidence |
|---|---|---|
| **A13-01** Tailwind v4 strips brand color | ✅ **CONFIRMED & quantified** | 132 broken tokens on homepage; transparent/white computed colors |
| **A10-01** Intake form has no labels / no SMS consent | ✅ **CONFIRMED precisely** | 9 fields, 0 labels, 0 `<label>` on page, no consent text |
| **A1-03 / A4-01** `/ops` + ops API unauthenticated | ❌ **REFUTED at runtime** | `/ops` → 401, `/api/al/wrenchready/promises` → 401 |

The live pass **corroborates the Post-Assembly Reconciliation**: the access-control "criticals" are not real; the brand-color and form-a11y findings are.

---

## 1. A13-01 — Brand-color bug: CONFIRMED, with measured blast radius

**The variables are defined; the class syntax is wrong.** `--wr-blue` resolves to `lab(54.49% 3.97 -65.23)` (the brand blue) and `--wr-teal` to `lab(69% -45.8 -13.7)`. But the code uses Tailwind's **arbitrary-value bracket** form `text-[--wr-teal]` / `bg-[--wr-blue]/10`, which emits `color: --wr-teal` (invalid CSS, missing `var()`) instead of `color: var(--wr-teal)`. The declaration is dropped and the element falls back to inherited color.

**Measured live on the homepage:**
- **132** class tokens use the broken `[--wr-*]` bracket form.
- **0** use the correct Tailwind v4 paren shorthand `(--wr-*)` or explicit `[var(--wr-*)]`.
- `bg-[--wr-blue]/10` → computed `background-color: rgba(0, 0, 0, 0)` — **fully transparent**, tint not rendered.
- `text-[--wr-teal]` → computed color is inherited white (`oklab(~1 …)`) or a muted grey, **not teal**.

**Actual visual impact (calibration):** *moderate, not catastrophic.* The most prominent brand elements — the WR logo and the primary blue CTAs ("Request Service", "Book") — use working color paths and render correctly. What breaks is the **accent layer**: eyebrow labels ("WHAT TO SEND US", "WHAT WE HANDLE BEST") render muted grey/white instead of consistent brand teal, and the subtle `/10` and `/3` tint backgrounds on cards and section washes disappear, so the page reads **flatter and darker** than designed. It looks like an unstyled-accent version of an otherwise-polished page, not a broken one.

**Secondary defect found during the pass:** `--wr-amber`, `--wr-green`, `--wr-red` are **referenced but UNSET** (resolve to empty). Even after the bracket→`var()` codemod, those utilities would still produce no color. Define them in `globals.css` (or remove the references) as part of the same fix.

**Recommendation (unchanged, now higher-confidence):** codemod every `-[--wr-x]` → `-(--wr-x)` (Tailwind v4 paren shorthand) or `-[var(--wr-x)]`; define the missing amber/green/red tokens; add a CI guard (a grep that fails the build on `\[--wr-`).

---

## 2. A10-01 — Intake form accessibility & SMS consent: CONFIRMED

Live DOM audit of the primary homepage intake form:
- **9 fields** (`year`, `make`, `model`, `service`, `problem`, `address`, `name`, `phone`, `email`).
- **0** have an accessible name — no `label[for]`, no wrapping `<label>`, no `aria-label`, no `aria-labelledby`.
- **0** `<label>` elements exist on the entire page.
- Labeling is **placeholder-only** (placeholders vanish on input, fail AA contrast, and are unreliably announced by screen readers).
- **No SMS/consent language** anywhere in the page text, yet the form collects a `tel` number used for outbound texting.

**Why it matters:** (1) WCAG 2.x 1.3.1 / 4.1.2 failure on the single highest-traffic conversion surface; (2) collecting a mobile number for SMS without an explicit consent disclosure is a **TCPA / A2P-10DLC compliance gap** — carriers increasingly reject campaigns that can't show consent capture.

**Recommendation:** add visually-hidden `<label>`s (or `aria-label`) per field, add an explicit SMS-consent checkbox + disclosure near the phone field, and extract one shared `<IntakeForm>` (the same fields are duplicated across home/contact/ads surfaces).

---

## 3. Access control: REFUTED at runtime (good news)

Runtime HTTP probes (no credentials supplied):

| Path | Status | Note |
|---|---|---|
| `/ops` | **401** Basic | `WWW-Authenticate: Basic realm="WrenchReady Ops"` — proxy.ts gate live |
| `/ops/promises` | **401** Basic | gated |
| `/api/al/wrenchready/promises` | **401** JSON | `{"success":false,"error":"Authentication required."}` |
| `/jeff` | **200** | page shell public; actions PIN-gated server-side |
| `/status/invalid-token-xyz` | **404** | handled (branded not-found, see §5) |
| `/api/al/wrenchready/jeff/tools/get-jeff-capabilities` | **405** | POST-only; rejects GET |
| `/api/scheduling/availability` | **405** | POST-only |
| `/services`, `/locations`, `/contact` | **200** | public marketing, correct |

This is the runtime proof behind the reconciliation: anonymous callers **cannot** read or mutate the system of record — the ops surface and its API both return 401.

---

## 4. What's genuinely good (verified live)

- **Mobile-first execution is real.** At 375px the homepage has a sticky top bar (logo / call / Book / menu), a full-width thumb-friendly "Request Service" button, and a **persistent bottom action bar** (Call / Request) — the right pattern for a phone-first audience.
- **No console errors** on the homepage (`error`-level log empty).
- **Symptom checker works.** `/tools/symptom-checker` is a clean 3-step flow; clicking "Strange noise" correctly advances to step 2 ("Which sounds closest?") with sub-options and a "Back to categories" affordance. Good conversion tool, functioning.
- **The `/jeff` field app is the strongest UI in the product.** Status-first ("No live call / idle"), large cards (Message / Call / Share Location / Field Docs / Photo Drop Backup), and — notably — it **surfaces the authority guardrail in the UI itself** ("Parts purchases stay blocked. Jeff can identify next checks and draft escalations. Real orders need…"). The safety model is communicated to the tech, not just enforced in code.
- **Branded 404.** Unknown routes render a custom not-found, not a stack trace.

---

## 5. New minor findings from the live pass

| # | Severity | Finding | Evidence |
|---|---|---|---|
| L-1 | low | `--wr-amber/green/red` referenced but undefined | computed value empty at `:root` |
| L-2 | low | `/jeff` page shell loads with no PIN (200); business phone visible pre-auth | runtime probe — actions are gated, but the layout/number are public to anyone with the URL |
| L-3 | low | Customer 404 copy is marketing-oriented ("not part of the launch route"), unhelpful for a customer whose **status link expired** — says nothing about expiry or "contact us" | `/status/invalid-token-xyz` render |
| L-4 | info | Eyebrow labels render **inconsistently** (some white, some grey) because the broken color falls back to whatever each parent inherits | computed-style sample on homepage |

---

## 6. Coverage & what still needs a human/device

- **Covered live:** homepage (desktop + mobile), symptom-checker (interactive), `/jeff` field app, customer 404/expired-link path, marketing route reachability, ops/API auth behavior, console health, the two top UI findings (A13-01, A10-01).
- **Not covered (needs real device / authed data):** a **real** `/status/<valid-token>` customer payment/approval flow (needs a seeded promise + Stripe test mode), the `/jeff` message/photo-upload loop **on cellular** (the base64-over-JSON concern A12-02), and on-glass checks: true tap-target sizes in the hand, sunlight contrast, and iOS input-zoom. A short on-device session is the recommended next step if you want those closed.

---

## 7. Extended pass — Jeff field sub-pages + authenticated `/ops/jeff`

Driven after the initial pass to cover `/jeff/*` and `/ops/jeff` specifically.

### `/jeff/docs` — strong, on-brand
Dark-themed "Simon quick reference" cards (Diagnostic Rule, Photo Checklist, Approval Stop, Closeout, Exact Specs) that encode the operating doctrine directly into the field UI. Brand-correct, high-signal, good tap targets. No issues.

### `/jeff/messages` — works, but two findings
- **L-5 (medium, design-consistency): light theme inside a dark-only brand.** The chat thread renders on **light/white surfaces** (`bg-white`-style panels) while the page `body` is dark (`lab(0.44% …)` ≈ black) and every other surface — `/jeff` home, `/jeff/docs`, marketing — is dark. The brand guide is explicit that the mark/system is dark-background-only. The chat surface is the outlier and looks like a different app.
- Empty state is handled well ("No messages are saved in this job file yet. Type below to start."), and there's a **mic/voice input** affordance — correct for hands-busy field use. The composer `<textarea>` is **placeholder-only ("Message Jeff"), no label** — same a11y gap as A10-01, now also present in the field app.

### L-6 (data-handling note): real pilot PII served without a PIN in dev
`/jeff/messages` loaded a **real** job file — "Stuart Grossman / 2021 Ford E-450" — from `.data/jeff/workspace.json` (not a code fixture; the dir also holds real `field-events.json`, `memory.json`, and ~dozens of customer photos). It rendered with **no PIN** because `JEFF_FIELD_APP_PIN` is unset locally and `authorizeJeffFieldAppRequest` returns `authorized:true` in non-production. In production the same path **fails closed (503)** when no PIN is set, so this is **not a prod exposure** — but it means (a) protection of the entire field surface hinges on `JEFF_FIELD_APP_PIN` actually being set in prod (verify it), and (b) real customer names/photos sit in a local `.data/jeff/` store that is served openly to anyone who can reach the dev server. Confirm the prod PIN and treat `.data/jeff/` as sensitive.

### `/ops/jeff` — useful triage console (analyzed via authenticated fetch + source)
Reached with the existing configured ops credential (read-only, in-shell) returning **HTTP 200**; assessed from the rendered server HTML (469 KB) plus `src/app/ops/jeff/page.tsx`. *(No pixel screenshot: provisioning a preview-browser login was correctly blocked by the harness as an auth-escalation, so this surface was reviewed structurally rather than visually.)*
- **Strong operator instincts, confirmed.** Renders an "Open Tasks" work queue with live counts (`blocked: 30 · critical: 2`), each task carrying owner / source / blocker / schedule-window and Open·Working·Done state toggles; a "Latest Jeff call" panel (real call: *2001 Chevy Astro, 6/19/2026 4:58 PM*) with the next-human-move and **Draft recap / Send recap / Mark reviewed / Open workspace** actions; and a "Human Action Queue."
- **Guardrail surfaced to the office, verbatim:** the call card shows Jeff refusing to buy/reserve parts and offering a structured escalation instead — the code-enforced authority boundary is visible end-to-end (field → ops).
- **Notes:** (1) `blocked: 30` is a large backlog — likely pilot/test noise, but the list **caps at "Showing 4 of 30"**, so the cockpit needs better triage/pagination at real volume; (2) a per-page **"Back to Ops"** link (not a persistent shell) corroborates **A11-02** (no shared ops shell/nav across the ~20 dashboards).

---

## 8. Authenticated `/ops` cockpit — pixel pass (Playwright, desktop + mobile)

Captured with Playwright driving headless Chromium, reading the configured ops credential from `.env.local` at runtime (never printed; `.env.local` unmodified). Screenshots saved to `docs/evaluation/screenshots/`. Desktop = full-page 1440-wide; mobile = 390×844.

### What's genuinely good (confirmed visually)
- **The Promise Board (`/ops`) is a real dispatch cockpit.** A four-column pipeline — **New Requests → Quote / Schedule Review → Promised Jobs → Follow-Up Due** — each column with a live count, cards carrying customer / vehicle / location / blocker / a concrete **Next action**, and inline **Text · Call · Email** buttons. A persistent "Already dispatched? — log the job in one pass" quick-entry form sits on top, and an at-risk-promise flag line anchors the bottom. This is well-conceived for running dispatch. (`docs/evaluation/screenshots/desktop-ops.png`)
- **Consistent dark design language across dashboards.** The board, the analytics view (`/ops/insights` — "What we market vs what actually creates net profit", KPI cards + per-service profit breakdowns), the triage console, and the day view all share one type scale, card style, and palette. The cockpit looks like one product. (`desktop-ops-insights.png`)
- **Ops forms are properly labelled.** The mobile dispatch form shows real **JOB / ADDRESS / TIME / TECH** field labels (teal, brand-correct) — so the missing-label defect (**A10-01**) is **specific to the public marketing intake form, not the cockpit**. Mobile `/ops` is secondary but usable. (`mobile-ops.png`)
- **Brand color renders correctly in the cockpit.** The teal eyebrow/labels show real color on `/ops`, suggesting the Tailwind v4 `[--wr-*]` bracket bug (**A13-01**) is **scoped to the marketing surface**, not app-wide — its blast radius is narrower than the static estimate implied. (Worth a targeted codemod-and-verify rather than assuming every surface is affected.)

### New findings from the authenticated pixel pass

| # | Severity | Finding | Evidence |
|---|---|---|---|
| **L-7** | **high (UX/scale)** | **`/ops/tomorrow` renders as a single ~40,900px-tall, unpaginated, unvirtualized list** of every task/blocker (red rows = blockers). `/ops/parts`, `/ops/field`, and `/ops/jeff` are similarly enormous (3.5–5.3 MB full-page captures). With one tech this is merely long; **at 7 techs these views are unusable** — they need pagination, virtualization, per-tech filtering, and collapse-by-default. | `desktop-ops-tomorrow.png` (40,932px), `desktop-ops-parts.png`, `desktop-ops-field.png` |
| **L-8** | **medium (bug)** | **`/ops/inbound` returns 404** — the route directory exists but serves no page; an authenticated operator following an inbound link hits the marketing 404. Dead nav target. | HTTP 404 + marketing-404 title on `/ops/inbound` |
| **L-9** | low | No persistent nav shell — each dashboard is standalone with a "Back to Ops" link; moving between the ~20 surfaces is a hub-and-spoke round-trip. Confirms **A11-02** visually. | all `/ops/*` captures |

### Net
The cockpit's **information design is good and its visual language is coherent** — the static review's "good operator instincts" holds up on screen. The dominant real problem is **density/scale**: several core operator views dump unbounded lists into one scroll, which is the single thing most likely to break when the business actually reaches the 7-tech target this product is built for.

*Artifacts: 14 screenshots in `docs/evaluation/screenshots/`. Playwright was installed in an isolated `/tmp` dir (repo `package.json` untouched) and can be deleted with `rm -rf /tmp/wr-pw /tmp/wr-shots /tmp/wr-ui-pass.sh`.*
