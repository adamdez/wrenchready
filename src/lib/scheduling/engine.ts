import { BUSINESS_HOURS, BUSINESS_TIMEZONE, SERVICE_RULES } from "@/lib/scheduling/config";
import { getGoogleWorkspaceIntegrationStatus, listGoogleCalendarEvents } from "@/lib/google-workspace";
import { getPromiseRecords } from "@/lib/promise-crm/server";
import type {
  AvailabilityRequest,
  AvailabilityResponse,
  AvailableSlot,
  CalendarBusyBlock,
  CalendarTruth,
  ServiceEstimate,
  ServiceType,
} from "@/lib/scheduling/types";

const AVAILABILITY_LOOKAHEAD_DAYS = 14;
const SLOT_STEP_MINUTES = 30;
const MAX_CUSTOMER_SLOTS = 8;
const MIN_LEAD_TIME_MINUTES = 120;

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
  const googleWorkspace = getGoogleWorkspaceIntegrationStatus();
  const missing = [
    ...(!googleWorkspace.auth.ready ? googleWorkspace.auth.missing : []),
    ...(!googleWorkspace.calendar.ready ? googleWorkspace.calendar.missing : []),
    googleWorkspace.calendar.ready && !googleWorkspace.calendar.canWrite
      ? "GOOGLE_WORKSPACE_ALLOW_CALENDAR_WRITES"
      : undefined,
    !process.env.GOOGLE_MAPS_API_KEY ? "GOOGLE_MAPS_API_KEY" : undefined,
  ].filter((entry): entry is string => Boolean(entry));

  return {
    ready: missing.length === 0,
    missing,
  };
}

function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60_000);
}

function weekdayNumber(weekday: string) {
  const weekdayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };

  return weekdayMap[weekday] ?? 0;
}

function startOfSearchWindow(desiredDate?: string) {
  const exactDate = desiredDate?.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
  if (!exactDate) return new Date();

  return makeZonedDate(
    Number(exactDate[1]),
    Number(exactDate[2]),
    Number(exactDate[3]),
    0,
    0,
    BUSINESS_TIMEZONE,
  );
}

function formatSlotLabel(start: Date, end: Date) {
  const startFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: BUSINESS_TIMEZONE,
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
  const endFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: BUSINESS_TIMEZONE,
    hour: "numeric",
    minute: "2-digit",
  });

  return `${startFormatter.format(start)}-${endFormatter.format(end)}`;
}

function intervalsOverlap(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) {
  return aStart < bEnd && bStart < aEnd;
}

function normalizeBusyBlock(block: CalendarBusyBlock) {
  const start = new Date(block.startIso);
  const end = new Date(block.endIso);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
    return null;
  }

  return {
    ...block,
    start,
    end,
  };
}

function slotConflictsWithBusyBlocks(
  slotStart: Date,
  slotEnd: Date,
  busyBlocks: CalendarBusyBlock[],
) {
  return busyBlocks
    .map(normalizeBusyBlock)
    .filter((block): block is NonNullable<ReturnType<typeof normalizeBusyBlock>> => Boolean(block))
    .some((block) => intervalsOverlap(slotStart, slotEnd, block.start, block.end));
}

