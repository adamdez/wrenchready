import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import { siteConfig } from "@/data/site";
import { LaunchRequestForm } from "@/components/launch-request-form";
import { CheckCircle2, Phone, ArrowRight } from "lucide-react";

export function generateMetadata(): Metadata {
  return {
    ...buildMetadata({
      title: "Mobile Oil Change in Spokane — We Come to You",
      description:
        "Book a mobile oil change in Spokane, WA. Synthetic oil, filter, 25-point inspection, and honest next-step notes at your home or workplace. From $85.",
      path: "/lp/oil-change",
      keywords: ["mobile oil change Spokane", "oil change at home Spokane", "oil change Spokane WA", "mobile mechanic oil change Spokane"],
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
      <section className="shell section-space">
        <div className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-primary/10 via-card to-card p-8 sm:p-12 lg:p-14">
          <div className="absolute -right-20 -top-20 h-60 w-60 rounded-full bg-primary/10 blur-3xl" />
          <div className="relative z-10 max-w-3xl space-y-6">
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-primary">Mobile Oil Change</span>
              <span className="inline-flex rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">Spokane County, WA</span>
            </div>
            <h1 className="text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
              Oil change at your home or office.{" "}
              <span className="text-primary">From $85.</span>
            </h1>
            <p className="max-w-2xl text-lg leading-relaxed text-muted-foreground">
              Stay at work or inside while the oil change, filter, and 25-point inspection happen where the vehicle already sits.
            </p>
            <div className="flex flex-wrap gap-3">
              <a href="#request-form" className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-all hover:brightness-110">
                Book Your Oil Change <ArrowRight className="h-4 w-4" />
              </a>
              <a href={siteConfig.contact.phoneHref} className="inline-flex items-center gap-2 rounded-full border border-border px-6 py-3 text-sm font-medium text-foreground transition-all hover:bg-secondary">
                <Phone className="h-4 w-4" /> {siteConfig.contact.phoneDisplay}
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="shell section-space">
        <p className="eyebrow">What&apos;s Included</p>
        <h2 className="mt-3 text-3xl font-bold sm:text-4xl">More than a quick drain-and-fill</h2>
        <ul className="mt-8 grid gap-4 sm:grid-cols-2">
          {includes.map((item) => (
            <li key={item} className="flex items-start gap-4 rounded-2xl border border-border bg-card/50 p-5">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <span className="text-sm leading-relaxed text-muted-foreground">{item}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="shell section-space">
        <p className="eyebrow">Why Mobile</p>
        <h2 className="mt-3 text-3xl font-bold sm:text-4xl">Skip the shop for routine service</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {whyBook.map((reason, i) => (
            <div key={i} className="rounded-2xl border border-border bg-card/50 p-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-lg font-bold text-primary">{i + 1}</div>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{reason}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="shell section-space">
        <div className="rounded-2xl border border-border bg-card/50 p-8 text-center">
          <p className="eyebrow">Pricing</p>
          <p className="mt-3 text-5xl font-bold text-primary sm:text-6xl">From $85</p>
          <p className="mx-auto mt-4 max-w-lg text-sm leading-relaxed text-muted-foreground">
            Final price depends on oil type and vehicle requirements. No surprise invoices.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <a href="#request-form" className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:brightness-110">Get a Quote</a>
            <a href={siteConfig.contact.phoneHref} className="inline-flex items-center gap-2 rounded-full border border-border px-6 py-3 text-sm font-medium text-foreground hover:bg-secondary">
              <Phone className="h-4 w-4" /> {siteConfig.contact.phoneDisplay}
            </a>
          </div>
        </div>
      </section>

      <section id="request-form" className="shell section-space scroll-mt-24">
        <LaunchRequestForm />
      </section>
    </>
  );
}
