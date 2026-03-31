import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import { siteConfig } from "@/data/site";
import { LaunchRequestForm } from "@/components/launch-request-form";
import { CheckCircle2, Phone, ArrowRight, AlertTriangle } from "lucide-react";

export function generateMetadata(): Metadata {
  return {
    ...buildMetadata({
      title: "Mobile Brake Repair in Spokane — No Shop Visit Needed",
      description:
        "Squealing or grinding? Wrench Ready Mobile handles brake pad and rotor service at your home or workplace in Spokane. From $280 per axle.",
      path: "/lp/brake-repair",
      keywords: ["mobile brake repair Spokane", "brake pads at home Spokane", "mobile mechanic brakes Spokane", "brake service Spokane WA"],
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
      <section className="shell section-space">
        <div className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-primary/10 via-card to-card p-8 sm:p-12 lg:p-14">
          <div className="absolute -right-20 -top-20 h-60 w-60 rounded-full bg-primary/10 blur-3xl" />
          <div className="relative z-10 max-w-3xl space-y-6">
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-primary">Mobile Brake Repair</span>
              <span className="inline-flex rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">Spokane County, WA</span>
            </div>
            <h1 className="text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
              Brakes squealing?{" "}
              <span className="text-primary">We come to you. From $280/axle.</span>
            </h1>
            <p className="max-w-2xl text-lg leading-relaxed text-muted-foreground">
              Stop driving on worn brakes and stop losing half a day at a shop. Wrench Ready Mobile handles brake service at your driveway or workplace.
            </p>
            <div className="flex flex-wrap gap-3">
              <a href="#request-form" className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-all hover:brightness-110">
                Book Brake Service <ArrowRight className="h-4 w-4" />
              </a>
              <a href={siteConfig.contact.phoneHref} className="inline-flex items-center gap-2 rounded-full border border-border px-6 py-3 text-sm font-medium text-foreground transition-all hover:bg-secondary">
                <Phone className="h-4 w-4" /> {siteConfig.contact.phoneDisplay}
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="shell section-space">
        <p className="eyebrow">Warning Signs</p>
        <h2 className="mt-3 text-3xl font-bold sm:text-4xl">Do not ignore what the brakes are telling you</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {urgencySigns.map((item) => (
            <div key={item.sign} className="rounded-2xl border border-border bg-card/50 p-6">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-400" />
                <h3 className="text-base font-bold text-foreground">{item.sign}</h3>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.meaning}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="shell section-space">
        <p className="eyebrow">What&apos;s Included</p>
        <h2 className="mt-3 text-3xl font-bold sm:text-4xl">Brake service with inspection and clear next steps</h2>
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
        <div className="rounded-2xl border border-border bg-card/50 p-8 text-center">
          <p className="eyebrow">Pricing</p>
          <p className="mt-3 text-5xl font-bold text-primary sm:text-6xl">
            From $280<span className="text-2xl sm:text-3xl"> / axle</span>
          </p>
          <p className="mx-auto mt-4 max-w-lg text-sm leading-relaxed text-muted-foreground">
            Final price depends on the vehicle, pad and rotor requirements, and location access. You will know the cost before any work begins.
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
