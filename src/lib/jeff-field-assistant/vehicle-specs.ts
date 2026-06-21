// Vehicle service-data sources for Jeff's diagnostic tree:
//  1) decode_vin  — NHTSA vPIC (free, no key) turns a VIN into year/make/model/engine
//     so Jeff stops asking Simon to "confirm it's the 5.7".
//  2) lookup_vehicle_spec / record_vehicle_spec — a "capture-as-you-go" store of
//     human-verified specs (torque, wire colors, relearn steps, capacities) keyed by
//     vehicle. Jeff checks it before routing Simon to the source, and saves the value
//     once Simon reads it back from licensed/OEM data — so next time it's instant.
//
// Storage is local-first (.data/jeff/vehicle-specs.json, the pilot store) mirroring the
// durable-memory pattern. A Supabase mirror for team/multi-device durability is the
// follow-up (needs a wrenchready_vehicle_specs table); kept local here so it ships with
// zero DB risk. Specs are graded: a value with a named source = "verified"; without one
// it is saved "needs-review" for Dez to confirm. Jeff never treats needs-review as fact.

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { getJeffLocalDataPath } from "@/lib/jeff-field-assistant/local-data";

export type VinDecodeResult = {
  vin: string;
  year?: string;
  make?: string;
  model?: string;
  engine?: string;
  drivetrain?: string;
  bodyClass?: string;
  label: string;
  warnings: string[];
};

export type VehicleSpecStatus = "verified" | "needs-review";

export type VehicleSpecRecord = {
  id: string;
  vehicleKey: string;
  vehicleLabel: string;
  specType: string; // torque | wire-color | pinout | relearn | capacity | fitment | other
  item: string; // "front axle nut" | "fuel-pump connector ground" | "BCM relearn" | "engine oil capacity"
  value: string; // "21 ft-lb" | "black/white" | "scan-tool guided" | "5.5 qt 5W-20"
  source?: string; // "AllData" | "Ford service info" | "Mitchell" — provenance; absent => needs-review
  recordedBy: string;
  status: VehicleSpecStatus;
  createdAt: string;
  updatedAt: string;
};

const LOCAL_VEHICLE_SPECS_FILE = getJeffLocalDataPath("vehicle-specs.json");
const NHTSA_VPIC_URL = "https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues";

function nowIso() {
  return new Date().toISOString();
}

function makeId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function clean(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  if (/^(not applicable|n\/?a|null|none|0)$/i.test(trimmed)) return undefined;
  return trimmed;
}

function titleCase(value: string | undefined): string | undefined {
  if (!value) return undefined;
  return value
    .toLowerCase()
    .split(/\s+/)
    .map((word) => (word ? word[0].toUpperCase() + word.slice(1) : word))
    .join(" ");
}

function tokenSet(value: string | undefined): Set<string> {
  return new Set(
    String(value || "")
      .toLowerCase()
      .replace(/[^a-z0-9.\s]/g, " ")
      .split(/\s+/)
      .filter((token) => token.length >= 2),
  );
}

export function normalizeVehicleKey(input: {
  year?: string;
  make?: string;
  model?: string;
  engine?: string;
  vehicle?: string;
}): string {
  const parts = [input.year, input.make, input.model, input.engine].map((part) => (part || "").toLowerCase().trim());
  const key = parts.filter(Boolean).join("|");
  if (key) return key;
  return (input.vehicle || "").toLowerCase().replace(/\s+/g, " ").trim();
}

// ---- NHTSA vPIC VIN decode ----
export async function decodeVinViaNhtsa(vinRaw: unknown): Promise<VinDecodeResult> {
  const vin = String(vinRaw || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  const warnings: string[] = [];
  if (vin.length < 11) warnings.push("VIN looks short — decode may be partial.");

  let row: Record<string, unknown> = {};
  try {
    const res = await fetch(`${NHTSA_VPIC_URL}/${encodeURIComponent(vin)}?format=json`, {
      headers: { Accept: "application/json" },
    });
    const data = await res.json().catch(() => ({}));
    const results = Array.isArray((data as { Results?: unknown }).Results) ? (data as { Results: unknown[] }).Results : [];
    row = (results[0] as Record<string, unknown>) || {};
  } catch (error) {
    warnings.push(error instanceof Error ? error.message : "VIN decode request failed.");
  }

  const year = clean(row.ModelYear);
  const make = titleCase(clean(row.Make));
  const model = titleCase(clean(row.Model));
  const displacement = clean(row.DisplacementL);
  const cylinders = clean(row.EngineCylinders);
  const engine = displacement
    ? `${Number(displacement).toFixed(1)}L${cylinders ? ` ${cylinders}-cyl` : ""}`
    : cylinders
      ? `${cylinders}-cyl`
      : undefined;
  const drivetrain = clean(row.DriveType);
  const bodyClass = clean(row.BodyClass);

  const errorCode = String(clean(row.ErrorCode) || "");
  const errorText = clean(row.ErrorText);
  if (errorText && errorCode && !errorCode.startsWith("0")) warnings.push(errorText);

  const label = [year, make, model, engine].filter(Boolean).join(" ") || vin;
  return { vin, year, make, model, engine, drivetrain, bodyClass, label, warnings };
}

// ---- Local capture-as-you-go spec store ----
function specFromValue(value: unknown): VehicleSpecRecord | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  if (typeof v.id !== "string" || typeof v.vehicleKey !== "string" || typeof v.item !== "string" || typeof v.value !== "string") {
    return null;
  }
  return {
    id: v.id,
    vehicleKey: v.vehicleKey,
    vehicleLabel: typeof v.vehicleLabel === "string" ? v.vehicleLabel : v.vehicleKey,
    specType: typeof v.specType === "string" ? v.specType : "other",
    item: v.item,
    value: v.value,
    source: typeof v.source === "string" ? v.source : undefined,
    recordedBy: typeof v.recordedBy === "string" ? v.recordedBy : "Simon",
    status: v.status === "verified" ? "verified" : "needs-review",
    createdAt: typeof v.createdAt === "string" ? v.createdAt : nowIso(),
    updatedAt: typeof v.updatedAt === "string" ? v.updatedAt : nowIso(),
  };
}

