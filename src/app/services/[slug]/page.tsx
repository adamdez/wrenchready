import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { CtaBand, FaqList, LinkButton, PageHero, SectionHeading } from "@/components/marketing";
import { StructuredData } from "@/components/structured-data";
import { getLocationBySlug, getServiceBySlug, services, siteConfig } from "@/data/site";
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
    },
    areaServed: relevantLocations.map((location) => ({
      "@type": "City",
      name: location.name,
      containedInPlace: {
        "@type": "State",
        name: siteConfig.state,
      },
    })),
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
      <StructuredData data={[serviceStructuredData, faqStructuredData]} />
      <div className="pb-16">
        <PageHero
          eyebrow={service.priceFrom}
          title={service.headline}
          copy={service.teaser}
          primaryLink={{ href: "/contact", label: "Schedule your appointment" }}
          secondaryLink={{ href: "/services", label: "Back to services" }}
          panelTitle="Why this page matters"
          panelItems={service.whyItWins}
          highlights={service.keywords.slice(0, 4)}
        />

        <section className="shell section-space">
          <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="panel rounded-[2.5rem] p-8">
              <SectionHeading
                eyebrow="What Is Included"
                title={`What ${service.name.toLowerCase()} looks like with Wrench Ready`}
                copy="These are the details that help the customer understand what they are paying for and help search engines understand the real scope of the page."
              />
              <ul className="mt-8 space-y-4 text-base leading-7 text-[var(--muted)]">
                {service.includes.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>

            <div className="space-y-5">
              <article className="panel rounded-[2rem] p-7">
                <p className="eyebrow">Best Fit</p>
                <h2 className="mt-3 text-3xl">This service is ideal for</h2>
                <ul className="mt-6 space-y-4 text-base leading-7 text-[var(--muted)]">
                  {service.idealFor.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </article>
              <article className="panel rounded-[2rem] p-7">
                <p className="eyebrow">Trust Signals</p>
                <h2 className="mt-3 text-3xl">How the page earns the next visit</h2>
                <ul className="mt-6 space-y-4 text-base leading-7 text-[var(--muted)]">
                  {service.trustPoints.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </article>
            </div>
          </div>
        </section>

        <section className="shell section-space">
          <SectionHeading
            eyebrow="Service Areas"
            title={`${service.name} pages linked to the right local routes`}
            copy="These location links strengthen internal relevance and give future ads a cleaner way to split geographic intent without rebuilding the whole site."
          />
          <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {relevantLocations.map((location) => (
              <article key={location.slug} className="panel rounded-[2rem] p-6">
                <p className="eyebrow">{location.name}</p>
                <h2 className="mt-3 text-3xl">{service.name}</h2>
                <p className="mt-3 text-base leading-7 text-[var(--muted)]">
                  {location.teaser}
                </p>
                <div className="mt-8">
                  <LinkButton href={`/locations/${location.slug}`}>
                    Open {location.name}
                  </LinkButton>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="shell section-space">
          <SectionHeading
            eyebrow="FAQ"
            title={`Questions people ask before booking ${service.name.toLowerCase()}`}
            copy="The answers below qualify leads faster and give the page stronger topical depth for organic search."
          />
          <div className="mt-10">
            <FaqList faqs={service.faqs} />
          </div>
        </section>

        <section className="shell">
          <div className="panel rounded-[2.5rem] p-8 sm:p-10">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="eyebrow">Related Searches</p>
                <h2 className="mt-3 text-4xl">Built to serve urgent local intent.</h2>
              </div>
              <div className="flex flex-wrap gap-3">
                {service.keywords.map((term) => (
                  <span key={term} className="chip">
                    {term}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        <CtaBand
          title={`Need ${service.name.toLowerCase()} in Spokane?`}
          copy="Use the appointment page to send the vehicle, the address, and the symptom or known repair. That is enough to qualify the job and steer you to the right next step."
        />
      </div>
    </>
  );
}
