import type { MetadataRoute } from "next";
import { locations, services } from "@/data/site";
import { absoluteUrl } from "@/lib/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const staticRoutes = ["/", "/services", "/locations", "/contact", "/tools/symptom-checker"].map((path) => ({
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

  const cityLocations = locations.filter((l) => !l.parentSlug);
  const neighborhoodLocations = locations.filter((l) => l.parentSlug);

  const cityRoutes = cityLocations.map((location) => ({
    url: absoluteUrl(`/locations/${location.slug}`),
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: 0.74,
  }));

  const neighborhoodRoutes = neighborhoodLocations.map((location) => ({
    url: absoluteUrl(`/locations/${location.slug}`),
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: 0.68,
  }));

  return [...staticRoutes, ...serviceRoutes, ...cityRoutes, ...neighborhoodRoutes];
}
