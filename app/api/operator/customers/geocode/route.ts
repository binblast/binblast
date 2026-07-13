// app/api/operator/customers/geocode/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getAdminFirestore } from "@/lib/firebase-admin";
import { geocodeStopServer } from "@/lib/geocoding-server";
import { hasStopCoordinates } from "@/lib/stop-coordinates";

export const dynamic = 'force-dynamic';

/**
 * POST /api/operator/customers/geocode
 * Geocode customer addresses and persist coordinates
 * Body: { customerIds: string[] }
 */
export async function POST(req: NextRequest) {
  try {
    const { customerIds } = await req.json();

    if (!Array.isArray(customerIds) || customerIds.length === 0) {
      return NextResponse.json(
        { error: "customerIds array is required" },
        { status: 400 }
      );
    }

    const db = await getAdminFirestore();

    const results = [];
    const errors = [];

    for (const customerId of customerIds) {
      try {
        const customerRef = db.collection("users").doc(customerId);
        const customerSnap = await customerRef.get();

        if (!customerSnap.exists) {
          errors.push({ customerId, error: "Customer not found" });
          continue;
        }

        const customerData = customerSnap.data() as Record<string, unknown>;

        if (hasStopCoordinates(customerData)) {
          results.push({
            customerId,
            latitude: customerData.latitude,
            longitude: customerData.longitude,
            cached: true,
          });
          continue;
        }

        const geocodeResult = await geocodeStopServer({
          addressLine1: String(customerData.addressLine1 || ""),
          addressLine2: customerData.addressLine2 ? String(customerData.addressLine2) : undefined,
          city: String(customerData.city || ""),
          state: String(customerData.state || ""),
          zipCode: String(customerData.zipCode || ""),
        });

        if (!geocodeResult) {
          errors.push({ customerId, error: "Geocoding failed" });
          continue;
        }

        await customerRef.update({
          latitude: geocodeResult.latitude,
          longitude: geocodeResult.longitude,
          geocodePrecision: geocodeResult.precision,
          geocodedAt: new Date().toISOString(),
        });

        results.push({
          customerId,
          latitude: geocodeResult.latitude,
          longitude: geocodeResult.longitude,
          precision: geocodeResult.precision,
        });
      } catch (error: unknown) {
        console.error(`Error geocoding customer ${customerId}:`, error);
        errors.push({
          customerId,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return NextResponse.json({
      success: true,
      results,
      errors,
      summary: {
        total: customerIds.length,
        geocoded: results.length,
        failed: errors.length,
      },
    });
  } catch (error: any) {
    console.error("Error in geocode endpoint:", error);
    return NextResponse.json(
      { error: error.message || "Failed to geocode customers" },
      { status: 500 }
    );
  }
}
