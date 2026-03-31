import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { CtaBand, FaqList, LinkButton, PageHero, SectionHeading } from "@/components/marketing";
import { StructuredData } from "@/components/structured-data";
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

  const locationStructuredData = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: location.seoTitle,
    url: absoluteUrl(`/locations/${location.slug}`),
    description: location.metaDescription,
    about: {
      "@type": "AutomotiveBusiness",
      name: siteConfig.name,
      areaServed: {
        "@type": "City",
        name: location.name,
      },
    },
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
      <StructuredData data={[locationStructuredData, faqStructuredData]} />
      <div className="pb-16">
        <PageHero
          eyebrow="Local Coverage"
          title={location.headline}
          copy={location.teaser}
          primaryLink={{ href: "/contact", label: `Schedule in ${location.name}` }}
          secondaryLink={{ href: "/locations", label: "Back to locations" }}
          panelTitle="What makes this area a fit"
          panelItems={location.routeHighlights}
          highlights={location.keywords.slice(0, 4)}
        />

        <section className="shell section-space">
          <div className="grid gap-8 lg:grid-cols-[1fr_1fr]">
            <article className="panel rounded-[2.5rem] p-8">
              <SectionHeading
                eyebrow="Neighborhood Coverage"
                title={`${location.name} routes start with the areas that are easiest to serve well.`}
                copy="The goal is not vague coverage. It is tighter density, stronger punctuality, and a better repeat-customer experience."
              />
              <div className="mt-8 flex flex-wrap gap-3">
                {location.neighborhoods.map((neighborhood) => (
                  <span key={neighborhood} className="chip">
                    {neighborhood}
                  </span>
                ))}
              </div>
            </article>

            <article className="panel rounded-[2.5rem] p-8">
              <SectionHeading
                eyebrow="Why Mobile Wins Here"
                title="The page is tuned to real local friction."
                copy="The copy below is meant to mirror the exact reasons this area searches for mobile service in the first place."
              />
              <ul className="mt-8 space-y-4 text-base leading-7 text-[var(--muted)]">
                {location.painPoints.map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>
            </article>
          </div>
        </section>

        <section className="shell section-space">
          <SectionHeading
            eyebrow="Featured Services"
            title={`${location.name} pages connected to the right service intent`}
            copy="This keeps the internal linking practical: city page to service page, service page back to city page. That is useful for both users and search engines."
          />
          <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {featuredServices.map((service) => (
              <article key={service.slug} className="panel rounded-[2rem] p-6">
                <p className="eyebrow">{service.priceFrom}</p>
                <h2 className="mt-3 text-3xl">{service.name}</h2>
                <p className="mt-3 text-base leading-7 text-[var(--muted)]">
                  {service.teaser}
                </p>
                <div className="mt-8 flex flex-wrap gap-3">
                  <LinkButton href={`/services/${service.slug}`}>Service page</LinkButton>
                  <LinkButton href="/contact" variant="secondary">
                    Schedule this service
                  </LinkButton>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="shell section-space">
          <SectionHeading
            eyebrow="FAQ"
            title={`Questions drivers in ${location.name} ask first`}
            copy="These answers handle the local objections that usually slow bookings down: apartment access, office parking, travel range, and response timing."
          />
          <div className="mt-10">
            <FaqList faqs={location.faqs} />
          </div>
        </section>

        <CtaBand
          title={`Need a mobile mechanic in ${location.name}?`}
          copy="Send the address, parking setup, vehicle details, and the service or symptom. That gives us enough to decide fit and route the job correctly."
        />
      </div>
    </>
  );
}
