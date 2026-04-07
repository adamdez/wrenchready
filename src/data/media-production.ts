/**
 * Media production — swap these paths when final assets land from media_production.
 * Keep filenames stable or update this file once per asset drop.
 */
export const heroMedia = {
  /** Static fallback + video poster (keep ≥55% dark overlay in hero for legacy stock safety). */
  posterSrc: "/hero-main.png",
  /** Short loop; WebM first for efficiency. Replace with final Simon hero edit. */
  videoWebm: "/media/hero-simon-loop.webm",
  videoMp4: "/media/hero-simon-loop.mp4",
} as const;

/** Set true after adding `public/wr-logo-full-transparent.png` (or update path below). Until then, CSS wordmark avoids square matte logos. */
export const useTransparentLogoImage = false;

export const brandLogos = {
  transparentFull: "/wr-logo-full-transparent.png",
  transparentMark: "/wr-logo-transparent.png",
} as const;

/** Meet Simon / story section — replace with approved stills when ready. */
export const storyMedia = {
  simonPortrait: "/hero-mechanic.png",
  processStill: "/hero-process.png",
} as const;
