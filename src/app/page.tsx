import { StructuredData } from "@/components/structured-data";
import { HomePage } from "@/components/home-page";
import { homeFaqs, services, siteConfig } from "@/data/site";
import { getPublicProofSnapshot } from "@/lib/promise-crm/server";
import { absoluteUrl, buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Mobile Mechanic in Spokane, WA — Batteries, Brakes & Diagnostics | WrenchReady",
  description:
    "WrenchReady is a mobile mechanic in Spokane, WA. We come to your driveway or workplace for batteries, brakes, diagnostics, and inspections — clear quotes and approval before added work.",
  path: "/",
  keywords: [
    "mobile mechanic Spokane WA",
    "mobile car repair Spokane",
    "mobile battery replacement Spokane",
    "mobile brake repair Spokane",
    "check engine light diagnostic Spokane",
    "pre purchase inspection Spokane",
    "no start mobile mechanic Spokane",
    "mobile auto repair Spokane Valley",
  ],
});

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

export default async function Home() {
  const publicProof = await getPublicProofSnapshot();
  const publicReviews = publicProof.stories.map((story) => ({
    name: story.customerLabel,
    text: story.quote,
  }));

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
    ...(publicReviews.length > 0
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: "5.0",
            reviewCount: String(publicReviews.length),
            bestRating: "5",
            worstRating: "1",
          },
          review: publicReviews.map((review) => ({
            "@type": "Review",
            reviewRating: {
              "@type": "Rating",
              ratingValue: "5",
              bestRating: "5",
            },
            author: { "@type": "Person", name: review.name },
            reviewBody: review.text,
          })),
        }
      : {}),
  };

  return (
    <>
      <StructuredData data={[businessStructuredData, faqStructuredData]} />
      <HomePage publicProofStories={publicProof.stories} />
    </>
  );
}
