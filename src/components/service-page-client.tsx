"use client";

import { CtaBand, FaqList, LinkButton, SectionHeading } from "@/components/marketing";
import { FadeIn, Stagger, StaggerItem } from "@/components/motion/fade-in";
import { getServicesInPriorityOrder } from "@/data/site";
import type { Location, Service } from "@/data/site";
import { CheckCircle2, ArrowRight, MapPin, Clock } from "lucide-react";
import Link from "next/link";

type ServicePageClientProps = {
  service: Service;
  relevantLocations: Location[];
  neighborhoodLocations: Location[];
  relatedServices: Service[];
};

export function ServicePageClient({
  service,
  relevantLocations,
  neighborhoodLocations,
  relatedServices,
}: ServicePageClientProps) {
  const orderedRelatedServices = getServicesInPriorityOrder(relatedServices);

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
                {service.priceFrom}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                {service.duration}
              </span>
            </div>
          </FadeIn>
          <FadeIn delay={0.1}>
            <h1 className="mt-6 max-w-3xl text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl">
              {service.headline}
            </h1>
          </FadeIn>
          <FadeIn delay={0.2}>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
              {service.teaser}
            </p>
          </FadeIn>
          <FadeIn delay={0.3}>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <LinkButton href="/contact">
                Schedule Now
                <ArrowRight className="h-4 w-4" />
              </LinkButton>
              <LinkButton href="/services" variant="secondary">
                All Services
              </LinkButton>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* What's Included + Ideal For */}
      <section className="shell section-space">
        <div className="grid gap-6 lg:grid-cols-2">
          <FadeIn>
            <div className="rounded-2xl border border-border bg-card/50 p-8">
              <p className="eyebrow">What&apos;s Included</p>
              <h2 className="mt-3 text-2xl font-bold">
                What {service.name.toLowerCase()} looks like with Wrench Ready
              </h2>
              <ul className="mt-6 space-y-4">
                {service.includes.map((item) => (
                  <li key={item} className="flex gap-3 text-sm leading-relaxed text-muted-foreground">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </FadeIn>

          <div className="space-y-6">
            <FadeIn delay={0.1}>
              <div className="rounded-2xl border border-border bg-card/50 p-8">
                <p className="eyebrow">Best Fit</p>
                <h2 className="mt-3 text-2xl font-bold">Ideal for</h2>
                <ul className="mt-6 space-y-4">
                  {service.idealFor.map((item) => (
                    <li key={item} className="flex gap-3 text-sm leading-relaxed text-muted-foreground">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </FadeIn>
            <FadeIn delay={0.2}>
              <div className="rounded-2xl border border-border bg-card/50 p-8">
                <p className="eyebrow">Why People Book This</p>
                <ul className="mt-4 space-y-3">
                  {service.trustPoints.map((item) => (
                    <li key={item} className="text-sm leading-relaxed text-muted-foreground">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* Service Areas */}
      <section className="border-y border-border bg-card/30">
        <div className="shell section-space">
          <SectionHeading
            eyebrow="Service Areas"
            title={`Where we offer ${service.name.toLowerCase()}`}
            copy="We currently offer this service in the areas where we can keep the promise and show up on time."
          />
          <Stagger className="mt-12 grid gap-4 sm:grid-cols-2 xl:grid-cols-4" staggerDelay={0.08}>
            {relevantLocations.map((location) => (
              <StaggerItem key={location.slug}>
                <Link
                  href={`/locations/${location.slug}`}
                  className="group flex flex-col rounded-2xl border border-border bg-card/50 p-6 transition-all hover:border-primary/20"
                >
                  <MapPin className="h-5 w-5 text-primary" />
                  <h3 className="mt-3 text-lg font-bold">{location.name}</h3>
                  <p className="mt-1 flex-1 text-sm text-muted-foreground line-clamp-2">
                    {service.name} in {location.name}
                  </p>
                  <span className="mt-4 flex items-center gap-1 text-sm font-medium text-primary transition-transform group-hover:translate-x-1">
                    View area <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </Link>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      {/* Neighborhood Links */}
      {neighborhoodLocations.length > 0 && (
        <section className="shell section-space">
          <SectionHeading
            eyebrow="Neighborhood Coverage"
            title={`${service.name} across Spokane neighborhoods`}
            copy="If you are searching from a neighborhood page, start with the area closest to where the vehicle is parked."
          />
          <div className="mt-8 flex flex-wrap gap-2">
            {neighborhoodLocations.map((loc) => (
              <LinkButton key={loc.slug} href={`/locations/${loc.slug}`} variant="secondary">
                {loc.name}
              </LinkButton>
            ))}
          </div>
        </section>
      )}

      {/* Related Services */}
      {relatedServices.length > 0 && (
        <section className="border-y border-border bg-card/30">
          <div className="shell section-space">
            <SectionHeading
              eyebrow="Related Services"
              title="Other mobile service lanes"
              copy="Customers booking one service often need another."
            />
            <Stagger className="mt-12 grid gap-4 sm:grid-cols-2 xl:grid-cols-4" staggerDelay={0.08}>
            {orderedRelatedServices.map((rs) => (
                <StaggerItem key={rs.slug}>
                  <Link
                    href={`/services/${rs.slug}`}
                    className="group flex flex-col rounded-2xl border border-border bg-card/50 p-6 transition-all hover:border-primary/20"
                  >
                    <span className="text-xs font-medium text-primary">{rs.priceFrom}</span>
                    <h3 className="mt-2 text-lg font-bold">{rs.name}</h3>
                    <span className="mt-4 flex items-center gap-1 text-sm font-medium text-primary transition-transform group-hover:translate-x-1">
                      Learn more <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                  </Link>
                </StaggerItem>
              ))}
            </Stagger>
          </div>
        </section>
      )}

      {/* FAQ */}
      <section className="shell section-space">
        <SectionHeading
          eyebrow="FAQ"
          title={`Questions about ${service.name.toLowerCase()}`}
          copy="Short answers to the questions that usually come up before booking."
        />
        <div className="mt-12 max-w-3xl">
          <FaqList faqs={service.faqs} />
        </div>
      </section>

      <CtaBand
        title={`Need ${service.name.toLowerCase()} in Spokane?`}
        copy="Send the vehicle, the address, and the symptom or known repair. That is enough for us to tell you quickly whether the job fits the route and the work."
      />
    </div>
  );
}
