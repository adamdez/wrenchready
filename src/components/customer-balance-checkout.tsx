"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type CustomerBalanceCheckoutProps = {
  token: string;
  balanceDueAmount?: number;
  status?: string;
};

function formatCurrency(value?: number) {
  if (value === undefined) return "TBD";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export function CustomerBalanceCheckout({
  token,
  balanceDueAmount,
  status,
}: CustomerBalanceCheckoutProps) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");
  const [feedback, setFeedback] = useState("");

  if (!balanceDueAmount || balanceDueAmount <= 0) {
    return null;
  }

  if (status === "paid") {
    return (
      <div className="rounded-3xl border border-[--wr-teal]/20 bg-[--wr-teal]/10 p-6">
        <h2 className="text-2xl font-bold text-foreground">Visit paid in full</h2>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          The remaining balance has been cleared. This visit is financially closed in the system.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-border bg-card/60 p-6">
      <h2 className="text-2xl font-bold text-foreground">Pay the remaining balance</h2>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
        If you want to close the visit online instead of handling payment manually, use secure
        checkout for the remaining balance.
      </p>
      <div className="mt-4 rounded-2xl border border-border bg-background/60 p-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
          Balance due now
        </p>
        <p className="mt-2 text-2xl font-bold text-foreground">
          {formatCurrency(balanceDueAmount)}
        </p>
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
            const response = await fetch(`/api/wrenchready/status/${token}/balance`, {
              method: "POST",
            });
            const data = await response.json().catch(() => null);

            if (!response.ok || !data?.url) {
              throw new Error(data?.error || "Unable to start balance checkout.");
            }

            window.location.href = data.url;
          } catch (error) {
            setState("error");
            setFeedback(
              error instanceof Error ? error.message : "Unable to start balance checkout.",
            );
            router.refresh();
          }
        }}
        type="button"
      >
        {state === "loading" ? "Opening secure checkout..." : "Pay remaining balance online"}
      </button>
    </div>
  );
}
