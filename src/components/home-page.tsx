"use client";

import { FaqList, SectionHeading } from "@/components/marketing";
import { FadeIn, Stagger, StaggerItem } from "@/components/motion/fade-in";
import { SectionOrbs } from "@/components/motion/gradient-orbs";
import { AnimatedHeading } from "@/components/motion/animated-text";
import { homeFaqs, siteConfig } from "@/data/site";
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
  ChevronRight,
  Truck,
  Gauge,
  Battery,
  Disc3,
  Search,
  CircleDollarSign,
  Users,
  MapPin,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { useRef, useState, useEffect, type FormEvent } from "react";

/* ───────────────────────── helpers ───────────────────────── */

function scrollToBook() {
  const el = document.getElementById("book");
  if (el) el.scrollIntoView({ behavior: "smooth" });
}

/* ───────────────────────── data ───────────────────────── */

const heroStats = [
  { value: "0", label: "Shop trips needed" },
  { value: "$125", label: "Minimum job quote" },
  { value: "Spokane", label: "Local & focused" },
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
    body: "If your car will not start, we do not jump straight to selling a battery. We test the battery, charging system, and likely starting issues so you get the right fix, not a guess.",
    price: "From $180",
    time: "30–45 min",
    image: "/wrenchready-battery-diagnostic.webp",
    href: "/services/battery-replacement",
    color: "teal" as const,
  },
  {
    icon: <Disc3 className="h-6 w-6" />,
    title: "Brake inspection & repair",
    body: "Grinding, squealing, vibration, or soft pedal? We inspect first, explain what actually needs attention, and get approval before any added work is done.",
    price: "From $280/axle",
    time: "1.5–2.5 hrs",
    image: "/wrenchready-brake-service.webp",
    href: "/services/brake-repair",
    color: "blue" as const,
  },
  {
    icon: <Search className="h-6 w-6" />,
    title: "Check engine & paid diagnostics",
    body: "When the issue needs diagnosis, we treat that as a real service, explain the fee upfront, and give you a clear repair path if more work is needed.",
    price: "From $150",
    time: "45–75 min",
    image: "/wrenchready-diagnostic-approval.webp",
    href: "/services/check-engine-diagnostics",
    color: "gold" as const,
  },
  {
    icon: <Eye className="h-6 w-6" />,
    title: "Inspections & routine work",
    body: "Pre-purchase inspection before a used car buy, fleet intake, or common maintenance at your location. We handle the jobs that fit the field well and save you time.",
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
    title: "Whether your request is a fit",
    body: "We screen before we promise. If the job, parking, or timing is wrong, we say so upfront.",
  },
  {
    icon: <CircleDollarSign className="h-5 w-5" />,
    title: "What the first step costs",
    body: "Clear quote for straightforward work. Defined diagnostic fee when the issue needs testing first.",
  },
  {
    icon: <Clock className="h-5 w-5" />,
    title: "When someone is coming",
    body: "Confirmed appointment window with real updates as the visit gets closer.",
  },
  {
    icon: <FileText className="h-5 w-5" />,
    title: "When the plan changes",
    body: "If the inspected vehicle shows something different, you get a plain-English explanation before anything changes.",
  },
  {
    icon: <CheckCircle2 className="h-5 w-5" />,
    title: "When approval is needed",
    body: "Added work requires your sign-off. No surprise scope. No driveway pressure.",
  },
];

const processSteps = [
  {
    icon: <Send className="h-5 w-5" />,
    title: "Tell us what is going on",
    body: "Vehicle details, your location, and a short description of the problem. Photos help when the issue is visible.",
  },
  {
    icon: <ClipboardCheck className="h-5 w-5" />,
    title: "Get a clear next step",
    body: "Straightforward repair? You get a quote. Needs diagnosis? We explain that clearly so you know what the visit covers.",
  },
  {
    icon: <Truck className="h-5 w-5" />,
    title: "We confirm the visit",
    body: "Appointment window, confirmation, and updates as the visit gets closer. No wondering if anyone is actually coming.",
  },
  {
    icon: <Shield className="h-5 w-5" />,
    title: "Approve only what you want done",
    body: "If the job changes once the vehicle is inspected, you get a clear explanation and approval request before added work moves forward.",
  },
];

/* ───────────────────────── Floating FAB ───────────────────────── */