function buildCalendarVerifiedSlots(input: {
  request: AvailabilityRequest;
  durationMinutes: number;
  bufferBeforeMinutes: number;
  bufferAfterMinutes: number;
  busyBlocks: CalendarBusyBlock[];
}): AvailableSlot[] {
  const searchStart = startOfSearchWindow(input.request.desiredDate);
  const earliestStart = addMinutes(new Date(), MIN_LEAD_TIME_MINUTES);
  const startParts = getZonedDateParts(searchStart, BUSINESS_TIMEZONE);
  const baseDate = new Date(Date.UTC(startParts.year, startParts.month - 1, startParts.day, 12, 0, 0));
  const slots: AvailableSlot[] = [];

  for (let dayOffset = 0; dayOffset < AVAILABILITY_LOOKAHEAD_DAYS && slots.length < MAX_CUSTOMER_SLOTS; dayOffset += 1) {
    const day = new Date(baseDate);
    day.setUTCDate(baseDate.getUTCDate() + dayOffset);

    const year = day.getUTCFullYear();
    const month = day.getUTCMonth() + 1;
    const date = day.getUTCDate();
    const midday = makeZonedDate(year, month, date, 12, 0, BUSINESS_TIMEZONE);
    const weekday = weekdayNumber(getZonedDateParts(midday, BUSINESS_TIMEZONE).weekday);
    const hours = BUSINESS_HOURS.find((entry) => entry.day === weekday);

    if (!hours) continue;

    const dayEnd = makeZonedDate(year, month, date, hours.endHour, hours.endMinute, BUSINESS_TIMEZONE);
    let start = makeZonedDate(year, month, date, hours.startHour, hours.startMinute, BUSINESS_TIMEZONE);

    while (slots.length < MAX_CUSTOMER_SLOTS) {
      const end = addMinutes(start, input.durationMinutes);
      const slotStartWithBuffer = addMinutes(start, -input.bufferBeforeMinutes);
      const slotEndWithBuffer = addMinutes(end, input.bufferAfterMinutes);

      if (slotEndWithBuffer > dayEnd) break;

      if (
        start >= earliestStart &&
        !slotConflictsWithBusyBlocks(slotStartWithBuffer, slotEndWithBuffer, input.busyBlocks)
      ) {
        slots.push({
          startIso: start.toISOString(),
          endIso: end.toISOString(),
          durationMinutes: input.durationMinutes,
          label: formatSlotLabel(start, end),
          calendarVerified: true,
          reason: "Open on the shared Google Calendar and internal WrenchReady schedule, including service buffers.",
        });
      }

      start = addMinutes(start, SLOT_STEP_MINUTES);
    }
  }

  return slots;
}

function calendarEventBusyBlocks(
  events: Awaited<ReturnType<typeof listGoogleCalendarEvents>>,
): CalendarBusyBlock[] {
  return events
    .filter((event) => event.status !== "cancelled" && event.start && event.end)
    .map((event) => ({
      startIso: event.start || "",
      endIso: event.end || "",
      source: "google-calendar" as const,
      label: event.summary || "Google Calendar busy block",
    }));
}

async function internalScheduleBusyBlocks(): Promise<CalendarBusyBlock[]> {
  const records = await getPromiseRecords();

  return records
    .filter((record) => record.status !== "completed")
    .filter((record) => record.scheduledWindow.startIso && record.scheduledWindow.endIso)
    .map((record) => ({
      startIso: record.scheduledWindow.startIso || "",
      endIso: record.scheduledWindow.endIso || "",
      source: "internal-calendar" as const,
      label: `${record.customer.name} / ${record.serviceScope}`,
    }));
}

async function getCalendarTruth(searchStart: Date): Promise<{
  truth: CalendarTruth;
  busyBlocks: CalendarBusyBlock[];
  missing: string[];
}> {
  const status = getGoogleWorkspaceIntegrationStatus();
  const timeMin = searchStart.toISOString();
  const timeMax = addMinutes(searchStart, AVAILABILITY_LOOKAHEAD_DAYS * 24 * 60).toISOString();
  const warnings: string[] = [];
  const checkedSources: CalendarTruth["checkedSources"] = [];
  const busyBlocks: CalendarBusyBlock[] = [];
  const missing = [
    ...(!status.auth.ready ? status.auth.missing : []),
    ...status.calendar.missing,
  ];

  if (!status.calendar.canRead) {
    warnings.push("Google Calendar is not readable, so customer slots are not safe to offer.");
    return {
      busyBlocks,
      missing,
      truth: {
        status: "blocked",
        source: "not-verified",
        checkedSources,
        customerHoldReady: false,
        checkedWindow: { startIso: timeMin, endIso: timeMax },
        busyBlockCount: 0,
        warnings,
      },
    };
  }

  try {
    const [googleEvents, internalBlocks] = await Promise.all([
      listGoogleCalendarEvents({ timeMin, timeMax, maxResults: 100 }),
      internalScheduleBusyBlocks(),
    ]);

    checkedSources.push("google-calendar", "internal-calendar");
    busyBlocks.push(...calendarEventBusyBlocks(googleEvents), ...internalBlocks);
  } catch (error) {
    warnings.push(
      error instanceof Error
        ? error.message
        : "Calendar truth could not be loaded.",
    );
    return {
      busyBlocks: [],
      missing: [...missing, "calendar-read-failed"],
      truth: {
        status: "error",
        source: "not-verified",
        checkedSources,
        customerHoldReady: false,
        checkedWindow: { startIso: timeMin, endIso: timeMax },
        busyBlockCount: 0,
        warnings,
      },
    };
  }

  const customerHoldReady = status.calendar.canWrite;
  if (!customerHoldReady) {
    warnings.push("Google Calendar is readable, but customer-requested slots cannot be held until calendar writes are enabled.");
  }

  return {
    busyBlocks,
    missing: customerHoldReady
      ? missing
      : mergeMissingIntegrations(missing, ["GOOGLE_WORKSPACE_ALLOW_CALENDAR_WRITES"]),
    truth: {
      status: "verified",
      source: "google-calendar-and-internal-calendar",
      checkedSources,
      customerHoldReady,
      checkedWindow: { startIso: timeMin, endIso: timeMax },
      busyBlockCount: busyBlocks.length,
      warnings,
    },
  };
}

