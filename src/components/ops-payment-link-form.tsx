"use client";

import { useState } from "react";

type OpsPaymentLinkFormProps = {
  promiseId: string;
  customerStatusPath: string;
  canRequestDeposit: boolean;
  canRequestBalance: boolean;
};

export function OpsPaymentLinkForm({
  promiseId,
  customerStatusPath,
  canRequestDeposit,
  canRequestBalance,
}: OpsPaymentLinkFormProps) {
  const [feedback, setFeedback] = useState("");
  const [loadingKind, setLoadingKind] = useState<"deposit" | "balance" | null>(null);

  async function openLink(kind: "deposit" | "balance") {
    setLoadingKind(kind);
    setFeedback("");

    try {
      const response = await fetch(`/api/al/wrenchready/promises/${promiseId}/checkout-link`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind }),
      });
      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.url) {
        throw new Error(data?.error || "Unable to open secure checkout.");
      }

      window.open(data.url, "_blank", "noopener,noreferrer");
      setFeedback(
        kind === "deposit"
          ? "Deposit checkout opened. Hand the device to the customer or text/email the status page."
          : "Balance checkout opened. Hand the device to the customer or text/email the status page.",
      );
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Unable to open secure checkout.");
    } finally {
      setLoadingKind(null);
    }
  }

  async function copyStatusLink() {
    try {
      const absoluteUrl = new URL(customerStatusPath, window.location.origin).toString();
      await navigator.clipboard.writeText(absoluteUrl);
      setFeedback("Customer status page copied. This is the simplest link to text from the field.");
    } catch {
      setFeedback("Could not copy automatically. Open the customer status page from the promise record.");
    }
  }

  if (!canRequestDeposit && !canRequestBalance) {
    return null;
  }

  return (
    <div className="mt-4 rounded-2xl border border-border bg-card/50 p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
        Field payment action
      </p>
      <p className="mt-2 text-sm text-muted-foreground">
        Fastest launch-safe path: open secure Stripe checkout on the tech phone or tablet and let
        the customer complete payment there. This is better than pretending card-present hardware is ready.
      </p>

      <div className="mt-4 flex flex-wrap gap-3">
        {canRequestDeposit ? (
          <button
            className="inline-flex items-center justify-center rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-all hover:brightness-110 disabled:opacity-60"
            disabled={loadingKind !== null}
            onClick={() => openLink("deposit")}
            type="button"
          >
            {loadingKind === "deposit" ? "Opening deposit..." : "Open deposit checkout"}
          </button>
        ) : null}

        {canRequestBalance ? (
          <button
            className="inline-flex items-center justify-center rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-all hover:brightness-110 disabled:opacity-60"
            disabled={loadingKind !== null}
            onClick={() => openLink("balance")}
            type="button"
          >
            {loadingKind === "balance" ? "Opening balance..." : "Open balance checkout"}
          </button>
        ) : null}

        <button
          className="inline-flex items-center justify-center rounded-full border border-border bg-background/70 px-4 py-2 text-sm font-semibold text-foreground transition-all hover:bg-secondary"
          onClick={copyStatusLink}
          type="button"
        >
          Copy customer status link
        </button>
      </div>

      {feedback ? <p className="mt-3 text-sm text-muted-foreground">{feedback}</p> : null}
    </div>
  );
}
