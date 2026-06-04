import type { InboundRecord, PromiseRecord } from "@/lib/promise-crm/types";

type AlertInbound = Pick<
  InboundRecord,
  "customer" | "requestedService" | "location" | "preferredWindow" | "readinessRisk" | "owner" | "nextAction"
>;

type AlertPromise = Pick<
  PromiseRecord,
  "customer" | "serviceScope" | "scheduledWindow" | "owner" | "status" | "topRisks" | "nextAction"
>;

export function buildNewAppointmentAlertText(inbound: AlertInbound) {
  return [
    "WR new apt",
    `${inbound.customer.name} / ${inbound.requestedService}`,
    `${inbound.location.territory} / ${inbound.preferredWindow.label}`,
    inbound.customer.phone,
  ].join("\n");
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
