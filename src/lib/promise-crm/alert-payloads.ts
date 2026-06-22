import type { InboundRecord, PromiseRecord } from "@/lib/promise-crm/types";
import { readEnv } from "@/lib/env";

type AlertInbound = Pick<
  InboundRecord,
  | "source"
  | "id"
  | "customer"
  | "vehicle"
  | "requestedService"
  | "location"
  | "preferredWindow"
  | "readinessRisk"
  | "owner"
  | "nextAction"
>;

type AlertPromise = Pick<
  PromiseRecord,
  "customer" | "serviceScope" | "scheduledWindow" | "owner" | "status" | "topRisks" | "nextAction"
>;

function getBaseUrl() {
  const configured = readEnv(
    "NEXT_PUBLIC_SITE_URL",
    "WR_SITE_URL",
    "NEXT_PUBLIC_BASE_URL",
    "VERCEL_PROJECT_PRODUCTION_URL",
    "VERCEL_URL",
  );
  const value = configured || "https://www.wrenchreadymobile.com";
  const withProtocol = value.startsWith("http") ? value : `https://${value}`;
  return withProtocol.replace(/\/+$/, "");
}

function vehicleLabel(vehicle: AlertInbound["vehicle"]) {
  return [vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(" ");
}

export function buildNewAppointmentAlertText(inbound: AlertInbound) {
  const header = inbound.source === "text"
    ? "NEW WrenchReady text - screen now"
    : inbound.source === "voicemail" || inbound.source === "phone"
      ? "New WrenchReady call/voicemail - screen now"
      : "New WrenchReady request - not promised yet";
  const lines = [
    header,
    `Customer: ${inbound.customer.name}`,
    `Phone: ${inbound.customer.phone}`,
    inbound.customer.email ? `Email: ${inbound.customer.email}` : null,
    `Vehicle: ${vehicleLabel(inbound.vehicle) || "Vehicle not parsed"}`,
    `Service: ${inbound.requestedService}`,
    `Location: ${inbound.location.label || inbound.location.territory}`,
    `Timing: ${inbound.preferredWindow.label}`,
    `Owner: ${inbound.owner}`,
    `Risk: ${inbound.readinessRisk}`,
    `Next: ${inbound.nextAction}`,
    `CRM: ${getBaseUrl()}/ops/inbound/${inbound.id}`,
  ];

  return lines.filter((line): line is string => Boolean(line)).join("\n");
}

export function buildHighRiskInboundAlertText(inbound: AlertInbound) {
  if (inbound.readinessRisk !== "high") return null;

  return [
    "WrenchReady high-risk inbound",
    `${inbound.customer.name} / ${inbound.requestedService}`,
    `${inbound.location.territory} / ${inbound.owner}`,
    `Next: ${inbound.nextAction}`,
  ].join("\n");
}

export function buildPromiseOpsAlertText(promise: AlertPromise) {
  if (promise.status !== "tomorrow-at-risk" && promise.status !== "follow-through-due") {
    return null;
  }

  const header =
    promise.status === "tomorrow-at-risk"
      ? "WrenchReady tomorrow-at-risk promise"
      : "WrenchReady follow-through due";

  const riskLine =
    promise.topRisks[0] || promise.nextAction || "Review promise detail in ops.";

  return [
    header,
    `${promise.customer.name} / ${promise.serviceScope}`,
    `${promise.scheduledWindow.label} / ${promise.owner}`,
    `Next: ${riskLine}`,
  ].join("\n");
}
