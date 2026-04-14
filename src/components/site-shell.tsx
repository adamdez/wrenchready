"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Phone, MessageSquare, Calendar, Wrench, MapPin, ArrowRight, Menu, X, ExternalLink, Mail, Shield } from "lucide-react";
import { getServicesInPriorityOrder, locations, services, siteConfig } from "@/data/site";
import { motion, AnimatePresence } from "framer-motion";

type SiteShellProps = {
  children: ReactNode;
};

function BrandMark() {
  return (
    <Link className="group flex items-center gap-3 transition-transform hover:scale-[1.02]" href="/">
      <Image
        src="/wr-logo-full.png"
        alt="WrenchReady"
        width={200}
        height={80}
        className="h-9 w-auto"
        priority
      />
      <span className="hidden sm:block">
        <span className="block text-sm font-semibold text-foreground" style={{ fontFamily: "var(--font-display)" }}>
          WrenchReady Mobile
        </span>
        <span className="block text-[0.6rem] font-medium text-muted-foreground">
          Spokane&apos;s Premier Mobile Auto Service
        </span>
      </span>
    </Link>
  );
}

function MobileNav({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-40 bg-background/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.nav
            className="fixed inset-y-0 right-0 z-50 w-[280px] border-l border-border bg-background/95 backdrop-blur-xl"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
          >
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <span className="text-sm font-semibold text-foreground">Menu</span>
              <button
                onClick={onClose}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:bg-secondary"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-1 p-4">
              {[
                { label: "Home", href: "/#home" },
                { label: "Services", href: "/#services" },
                { label: "How It Works", href: "/#how-it-works" },
                { label: "Areas We Serve", href: "/#areas" },
                { label: "Reviews", href: "/#reviews" },
              ].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className="block rounded-lg px-4 py-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                >
                  {item.label}
                </Link>
              ))}
              <div className="my-3 h-px bg-border" />
              <a
                href={siteConfig.contact.phoneHref}
                className="flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                <Phone className="h-4 w-4" style={{ color: "var(--wr-teal)" }} />
                {siteConfig.contact.phoneDisplay}
              </a>
              <Link
                href="/#book"
                onClick={onClose}
                className="mt-2 flex items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground"
              >
                <Calendar className="h-4 w-4" />
                Request
              </Link>
            </div>
          </motion.nav>
        </>
      )}
    </AnimatePresence>
  );
}

export function SiteShell({ children }: SiteShellProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const footerServices = getServicesInPriorityOrder(services).slice(0, 5);

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="shell flex items-center justify-between gap-4 py-3">
          <BrandMark />
          <nav className="hidden items-center gap-1 lg:flex">
            <Link
              href="/#home"
              className="rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              Home
            </Link>
            <Link
              href="/services"
              className="rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              Services
            </Link>
            <Link
              href="/#how-it-works"
              className="rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              How It Works
            </Link>
            <Link
              href="/locations"
              className="rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              Areas We Serve
            </Link>
            <Link
              href="/#reviews"
              className="rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              Reviews
            </Link>
            <a
              href={siteConfig.contact.phoneHref}
              className="rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              {siteConfig.contact.phoneDisplay}
            </a>
            <Link
              href="/#book"
              className="ml-2 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:brightness-110"
            >
              <Calendar className="h-4 w-4" />
              Request
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
              href="/#book"
              className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
            >
              Book
            </Link>
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:bg-secondary"
              aria-label="Open menu"
            >
              <Menu className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <MobileNav open={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />

      <main className="flex-1">{children}</main>

      <footer className="border-t border-border bg-card">
        <div className="shell grid gap-10 py-16 md:grid-cols-2 xl:grid-cols-4">
          <div className="space-y-5">
            <Link href="/" className="block w-fit">
              <Image
                src="/wr-logo-full.png"
                alt="WrenchReady Mobile"
                width={200}
                height={80}
                className="h-12 w-auto"
              />
            </Link>
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
            {/* Google Business Profile link */}
            <a
              href="https://www.google.com/maps/place/WrenchReady+Mobile"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Google Business Profile
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Services</p>
            <ul className="mt-4 space-y-2.5">
              {footerServices.map((service) => (
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

            <p className="mt-8 text-xs font-semibold uppercase tracking-[0.2em] text-primary">Quick Links</p>
            <ul className="mt-4 space-y-2.5">
              <li>
                <Link
                  href="/#how-it-works"
                  className="group flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  How It Works
                </Link>
              </li>
              <li>
                <Link
                  href="/#reviews"
                  className="group flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  Reviews
                </Link>
              </li>
              <li>
                <Link
                  href="/#faq"
                  className="group flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  FAQ
                </Link>
              </li>
              <li>
                <Link
                  href="/tools/symptom-checker"
                  className="group flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  Symptom Checker Tool
                </Link>
              </li>
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
            <p className="mt-4 text-xs leading-relaxed text-muted-foreground/70">
              Spokane &middot; Spokane Valley &middot; Liberty Lake &middot; South Hill and surrounding neighborhoods
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Contact</p>
            <div className="mt-4 space-y-3 text-sm text-muted-foreground">
              <p>{siteConfig.contact.schedule}</p>
              <p>
                <a href={`mailto:${siteConfig.contact.email}`} className="flex items-center gap-2 transition-colors hover:text-foreground">
                  <Mail className="h-3.5 w-3.5" />
                  {siteConfig.contact.email}
                </a>
              </p>
              <p>
                <a href={siteConfig.contact.phoneHref} className="text-lg font-semibold text-foreground">
                  {siteConfig.contact.phoneDisplay}
                </a>
              </p>
              <div className="space-y-2 pt-4">
                <div className="flex items-start gap-2 text-xs text-muted-foreground/70">
                  <Shield className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <p>
                    Licensed &amp; insured mobile auto repair operating in compliance with Washington State RCW 46.71 automotive repair regulations.
                  </p>
                </div>
              </div>
              <p className="pt-2 text-xs font-medium uppercase tracking-widest text-muted-foreground">
                Spokane County, Washington
              </p>
            </div>
          </div>
        </div>

        <div className="border-t border-border">
          <div className="shell flex flex-wrap items-center justify-between gap-4 py-6 text-xs text-muted-foreground">
            <div className="flex flex-wrap items-center gap-4">
              <p>&copy; 2026 {siteConfig.name} LLC — Spokane County, WA. All rights reserved.</p>
              <span className="hidden h-3 w-px bg-border sm:block" />
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[--wr-teal]/15 bg-[--wr-teal]/5 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-[--wr-teal]">
                <Shield className="h-3 w-3" />
                Licensed • Insured • RCW 46.71 Compliant
              </span>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/privacy" className="transition-colors hover:text-foreground">
                Privacy Policy
              </Link>
              <span className="h-3 w-px bg-border" />
              <Link href="/terms" className="transition-colors hover:text-foreground">
                Terms
              </Link>
              <span className="h-3 w-px bg-border" />
              <Link href="/tools/symptom-checker" className="transition-colors hover:text-foreground">
                Symptom Checker
              </Link>
            </div>
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
            Request
          </Link>
        </div>
      </div>
    </div>
  );
}
