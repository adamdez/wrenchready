"use client";

import { useState } from "react";
import { siteConfig } from "@/data/site";
import { getServicesInPriorityOrder } from "@/data/site";
import { trackFormSubmit } from "@/components/analytics";
import { CheckCircle2, Phone, Send, RotateCcw } from "lucide-react";
import Link from "next/link";

type RequestFormState = {
  fullName: string;
  email: string;
  phone: string;
  vehicle: string;
  serviceNeeded: string;
  address: string;
  timing: string;
  notes: string;
};

type SubmitStatus = "idle" | "submitting" | "success" | "error";

type IntakeEvaluation = {
  serviceLane: string;
  territory: string;
  readinessRisk: "low" | "medium" | "high";
  promiseFit: "strong" | "conditional" | "review";
  nextAction: string;
};

const initialState: RequestFormState = {
  fullName: "",
  email: "",
  phone: "",
  vehicle: "",
  serviceNeeded: "",
  address: "",
  timing: "",
  notes: "",
};

const priorityServices = getServicesInPriorityOrder();

export function LaunchRequestForm() {
  const [formState, setFormState] = useState(initialState);
  const [smsConsent, setSmsConsent] = useState(false);
  const [status, setStatus] = useState<SubmitStatus>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [intakeEvaluation, setIntakeEvaluation] = useState<IntakeEvaluation | null>(null);

  function updateField(
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) {
    const { name, value } = event.target;
    setFormState((current) => ({ ...current, [name]: value }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!formState.vehicle.trim()) {
      setErrorMessage("Please enter the vehicle information so we can screen the job.");
      setStatus("error");
      return;
    }

    setStatus("submitting");
    setErrorMessage("");

    try {
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formState, smsConsent }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error || "Submission failed");
      }

      setIntakeEvaluation(data?.intakeEvaluation || null);
      setStatus("success");
      trackFormSubmit();
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please call or text us instead.",
      );
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <section className="rounded-2xl border border-border bg-card/50 p-8">
        <div className="space-y-6 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <CheckCircle2 className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-3xl font-bold">Request received.</h2>
          <p className="mx-auto max-w-lg text-sm leading-relaxed text-muted-foreground">
            {intakeEvaluation?.promiseFit === "strong"
              ? "This looks like a strong mobile-fit request. We’ll follow up with the next step as soon as we can."
              : intakeEvaluation?.promiseFit === "conditional"
                ? "We received your request and we’ll confirm the worksite, scope, and timing before we promise a slot."
                : "We received your request and we’ll screen the fit carefully before we promise timing."}
            For anything urgent, call or text directly.
          </p>
          {intakeEvaluation ? (
            <div className="mx-auto max-w-lg rounded-2xl border border-border bg-background/50 p-4 text-left">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                Screening read
              </p>
              <p className="mt-2 text-sm text-foreground">{intakeEvaluation.serviceLane}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {intakeEvaluation.territory} · {intakeEvaluation.readinessRisk} risk
              </p>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                {intakeEvaluation.nextAction}
              </p>
            </div>
          ) : null}
          <div className="flex flex-wrap justify-center gap-3">
            <a
              className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-all hover:brightness-110"
              href={siteConfig.contact.phoneHref}
            >
              <Phone className="h-4 w-4" />
              {siteConfig.contact.phoneDisplay}
            </a>
            <button
              className="inline-flex items-center gap-2 rounded-full border border-border px-6 py-3 text-sm font-medium text-foreground transition-all hover:bg-secondary"
              onClick={() => {
                setFormState(initialState);
                setIntakeEvaluation(null);
                setStatus("idle");
              }}
              type="button"
            >
              <RotateCcw className="h-4 w-4" />
              Send another
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-border bg-card/50 p-8">
      <p className="eyebrow">Appointment Request</p>
      <h2 className="mt-3 text-2xl font-bold">
        One clean message, faster screening.
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        Fill out the details below and we&apos;ll screen the job before we confirm the promise.
      </p>

      {status === "error" && errorMessage && (
        <div className="mt-4 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {errorMessage}
        </div>
      )}

      <form className="mt-8 grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
        <label className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-widest text-primary">
            Full name
          </span>
          <input
            className="form-input"
            name="fullName"
            onChange={updateField}
            placeholder="Your name"
            value={formState.fullName}
          />
        </label>

        <label className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-widest text-primary">
            Phone or text line
          </span>
          <input
            className="form-input"
            name="phone"
            onChange={updateField}
            placeholder="Best number for replies"
            type="tel"
            value={formState.phone}
          />
        </label>

        <label className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-widest text-primary">
            Email
          </span>
          <input
            className="form-input"
            name="email"
            onChange={updateField}
            placeholder="you@example.com"
            type="email"
            value={formState.email}
          />
        </label>

        <label className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-widest text-primary">
            Vehicle <span className="text-destructive">*</span>
          </span>
          <input
            className="form-input"
            name="vehicle"
            onChange={updateField}
            placeholder="2018 Honda CR-V 1.5T"
            required
            value={formState.vehicle}
          />
        </label>

        <label className="space-y-2 md:col-span-2">
          <span className="text-xs font-semibold uppercase tracking-widest text-primary">
            Highest-fit service
          </span>
          <select
            className="form-input"
            name="serviceNeeded"
            onChange={updateField}
            value={formState.serviceNeeded}
          >
            <option value="" disabled>
              Select the best match
            </option>
            {priorityServices.map((service) => (
              <option key={service.slug} value={service.name}>
                {service.name}
              </option>
            ))}
            <option value="Other / not sure">Other / not sure</option>
          </select>
        </label>

        <label className="space-y-2 md:col-span-2">
          <span className="text-xs font-semibold uppercase tracking-widest text-primary">
            Address and parking notes
          </span>
          <input
            className="form-input"
            name="address"
            onChange={updateField}
            placeholder="Street, lot, apartment gate, or driveway details"
            value={formState.address}
          />
        </label>

        <label className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-widest text-primary">
            Preferred timing
          </span>
          <input
            className="form-input"
            name="timing"
            onChange={updateField}
            placeholder="After work, Saturday morning, ASAP"
            value={formState.timing}
          />
        </label>

        <label className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-widest text-primary">
            Extra notes
          </span>
          <textarea
            className="form-textarea"
            name="notes"
            onChange={updateField}
            placeholder="Anything else that helps screen the job"
            value={formState.notes}
          />
        </label>

        <label className="flex items-start gap-3 md:col-span-2 cursor-pointer">
          <input
            checked={smsConsent}
            className="mt-1 h-4 w-4 shrink-0 rounded border-border accent-primary"
            onChange={(e) => setSmsConsent(e.target.checked)}
            type="checkbox"
          />
          <span className="text-xs leading-relaxed text-muted-foreground">
            I agree to receive text messages from WrenchReady Mobile Mechanic
            regarding my service request. Message and data rates may apply.
            Message frequency varies. Reply <strong className="text-foreground">STOP</strong> to
            opt out, <strong className="text-foreground">HELP</strong> for help. See
            our{" "}
            <Link href="/privacy" className="text-primary hover:underline">
              Privacy Policy
            </Link>{" "}
            and{" "}
            <Link href="/terms" className="text-primary hover:underline">
              Terms &amp; Conditions
            </Link>
            .
          </span>
        </label>

        <div className="flex flex-wrap gap-3 md:col-span-2">
          <button
            className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-all hover:brightness-110 disabled:opacity-50"
            disabled={status === "submitting"}
            type="submit"
          >
            <Send className="h-4 w-4" />
            {status === "submitting" ? "Sending..." : "Request Screening"}
          </button>
          <a
            className="inline-flex items-center gap-2 rounded-full border border-border px-6 py-3 text-sm font-medium text-foreground transition-all hover:bg-secondary"
            href={siteConfig.contact.phoneHref}
          >
            <Phone className="h-4 w-4" />
            {siteConfig.contact.phoneDisplay}
          </a>
        </div>
      </form>
    </section>
  );
}