function FloatingBookFab() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    function onScroll() { setVisible(window.scrollY > 600); }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.button
          onClick={scrollToBook}
          initial={{ opacity: 0, scale: 0.8, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 20 }}
          transition={{ duration: 0.3, ease: "backOut" }}
          className="fixed bottom-24 right-4 z-50 inline-flex items-center gap-2 rounded-full px-5 py-3.5 text-sm font-bold text-white shadow-2xl md:hidden"
          style={{ background: "linear-gradient(135deg, var(--wr-teal), var(--wr-blue))" }}
          aria-label="Get a quote"
        >
          <Calendar className="h-4 w-4" />
          Get My Quote
        </motion.button>
      )}
    </AnimatePresence>
  );
}

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
          We will review the details and follow up with a clear next step — usually within a few hours.
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
        {submitting ? "Sending..." : "Get My Quote"}
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
      <FloatingBookFab />

      {/* ── HERO ── */}
      <section id="home" className="relative min-h-[92vh] overflow-hidden">
        {/* Video background with fallback image */}
        <div className="absolute inset-0 -z-20">
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

        <div className="shell relative flex min-h-[92vh] flex-col justify-center pt-24 pb-28 sm:pt-32 sm:pb-36">
          <div className="max-w-3xl space-y-7">
            <FadeIn>
              <Image
                src="/wr-logo-full.png"
                alt="WrenchReady Mobile"
                width={180}
                height={120}
                className="mb-2 drop-shadow-2xl"
                priority
              />
            </FadeIn>

            <FadeIn delay={0.1}>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-white/90 backdrop-blur-sm">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[--wr-teal] opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-[--wr-teal]" />
                </span>
                Mobile Car Repair — Spokane, WA
              </span>
            </FadeIn>

            <AnimatedHeading
              text="Mobile car repair that actually feels dependable."
              gradient
              className="text-4xl font-bold leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl xl:text-7xl"
              delay={0.15}
            />

            <FadeIn delay={0.35}>
              <p className="max-w-xl text-lg font-medium leading-snug text-white/80 sm:text-xl">
                Dead battery, brake noise, warning lights, or a car that will not start? We come to your home or office, give you a clear next step, and keep you updated from request to repair.
              </p>
            </FadeIn>

            <FadeIn delay={0.5}>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={scrollToBook}
                  className="btn-shimmer inline-flex items-center gap-2 rounded-full bg-primary px-8 py-4 text-base font-semibold text-primary-foreground transition-all hover:brightness-110 hover:shadow-lg hover:shadow-primary/25 hover:scale-[1.02]"
                >
                  Get My Quote
                  <ArrowRight className="h-5 w-5" />
                </button>
                <a
                  href={siteConfig.contact.phoneHref}
                  className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-7 py-4 text-base font-medium text-white backdrop-blur-sm transition-all hover:bg-white/10 hover:scale-[1.02]"
                >
                  <Phone className="h-5 w-5" />
                  {siteConfig.contact.phoneDisplay}
                </a>
              </div>
            </FadeIn>

            <FadeIn delay={0.6}>
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 pt-2">
                {[
                  { icon: <ClipboardCheck className="h-4 w-4" />, label: "Clear quotes" },
                  { icon: <Camera className="h-4 w-4" />, label: "Photo reports" },
                  { icon: <Shield className="h-4 w-4" />, label: "No surprise scope" },
                  { icon: <Zap className="h-4 w-4" />, label: "Status updates" },
                ].map((item) => (
                  <span key={item.label} className="flex items-center gap-2 text-sm font-medium text-white/70">
                    <span className="text-[--wr-teal]">{item.icon}</span>
                    {item.label}
                  </span>
                ))}
              </div>
            </FadeIn>
          </div>

          <FadeIn delay={0.7}>
            <div className="mt-10 flex flex-wrap items-center gap-3">
              {heroStats.map((stat) => (
                <div key={stat.label} className="rounded-xl border border-white/10 bg-black/30 px-5 py-3 backdrop-blur-md">
                  <span className="text-lg font-bold text-white">{stat.value}</span>
                  <p className="text-[10px] uppercase tracking-wider text-white/50">{stat.label}</p>
                </div>
              ))}
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── TRUST STRIP ── */}
      <section className="relative border-y border-border">
        <div className="absolute inset-0 bg-gradient-to-r from-[--wr-blue]/3 via-[--wr-teal]/3 to-[--wr-gold]/3" />
        <div className="shell relative py-5">
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
            {trustStrip.map((item) => (
              <span key={item.text} className="flex items-center gap-2.5 text-sm font-medium text-muted-foreground">
                <span className="text-[--wr-teal]">{item.icon}</span>
                {item.text}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── CORE SERVICES ── */}
      <section id="services" className="relative mesh-section-blue">
        <div className="shell section-space">
          <SectionHeading
            eyebrow="What We Handle Best"
            title="Start with the jobs people need handled now."
            copy="WrenchReady is built around the vehicle problems that create the most stress and the most wasted time. We focus on the work that fits mobile service well, can be quoted clearly, and can be completed without making you lose half your day at a shop."
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
                          Get Quote
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

      {/* ── WHY WRENCHREADY FEELS DIFFERENT ── */}
      <section className="relative border-y border-border">
        <SectionOrbs variant="teal" />
        <div className="shell section-space">
          <div className="grid gap-14 lg:grid-cols-[1fr_1.1fr] lg:items-center">
            <div>
              <SectionHeading
                eyebrow="The WrenchReady Difference"
                title="We do not sell mystery. We sell a clear promise."
                copy="Most people are not just frustrated because their car has a problem. They are frustrated because they do not know what happens next. WrenchReady is built to reduce that uncertainty."
                tint="teal"
              />
              <FadeIn delay={0.3}>
                <p className="mt-6 max-w-lg text-sm leading-relaxed text-muted-foreground">
                  That is the difference between &ldquo;mobile mechanic&rdquo; as a category and WrenchReady as a service experience. The goal is not to sound impressive. The goal is to make the next step obvious and believable.
                </p>
              </FadeIn>
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
            title="Simple from request to repair."
            copy="Four steps. No runaround."
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
                  This is one of the worst ways to lose time in your day. WrenchReady is built for urgent, understandable problems like no-start and battery issues.
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
                    Request No-Start Help
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
                  Brake jobs are a strong fit for mobile service when they are screened and explained properly. If your brakes are squealing, grinding, vibrating, or feeling soft, we inspect the vehicle, explain what is worn, and quote the work clearly before moving ahead.
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
                    Get a Brake Quote
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
                We do not like surprise pricing any more than you do. If the repair is straightforward, we quote it clearly. If the issue needs diagnosis first, we explain that before the visit starts.
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
                  For local fleets and small businesses, WrenchReady can support inspections, common repairs, and repeat maintenance with one point of contact and a cleaner service history by vehicle. Fewer surprises, less idle time, and less admin burden on your team.
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
            title="Common questions, honest answers."
            copy="Clear answers about how WrenchReady actually works — pricing, diagnostics, scope, and what to expect from a visit."
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
                title="If the car is down, the next step should be clear."
                copy="Tell us what is happening, where the vehicle is, and what you are driving. If it is a good fit for mobile service, we will give you a clear next step and a quote you can act on."
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
                  Tell us what you are driving and what is going on. We will follow up with a clear next step.
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
                Clear next step. Quote you can act on.
              </h2>
            </div>
            <div>
              <p className="text-base leading-relaxed text-muted-foreground">
                Tell us what is happening, where the vehicle is, and what you are driving. If it is a good fit for mobile service, you will hear back with a clear next step — usually within a few hours.
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <button
                  onClick={scrollToBook}
                  className="btn-shimmer inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[--wr-gold] to-[--wr-gold-soft] px-7 py-3.5 text-sm font-bold text-[--wr-surface] transition-all hover:shadow-lg hover:shadow-[--wr-gold]/20 hover:scale-[1.02]"
                >
                  Start My Request
                  <ArrowRight className="h-4 w-4" />
                </button>
                <a
                  href={siteConfig.contact.phoneHref}
                  className="inline-flex items-center gap-2 rounded-full border border-border px-7 py-3.5 text-sm font-medium text-foreground transition-all hover:bg-secondary hover:border-transparent hover:scale-[1.02]"
                >
                  <Phone className="h-4 w-4" />
                  {siteConfig.contact.phoneDisplay}
                </a>
              </div>
            </div>
          </div>
        </motion.div>
      </section>
    </>
  );
}
