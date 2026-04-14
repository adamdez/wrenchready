"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { CollectionTask, PromisePaymentMethod, PromisePaymentCollectionStatus } from "@/lib/promise-crm/types";

type CollectionActionFormProps = {
  task: CollectionTask;
};

export function CollectionActionForm({ task }: CollectionActionFormProps) {
  const router = useRouter();
  const [status, setStatus] = useState<PromisePaymentCollectionStatus>(task.status);
  const [method, setMethod] = useState<PromisePaymentMethod>(task.method || "not-set");
  const [amountCollected, setAmountCollected] = useState(
    task.amountCollected?.toString() || "",
  );
  const [balanceDueAmount, setBalanceDueAmount] = useState(
    task.balanceDueAmount?.toString() || "",
  );
  const [invoiceReference, setInvoiceReference] = useState(task.invoiceReference || "");
  const [paymentSummary, setPaymentSummary] = useState("");
  const [noteToAdd, setNoteToAdd] = useState("");
  const [feedback, setFeedback] = useState("");
  const [saving, setSaving] = useState(false);

  function toOptionalNumber(value: string) {
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    const parsed = Number(trimmed);
    return Number.isNaN(parsed) ? undefined : parsed;
  }

  async function submit() {
    setSaving(true);
    setFeedback("");

    try {
      const response = await fetch(`/api/al/wrenchready/promises/${task.promiseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentCollection: {
            status,
            method,
            amountCollected: toOptionalNumber(amountCollected),
            balanceDueAmount: toOptionalNumber(balanceDueAmount),
            invoiceReference: invoiceReference.trim() || undefined,
            writeOffReason:
              status === "written-off" ? paymentSummary.trim() || undefined : undefined,
            paymentSummary: paymentSummary.trim() || undefined,
            collectedAt:
              status === "paid" || status === "partial" ? new Date().toISOString() : undefined,
          },
          noteToAdd: noteToAdd.trim() || undefined,
        }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.error || "Unable to update collection status.");
      }
      setFeedback("Saved.");
      setNoteToAdd("");
      router.refresh();
    } catch (error) {
      setFeedback(
        error instanceof Error ? error.message : "Unable to update collection status.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-4 rounded-2xl border border-border bg-card/50 p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
        Collection action
      </p>
      <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <label className="space-y-2">
          <span className="text-xs font-medium text-muted-foreground">Status</span>
          <select
            className="form-input"
            onChange={(event) =>
              setStatus(event.target.value as PromisePaymentCollectionStatus)
            }
            value={status}
          >
            <option value="deposit-requested">Deposit requested</option>
            <option value="awaiting-payment">Awaiting payment</option>
            <option value="partial">Partial</option>
            <option value="paid">Paid</option>
            <option value="written-off">Written off</option>
          </select>
        </label>

        <label className="space-y-2">
          <span className="text-xs font-medium text-muted-foreground">Method</span>
          <select
            className="form-input"
            onChange={(event) => setMethod(event.target.value as PromisePaymentMethod)}
            value={method}
          >
            <option value="not-set">Not set</option>
            <option value="card">Card</option>
            <option value="apple-pay">Apple Pay</option>
            <option value="google-pay">Google Pay</option>
            <option value="cash-app-pay">Cash App Pay</option>
            <option value="paypal">PayPal</option>
            <option value="venmo">Venmo</option>
            <option value="link">Link</option>
            <option value="invoice">Invoice</option>
            <option value="cash">Cash</option>
            <option value="bnpl">BNPL</option>
            <option value="other">Other</option>
          </select>
        </label>

        <label className="space-y-2">
          <span className="text-xs font-medium text-muted-foreground">Amount collected</span>
          <input
            className="form-input"
            inputMode="decimal"
            onChange={(event) => setAmountCollected(event.target.value)}
            value={amountCollected}
          />
        </label>

        <label className="space-y-2">
          <span className="text-xs font-medium text-muted-foreground">Balance due</span>
          <input
            className="form-input"
            inputMode="decimal"
            onChange={(event) => setBalanceDueAmount(event.target.value)}
            value={balanceDueAmount}
          />
        </label>

        <label className="space-y-2">
          <span className="text-xs font-medium text-muted-foreground">Invoice reference</span>
          <input
            className="form-input"
            onChange={(event) => setInvoiceReference(event.target.value)}
            placeholder="INV-1003 / card on file / office PO"
            value={invoiceReference}
          />
        </label>

        <label className="space-y-2 xl:col-span-3">
          <span className="text-xs font-medium text-muted-foreground">
            Payment summary or write-off reason
          </span>
          <textarea
            className="form-textarea"
            onChange={(event) => setPaymentSummary(event.target.value)}
            placeholder="Balance paid in driveway / invoice sent to office / write-off approved"
            value={paymentSummary}
          />
        </label>

        <label className="space-y-2 xl:col-span-3">
          <span className="text-xs font-medium text-muted-foreground">Add note</span>
          <textarea
            className="form-textarea"
            onChange={(event) => setNoteToAdd(event.target.value)}
            placeholder="What happened, who approved it, or what still needs to happen next?"
            value={noteToAdd}
          />
        </label>
      </div>

      {feedback ? (
        <p className="mt-3 text-sm text-muted-foreground">{feedback}</p>
      ) : null}

      <button
        className="mt-4 inline-flex items-center justify-center rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-all hover:brightness-110 disabled:opacity-60"
        disabled={saving}
        onClick={submit}
        type="button"
      >
        {saving ? "Saving..." : "Save collection update"}
      </button>
    </div>
  );
}
