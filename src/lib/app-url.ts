import { readEnv } from "@/lib/env";
import { siteConfig } from "@/data/site";

function normalizeUrl(value?: string) {
  if (!value) return undefined;
  const normalized = value.trim().replace(/\/+$/, "");
  if (!normalized) return undefined;
  if (/^https?:\/\//i.test(normalized)) return normalized;
  return `https://${normalized}`;
}

export function getAppBaseUrl() {
  return (
    normalizeUrl(
      readEnv(
        "NEXT_PUBLIC_APP_URL",
        "APP_URL",
        "NEXT_PUBLIC_SITE_URL",
        "SITE_URL",
        "VERCEL_PROJECT_PRODUCTION_URL",
        "VERCEL_URL",
      ),
    ) || normalizeUrl(siteConfig.domain)!
  );
}

