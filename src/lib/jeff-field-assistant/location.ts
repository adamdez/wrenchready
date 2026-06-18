import { findNearbyPartsStores, getGoogleMapsIntegrationStatus } from "@/lib/google-maps";
import {
  listPersistedJeffJobWorkspace,
  persistJeffConversationWorkspace,
} from "@/lib/jeff-field-assistant/persistence";
import type {
  JeffConversation,
  JeffConversationSummary,
} from "@/lib/jeff-field-assistant/types";

type SimonLocationCheckInInput = {
  latitude?: number;
  longitude?: number;
  accuracyMeters?: number;
  jobId?: string;
  jobLabel?: string;
  source?: string;
};

type PartsStoreInput = {
  partName?: string;
  vehicle?: string;
  latitude?: number;
  longitude?: number;
  maxLocationAgeMinutes?: number;
};

const LOCATION_FRESH_MINUTES = 15;

function nowIso() {
  return new Date().toISOString();
}

function makeId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function optionalString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function optionalNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function normalizeLocationInput(payload: unknown): SimonLocationCheckInInput {
  const input = isObject(payload) ? payload : {};

  return {
    latitude: optionalNumber(input.latitude),
    longitude: optionalNumber(input.longitude),
    accuracyMeters: optionalNumber(input.accuracyMeters) || optionalNumber(input.accuracy),
    jobId: optionalString(input.jobId),
    jobLabel: optionalString(input.jobLabel),
    source: optionalString(input.source) || "jeff-app",
  };
}

function normalizePartsStoreInput(payload: unknown): PartsStoreInput {
  const input = isObject(payload) ? payload : {};

  return {
    partName: optionalString(input.partName) || optionalString(input.part),
    vehicle: optionalString(input.vehicle),
    latitude: optionalNumber(input.latitude),
    longitude: optionalNumber(input.longitude),
    maxLocationAgeMinutes: optionalNumber(input.maxLocationAgeMinutes),
  };
}

function minutesSince(value: string) {
  return Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 60_000));
}

function locationFromConversation(conversation: JeffConversation) {
  const source = conversation.sourcePayload || {};
  if (source.source !== "jeff-location-check-in") return undefined;
  const latitude = optionalNumber(source.latitude);
  const longitude = optionalNumber(source.longitude);
  if (latitude === undefined || longitude === undefined) return undefined;

  const checkedInAt = optionalString(source.checkedInAt) || conversation.endedAt;
  const ageMinutes = minutesSince(checkedInAt);

  return {
    latitude,
    longitude,
    accuracyMeters: optionalNumber(source.accuracyMeters),
    checkedInAt,
    ageMinutes,
    stale: ageMinutes > LOCATION_FRESH_MINUTES,
    jobId: conversation.jobId,
    jobLabel: conversation.jobLabel,
  };
}

export async function getLatestSimonLocation() {
  const workspace = await listPersistedJeffJobWorkspace();
  const locations = workspace.conversations
    .map(locationFromConversation)
    .filter((location): location is NonNullable<ReturnType<typeof locationFromConversation>> => Boolean(location))
    .sort((a, b) => new Date(b.checkedInAt).getTime() - new Date(a.checkedInAt).getTime());

  return {
    location: locations[0],
    storageStatus: workspace.storageStatus,
    warnings: workspace.warnings,
  };
}

