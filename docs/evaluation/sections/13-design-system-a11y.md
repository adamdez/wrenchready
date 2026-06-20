## 13. Design System, Component Library & Accessibility

**Verdict:** WrenchReady has a confident, cohesive *visual* design language — a well-considered OKLCH dark-theme token set, a documented brand guide, tasteful glass/mesh/orb motion primitives, and descriptive alt text on real imagery. But the engineering substrate underneath it is weak: a full shadcn/base-ui primitive library sits almost entirely unused (the app is built from ~76 raw `<button>`s and bespoke `.form-input` CSS), there is a **proven, repo-wide Tailwind v4 bug** that silently strips brand color from 304 class usages across 27 files (including the public homepage and customer checkout), accessibility is thin (zero `prefers-reduced-motion`, no `htmlFor`, custom focus styling only living in the dead primitive layer), and two core token pairs fail WCAG AA contrast. This reads as a design-forward founder build where the visual surface was hand-tuned but the systematic plumbing (component reuse, a11y, build-correctness) was never closed out.

**Score: 5 / 10**

### What's here

- **Token system** — `src/app/globals.css:7-82` defines a dark-only theme in OKLCH: semantic shadcn tokens (`--background`, `--card`, `--primary`, `--muted-foreground`, …) plus a parallel brand ramp (`--wr-blue`, `--wr-blue-soft/strong`, `--wr-teal`, `--wr-gold`, `--wr-purple`, `--wr-surface*`, `--wr-glow`). The `@theme inline` block (`globals.css:53-82`) registers **only** the semantic tokens as Tailwind utilities; the `--wr-*` ramp is not registered, so it can only be reached via inline `style` or arbitrary-value classes.
- **Brand guide** — `docs/WRENCHREADY_BRAND_GUIDE.md` is genuinely good: documents the palette with OKLCH + approx hex (WR Blue `#4AA3E8`), typography (Space Grotesk display / Inter body), logo dark-bg-only rules, photography/video specs, and CTA copy standards. The CSS tokens match the guide's OKLCH values exactly.
- **Primitive library** — `src/components/ui/` has 14 base-ui/react ("base-nova") primitives: `button`, `card`, `dialog`, `sheet`, `tabs`, `select`, `accordion`, `badge`, `input`, `label`, `textarea`, `tooltip`, `separator`, `tooltip`. These are well-authored (CVA variants, `focus-visible` rings, `aria-invalid` handling, `sr-only` close labels).
- **Motion** — `src/components/motion/{fade-in,animated-text,gradient-orbs}.tsx` (framer-motion): `FadeIn`/`Stagger` scroll reveals, `AnimatedHeading` per-word blur-in, `HeroGradientBg`/`SectionOrbs` infinite-loop floating orbs. Plus CSS keyframes in `globals.css:219-313` (`shimmer`, `float`, `pulse-glow`, `gradient-shift`, mesh backgrounds).
- **Shell** — `src/components/site-shell.tsx:169-469` renders the marketing header/footer/mobile-nav and short-circuits for `/ops`, `/jeff`, `/ops-slate` (`site-shell.tsx:175-177`), so the internal ops surface is chromeless.
- **Typography** — fonts wired via `next/font/google` in `src/app/layout.tsx:9-19`, exposed as `--font-display` / `--font-body`, applied globally in `globals.css:111-119`.

### Strengths

- **Disciplined OKLCH token foundation, faithful to the brand guide.** `globals.css:7-51` is a clean single source of truth; the `@theme inline` mapping (`globals.css:53-74`) wires semantic tokens to Tailwind, and `--radius` drives a derived radius scale (`globals.css:75-81`). Brand-guide OKLCH values match the CSS exactly (e.g. WR Blue `oklch(0.62 0.19 255)` in both).
- **The primitives that exist are correctly built.** `src/components/ui/button.tsx:6-41` is a proper CVA with `focus-visible:ring-3 focus-visible:ring-ring/50`, `aria-invalid` states, and disabled handling; `dialog.tsx:62-76` ships a `sr-only` "Close" label; `input.tsx:12` and `badge.tsx:8` carry full focus-visible + aria-invalid treatment. This is production-grade — it's just unused.
- **Imagery accessibility is a real strength.** All 21 `alt=` values are descriptive and contextual, not filename dumps — e.g. `home-page.tsx` `alt="WrenchReady technician inspecting brake pad wear at a customer's driveway"`. Zero raw `<img>` tags; everything routes through `next/image` (`grep`: 0 `<img`, 5 `next/image` imports), getting lazy-loading and sizing for free. The brand mark carries `alt="WrenchReady"` (`site-shell.tsx:21`).
- **No click-div soup.** Zero `<div onClick>` handlers repo-wide; interactive elements are real `<button>`/`<a>`/`<Link>`. Forms use **implicit label association** (`<label>` wrapping the control, e.g. `outbound-result-form.tsx:83-96`), which is valid for assistive tech despite `htmlFor` being absent.
- **Foreground body text contrast is excellent.** `--foreground` (`oklch(0.95 …)`) on `--background` (`oklch(0.08 …)`) computes to ~18:1 — far above AA.
- **Dark-theme discipline is enforced structurally.** `<html className="… dark">` is hardcoded (`layout.tsx:75`); there is no theme toggle and no light-mode code path, matching the brand's "dark-theme only" rule (`BRAND_GUIDE.md:75`).

