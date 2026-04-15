"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { PromiseWarrantyCase, RecordOwner } from "@/lib/promise-crm/types";

type WarrantyActionFormProps = {
  promiseId: string;
  owner: RecordOwner;
  warrantyCase?: PromiseWarrantyCase;
};

export function WarrantyActionForm({
  promiseId,
  owner,
  warrantyCase,
}: WarrantyActionFormProps) {
  const router = useRouter();
  const [status, setStatus] = useState<"monitoring" | "open" | "resolved">(
    warrantyCase?.status === "resolved"
      ? "resolved"
      : warrantyCase?.status === "monitoring"
        ? "monitoring"
        : "open",
  );
  const [severity, setSeverity] = useState<"watch" | "trust-risk" | "down-unit">(
    warrantyCase?.severity || "watch",
  );
  const [rootCause, setRootCause] = useState<
    "parts" | "installation" | "diagnosis" | "expectation-gap" | "unknown"
  >(warrantyCase?.rootCause || "unknown");
  const [makeGoodPlan, setMakeGoodPlan] = useState(warrantyCase?.makeGoodPlan || "");
  const [preventionStep, setPreventionStep] = useState(warrantyCase?.preventionStep || "");
  const [resolutionSummary, setResolutionSummary] = useState(
    warrantyCase?.resolutionSummary || "",
  );
  const [feedback, setFeedback] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit() {
    setSaving(true);
    setFeedback("");

    try {
      const response = await fetch(`/api/al/wrenchready/promises/${promiseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          warrantyCase: {
            status,
            severity,
            rootCause,
            makeGoodPlan: makeGoodPlan.trim() || undefined,
            preventionStep: preventionStep.trim() || undefined,
            resolutionSummary: resolutionSummary.trim() || undefined,
          },
          noteToAdd: `Warranty action updated from queue by ${owner}.`,
        }),
      });

      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.error || "Unable to update warranty case.");
      }

      setFeedback("Saved.");
      router.refresh();
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Unable to update warranty case.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-4 rounded-2xl border border-border bg-card/50 p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
        Queue action
      </p>
      <div className="mt-3 grid gap-3 lg:grid-cols-3">
        <label className="space-y-2">
          <span className="text-xs font-medium text-muted-foreground">Status</span>
          <select className="form-input" onChange={(e) => setStatus(e.target.value as typeof status)} value={status}>
            <option value="monitoring">Monitoring</option>
            <option value="open">Open</option>
            <option value="resolved">Resolved</option>
          </select>
        </label>
        <label className="space-y-2">
          <span className="text-xs font-medium text-muted-foreground">Severity</span>
          <select
            className="form-input"
            onChange={(e) => setSeverity(e.target.value as typeof severity)}
            value={severity}
          >
            <option value="watch">Watch</option>
            <option value="trust-risk">Trust risk</option>
            <option value="down-unit">Down unit</option>
          </select>
        </label>
        <label className="space-y-2">
          <span className="text-xs font-medium text-muted-foreground">Root cause</span>
          <select
            className="form-input"
            onChange={(e) => setRootCause(e.target.value as typeof rootCause)}
            value={rootCause}
          >
            <option value="unknown">Unknown</option>
            <option value="parts">Parts</option>
            <option value="installation">Installation</option>
            <option value="diagnosis">Diagnosis</option>
            <option value="expectation-gap">Expectation gap</option>
          </select>
        </label>
        <label className="space-y-2 lg:col-span-3">
          <span className="text-xs font-medium text-muted-foreground">Make-good plan</span>
          <textarea className="form-textarea" onChange={(e) => setMakeGoodPlan(e.target.value)} value={makeGoodPlan} />
        </label>
        <label className="space-y-2 lg:col-span-3">
          <span className="text-xs font-medium text-muted-foreground">Prevention step</span>
          <textarea className="form-textarea" onChange={(e) => setPreventionStep(e.target.value)} value={preventionStep} />
        </label>
        <label className="space-y-2 lg:col-span-3">
          <span className="text-xs font-medium text-muted-foreground">Resolution summary</span>
          <textarea className="form-textarea" onChange={(e) => setResolutionSummary(e.target.value)} value={resolutionSummary} />
        </label>
      </div>
      {feedback ? <p className="mt-3 text-sm text-muted-foreground">{feedback}</p> : null}
      <button
        className="mt-4 inline-flex items-center justify-center rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-all hover:brightness-110 disabled:opacity-60"
        disabled={saving}
        onClick={submit}
        type="button"
      >
        {saving ? "Saving..." : "Save warranty action"}
      </button>
    </div>
  );
}
