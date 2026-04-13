"use client";

import { CtaBand, LinkButton, SectionHeading } from "@/components/marketing";
import { FadeIn, Stagger, StaggerItem } from "@/components/motion/fade-in";
import { getServicesInPriorityOrder, services } from "@/data/site";
import { ArrowRight, CheckCircle2, Clock, Wrench, Shield, Zap, Eye } from "lucide-react";
import Link from "next/link";

const serviceIcons: Record<string, React.ReactNode> = {
  "oil-change": <Wrench className="h-6 w-6" />,
  "brake-repair": <Shield className="h-6 w-6" />,
  "battery-replacement": <Zap className="h-6 w-6" />,
  "check-engine-diagnostics": <Eye className="h-6 w-6" />,
  "pre-purchase-inspection": <CheckCircle2 className="h-6 w-6" />,
};

export function ServicesPageClient() {
  const orderedServices = getServicesInPriorityOrder(services);

  return (
    <div>
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
        </div>
        <div className="shell pt-16 pb-20 sm:pt-24 sm:pb-28">
          <FadeIn>
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-primary">
              Service Menu
            </span>
          </FadeIn>
          <FadeIn delay={0.1}>
            <h1 className="mt-6 max-w-3xl text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl">
              Start with the service that fits the problem.
            </h1>
          </FadeIn>
          <FadeIn delay={0.2}>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
              Battery, brake, diagnostic, and inspection work lead here because they are the best
              fit for mobile service. Oil changes stay available, but they are not the whole brand.
            </p>
          </FadeIn>
          <FadeIn delay={0.3}>
            <div className="mt-8 flex flex-wrap gap-3">
              <LinkButton href="/contact">
                Book Now <ArrowRight className="h-4 w-4" />
              </LinkButton>
              <LinkButton href="/locations" variant="secondary">See Service Areas</LinkButton>
            </div>
          </FadeIn>
        </div>
      </section>

      <section className="shell section-space">
        <SectionHeading
          eyebrow="All Services"
          title="Clear scope and honest pricing for every lane."
          copy="Use these pages to see what is included, where the work makes sense, and what the next step looks like."
        />
        <Stagger className="mt-12 grid gap-6 lg:grid-cols-2" staggerDelay={0.08}>
          {orderedServices.map((service) => (
            <StaggerItem key={service.slug}>
              <div className="rounded-2xl border border-border bg-card/50 p-8 transition-all hover:border-primary/20">
                <div className="flex items-start justify-between">
                  <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    {serviceIcons[service.slug]}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-semibold text-primary">
                      {service.priceFrom}
                    </span>
                    <span className="flex items-center gap-1 rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" /> {service.duration}
                    </span>
                  </div>
                </div>
                <h2 className="mt-5 text-2xl font-bold">{service.name}</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {service.teaser}
                </p>
                <ul className="mt-6 space-y-2">
                  {service.includes.slice(0, 3).map((item) => (
                    <li key={item} className="flex gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                      {item}
                    </li>
                  ))}
                </ul>
                <div className="mt-8 flex flex-wrap gap-3">
                  <Link
                    href={`/services/${service.slug}`}
                    className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:brightness-110"
                  >
                    View Details <ArrowRight className="h-4 w-4" />
                  </Link>
                  <LinkButton href="/contact" variant="secondary">
                    Schedule
                  </LinkButton>
                </div>
              </div>
            </StaggerItem>
          ))}
        </Stagger>
      </section>

      <CtaBand
        title="Not sure which service?"
        copy="If you only know the symptom, start with diagnostics. If you already know the job, pick the service and send the vehicle details from there."
      />
    </div>
  );
}
