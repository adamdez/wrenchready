import { BUSINESS_HOURS, BUSINESS_TIMEZONE, SERVICE_RULES } from "@/lib/scheduling/config";
import type {
  AvailabilityRequest,
  AvailabilityResponse,
  AvailableSlot,
  ServiceEstimate,
  ServiceType,
} from "@/lib/scheduling/types";

function getZonedDateParts(date: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });

  const parts = formatter.formatToParts(date);
  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    weekday: map.weekday,
    hour: Number(map.hour),
    minute: Number(map.minute),
    second: Number(map.second),
  };
}

function makeZonedDate(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timeZone: string,
) {
  const utcGuess = new Date(Date.UTC(year, month - 1, day, hour, minute, 0));
  const zoned = getZonedDateParts(utcGuess, timeZone);
  const zonedAsUtc = Date.UTC(
    zoned.year,
    zoned.month - 1,
    zoned.day,
    zoned.hour,
    zoned.minute,
    zoned.second,
  );
  const offset = zonedAsUtc - utcGuess.getTime();

  return new Date(utcGuess.getTime() - offset);
}

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
  const zonedNow = getZonedDateParts(now, BUSINESS_TIMEZONE);
  const weekdayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  const currentDay = weekdayMap[zonedNow.weekday] ?? now.getDay();

  const nextBusinessDay =
    BUSINESS_HOURS.find((hours) => hours.day >= currentDay) ?? BUSINESS_HOURS[0];

  const base = new Date(Date.UTC(zonedNow.year, zonedNow.month - 1, zonedNow.day, 12, 0, 0));
  const dayDelta = (nextBusinessDay.day - currentDay + 7) % 7;
  base.setDate(base.getDate() + dayDelta);
  const baseYear = base.getUTCFullYear();
  const baseMonth = base.getUTCMonth() + 1;
  const baseDay = base.getUTCDate();

  return [0, 1, 2].map((slotIndex) => {
    const start = makeZonedDate(
      baseYear,
      baseMonth,
      baseDay,
      nextBusinessDay.startHour + slotIndex * 2,
      nextBusinessDay.startMinute,
      BUSINESS_TIMEZONE,
    );

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

function getCustomerWindowSummary() {
  return "Current route openings are typically weekday afternoons and evenings from 4pm to 7pm, plus broader Saturday and Sunday daytime windows from 7am to 7pm.";
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
    customerWindowSummary: getCustomerWindowSummary(),
  };
}

const schedulingEngine = {
  estimateService,
  evaluateAvailability,
};

export default schedulingEngine;
