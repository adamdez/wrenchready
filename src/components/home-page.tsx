// Add this to your root layout <head> or _document if not already present:
// <script src="https://assets.calendly.com/assets/external/widget.js" type="text/javascript" async></script>

"use client";

import { FaqList, SectionHeading } from "@/components/marketing";
import { FadeIn, Stagger, StaggerItem } from "@/components/motion/fade-in";
import { SectionOrbs, HeroGradientBg } from "@/components/motion/gradient-orbs";
import { AnimatedHeading, CountUp } from "@/components/motion/animated-text";
import {
  homeFaqs,
  locations,
  getServicesInPriorityOrder,
  processSteps,
  reviews,
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

const priorityServices = getServicesInPriorityOrder();

const trustFeatures = [
  { icon: <Shield className="h-5 w-5" />, label: "Screened requests", color: "text-[--wr-blue-soft]" },
  { icon: <Star className="h-5 w-5" />, label: "Promise-first service", color: "text-[--wr-gold]" },
  { icon: <Clock className="h-5 w-5" />, label: "Believable windows", color: "text-[--wr-teal]" },
  { icon: <Route className="h-5 w-5" />, label: "Focused routes", color: "text-[--wr-blue-soft]" },
  { icon: <Eye className="h-5 w-5" />, label: "Photo-backed findings", color: "text-[--wr-teal]" },
  { icon: <CheckCircle2 className="h-5 w-5" />, label: "No surprise scope", color: "text-[--wr-gold]" },
];

const processIcons = [
  <Send key="send" className="h-5 w-5" />,
  <ClipboardCheck key="screen" className="h-5 w-5" />,
  <Wrench key="wrench" className="h-5 w-5" />,
  <FileText key="report" className="h-5 w-5" />,
];

const heroTrustItems = [
  { icon: <ClipboardCheck className="h-4 w-4" />, label: "Screened first" },
  { icon: <Camera className="h-4 w-4" />, label: "Photo reports" },
  { icon: <CircleCheck className="h-4 w-4" />, label: "Clear next step" },
];

const launchTrustStandards = [
  {
    title: "Screened before booked",
    copy: "We look at the vehicle, symptom, parking setup, and timing before we promise a slot.",
  },
  {
    title: "Photos and plain-English notes",
    copy: "You should leave the visit knowing what we did, what we found, and what matters next.",
  },
  {
    title: "Believable windows",
    copy: "We keep the service area focused so arrival promises stay realistic instead of vague.",
  },
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

  function handleMouse(e: ReactMouseEvent<HTMLDivElement>) {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    x.set((e.clientX - rect.left) / rect.width - 0.5);
    y.set((e.clientY - rect.top) / rect.height - 0.5);
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

  useEffect(() => {
    function onScroll() {
      setVisible(window.scrollY > 600);
    }
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
          aria-label="Request screened service"
        >
          <motion.span
            animate={{ scale: [1, 1.15, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          >
            <Calendar className="h-4 w-4" />
          </motion.span>
          Request Screening
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
        <div className="overflow-hidden rounded-2xl border border-border bg-card/40 backdrop-blur-sm p-8 sm:p-10">
          <div className="text-center">
            <h3 className="text-2xl font-bold text-foreground">
              New in Spokane. Clear about the standard.
            </h3>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground max-w-2xl mx-auto">
              The public review history is just getting started. Until it fills in, this is what
              every customer should expect from the visit.
            </p>
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {launchTrustStandards.map((item) => (
              <div
                key={item.title}
                className="rounded-2xl border border-border bg-background/60 p-5 text-left"
              >
                <p className="text-sm font-semibold text-foreground">{item.title}</p>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.copy}</p>
              </div>
            ))}
          </div>
          <div className="mt-6 text-center">
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
      String(data.get("mileage") ?? "").trim(),
    ]
      .filter(Boolean)
      .join(" ");

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
          timing: String(data.get("timing") ?? "").trim(),
          notes: [
            `Symptom: ${String(data.get("symptom") ?? "").trim()}`,
            `Driveway: ${String(data.get("driveway") ?? "").trim()}`,
            `Prior diagnosis: ${String(data.get("prior_diagnosis") ?? "").trim()}`,
          ].join(" | "),
        }),
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        throw new Error(payload?.error || "Submission failed");
      }

      setSubmitted(true);
      form.reset();
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Something went wrong. Please call or text us instead.",
      );
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
        <h3 className="mt-4 text-xl font-bold text-foreground">Thank you.</h3>
        <p className="mt-2 text-base leading-relaxed text-muted-foreground">
          Your intake has been received. We will review the job and follow up with the next step.
        </p>
      </motion.div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {errorMessage && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {errorMessage}
        </div>
      )}

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
          <option value="" disabled>Select the highest-fit service...</option>
          {priorityServices.map((s) => (
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
          <option value="yes-paved-flat">Yes - paved and flat</option>
          <option value="yes-paved-slight-slope">Yes - paved with a slight slope</option>
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
          <option value="no">No - first time having it looked at</option>
          <option value="yes-shop">Yes - a shop diagnosed it</option>
          <option value="yes-self">Yes - I looked into it myself</option>
          <option value="routine">Not applicable - routine maintenance</option>
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
        disabled={submitting}
        className="btn-shimmer inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-7 py-4 text-base font-semibold text-primary-foreground transition-all hover:brightness-110 hover:shadow-lg hover:shadow-primary/25 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
      >
        <ClipboardCheck className="h-4 w-4" />
        {submitting ? "Sending..." : "Request Screening"}
      </button>
    </form>
  );
}

export function HomePage() {
  const hasReviews = reviews.length > 0;

  return (
    <>
      {/* Floating mobile-only "Book" FAB â€” appears after scrolling past hero */}
      <FloatingBookFab />

      {/* â”€â”€ Hero â€” Full-bleed Photo Background â”€â”€ */}
      <section id="home" className="relative min-h-[90vh] overflow-hidden">
        <div className="absolute inset-0 -z-20">
          <Image
            src="/hero-main.png"
            alt="Wrench Ready Mobile van in a Spokane residential driveway at golden hour with tools visible and technician performing a screened service visit"
            fill
            className="object-cover"
            priority
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-black/60" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-black/20" />
        </div>

        <HeroGradientBg />

        <div className="shell relative flex min-h-[90vh] flex-col justify-center pt-20 pb-24 sm:pt-28 sm:pb-32 lg:pt-32 lg:pb-36">
          <div className="max-w-3xl space-y-8">
            <FadeIn>
              <Image
                src="/wr-logo-full.png"
                alt="Wrench Ready Mobile"
                width={200}
                height={133}
                className="mb-4 drop-shadow-2xl"
                priority
              />
            </FadeIn>

            <FadeIn delay={0.1}>
              <motion.span
                className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-white/90 backdrop-blur-sm"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5 }}
              >
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[--wr-teal] opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-[--wr-teal]" />
                </span>
                Mobile Mechanic â€” Spokane, WA
              </motion.span>
            </FadeIn>

            <AnimatedHeading
              text="Promise-keeping mobile service comes to you."
              gradient
              className="text-5xl font-bold leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl"
              delay={0.15}
            />

            <FadeIn delay={0.35}>
              <p className="max-w-xl text-xl font-medium leading-snug text-white/80 sm:text-2xl">
                We screen the job first so the route, promise, and price all fit the day.
              </p>
            </FadeIn>

            <FadeIn delay={0.45}>
              <p className="max-w-xl text-lg leading-relaxed text-white/60">
                No-start and battery work, brakes, paid diagnostics, and inspections lead the site. Oil changes stay available as routine maintenance and bundle work, not the headline offer.
              </p>
            </FadeIn>

            <FadeIn delay={0.55}>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={scrollToBook}
                  className="btn-shimmer inline-flex items-center gap-2 rounded-full bg-primary px-8 py-4 text-base font-semibold text-primary-foreground transition-all hover:brightness-110 hover:shadow-lg hover:shadow-primary/25 hover:scale-[1.02]"
                >
                  <Calendar className="h-5 w-5" />
                  Request Screened Service
                </button>
                <a
                  href={siteConfig.contact.phoneHref}
                  className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-7 py-4 text-base font-medium text-white backdrop-blur-sm transition-all hover:bg-white/10 hover:scale-[1.02]"
                >
                  <Phone className="h-5 w-5" />
                  Call {siteConfig.contact.phoneDisplay}
                </a>
              </div>
            </FadeIn>

            <FadeIn delay={0.65}>
              <motion.div
                className="flex flex-wrap items-center gap-x-5 gap-y-2"
                initial="hidden"
                animate="visible"
                transition={{ staggerChildren: 0.15, delayChildren: 0.8 }}
              >
                {heroTrustItems.map((item) => (
                  <motion.span
                    key={item.label}
                    className="flex items-center gap-2 text-sm font-medium text-white/70"
                    variants={{
                      hidden: { opacity: 0, x: -10 },
                      visible: { opacity: 1, x: 0, transition: { duration: 0.4 } },
                    }}
                  >
                    <motion.span
                      className="text-[--wr-teal]"
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ delay: 1.2, duration: 0.5, ease: "backOut" }}
                    >
                      {item.icon}
                    </motion.span>
                    {item.label}
                  </motion.span>
                ))}
              </motion.div>
            </FadeIn>
          </div>

          <FadeIn delay={0.75}>
            <div className="mt-12 flex flex-wrap items-center gap-3">
              <div className="rounded-xl border border-white/10 bg-black/30 px-5 py-3 backdrop-blur-md">
                <span className="text-lg font-bold text-[--wr-teal]">Screened first</span>
                <p className="text-[10px] uppercase tracking-wider text-white/50">Only high-fit requests move forward</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/30 px-5 py-3 backdrop-blur-md">
                <span className="text-xl font-bold text-white">0</span>
                <p className="text-[10px] uppercase tracking-wider text-white/50">Shop trips needed</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/30 px-5 py-3 backdrop-blur-md">
                <span className="text-xl font-bold text-white">4</span>
                <p className="text-[10px] uppercase tracking-wider text-white/50">Core hero lanes</p>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* â”€â”€ Trust Strip â”€â”€ */}
      <section className="relative border-y border-border">
        <div className="absolute inset-0 bg-gradient-to-r from-[--wr-blue]/3 via-[--wr-teal]/3 to-[--wr-gold]/3" />
        <div className="shell relative py-6">
          <motion.div
            className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            transition={{ staggerChildren: 0.08 }}
          >
            {trustFeatures.map((feature) => (
              <motion.div
                key={feature.label}
                className="flex items-center gap-2.5 text-sm font-medium text-muted-foreground"
                variants={{
                  hidden: { opacity: 0, y: 10 },
                  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
                }}
              >
                <span className={feature.color}>{feature.icon}</span>
                {feature.label}
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* â”€â”€ Services â”€â”€ */}
      <section id="services" className="relative mesh-section-blue">
        <div className="shell section-space">
          <SectionHeading
            eyebrow="Services"
            title="High-fit service lanes first, support lanes behind them."
            copy="We lead with no-start and battery work, brakes, paid diagnostics, and inspections. Oil changes stay available, but only as routine maintenance or bundle work when the route fits."
            tint="blue"
          />

          <Stagger className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-3" staggerDelay={0.1}>
            {priorityServices.map((service, i) => {
              const gradient = serviceGradients[service.slug] ?? serviceGradients["oil-change"];
              const image = serviceImages[service.slug];
              return (
                <StaggerItem
                  key={service.slug}
                  className={i === 0 ? "lg:col-span-2 lg:row-span-2" : ""}
                >
                  <TiltCard className="h-full">
                    <div
                      className={`glass-card group relative flex h-full flex-col overflow-hidden ${gradient.glow} hover:shadow-2xl`}
                    >
                      <div className={`absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r ${gradient.border}`} />

                      <Link href={`/services/${service.slug}`} className="block">
                        <div className={`relative w-full overflow-hidden ${i === 0 ? "aspect-[16/9]" : "aspect-[16/10]"}`}>
                          <Image
                            src={image}
                            alt={`${service.name} â€” professional mobile mechanic service in Spokane, WA`}
                            fill
                            loading="lazy"
                            className="object-cover transition-transform duration-500 group-hover:scale-105"
                            sizes={i === 0 ? "(max-width: 1024px) 100vw, 66vw" : "(max-width: 1024px) 100vw, 33vw"}
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-[--wr-surface] via-[--wr-surface]/40 to-transparent" />
                          <div className="absolute bottom-3 left-4">
                            <span className={`inline-flex h-9 w-9 items-center justify-center rounded-xl ${gradient.icon}`}>
                              {serviceIcons[service.slug]}
                            </span>
                          </div>
                          <div className="absolute bottom-3 right-4">
                            <span className="rounded-full border border-[--wr-gold]/30 bg-background/80 px-4 py-2 text-base font-bold text-[--wr-gold] backdrop-blur-sm">
                              {service.priceFrom}
                            </span>
                          </div>
                        </div>
                      </Link>

                      <div className="flex flex-1 flex-col p-6">
                        <Link href={`/services/${service.slug}`}>
                          <h3 className={`font-bold text-foreground ${i === 0 ? "text-2xl" : "text-xl"}`}>
                            {service.name}
                          </h3>
                        </Link>
                        <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
                          {service.teaser}
                        </p>

                        <div className="mt-3 inline-flex w-fit items-center gap-1.5 rounded-full border border-[--wr-teal]/20 bg-[--wr-teal]/5 px-3 py-1">
                          <FileText className="h-3 w-3 text-[--wr-teal]" />
                          <span className="text-xs font-bold text-[--wr-teal]">Now / Soon / Monitor</span>
                          <span className="text-xs text-muted-foreground">priorities included</span>
                        </div>

                        <div className="mt-4 flex items-center justify-between gap-3">
                          <span className="text-xs text-muted-foreground">{service.duration}</span>
                          <div className="flex items-center gap-2">
                            <Link
                              href={`/services/${service.slug}`}
                              className="flex items-center gap-1.5 text-sm font-medium text-primary transition-colors hover:text-primary/80"
                            >
                              Details <ArrowRight className="h-3.5 w-3.5" />
                            </Link>
                            <button
                              onClick={scrollToBook}
                              className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3.5 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/20"
                            >
                              <Calendar className="h-3 w-3" />
                              Book This Service
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

      {/* â”€â”€ How It Works â”€â”€ */}
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
                copy="Send the vehicle, symptom, and parking setup. We screen the job, make a believable promise, show up on time, and leave you with a clear plan."
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

      {/* â”€â”€ Stats â”€â”€ */}
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

      {/* â”€â”€ Reviews â”€â”€ */}
      <section id="reviews" className="relative border-y border-border">
        <div className="absolute inset-0 bg-gradient-to-b from-[--wr-gold]/3 via-transparent to-[--wr-teal]/3" />
        <div className="shell section-space relative">
          <div className="grid gap-12 lg:grid-cols-[1fr_1.2fr] lg:gap-16 lg:items-start">
            <div>
            <SectionHeading
              eyebrow={hasReviews ? "Reviews" : "What To Expect"}
              title={hasReviews ? "What Spokane drivers are saying." : "New in Spokane, clear about the standard."}
              copy={
                hasReviews
                  ? "Real feedback from customers who chose screened, mobile-first service over the shop shuffle."
                  : "We would rather be honest about being new than fake a review wall. Here is the standard the business is trying to earn on every visit."
              }
              tint="gold"
            />

              <FadeIn delay={0.3}>
                <div className="mt-8 flex flex-col gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Every visit is designed to earn the next one through honest findings, clear communication, and work you can verify yourself.
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

      {/* â”€â”€ Service Areas â”€â”€ */}
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
            copy="We keep the footprint focused so arrival windows stay believable, repeat visits get easier, and the service does not turn into a vague county-wide promise."
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
            <div className="mt-14 overflow-hidden rounded-2xl border border-border" role="region" aria-label="Wrench Ready Mobile service area map â€” Spokane County, WA">
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m14!1m12!1m3!1d172684.78!2d-117.4260!3d47.6588!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!5e0!3m2!1sen!2sus!4v1"
                width="100%"
                height="300"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Wrench Ready Mobile service area â€” Spokane County, WA"
                aria-label="Interactive Google Map showing Spokane County service area for Wrench Ready Mobile"
                className="grayscale-[60%] contrast-[1.1] opacity-80 transition-all duration-500 hover:grayscale-0 hover:opacity-100"
              />
            </div>
          </FadeIn>
        </div>
      </section>

      {/* â”€â”€ Booking: Calendly Widget + Pre-Qualification Intake â”€â”€ */}
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
                  Promise first
                </span>
                <h2 className="text-3xl font-semibold text-gray-900">Request a screened appointment</h2>
                <p className="max-w-lg text-sm text-gray-500">
                  Pick a time that works. We review the request before confirming the promise.
                </p>
              </div>
              {/* Calendly inline widget â€” loads when the external script is present */}
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
                title="Tell us about the vehicle and the promise you want made."
                copy="Five quick questions so we can screen the job, confirm fit, and get you a fast answer. No commitment until the appointment is confirmed."
                tint="blue"
              />

              <FadeIn delay={0.3}>
                <div className="mt-8 space-y-4">
                  <div className="flex items-start gap-3">
                    <ClipboardCheck className="mt-0.5 h-5 w-5 shrink-0 text-[--wr-teal]" />
                    <p className="text-sm text-muted-foreground">
                      Every qualifying request is screened before the appointment is confirmed.
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <Bell className="mt-0.5 h-5 w-5 shrink-0 text-[--wr-teal]" />
                    <p className="text-sm text-muted-foreground">
                      We follow up as soon as the request is reviewed and the route is checked.
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <Shield className="mt-0.5 h-5 w-5 shrink-0 text-[--wr-teal]" />
                    <p className="text-sm text-muted-foreground">
                      Licensed, insured, and fully transparent. Scope and price are explained before you commit.
                    </p>
                  </div>
                </div>
              </FadeIn>
            </div>

            <FadeIn delay={0.2}>
              <div className="rounded-2xl border border-border bg-card/50 p-6 backdrop-blur-sm sm:p-8">
                <h3 className="text-lg font-bold text-foreground">
                  Ready for a better-fit next visit?
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

      {/* â”€â”€ FAQ â”€â”€ */}
      <section id="faq" className="relative border-t border-border">
        <SectionOrbs variant="purple" />
        <div className="shell section-space">
          <SectionHeading
            eyebrow="FAQ"
            title="Common questions, honest answers."
            copy="Clear answers that explain how Wrench Ready Mobile actually works â€” from service scope to the Now / Soon / Monitor framework."
            tint="teal"
          />
          <div className="mt-12 max-w-3xl">
            <FaqList faqs={homeFaqs} />
          </div>
        </div>
      </section>

      {/* â”€â”€ CTA â”€â”€ */}
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
              src="/hero-cta.png"
              alt="Wrench Ready Mobile branded service van parked in a clean residential driveway ready for the next appointment"
              fill
              loading="lazy"
              className="object-cover"
              sizes="100vw"
            />
            <div className="absolute inset-0 bg-background/85 backdrop-blur-[2px]" />
            <div className="absolute inset-0 bg-gradient-to-r from-background/90 to-background/70" />
          </div>

          <SectionOrbs variant="gold" />

          <div className="relative z-10 grid gap-8 p-8 sm:p-12 lg:grid-cols-2 lg:items-center lg:p-16">
            <div>
              <p className="eyebrow" style={{ color: "var(--wr-gold)" }}>Ready to get started?</p>
              <h2 className="gradient-text-gold mt-3 text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
                Schedule your appointment.
              </h2>
            </div>
            <div>
              <p className="text-base leading-relaxed text-muted-foreground">
                Send the vehicle, the service or symptom, where the car is parked, and your preferred time window. That is enough to screen most jobs and get you a fast answer.
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <button
                  onClick={scrollToBook}
                  className="btn-shimmer inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[--wr-gold] to-[--wr-gold-soft] px-7 py-3.5 text-sm font-bold text-[--wr-surface] transition-all hover:shadow-lg hover:shadow-[--wr-gold]/20 hover:scale-[1.02]"
                >
                  Schedule Now
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

