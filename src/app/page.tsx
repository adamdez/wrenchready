import { StructuredData } from "@/components/structured-data";
import { HomePage } from "@/components/home-page";
import { homeFaqs, reviews, services, siteConfig } from "@/data/site";
import { absoluteUrl, buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Mobile Mechanic in Spokane, WA",
  description:
    "Wrench Ready Mobile delivers promise-keeping mobile service for no-start, brake, diagnostic, and inspection work across Spokane County, with routine maintenance only when it fits the route.",
  path: "/",
  keywords: [
    "mobile mechanic Spokane WA",
    "mobile battery replacement Spokane",
    "mobile brake repair Spokane",
    "check engine light diagnostic Spokane",
    "pre purchase inspection Spokane",
  ],
});

const businessStructuredData = {
  "@context": "https://schema.org",
  "@type": "AutomotiveBusiness",
  name: siteConfig.name,
  url: siteConfig.domain,
  description: siteConfig.description,
  email: siteConfig.contact.email,
  telephone: siteConfig.contact.phoneDisplay,
  priceRange: "$$",
  image: absoluteUrl("/opengraph-image"),
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
  areaServed: siteConfig.areaServed.map((city) => ({
    "@type": "City",
    name: city,
    containedInPlace: {
      "@type": "State",
      name: siteConfig.state,
    },
  })),
  availableService: services.map((service) => ({
    "@type": "Service",
    name: service.name,
    url: absoluteUrl(`/services/${service.slug}`),
    description: service.teaser,
    offers: {
      "@type": "Offer",
      priceCurrency: "USD",
      price: service.priceFrom.replace(/[^0-9]/g, ""),
      priceSpecification: {
        "@type": "UnitPriceSpecification",
        priceCurrency: "USD",
        price: service.priceFrom.replace(/[^0-9]/g, ""),
        unitText: "starting price",
      },
    },
  })),
  ...(reviews.length > 0
    ? {
        aggregateRating: {
          "@type": "AggregateRating",
          ratingValue: "5.0",
          reviewCount: String(reviews.length),
          bestRating: "5",
          worstRating: "1",
        },
        review: reviews.map((r) => ({
          "@type": "Review",
          reviewRating: {
            "@type": "Rating",
            ratingValue: String(r.rating),
            bestRating: "5",
          },
          author: { "@type": "Person", name: r.name },
          reviewBody: r.text,
        })),
      }
    : {}),
};

const faqStructuredData = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: homeFaqs.map((faq) => ({
    "@type": "Question",
    name: faq.question,
    acceptedAnswer: {
      "@type": "Answer",
      text: faq.answer,
    },
  })),
};

export default function Home() {
  return (
    <>
      <StructuredData data={[businessStructuredData, faqStructuredData]} />
      <HomePage />
    </>
  );
}
