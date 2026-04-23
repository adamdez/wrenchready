import type { Metadata } from "next";
import Image from "next/image";
import { ArrowRight, CheckCircle2, Phone, Wrench } from "lucide-react";
import { siteConfig } from "@/data/site";
import { LaunchRequestForm } from "@/components/launch-request-form";
import { buildMetadata } from "@/lib/seo";

export function generateMetadata(): Metadata {
  return {
    ...buildMetadata({
      title: "Mobile Mechanic in Spokane - We Come to You",
      description:
        "WrenchReady Mobile handles brakes, battery and no-start checks, maintenance, and inspections at your home or workplace in Spokane.",
      path: "/lp/mobile-mechanic",
      keywords: [
        "mobile mechanic Spokane",
        "mobile auto repair Spokane WA",
        "mechanic at home Spokane",
        "mobile car repair Spokane",
      ],
    }),
    robots: { index: false, follow: false },
  };
}

const serviceBullets = [
  "Brake inspection and qualifying brake service",
  "Battery testing, replacement, and no-start checks",
  "Oil changes, filters, wipers, and routine maintenance",
  "Pre-purchase inspections and simple mobile-fit repairs",
];

const fitBullets = [
  "You send the vehicle, issue, ZIP, and timing",
  "We screen the job before the route gets locked in",
  "You get a clear yes, no, or next-step recommendation",
];

export default function MobileMechanicLandingPage() {
  return (
    <>
      <section className="shell section-space">
        <div className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-primary/10 via-card to-card p-8 sm:p-12 lg:p-14">
          <div className="absolute -right-20 -top-20 h-60 w-60 rounded-full bg-primary/10 blur-3xl" />
          <div className="relative z-10 grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <div className="space-y-6">
              <div className="flex flex-wrap items-center gap-3">
                <span className="inline-flex rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-primary">
                  Mobile Mechanic
                </span>
                <span className="inline-flex rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">
                  Spokane home and workplace service
                </span>
              </div>
              <h1 className="text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
                Car trouble in Spokane?{" "}
                <span className="text-primary">We come to you.</span>
              </h1>
              <p className="max-w-2xl text-lg leading-relaxed text-muted-foreground">
                WrenchReady Mobile handles the straightforward work people usually lose half a day to:
                brakes, battery and no-start issues, maintenance, inspections, and other simple
                mobile-fit repairs.
              </p>
              <div className="flex flex-wrap gap-3">
                <a
                  href="#request-form"
                  className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-all hover:brightness-110"
                >
                  Request Service <ArrowRight className="h-4 w-4" />
                </a>
                <a
                  href={siteConfig.contact.phoneHref}
                  className="inline-flex items-center gap-2 rounded-full border border-border px-6 py-3 text-sm font-medium text-foreground transition-all hover:bg-secondary"
                >
                  <Phone className="h-4 w-4" /> {siteConfig.contact.phoneDisplay}
                </a>
              </div>
            </div>

            <div className="grid gap-4">
              <div className="overflow-hidden rounded-3xl border border-border bg-card/70 shadow-[0_16px_60px_-28px_rgba(0,0,0,0.7)]">
                <Image
                  alt="WrenchReady technician arriving to inspect a vehicle in a driveway"
                  className="h-full w-full object-cover"
                  height={768}
                  priority
                  src="/wrenchready-technician-arrival.webp"
                  width={1366}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="overflow-hidden rounded-3xl border border-border bg-card/70 shadow-[0_16px_60px_-28px_rgba(0,0,0,0.7)]">
                  <Image
                    alt="WrenchReady technician checking a vehicle battery"
                    className="h-full w-full object-cover"
                    height={768}
                    src="/wrenchready-battery-diagnostic.webp"
                    width={1366}
                  />
                </div>
                <div className="overflow-hidden rounded-3xl border border-border bg-card/70 shadow-[0_16px_60px_-28px_rgba(0,0,0,0.7)]">
                  <Image
                    alt="WrenchReady technician reviewing findings with a customer"
                    className="h-full w-full object-cover"
                    height={768}
                    src="/wrenchready-diagnostic-approval.webp"
                    width={1366}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="shell section-space">
        <p className="eyebrow">What We Handle Most Often</p>
        <h2 className="mt-3 text-3xl font-bold sm:text-4xl">
          Built for the jobs that make sense on-site
        </h2>
        <ul className="mt-8 grid gap-4 sm:grid-cols-2">
          {serviceBullets.map((bullet) => (
            <li key={bullet} className="flex items-start gap-4 rounded-2xl border border-border bg-card/50 p-5">
              <Wrench className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <span className="text-sm leading-relaxed text-muted-foreground">{bullet}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="shell section-space">
        <p className="eyebrow">How Requests Get Screened</p>
        <h2 className="mt-3 text-3xl font-bold sm:text-4xl">
          Fast fit check before a route slot gets committed
        </h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {fitBullets.map((bullet, index) => (
            <div key={bullet} className="rounded-2xl border border-border bg-card/50 p-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-lg font-bold text-primary">
                {index + 1}
              </div>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{bullet}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="shell section-space">
        <div className="rounded-2xl border border-border bg-card/50 p-8">
          <p className="eyebrow">What To Expect</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            {[
              "No shop drop-off required",
              "Clear scope before the work expands",
              "Honest yes-or-no fit check if the job is not right for mobile service",
            ].map((item) => (
              <div key={item} className="flex items-start gap-3 rounded-2xl border border-border/70 bg-background/40 p-4">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <span className="text-sm leading-relaxed text-muted-foreground">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="request-form" className="shell section-space scroll-mt-24">
        <LaunchRequestForm
          sourceTag="lp_mobile_mechanic_launch"
          requiredZipCode
          zipFieldLabel="Vehicle ZIP"
          zipHelperCopy="ZIP helps us quote route time and arrival window."
        />
      </section>
    </>
  );
}
