import { BUSINESS_HOURS, BUSINESS_TIMEZONE, SERVICE_RULES } from "@/lib/scheduling/config";
import type {
  AvailabilityRequest,
  AvailabilityResponse,
  AvailableSlot,
  ServiceEstimate,
  ServiceType,
} from "@/lib/scheduling/types";

function normalizeServiceType(input: string): ServiceType {
  const value = input.toLowerCase();

  if (value.includes("battery") || value.includes("no-start") || value.includes("wont start") || value.includes("won't start")) {
    return "battery-replacement";
  }

  if (value.includes("oil")) {
    return "oil-change";
  }

  if (value.includes("brake")) {
    return "brake-service";
  }

  if (value.includes("check engine") || value.includes("diagnostic") || value.includes("engine light")) {
    return "check-engine-diagnostics";
  }

  if (value.includes("pre-purchase") || value.includes("inspection")) {
    return "pre-purchase-inspection";
  }

  return "unknown";
}

export function estimateService(service: string): ServiceEstimate {
  const normalizedService = normalizeServiceType(service);
  const reasons =
    normalizedService === "unknown"
      ? ["Could not confidently normalize the requested service. Human review is safer."]
      : [`Matched requested service to ${normalizedService}.`];

  return {
    requestedService: service,
    normalizedService,
    rules: SERVICE_RULES[normalizedService],
    reasons,
  };
}

function addressLooksSupported(request: AvailabilityRequest) {
  const haystack = [
    request.address.city,
    request.address.state,
    request.address.formatted,
    request.notes,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return ["spokane", "spokane valley", "liberty lake", "south hill"].some((term) =>
    haystack.includes(term),
  );
}

function requiredIntegrationsReady() {
  const required = {
    googleCalendarId: process.env.GOOGLE_CALENDAR_ID,
    googleClientEmail: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    googlePrivateKey: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY,
    mapsApiKey: process.env.GOOGLE_MAPS_API_KEY,
  };

  const missing = Object.entries(required)
    .filter(([, value]) => !value)
    .map(([key]) => key);

  return {
    ready: missing.length === 0,
    missing,
  };
}

function buildPlaceholderSlots(durationMinutes: number): AvailableSlot[] {
  const now = new Date();
  const currentDay = now.getDay();

  const nextBusinessDay =
    BUSINESS_HOURS.find((hours) => hours.day >= currentDay) ?? BUSINESS_HOURS[0];

  const base = new Date(now);
  const dayDelta = (nextBusinessDay.day - currentDay + 7) % 7;
  base.setDate(base.getDate() + dayDelta);
  base.setHours(nextBusinessDay.startHour, nextBusinessDay.startMinute, 0, 0);

  return [0, 1, 2].map((slotIndex) => {
    const start = new Date(base);
    start.setHours(nextBusinessDay.startHour + slotIndex * 2, nextBusinessDay.startMinute, 0, 0);

    const end = new Date(start);
    end.setMinutes(end.getMinutes() + durationMinutes);

    return {
      startIso: start.toISOString(),
      endIso: end.toISOString(),
      durationMinutes,
      reason: `Placeholder slot in ${BUSINESS_TIMEZONE}. Replace with calendar- and route-aware results after Google integrations are connected.`,
    };
  });
}

export function evaluateAvailability(request: AvailabilityRequest): AvailabilityResponse {
  const serviceEstimate = estimateService(request.service);
  const integrations = requiredIntegrationsReady();
  const territorySupported = addressLooksSupported(request);

  return {
    serviceEstimate,
    territorySupported,
    requiredIntegrationsReady: integrations.ready,
    missingIntegrations: integrations.missing,
    candidateSlots:
      territorySupported && serviceEstimate.rules.autoBook
        ? buildPlaceholderSlots(serviceEstimate.rules.durationMinutes)
        : [],
  };
}
