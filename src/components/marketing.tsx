"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Phone } from "lucide-react";
import { motion } from "framer-motion";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { AnimatedHeading } from "@/components/motion/animated-text";
import { FadeIn } from "@/components/motion/fade-in";
import { siteConfig } from "@/data/site";

type LinkButtonProps = {
  href: string;
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost";
  icon?: ReactNode;
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
  panelTitle?: string;
  panelItems?: string[];
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
  icon,
}: LinkButtonProps) {
  const styles = {
    primary:
      "inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-all hover:brightness-110 hover:shadow-lg hover:shadow-primary/20",
    secondary:
      "inline-flex items-center gap-2 rounded-full border border-border px-6 py-3 text-sm font-medium text-foreground transition-all hover:bg-secondary hover:border-transparent",
    ghost:
      "inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-medium text-muted-foreground transition-all hover:text-foreground hover:bg-secondary",
  };

  const isExternalAction =
    href.startsWith("tel:") ||
    href.startsWith("sms:") ||
    href.startsWith("mailto:") ||
    href.startsWith("http") ||
    href.startsWith("#");

  const content = (
    <>
      {icon}
      {children}
    </>
  );

  if (isExternalAction) {
    return (
      <a className={styles[variant]} href={href}>
        {content}
      </a>
    );
  }

  return (
    <Link className={styles[variant]} href={href}>
      {content}
    </Link>
  );
}

export function SectionHeading({ eyebrow, title, copy }: SectionHeadingProps) {
  return (
    <FadeIn className="max-w-3xl space-y-4">
      <p className="eyebrow">{eyebrow}</p>
      <h2 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
        {title}
      </h2>
      <p className="text-base leading-relaxed text-muted-foreground sm:text-lg">
        {copy}
      </p>
    </FadeIn>
  );
}

export function PageHero({
  eyebrow,
  title,
  copy,
  primaryLink,
  secondaryLink,
}: PageHeroProps) {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
        <div className="absolute right-0 top-0 h-[600px] w-[600px] -translate-y-1/2 translate-x-1/3 rounded-full bg-primary/5 blur-3xl" />
      </div>

      <div className="shell pt-16 pb-20 sm:pt-24 sm:pb-28 lg:pt-32 lg:pb-36">
        <div className="grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
          <div className="space-y-8">
            <FadeIn>
              <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-primary">
                {eyebrow}
              </span>
            </FadeIn>

            <AnimatedHeading
              text={title}
              gradient
              className="text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl"
              delay={0.1}
            />

            <FadeIn delay={0.3}>
              <p className="max-w-xl text-lg leading-relaxed text-muted-foreground">
                {copy}
              </p>
            </FadeIn>

            <FadeIn delay={0.4}>
              <div className="flex flex-wrap items-center gap-3">
                <LinkButton href={primaryLink.href}>
                  {primaryLink.label}
                  <ArrowRight className="h-4 w-4" />
                </LinkButton>
                {secondaryLink && (
                  <LinkButton href={secondaryLink.href} variant="secondary">
                    {secondaryLink.label}
                  </LinkButton>
                )}
              </div>
            </FadeIn>

            <FadeIn delay={0.5}>
              <div className="flex items-center gap-4 pt-2">
                <a
                  href={siteConfig.contact.phoneHref}
                  className="flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  <Phone className="h-4 w-4 text-primary" />
                  {siteConfig.contact.phoneDisplay}
                </a>
                <span className="h-4 w-px bg-border" />
                <span className="text-sm text-muted-foreground">Spokane County, WA</span>
              </div>
            </FadeIn>
          </div>

          <FadeIn direction="right" delay={0.3}>
            <div className="relative aspect-[4/3] overflow-hidden rounded-3xl">
              <Image
                src="/hero-mechanic.png"
                alt="Professional mobile mechanic servicing a vehicle in a residential driveway"
                fill
                className="object-cover"
                priority
                sizes="(max-width: 1024px) 100vw, 45vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/60 via-transparent to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-6">
                <div className="flex items-center gap-4">
                  <div className="rounded-2xl border border-border/50 bg-background/80 px-4 py-3 backdrop-blur-sm">
                    <p className="text-2xl font-bold text-foreground">5.0</p>
                    <p className="text-xs text-muted-foreground">Rating</p>
                  </div>
                  <div className="rounded-2xl border border-border/50 bg-background/80 px-4 py-3 backdrop-blur-sm">
                    <p className="text-2xl font-bold text-foreground">0</p>
                    <p className="text-xs text-muted-foreground">Shop trips needed</p>
                  </div>
                </div>
              </div>
            </div>
          </FadeIn>
        </div>
      </div>
    </section>
  );
}

export function FaqList({ faqs }: FaqListProps) {
  return (
    <FadeIn>
      <Accordion className="w-full">
        {faqs.map((faq, i) => (
          <AccordionItem key={faq.question} value={`item-${i}`} className="border-border">
            <AccordionTrigger className="text-left text-lg font-semibold text-foreground hover:text-primary hover:no-underline">
              {faq.question}
            </AccordionTrigger>
            <AccordionContent className="text-base leading-relaxed text-muted-foreground">
              {faq.answer}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </FadeIn>
  );
}

export function CtaBand({ title, copy }: CtaBandProps) {
  return (
    <section className="shell section-space">
      <motion.div
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/10 via-card to-card border border-border p-8 sm:p-12 lg:p-16"
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
      >
        <div className="absolute -right-20 -top-20 h-60 w-60 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-60 w-60 rounded-full bg-primary/5 blur-3xl" />

        <div className="relative z-10 grid gap-8 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="eyebrow">Ready to get started?</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
              {title}
            </h2>
          </div>
          <div>
            <p className="text-base leading-relaxed text-muted-foreground">
              {copy}
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <LinkButton href="/contact">
                Schedule Now
                <ArrowRight className="h-4 w-4" />
              </LinkButton>
              <LinkButton href={siteConfig.contact.phoneHref} variant="secondary" icon={<Phone className="h-4 w-4" />}>
                {siteConfig.contact.phoneDisplay}
              </LinkButton>
            </div>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
