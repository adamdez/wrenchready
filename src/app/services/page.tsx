import { CtaBand, LinkButton, PageHero, SectionHeading } from "@/components/marketing";
import { services } from "@/data/site";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Mobile Auto Repair Services in Spokane",
  description:
    "Explore Wrench Ready Mobile service lines for Spokane drivers: oil changes, brake work, battery replacement, diagnostics, and pre-purchase inspections.",
  path: "/services",
  keywords: [
    "mobile auto repair Spokane",
    "mobile oil change Spokane",
    "mobile brake repair Spokane",
    "mobile battery replacement Spokane",
  ],
});

export default function ServicesPage() {
  return (
    <div className="pb-16">
      <PageHero
        eyebrow="Service Menu"
        title="Five service lanes built to rank, convert, and stay operationally tight."
        copy="Every page is designed around driveway-safe work with clear scope, clear pricing starting points, and clearer next actions. That keeps the site strong for organic search and future ad traffic."
        primaryLink={{ href: "/contact", label: "Schedule your appointment" }}
        secondaryLink={{ href: "/locations", label: "See service areas" }}
        panelTitle="Current launch focus"
        panelItems={[
          "Routine maintenance with photo-backed inspections",
          "Brake and battery jobs with strong urgency intent",
          "Diagnostics that lead to better repair decisions",
          "Inspections that build referral trust and repeat work",
        ]}
      />

      <section className="shell section-space">
        <SectionHeading
          eyebrow="Service Pages"
          title="A better landing page beats a generic homepage for high-intent traffic."
          copy="These cards link to the pages that matter most when somebody searches with urgency. They also give Google Ads a cleaner path later, because the headline, service promise, and CTA all match the search intent."
        />
        <div className="mt-10 grid gap-5 lg:grid-cols-2">
          {services.map((service) => (
            <article key={service.slug} className="panel rounded-[2rem] p-7">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="eyebrow">{service.priceFrom}</p>
                <span className="chip">{service.duration}</span>
              </div>
              <h2 className="mt-4 text-3xl">{service.name}</h2>
              <p className="mt-4 text-base leading-7 text-[var(--muted)]">
                {service.teaser}
              </p>
              <ul className="mt-6 space-y-3 text-[var(--muted)]">
                {service.includes.slice(0, 4).map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <div className="mt-8 flex flex-wrap gap-3">
                <LinkButton href={`/services/${service.slug}`}>Open page</LinkButton>
                <LinkButton href="/contact" variant="secondary">
                  Schedule this service
                </LinkButton>
              </div>
            </article>
          ))}
        </div>
      </section>

      <CtaBand
        title="Need help choosing the right service page?"
        copy="If the problem is a symptom and not a known repair, start with diagnostics. If you already know the job, jump into the service page and use it as the appointment brief."
      />
    </div>
  );
}
