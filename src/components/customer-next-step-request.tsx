"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type CustomerNextStepRequestProps = {
  token: string;
  recommendedService: string;
};

export function CustomerNextStepRequest({
  token,
  recommendedService,
}: CustomerNextStepRequestProps) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "success" | "error">("idle");
  const [feedback, setFeedback] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("saving");
    setFeedback("");

    try {
      const response = await fetch(`/api/wrenchready/status/${token}/request-next-step`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          customerMessage: message.trim() || undefined,
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.error || "Unable to request the next step.");
      }

      setStatus("success");
      setFeedback(
        "Your request is in. WrenchReady will review it and follow up with a clear next step.",
      );
      setMessage("");
      router.refresh();
    } catch (error) {
      setStatus("error");
      setFeedback(
        error instanceof Error ? error.message : "Unable to request the next step.",
      );
    }
  }

  return (
    <div className="rounded-3xl border border-border bg-card/60 p-6">
      <h2 className="text-2xl font-bold text-foreground">Request the next step</h2>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
        If you want to move forward with <span className="font-medium text-foreground">{recommendedService}</span>,
        send it here and WrenchReady will turn it into a reviewed inbound request instead of making you start over.
      </p>

      {feedback ? (
        <div
          className={`mt-4 rounded-2xl border px-4 py-3 text-sm ${
            status === "success"
              ? "border-[--wr-teal]/20 bg-[--wr-teal]/10 text-[--wr-teal-soft]"
              : "border-red-500/20 bg-red-500/10 text-red-200"
          }`}
        >
          {feedback}
        </div>
      ) : null}

      <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
        <label className="block space-y-2">
          <span className="text-xs font-semibold uppercase tracking-widest text-primary">
            Note for WrenchReady
          </span>
          <textarea
            className="form-textarea"
            onChange={(event) => setMessage(event.target.value)}
            placeholder="Optional note about timing, location, or what changed."
            value={message}
          />
        </label>

        <button
          className="inline-flex items-center justify-center rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-transform hover:-translate-y-0.5 disabled:opacity-70"
          disabled={status === "saving"}
          type="submit"
        >
          {status === "saving" ? "Sending..." : "Request this next step"}
        </button>
      </form>
    </div>
  );
}
