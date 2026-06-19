import { readEnv } from "@/lib/env";

type LatLng = {
  latitude: number;
  longitude: number;
};

type GooglePlacesSearchResponse = {
  places?: Array<{
    id?: string;
    displayName?: { text?: string };
    formattedAddress?: string;
    nationalPhoneNumber?: string;
    websiteUri?: string;
    googleMapsUri?: string;
    location?: LatLng;
    currentOpeningHours?: {
      openNow?: boolean;
    };
  }>;
  error?: { message?: string };
};

type GoogleRoutesResponse = {
  routes?: Array<{
    duration?: string;
    distanceMeters?: number;
    polyline?: { encodedPolyline?: string };
  }>;
  error?: { message?: string };
};

type GoogleRouteResult = {
  durationSeconds?: number;
  durationMinutes?: number;
  distanceMeters?: number;
  distanceMiles?: number;
  polyline?: string;
};

type GooglePlaceResult = {
  id?: string;
  name: string;
  address?: string;
  phone?: string;
  websiteUri?: string;
  googleMapsUri?: string;
  openNow?: boolean;
  location: LatLng;
};

type GooglePartsStoreResult = GooglePlaceResult & {
  straightLineDistanceMiles: number;
  route?: GoogleRouteResult;
  warning?: string;
};

const PLACES_TEXT_SEARCH_URL = "https://places.googleapis.com/v1/places:searchText";
const ROUTES_COMPUTE_URL = "https://routes.googleapis.com/directions/v2:computeRoutes";

function getGoogleMapsApiKey() {
  return readEnv("GOOGLE_MAPS_API_KEY");
}

function secondsFromDuration(value?: string) {
  const match = value?.match(/^(\d+(?:\.\d+)?)s$/);
  return match ? Math.round(Number(match[1])) : undefined;
}

function milesFromMeters(value?: number) {
  return value === undefined ? undefined : value / 1609.344;
}

function clampInt(value: number, min: number, max: number) {
  return Math.max(min, Math.min(value, max));
}

function readIntEnv(key: string, fallback: number, min: number, max: number) {
  const raw = readEnv(key);
  const parsed = raw ? Number.parseInt(raw, 10) : Number.NaN;
  return Number.isFinite(parsed) ? clampInt(parsed, min, max) : clampInt(fallback, min, max);
}

function readBooleanEnv(key: string, fallback: boolean) {
  const raw = readEnv(key);
  if (!raw) return fallback;
  if (/^(1|true|yes|on)$/i.test(raw)) return true;
  if (/^(0|false|no|off)$/i.test(raw)) return false;
  return fallback;
}

function straightLineMiles(origin: LatLng, destination: LatLng) {
  const radiusMiles = 3958.7613;
  const toRadians = (degrees: number) => degrees * (Math.PI / 180);
  const dLat = toRadians(destination.latitude - origin.latitude);
  const dLng = toRadians(destination.longitude - origin.longitude);
  const lat1 = toRadians(origin.latitude);
  const lat2 = toRadians(destination.latitude);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * radiusMiles * Math.asin(Math.sqrt(a));
}

function uniqueStrings(values: Array<string | undefined>) {
  const seen = new Set<string>();

  return values.flatMap((value) => {
    const normalized = value?.replace(/\s+/g, " ").trim();
    if (!normalized) return [];

    const key = normalized.toLowerCase();
    if (seen.has(key)) return [];
    seen.add(key);

    return [normalized];
  });
}

function placeIdentity(place: GooglePlaceResult) {
  return (place.id || `${place.name}|${place.address || ""}`).toLowerCase();
}

function assertMapsReady() {
  const apiKey = getGoogleMapsApiKey();
  if (!apiKey) throw new Error("GOOGLE_MAPS_API_KEY is not configured.");
  return apiKey;
}

export function getGoogleMapsIntegrationStatus() {
  const ready = Boolean(getGoogleMapsApiKey());

  return {
    ready,
    missing: ready ? [] : ["GOOGLE_MAPS_API_KEY"],
    capabilities: {
      routes: ready,
      places: ready,
      geocoding: ready,
    },
  };
}

export async function computeGoogleRoute(input: {
  origin: LatLng;
  destination: LatLng;
  trafficAware?: boolean;
}) {
  const apiKey = assertMapsReady();
  const trafficAware = input.trafficAware ?? readBooleanEnv("GOOGLE_MAPS_TRAFFIC_AWARE_ROUTING", true);
  const response = await fetch(ROUTES_COMPUTE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": "routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline",
    },
    body: JSON.stringify({
      origin: { location: { latLng: input.origin } },
      destination: { location: { latLng: input.destination } },
      travelMode: "DRIVE",
      ...(trafficAware ? { routingPreference: "TRAFFIC_AWARE" } : {}),
      computeAlternativeRoutes: false,
      languageCode: "en-US",
      units: "IMPERIAL",
    }),
  });
  const body = (await response.json().catch(() => ({}))) as GoogleRoutesResponse;
  if (!response.ok) {
    throw new Error(body.error?.message || `Google Routes request failed with status ${response.status}.`);
  }

  const route = body.routes?.[0];
  const durationSeconds = secondsFromDuration(route?.duration);
  const distanceMiles = milesFromMeters(route?.distanceMeters);

  return {
    durationSeconds,
    durationMinutes: durationSeconds === undefined ? undefined : Math.round(durationSeconds / 60),
    distanceMeters: route?.distanceMeters,
    distanceMiles: distanceMiles === undefined ? undefined : Number(distanceMiles.toFixed(1)),
    polyline: route?.polyline?.encodedPolyline,
  };
}

