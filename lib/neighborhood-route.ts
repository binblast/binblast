import {
  calculateCentroid,
  haversineDistance,
  optimizeStopOrder,
  type StopWithCoordinates,
} from "@/lib/proximity-utils";

export type RoutableStop = StopWithCoordinates & {
  id: string;
  city?: string;
  zipCode?: string;
  addressLine1?: string;
  routeSequence?: number;
};

function neighborhoodKey(stop: RoutableStop): string {
  const city = String(stop.city || "").trim().toLowerCase();
  const zip = String(stop.zipCode || "").trim().slice(0, 5);
  if (city && zip) return `${city}|${zip}`;
  if (zip) return `zip|${zip}`;
  if (city) return `city|${city}`;
  return "unknown";
}

function clusterByProximity<T extends RoutableStop>(
  stops: T[],
  radiusMiles = 0.35
): T[][] {
  const withCoords = stops.filter(
    (stop) =>
      typeof stop.latitude === "number" &&
      typeof stop.longitude === "number"
  ) as Array<T & { latitude: number; longitude: number }>;

  const withoutCoords = stops.filter(
    (stop) => typeof stop.latitude !== "number" || typeof stop.longitude !== "number"
  );

  const groups: Array<T & { latitude: number; longitude: number }>[] = [];
  const remaining = [...withCoords];

  while (remaining.length > 0) {
    const seed = remaining.shift()!;
    const group = [seed];

    for (let i = remaining.length - 1; i >= 0; i--) {
      const candidate = remaining[i];
      const nearSeed = haversineDistance(
        seed.latitude,
        seed.longitude,
        candidate.latitude,
        candidate.longitude
      ) <= radiusMiles;

      const sameNeighborhood = neighborhoodKey(seed) === neighborhoodKey(candidate);

      if (nearSeed || sameNeighborhood) {
        group.push(candidate);
        remaining.splice(i, 1);
      }
    }

    groups.push(group);
  }

  return [...groups, ...(withoutCoords.length > 0 ? [withoutCoords as T[]] : [])];
}

export function orderStopsByNeighborhood<T extends RoutableStop>(
  stops: T[],
  startLat?: number | null,
  startLon?: number | null
): T[] {
  if (stops.length <= 1) {
    return stops.map((stop, index) => ({ ...stop, routeSequence: index + 1 }));
  }

  const neighborhoodGroups = clusterByProximity(stops);
  const orderedGroups: T[][] = [];
  let cursorLat = startLat ?? null;
  let cursorLon = startLon ?? null;

  const remainingGroups = [...neighborhoodGroups];

  while (remainingGroups.length > 0) {
    let bestIndex = 0;
    let bestDistance = Infinity;

    remainingGroups.forEach((group, index) => {
      const coords = group.filter(
        (stop) => typeof stop.latitude === "number" && typeof stop.longitude === "number"
      ) as Array<T & { latitude: number; longitude: number }>;

      if (coords.length === 0) {
        bestIndex = index;
        bestDistance = -1;
        return;
      }

      const centroid = calculateCentroid(
        coords.map((stop) => ({ latitude: stop.latitude, longitude: stop.longitude }))
      );

      const distance =
        cursorLat != null && cursorLon != null
          ? haversineDistance(cursorLat, cursorLon, centroid.latitude, centroid.longitude)
          : 0;

      if (distance < bestDistance || bestDistance < 0) {
        bestDistance = distance;
        bestIndex = index;
      }
    });

    const nextGroup = remainingGroups.splice(bestIndex, 1)[0];
    const optimizedGroup = optimizeStopOrder(nextGroup, cursorLat, cursorLon) as T[];
    orderedGroups.push(optimizedGroup);

    const lastWithCoords = [...optimizedGroup]
      .reverse()
      .find(
        (stop) => typeof stop.latitude === "number" && typeof stop.longitude === "number"
      ) as (T & { latitude: number; longitude: number }) | undefined;

    if (lastWithCoords) {
      cursorLat = lastWithCoords.latitude;
      cursorLon = lastWithCoords.longitude;
    }
  }

  const flattened = orderedGroups.flat();
  return flattened.map((stop, index) => ({
    ...stop,
    routeSequence: index + 1,
    neighborhoodKey: neighborhoodKey(stop),
  }));
}

export async function persistRouteSequence(
  stops: Array<{ id: string; routeSequence?: number; neighborhoodKey?: string }>
) {
  const { getAdminFirestore } = await import("@/lib/firebase-admin");
  const db = await getAdminFirestore();
  const admin = await import("firebase-admin");
  const batch = db.batch();

  stops.forEach((stop) => {
    if (!stop.id || stop.routeSequence == null) return;
    batch.update(db.collection("scheduledCleanings").doc(stop.id), {
      routeSequence: stop.routeSequence,
      neighborhoodKey: stop.neighborhoodKey || null,
      routeOptimizedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  });

  await batch.commit();
}
