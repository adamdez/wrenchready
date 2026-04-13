"use client";

import Link from "next/link";
import { useState } from "react";
import { CheckCircle2, Save, Phone } from "lucide-react";

type FormState = {
  fullName: string;
  email: string;
  phone: string;
  vehicle: string;
  serviceNeeded: string;
  address: string;
  timing: string;
  notes: string;
};

const initialState: FormState = {
  fullName: "",
  email: "",
  phone: "",
  vehicle: "",
  serviceNeeded: "",
  address: "",
  timing: "",
  notes: "",
};

export function OpsInboundForm() {
  const [formState, setFormState] = useState(initialState);
  const [status, setStatus] = useState<"idle" | "saving" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  function updateField(
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) {
    const { name, value } = event.target;
    setFormState((current) => ({ ...current, [name]: value }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("saving");
    setMessage("");

    try {
      const response = await fetch("/api/al/wrenchready/inbound", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formState),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.error || "Could not create inbound record.");
      }

      setStatus("success");
      setMessage(
        data?.inbound?.id
          ? `Inbound saved as ${data.inbound.id}.`
          : "Inbound created.",
      );
      setFormState(initialState);
    } catch (error) {
      setStatus("error");
      setMessage(
        error instanceof Error ? error.message : "Could not create inbound record.",
      );
    }
  }

  return (
    <section className="rounded-[2rem] border border-border bg-card/50 p-6 backdrop-blur-sm sm:p-8">
      <div className="max-w-3xl">
        <p className="eyebrow">Manual Inbound</p>
        <h1 className="mt-4 text-4xl font-bold tracking-tight text-foreground">
          Capture the lead before it gets fuzzy.
        </h1>
        <p className="mt-4 text-base leading-relaxed text-muted-foreground">
          Phone calls, texts, and voicemail should land in the same queue as the website. This
          form creates a real inbound record for the Promise Board.
        </p>
      </div>

      {message ? (
        <div
          className={`mt-6 rounded-2xl border px-4 py-3 text-sm ${
            status === "success"
              ? "border-[--wr-teal]/20 bg-[--wr-teal]/10 text-[--wr-teal-soft]"
              : "border-red-500/20 bg-red-500/10 text-red-200"
          }`}
        >
          {message}
        </div>
      ) : null}

      <form className="mt-8 grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
        <label className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-widest text-primary">
            Customer name
          </span>
          <input
            className="form-input"
            name="fullName"
            onChange={updateField}
            required
            value={formState.fullName}
          />
        </label>

        <label className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-widest text-primary">
            Phone
          </span>
          <input
            className="form-input"
            name="phone"
            onChange={updateField}
            required
            value={formState.phone}
          />
        </label>

        <label className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-widest text-primary">
            Email
          </span>
          <input className="form-input" name="email" onChange={updateField} value={formState.email} />
        </label>

        <label className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-widest text-primary">
            Vehicle
          </span>
          <input
            className="form-input"
            name="vehicle"
            onChange={updateField}
            placeholder="2018 Honda Civic"
            required
            value={formState.vehicle}
          />
        </label>

        <label className="space-y-2 md:col-span-2">
          <span className="text-xs font-semibold uppercase tracking-widest text-primary">
            Requested service or symptom
          </span>
          <input
            className="form-input"
            name="serviceNeeded"
            onChange={updateField}
            required
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
            required
            value={formState.address}
          />
        </label>

        <label className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-widest text-primary">
            Preferred timing
          </span>
          <input className="form-input" name="timing" onChange={updateField} value={formState.timing} />
        </label>

        <label className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-widest text-primary">
            Notes
          </span>
          <textarea className="form-textarea" name="notes" onChange={updateField} value={formState.notes} />
        </label>

        <div className="flex flex-wrap gap-3 md:col-span-2">
          <button
            className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-all hover:brightness-110 disabled:opacity-50"
            disabled={status === "saving"}
            type="submit"
          >
            {status === "success" ? <CheckCircle2 className="h-4 w-4" /> : <Save className="h-4 w-4" />}
            {status === "saving" ? "Saving..." : "Create Inbound"}
          </button>
          <Link
            className="inline-flex items-center gap-2 rounded-full border border-border px-6 py-3 text-sm font-medium text-foreground transition-all hover:bg-secondary"
            href="/ops/promises"
          >
            <Phone className="h-4 w-4" />
            Back to Promise Board
          </Link>
        </div>
      </form>
    </section>
  );
}
