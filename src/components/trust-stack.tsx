"use client";

import { Shield, Star, Clock, BadgeCheck, Wrench, FileCheck } from "lucide-react";
import { FadeIn, Stagger, StaggerItem } from "@/components/motion/fade-in";

const trustItems = [
  {
    icon: <Shield className="h-6 w-6" />,
    title: "Licensed & Insured",
    copy: "Full liability coverage on every visit.",
  },
  {
    icon: <Star className="h-6 w-6" />,
    title: "5-Star Service",
    copy: "Built to earn repeat business through honest work.",
  },
  {
    icon: <Clock className="h-6 w-6" />,
    title: "On-Time Arrival",
    copy: "Route discipline protects your time window.",
  },
  {
    icon: <BadgeCheck className="h-6 w-6" />,
    title: "Transparent Pricing",
    copy: "No surprise fees. The quote is the price.",
  },
  {
    icon: <Wrench className="h-6 w-6" />,
    title: "Quality Parts",
    copy: "OEM-equivalent parts with clear documentation.",
  },
  {
    icon: <FileCheck className="h-6 w-6" />,
    title: "Photo Reports",
    copy: "Photo-backed findings you can revisit later.",
  },
];

export function TrustStack() {
  return (
    <section className="shell section-space">
      <FadeIn>
        <p className="eyebrow text-center">Why Customers Trust Us</p>
        <h2 className="mt-3 text-center text-3xl font-bold tracking-tight sm:text-4xl">
          Mobile service that feels premium, not improvised.
        </h2>
      </FadeIn>

      <Stagger className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3" staggerDelay={0.08}>
        {trustItems.map((item) => (
          <StaggerItem key={item.title}>
            <div className="rounded-2xl border border-border bg-card/50 p-6 transition-colors hover:border-primary/20">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                {item.icon}
              </span>
              <h3 className="mt-4 text-lg font-semibold text-foreground">{item.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{item.copy}</p>
            </div>
          </StaggerItem>
        ))}
      </Stagger>
    </section>
  );
}
