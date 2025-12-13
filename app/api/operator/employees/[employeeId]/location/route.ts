// app/api/operator/employees/[employeeId]/location/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getDbInstance } from "@/lib/firebase";
import { safeImportFirestore } from "@/lib/firebase-module-loader";

export async function GET(
  req: NextRequest,
  { params }: { params: { employeeId: string } }
) {
  try {
    const employeeId = params.employeeId;

    if (!employeeId) {
      return NextResponse.json(
        { error: "Missing employeeId" },
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
    const { doc, getDoc } = firestore;

    const employeeRef = doc(db, "users", employeeId);
    const employeeSnap = await getDoc(employeeRef);

    if (!employeeSnap.exists()) {
      return NextResponse.json(
        { error: "Employee not found" },
        { status: 404 }
      );
    }

    const employeeData = employeeSnap.data();
    const lastKnownLocation = employeeData.lastKnownLocation || null;

    return NextResponse.json({
      location: lastKnownLocation,
      hasLocation: !!lastKnownLocation,
    });
  } catch (error: any) {
    console.error("Error getting location:", error);
    return NextResponse.json(
      { error: error.message || "Failed to get location" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { employeeId: string } }
) {
  try {
    const employeeId = params.employeeId;
    const body = await req.json();
    const { latitude, longitude } = body;

    if (!employeeId || latitude === undefined || longitude === undefined) {
      return NextResponse.json(
        { error: "Missing required fields: employeeId, latitude, longitude" },
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
    const { doc, getDoc, updateDoc, serverTimestamp } = firestore;
    
    // Import GeoPoint from firebase/firestore directly
    const firebaseFirestore = await import("firebase/firestore");
    const { GeoPoint } = firebaseFirestore;

    const employeeRef = doc(db, "users", employeeId);
    const employeeSnap = await getDoc(employeeRef);

    if (!employeeSnap.exists()) {
      return NextResponse.json(
        { error: "Employee not found" },
        { status: 404 }
      );
    }

    // Create GeoPoint for location
    const location = new GeoPoint(latitude, longitude);

    await updateDoc(employeeRef, {
      lastKnownLocation: location,
      lastLocationUpdate: serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      message: "Location updated successfully",
      location: { latitude, longitude },
    });
  } catch (error: any) {
    console.error("Error updating location:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update location" },
      { status: 500 }
    );
  }
}

