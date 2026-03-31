import type { ReactNode } from "react";
import Link from "next/link";
import { LinkButton } from "@/components/marketing";
import { locations, services, siteConfig } from "@/data/site";

type SiteShellProps = {
  children: ReactNode;
};

function BrandMark() {
  return (
    <Link className="flex items-center gap-3" href="/">
      <span className="flex h-12 w-12 items-center justify-center rounded-[1.1rem] border border-[var(--line-strong)] bg-[rgba(255,122,26,0.08)] text-base font-bold uppercase tracking-[0.22em] text-[var(--accent-soft)]">
        WR
      </span>
      <span>
        <span className="block text-xs font-semibold uppercase tracking-[0.34em] text-[var(--accent-strong)]">
          Wrench Ready
        </span>
        <span className="block text-lg font-semibold text-[var(--foreground)]">
          Mobile Auto Service
        </span>
      </span>
    </Link>
  );
}

export function SiteShell({ children }: SiteShellProps) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-30 border-b border-[var(--line)] bg-[rgba(8,12,17,0.84)] backdrop-blur-xl">
        <div className="shell flex items-center justify-between gap-4 py-4">
          <BrandMark />
          <nav className="hidden items-center gap-6 text-sm font-semibold uppercase tracking-[0.18em] text-muted lg:flex">
            <Link href="/services">Services</Link>
            <Link href="/locations">Areas</Link>
            <a href={siteConfig.contact.phoneHref}>Call / Text</a>
            <LinkButton href="/contact">Schedule your appointment</LinkButton>
          </nav>
          <div className="flex items-center gap-2 lg:hidden">
            <a
              className="button-secondary !min-h-11 !px-4"
              href={siteConfig.contact.phoneHref}
            >
              Call
            </a>
            <LinkButton href="/contact">Book</LinkButton>
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-[var(--line)] bg-[rgba(10,15,20,0.92)]">
        <div className="shell grid gap-10 py-12 md:grid-cols-2 xl:grid-cols-4">
          <div className="space-y-4">
            <BrandMark />
            <p className="max-w-sm text-base leading-7 text-muted">
              {siteConfig.description}
            </p>
            <div className="flex flex-wrap gap-3">
              <LinkButton href={siteConfig.contact.phoneHref} variant="secondary">
                Call / Text
              </LinkButton>
              <LinkButton href="/contact">Schedule</LinkButton>
            </div>
          </div>

          <div>
            <p className="eyebrow">Services</p>
            <ul className="mt-4 space-y-3 text-base text-muted">
              {services.slice(0, 5).map((service) => (
                <li key={service.slug}>
                  <Link href={`/services/${service.slug}`}>{service.name}</Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="eyebrow">Service Area</p>
            <ul className="mt-4 space-y-3 text-base text-muted">
              {locations.filter((l) => !l.parentSlug).map((location) => (
                <li key={location.slug}>
                  <Link href={`/locations/${location.slug}`}>{location.name}</Link>
                </li>
              ))}
            </ul>
            <p className="eyebrow mt-6">Tools</p>
            <ul className="mt-4 space-y-3 text-base text-muted">
              <li><Link href="/tools/symptom-checker">Symptom Checker</Link></li>
            </ul>
          </div>

          <div>
            <p className="eyebrow">Contact</p>
            <div className="mt-4 space-y-3 text-base text-muted">
              <p>{siteConfig.contact.schedule}</p>
              <p>
                <a href={`mailto:${siteConfig.contact.email}`}>{siteConfig.contact.email}</a>
              </p>
              <p>
                <a href={siteConfig.contact.phoneHref}>{siteConfig.contact.phoneDisplay}</a>
              </p>
              <p className="pt-2 text-sm uppercase tracking-[0.18em] text-[var(--accent-strong)]">
                Spokane County, Washington
              </p>
            </div>
          </div>
        </div>
      </footer>

      <div className="mobile-cta-bar fixed inset-x-0 bottom-0 z-40 md:hidden">
        <div className="shell grid grid-cols-3 gap-2 py-3">
          <a className="button-primary !min-h-12 !px-2 text-center" href={siteConfig.contact.phoneHref}>
            Call Now
          </a>
          <a className="button-secondary !min-h-12 !px-2 text-center" href={siteConfig.contact.smsHref}>
            Text Us
          </a>
          <a className="button-ghost !min-h-12 !px-2 text-center" href="/contact">
            Book
          </a>
        </div>
      </div>
    </div>
  );
}
