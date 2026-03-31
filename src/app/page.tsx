import { CtaBand, FaqList, LinkButton, PageHero, SectionHeading } from "@/components/marketing";
import { StructuredData } from "@/components/structured-data";
import {
  homeFaqs,
  locations,
  processSteps,
  scopeGuardrails,
  services,
  siteConfig,
  trustPoints,
} from "@/data/site";
import { absoluteUrl, buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Mobile Mechanic in Spokane, WA",
  description:
    "Wrench Ready Mobile brings oil changes, brake service, battery replacement, diagnostics, and pre-purchase inspections to homes and workplaces across Spokane County.",
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
          eyebrow="Spokane Launch Site"
          title="Mobile mechanic service built for busy Spokane drivers."
          copy="Wrench Ready Mobile is built around high-trust maintenance and light repair at your driveway, curb, or workplace. Oil changes, brakes, batteries, diagnostics, and inspections happen where your vehicle already is."
          primaryLink={{ href: "/contact", label: "Schedule your appointment" }}
          secondaryLink={{ href: "/services", label: "See services" }}
          panelTitle="Built to earn the next visit"
          panelItems={[
            "Driveway-safe maintenance and light repair only",
            "Photo-backed inspections and clear written findings",
            "Weeknight and Saturday scheduling by request",
            "Tight route planning to protect arrival windows",
          ]}
          highlights={[
            "Mobile mechanic Spokane",
            "Oil changes at home or work",
            "Brake and battery service",
            "Diagnostic appointments with clear next steps",
          ]}
        />

        <section className="shell -mt-6">
          <div className="grid gap-4 md:grid-cols-4">
            {trustPoints.map((point) => (
              <article
                key={point.title}
                className="panel rounded-[2rem] p-6 transition-transform duration-200 hover:-translate-y-1"
              >
                <p className="eyebrow">{point.kicker}</p>
                <h2 className="mt-3 text-2xl">{point.title}</h2>
                <p className="mt-3 text-base leading-7 text-[var(--muted)]">
                  {point.copy}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="shell section-space">
          <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="space-y-6">
              <SectionHeading
                eyebrow="Why This Model Works"
                title="A better fit for routine work than a shop drop-off."
                copy="This business is designed around the work people actually search for most: routine maintenance, common light repair, warning-light diagnostics, and pre-purchase inspections. It is not trying to be everything for everyone."
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="panel rounded-[2rem] p-6">
                  <h3 className="text-2xl">What customers get</h3>
                  <ul className="mt-4 space-y-3 text-[var(--muted)]">
                    <li>No tow bill for a battery, brake, or no-start visit.</li>
                    <li>No waiting room for an oil change or inspection.</li>
                    <li>Written priorities instead of a pressure-heavy upsell.</li>
                    <li>A service record that is easier to trust and revisit.</li>
                  </ul>
                </div>
                <div className="panel rounded-[2rem] p-6">
                  <h3 className="text-2xl">What stays outside scope</h3>
                  <ul className="mt-4 space-y-3 text-[var(--muted)]">
                    {scopeGuardrails.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            <div className="panel grid-lines rounded-[2.5rem] p-8">
              <p className="eyebrow">Popular Search Intent</p>
              <h2 className="mt-3 text-4xl">Built for the jobs people actually Google.</h2>
              <div className="mt-8 flex flex-wrap gap-3">
                {[
                  "mobile oil change Spokane",
                  "mobile brake repair Spokane",
                  "battery replacement at home",
                  "check engine light diagnostic Spokane",
                  "pre purchase inspection Spokane",
                  "mobile mechanic Spokane Valley",
                ].map((term) => (
                  <span key={term} className="chip">
                    {term}
                  </span>
                ))}
              </div>
              <p className="mt-8 text-base leading-7 text-[var(--muted)]">
                Every page on this site is meant to support a real service lane, a real
                service area, and a clear next action. That is how organic search and
                Google Ads stay aligned.
              </p>
            </div>
          </div>
        </section>

        <section className="shell section-space">
          <SectionHeading
            eyebrow="Core Services"
            title="Launch with the service lines that move fastest."
            copy="These pages are structured to work as both SEO targets and future ad landing pages. Each one answers what the service covers, who it helps, and what the next step looks like."
          />
          <div className="mt-10 grid gap-5 lg:grid-cols-2">
            {services.map((service) => (
              <article
                key={service.slug}
                className="panel rounded-[2rem] p-7 transition-transform duration-200 hover:-translate-y-1"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="eyebrow">{service.priceFrom}</p>
                  <span className="chip">{service.duration}</span>
                </div>
                <h2 className="mt-4 text-3xl">{service.name}</h2>
                <p className="mt-4 text-base leading-7 text-[var(--muted)]">
                  {service.teaser}
                </p>
                <ul className="mt-6 space-y-3 text-sm uppercase tracking-[0.18em] text-[var(--accent-strong)]">
                  {service.idealFor.slice(0, 3).map((point) => (
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
            eyebrow="How Booking Works"
            title="A tight process keeps routes cleaner and customers better informed."
            copy="The site sets expectations up front so the right jobs convert faster. That protects schedule reliability, technician time, and customer trust."
          />
          <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {processSteps.map((step, index) => (
              <article key={step.title} className="panel rounded-[2rem] p-6">
                <div className="text-sm font-bold uppercase tracking-[0.3em] text-[var(--accent-strong)]">
                  Step {index + 1}
                </div>
                <h3 className="mt-4 text-2xl">{step.title}</h3>
                <p className="mt-3 text-base leading-7 text-[var(--muted)]">
                  {step.copy}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="shell section-space">
          <SectionHeading
            eyebrow="Service Area"
            title="Focused coverage beats vague citywide promises."
            copy="The first version of the business is built around dense, repeatable routes in Spokane County. These pages let us expand organically without sacrificing arrival quality."
          />
          <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {locations.map((location) => (
              <article key={location.slug} className="panel rounded-[2rem] p-6">
                <p className="eyebrow">Location Page</p>
                <h2 className="mt-3 text-3xl">{location.name}</h2>
                <p className="mt-3 text-base leading-7 text-[var(--muted)]">
                  {location.teaser}
                </p>
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
            title="FAQ content that helps the lead qualify itself."
            copy="These answers are written to reduce bounced traffic, improve trust, and give search engines clearer context about what Wrench Ready actually does."
          />
          <div className="mt-10">
            <FaqList faqs={homeFaqs} />
          </div>
        </section>

        <section className="shell">
          <div className="panel rounded-[2.5rem] p-8 sm:p-10">
            <div className="grid gap-8 lg:grid-cols-[1fr_1fr] lg:items-end">
              <div>
                <p className="eyebrow">Launch Message</p>
                <h2 className="mt-3 text-4xl">A website that can grow into the operating system.</h2>
              </div>
              <p className="text-base leading-7 text-[var(--muted)]">
                The public message is simple: convenient, honest mobile service. Under the
                hood, the site structure already supports service pages, city pages, future
                review proof, and tighter Google Ads landing pages as the business scales.
              </p>
            </div>
          </div>
        </section>

        <CtaBand
          title="Schedule your appointment now."
          copy="Tell us the vehicle, the symptom or service, and where the car is parked. That gives us enough to screen the job and point you to the right next step."
        />
      </div>
    </>
  );
}
