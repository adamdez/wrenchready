# WrenchReady Brand Guide

Version: 2026-04-12

---

## 1. Logo

### Primary Logo: `wr-logo-full`

The primary WrenchReady logo includes the WR monogram with wrench swoosh and the "WRENCHREADY" wordmark beneath it.

| Format | Path | Use |
|--------|------|-----|
| SVG | `public/wr-logo-full.svg` | Web (scalable, preferred) |
| PNG | `public/wr-logo-full.png` | Web fallback |
| PNG @4096 | `public/logo-assets/wr-logo-full@4096.png` | Print / high-res |
| AI | `public/logo-assets/wr-logo-full.ai` | Source vector (Illustrator) |
| EPS | `public/logo-assets/wr-logo-full.eps` | Print production |
| PDF | `public/logo-assets/wr-logo-full.pdf` | Print / review |

### Secondary Logo: `wr-logo-mobile-mechanic`

Extended version including "Mobile Mechanic" sub-text.

| Format | Path |
|--------|------|
| SVG | `public/wr-logo-mobile-mechanic.svg` |
| PNG @4096 | `public/logo-assets/wr-logo-mobile-mechanic@4096.png` |
| AI | `public/logo-assets/wr-logo-mobile-mechanic.ai` |
| EPS | `public/logo-assets/wr-logo-mobile-mechanic.eps` |
| PDF | `public/logo-assets/wr-logo-mobile-mechanic.pdf` |

### Logo Rules

- **Dark backgrounds only.** The WR monogram and wordmark are white + blue. Always place on dark backgrounds (navy, black, or dark photography overlays).
- **Minimum clear space.** Maintain at least half the height of the WR monogram as clear space on all sides.
- **No recoloring.** Do not alter the blue swoosh or white letterforms.
- **No rotation, warping, or drop shadows** beyond the site's standard `drop-shadow-2xl` on hero overlays.
- **Minimum size.** Do not render the full logo smaller than 100px wide on web or 1 inch wide in print.

---

## 2. Colors

### Primary Palette

| Name | CSS Variable | OKLCH | Approx Hex | Use |
|------|-------------|-------|------------|-----|
| **WR Blue** | `--wr-blue` | `oklch(0.62 0.19 255)` | `#4AA3E8` | Primary brand blue, logo swoosh, CTAs, links |
| **WR Blue Strong** | `--wr-blue-strong` | `oklch(0.52 0.22 255)` | `#2B7FCC` | Active states, focus rings |
| **WR Blue Soft** | `--wr-blue-soft` | `oklch(0.72 0.12 255)` | `#7FBCE8` | Hover states, secondary highlights |

### Accent Palette

| Name | CSS Variable | OKLCH | Use |
|------|-------------|-------|-----|
| **WR Teal** | `--wr-teal` | `oklch(0.72 0.14 195)` | Eyebrow text, live indicators, secondary accent |
| **WR Teal Soft** | `--wr-teal-soft` | `oklch(0.80 0.08 195)` | Subtle teal tints |
| **WR Gold** | `--wr-gold` | `oklch(0.78 0.14 85)` | Stars, ratings, premium callouts |
| **WR Gold Soft** | `--wr-gold-soft` | `oklch(0.85 0.08 85)` | Subtle gold tints |
| **WR Purple** | `--wr-purple` | `oklch(0.55 0.16 290)` | Rarely used — chart accent only |

### Surface Palette (Dark Theme)

| Name | CSS Variable | OKLCH | Use |
|------|-------------|-------|-----|
| **Surface** | `--wr-surface` | `oklch(0.12 0.02 255)` | Page background base |
| **Surface Raised** | `--wr-surface-raised` | `oklch(0.15 0.025 255)` | Cards, elevated panels |
| **Surface Bright** | `--wr-surface-bright` | `oklch(0.18 0.03 255)` | Active cards, hover states |
| **Glow** | `--wr-glow` | `oklch(0.62 0.19 255 / 12%)` | Blue glow effects |

### Color Rules

- The site is **dark-theme only**. All color decisions assume a dark (near-black with slight blue tint) background.
- `--wr-blue` is the primary action color. Every primary CTA uses this.
- `--wr-teal` is the eyebrow/label color. Small uppercase labels and live-status indicators use teal.
- White text on dark backgrounds: use `text-white` for hero overlays, `text-foreground` for cards/content.
- Muted text: `text-muted-foreground` (approx white at 60% opacity).

---

## 3. Typography

### Font Stack

| Role | Font Family | CSS Variable | Weights | Source |
|------|------------|-------------|---------|--------|
| **Display / Headings** | Space Grotesk | `--font-display` | 500, 600, 700 | Google Fonts |
| **Body / UI** | Inter | `--font-body` | 400, 500, 600 | Google Fonts |

### Type Scale (Tailwind)

| Element | Class | Example |
|---------|-------|---------|
| Hero heading | `text-3xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold tracking-tight` | "Mobile car repair in Spokane..." |
| Section heading | `text-3xl sm:text-4xl font-bold tracking-tight` | "What We Handle Best" |
| Card heading | `text-lg font-semibold` | Service card titles |
| Eyebrow label | `text-xs font-semibold uppercase tracking-[0.2em]` + `color: var(--wr-teal)` | "HOW IT WORKS" |
| Body text | `text-base text-muted-foreground` | Paragraph text |
| Small / legal | `text-xs text-muted-foreground` | Footer legal, compliance |

### Typography Rules

