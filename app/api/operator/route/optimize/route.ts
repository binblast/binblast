// app/api/operator/route/optimize/route.ts
import { NextRequest, NextResponse } from "next/server";
import { optimizeStopOrder } from "@/lib/proximity-utils";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { stops, startLocation } = body;

    if (!Array.isArray(stops) || stops.length === 0) {
      return NextResponse.json(
        { error: "Stops array is required" },
        { status: 400 }
      );
    }

    const startLat = startLocation?.latitude ?? null;
    const startLon = startLocation?.longitude ?? null;

    const optimizedStops = optimizeStopOrder(stops, startLat, startLon);

    const stopsWithCoords = optimizedStops.filter(
      (s: { latitude?: number; longitude?: number }) => s.latitude && s.longitude
    );

    return NextResponse.json({
      optimizedStops,
      totalStops: optimizedStops.length,
      stopsWithCoordinates: stopsWithCoords.length,
      algorithm: "nearest-neighbor",
    });
  } catch (error: any) {
    console.error("Error optimizing route:", error);
    return NextResponse.json(
      { error: error.message || "Failed to optimize route" },
      { status: 500 }
    );
  }
}
