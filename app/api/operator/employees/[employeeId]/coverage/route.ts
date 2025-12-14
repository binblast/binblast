// app/api/operator/employees/[employeeId]/coverage/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getDbInstance } from "@/lib/firebase";
import { safeImportFirestore } from "@/lib/firebase-module-loader";

export const dynamic = 'force-dynamic';

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

    // Get employee document
    const employeeRef = doc(db, "users", employeeId);
    const employeeSnap = await getDoc(employeeRef);

    if (!employeeSnap.exists()) {
      return NextResponse.json(
        { error: "Employee not found" },
        { status: 404 }
      );
    }

    const employeeData = employeeSnap.data();
    
    return NextResponse.json({
      counties: employeeData.counties || [],
      zones: employeeData.zones || [],
      serviceArea: employeeData.serviceArea || [],
    });
  } catch (error: any) {
    console.error("Error getting coverage:", error);
    return NextResponse.json(
      { error: error.message || "Failed to get coverage" },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { employeeId: string } }
) {
  try {
    const employeeId = params.employeeId;
    const body = await req.json();
    const { counties, zones, autoAssign = false } = body;
    const searchParams = req.nextUrl.searchParams;
    const skipAutoAssign = searchParams.get("skipAutoAssign") === "true";

    if (!employeeId) {
      return NextResponse.json(
        { error: "Missing employeeId" },
        { status: 400 }
      );
    }

    if (!Array.isArray(counties) || !Array.isArray(zones)) {
      return NextResponse.json(
        { error: "counties and zones must be arrays" },
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

    // Verify employee exists
    const employeeRef = doc(db, "users", employeeId);
    const employeeSnap = await getDoc(employeeRef);

    if (!employeeSnap.exists()) {
      return NextResponse.json(
        { error: "Employee not found" },
        { status: 404 }
      );
    }

    // Update employee document
    await updateDoc(employeeRef, {
      counties: counties || [],
      zones: zones || [],
      updatedAt: serverTimestamp(),
    });

    // Trigger auto-assignment if requested and not skipped
    let assignmentResult = null;
    if ((autoAssign || body.autoAssign === true) && !skipAutoAssign) {
      try {
        // Call auto-assignment endpoint internally
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || req.nextUrl.origin;
        const autoAssignUrl = `${baseUrl}/api/operator/employees/${employeeId}/auto-assign`;
        
        const autoAssignResponse = await fetch(autoAssignUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ zones, counties }),
        });

        if (autoAssignResponse.ok) {
          assignmentResult = await autoAssignResponse.json();
        }
      } catch (assignError) {
        console.error("Error triggering auto-assignment:", assignError);
        // Don't fail the coverage update if auto-assignment fails
      }
    }

    return NextResponse.json({
      success: true,
      message: "Coverage updated successfully",
      counties,
      zones,
      assignmentResult,
    });
  } catch (error: any) {
    console.error("Error updating coverage:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update coverage" },
      { status: 500 }
    );
  }
}

