import { createHash } from "crypto";
import { getAdminFirestore } from "@/lib/firebase-admin";
import type { StopLike } from "@/lib/stop-coordinates";
import { buildStopAddress } from "@/lib/stop-coordinates";

export interface GeocodeResult {
  latitude: number;
  longitude: number;
  cached: boolean;
  precision: "exact" | "approximate";
  matchedAddress: string;
}

let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 1100;

function hashAddress(address: string): string {
  return createHash("sha256").update(address.toLowerCase().trim()).digest("hex");
}

function expandStreetAbbreviations(value: string): string {
  return value
    .replace(/\bLn\b\.?/gi, "Lane")
    .replace(/\bSt\b\.?/gi, "Street")
    .replace(/\bRd\b\.?/gi, "Road")
    .replace(/\bDr\b\.?/gi, "Drive")
    .replace(/\bAve\b\.?/gi, "Avenue")
    .replace(/\bBlvd\b\.?/gi, "Boulevard")
    .replace(/\bCt\b\.?/gi, "Court")
    .replace(/\bCir\b\.?/gi, "Circle");
}

export function buildGeocodeCandidates(stop: StopLike): Array<{
  query: string;
  precision: "exact" | "approximate";
}> {
  const seen = new Set<string>();
  const candidates: Array<{ query: string; precision: "exact" | "approximate" }> = [];

  const add = (query: string, precision: "exact" | "approximate") => {
    const normalized = query.trim().replace(/\s+/g, " ");
    if (!normalized) return;
    const key = normalized.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    candidates.push({ query: normalized, precision });
  };

  const full = buildStopAddress(stop);
  add(full, "exact");

  const streetLine = expandStreetAbbreviations(String(stop.addressLine1 || "").trim());
  const city = String(stop.city || "").trim();
  const state = String(stop.state || "").trim();
  const zip = String(stop.zipCode || "").trim();

  if (streetLine && city && state && zip) {
    add(`${streetLine}, ${city}, ${state} ${zip}`, "exact");
    add(`${streetLine}, ${city}, ${state}`, "exact");
  }

  if (streetLine && city && state) {
    add(expandStreetAbbreviations(`${streetLine}, ${city}, ${state}, USA`), "exact");
  }

  if (zip) {
    add(`${zip}, USA`, "approximate");
  }

  if (city && state) {
    add(`${city}, ${state}, USA`, "approximate");
  }

  return candidates;
}

async function readCache(address: string): Promise<GeocodeResult | null> {
  try {
    const db = await getAdminFirestore();
    const normalized = address.toLowerCase().trim();
    const cacheKey = hashAddress(normalized);

    const hashDoc = await db.collection("geocodedAddresses").doc(cacheKey).get();
    if (hashDoc.exists) {
      const data = hashDoc.data() as {
        latitude: number;
        longitude: number;
        precision?: "exact" | "approximate";
        matchedAddress?: string;
      };
      return {
        latitude: data.latitude,
        longitude: data.longitude,
        cached: true,
        precision: data.precision || "exact",
        matchedAddress: data.matchedAddress || address,
      };
    }

    const legacyDoc = await db.collection("geocodedAddresses").doc(normalized).get();
    if (legacyDoc.exists) {
      const data = legacyDoc.data() as { latitude: number; longitude: number };
      return {
        latitude: data.latitude,
        longitude: data.longitude,
        cached: true,
        precision: "exact",
        matchedAddress: address,
      };
    }
  } catch (error) {
    console.warn("[Geocoding] Cache read skipped:", error);
  }

  return null;
}

async function writeCache(
  address: string,
  result: Omit<GeocodeResult, "cached">
): Promise<void> {
  try {
    const db = await getAdminFirestore();
    const normalized = address.toLowerCase().trim();
    const cacheKey = hashAddress(normalized);

    await db.collection("geocodedAddresses").doc(cacheKey).set({
      address: normalized,
      latitude: result.latitude,
      longitude: result.longitude,
      precision: result.precision,
      matchedAddress: result.matchedAddress,
      geocodedAt: new Date().toISOString(),
      originalAddress: address,
    });
  } catch (error) {
    console.warn("[Geocoding] Cache write skipped:", error);
  }
}

async function queryNominatim(query: string): Promise<GeocodeResult | null> {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < MIN_REQUEST_INTERVAL) {
    await new Promise((resolve) => setTimeout(resolve, MIN_REQUEST_INTERVAL - elapsed));
  }
  lastRequestTime = Date.now();

  const encodedAddress = encodeURIComponent(query);
  const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodedAddress}&limit=1&countrycodes=us`;

  const response = await fetch(nominatimUrl, {
    headers: {
      "User-Agent": "BinBlastCo/1.0",
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Nominatim API error: ${response.statusText}`);
  }

  const data = await response.json();
  if (!Array.isArray(data) || data.length === 0) {
    return null;
  }

  const hit = data[0];
  const latitude = parseFloat(hit.lat);
  const longitude = parseFloat(hit.lon);

  if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
    return null;
  }

  return {
    latitude,
    longitude,
    cached: false,
    precision: "exact",
    matchedAddress: hit.display_name || query,
  };
}

export async function geocodeAddressServer(address: string): Promise<GeocodeResult | null> {
  const trimmed = address.trim();
  if (!trimmed) return null;

  const cached = await readCache(trimmed);
  if (cached) return cached;

  const result = await queryNominatim(trimmed);
  if (!result) return null;

  await writeCache(trimmed, result);
  return result;
}

export async function geocodeStopServer(stop: StopLike): Promise<GeocodeResult | null> {
  const candidates = buildGeocodeCandidates(stop);

  for (const candidate of candidates) {
    const cached = await readCache(candidate.query);
    if (cached) {
      return { ...cached, precision: candidate.precision };
    }
  }

  for (const candidate of candidates) {
    try {
      const result = await queryNominatim(candidate.query);
      if (!result) continue;

      const resolved: GeocodeResult = {
        ...result,
        precision: candidate.precision,
        matchedAddress: result.matchedAddress || candidate.query,
      };

      await writeCache(candidate.query, resolved);
      return resolved;
    } catch (error) {
      console.error("[Geocoding] Candidate failed:", candidate.query, error);
    }
  }

  return null;
}
