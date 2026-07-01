import { siteConfig } from "@/data/site";
import { readEnv } from "@/lib/env";

export function getGoogleReviewUrl() {
  return (
    readEnv(
      "WR_GOOGLE_REVIEW_URL",
      "NEXT_PUBLIC_WR_GOOGLE_REVIEW_URL",
      "GOOGLE_REVIEW_URL",
    ) || siteConfig.profiles.googleReview
  );
}

export function getBrandedReviewUrl() {
  return (
    readEnv("WR_BRANDED_REVIEW_URL", "NEXT_PUBLIC_WR_BRANDED_REVIEW_URL") ||
    new URL("/review", siteConfig.domain).toString()
  );
}