export async function recordSimonLocationCheckIn(payload: unknown) {
  const input = normalizeLocationInput(payload);
  const checkedInAt = nowIso();

  if (input.latitude === undefined || input.longitude === undefined) {
    return {
      success: false,
      error: "Jeff needs latitude and longitude to save Simon's location.",
    };
  }

  const conversationId = makeId("jeff-location");
  const summaryText = [
    "Simon shared his current location with Jeff.",
    `GPS: ${input.latitude.toFixed(5)}, ${input.longitude.toFixed(5)}.`,
    input.accuracyMeters !== undefined ? `Accuracy: about ${Math.round(input.accuracyMeters)} meters.` : undefined,
  ].filter(Boolean).join(" ");
  const conversation: JeffConversation = {
    id: conversationId,
    jobId: input.jobId,
    jobLabel: input.jobLabel,
    jobMatchStatus: input.jobId ? "manual" : "unresolved",
    callType: input.jobId ? "job" : "admin",
    subjectLabel: "Simon location check-in",
    channel: "system",
    endedAt: checkedInAt,
    transcript: summaryText,
    rawSummary: summaryText,
    followUpRequested: false,
    followUpStatus: "none",
    needsReview: false,
    reviewReason: "Simon explicitly shared location from Jeff app.",
    sourcePayload: {
      source: "jeff-location-check-in",
      checkedInAt,
      latitude: input.latitude,
      longitude: input.longitude,
      accuracyMeters: input.accuracyMeters,
      consent: "simon-approved",
      inputSource: input.source,
    },
    createdAt: checkedInAt,
    updatedAt: checkedInAt,
  };
  const summary: JeffConversationSummary = {
    id: `${conversationId}-summary`,
    conversationId,
    jobId: input.jobId,
    summaryKind: input.jobId ? "after_call" : "manual_compaction",
    summary: summaryText,
    knownFacts: [
      `Simon location: ${input.latitude.toFixed(5)}, ${input.longitude.toFixed(5)}`,
      input.accuracyMeters !== undefined ? `Accuracy: about ${Math.round(input.accuracyMeters)} meters` : undefined,
    ].filter((entry): entry is string => Boolean(entry)),
    testsPerformed: [],
    readings: [],
    suspectedIssues: [],
    unprovenAssumptions: [],
    proofNeeded: [],
    nextActions: ["Use this location only while it is fresh; ask Simon to refresh before location-sensitive decisions."],
    recommendationSummary: summaryText,
    requestedFollowUps: [],
    emailRequested: false,
    emailStatus: "none",
    blockers: [],
    confidence: "medium",
    createdAt: checkedInAt,
    metadata: {
      source: "jeff-location-check-in",
      staleAfterMinutes: LOCATION_FRESH_MINUTES,
    },
  };
  const storage = await persistJeffConversationWorkspace({ conversation, summary });

  return {
    success: true,
    location: {
      latitude: input.latitude,
      longitude: input.longitude,
      accuracyMeters: input.accuracyMeters,
      checkedInAt,
      ageMinutes: 0,
      stale: false,
      staleAfterMinutes: LOCATION_FRESH_MINUTES,
    },
    storageStatus: storage.status,
    warning: storage.warning,
  };
}

export async function findNearbyPartsStoresForSimon(payload: unknown) {
  const input = normalizePartsStoreInput(payload);
  const latest = await getLatestSimonLocation();
  const explicitLocation = input.latitude !== undefined && input.longitude !== undefined
    ? {
        latitude: input.latitude,
        longitude: input.longitude,
        checkedInAt: nowIso(),
        ageMinutes: 0,
        stale: false,
      }
    : undefined;
  const location = explicitLocation || latest.location;
  const maxAge = Math.max(1, Math.min(input.maxLocationAgeMinutes || LOCATION_FRESH_MINUTES, 60));
  const mapsStatus = getGoogleMapsIntegrationStatus();

  if (!location) {
    return {
      success: false,
      status: "blocked",
      assistantSay: "I need Simon to tap Share Location in Jeff before I can rank nearby parts stores.",
      mapsStatus,
      warnings: latest.warnings,
    };
  }

  if (location.ageMinutes > maxAge) {
    return {
      success: false,
      status: "stale-location",
      assistantSay: `Simon's last location is ${location.ageMinutes} minutes old. Ask him to refresh location before choosing a store.`,
      location,
      mapsStatus,
      warnings: latest.warnings,
    };
  }

  if (!mapsStatus.ready) {
    return {
      success: false,
      status: "maps-not-configured",
      assistantSay: "I have Simon's location, but Google Maps is not configured yet, so I cannot rank nearby stores by drive time.",
      location,
      mapsStatus,
      warnings: [...latest.warnings, ...mapsStatus.missing],
    };
  }

  const stores = await findNearbyPartsStores({
    origin: {
      latitude: location.latitude,
      longitude: location.longitude,
    },
    partName: input.partName,
    vehicle: input.vehicle,
    maxResults: 5,
  });
  const best = stores[0];

  return {
    success: true,
    status: "ready",
    assistantSay: best
      ? `${best.name} looks closest by drive time: about ${best.route?.durationMinutes ?? "unknown"} minutes and ${best.route?.distanceMiles ?? "unknown"} miles. Next step is inventory confirmation: exact fitment, part number, price, core charge, and pickup timing. I can save the vendor-confirmed result, but I cannot reserve, pay, or order yet.`
      : "I could not find nearby parts stores from Simon's current location.",
    location,
    partName: input.partName,
    vehicle: input.vehicle,
    stores,
    policy: "Jeff may rank stores, prepare fitment/inventory questions, and save vendor-confirmed results. Jeff may not claim inventory from nearby-store results alone and may not reserve, pay, purchase, or order parts yet.",
    warnings: latest.warnings,
  };
}