- **Headings** always use Space Grotesk (`font-display`).
- **Body copy** always uses Inter (`font-body`).
- **No other fonts.** Do not introduce additional typefaces.
- **Uppercase tracking** for eyebrow labels: always `tracking-[0.2em]`.
- **Hero text** uses a gradient effect via the `AnimatedHeading` component with `gradient` prop.

---

## 4. Photography & Image Standards

### AI-Generated Imagery

All non-logo imagery on the site is AI-generated using reference portraits of Simon (the owner/technician).

| File | Path | Use |
|------|------|-----|
| Simon ref A | `public/simon/simon-a.jpg` | Primary face reference |
| Simon ref B | `public/simon/simon-b.jpg` | Secondary (smiling) |
| Simon ref C | `public/simon/simon-c.jpg` | Third angle |

### Simon's Appearance (Prompt Reference)

When generating new images of Simon, match these characteristics from the real portraits:

- **Face:** Round with full cheeks, naturally proportioned
- **Hair:** Very short buzz-cut — not fully bald, light layer of hair/stubble on scalp
- **Facial hair:** Ginger/copper-red goatee — mustache and chin beard with lighter stubble on cheeks
- **Eyes:** Light blue
- **Skin:** Fair, pinkish
- **Build:** Solid, stocky — broad shoulders, thick neck, working man's build
- **Age:** Late 20s
- **Shirt:** Dark navy blue polo. Logo composited in post-production (do not ask AI to generate logo text)

### Setting

- Spokane suburban driveways
- Ponderosa pine trees in background
- Ranch-style houses
- Warm golden-hour afternoon light
- Vehicles: Ford F-150, GMC Yukon Denali, SUVs and pickups (no sedans)

### Image Formats

- **WebP** for all site images (converted from PNG source via ffmpeg/cwebp)
- **PNG** retained as source files in `assets/` directory
- Standard size: 1920×1080 landscape for section images

---

## 5. Video Standards

### Hero Background Loop

The hero section uses a looping video background composed of 4 clips cross-dissolved together.

| Clip | Content |
|------|---------|
| 1 | Simon pouring oil under hood |
| 2 | Simon closing truck hood with both hands |
| 3 | Simon writing on clipboard |
| 4 | Simon inspecting F-150 brake rotor (profile shot) |

### Video Specs

| Property | Desktop | Mobile |
|----------|---------|--------|
| Resolution | 1920×1080 | 1080×1920 |
| Frame rate | 30fps | 30fps |
| Codec | H.264 High | H.264 High |
| Duration | ~17.8s (loops) | ~17.8s (loops) |
| Grain | `noise=alls=3:allf=t` | `noise=alls=2:allf=t` |
| CRF | 28 | 28 |
| Color grade | `eq=saturation=0.85:brightness=0.02` | Same |

### Video Generation

- Source images generated via Cursor's `GenerateImage` tool with Simon reference photos
- Video clips generated via **fal.ai Kling v3.0 Pro** image-to-video endpoint
- 5-second clips at 24fps, then normalized to 30fps 1920×1080
- Cross-dissolved with 0.75s xfade transitions via ffmpeg
- Final pass adds subtle film grain

---

## 6. Component Patterns

### CTAs

- **Primary CTA text:** "Request Service" (site-wide standard)
- **CTA style:** Rounded full (`rounded-full`), `bg-primary`, `text-primary-foreground`, `font-semibold`
- **No unverified numerical claims** (no "X% off", no "response in Y minutes")

### Header Brand Mark

The header uses the actual `wr-logo-full.png` logo at 36px height alongside:
- **Line 1:** "WrenchReady Mobile" (Space Grotesk, semibold, foreground color)
- **Line 2:** "Spokane's Premier Mobile Auto Service" (Inter, medium, muted)

### Footer

- Full logo image (`wr-logo-full.png`) at 48px height
- Site description from `siteConfig.shortDescription`
- Service links, area links, contact block
- Legal: "Licensed • Insured • RCW 46.71 Compliant"

---

## 7. Logo Asset Inventory

```
public/
├── wr-logo-full.png              ← Web (dark bg)
├── wr-logo-full.svg              ← Web scalable (dark bg)
├── wr-logo-mobile-mechanic.svg   ← Extended with "Mobile Mechanic"
├── logo-assets/
│   ├── wr-logo-full.ai           ← Illustrator source
│   ├── wr-logo-full.eps          ← Print vector
│   ├── wr-logo-full.pdf          ← Print review
│   ├── wr-logo-full.svg          ← Source SVG
│   ├── wr-logo-full@4096.png     ← High-res raster
│   ├── wr-logo-mobile-mechanic.ai
│   ├── wr-logo-mobile-mechanic.eps
│   ├── wr-logo-mobile-mechanic.pdf
│   ├── wr-logo-mobile-mechanic.svg
│   └── wr-logo-mobile-mechanic@4096.png
└── simon/
    ├── simon-a.jpg                ← Primary face ref
    ├── simon-b.jpg                ← Secondary face ref
    └── simon-c.jpg                ← Third face ref
```

---

## 8. Do Not

- Do not use green/teal in the logo — logo is blue (#4AA3E8) and white only
- Do not let AI generate logo text on shirts — always composite in post
- Do not use stock photography — all imagery is AI-generated with Simon's face
- Do not add unverified claims (surcharges, travel distances, response times, inspection pricing)
- Do not use sedans or compact cars — always SUVs and pickups for the Spokane market
- Do not add new fonts beyond Space Grotesk and Inter
