"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CheckCircle2, Save } from "lucide-react";
import type { InboundRecord } from "@/lib/promise-crm/types";

type InboundTriageFormProps = {
  inbound: InboundRecord;
};

export function InboundTriageForm({ inbound }: InboundTriageFormProps) {
  const router = useRouter();
  const [owner, setOwner] = useState<"Dez" | "Simon" | "Unassigned">(inbound.owner);
  const [qualificationStatus, setQualificationStatus] = useState<
    "new" | "screening" | "promoted"
  >(inbound.qualificationStatus);
  const [readinessRisk, setReadinessRisk] = useState<"low" | "medium" | "high">(
    inbound.readinessRisk,
  );
  const [preferredWindowLabel, setPreferredWindowLabel] = useState(
    inbound.preferredWindow.label,
  );
  const [nextAction, setNextAction] = useState(inbound.nextAction);
  const [noteToAdd, setNoteToAdd] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("saving");
    setMessage("");

    try {
      const response = await fetch(`/api/al/wrenchready/inbound/${inbound.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          owner,
          qualificationStatus,
          readinessRisk,
          preferredWindowLabel,
          nextAction,
          noteToAdd: noteToAdd.trim() || undefined,
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.error || "Could not update inbound record.");
      }

      setStatus("success");
      setMessage("Inbound triage updated.");
      setNoteToAdd("");
      router.refresh();
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Could not update inbound record.");
    }
  }

  return (
    <div className="rounded-3xl border border-border bg-card/50 p-6">
      <h2 className="text-xl font-bold text-foreground">Triage this inbound</h2>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
        Screening is where we decide whether this lead becomes a believable promise or stays out of
        the calendar until the facts are cleaner.
      </p>
      <div className="mt-4 rounded-2xl border border-border bg-background/60 p-4 text-sm text-muted-foreground">
        <p className="font-semibold text-foreground">Dispatch policy</p>
        <p className="mt-2">
          {inbound.dispatchTier || inbound.acceptancePolicy || "Human call"} /{" "}
          {inbound.serviceLane || "Needs service lane"}
        </p>
        <p className="mt-2">
          Marketed as: {inbound.marketingOffer || inbound.requestedService} /{" "}
          {inbound.marketingRole || "Needs role"}
        </p>
        {inbound.dispatchGate ? <p className="mt-2">Gate: {inbound.dispatchGate}</p> : null}
      </div>

      {inbound.screeningQuestions?.length ? (
        <div className="mt-4 rounded-2xl border border-border bg-background/60 p-4 text-sm text-muted-foreground">
          <p className="font-semibold text-foreground">Ask before you promise</p>
          <ul className="mt-3 space-y-2">
            {inbound.screeningQuestions.map((question) => (
              <li key={question} className="flex gap-2">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                {question}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {inbound.redFlagTriggers?.length ? (
        <div className="mt-4 rounded-2xl border border-border bg-background/60 p-4 text-sm text-muted-foreground">
          <p className="font-semibold text-foreground">Slow down if you hear</p>
          <ul className="mt-3 space-y-2">
            {inbound.redFlagTriggers.map((trigger) => (
              <li key={trigger} className="flex gap-2">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                {trigger}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {inbound.wedgePromise ? (
        <div className="mt-4 rounded-2xl border border-primary/20 bg-primary/10 p-4 text-sm text-muted-foreground">
          <p className="font-semibold text-foreground">Promise standard</p>
          <p className="mt-2">{inbound.wedgePromise}</p>
        </div>
      ) : null}

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
            <option value="Unassigned">Unassigned</option>
            <option value="Dez">Dez</option>
            <option value="Simon">Simon</option>
          </select>
        </label>

        <label className="block space-y-2">
          <span className="text-xs font-semibold uppercase tracking-widest text-primary">
            Qualification state
          </span>
          <select
            className="form-input"
            onChange={(event) =>
              setQualificationStatus(
                event.target.value as "new" | "screening" | "promoted",
              )
            }
            value={qualificationStatus}
          >
            <option value="new">New</option>
            <option value="screening">Screening</option>
            <option value="promoted">Promoted</option>
          </select>
        </label>

        <label className="block space-y-2">
          <span className="text-xs font-semibold uppercase tracking-widest text-primary">
            Readiness risk
          </span>
          <select
            className="form-input"
            onChange={(event) => setReadinessRisk(event.target.value as "low" | "medium" | "high")}
            value={readinessRisk}
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </label>

        <label className="block space-y-2">
          <span className="text-xs font-semibold uppercase tracking-widest text-primary">
            Preferred window label
          </span>
          <input
            className="form-input"
            onChange={(event) => setPreferredWindowLabel(event.target.value)}
            value={preferredWindowLabel}
          />
        </label>

        <label className="block space-y-2">
          <span className="text-xs font-semibold uppercase tracking-widest text-primary">
            Next action
          </span>
          <textarea
            className="form-textarea"
            onChange={(event) => setNextAction(event.target.value)}
            value={nextAction}
          />
        </label>

        <label className="block space-y-2">
          <span className="text-xs font-semibold uppercase tracking-widest text-primary">
            New operator note
          </span>
          <textarea
            className="form-textarea"
            onChange={(event) => setNoteToAdd(event.target.value)}
            placeholder="Add the latest screening detail, policy decision, or customer context."
            value={noteToAdd}
          />
        </label>

        <button
          className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-all hover:brightness-110 disabled:opacity-50"
          disabled={status === "saving"}
          type="submit"
        >
          {status === "success" ? <CheckCircle2 className="h-4 w-4" /> : <Save className="h-4 w-4" />}
          {status === "saving" ? "Saving..." : "Save triage update"}
        </button>
      </form>
    </div>
  );
}
