// Add this to your root layout <head> or _document if not already present:
// <script src="https://assets.calendly.com/assets/external/widget.js" type="text/javascript" async></script>

"use client";

import { FaqList, SectionHeading } from "@/components/marketing";
import { BrandLockup } from "@/components/brand-logo";
import { HeroBackground } from "@/components/hero-background";
import { FadeIn, Stagger, StaggerItem } from "@/components/motion/fade-in";
import { SectionOrbs } from "@/components/motion/gradient-orbs";
import { AnimatedHeading, CountUp } from "@/components/motion/animated-text";
import {
  homeFaqs,
  locations,
  processSteps,
  reviews,
  services,
  siteConfig,
} from "@/data/site";
import {
  Wrench,
  Shield,
  Clock,
  MapPin,
  ArrowRight,
  CheckCircle2,
  Star,
  Zap,
  Eye,
  Route,
  Phone,
  Calendar,
  Camera,
  ClipboardCheck,
  FileText,
  Bell,
  Send,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  CircleCheck,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { motion, useMotionValue, useTransform, useSpring, AnimatePresence } from "framer-motion";
import { useRef, useState, useEffect, type MouseEvent as ReactMouseEvent, type FormEvent } from "react";

const serviceImages: Record<string, string> = {
  "oil-change": "/service-oil-change.png",
  "brake-repair": "/service-brakes.png",
  "battery-replacement": "/service-battery.png",
  "check-engine-diagnostics": "/service-diagnostics.png",
  "pre-purchase-inspection": "/service-inspection.png",
};

const serviceIcons: Record<string, React.ReactNode> = {
  "oil-change": <Wrench className="h-5 w-5" />,
  "brake-repair": <Shield className="h-5 w-5" />,
  "battery-replacement": <Zap className="h-5 w-5" />,
  "check-engine-diagnostics": <Eye className="h-5 w-5" />,
  "pre-purchase-inspection": <CheckCircle2 className="h-5 w-5" />,
};

const serviceGradients: Record<string, { border: string; icon: string; glow: string }> = {
  "oil-change": {
    border: "from-[--wr-gold]/30 via-transparent to-transparent",
    icon: "bg-[--wr-gold]/10 text-[--wr-gold]",
    glow: "group-hover:shadow-[--wr-gold]/8",
  },
  "brake-repair": {
    border: "from-red-500/30 via-transparent to-transparent",
    icon: "bg-red-500/10 text-red-400",
    glow: "group-hover:shadow-red-500/8",
  },
  "battery-replacement": {
    border: "from-[--wr-teal]/30 via-transparent to-transparent",
    icon: "bg-[--wr-teal]/10 text-[--wr-teal]",
    glow: "group-hover:shadow-[--wr-teal]/8",
  },
  "check-engine-diagnostics": {
    border: "from-[--wr-blue]/30 via-transparent to-transparent",
    icon: "bg-[--wr-blue]/10 text-[--wr-blue-soft]",
    glow: "group-hover:shadow-[--wr-blue]/8",
  },
  "pre-purchase-inspection": {
    border: "from-[--wr-purple]/30 via-transparent to-transparent",
    icon: "bg-[--wr-purple]/10 text-[--wr-purple]",
    glow: "group-hover:shadow-[--wr-purple]/8",
  },
};

const trustFeatures = [
  { icon: <Shield className="h-5 w-5" />, label: "Licensed & Insured", color: "text-[--wr-blue-soft]" },
  { icon: <Star className="h-5 w-5" />, label: "New in Spokane", color: "text-[--wr-gold]" },
  { icon: <Clock className="h-5 w-5" />, label: "Same-Week Scheduling", color: "text-[--wr-teal]" },
  { icon: <Route className="h-5 w-5" />, label: "Focused Routes", color: "text-[--wr-blue-soft]" },
  { icon: <Eye className="h-5 w-5" />, label: "Photo Reports", color: "text-[--wr-teal]" },
  { icon: <CheckCircle2 className="h-5 w-5" />, label: "No Hidden Fees", color: "text-[--wr-gold]" },
];

const processIcons = [
  <Send key="send" className="h-5 w-5" />,
  <ClipboardCheck key="screen" className="h-5 w-5" />,
  <Wrench key="wrench" className="h-5 w-5" />,
  <FileText key="report" className="h-5 w-5" />,
];

const heroTrustItems = [
  { icon: <ClipboardCheck className="h-4 w-4" />, label: "25-Point Inspection" },
  { icon: <Camera className="h-4 w-4" />, label: "Photo Reports" },
  { icon: <CircleCheck className="h-4 w-4" />, label: "Honest Recommendations" },
];

function scrollToBook() {
  const el = document.getElementById("book");
  if (el) el.scrollIntoView({ behavior: "smooth" });
}

function TiltCard({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useSpring(useTransform(y, [-0.5, 0.5], [5, -5]), { stiffness: 300, damping: 30 });
  const rotateY = useSpring(useTransform(x, [-0.5, 0.5], [-5, 5]), { stiffness: 300, damping: 30 });
  const [tiltEnabled, setTiltEnabled] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const red = window.matchMedia("(prefers-reduced-motion: reduce)");
    function sync() {
      setTiltEnabled(mq.matches && !red.matches);
    }
    sync();
    mq.addEventListener("change", sync);
    red.addEventListener("change", sync);
    return () => {
      mq.removeEventListener("change", sync);
      red.removeEventListener("change", sync);
    };
  }, []);

  function handleMouse(e: ReactMouseEvent<HTMLDivElement>) {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    x.set((e.clientX - rect.left) / rect.width - 0.5);
    y.set((e.clientY - rect.top) / rect.height - 0.5);
  }

  if (!tiltEnabled) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      ref={ref}
      className={className}
      style={{ rotateX, rotateY, transformPerspective: 800 }}
      onMouseMove={handleMouse}
      onMouseLeave={() => { x.set(0); y.set(0); }}
    >
      {children}
    </motion.div>
  );
}

