import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import { siteConfig } from "@/data/site";
import { LaunchRequestForm } from "@/components/launch-request-form";

export function generateMetadata(): Metadata {
  return {
    ...buildMetadata({
      title: "Mobile Brake Repair in Spokane — No Shop Visit Needed",
      description:
        "Squealing or grinding? Wrench Ready Mobile handles brake pad and rotor service at your home or workplace in Spokane. From $280 per axle.",
      path: "/lp/brake-repair",
      keywords: [
        "mobile brake repair Spokane",
        "brake pads at home Spokane",
        "mobile mechanic brakes Spokane",
        "brake service Spokane WA",
      ],
    }),
    robots: { index: false, follow: false },
  };
}

const includes = [
  "Brake system inspection — pads, rotors, and visible hardware condition",
  "Pad and rotor replacement for qualifying vehicles and safe locations",
  "Torque-critical closeout and post-service check procedure",
  "Written Now / Soon / Monitor notes on anything else found",
];

const urgencySigns = [
  { sign: "Squealing or chirping", meaning: "Pads are worn and metal-on-metal contact is close" },
  { sign: "Grinding when stopping", meaning: "Pad material is gone — rotors may already be damaged" },
  { sign: "Soft or spongy pedal", meaning: "Possible fluid or hydraulic issue that needs inspection" },
  { sign: "Steering pulls under braking", meaning: "Uneven pad wear or caliper issue on one side" },
];

export default function BrakeRepairLandingPage() {
  return (
    <>
      {/* Hero */}
      <section className="shell section-space">
        <div className="hero-shell rounded-[2rem] px-6 py-8 sm:px-8 sm:py-10 lg:px-12 lg:py-14">
          <div className="relative z-10 max-w-3xl space-y-6">
            <div className="flex flex-wrap items-center gap-3">
              <span className="chip chip-accent">Mobile Brake Repair</span>
              <span className="chip">Spokane County, WA</span>
            </div>
            <h1 className="text-4xl leading-tight sm:text-5xl lg:text-6xl">
              Brakes squealing?{" "}
              <span className="text-[var(--accent-strong)]">
                We come to you. From $280/axle.
              </span>
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-muted">
              Stop driving on worn brakes and stop losing half a day at a shop. Wrench
              Ready Mobile handles brake service at your driveway or workplace across
              Spokane County.
            </p>
            <div className="flex flex-wrap gap-3">
              <a href="#request-form" className="button-primary">
                Book Brake Service
              </a>
              <a href={siteConfig.contact.phoneHref} className="button-secondary">
                Call {siteConfig.contact.phoneDisplay}
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Warning Signs */}
      <section className="shell section-space">
        <div className="max-w-3xl space-y-4">
          <p className="eyebrow">Warning Signs</p>
          <h2 className="text-3xl sm:text-4xl">
            Do not ignore what the brakes are telling you
          </h2>
        </div>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {urgencySigns.map((item) => (
            <div
              key={item.sign}
              className="panel rounded-[1.8rem] p-6"
            >
              <h3 className="text-lg font-semibold text-[var(--accent-strong)]">
                {item.sign}
              </h3>
              <p className="mt-2 text-sm leading-6 text-muted">{item.meaning}</p>
            </div>
          ))}
        </div>
      </section>

      {/* What's Included */}
      <section className="shell section-space">
        <div className="max-w-3xl space-y-4">
          <p className="eyebrow">What&apos;s Included</p>
          <h2 className="text-3xl sm:text-4xl">
            Brake service with inspection and clear next steps
          </h2>
          <p className="text-base leading-8 text-muted">
            Every brake appointment starts with a proper inspection, not a blind parts
            swap. If the car needs a different first step, the visit will surface it.
          </p>
        </div>
        <ul className="mt-8 grid gap-4 sm:grid-cols-2">
          {includes.map((item) => (
            <li
              key={item}
              className="panel flex items-start gap-4 rounded-[1.8rem] p-5"
            >
              <svg className="mt-1 h-5 w-5 shrink-0 text-[var(--accent-strong)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-base leading-7 text-muted">{item}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Pricing note */}
      <section className="shell section-space">
        <div className="panel rounded-[1.8rem] p-6 text-center sm:p-8">
          <p className="eyebrow">Pricing</p>
          <p className="mt-3 text-5xl font-bold text-[var(--accent-strong)] sm:text-6xl">
            From $280<span className="text-2xl sm:text-3xl"> / axle</span>
          </p>
          <p className="mx-auto mt-4 max-w-lg text-base leading-7 text-muted">
            Final price depends on the vehicle, pad and rotor requirements, and
            location access. You will know the cost before any work begins.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <a href="#request-form" className="button-primary">
              Get a Quote
            </a>
            <a href={siteConfig.contact.phoneHref} className="button-secondary">
              Call {siteConfig.contact.phoneDisplay}
            </a>
          </div>
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
              Do not wait until the grinding gets worse
            </h2>
            <p className="text-base leading-7 text-muted">
              Send the vehicle, the symptom, and where the car is parked. We will
              screen the job and confirm pricing fast.
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
