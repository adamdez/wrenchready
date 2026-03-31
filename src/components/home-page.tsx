"use client";

import { CtaBand, FaqList, LinkButton, PageHero, SectionHeading } from "@/components/marketing";
import { FadeIn, Stagger, StaggerItem } from "@/components/motion/fade-in";
import {
  homeFaqs,
  locations,
  processSteps,
  services,
  siteConfig,
} from "@/data/site";
import {
  Wrench,
  Shield,
  Clock,
  MapPin,
  ArrowRight,
  CheckCircle2,
  Star,
  Zap,
  Eye,
  Route,
} from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";

const serviceIcons: Record<string, React.ReactNode> = {
  "oil-change": <Wrench className="h-6 w-6" />,
  "brake-repair": <Shield className="h-6 w-6" />,
  "battery-replacement": <Zap className="h-6 w-6" />,
  "check-engine-diagnostics": <Eye className="h-6 w-6" />,
  "pre-purchase-inspection": <CheckCircle2 className="h-6 w-6" />,
};

const trustFeatures = [
  { icon: <Shield className="h-5 w-5" />, label: "Licensed & Insured" },
  { icon: <Star className="h-5 w-5" />, label: "5-Star Rated" },
  { icon: <Clock className="h-5 w-5" />, label: "Same-Week Scheduling" },
  { icon: <Route className="h-5 w-5" />, label: "Focused Routes" },
  { icon: <Eye className="h-5 w-5" />, label: "Photo Reports" },
  { icon: <CheckCircle2 className="h-5 w-5" />, label: "No Hidden Fees" },
];

