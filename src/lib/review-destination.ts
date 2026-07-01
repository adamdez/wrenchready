import { siteConfig } from "@/data/site";
import { readEnv } from "@/lib/env";

export const WRENCHREADY_GOOGLE_PLACE_ID = "ChIJJXNOpDKhHakRfRqScTK6MVk";

export const WRENCHREADY_GOOGLE_WRITE_REVIEW_URL =
  "https://www.google.com/maps/place//data=!4m3!3m2!1s0xa91da132a44e7325:0x5931ba3271921a7d!12e1?g_mp=CiVnb29nbGUubWFwcy5wbGFjZXMudjEuUGxhY2VzLkdldFBsYWNlEAIYBCAA";

const LEGACY_GOOGLE_REVIEW_MARKERS = [
  "#lrd=0xa91da132a44e7325:0x5931ba3271921a7d",
  "kgmid=/g/11nblfp_kv",
  "ludocid=6427122869050940029",
];

function resolveGoogleReviewUrl(candidate?: string) {
  if (!candidate) {
    return WRENCHREADY_GOOGLE_WRITE_REVIEW_URL;
  }

  const trimmed = candidate.trim();

  if (!trimmed) {
    return WRENCHREADY_GOOGLE_WRITE_REVIEW_URL;
  }

  const isLegacyDesktopReviewUrl = LEGACY_GOOGLE_REVIEW_MARKERS.some((marker) =>
    trimmed.includes(marker),
  );

  return isLegacyDesktopReviewUrl ? WRENCHREADY_GOOGLE_WRITE_REVIEW_URL : trimmed;
}

export function getGoogleReviewUrl() {
  return resolveGoogleReviewUrl(
    readEnv(
      "WR_GOOGLE_REVIEW_URL",
      "NEXT_PUBLIC_WR_GOOGLE_REVIEW_URL",
      "GOOGLE_REVIEW_URL",
    ) || siteConfig.profiles.googleReview,
  );
}

export function getBrandedReviewUrl() {
  return (
    readEnv("WR_BRANDED_REVIEW_URL", "NEXT_PUBLIC_WR_BRANDED_REVIEW_URL") ||
    new URL("/review", siteConfig.domain).toString()
  );
}
