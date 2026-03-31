import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { CtaBand, FaqList, LinkButton, SectionHeading } from "@/components/marketing";
import { StructuredData } from "@/components/structured-data";
import { LocationPageClient } from "@/components/location-page-client";
import {
  getLocationBySlug,
  getServiceBySlug,
  locations,
  siteConfig,
} from "@/data/site";
import { absoluteUrl, buildMetadata } from "@/lib/seo";

type LocationPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export const dynamicParams = false;

export function generateStaticParams() {
  return locations.map((location) => ({
    slug: location.slug,
  }));
}

export async function generateMetadata({
  params,
}: LocationPageProps): Promise<Metadata> {
  const { slug } = await params;
  const location = getLocationBySlug(slug);

  if (!location) {
    return buildMetadata({
      title: "Location Not Found",
      description: siteConfig.description,
      path: "/locations",
    });
  }

  return buildMetadata({
    title: location.seoTitle,
    description: location.metaDescription,
    path: `/locations/${location.slug}`,
    keywords: location.keywords,
  });
}

export default async function LocationPage({ params }: LocationPageProps) {
  const { slug } = await params;
  const location = getLocationBySlug(slug);

  if (!location) {
    notFound();
  }

  const featuredServices = location.serviceSlugs
    .map((serviceSlug) => getServiceBySlug(serviceSlug))
    .filter((service) => service !== undefined);

  const parentLocation = location.parentSlug
    ? getLocationBySlug(location.parentSlug)
    : undefined;

  const childNeighborhoods = locations.filter(
    (l) => l.parentSlug === location.slug,
  );

  const siblingNeighborhoods = location.parentSlug
    ? locations.filter(
        (l) => l.parentSlug === location.parentSlug && l.slug !== location.slug,
      )
    : [];

  const locationStructuredData = {
    "@context": "https://schema.org",
    "@type": "AutomotiveBusiness",
    name: `${siteConfig.name} — ${location.name}`,
    url: absoluteUrl(`/locations/${location.slug}`),
    description: location.metaDescription,
    telephone: siteConfig.contact.phoneDisplay,
    email: siteConfig.contact.email,
    priceRange: "$$",
    address: {
      "@type": "PostalAddress",
      addressLocality: location.name,
      addressRegion: siteConfig.stateCode,
      addressCountry: "US",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: location.geo?.lat ?? 47.6588,
      longitude: location.geo?.lng ?? -117.426,
    },
    areaServed: {
      "@type": "City",
      name: location.name,
      containedInPlace: {
        "@type": "State",
        name: siteConfig.state,
      },
    },
    availableService: featuredServices.map((s) => ({
      "@type": "Service",
      name: s.name,
      url: absoluteUrl(`/services/${s.slug}`),
    })),
  };

  const breadcrumbData = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: siteConfig.domain,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Service Areas",
        item: absoluteUrl("/locations"),
      },
      {
        "@type": "ListItem",
        position: 3,
        name: location.name,
        item: absoluteUrl(`/locations/${location.slug}`),
      },
    ],
  };

  const faqStructuredData = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: location.faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };

  return (
    <>
      <StructuredData data={[locationStructuredData, breadcrumbData, faqStructuredData]} />
      <LocationPageClient
        location={location}
        featuredServices={featuredServices}
        parentLocation={parentLocation}
        childNeighborhoods={childNeighborhoods}
        siblingNeighborhoods={siblingNeighborhoods}
      />
    </>
  );
}
