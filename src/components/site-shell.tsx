"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Phone, MessageSquare, Calendar, Wrench, MapPin, ArrowRight } from "lucide-react";
import { locations, services, siteConfig } from "@/data/site";

type SiteShellProps = {
  children: ReactNode;
};

function BrandMark() {
  return (
    <Link className="group flex items-center gap-3" href="/">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-sm font-bold text-primary-foreground transition-transform group-hover:scale-105">
        WR
      </span>
      <span className="hidden sm:block">
        <span className="block text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-primary">
          Wrench Ready
        </span>
        <span className="block text-sm font-semibold text-foreground">
          Mobile
        </span>
      </span>
    </Link>
  );
}

export function SiteShell({ children }: SiteShellProps) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="shell flex items-center justify-between gap-4 py-3">
          <BrandMark />
          <nav className="hidden items-center gap-1 lg:flex">
            <Link
              href="/services"
              className="rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              Services
            </Link>
            <Link
              href="/locations"
              className="rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              Service Areas
            </Link>
            <Link
              href="/tools/symptom-checker"
              className="rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              Diagnostics
            </Link>
            <a
              href={siteConfig.contact.phoneHref}
              className="rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              {siteConfig.contact.phoneDisplay}
            </a>
            <Link
              href="/contact"
              className="ml-2 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:brightness-110"
            >
              <Calendar className="h-4 w-4" />
              Book Now
            </Link>
          </nav>
          <div className="flex items-center gap-2 lg:hidden">
            <a
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:bg-secondary"
              href={siteConfig.contact.phoneHref}
            >
              <Phone className="h-4 w-4" />
            </a>
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
            >
              Book
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-border bg-card">
        <div className="shell grid gap-10 py-16 md:grid-cols-2 xl:grid-cols-4">
          <div className="space-y-5">
            <BrandMark />
            <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
              {siteConfig.shortDescription}
            </p>
            <div className="flex items-center gap-3">
              <a
                href={siteConfig.contact.phoneHref}
                className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:brightness-110"
              >
                <Phone className="h-4 w-4" />
                Call Now
              </a>
              <a
                href={siteConfig.contact.smsHref}
                className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary"
              >
                <MessageSquare className="h-4 w-4" />
                Text Us
              </a>
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Services</p>
            <ul className="mt-4 space-y-2.5">
              {services.slice(0, 5).map((service) => (
                <li key={service.slug}>
                  <Link
                    href={`/services/${service.slug}`}
                    className="group flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <Wrench className="h-3.5 w-3.5 text-primary/60" />
                    {service.name}
                    <ArrowRight className="ml-auto h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Service Areas</p>
            <ul className="mt-4 space-y-2.5">
              {locations
                .filter((l) => !l.parentSlug)
                .map((location) => (
                  <li key={location.slug}>
                    <Link
                      href={`/locations/${location.slug}`}
                      className="group flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      <MapPin className="h-3.5 w-3.5 text-primary/60" />
                      {location.name}
                      <ArrowRight className="ml-auto h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />
                    </Link>
                  </li>
                ))}
            </ul>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Contact</p>
            <div className="mt-4 space-y-3 text-sm text-muted-foreground">
              <p>{siteConfig.contact.schedule}</p>
              <p>
                <a href={`mailto:${siteConfig.contact.email}`} className="transition-colors hover:text-foreground">
                  {siteConfig.contact.email}
                </a>
              </p>
              <p>
                <a href={siteConfig.contact.phoneHref} className="text-lg font-semibold text-foreground">
                  {siteConfig.contact.phoneDisplay}
                </a>
              </p>
              <p className="pt-2 text-xs font-medium uppercase tracking-widest text-muted-foreground">
                Spokane County, Washington
              </p>
            </div>
          </div>
        </div>

        <div className="border-t border-border">
          <div className="shell flex items-center justify-between py-6 text-xs text-muted-foreground">
            <p>&copy; {new Date().getFullYear()} {siteConfig.name}. All rights reserved.</p>
            <Link href="/tools/symptom-checker" className="transition-colors hover:text-foreground">
              Symptom Checker Tool
            </Link>
          </div>
        </div>
      </footer>

      <div className="mobile-cta-bar fixed inset-x-0 bottom-0 z-40 md:hidden">
        <div className="shell grid grid-cols-3 gap-2 py-3">
          <a
            className="inline-flex items-center justify-center gap-1.5 rounded-full bg-primary py-3 text-sm font-semibold text-primary-foreground"
            href={siteConfig.contact.phoneHref}
          >
            <Phone className="h-4 w-4" />
            Call
          </a>
          <a
            className="inline-flex items-center justify-center gap-1.5 rounded-full border border-border py-3 text-sm font-medium text-foreground"
            href={siteConfig.contact.smsHref}
          >
            <MessageSquare className="h-4 w-4" />
            Text
          </a>
          <Link
            className="inline-flex items-center justify-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 py-3 text-sm font-medium text-primary"
            href="/contact"
          >
            <Calendar className="h-4 w-4" />
            Book
          </Link>
        </div>
      </div>
    </div>
  );
}
