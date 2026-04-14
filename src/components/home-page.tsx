"use client";

import { FaqList, SectionHeading } from "@/components/marketing";
import { FadeIn, Stagger, StaggerItem } from "@/components/motion/fade-in";
import { SectionOrbs } from "@/components/motion/gradient-orbs";
import { AnimatedHeading } from "@/components/motion/animated-text";
import { homeFaqs, siteConfig } from "@/data/site";
import {
  SHOW_DEMO_TESTIMONIALS,
  demoTestimonials,
} from "@/data/demo-testimonials";
import {
  Shield,
  Clock,
  ArrowRight,
  CheckCircle2,
  Star,
  Zap,
  Eye,
  Phone,
  Calendar,
  Camera,
  ClipboardCheck,
  FileText,
  Send,
  Truck,
  Gauge,
  Battery,
  Disc3,
  Search,
  CircleDollarSign,
  Users,
  MapPin,
  MessageSquare,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { useState, type FormEvent } from "react";

/* ───────────────────────── helpers ───────────────────────── */

function scrollToBook() {
  const el = document.getElementById("book");
  if (el) el.scrollIntoView({ behavior: "smooth" });
}

/* ───────────────────────── data ───────────────────────── */

const trustChips = [
  { icon: <Shield className="h-3.5 w-3.5 sm:h-4 sm:w-4" />, label: "Licensed & insured" },
  { icon: <Camera className="h-3.5 w-3.5 sm:h-4 sm:w-4" />, label: "Photo-backed findings" },
  { icon: <ClipboardCheck className="h-3.5 w-3.5 sm:h-4 sm:w-4" />, label: "Approval before added work" },
  { icon: <MapPin className="h-3.5 w-3.5 sm:h-4 sm:w-4" />, label: "Focused Spokane routes" },
];

const trustStrip = [
  { icon: <ClipboardCheck className="h-4 w-4" />, text: "Clear quotes before work begins" },
  { icon: <Camera className="h-4 w-4" />, text: "Photo-backed findings" },
  { icon: <Shield className="h-4 w-4" />, text: "Approval before added work" },
  { icon: <Clock className="h-4 w-4" />, text: "Real status updates" },
  { icon: <Star className="h-4 w-4" />, text: "Licensed & insured" },
  { icon: <MapPin className="h-4 w-4" />, text: "Focused Spokane routes" },
];

const coreServices = [
  {
    icon: <Battery className="h-6 w-6" />,
    title: "Dead battery & no-start help",
    body: "We test the battery and charging system first. If the battery is the problem, we replace it on the spot. If it is something else, we tell you that before swapping anything.",
    price: "From $180",
    time: "30–45 min",
    image: "/wrenchready-battery-diagnostic.webp",
    href: "/services/battery-replacement",
    color: "teal" as const,
  },
  {
    icon: <Disc3 className="h-6 w-6" />,
    title: "Brake inspection & repair",
    body: "Grinding, squealing, vibration, or soft pedal? We inspect the brakes, explain what is worn, and get your approval before any parts go on.",
    price: "From $280/axle",
    time: "1.5–2.5 hrs",
    image: "/wrenchready-brake-service.webp",
    href: "/services/brake-repair",
    color: "blue" as const,
  },
  {
    icon: <Search className="h-6 w-6" />,
    title: "Check engine & paid diagnostics",
    body: "A warning light is a symptom, not a repair order. We scan the codes, explain what they mean in plain language, and tell you the actual next step.",
    price: "From $150",
    time: "45–75 min",
    image: "/wrenchready-diagnostic-approval.webp",
    href: "/services/check-engine-diagnostics",
    color: "gold" as const,
  },
  {
    icon: <Eye className="h-6 w-6" />,
    title: "Inspections & routine work",
    body: "Pre-purchase inspection before buying a used car, or routine maintenance at your location. We handle the jobs that fit the field well and save you the shop trip.",
    price: "From $150",
    time: "45–75 min",
    image: "/wrenchready-technician-arrival.webp",
    href: "/services/pre-purchase-inspection",
    color: "teal" as const,
  },
];

const colorMap = {
  teal: {
    bg: "bg-[--wr-teal]/10",
    text: "text-[--wr-teal]",
    border: "border-[--wr-teal]/20",
    glow: "group-hover:shadow-[--wr-teal]/10",
  },
  blue: {
    bg: "bg-[--wr-blue]/10",
    text: "text-[--wr-blue-soft]",
    border: "border-[--wr-blue]/20",
    glow: "group-hover:shadow-[--wr-blue]/10",
  },
  gold: {
    bg: "bg-[--wr-gold]/10",
    text: "text-[--wr-gold]",
    border: "border-[--wr-gold]/20",
    glow: "group-hover:shadow-[--wr-gold]/10",
  },
};

const differentiators = [
  {
    icon: <Gauge className="h-5 w-5" />,
    title: "We screen the job before we schedule it",
    body: "If the job, parking, or timing is wrong for mobile service, we tell you upfront instead of booking something that will not work.",
  },
  {
    icon: <CircleDollarSign className="h-5 w-5" />,
    title: "Straightforward work gets a clear quote",
    body: "If we know the repair, you get a price before we start. No vague estimates, no hourly guessing.",
  },
  {
    icon: <Search className="h-5 w-5" />,
    title: "If diagnosis comes first, we say that upfront",
    body: "When the issue needs testing before a repair, we explain the diagnostic fee and what the visit will cover before scheduling.",
  },
  {
    icon: <FileText className="h-5 w-5" />,
    title: "You approve added work before it starts",
    body: "If inspection turns up something different from the original request, you get a plain explanation and an approval request before anything changes.",
  },
  {
    icon: <CheckCircle2 className="h-5 w-5" />,
    title: "If it is not a good mobile fit, we say so early",
    body: "Some jobs need a lift, a shop bay, or tools we cannot bring to a driveway. We would rather tell you that upfront than waste your time.",
  },
];

const processSteps = [
  {
    icon: <Send className="h-5 w-5" />,
    title: "Tell us what the car is doing",
    body: "Send the vehicle info, where it is parked, and a short description of the issue.",
  },
  {
    icon: <ClipboardCheck className="h-5 w-5" />,
    title: "We tell you the right first appointment",
    body: "Straightforward repair? We quote it. Needs diagnosis first? We say that clearly so you know what the visit covers.",
  },
  {
    icon: <Truck className="h-5 w-5" />,
    title: "We confirm the visit",
    body: "You get a real appointment window and follow-up before the visit.",
  },
  {
    icon: <Shield className="h-5 w-5" />,
    title: "You approve added work before it happens",
    body: "If inspection changes the plan, we explain it first. No surprise scope.",
  },
];

/* ───────────────────────── Intake Form ───────────────────────── */

function IntakeForm() {
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const vehicle = [
      String(data.get("year") ?? "").trim(),
      String(data.get("make") ?? "").trim(),
      String(data.get("model") ?? "").trim(),
    ].filter(Boolean).join(" ");

    setSubmitting(true);
    setErrorMessage("");

    try {
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: String(data.get("name") ?? "").trim(),
          phone: String(data.get("phone") ?? "").trim(),
          email: "",
          vehicle,
          serviceNeeded: String(data.get("service") ?? "").trim(),
          address: String(data.get("address") ?? "").trim(),
          timing: "",
          notes: String(data.get("problem") ?? "").trim(),
        }),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        throw new Error(payload?.error || "Submission failed");
      }
      setSubmitted(true);
      form.reset();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Something went wrong. Please call or text us instead.");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="rounded-2xl border border-[--wr-teal]/20 bg-[--wr-teal]/5 p-8 text-center"
      >
        <CheckCircle2 className="mx-auto h-12 w-12 text-[--wr-teal]" />
        <h3 className="mt-4 text-xl font-bold text-foreground">Request received.</h3>
        <p className="mt-2 text-base leading-relaxed text-muted-foreground">
          We will review the details and follow up with the right next step — usually within a few hours.
        </p>
      </motion.div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {errorMessage && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {errorMessage}
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-3">
        <input type="text" name="year" placeholder="Year" className="form-input" required />
        <input type="text" name="make" placeholder="Make" className="form-input" required />
        <input type="text" name="model" placeholder="Model" className="form-input" required />
      </div>
      <select name="service" className="form-input" required defaultValue="">
        <option value="" disabled>What do you need?</option>
        <option value="battery-replacement">Dead battery / no-start</option>
        <option value="brake-repair">Brake noise or problem</option>
        <option value="check-engine-diagnostics">Check engine / warning light</option>
        <option value="pre-purchase-inspection">Pre-purchase inspection</option>
        <option value="oil-change">Oil change / routine maintenance</option>
        <option value="other">Other / not sure</option>
      </select>
      <textarea
        name="problem"
        placeholder="Describe the problem or what you need done..."
        className="form-textarea"
        rows={3}
      />
      <input type="text" name="address" placeholder="Where is the vehicle? (address or ZIP)" className="form-input" required />
      <div className="grid gap-3 sm:grid-cols-2">
        <input type="text" name="name" placeholder="Your name" className="form-input" required />
        <input type="tel" name="phone" placeholder="Phone number" className="form-input" required />
      </div>
      <button
        type="submit"
        disabled={submitting}
        className="btn-shimmer inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-7 py-4 text-base font-semibold text-primary-foreground transition-all hover:brightness-110 hover:shadow-lg hover:shadow-primary/25 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
      >
        {submitting ? "Sending..." : "Request Service"}
        {!submitting && <ArrowRight className="h-4 w-4" />}
      </button>
    </form>
  );
}

