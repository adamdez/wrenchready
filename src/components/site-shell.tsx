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
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--card-strong)] text-lg font-bold uppercase tracking-[0.2em] text-white">
        WR
      </span>
      <span>
        <span className="block text-sm font-semibold uppercase tracking-[0.32em] text-[var(--accent-strong)]">
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
      <header className="sticky top-0 z-20 border-b border-[var(--line)] bg-[rgba(245,237,225,0.86)] backdrop-blur-xl">
        <div className="shell flex flex-col gap-4 py-4 lg:flex-row lg:items-center lg:justify-between">
          <BrandMark />
          <nav className="flex flex-wrap items-center gap-3 text-sm font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
            <Link href="/services">Services</Link>
            <Link href="/locations">Areas</Link>
            <a href={siteConfig.contact.phoneHref}>Call / Text</a>
            <LinkButton href="/contact">Schedule your appointment</LinkButton>
          </nav>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-[var(--line)] bg-[rgba(255,248,240,0.82)]">
        <div className="shell grid gap-10 py-12 md:grid-cols-2 xl:grid-cols-4">
          <div className="space-y-4">
            <BrandMark />
            <p className="max-w-sm text-base leading-7 text-[var(--muted)]">
              {siteConfig.description}
            </p>
          </div>

          <div>
            <p className="eyebrow">Services</p>
            <ul className="mt-4 space-y-3 text-base text-[var(--muted)]">
              {services.slice(0, 4).map((service) => (
                <li key={service.slug}>
                  <Link href={`/services/${service.slug}`}>{service.name}</Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="eyebrow">Service Area</p>
            <ul className="mt-4 space-y-3 text-base text-[var(--muted)]">
              {locations.map((location) => (
                <li key={location.slug}>
                  <Link href={`/locations/${location.slug}`}>{location.name}</Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="eyebrow">Contact</p>
            <div className="mt-4 space-y-3 text-base text-[var(--muted)]">
              <p>{siteConfig.contact.schedule}</p>
              <p>
                <a href={`mailto:${siteConfig.contact.email}`}>
                  {siteConfig.contact.email}
                </a>
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
    </div>
  );
}
