# Brand and hero assets (drop-in guide)

Paths are centralized in `src/data/hero-media.ts`. Replace files under `public/`; no code changes needed unless filenames change.

## Logo (transparent only)

| File | Purpose | Spec |
|------|---------|------|
| `public/wr-logo.png` | Mark / icon (header, footer, hero) | **PNG or WebP with alpha.** True transparency — no white or gray matte box. Recommended ~512×512 px source, exported @1x–@2x. |

**Issue fixed in repo:** `wr-logo-full.png` is JPEG data with a `.png` extension (opaque rectangle behind artwork). The site no longer uses it. If you need a wide lockup, export **`public/wr-wordmark.png`** (or update `BRAND_LOGO_MARK_SRC` in `hero-media.ts` to a single full-width transparent PNG) and swap `BrandLockup` in `src/components/brand-logo.tsx` to one `<Image>` if preferred.

## Hero poster (LCP still)

| File | Purpose | Spec |
|------|---------|------|
| `public/hero-main.png` | Poster + fallback when video is off | **WebP or PNG**, 1920×1080 (or 16:9), &lt; ~400 KB WebP target. This is the stock placeholder until Simon photography is ready. |

## Hero looping video

| File | Purpose | Spec |
|------|---------|------|
| `public/hero-loop.mp4` | Short loop behind overlay | **H.264 MP4**, 1920×1080 or 1280×720, 8–20 s loop, muted-friendly (no audio required), &lt; ~5–8 MB if possible. |

Behavior (see `src/components/hero-background.tsx`):

- Poster image loads first (priority).
- Video loads only at **`min-width: 768px`** and when **`prefers-reduced-motion: no`**.
- Mobile and reduced-motion users see poster only.
- Overlay stays at **≥ 55%** effective darkening (black/gradients) for readability and to avoid showing third-party branding in stock footage.

## Optional Simon cutout

| File | Purpose | Spec |
|------|---------|------|
| `public/simon-hero-cutout.png` | Future foreground cutout next to copy | **PNG with alpha.** Full height ~800–1200 px tall; not wired until you add a layout block in `HomePage`. |

## Local source folder (Dez / Simon)

Place final exports into `public/` using the filenames above. A common local path during production:

`C:\Users\adamd\Desktop\Simon\simon`

After copying into `public/`, commit the binaries or deploy via your usual asset pipeline.
