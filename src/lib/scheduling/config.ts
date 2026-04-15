import type { BookingRules, BusinessHours, ServiceType, TerritorySlug } from "@/lib/scheduling/types";

export const BUSINESS_TIMEZONE = "America/Los_Angeles";

export const DEFAULT_BUFFER_BEFORE_MINUTES = 15;
export const DEFAULT_BUFFER_AFTER_MINUTES = 15;

export const SERVICE_RULES: Record<ServiceType, BookingRules> = {
  "battery-replacement": {
    durationMinutes: 45,
    bufferBeforeMinutes: DEFAULT_BUFFER_BEFORE_MINUTES,
    bufferAfterMinutes: DEFAULT_BUFFER_AFTER_MINUTES,
    autoBook: true,
    confidence: "high",
  },
  "oil-change": {
    durationMinutes: 60,
    bufferBeforeMinutes: DEFAULT_BUFFER_BEFORE_MINUTES,
    bufferAfterMinutes: DEFAULT_BUFFER_AFTER_MINUTES,
    autoBook: true,
    confidence: "high",
  },
  "brake-service": {
    durationMinutes: 150,
    bufferBeforeMinutes: DEFAULT_BUFFER_BEFORE_MINUTES,
    bufferAfterMinutes: DEFAULT_BUFFER_AFTER_MINUTES,
    autoBook: true,
    confidence: "medium",
  },
  "check-engine-diagnostics": {
    durationMinutes: 75,
    bufferBeforeMinutes: DEFAULT_BUFFER_BEFORE_MINUTES,
    bufferAfterMinutes: DEFAULT_BUFFER_AFTER_MINUTES,
    autoBook: true,
    confidence: "medium",
  },
  "pre-purchase-inspection": {
    durationMinutes: 75,
    bufferBeforeMinutes: DEFAULT_BUFFER_BEFORE_MINUTES,
    bufferAfterMinutes: DEFAULT_BUFFER_AFTER_MINUTES,
    autoBook: true,
    confidence: "high",
  },
  unknown: {
    durationMinutes: 90,
    bufferBeforeMinutes: DEFAULT_BUFFER_BEFORE_MINUTES,
    bufferAfterMinutes: DEFAULT_BUFFER_AFTER_MINUTES,
    autoBook: false,
    confidence: "low",
  },
};

export const SUPPORTED_TERRITORIES: TerritorySlug[] = [
  "spokane",
  "spokane-valley",
  "liberty-lake",
  "south-hill",
];

export const BUSINESS_HOURS: BusinessHours[] = [
  { day: 1, startHour: 16, startMinute: 0, endHour: 19, endMinute: 0 },
  { day: 2, startHour: 16, startMinute: 0, endHour: 19, endMinute: 0 },
  { day: 3, startHour: 16, startMinute: 0, endHour: 19, endMinute: 0 },
  { day: 4, startHour: 16, startMinute: 0, endHour: 19, endMinute: 0 },
  { day: 5, startHour: 16, startMinute: 0, endHour: 19, endMinute: 0 },
  { day: 6, startHour: 7, startMinute: 0, endHour: 19, endMinute: 0 },
  { day: 0, startHour: 7, startMinute: 0, endHour: 19, endMinute: 0 },
];
