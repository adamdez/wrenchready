"use client";

import type { ReactNode } from "react";
import Link from "next/link";
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
import { HeroGradientBg, SectionOrbs } from "@/components/motion/gradient-orbs";
import { siteConfig } from "@/data/site";

type LinkButtonProps = {
  href: string;
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost" | "gold";
  icon?: ReactNode;
};

type SectionHeadingProps = {
  eyebrow: string;
  title: string;
  copy: string;
  tint?: "blue" | "teal" | "gold";
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
      "btn-shimmer inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3.5 text-sm font-semibold text-primary-foreground transition-all hover:brightness-110 hover:shadow-lg hover:shadow-primary/25 hover:scale-[1.02]",
    secondary:
      "inline-flex items-center gap-2 rounded-full border border-border px-7 py-3.5 text-sm font-medium text-foreground transition-all hover:bg-secondary hover:border-transparent hover:scale-[1.02]",
    ghost:
      "inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-sm font-medium text-muted-foreground transition-all hover:text-foreground hover:bg-secondary",
    gold:
      "btn-shimmer inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[--wr-gold] to-[--wr-gold-soft] px-7 py-3.5 text-sm font-bold text-[--wr-surface] transition-all hover:shadow-lg hover:shadow-[--wr-gold]/20 hover:scale-[1.02]",
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

export function SectionHeading({ eyebrow, title, copy, tint = "blue" }: SectionHeadingProps) {
  const tintColors = {
    blue: "from-[--wr-blue] to-[--wr-blue-soft]",
    teal: "from-[--wr-teal] to-[--wr-blue-soft]",
    gold: "from-[--wr-gold] to-[--wr-gold-soft]",
  };

  return (
    <FadeIn className="max-w-4xl space-y-5">
      <p className="eyebrow">{eyebrow}</p>
      <h2 className="text-3xl font-bold tracking-[-0.02em] sm:text-4xl lg:text-5xl xl:text-[3.25rem]">
        {title}
      </h2>
      <p className="text-base leading-relaxed text-muted-foreground sm:text-lg lg:text-xl/[1.65]">
        {copy}
      </p>
      <motion.div
        className={`h-1 w-16 rounded-full bg-gradient-to-r ${tintColors[tint]}`}
        initial={{ width: 0, opacity: 0 }}
        whileInView={{ width: 64, opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
      />
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
      <HeroGradientBg />

      <div className="absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-1/2 h-[1px] w-[800px] -translate-x-1/2 -translate-y-1/2 -rotate-12 bg-gradient-to-r from-transparent via-[--wr-blue]/20 to-transparent" />
        <div className="absolute left-1/3 top-1/3 h-[1px] w-[500px] -translate-x-1/2 rotate-[20deg] bg-gradient-to-r from-transparent via-[--wr-teal]/10 to-transparent" />
      </div>

      <div className="shell pt-20 pb-24 sm:pt-28 sm:pb-32 lg:pt-36 lg:pb-40">
        <div className="mx-auto max-w-4xl text-center">
          <FadeIn>
            <motion.span
              className="inline-flex items-center gap-2 rounded-full border border-[--wr-teal]/20 bg-[--wr-teal]/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest"
              style={{ color: "var(--wr-teal)" }}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[--wr-teal] opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-[--wr-teal]" />
              </span>
              {eyebrow}
            </motion.span>
          </FadeIn>

          <AnimatedHeading
            text={title}
            gradient
            className="mx-auto mt-8 max-w-3xl text-5xl font-bold leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl"
            delay={0.15}
          />

          <FadeIn delay={0.4}>
            <p className="mx-auto mt-8 max-w-2xl text-lg leading-relaxed text-muted-foreground sm:text-xl">
              {copy}
            </p>
          </FadeIn>

          <FadeIn delay={0.55}>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
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

          <FadeIn delay={0.7}>
            <div className="mt-10 flex items-center justify-center gap-6">
              <a
                href={siteConfig.contact.phoneHref}
                className="flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                <Phone className="h-4 w-4" style={{ color: "var(--wr-teal)" }} />
                {siteConfig.contact.phoneDisplay}
              </a>
              <span className="h-4 w-px bg-border" />
              <span className="text-sm text-muted-foreground">{siteConfig.contact.schedule}</span>
            </div>
          </FadeIn>

          {/* Animated scroll indicator */}
          <FadeIn delay={1}>
            <motion.div
              className="mx-auto mt-16 flex flex-col items-center gap-2 text-muted-foreground/50"
              animate={{ y: [0, 8, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            >
              <span className="text-[10px] uppercase tracking-widest">Scroll</span>
              <div className="h-8 w-[1px] bg-gradient-to-b from-muted-foreground/40 to-transparent" />
            </motion.div>
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
        className="relative overflow-hidden rounded-3xl border border-[--wr-gold]/15 p-8 sm:p-12 lg:p-16"
        style={{
          background: `
            radial-gradient(ellipse 60% 50% at 20% 80%, oklch(0.78 0.14 85 / 8%) 0%, transparent 70%),
            radial-gradient(ellipse 50% 40% at 80% 20%, oklch(0.62 0.19 255 / 6%) 0%, transparent 70%),
            oklch(0.11 0.02 255)
          `,
        }}
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
      >
        <SectionOrbs variant="gold" />

        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-[--wr-gold]/10 blur-3xl pulse-glow" />
        <div className="absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-[--wr-blue]/8 blur-3xl pulse-glow" style={{ animationDelay: "2s" }} />

        <div className="relative z-10 grid gap-8 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="eyebrow" style={{ color: "var(--wr-gold)" }}>Ready to get started?</p>
            <h2 className="gradient-text-gold mt-3 text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
              {title}
            </h2>
          </div>
          <div>
            <p className="text-base leading-relaxed text-muted-foreground">
              {copy}
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <LinkButton href="/contact" variant="gold">
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