/* ═══════════════════════════════════════════════════════════════
   HOMEPAGE
   ═══════════════════════════════════════════════════════════════ */

export function HomePage() {
  return (
    <>
      {/* ── HERO ── */}
      <section id="home" className="relative min-h-[80vh] overflow-hidden sm:min-h-[92vh]">
        {/* Mobile: portrait video (9:16, optimized for phones) */}
        <div className="absolute inset-0 -z-20 md:hidden">
          <video
            autoPlay
            muted
            loop
            playsInline
            poster="/wrenchready-hero-service.webp"
            className="h-full w-full object-cover"
          >
            <source src="/wrenchready-hero-loop-mobile.mp4" type="video/mp4" />
          </video>
          <div className="absolute inset-0 bg-black/55" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-black/15" />
        </div>

        {/* Desktop: landscape video (16:9) */}
        <div className="absolute inset-0 -z-20 hidden md:block">
          <video
            autoPlay
            muted
            loop
            playsInline
            poster="/wrenchready-hero-service.webp"
            className="h-full w-full object-cover"
          >
            <source src="/wrenchready-hero-loop.mp4" type="video/mp4" />
          </video>
          <div className="absolute inset-0 bg-black/55" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-black/10" />
        </div>

        <div className="shell relative flex min-h-[80vh] flex-col justify-center pt-20 pb-24 sm:min-h-[92vh] sm:pt-32 sm:pb-36">
          <div className="max-w-3xl space-y-5 sm:space-y-7">
            <FadeIn>
              <Image
                src="/wr-logo-full.png"
                alt="WrenchReady Mobile"
                width={180}
                height={120}
                className="mb-1 w-[140px] drop-shadow-2xl sm:mb-2 sm:w-[180px]"
                priority
              />
            </FadeIn>

            <FadeIn delay={0.1}>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-white/90 backdrop-blur-sm sm:px-4 sm:py-1.5 sm:text-xs">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[--wr-teal] opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-[--wr-teal]" />
                </span>
                Mobile Car Repair &bull; Spokane County, WA
              </span>
            </FadeIn>

            <AnimatedHeading
              text="Mobile car repair in Spokane with clear quotes and no surprise scope."
              gradient
              className="text-3xl font-bold leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl xl:text-7xl"
              delay={0.15}
            />

            <FadeIn delay={0.35}>
              <p className="max-w-xl text-base font-medium leading-snug text-white/80 sm:text-xl">
                Dead battery, brake noise, warning lights, or a car that will not start? We come to your home or work, tell you what fits mobile service, and explain the next step before work begins.
              </p>
            </FadeIn>

            <FadeIn delay={0.5}>
              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                <button
                  onClick={scrollToBook}
                  className="btn-shimmer inline-flex items-center justify-center gap-2 rounded-full bg-primary px-8 py-3.5 text-base font-semibold text-primary-foreground transition-all hover:brightness-110 hover:shadow-lg hover:shadow-primary/25 hover:scale-[1.02] sm:py-4"
                >
                  Request Service
                  <ArrowRight className="h-5 w-5" />
                </button>
                <a
                  href={siteConfig.contact.phoneHref}
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-white/20 bg-white/5 px-7 py-3.5 text-base font-medium text-white backdrop-blur-sm transition-all hover:bg-white/10 hover:scale-[1.02] sm:py-4"
                >
                  <Phone className="h-5 w-5" />
                  Call or Text {siteConfig.contact.phoneDisplay}
                </a>
              </div>
            </FadeIn>

            <FadeIn delay={0.6}>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-1 sm:gap-x-5 sm:pt-2">
                {trustChips.map((item) => (
                  <span key={item.label} className="flex items-center gap-1.5 text-xs font-medium text-white/70 sm:gap-2 sm:text-sm">
                    <span className="text-[--wr-teal]">{item.icon}</span>
                    {item.label}
                  </span>
                ))}
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* ── TRUST STRIP ── */}
      <section className="relative border-y border-border">
        <div className="absolute inset-0 bg-gradient-to-r from-[--wr-blue]/3 via-[--wr-teal]/3 to-[--wr-gold]/3" />
        <div className="relative overflow-hidden">
          <div className="shell flex items-center gap-6 overflow-x-auto py-4 scrollbar-none sm:flex-wrap sm:justify-center sm:gap-x-8 sm:gap-y-3 sm:overflow-x-visible sm:py-5">
            {trustStrip.map((item) => (
              <span key={item.text} className="flex shrink-0 items-center gap-2 text-xs font-medium text-muted-foreground sm:gap-2.5 sm:text-sm">
                <span className="text-[--wr-teal]">{item.icon}</span>
                {item.text}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── WHAT TO SEND US ── */}
      <section className="relative border-b border-border">
        <div className="shell py-12 sm:py-16">
          <FadeIn>
            <div className="mx-auto max-w-3xl text-center">
              <p className="eyebrow" style={{ color: "var(--wr-teal)" }}>What to send us</p>
              <h2 className="mt-3 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                Fastest way to get a clear answer
              </h2>
            </div>
          </FadeIn>

          <Stagger className="mx-auto mt-10 grid max-w-3xl gap-4 sm:grid-cols-3" staggerDelay={0.1}>
            {[
              { icon: <Truck className="h-5 w-5" />, label: "Year, make, and model" },
              { icon: <MapPin className="h-5 w-5" />, label: "Where the vehicle is parked" },
              { icon: <MessageSquare className="h-5 w-5" />, label: "What the car is doing" },
            ].map((item) => (
              <StaggerItem key={item.label}>
                <div className="flex items-center gap-3 rounded-xl border border-border bg-card/50 p-4 backdrop-blur-sm">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[--wr-teal]/10 text-[--wr-teal]">
                    {item.icon}
                  </span>
                  <span className="text-sm font-medium text-foreground">{item.label}</span>
                </div>
              </StaggerItem>
            ))}
          </Stagger>

          <FadeIn delay={0.4}>
            <p className="mx-auto mt-6 max-w-2xl text-center text-sm leading-relaxed text-muted-foreground">
              That is usually enough for us to tell you whether the job fits mobile service and what the next step should be.
            </p>
          </FadeIn>
        </div>
      </section>

      {/* ── CORE SERVICES ── */}
      <section id="services" className="relative mesh-section-blue">
        <div className="shell section-space">
          <SectionHeading
            eyebrow="What We Handle Best"
            title="The vehicle problems that need a clear answer quickly."
            copy="WrenchReady is built around the kinds of jobs that fit mobile service well, can be screened honestly, and can usually be completed without turning into a shop-day hassle."
            tint="blue"
          />

          <Stagger className="mt-14 grid gap-6 md:grid-cols-2" staggerDelay={0.12}>
            {coreServices.map((service) => {
              const c = colorMap[service.color];
              return (
                <StaggerItem key={service.title}>
                  <div className={`glass-card group relative flex h-full flex-col overflow-hidden ${c.glow} hover:shadow-2xl`}>
                    <Link href={service.href} className="block">
                      <div className="relative aspect-[16/9] w-full overflow-hidden">
                        <Image
                          src={service.image}
                          alt={service.title}
                          fill
                          loading="lazy"
                          className="object-cover transition-transform duration-500 group-hover:scale-105"
                          sizes="(max-width: 768px) 100vw, 50vw"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[--wr-surface] via-[--wr-surface]/40 to-transparent" />
                        <div className="absolute bottom-3 left-4">
                          <span className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${c.bg} ${c.text}`}>
                            {service.icon}
                          </span>
                        </div>
                        <div className="absolute bottom-3 right-4 flex items-center gap-2">
                          <span className="rounded-full border border-[--wr-gold]/30 bg-background/80 px-3 py-1.5 text-sm font-bold text-[--wr-gold] backdrop-blur-sm">
                            {service.price}
                          </span>
                          <span className="rounded-full border border-border bg-background/80 px-3 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur-sm">
                            {service.time}
                          </span>
                        </div>
                      </div>
                    </Link>

                    <div className="flex flex-1 flex-col p-6">
                      <Link href={service.href}>
                        <h3 className="text-xl font-bold text-foreground">{service.title}</h3>
                      </Link>
                      <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
                        {service.body}
                      </p>
                      <div className="mt-4 flex items-center justify-between gap-3">
                        <Link
                          href={service.href}
                          className="flex items-center gap-1.5 text-sm font-medium text-primary transition-colors hover:text-primary/80"
                        >
                          Details <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                        <button
                          onClick={scrollToBook}
                          className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3.5 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/20"
                        >
                          <Calendar className="h-3 w-3" />
                          Request Service
                        </button>
                      </div>
                    </div>
                  </div>
                </StaggerItem>
              );
            })}
          </Stagger>
        </div>
      </section>

      {/* ── WHAT MAKES THIS EASIER THAN A SHOP VISIT ── */}
      <section className="relative border-y border-border">
        <SectionOrbs variant="teal" />
        <div className="shell section-space">
          <div className="grid gap-14 lg:grid-cols-[1fr_1.1fr] lg:items-center">
            <div>
              <SectionHeading
                eyebrow="The WrenchReady Difference"
                title="What makes this easier than a shop visit."
                copy="Most people are not just dealing with a car problem. They are dealing with uncertainty, timing, and the hassle of getting the vehicle somewhere. WrenchReady is built to reduce that friction without overpromising what mobile service can do."
                tint="teal"
              />
            </div>

            <Stagger className="space-y-4" staggerDelay={0.1}>
              {differentiators.map((d) => (
                <StaggerItem key={d.title}>
                  <div className="flex gap-4 rounded-2xl border border-border bg-card/40 p-5 backdrop-blur-sm transition-colors hover:border-[--wr-teal]/20">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[--wr-teal]/10 text-[--wr-teal]">
                      {d.icon}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-foreground">{d.title}</h3>
                      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{d.body}</p>
                    </div>
                  </div>
                </StaggerItem>
              ))}
            </Stagger>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how-it-works" className="relative mesh-section-teal">
        <div className="shell section-space">
          <SectionHeading
            eyebrow="How It Works"
            title="Four steps. No runaround."
            copy="From first message to finished repair."
            tint="teal"
          />

          <div className="mt-14 grid gap-12 lg:grid-cols-2 lg:items-center">
            <FadeIn direction="left">
              <div className="relative aspect-[4/3] overflow-hidden rounded-3xl border border-border/50">
                <Image
                  src="/wrenchready-technician-arrival.webp"
                  alt="WrenchReady technician arriving at a Spokane home for a scheduled service visit"
                  fill
                  loading="lazy"
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-background/40 via-transparent to-transparent" />
              </div>
            </FadeIn>

            <div className="space-y-6">
              {processSteps.map((step, i) => (
                <FadeIn key={step.title} delay={i * 0.12} direction="right">
                  <div className="flex gap-4">
                    <div className="relative">
                      <motion.div
                        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[--wr-teal]/20 bg-[--wr-teal]/10 text-[--wr-teal]"
                        initial={{ scale: 0 }}
                        whileInView={{ scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ delay: i * 0.12 + 0.2, duration: 0.4, ease: "backOut" }}
                      >
                        {step.icon}
                      </motion.div>
                      {i < processSteps.length - 1 && (
                        <div className="absolute left-1/2 top-14 h-[calc(100%-0.5rem)] w-px -translate-x-1/2 bg-gradient-to-b from-[--wr-teal]/20 to-transparent" />
                      )}
                    </div>
                    <div className="pb-4">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-[--wr-teal]">
                        Step {i + 1}
                      </span>
                      <h3 className="mt-1 text-base font-bold text-foreground">{step.title}</h3>
                      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
                    </div>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── SOCIAL PROOF / TESTIMONIALS ── */}
      {SHOW_DEMO_TESTIMONIALS && (
        <section id="reviews" className="relative border-y border-border">
          <SectionOrbs variant="gold" />
          <div className="shell section-space">
            <SectionHeading
              eyebrow="What Customers Notice"
              title="Clear communication, honest screening, and work that does not turn into a guessing game."
              copy=""
              tint="gold"
            />

            <Stagger className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3" staggerDelay={0.08}>
              {demoTestimonials.map((t) => (
                <StaggerItem key={t.id}>
                  <div className="flex h-full flex-col rounded-2xl border border-border bg-card/50 p-6 backdrop-blur-sm transition-colors hover:border-[--wr-gold]/20">
                    <div className="flex gap-0.5">
                      {Array.from({ length: t.stars }).map((_, i) => (
                        <Star key={i} className="h-4 w-4 fill-[--wr-gold] text-[--wr-gold]" />
                      ))}
                    </div>
                    <h3 className="mt-3 text-sm font-bold text-foreground">{t.headline}</h3>
                    <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
                      &ldquo;{t.quote}&rdquo;
                    </p>
                    <div className="mt-4 border-t border-border pt-3">
                      <p className="text-sm font-semibold text-foreground">{t.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {t.neighborhood} &middot; {t.vehicle} &middot; {t.service}
                      </p>
                    </div>
                  </div>
                </StaggerItem>
              ))}
            </Stagger>
          </div>
        </section>
      )}

      {/* ── NO-START / BATTERY FEATURE ── */}
      <section className="relative overflow-hidden border-y border-border">
        <div className="absolute inset-0 -z-10">
          <Image
            src="/wrenchready-battery-diagnostic.webp"
            alt="WrenchReady technician testing a battery in a Spokane driveway"
            fill
            loading="lazy"
            className="object-cover"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-background/90 backdrop-blur-[2px]" />
        </div>
        <div className="shell section-space relative">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            <FadeIn>
              <div>
                <p className="eyebrow" style={{ color: "var(--wr-teal)" }}>Urgent No-Start Help</p>
                <h2 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
                  Dead battery or car will not start?
                </h2>
                <p className="mt-5 text-base leading-relaxed text-muted-foreground sm:text-lg">
                  We come to you, test the battery and charging system, and replace the battery only if that is the real problem. If it is something else, we tell you that before swapping anything.
                </p>
                <ul className="mt-6 space-y-3">
                  {[
                    "Battery replacement if the battery is the problem",
                    "Charging-system follow-up if it is not",
                    "Starter or electrical diagnosis when that is the real issue",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-3 text-sm text-muted-foreground">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[--wr-teal]" />
                      {item}
                    </li>
                  ))}
                </ul>
                <div className="mt-8">
                  <button
                    onClick={scrollToBook}
                    className="btn-shimmer inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3.5 text-sm font-semibold text-primary-foreground transition-all hover:brightness-110 hover:shadow-lg hover:shadow-primary/25"
                  >
                    <Zap className="h-4 w-4" />
                    Request Service
                  </button>
                </div>
              </div>
            </FadeIn>

            <FadeIn delay={0.2} direction="right">
              <div className="relative aspect-[4/3] overflow-hidden rounded-3xl border border-border/50">
                <Image
                  src="/wrenchready-battery-diagnostic.webp"
                  alt="Battery testing and replacement service"
                  fill
                  loading="lazy"
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                />
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* ── BRAKE FEATURE ── */}
      <section className="relative mesh-section-blue">
        <div className="shell section-space">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            <FadeIn direction="left" className="order-2 lg:order-1">
              <div className="relative aspect-[4/3] overflow-hidden rounded-3xl border border-border/50">
                <Image
                  src="/wrenchready-brake-service.webp"
                  alt="WrenchReady brake inspection and repair service"
                  fill
                  loading="lazy"
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                />
              </div>
            </FadeIn>

            <FadeIn className="order-1 lg:order-2">
              <div>
                <p className="eyebrow" style={{ color: "var(--wr-blue-soft)" }}>Brake Service</p>
                <h2 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
                  Brake noise should not turn into guesswork.
                </h2>
                <p className="mt-5 text-base leading-relaxed text-muted-foreground sm:text-lg">
                  We inspect the brakes, explain what is worn, and quote the work clearly before moving ahead. If the problem is not pads and rotors, we tell you what it looks like and what comes next.
                </p>
                <div className="mt-6 grid grid-cols-2 gap-4">
                  {[
                    { label: "Pads + Rotors", price: "From $280/axle" },
                    { label: "Inspection", price: "From $145" },
                  ].map((item) => (
                    <div key={item.label} className="rounded-xl border border-border bg-card/50 p-4 backdrop-blur-sm">
                      <span className="text-xs font-medium text-muted-foreground">{item.label}</span>
                      <p className="mt-1 text-lg font-bold text-[--wr-gold]">{item.price}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-8">
                  <button
                    onClick={scrollToBook}
                    className="btn-shimmer inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3.5 text-sm font-semibold text-primary-foreground transition-all hover:brightness-110 hover:shadow-lg hover:shadow-primary/25"
                  >
                    <Disc3 className="h-4 w-4" />
                    Request Service
                  </button>
                </div>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* ── PRICING CLARITY ── */}
      <section className="relative border-y border-border">
        <SectionOrbs variant="gold" />
        <div className="shell section-space">
          <div className="mx-auto max-w-3xl text-center">
            <FadeIn>
              <p className="eyebrow" style={{ color: "var(--wr-gold)" }}>Pricing</p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
                One clear price per job. No driveway haggling.
              </h2>
              <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
                If the repair is straightforward, we quote it before we start. If the issue needs diagnosis first, we explain that before the visit.
              </p>
            </FadeIn>

            <Stagger className="mt-12 grid gap-4 text-left sm:grid-cols-2 lg:grid-cols-4" staggerDelay={0.08}>
              {[
                { icon: <CircleDollarSign className="h-5 w-5" />, text: "Flat job pricing for common work" },
                { icon: <FileText className="h-5 w-5" />, text: "Clear quote before repair begins" },
                { icon: <Search className="h-5 w-5" />, text: "Paid diagnostics when diagnosis is the real service" },
                { icon: <Shield className="h-5 w-5" />, text: "Approval required before added work" },
              ].map((item) => (
                <StaggerItem key={item.text}>
                  <div className="rounded-2xl border border-[--wr-gold]/15 bg-[--wr-gold]/5 p-5 transition-colors hover:border-[--wr-gold]/30">
                    <span className="text-[--wr-gold]">{item.icon}</span>
                    <p className="mt-3 text-sm font-medium text-foreground">{item.text}</p>
                  </div>
                </StaggerItem>
              ))}
            </Stagger>

            <FadeIn delay={0.4}>
              <div className="mx-auto mt-10 flex flex-wrap items-center justify-center gap-6 rounded-2xl border border-border bg-card/40 px-8 py-5 backdrop-blur-sm">
                <div className="text-center">
                  <span className="text-xs text-muted-foreground">Same-day</span>
                  <p className="text-lg font-bold text-foreground">+$35</p>
                </div>
                <div className="h-8 w-px bg-border" />
                <div className="text-center">
                  <span className="text-xs text-muted-foreground">After-hours / Weekend</span>
                  <p className="text-lg font-bold text-foreground">+$75</p>
                </div>
                <div className="h-8 w-px bg-border" />
                <div className="text-center">
                  <span className="text-xs text-muted-foreground">Travel within 15 mi</span>
                  <p className="text-lg font-bold text-[--wr-teal]">Free</p>
                </div>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* ── FLEET / SMALL BUSINESS ── */}
      <section className="relative mesh-section-blue">
        <div className="shell section-space">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            <FadeIn>
              <div>
                <p className="eyebrow" style={{ color: "var(--wr-blue-soft)" }}>Fleet & Business</p>
                <h2 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                  Keep work vehicles moving without shop-day chaos.
                </h2>
                <p className="mt-5 text-base leading-relaxed text-muted-foreground">
                  For local fleets and small businesses, WrenchReady can handle inspections, common repairs, and repeat maintenance with one point of contact and service records by vehicle.
                </p>
                <ul className="mt-6 space-y-3">
                  {[
                    "Fleet intake inspections",
                    "Scheduled maintenance by vehicle",
                    "One point of contact for dispatching",
                    "Clear service history and records",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-3 text-sm text-muted-foreground">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[--wr-blue-soft]" />
                      {item}
                    </li>
                  ))}
                </ul>
                <div className="mt-8">
                  <Link
                    href="/contact"
                    className="btn-shimmer inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3.5 text-sm font-semibold text-primary-foreground transition-all hover:brightness-110 hover:shadow-lg hover:shadow-primary/25"
                  >
                    <Users className="h-4 w-4" />
                    Ask About Fleet Service
                  </Link>
                </div>
              </div>
            </FadeIn>

            <FadeIn delay={0.2} direction="right">
              <div className="relative aspect-[4/3] overflow-hidden rounded-3xl border border-border/50">
                <Image
                  src="/wrenchready-fleet-service.webp"
                  alt="WrenchReady fleet service for local businesses in Spokane"
                  fill
                  loading="lazy"
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                />
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
            title="Common questions, straight answers."
            copy="How WrenchReady works — pricing, diagnostics, scope, and what to expect from a visit."
            tint="teal"
          />
          <div className="mt-12 max-w-3xl">
            <FaqList faqs={homeFaqs} />
          </div>
        </div>
      </section>

      {/* ── BOOKING / INTAKE ── */}
      <section id="book" className="relative">
        <SectionOrbs variant="blue" />
        <div className="shell section-space">
          <div className="grid gap-12 lg:grid-cols-[1fr_1.3fr] lg:gap-16 lg:items-start">
            <div>
              <SectionHeading
                eyebrow="Get Started"
                title="Tell us what the car is doing. We'll tell you the right next step."
                copy="Send the year, make, and model, where the car is parked, and what is going on. If it is a good fit for mobile service, we will follow up with the right first step — quote, diagnostic visit, or a clear answer that it belongs in a shop."
                tint="blue"
              />
              <FadeIn delay={0.3}>
                <div className="mt-8 space-y-4">
                  {[
                    { icon: <ClipboardCheck />, text: "Every request is reviewed before an appointment is confirmed" },
                    { icon: <Zap />, text: "We follow up as soon as the request is reviewed — usually within a few hours" },
                    { icon: <Shield />, text: "Licensed, insured, and fully transparent. Price and scope explained before you commit." },
                  ].map((item) => (
                    <div key={item.text} className="flex items-start gap-3">
                      <span className="mt-0.5 h-5 w-5 shrink-0 text-[--wr-teal]">{item.icon}</span>
                      <p className="text-sm text-muted-foreground">{item.text}</p>
                    </div>
                  ))}
                </div>
              </FadeIn>
              <FadeIn delay={0.4}>
                <div className="mt-8 rounded-xl border border-border bg-card/40 p-5 backdrop-blur-sm">
                  <p className="text-sm font-semibold text-foreground">Prefer to talk?</p>
                  <p className="mt-1 text-sm text-muted-foreground">Call or text anytime.</p>
                  <a
                    href={siteConfig.contact.phoneHref}
                    className="mt-3 inline-flex items-center gap-2 text-lg font-bold text-primary transition-colors hover:text-primary/80"
                  >
                    <Phone className="h-5 w-5" />
                    {siteConfig.contact.phoneDisplay}
                  </a>
                </div>
              </FadeIn>
            </div>

            <FadeIn delay={0.2}>
              <div className="rounded-2xl border border-border bg-card/50 p-6 backdrop-blur-sm sm:p-8">
                <h3 className="text-lg font-bold text-foreground">Start your request</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Tell us what you are driving and what is going on. We will follow up with the right next step.
                </p>
                <div className="mt-6">
                  <IntakeForm />
                </div>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="shell section-space">
        <motion.div
          className="relative overflow-hidden rounded-3xl border border-[--wr-gold]/15"
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div className="absolute inset-0 -z-10">
            <Image
              src="/wrenchready-hero-service.webp"
              alt="WrenchReady Mobile service"
              fill
              loading="lazy"
              className="object-cover"
              sizes="100vw"
            />
            <div className="absolute inset-0 bg-background/88 backdrop-blur-[2px]" />
          </div>

          <SectionOrbs variant="gold" />

          <div className="relative z-10 grid gap-8 p-8 sm:p-12 lg:grid-cols-2 lg:items-center lg:p-16">
            <div>
              <p className="eyebrow" style={{ color: "var(--wr-gold)" }}>Ready to get started?</p>
              <h2 className="gradient-text-gold mt-3 text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
                Tell us what the car is doing. We&apos;ll tell you the right next step.
              </h2>
            </div>
            <div>
              <p className="text-base leading-relaxed text-muted-foreground">
                Send the year, make, and model, where the car is parked, and what is going on. If it is a good fit for mobile service, we will follow up with the right first step — quote, diagnostic visit, or a clear answer that it belongs in a shop.
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <button
                  onClick={scrollToBook}
                  className="btn-shimmer inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[--wr-gold] to-[--wr-gold-soft] px-7 py-3.5 text-sm font-bold text-[--wr-surface] transition-all hover:shadow-lg hover:shadow-[--wr-gold]/20 hover:scale-[1.02]"
                >
                  Request Service
                  <ArrowRight className="h-4 w-4" />
                </button>
                <a
                  href={siteConfig.contact.phoneHref}
                  className="inline-flex items-center gap-2 rounded-full border border-border px-7 py-3.5 text-sm font-medium text-foreground transition-all hover:bg-secondary hover:border-transparent hover:scale-[1.02]"
                >
                  <Phone className="h-4 w-4" />
                  Call or Text {siteConfig.contact.phoneDisplay}
                </a>
              </div>
            </div>
          </div>
        </motion.div>
      </section>
    </>
  );
}
