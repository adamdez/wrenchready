"use client";

import { CtaBand, LinkButton, SectionHeading } from "@/components/marketing";
import { FadeIn, Stagger, StaggerItem } from "@/components/motion/fade-in";
import { locations } from "@/data/site";
import { MapPin, ArrowRight } from "lucide-react";
import Link from "next/link";

export function LocationsPageClient() {
  const cityLocations = locations.filter((l) => !l.parentSlug);
  const neighborhoodLocations = locations.filter((l) => !!l.parentSlug);

  return (
    <div>
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
        </div>
        <div className="shell pt-16 pb-20 sm:pt-24 sm:pb-28">
          <FadeIn>
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-primary">
              <MapPin className="h-3.5 w-3.5" />
              Service Areas
            </span>
          </FadeIn>
          <FadeIn delay={0.1}>
            <h1 className="mt-6 max-w-3xl text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl">
              Where WrenchReady currently runs.
            </h1>
          </FadeIn>
          <FadeIn delay={0.2}>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
              We keep the footprint tight on purpose so arrival windows stay reliable and the work
              stays organized.
            </p>
          </FadeIn>
          <FadeIn delay={0.3}>
            <div className="mt-8 flex flex-wrap gap-3">
              <LinkButton href="/contact">
                Book Now <ArrowRight className="h-4 w-4" />
              </LinkButton>
              <LinkButton href="/services" variant="secondary">Browse Services</LinkButton>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* City-level */}
      <section className="shell section-space">
        <SectionHeading
          eyebrow="Primary Coverage"
          title="The main areas we serve right now."
          copy="Start with the city or area closest to where the vehicle is parked. If the job is a strong fit, we can sometimes go a little wider."
        />
        <Stagger className="mt-12 grid gap-4 sm:grid-cols-2 xl:grid-cols-4" staggerDelay={0.1}>
          {cityLocations.map((location) => (
            <StaggerItem key={location.slug}>
              <Link
                href={`/locations/${location.slug}`}
                className="glass-card group flex h-full flex-col p-6"
              >
                <MapPin className="h-5 w-5 text-primary" />
                <h3 className="mt-4 text-xl font-bold">{location.name}</h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground line-clamp-3">
                  {location.teaser}
                </p>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {location.neighborhoods.slice(0, 3).map((n) => (
                    <span key={n} className="rounded-full border border-border px-2.5 py-0.5 text-xs text-muted-foreground">
                      {n}
                    </span>
                  ))}
                </div>
                <span className="mt-4 flex items-center gap-1 text-sm font-medium text-primary transition-transform group-hover:translate-x-1">
                  Explore <ArrowRight className="h-4 w-4" />
                </span>
              </Link>
            </StaggerItem>
          ))}
        </Stagger>
      </section>

      {/* Neighborhood-level */}
      {neighborhoodLocations.length > 0 && (
        <section className="border-y border-border bg-card/30">
          <div className="shell section-space">
            <SectionHeading
              eyebrow="Neighborhoods"
              title="Specific coverage across Spokane County neighborhoods."
              copy="Access, parking, and scheduling look different in each neighborhood — here is what mobile service looks like in each one."
            />
            <Stagger className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" staggerDelay={0.05}>
              {neighborhoodLocations.map((location) => (
                <StaggerItem key={location.slug}>
                  <Link
                    href={`/locations/${location.slug}`}
                    className="group flex flex-col rounded-2xl border border-border bg-card/50 p-5 transition-all hover:border-primary/20"
                  >
                    <h3 className="text-base font-bold">{location.name}</h3>
                    <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                      {location.teaser}
                    </p>
                    <span className="mt-3 flex items-center gap-1 text-xs font-medium text-primary transition-transform group-hover:translate-x-1">
                      View <ArrowRight className="h-3 w-3" />
                    </span>
                  </Link>
                </StaggerItem>
              ))}
            </Stagger>
          </div>
        </section>
      )}

      <CtaBand
        title="Just outside the map?"
        copy="Send the address anyway. Strong-fit jobs and grouped appointments can sometimes justify a slightly wider trip."
      />
    </div>
  );
}
