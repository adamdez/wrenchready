"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type CustomerDepositCheckoutProps = {
  token: string;
  amount?: number;
  status?: string;
  alreadyCollected?: number;
};

function formatCurrency(value?: number) {
  if (value === undefined) return "TBD";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export function CustomerDepositCheckout({
  token,
  amount,
  status,
  alreadyCollected,
}: CustomerDepositCheckoutProps) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");
  const [feedback, setFeedback] = useState("");

  if (!amount || amount <= 0) {
    return null;
  }

  if (status === "paid" || (alreadyCollected !== undefined && alreadyCollected >= amount)) {
    return (
      <div className="rounded-3xl border border-[--wr-teal]/20 bg-[--wr-teal]/10 p-6">
        <h2 className="text-2xl font-bold text-foreground">Deposit received</h2>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          WrenchReady has your deposit recorded. The visit is now financially locked in the system.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-border bg-card/60 p-6">
      <h2 className="text-2xl font-bold text-foreground">Lock the visit with a deposit</h2>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
        Pay the visit deposit online with card, Apple Pay, Google Pay, Cash App Pay, or other
        enabled wallet options through Stripe Checkout.
      </p>
      <div className="mt-4 rounded-2xl border border-border bg-background/60 p-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
          Deposit due now
        </p>
        <p className="mt-2 text-2xl font-bold text-foreground">{formatCurrency(amount)}</p>
        {alreadyCollected ? (
          <p className="mt-2 text-sm text-muted-foreground">
            Already collected: {formatCurrency(alreadyCollected)}
          </p>
        ) : null}
      </div>

      {feedback ? (
        <div className="mt-4 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {feedback}
        </div>
      ) : null}

      <button
        className="mt-5 inline-flex items-center justify-center rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-transform hover:-translate-y-0.5 disabled:opacity-70"
        disabled={state === "loading"}
        onClick={async () => {
          setState("loading");
          setFeedback("");

          try {
            const response = await fetch(`/api/wrenchready/status/${token}/deposit`, {
              method: "POST",
            });
            const data = await response.json().catch(() => null);

            if (!response.ok || !data?.url) {
              throw new Error(data?.error || "Unable to start deposit checkout.");
            }

            window.location.href = data.url;
          } catch (error) {
            setState("error");
            setFeedback(
              error instanceof Error ? error.message : "Unable to start deposit checkout.",
            );
            router.refresh();
          }
        }}
        type="button"
      >
        {state === "loading" ? "Opening secure checkout..." : "Pay deposit online"}
      </button>
    </div>
  );
}
