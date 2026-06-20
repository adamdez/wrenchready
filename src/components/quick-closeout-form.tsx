"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CheckCircle2, Save } from "lucide-react";
import type { PromiseRecord } from "@/lib/promise-crm/types";

type QuickCloseoutFormProps = {
  promise: PromiseRecord;
};

function toOptionalAmount(value: string) {
  const amount = Number(value);
  return Number.isFinite(amount) && amount >= 0 ? amount : undefined;
}

export function QuickCloseoutForm({ promise }: QuickCloseoutFormProps) {
  const router = useRouter();
  const [completed, setCompleted] = useState(true);
  const [amount, setAmount] = useState(
    promise.economics?.finalInvoiceAmount?.toString() || "",
  );
  const [paid, setPaid] = useState(
    promise.paymentCollection?.status === "paid" ||
      promise.paymentCollection?.status === "partial",
  );
  const [followUpNeeded, setFollowUpNeeded] = useState(
    promise.status === "follow-through-due",
  );
  const [note, setNote] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("saving");
    setMessage("");

    const invoiceAmount = toOptionalAmount(amount);
    const cleanNote = note.trim();
    const summary = cleanNote || `${promise.serviceScope} closeout recorded.`;
    const followUpSummary = followUpNeeded
      ? cleanNote || `Follow up on ${promise.serviceScope}.`
      : "No follow-up needed from quick closeout.";

    try {
      const response = await fetch(`/api/al/wrenchready/promises/${promise.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: completed && !followUpNeeded ? "completed" : "follow-through-due",
          jobStage: completed ? (paid ? "collected" : "completed") : "waiting-approval",
          nextAction: followUpNeeded
            ? `Follow up: ${summary}`
            : "No follow-up needed. Job closeout is recorded.",
          noteToAdd: `Quick closeout: ${summary}`,
          economics: {
            ...promise.economics,
            finalInvoiceAmount: invoiceAmount,
          },
          commercialOutcome: {
            outcomeStatus: completed ? "completed-maintenance" : "deferred-work",
            convertedService: promise.serviceScope,
            deferredValueAmount: followUpNeeded ? invoiceAmount : undefined,
            outcomeSummary: summary,
          },
          closeout: completed
            ? {
                completedAt: new Date().toISOString(),
                workPerformedSummary: summary,
                customerConditionSummary: followUpNeeded
                  ? `Completed visit recorded. Follow-up needed: ${summary}`
                  : `Completed visit recorded. ${summary}`,
                now: followUpNeeded
                  ? [
                      {
                        title: "Follow-up needed",
                        detail: summary,
                        estimatedAmount: invoiceAmount,
                      },
                    ]
                  : [],
                soon: [],
                monitor: [],
                customerRecap: {
                  status: "not-ready",
                  channel: "email",
                  summary,
                },
                reviewRequest: {
                  status: followUpNeeded ? "not-ready" : "ready",
                  channel: "email",
                  summary: followUpNeeded
                    ? "Review ask held until the follow-up work is resolved."
                    : `Send ${promise.customer.name} a review request now that ${promise.serviceScope} is complete.`,
                },
                maintenanceReminder: {
                  status: followUpNeeded ? "seeded" : "not-seeded",
                  service: followUpNeeded ? promise.serviceScope : undefined,
                  dueLabel: followUpNeeded ? "Needs operator follow-up" : undefined,
                  summary: followUpSummary,
                },
                nextProbableVisit: {
                  service: followUpNeeded ? promise.serviceScope : "No follow-up needed",
                  reason: followUpNeeded
                    ? followUpSummary
                    : "Quick closeout says no next visit is needed.",
                  timingLabel: followUpNeeded ? "Needs operator follow-up" : undefined,
                  estimatedAmount: followUpNeeded ? invoiceAmount : undefined,
                },
                proofCapture: {
                  proofNotes: `Internal quick closeout recorded. ${summary}`,
                  assets: [],
                },
              }
            : undefined,
          paymentCollection: {
            ...promise.paymentCollection,
            status: paid ? "paid" : "awaiting-payment",
            method: promise.paymentCollection?.method || "not-set",
            amountCollected: paid ? invoiceAmount : promise.paymentCollection?.amountCollected,
            balanceDueAmount: paid ? 0 : invoiceAmount,
            collectedAt: paid ? new Date().toISOString() : promise.paymentCollection?.collectedAt,
            paymentSummary: paid ? "Marked paid from quick closeout." : "Payment still needs follow-up.",
          },
          followThroughDueAt: followUpNeeded ? new Date().toISOString() : undefined,
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.error || "Could not save closeout.");
      }

      setStatus("success");
      setMessage("Closeout saved. No customer message was sent.");
      setNote("");
      router.refresh();
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Could not save closeout.");
    }
  }

  return (
    <section className="min-w-0 rounded-3xl border border-border bg-card/60 p-4 sm:p-5">
      <div>
        <h2 className="text-lg font-bold text-foreground">Fast closeout</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Use this when the job is done and the CRM just needs the truth.
        </p>
      </div>

      {message ? (
        <div
          className={`mt-4 rounded-2xl border px-4 py-3 text-sm ${
            status === "success"
              ? "border-[var(--wr-teal)]/20 bg-[var(--wr-teal)]/10 text-[var(--wr-teal-soft)]"
              : "border-red-500/20 bg-red-500/10 text-red-200"
          }`}
        >
          {message}
        </div>
      ) : null}

      <form className="mt-4 grid min-w-0 gap-3 lg:grid-cols-12" onSubmit={handleSubmit}>
        <label className="min-w-0 space-y-1 lg:col-span-2">
          <span className="text-[11px] font-semibold uppercase tracking-widest text-primary">
            Done?
          </span>
          <select
            className="form-input"
            onChange={(event) => setCompleted(event.target.value === "yes")}
            value={completed ? "yes" : "no"}
          >
            <option value="yes">Completed</option>
            <option value="no">Not done</option>
          </select>
        </label>

        <label className="min-w-0 space-y-1 lg:col-span-2">
          <span className="text-[11px] font-semibold uppercase tracking-widest text-primary">
            Amount
          </span>
          <input
            className="form-input"
            inputMode="decimal"
            onChange={(event) => setAmount(event.target.value)}
            placeholder="Optional"
            value={amount}
          />
        </label>

        <label className="min-w-0 space-y-1 lg:col-span-2">
          <span className="text-[11px] font-semibold uppercase tracking-widest text-primary">
            Paid?
          </span>
          <select
            className="form-input"
            onChange={(event) => setPaid(event.target.value === "yes")}
            value={paid ? "yes" : "no"}
          >
            <option value="yes">Paid</option>
            <option value="no">Unpaid</option>
          </select>
        </label>

        <label className="min-w-0 space-y-1 lg:col-span-2">
          <span className="text-[11px] font-semibold uppercase tracking-widest text-primary">
            Follow-up?
          </span>
          <select
            className="form-input"
            onChange={(event) => setFollowUpNeeded(event.target.value === "yes")}
            value={followUpNeeded ? "yes" : "no"}
          >
            <option value="no">No</option>
            <option value="yes">Yes</option>
          </select>
        </label>

        <label className="min-w-0 space-y-1 lg:col-span-3">
          <span className="text-[11px] font-semibold uppercase tracking-widest text-primary">
            Note
          </span>
          <input
            className="form-input"
            onChange={(event) => setNote(event.target.value)}
            placeholder="What happened?"
            value={note}
          />
        </label>

        <div className="flex items-end lg:col-span-1">
          <button
            className="inline-flex h-[46px] w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition-all hover:brightness-110 disabled:opacity-50"
            disabled={status === "saving"}
            type="submit"
          >
            {status === "success" ? <CheckCircle2 className="h-4 w-4" /> : <Save className="h-4 w-4" />}
            {status === "saving" ? "Saving" : "Save"}
          </button>
        </div>
      </form>
    </section>
  );
}
