import {
  buildStopAddress,
  extractStopCoordinates,
  hasStopCoordinates,
} from "@/lib/stop-coordinates";
import {
  clusterCustomers,
  haversineDistance,
  optimizeStopOrder,
} from "@/lib/proximity-utils";

export interface RouteStop {
  id: string;
  customerName?: string;
  userEmail?: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  zipCode: string;
  scheduledTime?: string;
  jobStatus?: "pending" | "in_progress" | "completed";
  latitude?: number;
  longitude?: number;
}

export interface RouteCluster {
  id: string;
  label: string;
  stops: RouteStop[];
  stopCount: number;
  spanMiles: number;
  color: string;
}

const CLUSTER_COLORS = [
  "#16a34a",
  "#2563eb",
  "#d97706",
  "#7c3aed",
  "#db2777",
  "#0891b2",
];

export function jobToRouteStop(job: {
  id: string;
  customerName?: string;
  userEmail?: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  zipCode: string;
  scheduledTime?: string;
  jobStatus?: "pending" | "in_progress" | "completed";
  latitude?: number;
  longitude?: number;
  location?: { latitude?: number; longitude?: number };
}): RouteStop {
  const coords = extractStopCoordinates(job);
  return {
    id: job.id,
    customerName: job.customerName,
    userEmail: job.userEmail,
    addressLine1: job.addressLine1,
    addressLine2: job.addressLine2,
    city: job.city,
    state: job.state,
    zipCode: job.zipCode,
    scheduledTime: job.scheduledTime,
    jobStatus: job.jobStatus,
    latitude: coords.latitude,
    longitude: coords.longitude,
  };
}

export async function geocodeRouteStop(stop: RouteStop): Promise<RouteStop> {
  if (hasStopCoordinates(stop)) {
    return stop;
  }

  const address = buildStopAddress(stop);
  if (!address) {
    return stop;
  }

  try {
    const response = await fetch(`/api/geocode?address=${encodeURIComponent(address)}`);
    if (!response.ok) {
      return stop;
    }

    const data = await response.json();
    if (typeof data.latitude !== "number" || typeof data.longitude !== "number") {
      return stop;
    }

    return {
      ...stop,
      latitude: data.latitude,
      longitude: data.longitude,
    };
  } catch {
    return stop;
  }
}

export async function resolveRouteStops(stops: RouteStop[]): Promise<RouteStop[]> {
  const resolved: RouteStop[] = [];
  for (const stop of stops) {
    resolved.push(await geocodeRouteStop(stop));
  }
  return resolved;
}

function clusterSpanMiles(stops: Array<RouteStop & { latitude: number; longitude: number }>): number {
  if (stops.length < 2) return 0;

  let maxDistance = 0;
  for (let i = 0; i < stops.length; i++) {
    for (let j = i + 1; j < stops.length; j++) {
      maxDistance = Math.max(
        maxDistance,
        haversineDistance(
          stops[i].latitude,
          stops[i].longitude,
          stops[j].latitude,
          stops[j].longitude
        )
      );
    }
  }
  return maxDistance;
}

function groupStopsByCity(stops: RouteStop[]): RouteCluster[] {
  const groups = new Map<string, RouteStop[]>();

  for (const stop of stops) {
    const key = `${stop.city || "Unknown"}-${stop.zipCode || ""}`.trim();
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(stop);
  }

  return Array.from(groups.entries()).map(([key, groupStops], index) => ({
    id: `area-${key}`,
    label: groupStops[0]?.city || "Unknown area",
    stops: groupStops,
    stopCount: groupStops.length,
    spanMiles: 0,
    color: CLUSTER_COLORS[index % CLUSTER_COLORS.length],
  }));
}

export function buildRouteClusters(
  stops: RouteStop[],
  radiusMiles = 0.5
): RouteCluster[] {
  if (stops.length === 0) {
    return [];
  }

  const withCoords = stops.filter(
    (stop): stop is RouteStop & { latitude: number; longitude: number } =>
      hasStopCoordinates(stop)
  );

  if (withCoords.length === 0) {
    return groupStopsByCity(stops);
  }

  const rawClusters = clusterCustomers(withCoords, radiusMiles);

  if (rawClusters.length === 0) {
    return groupStopsByCity(stops);
  }

  const assignedIds = new Set<string>();
  const clusters: RouteCluster[] = rawClusters.map((cluster, index) => {
    cluster.customers.forEach((customer) => assignedIds.add(customer.id));
    const clusterStops = cluster.customers as RouteStop[];
    const label =
      cluster.area ||
      clusterStops[0]?.city ||
      `Area ${index + 1}`;

    return {
      id: cluster.id,
      label,
      stops: clusterStops,
      stopCount: clusterStops.length,
      spanMiles: clusterSpanMiles(
        clusterStops as Array<RouteStop & { latitude: number; longitude: number }>
      ),
      color: CLUSTER_COLORS[index % CLUSTER_COLORS.length],
    };
  });

  const unassigned = stops.filter((stop) => !assignedIds.has(stop.id));
  if (unassigned.length > 0) {
    clusters.push(...groupStopsByCity(unassigned));
  }

  return clusters.sort((a, b) => b.stopCount - a.stopCount);
}

export function getOptimizedActiveStops(stops: RouteStop[]): RouteStop[] {
  const withSequence = stops.filter(
    (stop) => typeof (stop as RouteStop & { routeSequence?: number }).routeSequence === "number"
  );

  if (withSequence.length === stops.length && stops.length > 0) {
    return [...stops].sort(
      (a, b) =>
        ((a as RouteStop & { routeSequence?: number }).routeSequence || 0) -
        ((b as RouteStop & { routeSequence?: number }).routeSequence || 0)
    );
  }

  return optimizeStopOrder(stops);
}

export function getDistanceMiles(
  from: RouteStop,
  to: RouteStop
): number | null {
  if (!hasStopCoordinates(from) || !hasStopCoordinates(to)) {
    return null;
  }
  return haversineDistance(from.latitude!, from.longitude!, to.latitude!, to.longitude!);
}

export function formatDistanceMiles(miles: number | null): string | null {
  if (miles === null) return null;
  if (miles < 0.1) return "< 0.1 mi";
  if (miles < 10) return `${miles.toFixed(1)} mi`;
  return `${Math.round(miles)} mi`;
}

export function getStopClusterColor(
  stopId: string,
  clusters: RouteCluster[]
): string | undefined {
  return clusters.find((cluster) =>
    cluster.stops.some((stop) => stop.id === stopId)
  )?.color;
}

export function buildStopAddressLine(stop: RouteStop): string {
  return buildStopAddress(stop) || `${stop.addressLine1}, ${stop.city}`;
}