function mergeMissingIntegrations(...groups: string[][]) {
  return [...new Set(groups.flat().filter(Boolean))];
}

function getCustomerWindowSummary(input?: {
  calendarVerified?: boolean;
  customerHoldReady?: boolean;
  routeTruthReady?: boolean;
  slotCount?: number;
}) {
  if (input?.calendarVerified && !input.customerHoldReady) {
    return "Simon's shared calendar and internal schedule are readable, but WrenchReady cannot safely place customer holds yet. Send the request and Dez will confirm timing manually.";
  }

  if (input?.calendarVerified && input.customerHoldReady && !input.routeTruthReady) {
    return "Simon's shared calendar and internal schedule are hold-ready, but route validation is not ready yet. Send the request and Dez will confirm timing manually.";
  }

  if (input?.calendarVerified && input.slotCount) {
    return input.routeTruthReady
      ? "These openings are checked against the shared WrenchReady calendar and current internal schedule."
      : "These openings are checked against Simon's shared calendar and internal schedule. Dez still confirms route fit before the visit is promised.";
  }

  if (input?.calendarVerified && !input.slotCount) {
    return "The shared calendar is readable, but there are no customer-ready openings in the current search window.";
  }

  return "We cannot safely offer live openings until Google Calendar is readable. Send the request and Dez will confirm timing manually.";
}

export async function evaluateAvailability(request: AvailabilityRequest): Promise<AvailabilityResponse> {
  const serviceEstimate = estimateService(request.service);
  const integrations = requiredIntegrationsReady();
  const territorySupported = addressLooksSupported(request);
  const calendarTruth = await getCalendarTruth(startOfSearchWindow(request.desiredDate));
  const missingIntegrations = mergeMissingIntegrations(integrations.missing, calendarTruth.missing);
  const routeTruthReady = !missingIntegrations.includes("GOOGLE_MAPS_API_KEY");
  const calendarVerified = calendarTruth.truth.status === "verified";
  const customerHoldReady = calendarTruth.truth.customerHoldReady;
  const candidateSlots =
    territorySupported && serviceEstimate.rules.autoBook && calendarVerified && customerHoldReady && routeTruthReady
      ? buildCalendarVerifiedSlots({
          request,
          durationMinutes: serviceEstimate.rules.durationMinutes,
          bufferBeforeMinutes: serviceEstimate.rules.bufferBeforeMinutes,
          bufferAfterMinutes: serviceEstimate.rules.bufferAfterMinutes,
          busyBlocks: calendarTruth.busyBlocks,
        })
      : [];

  return {
    serviceEstimate,
    territorySupported,
    requiredIntegrationsReady: missingIntegrations.length === 0,
    missingIntegrations,
    candidateSlots,
    customerWindowSummary: getCustomerWindowSummary({
      calendarVerified,
      customerHoldReady,
      routeTruthReady,
      slotCount: candidateSlots.length,
    }),
    calendarTruth: calendarTruth.truth,
    routeTruthReady,
    safeToOfferCustomerSlots:
      territorySupported &&
      serviceEstimate.rules.autoBook &&
      calendarVerified &&
      customerHoldReady &&
      routeTruthReady &&
      candidateSlots.length > 0,
  };
}

const schedulingEngine = {
  estimateService,
  evaluateAvailability,
};

export default schedulingEngine;
