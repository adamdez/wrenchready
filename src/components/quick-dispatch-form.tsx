"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CheckCircle2, Send } from "lucide-react";

type FormState = {
  service: string;
  address: string;
  timing: string;
  owner: "Simon" | "Dez";
  customerName: string;
  phone: string;
  vehicle: string;
  priceExpectation: string;
  notes: string;
};

const initialState: FormState = {
  service: "",
  address: "",
  timing: "",
  owner: "Simon",
  customerName: "",
  phone: "",
  vehicle: "",
  priceExpectation: "",
  notes: "",
};

export function QuickDispatchForm() {
  const router = useRouter();
  const [formState, setFormState] = useState(initialState);
  const [status, setStatus] = useState<"idle" | "saving" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [promiseHref, setPromiseHref] = useState("");

  function updateField(
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) {
    const { name, value } = event.target;
    setFormState((current) => ({ ...current, [name]: value }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("saving");
    setMessage("");
    setPromiseHref("");

    try {
      const response = await fetch("/api/al/wrenchready/dispatch", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formState),
      });
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.error || "Could not save dispatched job.");
      }

      const promiseId = data?.promise?.id as string | undefined;
      setStatus("success");
      setMessage("Dispatched job saved. No customer message was sent.");
      setPromiseHref(promiseId ? `/ops/promises/${promiseId}` : "");
      setFormState(initialState);
      router.refresh();
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Could not save dispatched job.");
    }
  }

  return (
    <section className="rounded-3xl border border-border bg-card/60 p-4 sm:p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground">Already dispatched?</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Save the job record in one pass. Customer messages stay off.
          </p>
        </div>
        {promiseHref ? (
          <a
            className="inline-flex w-fit items-center gap-2 rounded-full border border-border px-3 py-2 text-xs font-semibold text-foreground transition-all hover:bg-secondary"
            href={promiseHref}
          >
            Open saved job
          </a>
        ) : null}
      </div>

      {message ? (
        <div
          className={`mt-4 rounded-2xl border px-4 py-3 text-sm ${
            status === "success"
              ? "border-[--wr-teal]/20 bg-[--wr-teal]/10 text-[--wr-teal-soft]"
              : "border-red-500/20 bg-red-500/10 text-red-200"
          }`}
        >
          {message}
        </div>
      ) : null}

      <form className="mt-4 grid gap-3 lg:grid-cols-12" onSubmit={handleSubmit}>
        <label className="space-y-1 lg:col-span-3">
          <span className="text-[11px] font-semibold uppercase tracking-widest text-primary">
            Job
          </span>
          <input
            className="form-input"
            name="service"
            onChange={updateField}
            placeholder="Spark plugs"
            required
            value={formState.service}
          />
        </label>

        <label className="space-y-1 lg:col-span-4">
          <span className="text-[11px] font-semibold uppercase tracking-widest text-primary">
            Address
          </span>
          <input
            className="form-input"
            name="address"
            onChange={updateField}
            placeholder="Street, city"
            required
            value={formState.address}
          />
        </label>

        <label className="space-y-1 lg:col-span-2">
          <span className="text-[11px] font-semibold uppercase tracking-widest text-primary">
            Time
          </span>
          <input
            className="form-input"
            name="timing"
            onChange={updateField}
            placeholder="Today 2 PM"
            required
            value={formState.timing}
          />
        </label>

        <label className="space-y-1 lg:col-span-2">
          <span className="text-[11px] font-semibold uppercase tracking-widest text-primary">
            Tech
          </span>
          <select
            className="form-input"
            name="owner"
            onChange={updateField}
            value={formState.owner}
          >
            <option value="Simon">Simon</option>
            <option value="Dez">Dez</option>
          </select>
        </label>

        <div className="flex items-end lg:col-span-1">
          <button
            className="inline-flex h-[46px] w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition-all hover:brightness-110 disabled:opacity-50"
            disabled={status === "saving"}
            type="submit"
          >
            {status === "success" ? <CheckCircle2 className="h-4 w-4" /> : <Send className="h-4 w-4" />}
            {status === "saving" ? "Saving" : "Save"}
          </button>
        </div>

        <label className="space-y-1 lg:col-span-3">
          <span className="text-[11px] font-semibold uppercase tracking-widest text-primary">
            Customer
          </span>
          <input
            className="form-input"
            name="customerName"
            onChange={updateField}
            placeholder="Optional"
            value={formState.customerName}
          />
        </label>

        <label className="space-y-1 lg:col-span-3">
          <span className="text-[11px] font-semibold uppercase tracking-widest text-primary">
            Phone
          </span>
          <input
            className="form-input"
            name="phone"
            onChange={updateField}
            placeholder="Optional"
            value={formState.phone}
          />
        </label>

        <label className="space-y-1 lg:col-span-3">
          <span className="text-[11px] font-semibold uppercase tracking-widest text-primary">
            Vehicle
          </span>
          <input
            className="form-input"
            name="vehicle"
            onChange={updateField}
            placeholder="Optional"
            value={formState.vehicle}
          />
        </label>

        <label className="space-y-1 lg:col-span-3">
          <span className="text-[11px] font-semibold uppercase tracking-widest text-primary">
            Price
          </span>
          <input
            className="form-input"
            name="priceExpectation"
            onChange={updateField}
            placeholder="Optional"
            value={formState.priceExpectation}
          />
        </label>

        <label className="space-y-1 lg:col-span-12">
          <span className="text-[11px] font-semibold uppercase tracking-widest text-primary">
            Note
          </span>
          <textarea
            className="form-textarea min-h-20"
            name="notes"
            onChange={updateField}
            placeholder="Optional: parts, gate code, parking, customer instruction"
            value={formState.notes}
          />
        </label>
      </form>
    </section>
  );
}
