"use client";

import { useState } from "react";
import { ArrowRight, CircleCheckBig } from "lucide-react";
import type { InboundRecord } from "@/lib/promise-crm/types";

type PromoteInboundFormProps = {
  inbound: InboundRecord;
};

export function PromoteInboundForm({ inbound }: PromoteInboundFormProps) {
  const [owner, setOwner] = useState<"Dez" | "Simon" | "Unassigned">(
    inbound.owner === "Unassigned" ? "Dez" : inbound.owner,
  );
  const [serviceScope, setServiceScope] = useState(inbound.requestedService);
  const [scheduledWindowLabel, setScheduledWindowLabel] = useState(inbound.preferredWindow.label);
  const [readinessSummary, setReadinessSummary] = useState(
    `Qualified from inbound. ${inbound.symptomSummary}`,
  );
  const [nextAction, setNextAction] = useState(inbound.nextAction);
  const [status, setStatus] = useState<"idle" | "saving" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("saving");
    setMessage("");

    try {
      const response = await fetch("/api/al/wrenchready/promises", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inboundId: inbound.id,
          owner,
          serviceScope,
          scheduledWindowLabel,
          readinessSummary,
          nextAction,
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.error || "Could not promote inbound record.");
      }

      setStatus("success");
      setMessage(data?.promise?.id ? `Promise created as ${data.promise.id}.` : "Promise created.");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Could not promote inbound record.");
    }
  }

  return (
    <div className="rounded-3xl border border-border bg-card/50 p-6">
      <h2 className="text-xl font-bold text-foreground">Promote to promise</h2>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
        Do this only when the scope, owner, and timing are clear enough to keep. A vague promise is
        still a broken promise waiting to happen.
      </p>
      <div className="mt-4 rounded-2xl border border-border bg-background/60 p-4 text-sm text-muted-foreground">
        <p className="font-semibold text-foreground">Pricing posture</p>
        <p className="mt-2">
          {inbound.dispatchTier || inbound.acceptancePolicy || "Human call"} /{" "}
          {inbound.serviceLane || "Needs service lane"}
        </p>
        <p className="mt-2">
          Marketed as: {inbound.marketingOffer || inbound.requestedService} /{" "}
          {inbound.marketingRole || "Needs role"}
        </p>
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

      <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
        <label className="block space-y-2">
          <span className="text-xs font-semibold uppercase tracking-widest text-primary">Owner</span>
          <select
            className="form-input"
            onChange={(event) => setOwner(event.target.value as "Dez" | "Simon" | "Unassigned")}
            value={owner}
          >
            <option value="Dez">Dez</option>
            <option value="Simon">Simon</option>
            <option value="Unassigned">Unassigned</option>
          </select>
        </label>

        <label className="block space-y-2">
          <span className="text-xs font-semibold uppercase tracking-widest text-primary">
            Service scope
          </span>
          <input
            className="form-input"
            onChange={(event) => setServiceScope(event.target.value)}
            value={serviceScope}
          />
        </label>

        <label className="block space-y-2">
          <span className="text-xs font-semibold uppercase tracking-widest text-primary">
            Promised window
          </span>
          <input
            className="form-input"
            onChange={(event) => setScheduledWindowLabel(event.target.value)}
            value={scheduledWindowLabel}
          />
        </label>

        <label className="block space-y-2">
          <span className="text-xs font-semibold uppercase tracking-widest text-primary">
            Readiness summary
          </span>
          <textarea
            className="form-textarea"
            onChange={(event) => setReadinessSummary(event.target.value)}
            value={readinessSummary}
          />
        </label>

        <label className="block space-y-2">
          <span className="text-xs font-semibold uppercase tracking-widest text-primary">
            Immediate next action
          </span>
          <textarea
            className="form-textarea"
            onChange={(event) => setNextAction(event.target.value)}
            value={nextAction}
          />
        </label>

        <button
          className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-all hover:brightness-110 disabled:opacity-50"
          disabled={status === "saving" || status === "success"}
          type="submit"
        >
          {status === "success" ? <CircleCheckBig className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
          {status === "saving"
            ? "Promoting..."
            : status === "success"
              ? "Promoted"
              : "Promote to promise"}
        </button>
      </form>
    </div>
  );
}