### Findings

**Tailwind v4 bare-variable shorthand is broken across the app — 304 brand-color classes render with no color**
- **Severity: High**
- **Location:** `src/components/home-page.tsx:111-117` (55 uses), `src/app/ops/promises/[id]/page.tsx` (55), `src/components/promise-board.tsx` (18), `src/components/marketing.tsx` (15), `src/app/status/[token]/page.tsx:68-77` (10), `src/components/site-shell.tsx:418` — 304 total across 27 files.
- **Evidence:** The codebase uses the Tailwind v3 arbitrary-property shorthand `bg-[--wr-teal]`, `text-[--wr-gold]`, `border-[--wr-blue]/20`. This form was **removed in Tailwind v4**, and the project runs `tailwindcss@4.2.2`. Compiling the exact classes through the project's own `@tailwindcss/postcss` produces invalid CSS:
  ```css
  .bg-\[--wr-teal\]   { background-color: --wr-teal; }   /* invalid value → discarded */
  .border-\[--wr-blue\] { border-color: --wr-blue; }     /* invalid value → discarded */
  .text-\[var\(--wr-gold\)\] { color: var(--wr-gold); }  /* the correct form */
  ```
  The bare token emits `background-color: --wr-teal` (no `var()`), which every browser rejects as an invalid declaration. There are **0** uses of the correct `[var(--wr-*)]` form anywhere. The breakage spans `bg-` (91), `border-` (88), `text-` (27), gradient stops `from-/via-/to-` (13), `shadow-` (5), `fill-` (1).
- **Why it matters:** This silently drains brand color from the marketing homepage, the customer-facing status/checkout pages (`status/[token]`, `customer-deposit-checkout`, `customer-balance-checkout`), and the entire ops dispatch surface. Concretely, success-state banners lose their color cue: `outbound-result-form.tsx:74` styles the success message `border-[--wr-teal]/20 bg-[--wr-teal]/10 text-[--wr-teal-soft]` — all three are no-ops, so "success" renders as uncolored default text, collapsing a semantic UX signal. Because the failure is silent (invalid CSS is dropped, not errored), it can persist indefinitely. The brand guide insists teal/gold are deliberate semantic colors (`BRAND_GUIDE.md:56-62`); the implementation doesn't deliver them.
- **Recommendation:** Codemod `-\[--wr-([a-z-]+)\]` → `-[var(--wr-$1)]` across `src/`, **or** register the `--wr-*` ramp in the `@theme inline` block so first-class utilities (`bg-wr-teal`) exist. Then add a CI guard (a grep/ESLint rule) rejecting the bare `[--…]` form so it can't regress. Verify visually after — this touches the homepage and checkout.

**The shadcn/base-ui primitive library is dead code — the app is hand-rolled instead**
- **Severity: Medium**
- **Location:** `src/components/ui/*` (14 files); consumers: only `src/components/marketing.tsx` (button, accordion, tabs) and the two `ui/` files that reference each other.
- **Evidence:** Repo-wide, exactly **3** files import from `@/components/ui/` (`grep -rl`), and `<Button` appears **4** times vs **76** raw `<button>` elements. `card`, `sheet`, `select`, `input`, `label`, `textarea`, `badge`, `separator`, `tooltip`, `dialog` are imported by **zero** app files. Forms instead use bespoke global classes `.form-input` / `.form-textarea` (`globals.css:337-364`) and raw `<select>`/`<button>` (e.g. `outbound-result-form.tsx:87-95`).
- **Why it matters:** The investment in a consistent, accessible primitive layer is wasted — and worse, the app loses what those primitives provide. Every raw `<button>` and `<select>` re-implements (or omits) focus rings, disabled states, and aria handling ad hoc; there is no enforced single source for button/badge/dialog styling, so visual and behavioral drift is inevitable as the app grows toward the stated 7-tech scale. It also misleads future contributors, who reasonably assume `ui/` is the component contract.
- **Recommendation:** Decide and commit: either (a) adopt the primitives (migrate forms/buttons to `Button`/`Input`/`Select`/`Label`, deleting `.form-input`), gaining a11y for free, or (b) delete the unused primitives and document the bespoke pattern as canonical. The current half-state is the worst of both.