export function HomePage() {
  return (
    <>
      {/* Hero */}
      <PageHero
        eyebrow="Mobile Mechanic — Spokane, WA"
        title="Your mechanic comes to you."
        copy="Oil changes, brakes, batteries, diagnostics, and inspections at your home or workplace. No shop drop-off. No waiting room. Just honest mobile auto service across Spokane County."
        primaryLink={{ href: "/contact", label: "Book Your Appointment" }}
        secondaryLink={{ href: "/services", label: "Explore Services" }}
      />

      {/* Trust Strip */}
      <section className="border-y border-border bg-card/50">
        <div className="shell py-6">
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
            {trustFeatures.map((feature) => (
              <div key={feature.label} className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="text-primary">{feature.icon}</span>
                {feature.label}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Services — Bento Grid */}
      <section className="shell section-space">
        <SectionHeading
          eyebrow="Services"
          title="Focused service lanes, not a vague everything-menu."
          copy="We handle the jobs that make the most sense mobile — maintenance, brakes, batteries, diagnostics, and inspections. Each lane is built for repeat value."
        />

        <Stagger className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3" staggerDelay={0.08}>
          {services.map((service, i) => (
            <StaggerItem
              key={service.slug}
              className={i === 0 ? "lg:col-span-2" : ""}
            >
              <Link
                href={`/services/${service.slug}`}
                className="glass-card group flex h-full flex-col p-6 sm:p-8"
              >
                <div className="flex items-start justify-between">
                  <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    {serviceIcons[service.slug]}
                  </span>
                  <span className="rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-foreground">
                    {service.priceFrom}
                  </span>
                </div>
                <h3 className="mt-5 text-xl font-bold text-foreground sm:text-2xl">
                  {service.name}
                </h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
                  {service.teaser}
                </p>
                <div className="mt-6 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{service.duration}</span>
                  <span className="flex items-center gap-1 text-sm font-medium text-primary transition-transform group-hover:translate-x-1">
                    Learn more <ArrowRight className="h-4 w-4" />
                  </span>
                </div>
              </Link>
            </StaggerItem>
          ))}
        </Stagger>
      </section>

      {/* How It Works — Animated Timeline */}
      <section className="border-y border-border bg-card/30">
        <div className="shell section-space">
          <SectionHeading
            eyebrow="How It Works"
            title="Four steps. That's it."
            copy="Send us a message, we screen the job, show up on time, and leave you with a clear plan."
          />

          <div className="relative mt-16">
            <div className="absolute left-8 top-0 bottom-0 hidden w-px bg-gradient-to-b from-primary/40 via-primary/20 to-transparent lg:block" />

            <div className="space-y-8 lg:space-y-12">
              {processSteps.map((step, index) => (
                <FadeIn key={step.title} delay={index * 0.15} direction="left">
                  <div className="flex gap-6 lg:gap-10">
                    <div className="relative hidden shrink-0 lg:block">
                      <motion.div
                        className="flex h-16 w-16 items-center justify-center rounded-2xl border border-primary/20 bg-primary/5 text-2xl font-bold text-primary"
                        initial={{ scale: 0.5, opacity: 0 }}
                        whileInView={{ scale: 1, opacity: 1 }}
                        viewport={{ once: true }}
                        transition={{ delay: index * 0.15 + 0.2, duration: 0.4, ease: "backOut" }}
                      >
                        {index + 1}
                      </motion.div>
                    </div>
                    <div className="flex-1 rounded-2xl border border-border bg-card/50 p-6 sm:p-8">
                      <div className="text-sm font-bold text-primary lg:hidden">Step {index + 1}</div>
                      <h3 className="mt-1 text-xl font-bold text-foreground lg:mt-0">{step.title}</h3>
                      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.copy}</p>
                    </div>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Service Areas */}
      <section className="shell section-space">
        <SectionHeading
          eyebrow="Service Areas"
          title="Focused routes beat vague county-wide claims."
          copy="Each area has its own page because search intent, travel time, and service expectations are different enough to deserve it."
        />

        <Stagger className="mt-12 grid gap-4 sm:grid-cols-2 xl:grid-cols-4" staggerDelay={0.1}>
          {locations
            .filter((l) => !l.parentSlug)
            .map((location) => (
              <StaggerItem key={location.slug}>
                <Link
                  href={`/locations/${location.slug}`}
                  className="glass-card group flex flex-col p-6"
                >
                  <MapPin className="h-5 w-5 text-primary" />
                  <h3 className="mt-4 text-lg font-bold text-foreground">{location.name}</h3>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground line-clamp-3">
                    {location.teaser}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {location.neighborhoods.slice(0, 3).map((n) => (
                      <span
                        key={n}
                        className="rounded-full border border-border px-2.5 py-0.5 text-xs text-muted-foreground"
                      >
                        {n}
                      </span>
                    ))}
                  </div>
                  <span className="mt-4 flex items-center gap-1 text-sm font-medium text-primary transition-transform group-hover:translate-x-1">
                    Explore area <ArrowRight className="h-4 w-4" />
                  </span>
                </Link>
              </StaggerItem>
            ))}
        </Stagger>
      </section>

      {/* Stats */}
      <section className="border-y border-border bg-card/30">
        <div className="shell py-16">
          <FadeIn>
            <div className="grid grid-cols-2 gap-8 lg:grid-cols-4">
              {[
                { value: "0", label: "Shop drop-offs" },
                { value: "5.0", label: "Customer rating" },
                { value: "5", label: "Service lanes" },
                { value: "4+", label: "Coverage areas" },
              ].map((stat) => (
                <div key={stat.label} className="text-center">
                  <p className="text-3xl font-bold text-foreground sm:text-4xl lg:text-5xl">
                    {stat.value}
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">{stat.label}</p>
                </div>
              ))}
            </div>
          </FadeIn>
        </div>
      </section>

      {/* FAQ */}
      <section className="shell section-space">
        <SectionHeading
          eyebrow="FAQ"
          title="Common questions, honest answers."
          copy="These answers reduce bounce, build trust, and give search engines topical depth around what Wrench Ready actually does."
        />
        <div className="mt-12 max-w-3xl">
          <FaqList faqs={homeFaqs} />
        </div>
      </section>

      {/* CTA */}
      <CtaBand
        title="Schedule your appointment."
        copy="Send the vehicle, the service or symptom, where the car is parked, and your preferred time window. That is enough to screen most jobs and get you a fast answer."
      />
    </>
  );
}
