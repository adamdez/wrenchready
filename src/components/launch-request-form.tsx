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
  const [copied, setCopied] = useState(false);

  const requestBody = [
    `Name: ${formState.fullName || "Not provided"}`,
    `Email: ${formState.email || "Not provided"}`,
    `Phone/Text: ${formState.phone || "Not provided"}`,
    `Vehicle: ${formState.vehicle || "Not provided"}`,
    `Service or symptom: ${formState.serviceNeeded || "Not provided"}`,
    `Address / parking notes: ${formState.address || "Not provided"}`,
    `Preferred timing: ${formState.timing || "Not provided"}`,
    "",
    "Extra notes:",
    formState.notes || "None yet",
  ].join("\n");

  const subject = `Appointment request for ${formState.vehicle || "mobile auto service"}`;
  const mailtoHref = `mailto:${siteConfig.contact.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(requestBody)}`;

  function updateField(
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) {
    const { name, value } = event.target;

    setFormState((current) => ({
      ...current,
      [name]: value,
    }));
  }

  async function copyRequest() {
    try {
      await navigator.clipboard.writeText(requestBody);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  function openEmail(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    window.location.href = mailtoHref;
  }

  return (
    <section className="panel rounded-[1.9rem] p-6 sm:p-8">
      <p className="eyebrow">Appointment Request</p>
      <h2 className="mt-3 text-4xl">Send one clean message and we can screen the job faster.</h2>
      <p className="mt-4 max-w-2xl text-base leading-7 text-muted">
        This launch form opens your default email app with the request already filled in.
        It keeps the site functional now while a full booking stack is being wired in.
      </p>

      <form className="mt-8 grid gap-4 md:grid-cols-2" onSubmit={openEmail}>
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
            Phone or text line
          </span>
          <input
            className="form-input"
            name="phone"
            onChange={updateField}
            placeholder="Best number for replies"
            value={formState.phone}
          />
        </label>

        <label className="space-y-2 md:col-span-1">
          <span className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--accent-strong)]">
            Vehicle
          </span>
          <input
            className="form-input"
            name="vehicle"
            onChange={updateField}
            placeholder="2018 Honda CR-V 1.5T"
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
          <button className="button-primary" type="submit">
            Open in email
          </button>
          <button className="button-secondary" onClick={copyRequest} type="button">
            {copied ? "Copied" : "Copy request"}
          </button>
        </div>
      </form>
    </section>
  );
}
