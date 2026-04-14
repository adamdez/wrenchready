import { readEnv } from "@/lib/env";

export function getGoogleReviewUrl() {
  return readEnv(
    "WR_GOOGLE_REVIEW_URL",
    "NEXT_PUBLIC_WR_GOOGLE_REVIEW_URL",
    "GOOGLE_REVIEW_URL",
  );
}

