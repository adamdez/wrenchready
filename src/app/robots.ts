import type { MetadataRoute } from "next";
import { siteConfig } from "@/data/site";

export default function robots(): MetadataRoute.Robots {
  const publicDisallow = ["/api/", "/ops/", "/ops-slate/", "/status/"];

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: publicDisallow,
      },
      {
        userAgent: "OAI-SearchBot",
        allow: "/",
        disallow: publicDisallow,
      },
      {
        userAgent: "GPTBot",
        allow: "/",
        disallow: publicDisallow,
      },
      {
        userAgent: "ClaudeBot",
        allow: "/",
        disallow: publicDisallow,
      },
      {
        userAgent: "Claude-SearchBot",
        allow: "/",
        disallow: publicDisallow,
      },
      {
        userAgent: "PerplexityBot",
        allow: "/",
        disallow: publicDisallow,
      },
      {
        userAgent: "Google-Extended",
        allow: "/",
        disallow: publicDisallow,
      },
    ],
    sitemap: `${siteConfig.domain}/sitemap.xml`,
    host: siteConfig.domain,
  };
}