function FloatingBookFab() {
  const [visible, setVisible] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    function onScroll() {
      setVisible(window.scrollY > 600);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    function sync() {
      setReduceMotion(mq.matches);
    }
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.button
          onClick={scrollToBook}
          initial={{ opacity: 0, scale: 0.98, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.98, y: 12 }}
          transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
          className="fixed bottom-24 right-4 z-50 inline-flex items-center gap-2 rounded-full px-5 py-3.5 text-sm font-semibold text-white shadow-[0_12px_40px_rgba(0,0,0,0.35)] md:hidden"
          style={{ background: "linear-gradient(135deg, var(--wr-teal), var(--wr-blue))" }}
          aria-label="Book same-week slot"
        >
          {reduceMotion ? (
            <Calendar className="h-4 w-4 shrink-0" />
          ) : (
            <motion.span
              animate={{ scale: [1, 1.08, 1] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
            >
              <Calendar className="h-4 w-4" />
            </motion.span>
          )}
          Book
        </motion.button>
      )}
    </AnimatePresence>
  );
}

function ReviewCarousel() {
  const [current, setCurrent] = useState(0);
  const count = reviews.length;

  if (count === 0) {
    return (
      <div className="relative">
        <div className="overflow-hidden rounded-2xl border border-border bg-card/40 backdrop-blur-sm p-8 sm:p-10 text-center">
          <h3 className="text-2xl font-bold text-foreground">
            We just launched. Reviews are coming.
          </h3>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground max-w-md mx-auto">
            We opened this week in Spokane. Book a service and you&apos;ll see why the reviews will speak for themselves.
          </p>
          <div className="mt-6">
            <a
              href="https://www.google.com/maps/place/Wrench+Ready+Mobile"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm font-medium text-primary transition-colors hover:text-primary/80"
            >
              See Us on Google Maps
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      </div>
    );
  }

  function next() { setCurrent((c) => (c + 1) % count); }
  function prev() { setCurrent((c) => (c - 1 + count) % count); }

  return (
    <div className="relative">
      <div className="overflow-hidden rounded-2xl border border-border bg-card/40 backdrop-blur-sm">
        <AnimatePresence mode="wait">
          <motion.div
            key={current}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
            className="p-8 sm:p-10"
          >
            <div className="flex items-center gap-1">
              {Array.from({ length: reviews[current].rating }).map((_, i) => (
                <Star key={i} className="h-5 w-5 fill-[--wr-gold] text-[--wr-gold]" />
              ))}
            </div>
            <blockquote className="mt-5 text-lg leading-relaxed text-foreground sm:text-xl">
              &ldquo;{reviews[current].text}&rdquo;
            </blockquote>
            <div className="mt-6 flex items-center justify-between">
              <div>
                <p className="font-semibold text-foreground">{reviews[current].name}</p>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {reviews[current].vehicle} &middot; {reviews[current].service}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {Array.from({ length: count }).map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrent(i)}
                    className={`h-2 rounded-full transition-all ${
                      i === current ? "w-6 bg-[--wr-teal]" : "w-2 bg-border hover:bg-muted-foreground/40"
                    }`}
                    aria-label={`Go to review ${i + 1}`}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <div className="flex gap-2">
          <button
            onClick={prev}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            aria-label="Previous review"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={next}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            aria-label="Next review"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <a
          href="https://www.google.com/maps/place/Wrench+Ready+Mobile"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          See All Google Reviews
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>
    </div>
  );
}

