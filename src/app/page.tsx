import { CtaBand, FaqList, LinkButton, PageHero, SectionHeading } from "@/components/marketing";
import { StructuredData } from "@/components/structured-data";
import {
  customerBenefits,
  homeFaqs,
  locations,
  operatingPrinciples,
  processSteps,
  proofStatements,
  scopeGuardrails,
  serviceLaneHighlights,
  services,
  siteConfig,
  trustPoints,
} from "@/data/site";
import { absoluteUrl, buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Mobile Mechanic in Spokane, WA",
  description:
    "Wrench Ready Mobile delivers high-trust maintenance, brake service, battery replacement, diagnostics, and pre-purchase inspections across Spokane County without the shop drop-off.",
  path: "/",
  keywords: [
    "mobile mechanic Spokane WA",
    "mobile oil change Spokane",
    "mobile brake repair Spokane",
    "battery replacement at home Spokane",
    "check engine light diagnostic Spokane",
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
  })),
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
      <div className="pb-16">
        <PageHero
          eyebrow="Spokane Launch Market"
          title="Mobile auto service that feels sharper, faster, and easier than a shop drop-off."
          copy="Wrench Ready Mobile is built around high-trust maintenance and light repair at your driveway, curb, or workplace. Oil changes, brakes, batteries, diagnostics, and inspections happen where your vehicle already is, with clearer communication and a cleaner next step."
          primaryLink={{ href: "/contact", label: "Schedule your appointment" }}
          secondaryLink={{ href: "/services", label: "See service lanes" }}
          panelTitle="Built to earn the next visit"
          panelItems={[
            "Driveway-safe maintenance and light repair only",
            "Photo-backed findings and plain-language recommendations",
            "Weeknight and Saturday scheduling by request",
            "Route discipline that protects arrival windows",
          ]}
          highlights={[
            "Mobile mechanic Spokane",
            "Oil changes at home or work",
            "Brake and battery service",
            "Diagnostic visits with clear next steps",
          ]}
        />

        <section className="shell -mt-2">
          <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
            <article className="panel rounded-[1.8rem] p-6 sm:p-8">
              <p className="eyebrow">What This Business Actually Is</p>
              <h2 className="mt-3 text-3xl sm:text-4xl">
                A disciplined mobile service model, not a vague “we do everything” mechanic.
              </h2>
              <div className="mt-6 grid gap-4 md:grid-cols-3">
                {proofStatements.map((statement) => (
                  <div key={statement} className="panel-soft rounded-[1.4rem] p-4">
                    <p className="text-base leading-7 text-muted">{statement}</p>
                  </div>
                ))}
              </div>
            </article>

            <article className="panel rounded-[1.8rem] p-6 sm:p-8">
              <p className="eyebrow">Fastest Path To Book</p>
              <h2 className="mt-3 text-3xl">Call, text, or send the vehicle details once.</h2>
              <p className="mt-4 text-base leading-7 text-muted">
                The goal is not to make you hunt for information. The fastest path is one
                clean message with the vehicle, the symptom or service, the address, and
                the time window you want.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <LinkButton href={siteConfig.contact.phoneHref}>
                  Call / Text {siteConfig.contact.phoneDisplay}
                </LinkButton>
                <LinkButton href="/contact" variant="secondary">
                  Open the request form
                </LinkButton>
              </div>
            </article>
          </div>
        </section>

        <section className="shell section-space">
          <SectionHeading
            eyebrow="Operating Doctrine"
            title="The public experience should reflect the internal operating system."
            copy="The planning documents were clear about the core identity of the business: earn the next visit, protect wrench time, and stay inside the service lanes that mobile can do exceptionally well."
          />
          <div className="mt-10 grid gap-5 lg:grid-cols-3">
            {operatingPrinciples.map((principle) => (
              <article key={principle.title} className="panel rounded-[1.8rem] p-6">
                <p className="eyebrow">{principle.kicker}</p>
                <h2 className="mt-3 text-3xl">{principle.title}</h2>
                <p className="mt-4 text-base leading-7 text-muted">{principle.copy}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="shell section-space">
          <div className="grid gap-10 lg:grid-cols-[0.98fr_1.02fr]">
            <div className="space-y-6">
              <SectionHeading
                eyebrow="Why Customers Switch"
                title="The value is not only the repair. It is the friction you eliminate."
                copy="The market gap in Spokane is not just about price. It is about time, convenience, communication, and the confidence that the mechanic is working inside a focused, disciplined scope."
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="panel rounded-[1.8rem] p-6">
                  <h3 className="text-2xl">What customers get</h3>
                  <ul className="list-checks mt-5 space-y-4 text-base leading-7 text-muted">
                    {customerBenefits.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
                <div className="panel rounded-[1.8rem] p-6">
                  <h3 className="text-2xl">What stays outside scope</h3>
                  <ul className="list-bars mt-5 space-y-4 text-base leading-7 text-muted">
                    {scopeGuardrails.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            <div className="panel rounded-[1.8rem] p-6 sm:p-8">
              <p className="eyebrow">Core Service Lanes</p>
              <h2 className="mt-3 text-4xl">
                The launch lanes are built around the jobs people actually search for.
              </h2>
              <ul className="list-checks mt-8 space-y-5 text-base leading-7 text-muted">
                {serviceLaneHighlights.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <div className="mt-8 flex flex-wrap gap-3">
                {[
                  "mobile oil change Spokane",
                  "mobile brake repair Spokane",
                  "battery replacement at home Spokane",
                  "check engine diagnostic Spokane",
                  "pre purchase inspection Spokane",
                ].map((term) => (
                  <span key={term} className="chip chip-accent">
                    {term}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="shell section-space">
          <div className="flex items-end justify-between gap-6">
            <SectionHeading
              eyebrow="Trust And Conversion"
              title="A stronger first impression, with faster paths into real bookings."
              copy="These cards are intentionally tighter than the first version. They get to the point faster, read better on mobile, and create cleaner options for future ad traffic."
            />
          </div>
          <div className="mt-10 grid gap-5 lg:grid-cols-2">
            {services.map((service) => (
              <article key={service.slug} className="panel rounded-[1.9rem] p-7">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="eyebrow">{service.priceFrom}</p>
                  <span className="chip">{service.duration}</span>
                </div>
                <h2 className="mt-4 text-3xl">{service.name}</h2>
                <p className="mt-4 text-base leading-7 text-muted">{service.teaser}</p>
                <ul className="list-checks mt-6 space-y-3 text-base leading-7 text-muted">
                  {service.idealFor.slice(0, 2).map((point) => (
                    <li key={point}>{point}</li>
                  ))}
                </ul>
                <div className="mt-8 flex flex-wrap gap-3">
                  <LinkButton href={`/services/${service.slug}`}>Learn more</LinkButton>
                  <LinkButton href="/contact" variant="secondary">
                    Schedule now
                  </LinkButton>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="shell section-space">
          <SectionHeading
            eyebrow="What Builds Trust"
            title="The site should feel organized, honest, and route-aware."
            copy="These are the value signals that make mobile service feel premium instead of improvised."
          />
          <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {trustPoints.map((point) => (
              <article key={point.title} className="panel rounded-[1.8rem] p-6">
                <p className="eyebrow">{point.kicker}</p>
                <h2 className="mt-3 text-2xl">{point.title}</h2>
                <p className="mt-4 text-base leading-7 text-muted">{point.copy}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="shell section-space">
          <SectionHeading
            eyebrow="How Booking Works"
            title="A cleaner process protects schedule reliability and closes better leads faster."
            copy="The right request contains enough detail to qualify fit without a long back-and-forth. That protects the customer experience and the technician's time."
          />
          <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {processSteps.map((step, index) => (
              <article key={step.title} className="panel rounded-[1.8rem] p-6">
                <div className="text-sm font-bold uppercase tracking-[0.3em] text-[var(--accent-strong)]">
                  Step {index + 1}
                </div>
                <h3 className="mt-4 text-2xl">{step.title}</h3>
                <p className="mt-3 text-base leading-7 text-muted">{step.copy}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="shell section-space">
          <SectionHeading
            eyebrow="Service Areas"
            title="Focused route density beats vague county-wide claims."
            copy="These location pages support local search now and create cleaner future ad paths later. They also signal that scheduling and arrival windows are being handled intentionally."
          />
          <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {locations.map((location) => (
              <article key={location.slug} className="panel rounded-[1.8rem] p-6">
                <p className="eyebrow">{location.name}</p>
                <h2 className="mt-3 text-3xl">Local route coverage</h2>
                <p className="mt-3 text-base leading-7 text-muted">{location.teaser}</p>
                <div className="mt-5 flex flex-wrap gap-2">
                  {location.neighborhoods.slice(0, 3).map((neighborhood) => (
                    <span key={neighborhood} className="chip">
                      {neighborhood}
                    </span>
                  ))}
                </div>
                <div className="mt-8">
                  <LinkButton href={`/locations/${location.slug}`}>
                    Explore {location.name}
                  </LinkButton>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="shell section-space">
          <SectionHeading
            eyebrow="Questions Customers Ask First"
            title="FAQ content that qualifies traffic instead of wasting it."
            copy="These answers are written to reduce bounce, support trust, and give search engines better topical depth around what Wrench Ready actually does."
          />
          <div className="mt-10">
            <FaqList faqs={homeFaqs} />
          </div>
        </section>

        <CtaBand
          title="Schedule your appointment now."
          copy="Send the vehicle, the service or symptom, where the car is parked, and your preferred time window. That is enough to screen most jobs and point you to the right next step fast."
        />
      </div>
    </>
  );
}
