import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import { siteConfig } from "@/data/site";
import { LaunchRequestForm } from "@/components/launch-request-form";

export function generateMetadata(): Metadata {
  return {
    ...buildMetadata({
      title: "Mobile Oil Change in Spokane — We Come to You",
      description:
        "Book a mobile oil change in Spokane, WA. Synthetic oil, filter, 25-point inspection, and honest next-step notes at your home or workplace. From $85.",
      path: "/lp/oil-change",
      keywords: [
        "mobile oil change Spokane",
        "oil change at home Spokane",
        "oil change Spokane WA",
        "mobile mechanic oil change Spokane",
      ],
    }),
    robots: { index: false, follow: false },
  };
}

const includes = [
  "Synthetic or synthetic-blend oil and filter replacement",
  "25-point visual inspection (fluids, tires, lights, leaks, wear items)",
  "Service light reset when the vehicle allows it",
  "Clear Now / Soon / Monitor notes on anything else found",
];

const whyBook = [
  "No driving to a shop — the oil change happens in your driveway or parking lot",
  "Transparent pricing with no hidden upsell at the counter",
  "Inspection context that makes the next visit easier to plan",
];

export default function OilChangeLandingPage() {
  return (
    <>
      {/* Hero */}
      <section className="shell section-space">
        <div className="hero-shell rounded-[2rem] px-6 py-8 sm:px-8 sm:py-10 lg:px-12 lg:py-14">
          <div className="relative z-10 max-w-3xl space-y-6">
            <div className="flex flex-wrap items-center gap-3">
              <span className="chip chip-accent">Mobile Oil Change</span>
              <span className="chip">Spokane County, WA</span>
            </div>
            <h1 className="text-4xl leading-tight sm:text-5xl lg:text-6xl">
              Oil change at your home or office.{" "}
              <span className="text-[var(--accent-strong)]">From $85.</span>
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-muted">
              Stay at work or inside while the oil change, filter, and 25-point
              inspection happen where the vehicle already sits. No waiting room. No
              half-day detour.
            </p>
            <div className="flex flex-wrap gap-3">
              <a href="#request-form" className="button-primary">
                Book Your Oil Change
              </a>
              <a href={siteConfig.contact.phoneHref} className="button-secondary">
                Call {siteConfig.contact.phoneDisplay}
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* What's Included */}
      <section className="shell section-space">
        <div className="max-w-3xl space-y-4">
          <p className="eyebrow">What&apos;s Included</p>
          <h2 className="text-3xl sm:text-4xl">
            More than a quick drain-and-fill
          </h2>
          <p className="text-base leading-8 text-muted">
            Every mobile oil change includes a useful inspection so small issues are
            caught early and the next visit is easier to plan.
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

      {/* Why Book Mobile */}
      <section className="shell section-space">
        <div className="max-w-3xl space-y-4">
          <p className="eyebrow">Why Mobile</p>
          <h2 className="text-3xl sm:text-4xl">Skip the shop for routine service</h2>
        </div>
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {whyBook.map((reason, i) => (
            <div key={i} className="panel rounded-[1.8rem] p-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[rgba(255,122,26,0.15)] text-lg font-bold text-[var(--accent-strong)]">
                {i + 1}
              </div>
              <p className="mt-4 text-base leading-7 text-muted">{reason}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing note */}
      <section className="shell section-space">
        <div className="panel rounded-[1.8rem] p-6 text-center sm:p-8">
          <p className="eyebrow">Pricing</p>
          <p className="mt-3 text-5xl font-bold text-[var(--accent-strong)] sm:text-6xl">
            From $85
          </p>
          <p className="mx-auto mt-4 max-w-lg text-base leading-7 text-muted">
            Final price depends on oil type and vehicle requirements. You will know the
            cost before the appointment is confirmed — no surprise invoices.
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
              Due for an oil change?
            </h2>
            <p className="text-base leading-7 text-muted">
              Send the vehicle details and your address. We will confirm pricing and
              availability within the next business window.
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
