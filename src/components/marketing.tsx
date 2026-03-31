import type { ReactNode } from "react";
import Link from "next/link";
import { launchStats, siteConfig } from "@/data/site";

type LinkButtonProps = {
  href: string;
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost";
};

type SectionHeadingProps = {
  eyebrow: string;
  title: string;
  copy: string;
};

type PageHeroProps = {
  eyebrow: string;
  title: string;
  copy: string;
  primaryLink: {
    href: string;
    label: string;
  };
  secondaryLink?: {
    href: string;
    label: string;
  };
  panelTitle: string;
  panelItems: string[];
  highlights?: string[];
};

type FaqListProps = {
  faqs: Array<{
    question: string;
    answer: string;
  }>;
};

type CtaBandProps = {
  title: string;
  copy: string;
};

export function LinkButton({
  href,
  children,
  variant = "primary",
}: LinkButtonProps) {
  const className =
    variant === "primary"
      ? "button-primary"
      : variant === "ghost"
        ? "button-ghost"
        : "button-secondary";

  const isExternalAction =
    href.startsWith("tel:") ||
    href.startsWith("sms:") ||
    href.startsWith("mailto:") ||
    href.startsWith("http") ||
    href.startsWith("#");

  if (isExternalAction) {
    return (
      <a className={className} href={href}>
        {children}
      </a>
    );
  }

  return (
    <Link className={className} href={href}>
      {children}
    </Link>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  copy,
}: SectionHeadingProps) {
  return (
    <div className="max-w-3xl space-y-4">
      <p className="eyebrow">{eyebrow}</p>
      <h2 className="text-4xl sm:text-5xl">{title}</h2>
      <p className="text-base leading-8 text-muted sm:text-lg">{copy}</p>
    </div>
  );
}

export function PageHero({
  eyebrow,
  title,
  copy,
  primaryLink,
  secondaryLink,
  panelTitle,
  panelItems,
  highlights,
}: PageHeroProps) {
  return (
    <section className="shell section-space">
      <div className="hero-shell rounded-[2rem] px-6 py-8 sm:px-8 sm:py-10 lg:px-12 lg:py-12">
        <div className="relative z-10 grid gap-10 lg:grid-cols-[1.12fr_0.88fr] lg:items-end">
          <div className="space-y-7">
            <div className="flex flex-wrap items-center gap-3">
              <span className="chip chip-accent">{eyebrow}</span>
              <span className="chip">Spokane County, WA</span>
            </div>
            <div className="space-y-4">
              <p className="hero-kicker">Mobile Auto Service Built For Repeat Business</p>
              <h1 className="max-w-4xl text-5xl leading-none sm:text-6xl xl:text-7xl">
                {title}
              </h1>
              <p className="max-w-3xl text-lg leading-8 text-muted sm:text-xl">
                {copy}
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <LinkButton href={primaryLink.href}>{primaryLink.label}</LinkButton>
              {secondaryLink ? (
                <LinkButton href={secondaryLink.href} variant="secondary">
                  {secondaryLink.label}
                </LinkButton>
              ) : null}
              <LinkButton href={siteConfig.contact.phoneHref} variant="ghost">
                Call / Text {siteConfig.contact.phoneDisplay}
              </LinkButton>
            </div>

            {highlights ? (
              <div className="flex flex-wrap gap-3">
                {highlights.map((highlight) => (
                  <span key={highlight} className="chip">
                    {highlight}
                  </span>
                ))}
              </div>
            ) : null}

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {launchStats.map((stat) => (
                <div key={stat.label} className="metric-card rounded-[1.4rem] px-4 py-4">
                  <div className="text-2xl font-semibold tracking-[0.04em] text-[var(--foreground)]">
                    {stat.value}
                  </div>
                  <div className="mt-1 text-sm uppercase tracking-[0.18em] text-muted">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <aside className="panel rounded-[1.8rem] p-6 sm:p-8">
            <p className="eyebrow">Why Customers Book</p>
            <h2 className="mt-3 text-3xl sm:text-4xl">{panelTitle}</h2>
            <ul className="list-checks mt-6 space-y-4 text-base leading-7 text-muted">
              {panelItems.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>

            <div className="glow-divider mt-7 pt-6">
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[var(--accent-soft)]">
                Fastest Path
              </p>
              <p className="mt-3 text-base leading-7 text-muted">
                Send the vehicle, the symptom or service, where the car is parked, and
                the best time window. That is usually enough to qualify the job quickly.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}

export function FaqList({ faqs }: FaqListProps) {
  return (
    <div className="overflow-hidden rounded-[1.8rem] border border-[var(--line)] bg-[rgba(255,255,255,0.03)]">
      {faqs.map((faq) => (
        <details
          key={faq.question}
          className="group border-b border-[var(--line)] p-6 last:border-b-0"
        >
          <summary className="cursor-pointer list-none pr-8 text-xl font-semibold text-[var(--foreground)] marker:hidden">
            {faq.question}
          </summary>
          <p className="mt-4 max-w-4xl text-base leading-7 text-muted">
            {faq.answer}
          </p>
        </details>
      ))}
    </div>
  );
}

export function CtaBand({ title, copy }: CtaBandProps) {
  return (
    <section className="shell section-space">
      <div className="hero-shell rounded-[2rem] px-6 py-8 sm:px-8 sm:py-10">
        <div className="relative z-10 grid gap-8 lg:grid-cols-[1.08fr_0.92fr] lg:items-end">
          <div>
            <p className="hero-kicker">Next Step</p>
            <h2 className="mt-3 text-4xl sm:text-5xl">{title}</h2>
          </div>
          <div>
            <p className="text-base leading-8 text-muted">{copy}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <LinkButton href="/contact">Schedule your appointment</LinkButton>
              <LinkButton href={siteConfig.contact.phoneHref} variant="secondary">
                Call / Text {siteConfig.contact.phoneDisplay}
              </LinkButton>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
