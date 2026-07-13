// lib/geocoding.ts
import { getDbInstance } from "@/lib/firebase";
import { safeImportFirestore } from "@/lib/firebase-module-loader";

// Rate limiting: track last request time
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 1000; // 1 second between requests

export interface GeocodeResult {
  latitude: number;
  longitude: number;
  cached: boolean;
}

export async function geocodeAddress(address: string): Promise<GeocodeResult | null> {
  try {
    const trimmed = address.trim();
    if (!trimmed) return null;

    const db = await getDbInstance();
    if (db) {
      const firestore = await safeImportFirestore();
      const { doc, getDoc, setDoc, serverTimestamp } = firestore;

      const normalizedAddress = trimmed.toLowerCase();
      const cacheRef = doc(db, "geocodedAddresses", normalizedAddress);
      const cacheSnap = await getDoc(cacheRef);

      if (cacheSnap.exists()) {
        const cachedData = cacheSnap.data();
        return {
          latitude: cachedData.latitude,
          longitude: cachedData.longitude,
          cached: true,
        };
      }

      const result = await fetchNominatim(trimmed);
      if (!result) return null;

      await setDoc(cacheRef, {
        address: normalizedAddress,
        latitude: result.latitude,
        longitude: result.longitude,
        geocodedAt: serverTimestamp(),
        originalAddress: trimmed,
      });

      return { ...result, cached: false };
    }

    const result = await fetchNominatim(trimmed);
    return result ? { ...result, cached: false } : null;
  } catch (error: unknown) {
    console.error("Error geocoding address:", error);
    return null;
  }
}

async function fetchNominatim(address: string): Promise<{ latitude: number; longitude: number } | null> {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    await new Promise((resolve) => setTimeout(resolve, MIN_REQUEST_INTERVAL - timeSinceLastRequest));
  }
  lastRequestTime = Date.now();

  const encodedAddress = encodeURIComponent(address);
  const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodedAddress}&limit=1&countrycodes=us`;

  const response = await fetch(nominatimUrl, {
    headers: {
      "User-Agent": "BinBlastCo/1.0",
    },
  });

  if (!response.ok) {
    throw new Error(`Nominatim API error: ${response.statusText}`);
  }

  const data = await response.json();
  if (!data || data.length === 0) {
    return null;
  }

  const result = data[0];
  const latitude = parseFloat(result.lat);
  const longitude = parseFloat(result.lon);

  if (isNaN(latitude) || isNaN(longitude)) {
    throw new Error("Invalid coordinates returned");
  }

  return { latitude, longitude };
}