async function listLocalVehicleSpecs(): Promise<VehicleSpecRecord[]> {
  try {
    const parsed = JSON.parse(await readFile(LOCAL_VEHICLE_SPECS_FILE, "utf8"));
    return Array.isArray(parsed?.specs)
      ? parsed.specs.map(specFromValue).filter((spec: VehicleSpecRecord | null): spec is VehicleSpecRecord => Boolean(spec))
      : [];
  } catch {
    return [];
  }
}

async function upsertLocalVehicleSpecs(toUpsert: VehicleSpecRecord[]) {
  const existing = await listLocalVehicleSpecs();
  const byId = new Map<string, VehicleSpecRecord>();
  for (const spec of [...toUpsert, ...existing]) byId.set(spec.id, spec);
  const next = [...byId.values()]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 2000);
  await mkdir(path.dirname(LOCAL_VEHICLE_SPECS_FILE), { recursive: true });
  await writeFile(LOCAL_VEHICLE_SPECS_FILE, JSON.stringify({ specs: next }, null, 2));
}

function scoreSpecMatch(
  rec: VehicleSpecRecord,
  queryVehicleTokens: Set<string>,
  specType?: string,
  item?: string,
): number {
  const recVehicleTokens = tokenSet(`${rec.vehicleLabel} ${rec.vehicleKey.replace(/\|/g, " ")}`);
  let overlap = 0;
  for (const token of queryVehicleTokens) if (recVehicleTokens.has(token)) overlap++;
  if (overlap < 2) return 0; // need at least two vehicle tokens (e.g. make + model) to count
  let score = overlap * 5;
  if (specType && rec.specType.toLowerCase() === specType.toLowerCase()) score += 6;
  if (item) {
    const itemTokens = tokenSet(item);
    const recItemTokens = tokenSet(rec.item);
    if ([...itemTokens].some((token) => recItemTokens.has(token))) score += 4;
  }
  if (rec.status === "verified") score += 2;
  return score;
}

export async function lookupVehicleSpecRecords(input: {
  vehicle?: string;
  year?: string;
  make?: string;
  model?: string;
  engine?: string;
  specType?: string;
  item?: string;
}): Promise<{ matches: VehicleSpecRecord[] }> {
  const vehicleString = input.vehicle || [input.year, input.make, input.model, input.engine].filter(Boolean).join(" ");
  const queryTokens = tokenSet(vehicleString);
  const all = await listLocalVehicleSpecs();
  const matches = all
    .map((rec) => ({ rec, score: scoreSpecMatch(rec, queryTokens, input.specType, input.item) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || (a.rec.status === "verified" ? -1 : 1))
    .slice(0, 8)
    .map((entry) => entry.rec);
  return { matches };
}

export async function recordVehicleSpecRecord(input: {
  vehicle?: string;
  year?: string;
  make?: string;
  model?: string;
  engine?: string;
  specType?: string;
  item: string;
  value: string;
  source?: string;
  recordedBy?: string;
}): Promise<VehicleSpecRecord> {
  const vehicleLabel = input.vehicle || [input.year, input.make, input.model, input.engine].filter(Boolean).join(" ");
  const record: VehicleSpecRecord = {
    id: makeId("veh-spec"),
    vehicleKey: normalizeVehicleKey(input),
    vehicleLabel: vehicleLabel || "unknown vehicle",
    specType: (input.specType || "other").toLowerCase(),
    item: input.item.trim(),
    value: input.value.trim(),
    source: clean(input.source),
    recordedBy: input.recordedBy || "Simon",
    status: clean(input.source) ? "verified" : "needs-review",
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  await upsertLocalVehicleSpecs([record]);
  return record;
}

export async function listVehicleSpecsForReview(limit = 100): Promise<VehicleSpecRecord[]> {
  const all = await listLocalVehicleSpecs();
  return all.filter((spec) => spec.status === "needs-review").slice(0, limit);
}
