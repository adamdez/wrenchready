"use client";

import { useState } from "react";
import { siteConfig } from "@/data/site";
import { CheckCircle2, Phone, Send, RotateCcw } from "lucide-react";

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
      <section className="rounded-2xl border border-border bg-card/50 p-8">
        <div className="space-y-6 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <CheckCircle2 className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-3xl font-bold">Request received.</h2>
          <p className="mx-auto max-w-lg text-sm leading-relaxed text-muted-foreground">
            We&apos;ll screen the job and follow up within the next business window.
            For anything urgent, call or text directly.
          </p>
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
        Fill out the details below and we&apos;ll get back to you within the next business window.
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
            Service or symptom
          </span>
          <input
            className="form-input"
            name="serviceNeeded"
            onChange={updateField}
            placeholder="Oil change, front brakes, no-start, check-engine light..."
            value={formState.serviceNeeded}
          />
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

        <div className="flex flex-wrap gap-3 md:col-span-2">
          <button
            className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-all hover:brightness-110 disabled:opacity-50"
            disabled={status === "submitting"}
            type="submit"
          >
            <Send className="h-4 w-4" />
            {status === "submitting" ? "Sending..." : "Submit Request"}
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
