"use client";

import { CtaBand, FaqList, LinkButton, PageHero, SectionHeading } from "@/components/marketing";
import { FadeIn, Stagger, StaggerItem } from "@/components/motion/fade-in";
import { SectionOrbs } from "@/components/motion/gradient-orbs";
import { CountUp } from "@/components/motion/animated-text";
import {
  homeFaqs,
  locations,
  processSteps,
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
} from "lucide-react";
import Link from "next/link";
import { motion, useMotionValue, useTransform, useSpring } from "framer-motion";
import { useRef, type MouseEvent as ReactMouseEvent } from "react";

const serviceIcons: Record<string, React.ReactNode> = {
  "oil-change": <Wrench className="h-6 w-6" />,
  "brake-repair": <Shield className="h-6 w-6" />,
  "battery-replacement": <Zap className="h-6 w-6" />,
  "check-engine-diagnostics": <Eye className="h-6 w-6" />,
  "pre-purchase-inspection": <CheckCircle2 className="h-6 w-6" />,
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
  { icon: <Star className="h-5 w-5" />, label: "5-Star Rated", color: "text-[--wr-gold]" },
  { icon: <Clock className="h-5 w-5" />, label: "Same-Week Scheduling", color: "text-[--wr-teal]" },
  { icon: <Route className="h-5 w-5" />, label: "Focused Routes", color: "text-[--wr-blue-soft]" },
  { icon: <Eye className="h-5 w-5" />, label: "Photo Reports", color: "text-[--wr-teal]" },
  { icon: <CheckCircle2 className="h-5 w-5" />, label: "No Hidden Fees", color: "text-[--wr-gold]" },
];

