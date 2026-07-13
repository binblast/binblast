import { NextRequest, NextResponse } from "next/server";
import { checkAdminAccess } from "@/lib/admin-auth";
import { getAdminFirestore } from "@/lib/firebase-admin";
import { geocodeStopServer } from "@/lib/geocoding-server";
import { hasStopCoordinates } from "@/lib/stop-coordinates";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { isAdmin } = await checkAdminAccess(req);
    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const customerIds = Array.isArray(body.customerIds) ? body.customerIds : null;

    const db = await getAdminFirestore();
    const docs = customerIds?.length
      ? (
          await Promise.all(
            customerIds.map((id: string) => db.collection("users").doc(id).get())
          )
        ).filter((doc) => doc.exists)
      : (await db.collection("users").where("role", "==", "customer").get()).docs;

    const results: Array<{ customerId: string; precision?: string }> = [];
    const errors: Array<{ customerId: string; error: string }> = [];

    for (const doc of docs) {
      if (!doc.exists) continue;
      const customerId = doc.id;
      const data = doc.data() as Record<string, unknown>;

      if (hasStopCoordinates(data)) {
        results.push({ customerId, precision: "existing" });
        continue;
      }

      const result = await geocodeStopServer({
        addressLine1: String(data.addressLine1 || data.address || ""),
        addressLine2: data.addressLine2 ? String(data.addressLine2) : undefined,
        city: String(data.city || ""),
        state: String(data.state || ""),
        zipCode: String(data.zipCode || ""),
      });

      if (!result) {
        errors.push({ customerId, error: "Geocoding failed" });
        continue;
      }

      await db.collection("users").doc(customerId).update({
        latitude: result.latitude,
        longitude: result.longitude,
        geocodePrecision: result.precision,
        geocodedAt: new Date().toISOString(),
      });

      results.push({ customerId, precision: result.precision });
    }

    return NextResponse.json({
      success: true,
      summary: {
        total: docs.length,
        geocoded: results.length,
        failed: errors.length,
      },
      results,
      errors,
    });
  } catch (error: unknown) {
    console.error("[Admin Geocode] Error:", error);
    const message = error instanceof Error ? error.message : "Failed to geocode customers";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
