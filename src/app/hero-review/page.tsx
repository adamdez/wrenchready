"use client";

/**
 * Hero Review Page — Internal use only, not linked from nav.
 * Shows 3 hero directions using real Simon source photos + WrenchReady brand.
 * Stop at review. Do not push to production without explicit approval.
 *
 * Route: /hero-review
 */

import Image from "next/image";
import { useState } from "react";
import {
  Calendar,
  Phone,
  Shield,
  Clock,
  CheckCircle2,
  Camera,
  ClipboardCheck,
  CircleCheck,
  MapPin,
  Star,
  ChevronDown,
} from "lucide-react";

const DIRECTIONS = [
  {
    id: "A",
    slug: "direction-a",
    name: "The Professional",
    tagline: "Trust-forward portrait. Simon right, copy left.",
    photo: "/simon/simon-a.jpg",
    recommended: false,
    weakness:
      "Background is indoor/casual — needs strong overlay to sell premium. Works best on desktop where the portrait side breathes.",
  },
  {
    id: "B",
    slug: "direction-b",
    name: "The Neighbor",
    tagline: "Warm, approachable, community-first. Best smile.",
    photo: "/simon/simon-b.jpg",
    recommended: true,
    weakness:
      "Warmth could read as less polished vs. Direction A. Copy needs to anchor the professionalism clearly.",
  },
  {
    id: "C",
    slug: "direction-c",
    name: "Straight Talk",
    tagline: "Conversion-first. Simon as trust anchor, copy dominant.",
    photo: "/simon/simon-c.jpg",
    recommended: false,
    weakness:
      "Simon photo is smaller — less personal impact. Converts well but less emotional connection on first load.",
  },
];

// ── Direction A: Professional Split ────────────────────────────────────────

