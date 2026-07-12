import { geocodeAddress } from "@/lib/geocoding";

export interface StopLike {
  id?: string;
  userId?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  latitude?: number;
  longitude?: number;
  location?: { latitude?: number; longitude?: number };
}

export function extractStopCoordinates(
  data: StopLike
): { latitude?: number; longitude?: number } {
  if (typeof data.latitude === "number" && typeof data.longitude === "number") {
    return { latitude: data.latitude, longitude: data.longitude };
  }

  if (
    data.location &&
    typeof data.location.latitude === "number" &&
    typeof data.location.longitude === "number"
  ) {
    return {
      latitude: data.location.latitude,
      longitude: data.location.longitude,
    };
  }

  return {};
}

export function buildStopAddress(stop: StopLike): string {
  const parts: string[] = [];
  if (stop.addressLine1) parts.push(stop.addressLine1);
  if (stop.addressLine2) parts.push(stop.addressLine2);
  if (stop.city) parts.push(stop.city);
  if (stop.state) parts.push(stop.state);
  if (stop.zipCode) parts.push(stop.zipCode);
  return parts.join(", ");
}

export function hasStopCoordinates(stop: StopLike): boolean {
  const coords = extractStopCoordinates(stop);
  return Boolean(coords.latitude && coords.longitude);
}

export async function enrichStopCoordinates(
  stop: StopLike,
  options?: {
    geocodeIfMissing?: boolean;
    userCoords?: { latitude?: number; longitude?: number } | null;
    onGeocoded?: (coords: { latitude: number; longitude: number }) => Promise<void>;
  }
): Promise<StopLike & { latitude?: number; longitude?: number }> {
  const existing = extractStopCoordinates(stop);
  if (existing.latitude && existing.longitude) {
    return { ...stop, ...existing };
  }

  if (options?.userCoords?.latitude && options?.userCoords?.longitude) {
    return {
      ...stop,
      latitude: options.userCoords.latitude,
      longitude: options.userCoords.longitude,
    };
  }

  if (!options?.geocodeIfMissing) {
    return stop;
  }

  const address = buildStopAddress(stop);
  if (!address) {
    return stop;
  }

  const geocoded = await geocodeAddress(address);
  if (!geocoded) {
    return stop;
  }

  if (options.onGeocoded) {
    await options.onGeocoded({
      latitude: geocoded.latitude,
      longitude: geocoded.longitude,
    });
  }

  return {
    ...stop,
    latitude: geocoded.latitude,
    longitude: geocoded.longitude,
  };
}
