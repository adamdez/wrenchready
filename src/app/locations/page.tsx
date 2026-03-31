import { CtaBand, LinkButton, PageHero, SectionHeading } from "@/components/marketing";
import { locations } from "@/data/site";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Mobile Mechanic Service Areas in Spokane County",
  description:
    "See where Wrench Ready Mobile plans to serve drivers across Spokane County, including Spokane, Spokane Valley, Liberty Lake, and South Hill.",
  path: "/locations",
  keywords: [
    "mobile mechanic Spokane Valley",
    "mobile mechanic Liberty Lake",
    "mobile mechanic South Hill Spokane",
    "Spokane mobile auto repair",
  ],
});

export default function LocationsPage() {
  return (
    <div className="pb-16">
      <PageHero
        eyebrow="Location Pages"
        title="Route density matters as much as rankings."
        copy="Wrench Ready Mobile is being built around a focused Spokane County footprint. These pages help match local search intent with the neighborhoods and commutes the business can actually support well."
        primaryLink={{ href: "/contact", label: "Schedule your appointment" }}
        secondaryLink={{ href: "/services", label: "Browse services" }}
        panelTitle="Why focused pages win"
        panelItems={[
          "Cleaner arrival windows and tighter scheduling",
          "More relevant content for local search intent",
          "Better future ad targeting by city or corridor",
          "More honest expectations about service coverage",
        ]}
      />

      <section className="shell section-space">
        <SectionHeading
          eyebrow="Coverage"
          title="Service areas built around realistic early routes."
          copy="Rather than promising the entire Inland Northwest on day one, the site starts with the locations most likely to produce tight routes, repeat work, and strong review velocity."
        />
        <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {locations.map((location) => (
            <article key={location.slug} className="panel rounded-[2rem] p-6">
              <p className="eyebrow">{location.name}</p>
              <h2 className="mt-3 text-3xl">{location.headline}</h2>
              <p className="mt-4 text-base leading-7 text-[var(--muted)]">
                {location.teaser}
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                {location.neighborhoods.slice(0, 4).map((neighborhood) => (
                  <span key={neighborhood} className="chip">
                    {neighborhood}
                  </span>
                ))}
              </div>
              <div className="mt-8">
                <LinkButton href={`/locations/${location.slug}`}>
                  Open page
                </LinkButton>
              </div>
            </article>
          ))}
        </div>
      </section>

      <CtaBand
        title="Outside these routes?"
        copy="Still send the appointment request. Route planning comes first, but higher-value repairs and grouped appointments can justify a wider trip."
      />
    </div>
  );
}
