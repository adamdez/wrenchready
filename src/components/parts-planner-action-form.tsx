"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type {
  PromiseFieldExecutionPacket,
  PromisePartItem,
  PromisePartItemStatus,
  RecordOwner,
} from "@/lib/promise-crm/types";

type PartsPlannerActionFormProps = {
  promiseId: string;
  owner: RecordOwner;
  fieldExecution?: PromiseFieldExecutionPacket;
};

function formatPartsPlan(value: PromisePartItem[] = []) {
  return value
    .map((item) =>
      [
        item.label,
        item.partNumber || "",
        item.quantity?.toString() || "",
        item.vendor || "",
        item.vendorLocation || "",
        item.estimatedCost?.toString() || "",
        item.status,
        item.requiredForVisit === false ? "optional" : "required",
        item.fitmentNotes || "",
        item.sourceUrl || "",
        item.notes || "",
      ].join(" | "),
    )
    .join("\n");
}

function parsePartsPlan(value: string): PromisePartItem[] {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [
        label = "",
        partNumber = "",
        quantity = "",
        vendor = "",
        vendorLocation = "",
        estimatedCost = "",
        status = "",
        requiredFlag = "",
        fitmentNotes = "",
        sourceUrl = "",
        notes = "",
      ] = line.split("|").map((entry) => entry.trim());

      const normalizedStatus: PromisePartItemStatus =
        status === "quoted" ||
        status === "ordered" ||
        status === "ready-pickup" ||
        status === "picked-up" ||
        status === "loaded-tech" ||
        status === "installed" ||
        status === "return-needed"
          ? status
          : "research-needed";

      return {
        label,
        partNumber: partNumber || undefined,
        quantity: quantity ? Number(quantity) || undefined : undefined,
        vendor: vendor || undefined,
        vendorLocation: vendorLocation || undefined,
        estimatedCost: estimatedCost ? Number(estimatedCost) || undefined : undefined,
        status: normalizedStatus,
        requiredForVisit: requiredFlag === "optional" ? false : true,
        fitmentNotes: fitmentNotes || undefined,
        sourceUrl: sourceUrl || undefined,
        notes: notes || undefined,
      } satisfies PromisePartItem;
    })
    .filter((item) => item.label);
}

export function PartsPlannerActionForm({
  promiseId,
  owner,
  fieldExecution,
}: PartsPlannerActionFormProps) {
  const router = useRouter();
  const [partsPlan, setPartsPlan] = useState(formatPartsPlan(fieldExecution?.partsPlan));
  const [pickupAssignedTo, setPickupAssignedTo] = useState(
    fieldExecution?.partsRunPlan?.assignedTo || owner,
  );
  const [pickupWindow, setPickupWindow] = useState(
    fieldExecution?.partsRunPlan?.pickupWindow || "",
  );
  const [pickupNotes, setPickupNotes] = useState(
    fieldExecution?.partsRunPlan?.pickupNotes || "",
  );
  const [consolidateBy, setConsolidateBy] = useState(
    fieldExecution?.partsRunPlan?.consolidateBy || "",
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
          fieldExecution: {
            partsPlan: parsePartsPlan(partsPlan),
            partsRunPlan: {
              assignedTo: pickupAssignedTo,
              pickupWindow: pickupWindow.trim() || undefined,
              pickupNotes: pickupNotes.trim() || undefined,
              consolidateBy: consolidateBy.trim() || undefined,
            },
          },
          noteToAdd: `Parts run plan updated by ${owner}.`,
        }),
      });

      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.error || "Unable to update parts plan.");
      }

      setFeedback("Saved.");
      router.refresh();
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Unable to update parts plan.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-4 rounded-2xl border border-border bg-card/50 p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
        Parts run action
      </p>
      <p className="mt-2 text-sm text-muted-foreground">
        Use one line per part:
        {" "}
        <span className="font-mono text-xs">
          label | part# | qty | vendor | location | est cost | status | required/optional | fitment | url | notes
        </span>
      </p>

      <div className="mt-3 grid gap-3">
        <label className="space-y-2">
          <span className="text-xs font-medium text-muted-foreground">Parts plan</span>
          <textarea
            className="form-textarea min-h-40"
            onChange={(event) => setPartsPlan(event.target.value)}
            placeholder="Battery 94R | MTP-94R/H7 | 1 | AutoZone | North Spokane | 219.99 | ready-pickup | required | AGM fit for 2016 Subaru Outback | https://... | core needed"
            value={partsPlan}
          />
        </label>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <label className="space-y-2">
            <span className="text-xs font-medium text-muted-foreground">Pickup assigned to</span>
            <select
              className="form-input"
              onChange={(event) => setPickupAssignedTo(event.target.value as typeof pickupAssignedTo)}
              value={pickupAssignedTo}
            >
              <option value="Dez">Dez</option>
              <option value="Simon">Simon</option>
              <option value="Ops">Ops</option>
              <option value="Unassigned">Unassigned</option>
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-xs font-medium text-muted-foreground">Pickup window</span>
            <input
              className="form-input"
              onChange={(event) => setPickupWindow(event.target.value)}
              placeholder="Tomorrow 9:30am-10:15am"
              value={pickupWindow}
            />
          </label>

          <label className="space-y-2">
            <span className="text-xs font-medium text-muted-foreground">Consolidate by</span>
            <input
              className="form-input"
              onChange={(event) => setConsolidateBy(event.target.value)}
              placeholder="One north-side run"
              value={consolidateBy}
            />
          </label>

          <label className="space-y-2">
            <span className="text-xs font-medium text-muted-foreground">Pickup notes</span>
            <input
              className="form-input"
              onChange={(event) => setPickupNotes(event.target.value)}
              placeholder="Core return and rotor hardware together"
              value={pickupNotes}
            />
          </label>
        </div>
      </div>

      {feedback ? <p className="mt-3 text-sm text-muted-foreground">{feedback}</p> : null}

      <button
        className="mt-4 inline-flex items-center justify-center rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-all hover:brightness-110 disabled:opacity-60"
        disabled={saving}
        onClick={submit}
        type="button"
      >
        {saving ? "Saving..." : "Save parts run"}
      </button>
    </div>
  );
}
