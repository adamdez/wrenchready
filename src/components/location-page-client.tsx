"use client";

import { CtaBand, FaqList, LinkButton, SectionHeading } from "@/components/marketing";
import { FadeIn, Stagger, StaggerItem } from "@/components/motion/fade-in";
import type { Location, Service } from "@/data/site";
import { MapPin, ArrowRight, Wrench, AlertCircle } from "lucide-react";
import Link from "next/link";

type LocationPageClientProps = {
  location: Location;
  featuredServices: Service[];
  parentLocation?: Location;
  childNeighborhoods: Location[];
  siblingNeighborhoods: Location[];
};

export function LocationPageClient({
  location,
  featuredServices,
  parentLocation,
  childNeighborhoods,
  siblingNeighborhoods,
}: LocationPageClientProps) {
  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
          <div className="absolute right-0 top-0 h-[500px] w-[500px] -translate-y-1/2 translate-x-1/3 rounded-full bg-primary/5 blur-3xl" />
        </div>
        <div className="shell pt-16 pb-20 sm:pt-24 sm:pb-28">
          <FadeIn>
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-primary">
                <MapPin className="h-3.5 w-3.5" />
                {location.name}
              </span>
              {parentLocation && (
                <Link
                  href={`/locations/${parentLocation.slug}`}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
                >
                  Part of {parentLocation.name}
                </Link>
              )}
            </div>
          </FadeIn>
          <FadeIn delay={0.1}>
            <h1 className="mt-6 max-w-3xl text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl">
              {location.headline}
            </h1>
          </FadeIn>
          <FadeIn delay={0.2}>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
              {location.teaser}
            </p>
          </FadeIn>
          <FadeIn delay={0.3}>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <LinkButton href="/contact">
                Schedule in {location.name}
                <ArrowRight className="h-4 w-4" />
              </LinkButton>
              <LinkButton href="/locations" variant="secondary">
                All Areas
              </LinkButton>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* Coverage + Pain Points */}
      <section className="shell section-space">
        <div className="grid gap-6 lg:grid-cols-2">
          <FadeIn>
            <div className="rounded-2xl border border-border bg-card/50 p-8">
              <p className="eyebrow">Neighborhoods</p>
              <h2 className="mt-3 text-2xl font-bold">
                These are the parts of {location.name} where mobile service usually makes sense.
              </h2>
              <div className="mt-6 flex flex-wrap gap-2">
                {location.neighborhoods.map((neighborhood) => (
                  <span
                    key={neighborhood}
                    className="rounded-full border border-border px-3 py-1.5 text-sm text-muted-foreground"
                  >
                    {neighborhood}
                  </span>
                ))}
              </div>
              <div className="mt-8">
                <p className="text-xs font-semibold uppercase tracking-widest text-primary">Good Fit For This Area</p>
                <ul className="mt-4 space-y-3">
                  {location.routeHighlights.map((highlight) => (
                    <li key={highlight} className="flex gap-3 text-sm leading-relaxed text-muted-foreground">
                      <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary/60" />
                      {highlight}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </FadeIn>

          <FadeIn delay={0.1}>
            <div className="rounded-2xl border border-border bg-card/50 p-8">
              <p className="eyebrow">Why People Book Mobile Here</p>
              <h2 className="mt-3 text-2xl font-bold">The local headaches this service solves.</h2>
              <ul className="mt-6 space-y-4">
                {location.painPoints.map((point) => (
                  <li key={point} className="flex gap-3 text-sm leading-relaxed text-muted-foreground">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary/60" />
                    {point}
                  </li>
                ))}
              </ul>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* Services */}
      <section className="border-y border-border bg-card/30">
        <div className="shell section-space">
          <SectionHeading
            eyebrow="Available Services"
            title={`What we offer in ${location.name}`}
            copy="These are the services we most often run in this area."
          />
          <Stagger className="mt-12 grid gap-4 sm:grid-cols-2 xl:grid-cols-4" staggerDelay={0.08}>
            {featuredServices.map((service) => (
              <StaggerItem key={service.slug}>
                <Link
                  href={`/services/${service.slug}`}
                  className="group flex flex-col rounded-2xl border border-border bg-card/50 p-6 transition-all hover:border-primary/20"
                >
                  <Wrench className="h-5 w-5 text-primary" />
                  <span className="mt-1 text-xs text-primary">{service.priceFrom}</span>
                  <h3 className="mt-3 text-lg font-bold">{service.name}</h3>
                  <p className="mt-2 flex-1 text-sm text-muted-foreground line-clamp-2">
                    {service.teaser}
                  </p>
                  <span className="mt-4 flex items-center gap-1 text-sm font-medium text-primary transition-transform group-hover:translate-x-1">
                    Learn more <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </Link>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      {/* Nearby Areas */}
      {(parentLocation || childNeighborhoods.length > 0 || siblingNeighborhoods.length > 0) && (
        <section className="shell section-space">
          <SectionHeading
            eyebrow="Nearby Areas"
            title={
              parentLocation
                ? `${location.name} is part of the ${parentLocation.name} service zone`
                : `Neighborhoods within ${location.name}`
            }
            copy="Explore nearby areas if your address sits near the edge of a service zone."
          />
          <div className="mt-8 space-y-6">
            {parentLocation && (
              <div>
                <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-primary">Parent Area</p>
                <LinkButton href={`/locations/${parentLocation.slug}`}>
                  {parentLocation.name} — Full Coverage
                </LinkButton>
              </div>
            )}
            {childNeighborhoods.length > 0 && (
              <div>
                <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-primary">Neighborhoods</p>
                <div className="flex flex-wrap gap-2">
                  {childNeighborhoods.map((n) => (
                    <LinkButton key={n.slug} href={`/locations/${n.slug}`} variant="secondary">
                      {n.name}
                    </LinkButton>
                  ))}
                </div>
              </div>
            )}
            {siblingNeighborhoods.length > 0 && (
              <div>
                <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-primary">Nearby Neighborhoods</p>
                <div className="flex flex-wrap gap-2">
                  {siblingNeighborhoods.map((n) => (
                    <LinkButton key={n.slug} href={`/locations/${n.slug}`} variant="secondary">
                      {n.name}
                    </LinkButton>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* FAQ */}
      <section className="border-y border-border bg-card/30">
        <div className="shell section-space">
          <SectionHeading
            eyebrow="FAQ"
            title={`Questions drivers in ${location.name} ask first`}
            copy="Short answers about parking, timing, and whether the job is a good mobile fit here."
          />
          <div className="mt-12 max-w-3xl">
            <FaqList faqs={location.faqs} />
          </div>
        </div>
      </section>

      <CtaBand
        title={`Need a mobile mechanic in ${location.name}?`}
        copy="Send the address, parking setup, vehicle details, and the problem. We will tell you quickly whether it fits the schedule."
      />
    </div>
  );
}