export async function findNearbyPlaces(input: {
  origin: LatLng;
  textQuery: string;
  radiusMeters?: number;
  maxResults?: number;
}): Promise<GooglePlaceResult[]> {
  const apiKey = assertMapsReady();
  const response = await fetch(PLACES_TEXT_SEARCH_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": [
        "places.id",
        "places.displayName",
        "places.formattedAddress",
        "places.nationalPhoneNumber",
        "places.websiteUri",
        "places.googleMapsUri",
        "places.location",
        "places.currentOpeningHours",
      ].join(","),
    },
    body: JSON.stringify({
      textQuery: input.textQuery,
      maxResultCount: clampInt(input.maxResults || readIntEnv("GOOGLE_MAPS_PARTS_SEARCH_LIMIT", 5, 1, 12), 1, 12),
      locationBias: {
        circle: {
          center: input.origin,
          radius: Math.max(500, Math.min(input.radiusMeters || 24_000, 50_000)),
        },
      },
      languageCode: "en-US",
    }),
  });
  const body = (await response.json().catch(() => ({}))) as GooglePlacesSearchResponse;
  if (!response.ok) {
    throw new Error(body.error?.message || `Google Places request failed with status ${response.status}.`);
  }

  return (body.places || []).flatMap((place) => {
    if (!place.location) return [];
    return [{
      id: place.id,
      name: place.displayName?.text || "Unknown place",
      address: place.formattedAddress,
      phone: place.nationalPhoneNumber,
      websiteUri: place.websiteUri,
      googleMapsUri: place.googleMapsUri,
      openNow: place.currentOpeningHours?.openNow,
      location: place.location,
    }];
  });
}

export async function findNearbyPartsStores(input: {
  origin: LatLng;
  partName?: string;
  vehicle?: string;
  preferredVendor?: string;
  radiusMeters?: number;
  maxResults?: number;
}) {
  const maxResults = clampInt(input.maxResults || readIntEnv("GOOGLE_MAPS_PARTS_SEARCH_LIMIT", 5, 1, 8), 1, 8);
  const routeCandidateLimit = readIntEnv("GOOGLE_MAPS_PARTS_ROUTE_LIMIT", Math.min(3, maxResults), 1, maxResults);
  const preferredVendor = input.preferredVendor?.trim();
  const queries = uniqueStrings([
    preferredVendor ? `${preferredVendor} auto parts` : undefined,
    preferredVendor && input.partName ? `${preferredVendor} ${input.partName}` : undefined,
    [input.partName ? `${input.partName} auto parts` : undefined, input.vehicle].filter(Boolean).join(" "),
    input.partName ? `${input.partName} auto parts store` : undefined,
    "auto parts store",
  ]);
  const seenPlaces = new Set<string>();
  const places: GooglePartsStoreResult[] = [];

  for (const textQuery of queries) {
    const results = await findNearbyPlaces({
      origin: input.origin,
      textQuery,
      radiusMeters: input.radiusMeters,
      maxResults,
    });

    for (const place of results) {
      const key = placeIdentity(place);
      if (seenPlaces.has(key)) continue;
      seenPlaces.add(key);
      places.push({
        ...place,
        straightLineDistanceMiles: Number(straightLineMiles(input.origin, place.location).toFixed(1)),
      });
    }

    if (places.length >= maxResults) break;
  }

  places.sort((a, b) => a.straightLineDistanceMiles - b.straightLineDistanceMiles);

  const ranked = await Promise.all(
    places.map(async (place, index) => {
      if (index >= routeCandidateLimit) {
        return place;
      }

      try {
        const route = await computeGoogleRoute({
          origin: input.origin,
          destination: place.location,
        });
        return {
          ...place,
          route,
        };
      } catch (error) {
        return {
          ...place,
          route: undefined,
          warning: error instanceof Error ? error.message : "Could not calculate route.",
        };
      }
    }),
  );

  return ranked
    .sort((a, b) => {
      if (a.route?.durationSeconds !== undefined && b.route?.durationSeconds !== undefined) {
        return a.route.durationSeconds - b.route.durationSeconds;
      }
      if (a.route?.durationSeconds !== undefined) return -1;
      if (b.route?.durationSeconds !== undefined) return 1;
      return a.straightLineDistanceMiles - b.straightLineDistanceMiles;
    })
    .slice(0, maxResults);
}
