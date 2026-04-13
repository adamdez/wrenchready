import type { PromiseEconomicsSnapshot } from "@/lib/promise-crm/types";

const ECONOMICS_PREFIX = "__economics::";

function sanitizeNumber(value: unknown) {
  if (typeof value !== "number" || Number.isNaN(value)) return undefined;
  return value;
}

export function normalizePromiseEconomics(
  value?: PromiseEconomicsSnapshot | null,
): PromiseEconomicsSnapshot | undefined {
  if (!value) return undefined;

  const normalized: PromiseEconomicsSnapshot = {
    quotedAmount: sanitizeNumber(value.quotedAmount),
    finalInvoiceAmount: sanitizeNumber(value.finalInvoiceAmount),
    laborHours: sanitizeNumber(value.laborHours),
    travelHours: sanitizeNumber(value.travelHours),
    partsCostAmount: sanitizeNumber(value.partsCostAmount),
    techPayoutAmount: sanitizeNumber(value.techPayoutAmount),
    supportCostAmount: sanitizeNumber(value.supportCostAmount),
    cardFeePercent: sanitizeNumber(value.cardFeePercent),
    warrantyReservePercent: sanitizeNumber(value.warrantyReservePercent),
  };

  return hasPromiseEconomics(normalized) ? normalized : undefined;
}

export function hasPromiseEconomics(value?: PromiseEconomicsSnapshot) {
  if (!value) return false;

  return Object.values(value).some(
    (entry) => typeof entry === "number" && !Number.isNaN(entry),
  );
}

export function encodePromiseEconomics(value?: PromiseEconomicsSnapshot) {
  const normalized = normalizePromiseEconomics(value);
  if (!normalized) return null;
  return `${ECONOMICS_PREFIX}${JSON.stringify(normalized)}`;
}

export function extractPromiseEconomics(notes: string[]) {
  let economics: PromiseEconomicsSnapshot | undefined;
  const visibleNotes: string[] = [];

  for (const note of notes) {
    if (note.startsWith(ECONOMICS_PREFIX)) {
      try {
        const parsed = JSON.parse(note.slice(ECONOMICS_PREFIX.length));
        economics = normalizePromiseEconomics(parsed);
      } catch {
        // Keep malformed internal notes out of the visible note list.
      }
      continue;
    }

    visibleNotes.push(note);
  }

  return { economics, visibleNotes };
}

export function mergePromiseNotesWithEconomics(
  visibleNotes: string[],
  economics?: PromiseEconomicsSnapshot | null,
) {
  const cleanedNotes = visibleNotes.filter((note) => !note.startsWith(ECONOMICS_PREFIX));
  const encoded = encodePromiseEconomics(economics || undefined);

  return encoded ? [...cleanedNotes, encoded] : cleanedNotes;
}

export function computePromiseEconomics(snapshot?: PromiseEconomicsSnapshot) {
  if (!snapshot) return null;

  const revenue =
    snapshot.finalInvoiceAmount ?? snapshot.quotedAmount ?? undefined;

  const laborHours = snapshot.laborHours ?? 0;
  const travelHours = snapshot.travelHours ?? 0;
  const clockHours = laborHours + travelHours;
  const partsCost = snapshot.partsCostAmount ?? 0;
  const techPayout = snapshot.techPayoutAmount ?? 0;
  const supportCost = snapshot.supportCostAmount ?? 20;
  const cardFeePercent = snapshot.cardFeePercent ?? 3;
  const warrantyReservePercent = snapshot.warrantyReservePercent ?? 2;

  if (revenue === undefined) return null;

  const cardFeeAmount = revenue * (cardFeePercent / 100);
  const warrantyReserveAmount = revenue * (warrantyReservePercent / 100);
  const directCost = techPayout + partsCost;
  const grossProfitAmount = revenue - directCost;
  const netProfitEstimateAmount =
    revenue - techPayout - partsCost - supportCost - cardFeeAmount - warrantyReserveAmount;
  const revenuePerClockHour = clockHours > 0 ? revenue / clockHours : undefined;
  const netProfitPerClockHour =
    clockHours > 0 ? netProfitEstimateAmount / clockHours : undefined;

  return {
    revenue,
    laborHours,
    travelHours,
    clockHours,
    partsCost,
    techPayout,
    supportCost,
    cardFeePercent,
    cardFeeAmount,
    warrantyReservePercent,
    warrantyReserveAmount,
    directCost,
    grossProfitAmount,
    netProfitEstimateAmount,
    revenuePerClockHour,
    netProfitPerClockHour,
  };
}
