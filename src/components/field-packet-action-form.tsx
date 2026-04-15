"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { PromiseFieldExecutionPacket, RecordOwner } from "@/lib/promise-crm/types";

type FieldPacketActionFormProps = {
  promiseId: string;
  owner: RecordOwner;
  fieldExecution?: PromiseFieldExecutionPacket;
};

function formatList(value: string[] = []) {
  return value.join("\n");
}

function parseList(value: string) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

export function FieldPacketActionForm({
  promiseId,
  owner,
  fieldExecution,
}: FieldPacketActionFormProps) {
  const router = useRouter();
  const [handoffChecklist, setHandoffChecklist] = useState(
    formatList(fieldExecution?.handoffChecklist),
  );
  const [comebackPreventionSteps, setComebackPreventionSteps] = useState(
    formatList(fieldExecution?.comebackPreventionSteps),
  );
  const [closeoutSteps, setCloseoutSteps] = useState(formatList(fieldExecution?.closeoutSteps));
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
          fieldExecution: {
            handoffChecklist: parseList(handoffChecklist),
            comebackPreventionSteps: parseList(comebackPreventionSteps),
            closeoutSteps: parseList(closeoutSteps),
          },
          noteToAdd: `Field packet tightened from the field queue by ${owner}.`,
        }),
      });

      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.error || "Unable to update field packet.");
      }

      setFeedback("Saved.");
      router.refresh();
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Unable to update field packet.");
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
          <span className="text-xs font-medium text-muted-foreground">Handoff checklist</span>
          <textarea
            className="form-textarea"
            onChange={(event) => setHandoffChecklist(event.target.value)}
            placeholder="Customer handoff, invoice recap, next-step reminder"
            value={handoffChecklist}
          />
        </label>
        <label className="space-y-2">
          <span className="text-xs font-medium text-muted-foreground">Comeback prevention</span>
          <textarea
            className="form-textarea"
            onChange={(event) => setComebackPreventionSteps(event.target.value)}
            placeholder="Torque check, recheck fluid, explain watch item"
            value={comebackPreventionSteps}
          />
        </label>
        <label className="space-y-2">
          <span className="text-xs font-medium text-muted-foreground">Closeout steps</span>
          <textarea
            className="form-textarea"
            onChange={(event) => setCloseoutSteps(event.target.value)}
            placeholder="Take payment, send recap, ask for review"
            value={closeoutSteps}
          />
        </label>
      </div>
      {feedback ? <p className="mt-3 text-sm text-muted-foreground">{feedback}</p> : null}
      <button
        className="mt-4 inline-flex items-center justify-center rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-all hover:brightness-110 disabled:opacity-60"
        disabled={saving}
        onClick={submit}
        type="button"
      >
        {saving ? "Saving..." : "Save field packet"}
      </button>
    </div>
  );
}
