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
