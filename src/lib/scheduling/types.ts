export type ServiceType =
  | "battery-replacement"
  | "oil-change"
  | "brake-service"
  | "check-engine-diagnostics"
  | "pre-purchase-inspection"
  | "unknown";

export type BookingConfidence = "high" | "medium" | "low";

export type TerritorySlug =
  | "spokane"
  | "spokane-valley"
  | "liberty-lake"
  | "south-hill";

export type BookingRules = {
  durationMinutes: number;
  bufferBeforeMinutes: number;
  bufferAfterMinutes: number;
  autoBook: boolean;
  confidence: BookingConfidence;
};

export type ServiceEstimate = {
  requestedService: string;
  normalizedService: ServiceType;
  rules: BookingRules;
  reasons: string[];
};

export type BusinessHours = {
  day: number;
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
};

export type AddressInput = {
  street?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  formatted?: string;
};

export type AvailabilityRequest = {
  service: string;
  vehicle?: string;
  notes?: string;
  address: AddressInput;
  desiredDate?: string;
};

export type AvailableSlot = {
  startIso: string;
  endIso: string;
  durationMinutes: number;
  label: string;
  reason: string;
  calendarVerified: boolean;
};

export type CalendarTruthStatus = "verified" | "blocked" | "error";

export type CalendarBusyBlock = {
  startIso: string;
  endIso: string;
  source: "google-calendar" | "internal-calendar";
  label: string;
};

export type CalendarTruth = {
  status: CalendarTruthStatus;
  source: "google-calendar-and-internal-calendar" | "not-verified";
  checkedSources: Array<"google-calendar" | "internal-calendar">;
  customerHoldReady: boolean;
  checkedWindow?: {
    startIso: string;
    endIso: string;
  };
  busyBlockCount: number;
  warnings: string[];
};

export type AvailabilityResponse = {
  serviceEstimate: ServiceEstimate;
  territorySupported: boolean;
  requiredIntegrationsReady: boolean;
  missingIntegrations: string[];
  candidateSlots: AvailableSlot[];
  customerWindowSummary: string;
  calendarTruth: CalendarTruth;
  routeTruthReady: boolean;
  safeToOfferCustomerSlots: boolean;
};
