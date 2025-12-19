// app/api/operator/customers/geocode/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getDbInstance } from "@/lib/firebase";
import { safeImportFirestore } from "@/lib/firebase-module-loader";
import { geocodeAddress } from "@/lib/geocoding";

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

    const db = await getDbInstance();
    if (!db) {
      return NextResponse.json(
        { error: "Database not available" },
        { status: 500 }
      );
    }

    const firestore = await safeImportFirestore();
    const { doc, getDoc, updateDoc } = firestore;

    const results = [];
    const errors = [];

    for (const customerId of customerIds) {
      try {
        const customerRef = doc(db, "users", customerId);
        const customerSnap = await getDoc(customerRef);

        if (!customerSnap.exists()) {
          errors.push({ customerId, error: "Customer not found" });
          continue;
        }

        const customerData = customerSnap.data();

        // Skip if already geocoded
        if (customerData.latitude && customerData.longitude) {
          results.push({
            customerId,
            latitude: customerData.latitude,
            longitude: customerData.longitude,
            cached: true,
          });
          continue;
        }

        // Build address string
        const addressParts = [
          customerData.addressLine1,
          customerData.addressLine2,
          customerData.city,
          customerData.state,
          customerData.zipCode,
        ].filter(Boolean);

        if (addressParts.length < 3) {
          errors.push({ customerId, error: "Insufficient address data" });
          continue;
        }

        const addressString = addressParts.join(", ");

        // Geocode address
        const geocodeResult = await geocodeAddress(addressString);

        if (!geocodeResult) {
          errors.push({ customerId, error: "Geocoding failed" });
          continue;
        }

        // Update customer document with coordinates
        await updateDoc(customerRef, {
          latitude: geocodeResult.latitude,
          longitude: geocodeResult.longitude,
          geocodedAt: new Date().toISOString(),
        });

        results.push({
          customerId,
          latitude: geocodeResult.latitude,
          longitude: geocodeResult.longitude,
          cached: geocodeResult.cached,
        });
      } catch (error: any) {
        console.error(`Error geocoding customer ${customerId}:`, error);
        errors.push({ customerId, error: error.message || "Unknown error" });
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
