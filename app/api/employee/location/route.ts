import { NextRequest, NextResponse } from "next/server";
import { getAdminFirestore } from "@/lib/firebase-admin";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { employeeId, latitude, longitude, accuracy, heading, speed } = body;

    if (!employeeId || latitude == null || longitude == null) {
      return NextResponse.json(
        { error: "employeeId, latitude, and longitude are required" },
        { status: 400 }
      );
    }

    const db = await getAdminFirestore();
    const admin = await import("firebase-admin");
    const employeeRef = db.collection("users").doc(employeeId);
    const employeeDoc = await employeeRef.get();

    if (!employeeDoc.exists) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    await employeeRef.set(
      {
        lastKnownLocation: new admin.firestore.GeoPoint(
          Number(latitude),
          Number(longitude)
        ),
        lastLocationUpdate: admin.firestore.FieldValue.serverTimestamp(),
        lastLocationAccuracy: accuracy ?? null,
        lastLocationHeading: heading ?? null,
        lastLocationSpeed: speed ?? null,
        isLocationLive: true,
      },
      { merge: true }
    );

    await db.collection("employeeLocationEvents").add({
      employeeId,
      latitude: Number(latitude),
      longitude: Number(longitude),
      accuracy: accuracy ?? null,
      heading: heading ?? null,
      speed: speed ?? null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("[Employee Location] Error:", error);
    const message = error instanceof Error ? error.message : "Failed to update location";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
