import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { CtaBand, FaqList, LinkButton, SectionHeading } from "@/components/marketing";
import { StructuredData } from "@/components/structured-data";
import { ServicePageClient } from "@/components/service-page-client";
import { getLocationBySlug, getServiceBySlug, locations, services, siteConfig } from "@/data/site";
import { absoluteUrl, buildMetadata } from "@/lib/seo";

type ServicePageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export const dynamicParams = false;

export function generateStaticParams() {
  return services.map((service) => ({
    slug: service.slug,
  }));
}

export async function generateMetadata({
  params,
}: ServicePageProps): Promise<Metadata> {
  const { slug } = await params;
  const service = getServiceBySlug(slug);

  if (!service) {
    return buildMetadata({
      title: "Service Not Found",
      description: siteConfig.description,
      path: "/services",
    });
  }

  return buildMetadata({
    title: service.seoTitle,
    description: service.metaDescription,
    path: `/services/${service.slug}`,
    keywords: service.keywords,
  });
}

export default async function ServicePage({ params }: ServicePageProps) {
  const { slug } = await params;
  const service = getServiceBySlug(slug);

  if (!service) {
    notFound();
  }

  const relevantLocations = service.locationSlugs
    .map((locationSlug) => getLocationBySlug(locationSlug))
    .filter((location) => location !== undefined);

  const neighborhoodLocations = locations.filter(
    (loc) => loc.parentSlug && loc.serviceSlugs.includes(service.slug),
  );

  const relatedServices = services.filter((s) => s.slug !== service.slug);

  const serviceStructuredData = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: service.name,
    serviceType: service.name,
    description: service.metaDescription,
    url: absoluteUrl(`/services/${service.slug}`),
    provider: {
      "@type": "AutomotiveBusiness",
      name: siteConfig.name,
      url: siteConfig.domain,
      telephone: siteConfig.contact.phoneDisplay,
      priceRange: "$$",
      geo: {
        "@type": "GeoCoordinates",
        latitude: 47.6588,
        longitude: -117.426,
      },
      address: {
        "@type": "PostalAddress",
        addressLocality: siteConfig.city,
        addressRegion: siteConfig.stateCode,
        addressCountry: "US",
      },
    },
    areaServed: relevantLocations.map((location) => ({
      "@type": "City",
      name: location.name,
      containedInPlace: {
        "@type": "State",
        name: siteConfig.state,
      },
    })),
    offers: {
      "@type": "Offer",
      priceCurrency: "USD",
      price: service.priceFrom.replace(/[^0-9]/g, ""),
      availability: "https://schema.org/InStock",
    },
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
        name: "Services",
        item: absoluteUrl("/services"),
      },
      {
        "@type": "ListItem",
        position: 3,
        name: service.name,
        item: absoluteUrl(`/services/${service.slug}`),
      },
    ],
  };

  const faqStructuredData = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: service.faqs.map((faq) => ({
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
      <StructuredData data={[serviceStructuredData, breadcrumbData, faqStructuredData]} />
      <ServicePageClient
        service={service}
        relevantLocations={relevantLocations}
        neighborhoodLocations={neighborhoodLocations}
        relatedServices={relatedServices}
      />
    </>
  );
}
