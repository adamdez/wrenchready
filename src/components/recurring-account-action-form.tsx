"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type {
  PromiseRecurringAccount,
  PromiseRecurringAccountActivityKind,
  PromiseRecurringAccountStatus,
  RecordOwner,
} from "@/lib/promise-crm/types";

type RecurringAccountActionFormProps = {
  promiseId: string;
  owner: RecordOwner;
  recurringAccount?: PromiseRecurringAccount;
};

function toOptionalNumber(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const parsed = Number(trimmed);
  return Number.isNaN(parsed) ? undefined : parsed;
}

export function RecurringAccountActionForm({
  promiseId,
  owner,
  recurringAccount,
}: RecurringAccountActionFormProps) {
  const router = useRouter();
  const [accountStatus, setAccountStatus] = useState(
    (recurringAccount?.status || "lead") as PromiseRecurringAccountStatus,
  );
  const [accountName, setAccountName] = useState(recurringAccount?.accountName || "");
  const [primaryContactName, setPrimaryContactName] = useState(
    recurringAccount?.primaryContactName || "",
  );
  const [primaryContactRole, setPrimaryContactRole] = useState(
    recurringAccount?.primaryContactRole || "",
  );
  const [contactEmail, setContactEmail] = useState(recurringAccount?.contactEmail || "");
  const [contactPhone, setContactPhone] = useState(recurringAccount?.contactPhone || "");
  const [vehicleCount, setVehicleCount] = useState(
    recurringAccount?.vehicleCount?.toString() || "",
  );
  const [cadenceLabel, setCadenceLabel] = useState(recurringAccount?.cadenceLabel || "");
  const [billingTerms, setBillingTerms] = useState(recurringAccount?.billingTerms || "");
  const [monthlyValueEstimate, setMonthlyValueEstimate] = useState(
    recurringAccount?.monthlyValueEstimate?.toString() || "",
  );
  const [nextTouchDueAt, setNextTouchDueAt] = useState(
    recurringAccount?.nextTouchDueAt || "",
  );
  const [nextStep, setNextStep] = useState(recurringAccount?.nextStep || "");
  const [summary, setSummary] = useState(recurringAccount?.summary || "");
  const [activityKind, setActivityKind] = useState<PromiseRecurringAccountActivityKind>("note");
  const [activitySummary, setActivitySummary] = useState("");
  const [feedback, setFeedback] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit() {
    setSaving(true);
    setFeedback("");

    try {
      const existingHistory = recurringAccount?.activityHistory || [];
      const nextHistory = activitySummary.trim()
        ? [
            {
              recordedAt: new Date().toISOString(),
              actor: owner,
              kind: activityKind,
              summary: activitySummary.trim(),
            },
            ...existingHistory,
          ]
        : existingHistory;

      const response = await fetch(`/api/al/wrenchready/promises/${promiseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recurringAccount: {
            status: accountStatus,
            accountName: accountName.trim() || undefined,
            primaryContactName: primaryContactName.trim() || undefined,
            primaryContactRole: primaryContactRole.trim() || undefined,
            contactEmail: contactEmail.trim() || undefined,
            contactPhone: contactPhone.trim() || undefined,
            vehicleCount: toOptionalNumber(vehicleCount),
            cadenceLabel: cadenceLabel.trim() || undefined,
            billingTerms: billingTerms.trim() || undefined,
            monthlyValueEstimate: toOptionalNumber(monthlyValueEstimate),
            lastTouchedAt: activitySummary.trim()
              ? new Date().toISOString()
              : recurringAccount?.lastTouchedAt,
            nextTouchDueAt: nextTouchDueAt.trim() || undefined,
            nextStep: nextStep.trim() || undefined,
            summary: summary.trim() || undefined,
            activityHistory: nextHistory,
          },
          noteToAdd: activitySummary.trim()
            ? `Recurring account activity logged: ${activitySummary.trim()}`
            : undefined,
        }),
      });

      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.error || "Unable to update recurring-account record.");
      }

      setActivitySummary("");
      setFeedback("Saved.");
      router.refresh();
    } catch (error) {
      setFeedback(
        error instanceof Error
          ? error.message
          : "Unable to update recurring-account record.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-4 rounded-2xl border border-border bg-card/50 p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
        Account action
      </p>
      <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <label className="space-y-2">
          <span className="text-xs font-medium text-muted-foreground">Status</span>
          <select
            className="form-input"
            onChange={(event) =>
              setAccountStatus(event.target.value as PromiseRecurringAccountStatus)
            }
            value={accountStatus}
          >
            <option value="lead">Lead</option>
            <option value="pitched">Pitched</option>
            <option value="trial-active">Trial active</option>
            <option value="active">Active</option>
            <option value="at-risk">At risk</option>
          </select>
        </label>

        <label className="space-y-2">
          <span className="text-xs font-medium text-muted-foreground">Account name</span>
          <input
            className="form-input"
            onChange={(event) => setAccountName(event.target.value)}
            value={accountName}
          />
        </label>

        <label className="space-y-2">
          <span className="text-xs font-medium text-muted-foreground">Primary contact</span>
          <input
            className="form-input"
            onChange={(event) => setPrimaryContactName(event.target.value)}
            value={primaryContactName}
          />
        </label>

        <label className="space-y-2">
          <span className="text-xs font-medium text-muted-foreground">Contact role</span>
          <input
            className="form-input"
            onChange={(event) => setPrimaryContactRole(event.target.value)}
            value={primaryContactRole}
          />
        </label>

        <label className="space-y-2">
          <span className="text-xs font-medium text-muted-foreground">Contact email</span>
          <input
            className="form-input"
            onChange={(event) => setContactEmail(event.target.value)}
            value={contactEmail}
          />
        </label>

        <label className="space-y-2">
          <span className="text-xs font-medium text-muted-foreground">Contact phone</span>
          <input
            className="form-input"
            onChange={(event) => setContactPhone(event.target.value)}
            value={contactPhone}
          />
        </label>

        <label className="space-y-2">
          <span className="text-xs font-medium text-muted-foreground">Vehicles</span>
          <input
            className="form-input"
            inputMode="numeric"
            onChange={(event) => setVehicleCount(event.target.value)}
            value={vehicleCount}
          />
        </label>

        <label className="space-y-2">
          <span className="text-xs font-medium text-muted-foreground">Cadence</span>
          <input
            className="form-input"
            onChange={(event) => setCadenceLabel(event.target.value)}
            value={cadenceLabel}
          />
        </label>

        <label className="space-y-2">
          <span className="text-xs font-medium text-muted-foreground">Billing terms</span>
          <input
            className="form-input"
            onChange={(event) => setBillingTerms(event.target.value)}
            value={billingTerms}
          />
        </label>

        <label className="space-y-2">
          <span className="text-xs font-medium text-muted-foreground">
            Monthly value estimate
          </span>
          <input
            className="form-input"
            inputMode="decimal"
            onChange={(event) => setMonthlyValueEstimate(event.target.value)}
            value={monthlyValueEstimate}
          />
        </label>

        <label className="space-y-2">
          <span className="text-xs font-medium text-muted-foreground">Next touch due</span>
          <input
            className="form-input"
            onChange={(event) => setNextTouchDueAt(event.target.value)}
            placeholder="2026-04-20T09:00:00-07:00"
            value={nextTouchDueAt}
          />
        </label>

        <label className="space-y-2 xl:col-span-3">
          <span className="text-xs font-medium text-muted-foreground">Next step</span>
          <textarea
            className="form-textarea"
            onChange={(event) => setNextStep(event.target.value)}
            placeholder="Book fleet trial call, send sample recap, or confirm approval owner."
            value={nextStep}
          />
        </label>

        <label className="space-y-2 xl:col-span-3">
          <span className="text-xs font-medium text-muted-foreground">Account summary</span>
          <textarea
            className="form-textarea"
            onChange={(event) => setSummary(event.target.value)}
            placeholder="What makes this account worth pursuing and what has been learned so far?"
            value={summary}
          />
        </label>

        <label className="space-y-2">
          <span className="text-xs font-medium text-muted-foreground">Activity type</span>
          <select
            className="form-input"
            onChange={(event) =>
              setActivityKind(event.target.value as PromiseRecurringAccountActivityKind)
            }
            value={activityKind}
          >
            <option value="identified">Identified</option>
            <option value="outreach">Outreach</option>
            <option value="proposal">Proposal</option>
            <option value="trial-started">Trial started</option>
            <option value="trial-check-in">Trial check-in</option>
            <option value="activated">Activated</option>
            <option value="risk-flagged">Risk flagged</option>
            <option value="note">Note</option>
          </select>
        </label>

        <label className="space-y-2 xl:col-span-2">
          <span className="text-xs font-medium text-muted-foreground">Activity note</span>
          <textarea
            className="form-textarea"
            onChange={(event) => setActivitySummary(event.target.value)}
            placeholder="Log the outreach, proposal, check-in, or risk update."
            value={activitySummary}
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
        {saving ? "Saving..." : "Save account update"}
      </button>
    </div>
  );
}