function IntakeForm() {
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form));

    // In production: POST to n8n / Zapier / OpenPhone workflow → triggers auto-text + admin dashboard entry (Blocker 2)
    console.log("[WrenchReady Intake]", data);

    setSubmitted(true);
  }

  if (submitted) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="rounded-2xl border border-[--wr-teal]/20 bg-[--wr-teal]/5 p-8 text-center"
      >
        <CheckCircle2 className="mx-auto h-12 w-12 text-[--wr-teal]" />
        <h3 className="mt-4 text-xl font-bold text-foreground">Thank you.</h3>
        <p className="mt-2 text-base leading-relaxed text-muted-foreground">
          Your intake has been received. Dez will call you within 15 minutes to confirm and schedule.
        </p>
      </motion.div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Q1: Vehicle */}
      <fieldset className="space-y-2">
        <legend className="text-sm font-semibold text-foreground">1. Vehicle Details</legend>
        <div className="grid gap-3 sm:grid-cols-4">
          <input type="text" name="year" placeholder="Year" className="form-input" required />
          <input type="text" name="make" placeholder="Make" className="form-input" required />
          <input type="text" name="model" placeholder="Model" className="form-input" required />
          <input type="text" name="mileage" placeholder="Approx. mileage" className="form-input" />
        </div>
      </fieldset>

      {/* Q2: Symptom / service */}
      <fieldset className="space-y-2">
        <legend className="text-sm font-semibold text-foreground">2. What do you need done?</legend>
        <select name="service" className="form-input" required defaultValue="">
          <option value="" disabled>Select a service or describe below...</option>
          {services.map((s) => (
            <option key={s.slug} value={s.slug}>{s.name}</option>
          ))}
          <option value="other">Other / Not sure</option>
        </select>
        <textarea
          name="symptom"
          placeholder="Describe the symptom, noise, or service needed..."
          className="form-textarea"
          rows={3}
        />
      </fieldset>

      {/* Q3: Address */}
      <fieldset className="space-y-2">
        <legend className="text-sm font-semibold text-foreground">3. Where is the vehicle parked?</legend>
        <input
          type="text"
          name="address"
          placeholder="Street address or ZIP code"
          className="form-input"
          required
        />
      </fieldset>

      {/* Q4: Driveway condition */}
      <fieldset className="space-y-2">
        <legend className="text-sm font-semibold text-foreground">4. Is the driveway paved and relatively flat?</legend>
        <select name="driveway" className="form-input" required defaultValue="">
          <option value="" disabled>Select...</option>
          <option value="yes-paved-flat">Yes — paved and flat</option>
          <option value="yes-paved-slight-slope">Yes — paved with a slight slope</option>
          <option value="gravel-flat">Gravel but flat</option>
          <option value="steep-or-uneven">Steep slope or uneven surface</option>
          <option value="parking-lot">Parking lot or garage</option>
          <option value="street">Street parking</option>
        </select>
      </fieldset>

      {/* Q5: Prior diagnosis */}
      <fieldset className="space-y-2">
        <legend className="text-sm font-semibold text-foreground">5. Has anyone else already looked at this?</legend>
        <select name="prior_diagnosis" className="form-input" required defaultValue="">
          <option value="" disabled>Select...</option>
          <option value="no">No — first time having it looked at</option>
          <option value="yes-shop">Yes — a shop diagnosed it</option>
          <option value="yes-self">Yes — I looked into it myself</option>
          <option value="routine">Not applicable — routine maintenance</option>
        </select>
      </fieldset>

      {/* Contact */}
      <fieldset className="space-y-2">
        <legend className="text-sm font-semibold text-foreground">Your contact info</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          <input type="text" name="name" placeholder="Full name" className="form-input" required />
          <input type="tel" name="phone" placeholder="Phone number" className="form-input" required />
        </div>
      </fieldset>

      <button
        type="submit"
        className="btn-shimmer inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-7 py-4 text-base font-semibold text-primary-foreground transition-all hover:brightness-110 hover:shadow-lg hover:shadow-primary/25 sm:w-auto"
      >
        <ClipboardCheck className="h-4 w-4" />
        Get My Free 25-Point Inspection Quote
      </button>
    </form>
  );
}

