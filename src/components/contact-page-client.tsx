"use client";

import { LaunchRequestForm } from "@/components/launch-request-form";
import { SectionHeading } from "@/components/marketing";
import { FadeIn } from "@/components/motion/fade-in";
import { launchWedges, siteConfig } from "@/data/site";
import { Phone, Mail, Clock, MapPin, ArrowRight } from "lucide-react";

export function ContactPageClient() {
  return (
    <div>
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
        </div>
        <div className="shell pt-16 pb-20 sm:pt-24 sm:pb-28">
          <FadeIn>
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-primary">
              Request Service
            </span>
          </FadeIn>
          <FadeIn delay={0.1}>
            <h1 className="mt-6 max-w-3xl text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl">
              Send the details. We&apos;ll screen the job.
            </h1>
          </FadeIn>
          <FadeIn delay={0.2}>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
              Include the vehicle, the symptom or service, where the car is parked, and your
              preferred time window. We prioritize no-start, brake, diagnostic, and inspection work
              that fits a real mobile route.
            </p>
          </FadeIn>
        </div>
      </section>

      <section className="shell pb-20" id="launch-request">
        <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr]">
          <FadeIn>
            <div className="space-y-6">
              <div className="rounded-2xl border border-border bg-card/50 p-8">
                <SectionHeading
                  eyebrow="Contact Info"
                  title="Call, text, or fill out the form."
                  copy="The more complete the first message, the faster we can screen the job and protect the promise."
                />
                <div className="mt-8 space-y-5">
                  <a
                    href={siteConfig.contact.phoneHref}
                    className="flex items-center gap-4 rounded-xl border border-border bg-background/50 p-4 transition-all hover:border-primary/20"
                  >
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Phone className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{siteConfig.contact.phoneDisplay}</p>
                      <p className="text-xs text-muted-foreground">Call or text directly</p>
                    </div>
                    <ArrowRight className="ml-auto h-4 w-4 text-muted-foreground" />
                  </a>
                  <a
                    href={`mailto:${siteConfig.contact.email}`}
                    className="flex items-center gap-4 rounded-xl border border-border bg-background/50 p-4 transition-all hover:border-primary/20"
                  >
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Mail className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{siteConfig.contact.email}</p>
                      <p className="text-xs text-muted-foreground">Email us</p>
                    </div>
                    <ArrowRight className="ml-auto h-4 w-4 text-muted-foreground" />
                  </a>
                  <div className="flex items-center gap-4 rounded-xl border border-border bg-background/50 p-4">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Clock className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-foreground">Scheduling</p>
                      <p className="text-xs text-muted-foreground">Screened appointments by request</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 rounded-xl border border-border bg-background/50 p-4">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <MapPin className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-foreground">Spokane County, WA</p>
                      <p className="text-xs text-muted-foreground">Spokane, Spokane Valley, Liberty Lake, South Hill</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-card/50 p-8">
                <p className="eyebrow">Launch Wedges</p>
                <div className="mt-4 space-y-3">
                  {launchWedges.map((wedge) => (
                    <div key={wedge.slug} className="rounded-xl border border-border bg-background/50 p-4">
                      <p className="text-sm font-semibold text-foreground">{wedge.label}</p>
                      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                        {wedge.firstPromise}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-card/50 p-8">
                <p className="eyebrow">What to Include</p>
                <ul className="mt-4 space-y-3">
                  {[
                    "Year, make, model, and mileage when known",
                    "Exact symptom or the repair you think you need",
                    "Address plus parking, gate, or apartment notes",
                    "Preferred time window and best callback method",
                  ].map((item) => (
                    <li key={item} className="flex gap-2 text-sm text-muted-foreground">
                      <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </FadeIn>

          <FadeIn delay={0.2}>
            <LaunchRequestForm />
          </FadeIn>
        </div>
      </section>
    </div>
  );
}
