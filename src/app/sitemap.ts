import type { MetadataRoute } from "next";
import { locations, services } from "@/data/site";
import { absoluteUrl } from "@/lib/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const staticRoutes = ["/", "/services", "/locations", "/contact"].map((path) => ({
    url: absoluteUrl(path),
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: path === "/" ? 1 : 0.8,
  }));

  const serviceRoutes = services.map((service) => ({
    url: absoluteUrl(`/services/${service.slug}`),
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: 0.76,
  }));

  const locationRoutes = locations.map((location) => ({
    url: absoluteUrl(`/locations/${location.slug}`),
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: 0.74,
  }));

  return [...staticRoutes, ...serviceRoutes, ...locationRoutes];
}