function TiltCard({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const rotateX = useSpring(useTransform(y, [-0.5, 0.5], [6, -6]), { stiffness: 300, damping: 30 });
  const rotateY = useSpring(useTransform(x, [-0.5, 0.5], [-6, 6]), { stiffness: 300, damping: 30 });

  function handleMouse(e: ReactMouseEvent<HTMLDivElement>) {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    x.set((e.clientX - rect.left) / rect.width - 0.5);
    y.set((e.clientY - rect.top) / rect.height - 0.5);
  }

  function handleLeave() {
    x.set(0);
    y.set(0);
  }

  return (
    <motion.div
      ref={ref}
      className={className}
      style={{ rotateX, rotateY, transformPerspective: 800 }}
      onMouseMove={handleMouse}
      onMouseLeave={handleLeave}
    >
      {children}
    </motion.div>
  );
}

export function HomePage() {
  return (
    <>
      {/* Hero */}
      <PageHero
        eyebrow="Mobile Mechanic — Spokane, WA"
        title="Your mechanic comes to you."
        copy="Oil changes, brakes, batteries, diagnostics, and inspections at your home or workplace. No shop drop-off. No waiting room. Just honest mobile auto service across Spokane County."
        primaryLink={{ href: "/contact", label: "Book Your Appointment" }}
        secondaryLink={{ href: "/services", label: "Explore Services" }}
      />

      {/* Trust Strip — animated entrance, multi-color icons */}
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
                className="flex items-center gap-2.5 text-sm text-muted-foreground"
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

      {/* Services — Bento Grid with color-coded cards and tilt */}
      <section className="relative mesh-section-blue">
        <div className="shell section-space">
          <SectionHeading
            eyebrow="Services"
            title="Focused service lanes, not a vague everything-menu."
            copy="We handle the jobs that make the most sense mobile — maintenance, brakes, batteries, diagnostics, and inspections. Each lane is built for repeat value."
            tint="blue"
          />

          <Stagger className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-3" staggerDelay={0.1}>
            {services.map((service, i) => {
              const gradient = serviceGradients[service.slug] ?? serviceGradients["oil-change"];
              return (
                <StaggerItem
                  key={service.slug}
                  className={i === 0 ? "lg:col-span-2" : ""}
                >
                  <TiltCard>
                    <Link
                      href={`/services/${service.slug}`}
                      className={`glass-card group relative flex h-full flex-col overflow-hidden p-7 sm:p-8 ${gradient.glow} hover:shadow-2xl`}
                    >
                      <div className={`absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r ${gradient.border}`} />

                      <div className="flex items-start justify-between">
                        <span className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl ${gradient.icon}`}>
                          {serviceIcons[service.slug]}
                        </span>
                        <span className="rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-foreground">
                          {service.priceFrom}
                        </span>
                      </div>
                      <h3 className="mt-5 text-xl font-bold text-foreground sm:text-2xl">
                        {service.name}
                      </h3>
                      <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
                        {service.teaser}
                      </p>
                      <div className="mt-6 flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">{service.duration}</span>
                        <motion.span
                          className="flex items-center gap-1.5 text-sm font-medium text-primary"
                          whileHover={{ x: 4 }}
                        >
                          Learn more <ArrowRight className="h-4 w-4" />
                        </motion.span>
                      </div>
                    </Link>
                  </TiltCard>
                </StaggerItem>
              );
            })}
          </Stagger>
        </div>
      </section>

      {/* How It Works — Teal mesh, animated connecting line */}
      <section className="relative mesh-section-teal border-y border-border">
        <SectionOrbs variant="teal" />
        <div className="shell section-space">
          <SectionHeading
            eyebrow="How It Works"
            title="Four steps. That's it."
            copy="Send us a message, we screen the job, show up on time, and leave you with a clear plan."
            tint="teal"
          />

          <div className="relative mt-16">
            <motion.div
              className="absolute left-8 top-0 bottom-0 hidden w-[2px] lg:block"
              style={{
                background: "linear-gradient(to bottom, var(--wr-teal), var(--wr-blue), transparent)",
              }}
              initial={{ scaleY: 0, originY: 0 }}
              whileInView={{ scaleY: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1.5, ease: "easeOut" }}
            />

            <div className="space-y-8 lg:space-y-12">
              {processSteps.map((step, index) => (
                <FadeIn key={step.title} delay={index * 0.2} direction="left">
                  <div className="flex gap-6 lg:gap-10">
                    <div className="relative hidden shrink-0 lg:block">
                      <motion.div
                        className="flex h-16 w-16 items-center justify-center rounded-2xl text-2xl font-bold"
                        style={{
                          background: `linear-gradient(135deg, oklch(0.72 0.14 195 / 15%), oklch(0.62 0.19 255 / 10%))`,
                          border: "1px solid oklch(0.72 0.14 195 / 20%)",
                          color: "var(--wr-teal)",
                        }}
                        initial={{ scale: 0, rotate: -10 }}
                        whileInView={{ scale: 1, rotate: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: index * 0.2 + 0.3, duration: 0.5, ease: "backOut" }}
                      >
                        {index + 1}
                      </motion.div>
                    </div>
                    <div
                      className="flex-1 rounded-2xl border border-border p-6 sm:p-8 transition-all hover:border-[--wr-teal]/20"
                      style={{
                        background: `radial-gradient(ellipse at top left, oklch(0.72 0.14 195 / 3%) 0%, transparent 60%), oklch(0.12 0.02 255 / 70%)`,
                      }}
                    >
                      <div className="text-sm font-bold lg:hidden" style={{ color: "var(--wr-teal)" }}>Step {index + 1}</div>
                      <h3 className="mt-1 text-xl font-bold text-foreground lg:mt-0">{step.title}</h3>
                      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.copy}</p>
                    </div>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Stats — big animated counters, gradient underlines */}
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
              { value: 5.0, suffix: "", label: "Customer rating", color: "--wr-gold" },
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

      {/* Service Areas — purple mesh, card hover glows */}
      <section className="relative mesh-section-gold border-y border-border">
        <div className="shell section-space">
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
                    <TiltCard>
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
        </div>
      </section>

      {/* FAQ — simple, different mesh to break monotony */}
      <section className="relative">
        <SectionOrbs variant="purple" />
        <div className="shell section-space">
          <SectionHeading
            eyebrow="FAQ"
            title="Common questions, honest answers."
            copy="These answers reduce bounce, build trust, and give search engines topical depth around what Wrench Ready actually does."
            tint="teal"
          />
          <div className="mt-12 max-w-3xl">
            <FaqList faqs={homeFaqs} />
          </div>
        </div>
      </section>

      {/* CTA — gold-themed */}
      <CtaBand
        title="Schedule your appointment."
        copy="Send the vehicle, the service or symptom, where the car is parked, and your preferred time window. That is enough to screen most jobs and get you a fast answer."
      />
    </>
  );
}
