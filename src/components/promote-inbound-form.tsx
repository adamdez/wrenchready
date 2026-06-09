"use client";

import { useState } from "react";
import { ArrowRight, CircleCheckBig } from "lucide-react";
import type { InboundRecord } from "@/lib/promise-crm/types";

type PromoteInboundFormProps = {
  inbound: InboundRecord;
};

export function PromoteInboundForm({ inbound }: PromoteInboundFormProps) {
  const [owner, setOwner] = useState<"Dez" | "Simon" | "Unassigned">(
    inbound.owner,
  );
  const [serviceScope, setServiceScope] = useState(inbound.requestedService);
  const [scheduledWindowLabel, setScheduledWindowLabel] = useState(inbound.preferredWindow.label);
  const [readinessSummary, setReadinessSummary] = useState(
    `Qualified from inbound. ${inbound.symptomSummary}`,
  );
  const [nextAction, setNextAction] = useState(inbound.nextAction);
  const [customerContacted, setCustomerContacted] = useState(false);
  const [scopeConfirmed, setScopeConfirmed] = useState(false);
  const [priceExpectationTbd, setPriceExpectationTbd] = useState(false);
  const [priceExpectation, setPriceExpectation] = useState("");
  const [inspectionDeliverable, setInspectionDeliverable] = useState("");
  const [customerPromiseSummary, setCustomerPromiseSummary] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const isInspection = `${inbound.requestedService} ${inbound.serviceLane} ${inbound.normalizedService}`
    .toLowerCase()
    .includes("inspection");
  const normalizedWindow = scheduledWindowLabel.trim().toLowerCase();
  const promotionBlockers = [
    owner === "Unassigned" ? "Choose an owner." : null,
    !customerContacted ? "Confirm the customer has been contacted or attempted." : null,
    !serviceScope.trim() ? "Write the confirmed service scope." : null,
    !scopeConfirmed ? "Confirm the scope with the customer before promotion." : null,
    !scheduledWindowLabel.trim() ||
    normalizedWindow === "no timing selected" ||
    normalizedWindow.includes("not selected") ||
    normalizedWindow.includes("tbd")
      ? "Confirm a real appointment window."
      : null,
    !priceExpectation.trim()
      ? priceExpectationTbd
        ? "Add the reason price is still TBD."
        : "Record the price, fee, or deposit expectation."
      : null,
    isInspection && !inspectionDeliverable.trim()
      ? "For inspections, record the paid/scoped deliverable."
      : null,
    !customerPromiseSummary.trim()
      ? "Write the customer-facing promise summary."
      : null,
  ].filter((blocker): blocker is string => Boolean(blocker));
  const canPromote = promotionBlockers.length === 0 && status !== "saving" && status !== "success";

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canPromote) {
      setStatus("error");
      setMessage("Finish the required promise gates before promoting.");
      return;
    }

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
          customerContacted,
          scopeConfirmed,
          priceExpectation: priceExpectation.trim(),
          priceExpectationTbd,
          inspectionDeliverable: inspectionDeliverable.trim() || undefined,
          customerPromiseSummary: customerPromiseSummary.trim(),
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
        Do this only after the customer-facing promise is specific enough to keep. Until these gates
        are clear, this is still an inbound request.
      </p>
      <div className="mt-4 rounded-2xl border border-border bg-background/60 p-4 text-sm">
        <p className="font-semibold text-foreground">Required before promotion</p>
        {promotionBlockers.length ? (
          <ul className="mt-3 space-y-2 text-muted-foreground">
            {promotionBlockers.map((blocker) => (
              <li key={blocker} className="flex gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-red-300" />
                {blocker}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-[--wr-teal-soft]">All promise gates are ready.</p>
        )}
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

        <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-border bg-background/50 p-4">
          <input
            checked={customerContacted}
            className="mt-1 h-4 w-4 shrink-0 rounded border-border accent-primary"
            onChange={(event) => setCustomerContacted(event.target.checked)}
            type="checkbox"
          />
          <span className="text-sm leading-relaxed text-muted-foreground">
            Customer contacted or contact attempt recorded.
          </span>
        </label>

        <label className="block space-y-2">
          <span className="text-xs font-semibold uppercase tracking-widest text-primary">
            Confirmed service scope
          </span>
          <input
            className="form-input"
            onChange={(event) => setServiceScope(event.target.value)}
            value={serviceScope}
          />
        </label>

        <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-border bg-background/50 p-4">
          <input
            checked={scopeConfirmed}
            className="mt-1 h-4 w-4 shrink-0 rounded border-border accent-primary"
            onChange={(event) => setScopeConfirmed(event.target.checked)}
            type="checkbox"
          />
          <span className="text-sm leading-relaxed text-muted-foreground">
            Scope confirmed with the customer; the prefilled request text alone is not enough.
          </span>
        </label>

        <label className="block space-y-2">
          <span className="text-xs font-semibold uppercase tracking-widest text-primary">
            Price / fee expectation
          </span>
          <textarea
            className="form-textarea"
            onChange={(event) => setPriceExpectation(event.target.value)}
            placeholder={
              priceExpectationTbd
                ? "Why is price still TBD, and what did the customer understand?"
                : "Example: Pre-purchase inspection fee confirmed at $___ before dispatch."
            }
            value={priceExpectation}
          />
        </label>

        <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-border bg-background/50 p-4">
          <input
            checked={priceExpectationTbd}
            className="mt-1 h-4 w-4 shrink-0 rounded border-border accent-primary"
            onChange={(event) => setPriceExpectationTbd(event.target.checked)}
            type="checkbox"
          />
          <span className="text-sm leading-relaxed text-muted-foreground">
            Price is explicitly TBD, with the reason documented above.
          </span>
        </label>

        {isInspection ? (
          <label className="block space-y-2">
            <span className="text-xs font-semibold uppercase tracking-widest text-primary">
              Inspection deliverable
            </span>
            <textarea
              className="form-textarea"
              onChange={(event) => setInspectionDeliverable(event.target.value)}
              placeholder="What paid/scoped decision will this inspection unlock?"
              value={inspectionDeliverable}
            />
          </label>
        ) : null}

        <label className="block space-y-2">
          <span className="text-xs font-semibold uppercase tracking-widest text-primary">
            Customer-facing promise summary
          </span>
          <textarea
            className="form-textarea"
            onChange={(event) => setCustomerPromiseSummary(event.target.value)}
            placeholder="One plain sentence you could send to the customer."
            value={customerPromiseSummary}
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
          disabled={!canPromote}
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
