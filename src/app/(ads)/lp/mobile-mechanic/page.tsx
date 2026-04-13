import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import { siteConfig } from "@/data/site";
import { LaunchRequestForm } from "@/components/launch-request-form";
import { CheckCircle2, Phone, ArrowRight } from "lucide-react";

export function generateMetadata(): Metadata {
  return {
    ...buildMetadata({
      title: "Mobile Mechanic in Spokane, WA — Same-Day Service",
      description:
        "Skip the shop. WrenchReady Mobile comes to your driveway or workplace in Spokane for oil changes, brakes, batteries, diagnostics, and inspections.",
      path: "/lp/mobile-mechanic",
      keywords: ["mobile mechanic Spokane", "mobile auto repair Spokane WA", "mechanic at home Spokane", "same day mobile mechanic Spokane"],
    }),
    robots: { index: false, follow: false },
  };
}

const trustBullets = [
  "No shop drop-off — service happens where the vehicle already sits",
  "Clear pricing and inspection notes, not vague counter talk",
  "Focused on Spokane County with tight arrival windows",
  "Maintenance, brakes, batteries, diagnostics, and inspections",
];

export default function MobileMechanicLandingPage() {
  return (
    <>
      <section className="shell section-space">
        <div className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-primary/10 via-card to-card p-8 sm:p-12 lg:p-14">
          <div className="absolute -right-20 -top-20 h-60 w-60 rounded-full bg-primary/10 blur-3xl" />
          <div className="relative z-10 max-w-3xl space-y-6">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-primary">
              Mobile Mechanic — Spokane, WA
            </span>
            <h1 className="text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
              Your mechanic comes to you.{" "}
              <span className="text-primary">Same-day appointments.</span>
            </h1>
            <p className="max-w-2xl text-lg leading-relaxed text-muted-foreground">
              Skip the tow, the waiting room, and the half-day detour. WrenchReady Mobile
              handles maintenance and repair at your home or workplace across Spokane County.
            </p>
            <div className="flex flex-wrap gap-3">
              <a href="#request-form" className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-all hover:brightness-110">
                Book Your Appointment <ArrowRight className="h-4 w-4" />
              </a>
              <a href={siteConfig.contact.phoneHref} className="inline-flex items-center gap-2 rounded-full border border-border px-6 py-3 text-sm font-medium text-foreground transition-all hover:bg-secondary">
                <Phone className="h-4 w-4" /> {siteConfig.contact.phoneDisplay}
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="shell section-space">
        <p className="eyebrow">Why Spokane Drivers Book</p>
        <h2 className="mt-3 text-3xl font-bold sm:text-4xl">Mobile service that earns the next visit</h2>
        <ul className="mt-8 grid gap-4 sm:grid-cols-2">
          {trustBullets.map((bullet) => (
            <li key={bullet} className="flex items-start gap-4 rounded-2xl border border-border bg-card/50 p-5">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <span className="text-sm leading-relaxed text-muted-foreground">{bullet}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="shell section-space">
        <p className="eyebrow">How It Works</p>
        <h2 className="mt-3 text-3xl font-bold sm:text-4xl">Three steps, no shop visit</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {[
            { step: "1", title: "Send the details", copy: "Vehicle, service or symptom, address, and preferred timing." },
            { step: "2", title: "We screen and confirm", copy: "Route, parking setup, and service scope are verified before the slot locks." },
            { step: "3", title: "Service at your location", copy: "The work happens on site with inspection notes and clear next steps." },
          ].map((item) => (
            <div key={item.step} className="rounded-2xl border border-border bg-card/50 p-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-lg font-bold text-primary">{item.step}</div>
              <h3 className="mt-4 text-lg font-bold">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.copy}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="request-form" className="shell section-space scroll-mt-24">
        <LaunchRequestForm />
      </section>

      <section className="shell section-space">
        <div className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-primary/10 via-card to-card p-8 text-center sm:p-12">
          <div className="relative z-10 mx-auto max-w-2xl space-y-4">
            <h2 className="text-3xl font-bold sm:text-4xl">Ready to skip the shop?</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Call, text, or fill out the form above. Most requests are screened within the next business window.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <a href={siteConfig.contact.phoneHref} className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-all hover:brightness-110">
                <Phone className="h-4 w-4" /> {siteConfig.contact.phoneDisplay}
              </a>
              <a href="#request-form" className="inline-flex items-center gap-2 rounded-full border border-border px-6 py-3 text-sm font-medium text-foreground transition-all hover:bg-secondary">
                Book Now
              </a>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
