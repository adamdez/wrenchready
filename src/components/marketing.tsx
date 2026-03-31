import type { ReactNode } from "react";
import Link from "next/link";

type LinkButtonProps = {
  href: string;
  children: ReactNode;
  variant?: "primary" | "secondary";
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
  const className = variant === "primary" ? "button-primary" : "button-secondary";
  const isExternalAction =
    href.startsWith("tel:") ||
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
      <p className="text-base leading-8 text-[var(--muted)] sm:text-lg">
        {copy}
      </p>
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
      <div className="grid gap-8 lg:grid-cols-[1.08fr_0.92fr] lg:items-end">
        <div className="space-y-7">
          <p className="eyebrow">{eyebrow}</p>
          <h1 className="max-w-4xl text-5xl leading-none sm:text-6xl xl:text-7xl">
            {title}
          </h1>
          <p className="max-w-3xl text-lg leading-8 text-[var(--muted)] sm:text-xl">
            {copy}
          </p>
          <div className="flex flex-wrap gap-3">
            <LinkButton href={primaryLink.href}>{primaryLink.label}</LinkButton>
            {secondaryLink ? (
              <LinkButton href={secondaryLink.href} variant="secondary">
                {secondaryLink.label}
              </LinkButton>
            ) : null}
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
        </div>

        <aside className="panel rounded-[2.5rem] p-8">
          <p className="eyebrow">Launch Positioning</p>
          <h2 className="mt-3 text-4xl">{panelTitle}</h2>
          <ul className="mt-8 space-y-4 text-base leading-7 text-[var(--muted)]">
            {panelItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </aside>
      </div>
    </section>
  );
}

export function FaqList({ faqs }: FaqListProps) {
  return (
    <div className="overflow-hidden rounded-[2rem] border border-[var(--line)] bg-[var(--card)]">
      {faqs.map((faq) => (
        <details
          key={faq.question}
          className="group border-b border-[var(--line)] p-6 last:border-b-0"
        >
          <summary className="cursor-pointer list-none pr-8 text-xl font-semibold text-[var(--foreground)] marker:hidden">
            {faq.question}
          </summary>
          <p className="mt-4 max-w-4xl text-base leading-7 text-[var(--muted)]">
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
      <div className="panel rounded-[2.5rem] bg-[var(--card-strong)] p-8 text-white sm:p-10">
        <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.34em] text-[var(--accent-soft)]">
              Next Step
            </p>
            <h2 className="mt-3 text-4xl sm:text-5xl">{title}</h2>
          </div>
          <div>
            <p className="text-base leading-8 text-white/76">{copy}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <LinkButton href="/contact">Schedule your appointment</LinkButton>
              <LinkButton href="/services" variant="secondary">
                Compare services
              </LinkButton>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
