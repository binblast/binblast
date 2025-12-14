// app/api/operator/route/optimize/route.ts
import { NextRequest, NextResponse } from "next/server";

// Simple distance calculation (Haversine formula)
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3959; // Earth's radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { stops } = body;

    if (!Array.isArray(stops) || stops.length === 0) {
      return NextResponse.json(
        { error: "Stops array is required" },
        { status: 400 }
      );
    }

    // Group stops by county
    const stopsByCounty = new Map<string, typeof stops>();
    
    stops.forEach((stop: any) => {
      const county = stop.county || stop.city || "Unknown";
      if (!stopsByCounty.has(county)) {
        stopsByCounty.set(county, []);
      }
      stopsByCounty.get(county)!.push(stop);
    });

    // Sort counties (can be enhanced with priority)
    const sortedCounties = Array.from(stopsByCounty.keys()).sort();

    // Optimize route: group by county, then sort by proximity within each county
    const optimizedStops: any[] = [];
    let lastLat: number | null = null;
    let lastLon: number | null = null;

    sortedCounties.forEach((county, countyIndex) => {
      const countyStops = stopsByCounty.get(county) || [];
      
      // If we have coordinates, sort by proximity
      const stopsWithCoords = countyStops.filter((s: any) => s.latitude && s.longitude);
      const stopsWithoutCoords = countyStops.filter((s: any) => !s.latitude || !s.longitude);

      if (stopsWithCoords.length > 0) {
        // For the first county, start with the stop closest to the center of all stops
        if (countyIndex === 0 && lastLat === null && lastLon === null) {
          // Calculate center of all stops
          const avgLat = stopsWithCoords.reduce((sum: number, s: any) => sum + s.latitude, 0) / stopsWithCoords.length;
          const avgLon = stopsWithCoords.reduce((sum: number, s: any) => sum + s.longitude, 0) / stopsWithCoords.length;
          
          // Find stop closest to center
          let closestStop = stopsWithCoords[0];
          let closestDist = calculateDistance(avgLat, avgLon, closestStop.latitude, closestStop.longitude);
          
          stopsWithCoords.forEach((stop: any) => {
            const dist = calculateDistance(avgLat, avgLon, stop.latitude, stop.longitude);
            if (dist < closestDist) {
              closestDist = dist;
              closestStop = stop;
            }
          });
          
          // Remove closest stop from array and add it first
          const closestIndex = stopsWithCoords.indexOf(closestStop);
          stopsWithCoords.splice(closestIndex, 1);
          optimizedStops.push(closestStop);
          lastLat = closestStop.latitude;
          lastLon = closestStop.longitude;
        }
        
        // Sort remaining stops by proximity to last stop using nearest neighbor algorithm
        while (stopsWithCoords.length > 0) {
          let nearestStop = stopsWithCoords[0];
          let nearestDist = calculateDistance(lastLat!, lastLon!, nearestStop.latitude, nearestStop.longitude);
          
          stopsWithCoords.forEach((stop: any) => {
            const dist = calculateDistance(lastLat!, lastLon!, stop.latitude, stop.longitude);
            if (dist < nearestDist) {
              nearestDist = dist;
              nearestStop = stop;
            }
          });
          
          // Remove nearest stop from array and add it
          const nearestIndex = stopsWithCoords.indexOf(nearestStop);
          stopsWithCoords.splice(nearestIndex, 1);
          optimizedStops.push(nearestStop);
          lastLat = nearestStop.latitude;
          lastLon = nearestStop.longitude;
        }
      }

      // Add stops without coordinates at the end of county group
      optimizedStops.push(...stopsWithoutCoords);
    });

    return NextResponse.json({
      optimizedStops,
      totalStops: optimizedStops.length,
      counties: sortedCounties.length,
    });
  } catch (error: any) {
    console.error("Error optimizing route:", error);
    return NextResponse.json(
      { error: error.message || "Failed to optimize route" },
      { status: 500 }
    );
  }
}

