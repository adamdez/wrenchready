"use client";

import { CtaBand, FaqList, LinkButton, SectionHeading } from "@/components/marketing";
import { FadeIn, Stagger, StaggerItem } from "@/components/motion/fade-in";
import { SectionOrbs, HeroGradientBg } from "@/components/motion/gradient-orbs";
import { AnimatedHeading, CountUp } from "@/components/motion/animated-text";
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
  Phone,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { motion, useMotionValue, useTransform, useSpring } from "framer-motion";
import { useRef, type MouseEvent as ReactMouseEvent } from "react";

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

export function HomePage() {
  return (
    <>
      {/* ── Hero with Split Image ── */}
      <section className="relative overflow-hidden">
        <HeroGradientBg />

        <div className="absolute inset-0 -z-10">
          <div className="absolute left-1/2 top-1/2 h-[1px] w-[800px] -translate-x-1/2 -translate-y-1/2 -rotate-12 bg-gradient-to-r from-transparent via-[--wr-blue]/20 to-transparent" />
        </div>

        <div className="shell pt-20 pb-24 sm:pt-28 sm:pb-32 lg:pt-32 lg:pb-36">
          <div className="grid items-center gap-12 lg:grid-cols-[1fr_1fr] lg:gap-16">
            {/* Left — Text */}
            <div className="space-y-8">
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
                  Mobile Mechanic — Spokane, WA
                </motion.span>
              </FadeIn>

              <AnimatedHeading
                text="Your mechanic comes to you."
                gradient
                className="text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl"
                delay={0.15}
              />

              <FadeIn delay={0.4}>
                <p className="max-w-xl text-lg leading-relaxed text-muted-foreground">
                  Oil changes, brakes, batteries, diagnostics, and inspections at your home or workplace. No shop drop-off. No waiting room.
                </p>
              </FadeIn>

              <FadeIn delay={0.55}>
                <div className="flex flex-wrap items-center gap-3">
                  <LinkButton href="/contact">
                    Book Your Appointment
                    <ArrowRight className="h-4 w-4" />
                  </LinkButton>
                  <LinkButton href="/services" variant="secondary">
                    Explore Services
                  </LinkButton>
                </div>
              </FadeIn>

              <FadeIn delay={0.7}>
                <div className="flex items-center gap-4 pt-2">
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
            </div>

            {/* Right — Hero Image */}
            <FadeIn direction="right" delay={0.3}>
              <div className="relative">
                <div className="relative aspect-[4/3] overflow-hidden rounded-3xl border border-border/50">
                  <Image
                    src="/hero-main.png"
                    alt="Professional mobile mechanic ready to service your vehicle"
                    fill
                    className="object-cover"
                    priority
                    sizes="(max-width: 1024px) 100vw, 50vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-background/70 via-background/10 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-5">
                    <div className="flex items-center gap-3">
                      <div className="rounded-xl border border-border/50 bg-background/80 px-4 py-2.5 backdrop-blur-sm">
                        <p className="text-xl font-bold text-foreground">5.0</p>
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Rating</p>
                      </div>
                      <div className="rounded-xl border border-border/50 bg-background/80 px-4 py-2.5 backdrop-blur-sm">
                        <p className="text-xl font-bold text-foreground">0</p>
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Shop trips</p>
                      </div>
                    </div>
                  </div>
                </div>
                {/* Floating glow behind the image */}
                <div className="absolute -inset-4 -z-10 rounded-[2rem] bg-gradient-to-br from-[--wr-blue]/10 via-[--wr-teal]/5 to-transparent blur-2xl" />
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* ── Trust Strip ── */}
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

      {/* ── Services — Cards with Photography ── */}
      <section className="relative mesh-section-blue">
        <div className="shell section-space">
          <SectionHeading
            eyebrow="Services"
            title="Focused service lanes, not a vague everything-menu."
            copy="We handle the jobs that make the most sense mobile — maintenance, brakes, batteries, diagnostics, and inspections."
            tint="blue"
          />

          <Stagger className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-3" staggerDelay={0.1}>
            {services.map((service, i) => {
              const gradient = serviceGradients[service.slug] ?? serviceGradients["oil-change"];
              const image = serviceImages[service.slug];
              return (
                <StaggerItem
                  key={service.slug}
                  className={i === 0 ? "lg:col-span-2 lg:row-span-2" : ""}
                >
                  <TiltCard className="h-full">
                    <Link
                      href={`/services/${service.slug}`}
                      className={`glass-card group relative flex h-full flex-col overflow-hidden ${gradient.glow} hover:shadow-2xl`}
                    >
                      <div className={`absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r ${gradient.border}`} />

                      {/* Service Image */}
                      <div className={`relative w-full overflow-hidden ${i === 0 ? "aspect-[16/9]" : "aspect-[16/10]"}`}>
                        <Image
                          src={image}
                          alt={service.name}
                          fill
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
                          <span className="rounded-full border border-border/50 bg-background/70 px-3 py-1 text-xs font-medium text-foreground backdrop-blur-sm">
                            {service.priceFrom}
                          </span>
                        </div>
                      </div>

                      {/* Card Content */}
                      <div className="flex flex-1 flex-col p-6">
                        <h3 className={`font-bold text-foreground ${i === 0 ? "text-2xl" : "text-xl"}`}>
                          {service.name}
                        </h3>
                        <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
                          {service.teaser}
                        </p>
                        <div className="mt-4 flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">{service.duration}</span>
                          <motion.span
                            className="flex items-center gap-1.5 text-sm font-medium text-primary"
                            whileHover={{ x: 4 }}
                          >
                            Learn more <ArrowRight className="h-4 w-4" />
                          </motion.span>
                        </div>
                      </div>
                    </Link>
                  </TiltCard>
                </StaggerItem>
              );
            })}
          </Stagger>
        </div>
      </section>

      {/* ── How It Works — with process photo ── */}
      <section className="relative mesh-section-teal border-y border-border">
        <SectionOrbs variant="teal" />
        <div className="shell section-space">
          <div className="grid gap-12 lg:grid-cols-[1fr_1fr] lg:gap-16 lg:items-center">
            {/* Left — Photo */}
            <FadeIn direction="left">
              <div className="relative aspect-[4/3] overflow-hidden rounded-3xl border border-border/50">
                <Image
                  src="/hero-process.png"
                  alt="Mechanic working on a vehicle engine in a residential driveway"
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-background/50 via-transparent to-transparent" />
                <div className="absolute -inset-4 -z-10 rounded-[2rem] bg-gradient-to-br from-[--wr-teal]/10 to-transparent blur-2xl" />
              </div>
            </FadeIn>

            {/* Right — Steps */}
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
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold"
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
                        {index + 1}
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

      {/* ── Service Areas — with aerial photo ── */}
      <section className="relative border-y border-border overflow-hidden">
        {/* Background photo with heavy overlay */}
        <div className="absolute inset-0 -z-10">
          <Image
            src="/hero-locations.png"
            alt=""
            fill
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
        </div>
      </section>

      {/* ── FAQ ── */}
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

      {/* ── CTA — with background photo ── */}
      <section className="shell section-space">
        <motion.div
          className="relative overflow-hidden rounded-3xl border border-[--wr-gold]/15"
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          {/* Background photo */}
          <div className="absolute inset-0 -z-10">
            <Image
              src="/hero-cta.png"
              alt=""
              fill
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
    </>
  );
}
