"use client";

import { useState } from "react";
import { siteConfig } from "@/data/site";

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

export function LaunchRequestForm() {
  const [formState, setFormState] = useState(initialState);
  const [status, setStatus] = useState<SubmitStatus>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  function updateField(
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
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
        body: JSON.stringify(formState),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Submission failed");
      }

      setStatus("success");
      if (typeof window !== "undefined" && "gtag" in window) {
        (window as unknown as { gtag: (...a: unknown[]) => void }).gtag(
          "event",
          "generate_lead",
          { event_category: "conversion", event_label: "appointment_form" },
        );
      }
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
      <section className="panel rounded-[1.9rem] p-6 sm:p-8">
        <div className="space-y-6 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[rgba(255,122,26,0.15)]">
            <svg className="h-8 w-8 text-[var(--accent-strong)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-3xl sm:text-4xl">Request received.</h2>
          <p className="mx-auto max-w-lg text-base leading-7 text-muted">
            We will screen the job and follow up within the next business window.
            For anything urgent, call or text directly.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <a className="button-primary" href={siteConfig.contact.phoneHref}>
              Call / Text {siteConfig.contact.phoneDisplay}
            </a>
            <button
              className="button-secondary"
              onClick={() => {
                setFormState(initialState);
                setStatus("idle");
              }}
              type="button"
            >
              Send another request
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="panel rounded-[1.9rem] p-6 sm:p-8">
      <p className="eyebrow">Appointment Request</p>
      <h2 className="mt-3 text-4xl">Send one clean message and we can screen the job faster.</h2>
      <p className="mt-4 max-w-2xl text-base leading-7 text-muted">
        Fill out the details below and we will get back to you within the next business
        window. For urgent requests, call or text directly.
      </p>

      {status === "error" && errorMessage && (
        <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {errorMessage}
        </div>
      )}

      <form className="mt-8 grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
        <label className="space-y-2 md:col-span-1">
          <span className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--accent-strong)]">
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

        <label className="space-y-2 md:col-span-1">
          <span className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--accent-strong)]">
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

        <label className="space-y-2 md:col-span-1">
          <span className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--accent-strong)]">
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

        <label className="space-y-2 md:col-span-1">
          <span className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--accent-strong)]">
            Vehicle <span className="text-red-400">*</span>
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
          <span className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--accent-strong)]">
            Service or symptom
          </span>
          <input
            className="form-input"
            name="serviceNeeded"
            onChange={updateField}
            placeholder="Oil change, front brakes, no-start, check-engine light, pre-purchase inspection..."
            value={formState.serviceNeeded}
          />
        </label>

        <label className="space-y-2 md:col-span-2">
          <span className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--accent-strong)]">
            Address and parking notes
          </span>
          <input
            className="form-input"
            name="address"
            onChange={updateField}
            placeholder="Street, business lot, apartment gate, or driveway details"
            value={formState.address}
          />
        </label>

        <label className="space-y-2 md:col-span-1">
          <span className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--accent-strong)]">
            Preferred timing
          </span>
          <input
            className="form-input"
            name="timing"
            onChange={updateField}
            placeholder="After work this week, Saturday morning, ASAP"
            value={formState.timing}
          />
        </label>

        <label className="space-y-2 md:col-span-1">
          <span className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--accent-strong)]">
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

        <div className="flex flex-wrap gap-3 md:col-span-2">
          <button
            className="button-primary"
            disabled={status === "submitting"}
            type="submit"
          >
            {status === "submitting" ? "Sending..." : "Submit request"}
          </button>
          <a className="button-secondary" href={siteConfig.contact.phoneHref}>
            Call / Text {siteConfig.contact.phoneDisplay}
          </a>
        </div>
      </form>
    </section>
  );
}