**No `prefers-reduced-motion` support anywhere — continuous and entrance animation is unconditional**
- **Severity: Medium (Accessibility)**
- **Location:** `src/components/motion/gradient-orbs.tsx:49-60`, `animated-text.tsx:21-47`, `fade-in.tsx:32-41`; CSS keyframes `globals.css:219-313`.
- **Evidence:** `grep` finds **0** occurrences of `prefers-reduced-motion` (CSS or JS) and **0** of framer's `useReducedMotion()`. Orbs animate `repeat: Infinity` (`gradient-orbs.tsx:55-58`); `.float`/`.pulse-glow`/`.btn-shimmer`/`.animated-gradient` are infinite CSS loops (`globals.css:242,253,275,283`) with no `@media (prefers-reduced-motion: reduce)` guard. `AnimatedHeading` animates `filter: blur(8px)→blur(0px)` on heading text content (`animated-text.tsx:33-39`).
- **Why it matters:** WCAG 2.1 SC 2.3.3 (and vestibular-disorder guidance) expects motion to honor the OS reduce-motion setting. Perpetually moving blurred orbs and per-word blur-in on headings are exactly the patterns that trigger motion sickness; users who set the system preference get no relief. The blur-on-text entrance is also a momentary legibility cost for everyone.
- **Recommendation:** Add a global `@media (prefers-reduced-motion: reduce) { *, ::before, ::after { animation: none !important; transition: none !important; } }` to `globals.css`, and gate framer animations with `useReducedMotion()` (return static variants when reduced). At minimum, disable the infinite orb/float loops.

**Custom `focus-visible` styling lives only in the unused primitives; the real app relies on a single global outline**
- **Severity: Medium (Accessibility)**
- **Location:** All 29 `focus-visible` declarations are in `src/components/ui/*` (`focus-visible by dir`: 29/29 in `components/ui`). App-authored interactive elements have none; the only keyboard-focus affordance is the global `@apply … outline-ring/50` at `globals.css:121-124`.
- **Evidence:** The 76 raw `<button>`s (e.g. mobile-nav close `site-shell.tsx:102-107`, menu trigger `site-shell.tsx:242-248`) and the bespoke `.form-input` (`globals.css:337-364`) define `:focus` styling for inputs but **no `:focus-visible`** for buttons/links; `.form-input:focus` (`globals.css:359-363`) styles inputs only. Custom anchors/buttons inherit just the faint `outline-ring/50`.
- **Why it matters:** Keyboard users get an inconsistent, low-contrast focus indicator across the most-used controls (header CTA, mobile nav, ops action buttons), while the strong `focus-visible:ring-3` rings sit in components nobody renders. This degrades keyboard navigability of the dispatch console the office staff live in.
- **Recommendation:** Define a project-wide focus-visible utility (or adopt the `Button` primitive). Add a visible `:focus-visible` ring to `.form-input`/links and audit the ops surface with keyboard-only navigation.

**Primary CTA text and muted body text fail WCAG AA contrast on the dark surface**
- **Severity: Medium (Accessibility)**
- **Location:** `globals.css:17-18` (`--primary` / `--primary-foreground`), `globals.css:23` (`--muted-foreground`); muted-with-opacity at `site-shell.tsx:378,399,406`.
- **Evidence:** Converting the OKLCH tokens to sRGB luminance and computing WCAG ratios:
  - `--primary-foreground` on `--primary` (the site-wide primary button, `bg-primary text-primary-foreground`, e.g. `site-shell.tsx:223`): **≈3.5:1** — below AA 4.5 for normal text.
  - `--muted-foreground` on `--background`: **≈4.3:1** — below AA 4.5; this token is the default body-copy color across marketing and ops (e.g. footer paragraph `site-shell.tsx:269`).
  - `text-muted-foreground/70` (footer legal/contact, `site-shell.tsx:378,399,406`): **≈3.0:1** — clearly failing.