function HeroDirectionA() {
  return (
    <section
      id="direction-a"
      className="relative min-h-screen overflow-hidden"
      style={{ background: "oklch(0.08 0.02 255)" }}
    >
      {/* Right-side photo panel */}
      <div
        className="absolute inset-y-0 right-0 w-full md:w-[52%]"
        style={{ zIndex: 0 }}
      >
        <Image
          src="/simon/simon-a.jpg"
          alt="Simon, WrenchReady Mobile mechanic"
          fill
          className="object-cover object-top"
          priority
          sizes="(max-width: 768px) 100vw, 52vw"
        />
        {/* Left gradient fade into dark background */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to right, oklch(0.08 0.02 255) 0%, oklch(0.08 0.02 255 / 90%) 25%, oklch(0.08 0.02 255 / 55%) 55%, transparent 100%)",
          }}
        />
        {/* Bottom fade */}
        <div
          className="absolute inset-x-0 bottom-0 h-48"
          style={{
            background:
              "linear-gradient(to top, oklch(0.08 0.02 255), transparent)",
          }}
        />
        {/* Top vignette */}
        <div
          className="absolute inset-x-0 top-0 h-32"
          style={{
            background:
              "linear-gradient(to bottom, oklch(0.08 0.02 255 / 70%), transparent)",
          }}
        />
      </div>

      {/* Brand accent glow */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{ zIndex: 1 }}
      >
        <div
          className="absolute top-1/4 -left-32 h-96 w-96 rounded-full blur-3xl"
          style={{ background: "oklch(0.62 0.19 255 / 12%)" }}
        />
        <div
          className="absolute bottom-1/3 left-1/4 h-64 w-64 rounded-full blur-3xl"
          style={{ background: "oklch(0.72 0.14 195 / 8%)" }}
        />
      </div>

      {/* Content */}
      <div
        className="relative flex min-h-screen flex-col justify-center px-6 pt-20 pb-24 md:px-16 lg:px-24"
        style={{ zIndex: 2, maxWidth: "min(680px, 55%)" }}
      >
        {/* Logo */}
        <Image
          src="/wr-logo-full.png"
          alt="WrenchReady Mobile"
          width={180}
          height={120}
          className="mb-8 drop-shadow-2xl"
          priority
        />

        {/* Live badge */}
        <span
          className="mb-6 inline-flex w-fit items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-white/90 backdrop-blur-sm"
          style={{
            borderColor: "rgba(255,255,255,0.12)",
            background: "rgba(255,255,255,0.05)",
          }}
        >
          <span className="relative flex h-2 w-2">
            <span
              className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"
              style={{ background: "oklch(0.72 0.14 195)" }}
            />
            <span
              className="relative inline-flex h-2 w-2 rounded-full"
              style={{ background: "oklch(0.72 0.14 195)" }}
            />
          </span>
          Mobile Mechanic — Spokane, WA
        </span>

        {/* Headline */}
        <h1
          className="mb-6 text-5xl font-bold leading-tight tracking-tight text-white lg:text-6xl"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Your mechanic{" "}
          <span
            style={{
              background:
                "linear-gradient(135deg, oklch(0.72 0.14 195), oklch(0.72 0.12 255))",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            comes to you.
          </span>
        </h1>

        <p className="mb-3 max-w-md text-xl font-medium leading-snug text-white/80">
          Every job is built to earn the next visit — not the biggest invoice.
        </p>
        <p className="mb-8 max-w-md text-base leading-relaxed text-white/55">
          Oil changes, brakes, batteries, diagnostics, and inspections at your
          home or workplace. No shop drop-off.
        </p>

        {/* CTAs */}
        <div className="mb-8 flex flex-wrap gap-3">
          <button
            className="inline-flex items-center gap-2 rounded-full px-8 py-4 text-base font-semibold text-white transition-all hover:brightness-110"
            style={{
              background:
                "linear-gradient(135deg, oklch(0.62 0.19 255), oklch(0.72 0.14 195))",
            }}
          >
            <Calendar className="h-5 w-5" />
            Book Now — Same-Week Slots
          </button>
          <button
            className="inline-flex items-center gap-2 rounded-full border px-7 py-4 text-base font-medium text-white backdrop-blur-sm transition-all hover:bg-white/10"
            style={{
              borderColor: "rgba(255,255,255,0.18)",
              background: "rgba(255,255,255,0.05)",
            }}
          >
            <Phone className="h-5 w-5" />
            (509) 555-0123
          </button>
        </div>

        {/* Trust items */}
        <div className="flex flex-wrap gap-x-5 gap-y-2">
          {[
            { icon: <ClipboardCheck className="h-4 w-4" />, label: "25-Point Inspection" },
            { icon: <Camera className="h-4 w-4" />, label: "Photo Reports" },
            { icon: <CircleCheck className="h-4 w-4" />, label: "Honest Recommendations" },
          ].map((item) => (
            <span
              key={item.label}
              className="flex items-center gap-2 text-sm font-medium text-white/65"
            >
              <span style={{ color: "oklch(0.72 0.14 195)" }}>{item.icon}</span>
              {item.label}
            </span>
          ))}
        </div>
      </div>

      {/* Name card overlay on photo */}
      <div
        className="absolute bottom-12 right-8 hidden md:block"
        style={{ zIndex: 3 }}
      >
        <div
          className="rounded-2xl border p-4 backdrop-blur-md"
          style={{
            background: "rgba(8, 10, 20, 0.75)",
            borderColor: "rgba(255,255,255,0.12)",
          }}
        >
          <p
            className="text-sm font-bold text-white"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Simon
          </p>
          <p className="text-xs text-white/55">Founder · WrenchReady Mobile</p>
          <div className="mt-2 flex items-center gap-1">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                className="h-3 w-3 fill-current"
                style={{ color: "oklch(0.78 0.14 85)" }}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Direction B: The Neighbor ────────────────────────────────────────────────

function HeroDirectionB() {
  return (
    <section
      id="direction-b"
      className="relative min-h-screen overflow-hidden"
      style={{ background: "oklch(0.07 0.02 55)" }}
    >
      {/* Full-bleed Simon photo with warm overlay */}
      <div className="absolute inset-0" style={{ zIndex: 0 }}>
        <Image
          src="/simon/simon-b.jpg"
          alt="Simon, WrenchReady Mobile"
          fill
          className="object-cover object-[center_20%]"
          priority
          sizes="100vw"
        />
        {/* Warm amber base tint */}
        <div
          className="absolute inset-0"
          style={{ background: "oklch(0.25 0.08 55 / 55%)" }}
        />
        {/* Dark gradient — bottom heavy for text legibility */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to top, oklch(0.05 0.02 255 / 97%) 0%, oklch(0.05 0.02 255 / 85%) 30%, oklch(0.05 0.02 255 / 40%) 60%, transparent 100%)",
          }}
        />
        {/* Left vignette */}
        <div
          className="absolute inset-y-0 left-0 w-1/3"
          style={{
            background:
              "linear-gradient(to right, oklch(0.05 0.02 255 / 80%), transparent)",
          }}
        />
      </div>

      {/* Warm glow accent */}
      <div className="pointer-events-none absolute inset-0" style={{ zIndex: 1 }}>
        <div
          className="absolute bottom-1/4 left-0 h-80 w-80 rounded-full blur-3xl"
          style={{ background: "oklch(0.78 0.14 85 / 15%)" }}
        />
      </div>

      {/* Content — bottom-anchored */}
      <div
        className="relative flex min-h-screen flex-col justify-end px-6 pb-20 pt-20 md:px-16 lg:px-24"
        style={{ zIndex: 2 }}
      >
        <div className="max-w-2xl space-y-6">
          {/* Logo */}
          <Image
            src="/wr-logo-full.png"
            alt="WrenchReady Mobile"
            width={160}
            height={107}
            className="drop-shadow-2xl"
            priority
          />

          {/* Warm badge */}
          <span
            className="inline-flex w-fit items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-white/90"
            style={{
              borderColor: "oklch(0.78 0.14 85 / 35%)",
              background: "oklch(0.78 0.14 85 / 10%)",
            }}
          >
            <MapPin className="h-3 w-3" style={{ color: "oklch(0.78 0.14 85)" }} />
            Serving Spokane, WA
          </span>

          <h1
            className="text-5xl font-bold leading-tight tracking-tight text-white lg:text-6xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            A mechanic{" "}
            <span
              style={{
                background:
                  "linear-gradient(135deg, oklch(0.78 0.14 85), oklch(0.72 0.14 195))",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              you can trust.
            </span>
          </h1>

          <p className="max-w-lg text-lg leading-relaxed text-white/75">
            Hi, I&apos;m Simon. I come to your home or workplace, do honest work,
            and send you a photo report when it&apos;s done. No upsells. No waiting
            rooms.
          </p>

          {/* Trust row */}
          <div
            className="flex flex-wrap gap-3 rounded-2xl border p-4 backdrop-blur-sm"
            style={{
              background: "rgba(255,255,255,0.05)",
              borderColor: "rgba(255,255,255,0.1)",
            }}
          >
            {[
              { icon: <Shield className="h-4 w-4" />, label: "Licensed & Insured" },
              { icon: <Clock className="h-4 w-4" />, label: "Same-Week Scheduling" },
              { icon: <CheckCircle2 className="h-4 w-4" />, label: "No Hidden Fees" },
            ].map((item) => (
              <span
                key={item.label}
                className="flex items-center gap-2 text-sm font-medium text-white/80"
              >
                <span style={{ color: "oklch(0.78 0.14 85)" }}>{item.icon}</span>
                {item.label}
              </span>
            ))}
          </div>

          {/* CTAs */}
          <div className="flex flex-wrap gap-3 pt-2">
            <button
              className="inline-flex items-center gap-2 rounded-full px-8 py-4 text-base font-semibold text-white transition-all hover:brightness-110"
              style={{ background: "oklch(0.62 0.19 255)" }}
            >
              <Calendar className="h-5 w-5" />
              Book Now — Same-Week Slots
            </button>
            <button
              className="inline-flex items-center gap-2 rounded-full border px-7 py-4 text-base font-medium text-white backdrop-blur-sm"
              style={{
                borderColor: "rgba(255,255,255,0.2)",
                background: "rgba(255,255,255,0.06)",
              }}
            >
              <Phone className="h-5 w-5" />
              Call Simon
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Direction C: Straight Talk ────────────────────────────────────────────

function HeroDirectionC() {
  return (
    <section
      id="direction-c"
      className="relative min-h-screen overflow-hidden"
      style={{ background: "oklch(0.08 0.02 255)" }}
    >
      {/* Subtle background texture / grid */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          zIndex: 0,
          backgroundImage:
            "linear-gradient(oklch(1 0 0 / 100%) 1px, transparent 1px), linear-gradient(90deg, oklch(1 0 0 / 100%) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      {/* Accent glow blobs */}
      <div className="pointer-events-none absolute inset-0" style={{ zIndex: 1 }}>
        <div
          className="absolute -top-32 right-1/4 h-[500px] w-[500px] rounded-full blur-3xl"
          style={{ background: "oklch(0.62 0.19 255 / 10%)" }}
        />
        <div
          className="absolute bottom-0 right-0 h-96 w-96 rounded-full blur-3xl"
          style={{ background: "oklch(0.72 0.14 195 / 8%)" }}
        />
      </div>

      <div
        className="relative flex min-h-screen flex-col items-start justify-center px-6 pt-20 pb-24 md:px-16 lg:px-24"
        style={{ zIndex: 2 }}
      >
        <div className="grid w-full items-center gap-16 md:grid-cols-2 lg:gap-24">

          {/* ─ Left: Copy ─ */}
          <div className="order-2 space-y-7 md:order-1">
            <Image
              src="/wr-logo-full.png"
              alt="WrenchReady Mobile"
              width={180}
              height={120}
              className="drop-shadow-2xl"
              priority
            />

            <span
              className="inline-flex w-fit items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-white/90 backdrop-blur-sm"
              style={{
                borderColor: "rgba(255,255,255,0.12)",
                background: "rgba(255,255,255,0.05)",
              }}
            >
              <span className="relative flex h-2 w-2">
                <span
                  className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"
                  style={{ background: "oklch(0.72 0.14 195)" }}
                />
                <span
                  className="relative inline-flex h-2 w-2 rounded-full"
                  style={{ background: "oklch(0.72 0.14 195)" }}
                />
              </span>
              Mobile Mechanic · Spokane, WA
            </span>

            <h1
              className="text-4xl font-bold leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Skip the shop.{" "}
              <br />
              <span
                style={{
                  background:
                    "linear-gradient(135deg, oklch(0.72 0.12 255), oklch(0.72 0.14 195))",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                We come to you.
              </span>
            </h1>

            <p className="text-lg leading-relaxed text-white/65 max-w-md">
              Oil changes, brakes, batteries, diagnostics, and pre-purchase
              inspections — at your home or workplace. Honest work. Photo
              report. Done.
            </p>

            <div className="space-y-3">
              {[
                "No shop drop-off or waiting room",
                "Licensed, insured, and Spokane-local",
                "Photo reports sent after every job",
                "Same-week availability",
              ].map((item) => (
                <div key={item} className="flex items-center gap-3">
                  <CircleCheck
                    className="h-5 w-5 flex-shrink-0"
                    style={{ color: "oklch(0.72 0.14 195)" }}
                  />
                  <span className="text-sm font-medium text-white/75">{item}</span>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-3 pt-2">
              <button
                className="inline-flex items-center gap-2 rounded-full px-8 py-4 text-base font-semibold text-white transition-all hover:brightness-110"
                style={{
                  background:
                    "linear-gradient(135deg, oklch(0.62 0.19 255), oklch(0.72 0.14 195))",
                }}
              >
                <Calendar className="h-5 w-5" />
                Book Same-Week Slot
              </button>
              <button
                className="inline-flex items-center gap-2 rounded-full border px-7 py-4 text-base font-medium text-white backdrop-blur-sm"
                style={{
                  borderColor: "rgba(255,255,255,0.18)",
                  background: "rgba(255,255,255,0.05)",
                }}
              >
                <Phone className="h-5 w-5" />
                Call Us
              </button>
            </div>
          </div>

          {/* ─ Right: Simon portrait card ─ */}
          <div className="order-1 flex justify-center md:order-2 md:justify-end">
            <div className="relative">
              {/* Glow ring */}
              <div
                className="absolute -inset-4 rounded-3xl blur-2xl"
                style={{ background: "oklch(0.62 0.19 255 / 18%)" }}
              />
              <div
                className="relative overflow-hidden rounded-3xl border"
                style={{
                  borderColor: "rgba(255,255,255,0.10)",
                  boxShadow: "0 40px 80px rgba(0,0,0,0.6)",
                  width: "min(380px, 90vw)",
                  aspectRatio: "4/5",
                }}
              >
                <Image
                  src="/simon/simon-c.jpg"
                  alt="Simon — WrenchReady Mobile founder"
                  fill
                  className="object-cover object-top"
                  sizes="(max-width: 768px) 90vw, 380px"
                />
                {/* Bottom name band */}
                <div
                  className="absolute inset-x-0 bottom-0 p-5"
                  style={{
                    background:
                      "linear-gradient(to top, rgba(5,7,18,0.95) 0%, transparent 100%)",
                  }}
                >
                  <p
                    className="text-lg font-bold text-white"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    Simon
                  </p>
                  <p className="text-sm text-white/60">
                    Founder · WrenchReady Mobile
                  </p>
                  <div className="mt-2 flex items-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className="h-3.5 w-3.5 fill-current"
                        style={{ color: "oklch(0.78 0.14 85)" }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Review Shell ────────────────────────────────────────────────────────────

export default function HeroReviewPage() {
  const [active, setActive] = useState<string | null>(null);

  return (
    <div
      style={{
        fontFamily: "system-ui, sans-serif",
        background: "oklch(0.08 0.02 255)",
        color: "white",
      }}
    >
      {/* ── Sticky review nav ── */}
      <div
        className="sticky top-0 z-50 border-b px-6 py-3"
        style={{
          background: "oklch(0.06 0.02 255 / 92%)",
          borderColor: "rgba(255,255,255,0.08)",
          backdropFilter: "blur(16px)",
        }}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "oklch(0.72 0.14 195)" }}>
              Hero Review · Internal Only
            </p>
            <p className="text-xs text-white/40">3 directions · stop at review · production unchanged</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {DIRECTIONS.map((d) => (
              <a
                key={d.id}
                href={`#${d.slug}`}
                className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all hover:bg-white/10"
                style={{
                  borderColor: d.recommended
                    ? "oklch(0.72 0.14 195 / 50%)"
                    : "rgba(255,255,255,0.12)",
                  color: d.recommended ? "oklch(0.80 0.10 195)" : "rgba(255,255,255,0.7)",
                  background: d.recommended ? "oklch(0.72 0.14 195 / 8%)" : "transparent",
                }}
              >
                {d.recommended && <Star className="h-3 w-3" />}
                {d.id}: {d.name}
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* ── Direction A ── */}
      <div>
        <DirectionLabel direction={DIRECTIONS[0]} />
        <HeroDirectionA />
        <DirectionNotes direction={DIRECTIONS[0]} active={active} setActive={setActive} />
      </div>

      {/* ── Direction B ── */}
      <div>
        <DirectionLabel direction={DIRECTIONS[1]} />
        <HeroDirectionB />
        <DirectionNotes direction={DIRECTIONS[1]} active={active} setActive={setActive} />
      </div>

      {/* ── Direction C ── */}
      <div>
        <DirectionLabel direction={DIRECTIONS[2]} />
        <HeroDirectionC />
        <DirectionNotes direction={DIRECTIONS[2]} active={active} setActive={setActive} />
      </div>

      {/* ── Decision bar ── */}
      <div
        className="border-t px-6 py-12"
        style={{ borderColor: "rgba(255,255,255,0.08)" }}
      >
        <div className="mx-auto max-w-3xl space-y-6 text-center">
          <p
            className="text-xs font-bold uppercase tracking-widest"
            style={{ color: "oklch(0.72 0.14 195)" }}
          >
            Recommendation
          </p>
          <h2
            className="text-3xl font-bold text-white"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Direction B — The Neighbor
          </h2>
          <p className="mx-auto max-w-xl text-base leading-relaxed text-white/65">
            Simon&apos;s biggest, most genuine smile is the homepage&apos;s highest-trust
            asset. Direction B leads with that emotion at full scale, grounds it
            with clear professionalism copy, and gets out of the way for the
            CTA. It&apos;s the only direction that immediately answers the visitor&apos;s
            unspoken question: &ldquo;Can I trust this person with my car?&rdquo;
          </p>
          <div
            className="mx-auto max-w-lg rounded-2xl border p-5 text-left"
            style={{
              background: "rgba(255,255,255,0.03)",
              borderColor: "rgba(255,255,255,0.08)",
            }}
          >
            <p className="mb-3 text-sm font-semibold text-white/80">Why this won:</p>
            <ul className="space-y-2 text-sm text-white/60">
              <li>✓ Leads with Simon&apos;s warmest expression — trust comes from the face first</li>
              <li>✓ Full-bleed photo = premium feel even without AI rendering</li>
              <li>✓ Copy anchors professionalism where the image is casual</li>
              <li>✓ Honest — it is genuinely him, no fabricated mechanic scenes</li>
              <li>✓ Conversion path is clean: headline → trust row → CTA, no detours</li>
            </ul>
            <p className="mt-4 text-sm font-semibold" style={{ color: "oklch(0.72 0.12 220)" }}>
              Honest weakness:
            </p>
            <p className="mt-1 text-sm text-white/55">
              The source photo is an indoor casual shot, not a vehicle/on-site
              photo. The warm overlay helps, but this still isn&apos;t as cinematic as
              a proper on-site shoot. Recommend scheduling a real shoot (Simon at
              truck, golden hour, Spokane neighborhood) as the next media
              milestone. This direction is the strongest bridge until that
              happens.
            </p>
          </div>
          <p className="text-xs text-white/35">
            Production hero unchanged. Approve a direction to proceed.
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Helper sub-components ────────────────────────────────────────────────────

function DirectionLabel({ direction }: { direction: (typeof DIRECTIONS)[0] }) {
  return (
    <div
      id={direction.slug}
      className="border-b px-6 py-4"
      style={{
        background: "oklch(0.06 0.02 255)",
        borderColor: "rgba(255,255,255,0.07)",
        scrollMarginTop: "56px",
      }}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between">
        <div>
          <span className="text-xs font-bold uppercase tracking-widest" style={{ color: "oklch(0.62 0.14 195)" }}>
            Direction {direction.id}
          </span>
          <h2
            className="text-lg font-bold text-white"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {direction.name}
            {direction.recommended && (
              <span
                className="ml-2 rounded-full px-2 py-0.5 text-xs font-semibold"
                style={{
                  background: "oklch(0.72 0.14 195 / 15%)",
                  color: "oklch(0.80 0.10 195)",
                  border: "1px solid oklch(0.72 0.14 195 / 35%)",
                }}
              >
                ★ Recommended
              </span>
            )}
          </h2>
          <p className="text-sm text-white/45">{direction.tagline}</p>
        </div>
      </div>
    </div>
  );
}

function DirectionNotes({
  direction,
  active,
  setActive,
}: {
  direction: (typeof DIRECTIONS)[0];
  active: string | null;
  setActive: (id: string | null) => void;
}) {
  const open = active === direction.id;
  return (
    <div
      className="border-b px-6 py-3"
      style={{
        background: "oklch(0.06 0.015 255)",
        borderColor: "rgba(255,255,255,0.06)",
      }}
    >
      <div className="mx-auto max-w-6xl">
        <button
          onClick={() => setActive(open ? null : direction.id)}
          className="flex w-full items-center justify-between text-left text-sm font-medium text-white/55 hover:text-white/80"
        >
          <span>Honest weaknesses & notes</span>
          <ChevronDown
            className="h-4 w-4 transition-transform"
            style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
          />
        </button>
        {open && (
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/50">
            {direction.weakness}
          </p>
        )}
      </div>
    </div>
  );
}
