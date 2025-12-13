// app/api/operator/employees/[employeeId]/service-area/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getDbInstance } from "@/lib/firebase";
import { safeImportFirestore } from "@/lib/firebase-module-loader";

export async function PUT(
  req: NextRequest,
  { params }: { params: { employeeId: string } }
) {
  try {
    const { employeeId } = params;
    const body = await req.json();
    const { serviceArea } = body;

    if (!serviceArea || !Array.isArray(serviceArea)) {
      return NextResponse.json(
        { message: "serviceArea must be an array" },
        { status: 400 }
      );
    }

    // Validate service areas are non-empty strings
    const validServiceAreas = serviceArea
      .map((area: string) => String(area).trim())
      .filter((area: string) => area.length > 0);

    const db = await getDbInstance();
    if (!db) {
      return NextResponse.json(
        { message: "Database not available" },
        { status: 500 }
      );
    }

    const firestore = await safeImportFirestore();
    const { doc, getDoc, updateDoc, serverTimestamp } = firestore;

    // Verify employee exists
    const employeeDoc = await getDoc(doc(db, "users", employeeId));
    if (!employeeDoc.exists()) {
      return NextResponse.json(
        { message: "Employee not found" },
        { status: 404 }
      );
    }

    const employeeData = employeeDoc.data();
    if (employeeData.role !== "employee") {
      return NextResponse.json(
        { message: "User is not an employee" },
        { status: 400 }
      );
    }

    // Update service area
    // Note: Authorization is handled by Firestore security rules
    await updateDoc(doc(db, "users", employeeId), {
      serviceArea: validServiceAreas,
      updatedAt: serverTimestamp(),
    });

    return NextResponse.json(
      { message: "Service area updated successfully", serviceArea: validServiceAreas },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error updating service area:", error);
    return NextResponse.json(
      { message: error.message || "Failed to update service area" },
      { status: 500 }
    );
  }
}

