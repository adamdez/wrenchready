"use client";

import { useState } from "react";
import Link from "next/link";
import { siteConfig } from "@/data/site";

type Urgency = "urgent" | "soon" | "convenience";

type Symptom = {
  label: string;
  serviceSlug: string;
  serviceName: string;
  urgency: Urgency;
  description: string;
};

type Category = {
  label: string;
  icon: string;
  description: string;
  symptoms: Symptom[];
};

const categories: Category[] = [
  {
    label: "Strange noise",
    icon: "🔊",
    description: "Grinding, squealing, clicking, or knocking",
    symptoms: [
      {
        label: "Grinding or scraping sound",
        serviceSlug: "brake-repair",
        serviceName: "Mobile Brake Service",
        urgency: "urgent",
        description:
          "Grinding usually means metal-on-metal contact in the brakes. Continuing to drive can damage rotors and compromise stopping power.",
      },
      {
        label: "High-pitched squealing",
        serviceSlug: "brake-repair",
        serviceName: "Mobile Brake Service",
        urgency: "urgent",
        description:
          "Squealing brakes typically signal worn pads that need replacement before they damage the rotors underneath.",
      },
      {
        label: "Clicking or ticking sound",
        serviceSlug: "check-engine-diagnostics",
        serviceName: "Check Engine Diagnostics",
        urgency: "soon",
        description:
          "Clicking can point to valve train issues, low oil, or a worn CV joint. A diagnostic visit pinpoints the source before guessing at parts.",
      },
      {
        label: "Knocking from the engine",
        serviceSlug: "check-engine-diagnostics",
        serviceName: "Check Engine Diagnostics",
        urgency: "soon",
        description:
          "Engine knock can relate to fuel quality, ignition timing, or internal wear. A structured diagnostic narrows the cause.",
      },
    ],
  },
  {
    label: "Warning light on",
    icon: "⚠️",
    description: "Check engine, brake, battery, or oil pressure light",
    symptoms: [
      {
        label: "Check engine light",
        serviceSlug: "check-engine-diagnostics",
        serviceName: "Check Engine Diagnostics",
        urgency: "soon",
        description:
          "The check engine light covers hundreds of possible causes. A diagnostic visit with a code scan and context review finds the real issue.",
      },
      {
        label: "Brake warning light",
        serviceSlug: "brake-repair",
        serviceName: "Mobile Brake Service",
        urgency: "urgent",
        description:
          "A brake warning light can signal low fluid, worn pads, or a system fault. This should be inspected before driving further.",
      },
      {
        label: "Battery warning light",
        serviceSlug: "battery-replacement",
        serviceName: "Battery Replacement",
        urgency: "urgent",
        description:
          "The battery light often means the charging system is not keeping up. The vehicle could stall without warning if this is ignored.",
      },
      {
        label: "Oil pressure warning light",
        serviceSlug: "check-engine-diagnostics",
        serviceName: "Check Engine Diagnostics",
        urgency: "urgent",
        description:
          "Low oil pressure can cause serious engine damage quickly. Stop driving if safe and get a diagnostic visit scheduled immediately.",
      },
    ],
  },
  {
    label: "Won't start",
    icon: "🔑",
    description: "No crank, clicks but won't turn, or cranks but won't fire",
    symptoms: [
      {
        label: "Nothing happens when I turn the key",
        serviceSlug: "battery-replacement",
        serviceName: "Battery Replacement",
        urgency: "urgent",
        description:
          "A completely dead response usually points to a dead battery or a connection issue. On-site battery testing confirms the cause fast.",
      },
      {
        label: "Clicks but the engine won't turn over",
        serviceSlug: "battery-replacement",
        serviceName: "Battery Replacement",
        urgency: "urgent",
        description:
          "Rapid clicking with no crank is a classic weak battery symptom. A mobile battery test and replacement can get you moving again.",
      },
      {
        label: "Engine cranks but won't fire up",
        serviceSlug: "check-engine-diagnostics",
        serviceName: "Check Engine Diagnostics",
        urgency: "soon",
        description:
          "If the engine turns but will not start, the issue is likely fuel, spark, or sensor related. A diagnostic visit is the right first step.",
      },
    ],
  },
  {
    label: "Fluid leak",
    icon: "💧",
    description: "Puddles under the car, stains on driveway, unusual smell",
    symptoms: [
      {
        label: "Dark puddle under the engine",
        serviceSlug: "check-engine-diagnostics",
        serviceName: "Check Engine Diagnostics",
        urgency: "soon",
        description:
          "Dark fluid is usually oil. A leak inspection identifies the source and whether it is safe to continue driving while scheduling repair.",
      },
      {
        label: "Bright green, orange, or pink fluid",
        serviceSlug: "check-engine-diagnostics",
        serviceName: "Check Engine Diagnostics",
        urgency: "soon",
        description:
          "Colored coolant leaks can lead to overheating. A diagnostic visit checks the cooling system and gives you a clear next step.",
      },
      {
        label: "Sweet or burning smell without visible leak",
        serviceSlug: "check-engine-diagnostics",
        serviceName: "Check Engine Diagnostics",
        urgency: "soon",
        description:
          "Unusual smells often point to coolant or oil contacting hot surfaces. A diagnostic visit helps locate the source before it gets worse.",
      },
    ],
  },
  {
    label: "Performance issue",
    icon: "📉",
    description: "Rough idle, poor acceleration, overheating, or vibration",
    symptoms: [
      {
        label: "Rough or uneven idle",
        serviceSlug: "check-engine-diagnostics",
        serviceName: "Check Engine Diagnostics",
        urgency: "soon",
        description:
          "A rough idle can stem from spark plugs, fuel delivery, vacuum leaks, or sensors. Diagnostics narrow it down before parts are guessed.",
      },
      {
        label: "Poor acceleration or loss of power",
        serviceSlug: "check-engine-diagnostics",
        serviceName: "Check Engine Diagnostics",
        urgency: "soon",
        description:
          "Sluggish acceleration often involves fuel, air, or ignition systems. A structured diagnostic avoids throwing parts at the problem.",
      },
      {
        label: "Engine overheating",
        serviceSlug: "check-engine-diagnostics",
        serviceName: "Check Engine Diagnostics",
        urgency: "urgent",
        description:
          "Overheating can cause permanent engine damage quickly. Stop driving if the gauge is in the red and schedule a diagnostic visit.",
      },
      {
        label: "Vibration while driving or braking",
        serviceSlug: "check-engine-diagnostics",
        serviceName: "Check Engine Diagnostics",
        urgency: "soon",
        description:
          "Vibrations can come from warped rotors, worn suspension, or drivetrain issues. A diagnostic visit identifies what needs attention first.",
      },
    ],
  },
  {
    label: "Routine maintenance needed",
    icon: "🔧",
    description: "Oil change due, brakes feel soft, battery getting old",
    symptoms: [
      {
        label: "Oil change is due or overdue",
        serviceSlug: "oil-change",
        serviceName: "Mobile Oil Change",
        urgency: "convenience",
        description:
          "Routine oil changes keep your engine healthy and are one of the best mobile-fit services. Schedule at your convenience.",
      },
      {
        label: "Brakes feel soft or spongy",
        serviceSlug: "brake-repair",
        serviceName: "Mobile Brake Service",
        urgency: "soon",
        description:
          "Soft brakes can indicate worn pads, low fluid, or air in the lines. Get an inspection scheduled within the next few days.",
      },
      {
        label: "Battery is 3+ years old or slow to crank",
        serviceSlug: "battery-replacement",
        serviceName: "Battery Replacement",
        urgency: "convenience",
        description:
          "Batteries typically last 3–5 years. Proactive testing and replacement avoids a surprise no-start situation.",
      },
    ],
  },
];

