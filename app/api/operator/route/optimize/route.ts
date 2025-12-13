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

    sortedCounties.forEach(county => {
      const countyStops = stopsByCounty.get(county) || [];
      
      // If we have coordinates, sort by proximity
      const stopsWithCoords = countyStops.filter((s: any) => s.latitude && s.longitude);
      const stopsWithoutCoords = countyStops.filter((s: any) => !s.latitude || !s.longitude);

      if (stopsWithCoords.length > 0) {
        // Sort by proximity to last stop
        stopsWithCoords.sort((a: any, b: any) => {
          if (lastLat === null || lastLon === null) return 0;
          
          const distA = calculateDistance(lastLat, lastLon, a.latitude, a.longitude);
          const distB = calculateDistance(lastLat, lastLon, b.latitude, b.longitude);
          return distA - distB;
        });

        // Add sorted stops
        stopsWithCoords.forEach((stop: any) => {
          optimizedStops.push(stop);
          lastLat = stop.latitude;
          lastLon = stop.longitude;
        });
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