- **Why it matters:** The primary CTA ("Request Service") is the single most important interactive label on the site, and it doesn't meet AA. Large swaths of supporting copy sit just under threshold, and the `/70` legal text fails outright — relevant given the site makes licensing/compliance claims that should be readable.
- **Recommendation:** Darken `--primary` slightly or use a darker `--primary-foreground` to reach ≥4.5:1 on the button; raise `--muted-foreground` lightness (e.g. `oklch(0.62 …)`) to clear AA; stop using `/70` opacity on already-muted text. Validate with an OKLCH-aware contrast checker.

**Legacy `[--wr-*]` color arbitrary-value `class` for the footer compliance badge is doubly broken**
- **Severity: Low**
- **Location:** `src/components/site-shell.tsx:418-421`.
- **Evidence:** The RCW-compliance badge uses `border-[--wr-teal]/15 bg-[--wr-teal]/5 … text-[--wr-teal]` — three instances of the broken bare-variable form (per the High finding above) compounded with opacity modifiers on an already-invalid value, so the badge renders with no teal border/background/text.
- **Why it matters:** A trust-signal badge ("Licensed • Insured • RCW 46.71 Compliant") in the footer loses its visual styling entirely, undermining the credibility cue on every public page.
- **Recommendation:** Fold into the codemod from the High finding; this badge is a good visual-regression spot-check.

**Decorative icons are not hidden from assistive tech**
- **Severity: Low (Accessibility)**
- **Location:** repo-wide; e.g. lucide icons throughout `site-shell.tsx` (`Phone`, `Wrench`, `MapPin`, `ArrowRight`, …) and the inline Google SVG at `site-shell.tsx:295-300`.
- **Evidence:** `grep` finds **0** `aria-hidden` attributes repo-wide. The hand-rolled Google "G" SVG (`site-shell.tsx:295`) and decorative lucide glyphs carry no `aria-hidden="true"`; `role=` appears once total (`ops/jeff/section-jump-button.tsx:26`).
- **Why it matters:** Mostly benign for icons placed adjacent to visible text (the text label carries the meaning), but icon-only controls — e.g. the mobile menu toggle (`site-shell.tsx:242`, mitigated by `aria-label="Open menu"`) and the close button (`site-shell.tsx:102`, which has **no** accessible name) — can announce confusingly or as unlabeled. The close button is the concrete gap: a screen reader reads it as an empty button.
- **Recommendation:** Add `aria-hidden="true"` to purely decorative SVGs and `aria-label="Close menu"` to the mobile-nav close button (`site-shell.tsx:102-107`).

**`CountUp` component is a no-op masquerading as an animated counter**
- **Severity: Low (Cleanliness)**
- **Location:** `src/components/motion/animated-text.tsx:58-85`.
- **Evidence:** `CountUp` nests three `motion.span`s that only fade opacity and renders `{target}` statically (`animated-text.tsx:78-80`) — there is no `useMotionValue`/`animate` count, no interpolation. It "counts up" to nothing; the number simply appears.
- **Why it matters:** Dead/misleading abstraction; future devs will assume it animates. Minor, but it's debt in the motion layer.
- **Recommendation:** Implement with framer's `useMotionValue` + `useTransform`/`animate`, or delete it and render the number directly.

### Score rationale

The *visual* design system earns real credit: a coherent OKLCH dark theme that matches a thoughtful brand guide, good imagery alt text, no click-div soup, valid implicit form labeling, and a tasteful motion vocabulary. That alone keeps this out of "serious problems" territory. But three things drag it to the middle: (1) a **proven build bug** silently removing brand color from 304 usages across the public homepage, customer checkout, and the ops console — the kind of latent defect that should never survive in a shipping product; (2) an accessible primitive library that is **dead code**, with the app hand-rolling 76 raw buttons and bespoke form CSS, leaving custom focus-visible styling stranded where nothing renders it; and (3) genuine a11y gaps — zero reduced-motion support against infinite orb/blur animations, and two core token pairs (primary CTA text, muted body text) failing WCAG AA. None are individually catastrophic, but together they show a surface that was art-directed by eye rather than engineered as a system. A 5 reflects "works and looks good, but carries significant, partly-invisible debt and below-bar accessibility." Fixing the Tailwind shorthand (a mechanical codemod) and committing to either adopting or deleting the primitive layer would move this to a 7 quickly.