export function HomePage() {
  return (
    <>
      {/* Floating mobile-only "Book" FAB — appears after scrolling past hero */}
      <FloatingBookFab />

      {/* ── Hero — poster + optional loop (see src/data/hero-media.ts) ── */}
      <section id="home" className="relative min-h-[88vh] overflow-hidden">
        <HeroBackground />

        <div className="shell relative flex min-h-[88vh] flex-col justify-end gap-12 pt-24 pb-16 sm:justify-center sm:pt-28 sm:pb-20 lg:pt-32 lg:pb-24">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:items-end lg:gap-16">
            <div className="max-w-2xl space-y-7">
              <FadeIn>
                <BrandLockup variant="hero" priority />
              </FadeIn>

              <FadeIn delay={0.08}>
                <span className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.06] px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/85 backdrop-blur-md sm:text-xs">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[--wr-teal] opacity-60" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[--wr-teal]" />
                  </span>
                  Mobile mechanic · Spokane County
                </span>
              </FadeIn>

              <AnimatedHeading
                text="Your mechanic comes to you."
                gradient
                className="text-4xl font-semibold leading-[1.08] tracking-[-0.03em] sm:text-5xl sm:leading-[1.06] lg:text-6xl lg:leading-[1.05]"
                delay={0.12}
              />

              <FadeIn delay={0.28}>
                <p className="max-w-lg text-lg font-medium leading-snug text-white/85 sm:text-xl">
                  Every job is built to earn the next visit — not the biggest invoice.
                </p>
              </FadeIn>

              <FadeIn delay={0.36}>
                <p className="max-w-lg text-[15px] leading-relaxed text-white/58 sm:text-base">
                  Oil changes, brakes, batteries, diagnostics, and inspections at your home or workplace. No shop drop-off. No waiting room.
                </p>
              </FadeIn>

              <FadeIn delay={0.44}>
                <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                  <button
                    type="button"
                    onClick={scrollToBook}
                    className="btn-shimmer inline-flex min-h-[3rem] w-full items-center justify-center gap-2 rounded-full bg-primary px-8 py-3.5 text-[15px] font-semibold text-primary-foreground shadow-[0_8px_32px_oklch(0.62_0.19_255_/_25%)] transition-all hover:brightness-110 sm:w-auto"
                  >
                    <Calendar className="h-5 w-5 shrink-0" />
                    Book a visit
                  </button>
                  <a
                    href={siteConfig.contact.phoneHref}
                    className="inline-flex min-h-[3rem] w-full items-center justify-center gap-2 rounded-full border border-white/18 bg-white/[0.07] px-7 py-3.5 text-[15px] font-medium text-white backdrop-blur-md transition-colors hover:bg-white/12 sm:w-auto"
                  >
                    <Phone className="h-5 w-5 shrink-0" />
                    Call {siteConfig.contact.phoneDisplay}
                  </a>
                </div>
                <p className="mt-3 text-xs text-white/45">
                  Same-week slots when routing allows. Dez confirms every booking.
                </p>
              </FadeIn>

              <FadeIn delay={0.52}>
                <ul className="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:gap-x-6 sm:gap-y-2">
                  {heroTrustItems.map((item) => (
                    <li key={item.label} className="flex items-center gap-2 text-sm font-medium text-white/72">
                      <span className="text-[--wr-teal]">{item.icon}</span>
                      {item.label}
                    </li>
                  ))}
                </ul>
              </FadeIn>
            </div>

            <FadeIn delay={0.2} direction="none" className="lg:pb-1">
              <div className="grid grid-cols-3 gap-2 sm:gap-3 lg:max-w-md lg:ml-auto">
                <div className="rounded-2xl border border-white/10 bg-black/35 px-3 py-4 text-center backdrop-blur-md sm:px-4">
                  <span className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-white/45">Status</span>
                  <span className="mt-2 block text-sm font-semibold text-[--wr-teal] sm:text-base">Now booking</span>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/35 px-3 py-4 text-center backdrop-blur-md sm:px-4">
                  <span className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-white/45">Shop trips</span>
                  <span className="mt-2 block text-2xl font-semibold tabular-nums text-white sm:text-3xl">0</span>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/35 px-3 py-4 text-center backdrop-blur-md sm:px-4">
                  <span className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-white/45">Inspection</span>
                  <span className="mt-2 block text-2xl font-semibold tabular-nums text-white sm:text-3xl">25</span>
                </div>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* ── Trust strip ── */}
      <section className="relative border-y border-border/80 bg-[--wr-surface-raised]/50">
        <div className="absolute inset-0 bg-gradient-to-r from-[--wr-blue]/[0.04] via-transparent to-[--wr-teal]/[0.05]" />
        <div className="shell relative py-5 sm:py-6">
          <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3 lg:grid-cols-6 lg:gap-x-6">
            {trustFeatures.map((feature) => (
              <div
                key={feature.label}
                className="flex items-center gap-2.5 text-[13px] font-medium leading-tight text-muted-foreground sm:text-sm"
              >
                <span className={`shrink-0 ${feature.color}`}>{feature.icon}</span>
                <span>{feature.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Services ── */}
      <section id="services" className="relative mesh-section-blue">
        <div className="shell section-space">
          <SectionHeading
            eyebrow="Services"
            title="Five lanes. No vague everything-menu."
            copy="Maintenance, brakes, batteries, diagnostics, and inspections — the work that fits mobile. Every visit includes a 25-point inspection and Now / Soon / Monitor notes."
            tint="blue"
          />

          <Stagger className="mt-12 grid gap-4 sm:gap-5 md:grid-cols-2 lg:grid-cols-3" staggerDelay={0.08}>
            {services.map((service, i) => {
              const gradient = serviceGradients[service.slug] ?? serviceGradients["oil-change"];
              const image = serviceImages[service.slug];
              const featured = i === 0;
              return (
                <StaggerItem
                  key={service.slug}
                  className={featured ? "md:col-span-2" : ""}
                >
                  <TiltCard className="h-full">
                    <div
                      className={`glass-card group relative flex h-full flex-col overflow-hidden rounded-2xl ${gradient.glow} hover:shadow-2xl`}
                    >
                      <div className={`absolute inset-x-0 top-0 h-px bg-gradient-to-r ${gradient.border}`} />

                      <Link href={`/services/${service.slug}`} className="block">
                        <div
                          className={`relative w-full overflow-hidden ${featured ? "aspect-[21/9] sm:aspect-[2.4/1]" : "aspect-[16/10]"}`}
                        >
                          <Image
                            src={image}
                            alt={`${service.name} — professional mobile mechanic service in Spokane, WA`}
                            fill
                            loading="lazy"
                            className="object-cover transition-transform duration-500 group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                            sizes={featured ? "(max-width: 768px) 100vw, 66vw" : "(max-width: 1024px) 100vw, 33vw"}
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-[--wr-surface] via-[--wr-surface]/35 to-transparent" />
                          <div className="absolute bottom-3 left-4 flex items-end gap-3">
                            <span className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${gradient.icon}`}>
                              {serviceIcons[service.slug]}
                            </span>
                          </div>
                          <div className="absolute bottom-3 right-4">
                            <span className="rounded-full border border-[--wr-gold]/25 bg-background/85 px-3 py-1.5 text-sm font-semibold tabular-nums text-[--wr-gold] backdrop-blur-sm sm:px-4 sm:py-2 sm:text-base">
                              {service.priceFrom}
                            </span>
                          </div>
                        </div>
                      </Link>

                      <div className="flex flex-1 flex-col p-5 sm:p-6">
                        <Link href={`/services/${service.slug}`}>
                          <h3 className={`font-semibold tracking-tight text-foreground ${featured ? "text-xl sm:text-2xl" : "text-lg sm:text-xl"}`}>
                            {service.name}
                          </h3>
                        </Link>
                        <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground sm:text-[15px]">
                          {service.teaser}
                        </p>

                        <div className="mt-4 inline-flex w-fit flex-wrap items-center gap-x-2 gap-y-1 rounded-full border border-[--wr-teal]/18 bg-[--wr-teal]/[0.07] px-3 py-1.5">
                          <FileText className="h-3.5 w-3.5 shrink-0 text-[--wr-teal]" />
                          <span className="text-xs font-semibold text-[--wr-teal]">Now / Soon / Monitor</span>
                          <span className="text-xs text-muted-foreground">on every visit</span>
                        </div>

                        <div className="mt-5 flex flex-col gap-3 border-t border-border/60 pt-4 sm:flex-row sm:items-center sm:justify-between">
                          <span className="text-xs font-medium text-muted-foreground">{service.duration}</span>
                          <div className="flex flex-wrap items-center gap-2">
                            <Link
                              href={`/services/${service.slug}`}
                              className="inline-flex items-center gap-1 text-sm font-medium text-primary transition-colors hover:text-primary/85"
                            >
                              Details <ArrowRight className="h-3.5 w-3.5" />
                            </Link>
                            <button
                              type="button"
                              onClick={scrollToBook}
                              className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90"
                            >
                              <Calendar className="h-3.5 w-3.5" />
                              Book
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </TiltCard>
                </StaggerItem>
              );
            })}
          </Stagger>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section id="how-it-works" className="relative mesh-section-teal border-y border-border">
        <SectionOrbs variant="teal" />
        <div className="shell section-space">
          <div className="grid gap-12 lg:grid-cols-[1fr_1fr] lg:gap-16 lg:items-center">
            <FadeIn direction="left">
              <div className="relative aspect-[4/3] overflow-hidden rounded-3xl border border-border/50">
                <Image
                  src="/hero-process.png"
                  alt="Wrench Ready Mobile technician completing a brake inspection in a Spokane driveway with tools and inspection checklist visible"
                  fill
                  loading="lazy"
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-background/50 via-transparent to-transparent" />
                <div className="absolute -inset-4 -z-10 rounded-[2rem] bg-gradient-to-br from-[--wr-teal]/10 to-transparent blur-2xl" />
              </div>
            </FadeIn>

            <div>
              <SectionHeading
                eyebrow="How It Works"
                title="Four steps. That's it."
                copy="Send us a message, we screen the job, show up on time, and leave you with a clear plan."
                tint="teal"
              />

              <div className="mt-10 space-y-6">
                {processSteps.map((step, index) => (
                  <FadeIn key={step.title} delay={index * 0.15} direction="right">
                    <div className="flex gap-4">
                      <motion.div
                        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
                        style={{
                          background: `linear-gradient(135deg, oklch(0.72 0.14 195 / 15%), oklch(0.62 0.19 255 / 10%))`,
                          border: "1px solid oklch(0.72 0.14 195 / 20%)",
                          color: "var(--wr-teal)",
                        }}
                        initial={{ scale: 0 }}
                        whileInView={{ scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ delay: index * 0.15 + 0.2, duration: 0.4, ease: "backOut" }}
                      >
                        {processIcons[index]}
                      </motion.div>
                      <div>
                        <h3 className="text-base font-bold text-foreground">{step.title}</h3>
                        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{step.copy}</p>
                      </div>
                    </div>
                  </FadeIn>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats ── */}
      <section className="relative overflow-hidden">
        <SectionOrbs variant="blue" />
        <div className="shell py-20 sm:py-28">
          <motion.div
            className="grid grid-cols-2 gap-10 lg:grid-cols-4"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            transition={{ staggerChildren: 0.15 }}
          >
            {[
              { value: 0, suffix: "", label: "Shop drop-offs", color: "--wr-teal" },
              { value: 25, suffix: "-pt", label: "Inspection included", color: "--wr-gold" },
              { value: 5, suffix: "", label: "Service lanes", color: "--wr-blue-soft" },
              { value: 4, suffix: "+", label: "Coverage areas", color: "--wr-purple" },
            ].map((stat) => (
              <motion.div
                key={stat.label}
                className="text-center"
                variants={{
                  hidden: { opacity: 0, y: 30 },
                  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
                }}
              >
                <div className="relative inline-block">
                  <CountUp
                    target={stat.value}
                    suffix={stat.suffix}
                    className="text-4xl font-bold text-foreground sm:text-5xl lg:text-6xl"
                  />
                  <motion.div
                    className="mt-2 h-1 rounded-full"
                    style={{ background: `var(${stat.color})` }}
                    initial={{ width: 0 }}
                    whileInView={{ width: "60%" }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8, delay: 0.4 }}
                  />
                </div>
                <p className="mt-3 text-sm text-muted-foreground">{stat.label}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── Reviews ── */}
      <section id="reviews" className="relative border-y border-border">
        <div className="absolute inset-0 bg-gradient-to-b from-[--wr-gold]/3 via-transparent to-[--wr-teal]/3" />
        <div className="shell section-space relative">
          <div className="grid gap-12 lg:grid-cols-[1fr_1.2fr] lg:gap-16 lg:items-start">
            <div>
              <SectionHeading
                eyebrow="Reviews"
                title="What Spokane drivers are saying."
                copy="Real feedback from customers who chose honest, mobile-first auto service over the shop shuffle."
                tint="gold"
              />

              <FadeIn delay={0.3}>
                <div className="mt-8 flex flex-col gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Every visit is designed to earn the next one — through honest findings, clear communication, and work you can verify yourself.
                    </p>
                  </div>
                </div>
              </FadeIn>
            </div>

            <FadeIn delay={0.2}>
              <ReviewCarousel />
            </FadeIn>
          </div>
        </div>
      </section>

      {/* ── Service Areas ── */}
      <section id="areas" className="relative border-b border-border overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <Image
            src="/hero-locations.png"
            alt="Aerial view of Spokane County showing the Wrench Ready Mobile service coverage area including Spokane, Spokane Valley, Liberty Lake, and South Hill"
            fill
            loading="lazy"
            className="object-cover"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-background/90 backdrop-blur-sm" />
          <div className="absolute inset-0 bg-gradient-to-b from-background via-transparent to-background" />
        </div>

        <div className="shell section-space relative">
          <SectionHeading
            eyebrow="Service Areas"
            title="Focused routes beat vague county-wide claims."
            copy="Each area has its own page because search intent, travel time, and service expectations are different enough to deserve it."
            tint="gold"
          />

          <Stagger className="mt-14 grid gap-5 sm:grid-cols-2 xl:grid-cols-4" staggerDelay={0.12}>
            {locations
              .filter((l) => !l.parentSlug)
              .map((location, i) => {
                const colors = [
                  { accent: "--wr-blue-soft", glow: "hover:shadow-[--wr-blue]/8" },
                  { accent: "--wr-teal", glow: "hover:shadow-[--wr-teal]/8" },
                  { accent: "--wr-gold", glow: "hover:shadow-[--wr-gold]/8" },
                  { accent: "--wr-purple", glow: "hover:shadow-[--wr-purple]/8" },
                ];
                const c = colors[i % colors.length];
                return (
                  <StaggerItem key={location.slug}>
                    <TiltCard className="h-full">
                      <Link
                        href={`/locations/${location.slug}`}
                        className={`glass-card group flex h-full flex-col p-7 ${c.glow} hover:shadow-2xl`}
                      >
                        <MapPin className="h-5 w-5" style={{ color: `var(${c.accent})` }} />
                        <h3 className="mt-4 text-lg font-bold text-foreground">{location.name}</h3>
                        <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground line-clamp-3">
                          {location.teaser}
                        </p>
                        <div className="mt-4 flex flex-wrap gap-1.5">
                          {location.neighborhoods.slice(0, 3).map((n) => (
                            <span
                              key={n}
                              className="rounded-full border border-border px-2.5 py-0.5 text-xs text-muted-foreground"
                            >
                              {n}
                            </span>
                          ))}
                        </div>
                        <motion.span
                          className="mt-4 flex items-center gap-1.5 text-sm font-medium"
                          style={{ color: `var(${c.accent})` }}
                          whileHover={{ x: 4 }}
                        >
                          Explore area <ArrowRight className="h-4 w-4" />
                        </motion.span>
                      </Link>
                    </TiltCard>
                  </StaggerItem>
                );
              })}
          </Stagger>

          <FadeIn delay={0.3}>
            <div className="mt-14 overflow-hidden rounded-2xl border border-border" role="region" aria-label="Wrench Ready Mobile service area map — Spokane County, WA">
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m14!1m12!1m3!1d172684.78!2d-117.4260!3d47.6588!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!5e0!3m2!1sen!2sus!4v1"
                width="100%"
                height="300"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Wrench Ready Mobile service area — Spokane County, WA"
                aria-label="Interactive Google Map showing Spokane County service area for Wrench Ready Mobile"
                className="grayscale-[60%] contrast-[1.1] opacity-80 transition-all duration-500 hover:grayscale-0 hover:opacity-100"
              />
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── Booking: Calendly Widget + Pre-Qualification Intake ── */}
      <section id="book" className="relative">
        <SectionOrbs variant="blue" />
        <div className="shell section-space">

          {/* Production Calendly embed */}
          <FadeIn>
            <div className="mx-auto mb-16 max-w-3xl overflow-hidden rounded-3xl bg-white p-6 shadow-xl md:p-10">
              <div className="mb-8 flex flex-col items-center gap-3 text-center">
                {/* "Earn the Next Visit" doctrine badge */}
                <span className="inline-flex items-center gap-1.5 rounded-full border border-[--wr-teal]/20 bg-[--wr-teal]/5 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-[--wr-teal]">
                  <Shield className="h-3.5 w-3.5" />
                  Earn the Next Visit
                </span>
                <h2 className="text-3xl font-semibold text-gray-900">Book Your 25-Point Inspection</h2>
                <p className="max-w-lg text-sm text-gray-500">
                  Pick a time that works — most slots are available within the same week.
                </p>
              </div>
              {/* Calendly inline widget — loads when the external script is present */}
              <div
                className="calendly-inline-widget"
                data-url="https://calendly.com/wrenchreadymobile/25-point-inspection?hide_event_type_details=1"
                style={{ minWidth: "320px", height: "700px" }}
              />
            </div>
          </FadeIn>

          <div className="grid gap-12 lg:grid-cols-[1fr_1.3fr] lg:gap-16 lg:items-start">
            <div>
              <SectionHeading
                eyebrow="Pre-Qualification"
                title="Tell us about your vehicle."
                copy="Five quick questions so we can screen the job, confirm fit, and get you a fast answer. No commitment until the appointment is confirmed."
                tint="blue"
              />

              <FadeIn delay={0.3}>
                <div className="mt-8 space-y-4">
                  <div className="flex items-start gap-3">
                    <ClipboardCheck className="mt-0.5 h-5 w-5 shrink-0 text-[--wr-teal]" />
                    <p className="text-sm text-muted-foreground">
                      Every qualifying visit includes a free 25-point inspection with photo-backed findings.
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <Bell className="mt-0.5 h-5 w-5 shrink-0 text-[--wr-teal]" />
                    <p className="text-sm text-muted-foreground">
                      Dez will call you within 15 minutes of submission to confirm and schedule.
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <Shield className="mt-0.5 h-5 w-5 shrink-0 text-[--wr-teal]" />
                    <p className="text-sm text-muted-foreground">
                      Licensed, insured, and fully transparent. The quote is the price — no surprises.
                    </p>
                  </div>
                </div>
              </FadeIn>
            </div>

            <FadeIn delay={0.2}>
              <div className="rounded-2xl border border-border bg-card/50 p-6 backdrop-blur-sm sm:p-8">
                <h3 className="text-lg font-bold text-foreground">
                  Ready for a smarter next visit?
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Fill out the intake below. We screen every request before confirming a slot.
                </p>
                <div className="mt-6">
                  <IntakeForm />
                </div>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" className="relative border-t border-border">
        <SectionOrbs variant="purple" />
        <div className="shell section-space">
          <SectionHeading
            eyebrow="FAQ"
            title="Common questions, honest answers."
            copy="Clear answers that explain how Wrench Ready Mobile actually works — from service scope to the Now / Soon / Monitor framework."
            tint="teal"
          />
          <div className="mt-12 max-w-3xl">
            <FaqList faqs={homeFaqs} />
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="shell section-space pb-28 md:pb-24">
        <div className="relative overflow-hidden rounded-[1.75rem] border border-[--wr-gold]/12 shadow-[0_24px_80px_-24px_rgba(0,0,0,0.5)]">
          <div className="absolute inset-0 -z-10">
            <Image
              src="/hero-cta.png"
              alt="Wrench Ready Mobile branded service van parked in a clean residential driveway ready for the next appointment"
              fill
              loading="lazy"
              className="object-cover"
              sizes="(max-width: 1280px) 100vw, 1200px"
            />
            <div className="absolute inset-0 bg-background/88 backdrop-blur-[2px]" />
            <div className="absolute inset-0 bg-gradient-to-br from-background/95 via-background/80 to-[--wr-surface]/95" />
          </div>

          <SectionOrbs variant="gold" />

          <div className="relative z-10 grid gap-10 p-8 sm:p-10 lg:grid-cols-[1fr_1.05fr] lg:items-center lg:gap-14 lg:p-14">
            <div>
              <p className="eyebrow" style={{ color: "var(--wr-gold)" }}>
                Next step
              </p>
              <h2 className="gradient-text-gold mt-2 text-3xl font-semibold tracking-tight sm:text-4xl lg:text-[2.75rem] lg:leading-[1.12]">
                Schedule your appointment.
              </h2>
              <p className="mt-4 max-w-md text-sm leading-relaxed text-muted-foreground sm:text-base">
                Send the vehicle, the symptom, where the car is parked, and a time window. That is usually enough to screen the job and get you a fast answer.
              </p>
            </div>
            <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center lg:justify-end">
              <button
                type="button"
                onClick={scrollToBook}
                className="btn-shimmer inline-flex min-h-[3rem] flex-1 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[--wr-gold] to-[--wr-gold-soft] px-8 py-3.5 text-[15px] font-semibold text-[--wr-surface] shadow-lg shadow-[--wr-gold]/10 transition-all hover:brightness-105 sm:min-w-[200px] sm:flex-none"
              >
                Open booking
                <ArrowRight className="h-4 w-4" />
              </button>
              <a
                href={siteConfig.contact.phoneHref}
                className="inline-flex min-h-[3rem] flex-1 items-center justify-center gap-2 rounded-full border border-border/80 bg-background/40 px-7 py-3.5 text-[15px] font-medium text-foreground backdrop-blur-sm transition-colors hover:bg-secondary sm:flex-none"
              >
                <Phone className="h-4 w-4" />
                {siteConfig.contact.phoneDisplay}
              </a>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
