// lib/proximity-utils.ts
// Utilities for proximity calculations, clustering, and distance-based operations

/**
 * Calculate distance between two coordinates using Haversine formula
 * Returns distance in miles
 */
export function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 3959; // Earth's radius in miles
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

export interface CustomerWithLocation {
  id: string;
  latitude?: number;
  longitude?: number;
  [key: string]: any;
}

export interface Cluster {
  id: string;
  centroid: { latitude: number; longitude: number };
  customers: CustomerWithLocation[];
  radius: number; // miles
  estimatedRouteMiles?: number;
  area?: string; // city/zip summary
}

/**
 * Greedy clustering algorithm: group customers within radius
 * @param customers - Array of customers with lat/lng
 * @param radiusMiles - Maximum distance for clustering (default 1 mile)
 * @returns Array of clusters
 */
export function clusterCustomers(
  customers: CustomerWithLocation[],
  radiusMiles: number = 1
): Cluster[] {
  // Filter to only customers with coordinates
  const customersWithCoords = customers.filter(
    (c) => c.latitude !== undefined && c.longitude !== undefined && c.latitude !== null && c.longitude !== null
  ) as Array<CustomerWithLocation & { latitude: number; longitude: number }>;

  if (customersWithCoords.length === 0) {
    return [];
  }

  const clusters: Cluster[] = [];
  const unassigned = [...customersWithCoords];
  let clusterId = 0;

  while (unassigned.length > 0) {
    // Pick first unassigned customer as seed
    const seed = unassigned.shift()!;
    const clusterCustomers: Array<CustomerWithLocation & { latitude: number; longitude: number }> = [seed];

    // Find all customers within radius
    for (let i = unassigned.length - 1; i >= 0; i--) {
      const customer = unassigned[i];
      const distance = haversineDistance(
        seed.latitude,
        seed.longitude,
        customer.latitude!,
        customer.longitude!
      );

      if (distance <= radiusMiles) {
        clusterCustomers.push(customer);
        unassigned.splice(i, 1);
      }
    }

    // Calculate centroid
    const avgLat =
      clusterCustomers.reduce((sum, c) => sum + c.latitude!, 0) /
      clusterCustomers.length;
    const avgLon =
      clusterCustomers.reduce((sum, c) => sum + c.longitude!, 0) /
      clusterCustomers.length;

    // Estimate route miles (rough approximation: perimeter of cluster)
    let maxDistance = 0;
    for (let i = 0; i < clusterCustomers.length; i++) {
      for (let j = i + 1; j < clusterCustomers.length; j++) {
        const dist = haversineDistance(
          clusterCustomers[i].latitude!,
          clusterCustomers[i].longitude!,
          clusterCustomers[j].latitude!,
          clusterCustomers[j].longitude!
        );
        maxDistance = Math.max(maxDistance, dist);
      }
    }
    const estimatedRouteMiles = maxDistance * 2; // Rough estimate

    // Get area summary (most common city/zip)
    const cities = clusterCustomers
      .map((c) => c.city)
      .filter(Boolean) as string[];
    const zipCodes = clusterCustomers
      .map((c) => c.zipCode)
      .filter(Boolean) as string[];
    
    const mostCommonCity = cities.length > 0
      ? cities.reduce((a, b, _, arr) =>
          arr.filter((v) => v === a).length >= arr.filter((v) => v === b).length
            ? a
            : b
        )
      : undefined;
    
    const area = mostCommonCity
      ? `${mostCommonCity}${zipCodes.length > 0 ? ` (${zipCodes[0]})` : ""}`
      : undefined;

    clusters.push({
      id: `cluster-${clusterId++}`,
      centroid: { latitude: avgLat, longitude: avgLon },
      customers: clusterCustomers,
      radius: radiusMiles,
      estimatedRouteMiles,
      area,
    });
  }

  return clusters;
}

/**
 * Sort customers by distance from anchor point
 */
export function sortByDistance(
  customers: CustomerWithLocation[],
  anchorLat: number,
  anchorLon: number
): Array<CustomerWithLocation & { distance: number }> {
  const customersWithCoords = customers.filter(
    (c) => c.latitude !== undefined && c.longitude !== undefined && c.latitude !== null && c.longitude !== null
  ) as Array<CustomerWithLocation & { latitude: number; longitude: number }>;

  return customersWithCoords
    .map((customer) => ({
      ...customer,
      distance: haversineDistance(
        anchorLat,
        anchorLon,
        customer.latitude!,
        customer.longitude!
      ),
    }))
    .sort((a, b) => a.distance - b.distance);
}

/**
 * Filter customers within radius from anchor point
 */
export function filterWithinRadius(
  customers: CustomerWithLocation[],
  anchorLat: number,
  anchorLon: number,
  radiusMiles: number
): CustomerWithLocation[] {
  return customers.filter((customer) => {
    if (!customer.latitude || !customer.longitude) return false;
    const distance = haversineDistance(
      anchorLat,
      anchorLon,
      customer.latitude,
      customer.longitude
    );
    return distance <= radiusMiles;
  });
}

/**
 * Calculate centroid of multiple coordinates
 */
export function calculateCentroid(
  coordinates: Array<{ latitude: number; longitude: number }>
): { latitude: number; longitude: number } {
  if (coordinates.length === 0) {
    throw new Error("Cannot calculate centroid of empty array");
  }

  const avgLat =
    coordinates.reduce((sum, c) => sum + c.latitude, 0) / coordinates.length;
  const avgLon =
    coordinates.reduce((sum, c) => sum + c.longitude, 0) / coordinates.length;

  return { latitude: avgLat, longitude: avgLon };
}
