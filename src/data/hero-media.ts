/**
 * Drop-in paths for hero and brand imagery.
 * Replace files in /public — no code changes required once assets exist.
 * Optional filenames (wordmark, Simon cutout): see docs/brand-assets.md.
 */

/** Poster / still fallback for the hero (LCP image). */
export const HERO_POSTER_SRC = "/hero-main.png";

/**
 * Short looping background video (H.264 MP4). Optional: if missing or on error,
 * the poster image is shown. Not loaded on small viewports or reduced motion.
 */
export const HERO_VIDEO_MP4_SRC = "/hero-loop.mp4";

/** True-transparent logo mark (PNG/WebP with alpha). Used in header, footer, hero. */
export const BRAND_LOGO_MARK_SRC = "/wr-logo.png";