const urgencyConfig: Record<
  Urgency,
  { label: string; color: string; bg: string; border: string; action: string }
> = {
  urgent: {
    label: "Urgent — act today",
    color: "text-red-400",
    bg: "rgba(239,68,68,0.10)",
    border: "rgba(239,68,68,0.30)",
    action: "Call now",
  },
  soon: {
    label: "Soon — schedule this week",
    color: "text-amber-400",
    bg: "rgba(245,158,11,0.10)",
    border: "rgba(245,158,11,0.30)",
    action: "Book an appointment",
  },
  convenience: {
    label: "Schedule at your convenience",
    color: "text-[var(--success)]",
    bg: "rgba(155,231,196,0.10)",
    border: "rgba(155,231,196,0.30)",
    action: "Book an appointment",
  },
};

export function SymptomChecker() {
  const [step, setStep] = useState(0);
  const [categoryIndex, setCategoryIndex] = useState<number | null>(null);
  const [symptomIndex, setSymptomIndex] = useState<number | null>(null);

  function selectCategory(index: number) {
    setCategoryIndex(index);
    setSymptomIndex(null);
    setStep(1);
  }

  function selectSymptom(index: number) {
    setSymptomIndex(index);
    setStep(2);
  }

  function reset() {
    setStep(0);
    setCategoryIndex(null);
    setSymptomIndex(null);
  }

  const selectedCategory =
    categoryIndex !== null ? categories[categoryIndex] : null;
  const selectedSymptom =
    selectedCategory && symptomIndex !== null
      ? selectedCategory.symptoms[symptomIndex]
      : null;

  return (
    <div className="mx-auto max-w-3xl">
      {/* Progress indicator */}
      <div className="mb-8 flex items-center justify-center gap-2">
        {["Category", "Symptom", "Result"].map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            <button
              onClick={() => {
                if (i < step) {
                  setStep(i);
                  if (i === 0) {
                    setCategoryIndex(null);
                    setSymptomIndex(null);
                  }
                  if (i === 1) {
                    setSymptomIndex(null);
                  }
                }
              }}
              disabled={i > step}
              className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold transition-all duration-300 ${
                i < step
                  ? "cursor-pointer border border-[var(--accent)] bg-[rgba(255,122,26,0.15)] text-[var(--accent-strong)]"
                  : i === step
                    ? "border border-[var(--accent)] bg-[var(--accent)] text-[#111214]"
                    : "border border-[var(--line)] bg-transparent text-[var(--muted)]"
              }`}
            >
              {i < step ? "✓" : i + 1}
            </button>
            <span
              className={`hidden text-sm sm:inline ${
                i === step
                  ? "font-semibold text-[var(--foreground)]"
                  : "text-[var(--muted)]"
              }`}
            >
              {label}
            </span>
            {i < 2 && (
              <div
                className={`mx-1 h-px w-8 transition-colors duration-300 sm:w-12 ${
                  i < step ? "bg-[var(--accent)]" : "bg-[var(--line)]"
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step 0: Category selection */}
      <div
        className={`transition-all duration-300 ${
          step === 0
            ? "translate-y-0 opacity-100"
            : "pointer-events-none absolute -translate-y-4 opacity-0"
        }`}
      >
        {step === 0 && (
          <>
            <h3 className="mb-6 text-center text-2xl">
              What best describes the issue?
            </h3>
            <div className="grid gap-3 sm:grid-cols-2">
              {categories.map((cat, i) => (
                <button
                  key={cat.label}
                  onClick={() => selectCategory(i)}
                  className="panel group cursor-pointer rounded-[1.4rem] p-5 text-left transition-all duration-200 hover:border-[var(--accent)] hover:bg-[rgba(255,122,26,0.06)]"
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{cat.icon}</span>
                    <div>
                      <p className="text-lg font-semibold text-[var(--foreground)] transition-colors group-hover:text-[var(--accent-soft)]">
                        {cat.label}
                      </p>
                      <p className="mt-1 text-sm leading-relaxed text-[var(--muted)]">
                        {cat.description}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Step 1: Symptom selection */}
      <div
        className={`transition-all duration-300 ${
          step === 1
            ? "translate-y-0 opacity-100"
            : "pointer-events-none absolute -translate-y-4 opacity-0"
        }`}
      >
        {step === 1 && selectedCategory && (
          <>
            <div className="mb-6 text-center">
              <p className="mb-2 text-sm text-[var(--muted)]">
                {selectedCategory.icon} {selectedCategory.label}
              </p>
              <h3 className="text-2xl">Which sounds closest?</h3>
            </div>
            <div className="grid gap-3">
              {selectedCategory.symptoms.map((symptom, i) => (
                <button
                  key={symptom.label}
                  onClick={() => selectSymptom(i)}
                  className="panel group cursor-pointer rounded-[1.4rem] p-5 text-left transition-all duration-200 hover:border-[var(--accent)] hover:bg-[rgba(255,122,26,0.06)]"
                >
                  <p className="text-lg font-semibold text-[var(--foreground)] transition-colors group-hover:text-[var(--accent-soft)]">
                    {symptom.label}
                  </p>
                </button>
              ))}
            </div>
            <button
              onClick={() => setStep(0)}
              className="mt-4 block w-full text-center text-sm text-[var(--muted)] transition-colors hover:text-[var(--foreground)]"
            >
              ← Back to categories
            </button>
          </>
        )}
      </div>

      {/* Step 2: Result */}
      <div
        className={`transition-all duration-300 ${
          step === 2
            ? "translate-y-0 opacity-100"
            : "pointer-events-none absolute translate-y-4 opacity-0"
        }`}
      >
        {step === 2 && selectedCategory && selectedSymptom && (
          <div className="space-y-6">
            <div className="text-center">
              <p className="mb-2 text-sm text-[var(--muted)]">
                {selectedCategory.icon} {selectedCategory.label} →{" "}
                {selectedSymptom.label}
              </p>
              <h3 className="text-2xl">Here&rsquo;s what we recommend</h3>
            </div>

            <div className="panel rounded-[1.8rem] p-6 sm:p-8">
              {/* Urgency badge */}
              <div
                className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold"
                style={{
                  background: urgencyConfig[selectedSymptom.urgency].bg,
                  border: `1px solid ${urgencyConfig[selectedSymptom.urgency].border}`,
                }}
              >
                <span
                  className={urgencyConfig[selectedSymptom.urgency].color}
                >
                  {urgencyConfig[selectedSymptom.urgency].label}
                </span>
              </div>

              {/* Service recommendation */}
              <h4 className="mt-5 text-3xl">
                {selectedSymptom.serviceName}
              </h4>
              <p className="mt-3 text-base leading-7 text-[var(--muted)]">
                {selectedSymptom.description}
              </p>

              {/* Divider */}
              <div className="glow-divider mt-6 pt-6">
                <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[var(--accent-soft)]">
                  Recommended Next Step
                </p>
                <p className="mt-2 text-base leading-7 text-[var(--muted)]">
                  {selectedSymptom.urgency === "urgent"
                    ? "This should be looked at today. Call or text to describe the symptom and get the fastest available slot."
                    : selectedSymptom.urgency === "soon"
                      ? "Schedule within the next few days. Send the vehicle details, symptom, and your address to get started."
                      : "No rush, but don't wait too long. Book at a time that works for your schedule."}
                </p>
              </div>

              {/* CTAs */}
              <div className="mt-8 flex flex-wrap gap-3">
                {selectedSymptom.urgency === "urgent" ? (
                  <>
                    <a
                      className="button-primary"
                      href={siteConfig.contact.phoneHref}
                    >
                      Call {siteConfig.contact.phoneDisplay}
                    </a>
                    <Link
                      className="button-secondary"
                      href={`/services/${selectedSymptom.serviceSlug}`}
                    >
                      Learn about this service
                    </Link>
                  </>
                ) : (
                  <>
                    <Link className="button-primary" href="/contact">
                      Schedule your appointment
                    </Link>
                    <Link
                      className="button-secondary"
                      href={`/services/${selectedSymptom.serviceSlug}`}
                    >
                      Learn about this service
                    </Link>
                  </>
                )}
              </div>
            </div>

            <button
              onClick={reset}
              className="block w-full text-center text-sm text-[var(--muted)] transition-colors hover:text-[var(--foreground)]"
            >
              ← Start over with a different symptom
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
