export function parseGeoPoint(
  location: unknown
): { latitude: number; longitude: number } | null {
  if (!location || typeof location !== "object") return null;

  const point = location as {
    latitude?: number;
    longitude?: number;
    _latitude?: number;
    _longitude?: number;
  };

  const latitude = point.latitude ?? point._latitude;
  const longitude = point.longitude ?? point._longitude;

  if (typeof latitude !== "number" || typeof longitude !== "number") {
    return null;
  }

  return { latitude, longitude };
}
