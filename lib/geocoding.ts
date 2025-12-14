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
    const db = await getDbInstance();
    if (!db) {
      throw new Error("Database not available");
    }

    const firestore = await safeImportFirestore();
    const { doc, getDoc, setDoc, serverTimestamp } = firestore;

    // Normalize address for cache lookup (lowercase, trim)
    const normalizedAddress = address.toLowerCase().trim();

    // Check cache first
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

    // Rate limiting: wait if needed
    const now = Date.now();
    const timeSinceLastRequest = now - lastRequestTime;
    if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
      await new Promise(resolve => setTimeout(resolve, MIN_REQUEST_INTERVAL - timeSinceLastRequest));
    }
    lastRequestTime = Date.now();

    // Geocode using OpenStreetMap Nominatim API
    const encodedAddress = encodeURIComponent(address);
    const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodedAddress}&limit=1`;

    const response = await fetch(nominatimUrl, {
      headers: {
        "User-Agent": "BinBlastCo/1.0", // Required by Nominatim
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

    // Cache the result
    await setDoc(cacheRef, {
      address: normalizedAddress,
      latitude,
      longitude,
      geocodedAt: serverTimestamp(),
      originalAddress: address, // Store original for reference
    });

    return {
      latitude,
      longitude,
      cached: false,
    };
  } catch (error: any) {
    console.error("Error geocoding address:", error);
    return null;
  }
}

