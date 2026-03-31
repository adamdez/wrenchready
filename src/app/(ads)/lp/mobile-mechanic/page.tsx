import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import { siteConfig } from "@/data/site";
import { LaunchRequestForm } from "@/components/launch-request-form";

export function generateMetadata(): Metadata {
  return {
    ...buildMetadata({
      title: "Mobile Mechanic in Spokane, WA — Same-Day Service",
      description:
        "Skip the shop. Wrench Ready Mobile comes to your driveway or workplace in Spokane for oil changes, brakes, batteries, diagnostics, and inspections.",
      path: "/lp/mobile-mechanic",
      keywords: [
        "mobile mechanic Spokane",
        "mobile auto repair Spokane WA",
        "mechanic at home Spokane",
        "same day mobile mechanic Spokane",
      ],
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
      {/* Hero */}
      <section className="shell section-space">
        <div className="hero-shell rounded-[2rem] px-6 py-8 sm:px-8 sm:py-10 lg:px-12 lg:py-14">
          <div className="relative z-10 max-w-3xl space-y-6">
            <span className="chip chip-accent">Mobile Mechanic — Spokane, WA</span>
            <h1 className="text-4xl leading-tight sm:text-5xl lg:text-6xl">
              Your mechanic comes to you.{" "}
              <span className="text-[var(--accent-strong)]">Same-day appointments.</span>
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-muted">
              Skip the tow, the waiting room, and the half-day detour. Wrench Ready Mobile
              handles maintenance and repair at your home or workplace across Spokane County.
            </p>
            <div className="flex flex-wrap gap-3">
              <a href="#request-form" className="button-primary">
                Book Your Appointment
              </a>
              <a href={siteConfig.contact.phoneHref} className="button-secondary">
                Call {siteConfig.contact.phoneDisplay}
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Bullets */}
      <section className="shell section-space">
        <div className="max-w-3xl space-y-4">
          <p className="eyebrow">Why Spokane Drivers Book</p>
          <h2 className="text-3xl sm:text-4xl">
            Mobile service that earns the next visit
          </h2>
        </div>
        <ul className="mt-8 grid gap-4 sm:grid-cols-2">
          {trustBullets.map((bullet) => (
            <li
              key={bullet}
              className="panel flex items-start gap-4 rounded-[1.8rem] p-5"
            >
              <svg className="mt-1 h-5 w-5 shrink-0 text-[var(--accent-strong)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-base leading-7 text-muted">{bullet}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* How It Works */}
      <section className="shell section-space">
        <div className="max-w-3xl space-y-4">
          <p className="eyebrow">How It Works</p>
          <h2 className="text-3xl sm:text-4xl">Three steps, no shop visit</h2>
        </div>
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {[
            { step: "1", title: "Send the details", copy: "Vehicle, service or symptom, address, and preferred timing." },
            { step: "2", title: "We screen and confirm", copy: "Route, parking setup, and service scope are verified before the slot locks." },
            { step: "3", title: "Service at your location", copy: "The work happens on site with inspection notes and clear next steps." },
          ].map((item) => (
            <div key={item.step} className="panel rounded-[1.8rem] p-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[rgba(255,122,26,0.15)] text-lg font-bold text-[var(--accent-strong)]">
                {item.step}
              </div>
              <h3 className="mt-4 text-xl font-semibold">{item.title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted">{item.copy}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Form */}
      <section id="request-form" className="shell section-space scroll-mt-24">
        <LaunchRequestForm />
      </section>

      {/* Final CTA */}
      <section className="shell section-space">
        <div className="hero-shell rounded-[2rem] px-6 py-8 text-center sm:px-8 sm:py-10">
          <div className="relative z-10 mx-auto max-w-2xl space-y-4">
            <h2 className="text-3xl sm:text-4xl">
              Ready to skip the shop?
            </h2>
            <p className="text-base leading-7 text-muted">
              Call, text, or fill out the form above. Most requests are screened within
              the next business window.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <a href={siteConfig.contact.phoneHref} className="button-primary">
                Call {siteConfig.contact.phoneDisplay}
              </a>
              <a href="#request-form" className="button-secondary">
                Book Now
              </a>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
