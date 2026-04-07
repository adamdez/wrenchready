# Homepage redesign — review notes (for PR description)

## Summary

- Premium local-mobile-mechanic layout: tighter type scale, refined hero hierarchy, grid trust strip, service cards with clearer primary/secondary actions, bottom CTA with stronger booking vs. phone split.
- Hero supports a **poster still** (`hero-main.png`, LCP) plus optional **looping MP4** (`hero-loop.mp4`) with dark overlays (≥55% effective darkening). Video only on **md+** and when **`prefers-reduced-motion: no`**; otherwise poster only.
- **Logo:** Header/footer/hero use the real **RGBA** mark (`wr-logo.png`). The old `wr-logo-full.png` file is JPEG data with a `.png` extension (opaque block) — no longer referenced. Full transparent wordmark: drop in `wr-wordmark.png` per `docs/brand-assets.md` if you consolidate to one asset.
- Performance: service images lazy-loaded; hero video deferred by breakpoint + motion query; tilt cards disabled below lg / under reduced motion; mobile FAB uses lighter animation when motion is allowed.

## Screenshots to attach (manual)

1. Home hero — desktop (full width).
2. Home hero — mobile (stacked CTAs + stat row).
3. Trust strip + top of services grid.
4. Footer with transparent lockup.

## QA checklist

- [ ] No square matte behind logo in header/footer/hero.
- [ ] Hero readable on stock image; overlays not reduced below policy.
- [ ] With `prefers-reduced-motion: reduce`, hero shows image only (no video).
- [ ] Narrow viewport: no video element driving bandwidth.
