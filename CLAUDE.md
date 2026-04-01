@AGENTS.md

# Wrench Ready Mobile — AI Operating Rules

Read MASTER-CLAUDE.md in the Sentinel AI folder first. That has standing orders for all sessions. This file covers Wrench Ready–specific rules.

---

## What This Project Is

wrenchreadymobile.com — a Next.js 16 site on Vercel for a mobile mechanic in Spokane WA. Launched March 30, 2026. Run by Simon (mechanic) and Dez (operations).

## Tech Stack
- Next.js 16.2.1, React 19, TypeScript
- Tailwind CSS 4 + PostCSS
- Framer Motion for animations
- Vercel deployment with auto-deploy on push to main
- Calendly widget for booking

## Content Rules

1. **No fake reviews or ratings.** The business just launched. When real reviews come in, they get added to the `reviews` array in `src/data/site.ts`. Until then, the empty-state message shows.

2. **All copy must sound human.** Read the current site.ts for the voice. Short sentences. Plain language. How Dez would explain it to a neighbor. Never: "leveraging," "seamless," "comprehensive," "tailored," "incredibly helpful."

3. **The hero image is a stock photo.** It has another company's branding ("MOBILE MECHANIC"). The component uses a 60% black overlay + gradient to obscure it. DO NOT reduce the overlay opacity below 55% or the competing branding shows through. Replace this image when real photos of Simon exist.

4. **Five service lanes only.** Oil change, brakes, battery, diagnostics, pre-purchase inspection. Do not add services without Dez's approval (Zone 3).

5. **Two governing principles drive everything:**
   - "Earn the Next Visit" — honesty over invoice size
   - "Protect Wrench Time" — Simon wrenches, Dez does everything else

## Key Files
- `src/data/site.ts` — All content: services, locations, reviews, FAQs, config
- `src/components/home-page.tsx` — Full homepage (~1020 lines)
- `src/components/marketing.tsx` — Reusable section components
- `public/` — Images, logos (wr-logo-full.png, wr-logo.png)
- `src/app/(ads)/lp/` — Google Ads landing pages (noindex)

## Deployment
Push to `main` → Vercel auto-deploys in ~60 seconds. No manual deploy steps needed.

## What Not to Do
- Don't install new dependencies without checking if an existing one covers it
- Don't create new pages without checking if a route already exists
- Don't touch the booking form backend (Calendly widget) — it works
- Don't reduce hero overlay below 55% opacity
- Don't add fake testimonials, made-up statistics, or unearned trust badges
