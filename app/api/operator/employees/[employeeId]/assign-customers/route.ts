// app/api/operator/employees/[employeeId]/assign-customers/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getDbInstance } from "@/lib/firebase";
import { safeImportFirestore } from "@/lib/firebase-module-loader";

export async function POST(
  req: NextRequest,
  { params }: { params: { employeeId: string } }
) {
  try {
    const { employeeId } = params;
    const body = await req.json();
    const { cleaningIds, date } = body;

    if (!cleaningIds || !Array.isArray(cleaningIds) || cleaningIds.length === 0) {
      return NextResponse.json(
        { message: "cleaningIds must be a non-empty array" },
        { status: 400 }
      );
    }

    if (!date) {
      return NextResponse.json(
        { message: "date is required" },
        { status: 400 }
      );
    }

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

    const employeeName = `${employeeData.firstName} ${employeeData.lastName}`;

    // Assign each cleaning to the employee
    const assignments = [];
    const errors = [];

    for (const cleaningId of cleaningIds) {
      try {
        const cleaningDoc = await getDoc(doc(db, "scheduledCleanings", cleaningId));
        
        if (!cleaningDoc.exists()) {
          errors.push(`Cleaning ${cleaningId} not found`);
          continue;
        }

        const cleaningData = cleaningDoc.data();
        
        // Check if cleaning is already assigned to someone else
        if (cleaningData.assignedEmployeeId && cleaningData.assignedEmployeeId !== employeeId) {
          errors.push(`Cleaning ${cleaningId} is already assigned to another employee`);
          continue;
        }

        // Check if cleaning date matches
        if (cleaningData.scheduledDate !== date) {
          errors.push(`Cleaning ${cleaningId} date doesn't match selected date`);
          continue;
        }

        // Assign cleaning
        await updateDoc(doc(db, "scheduledCleanings", cleaningId), {
          assignedEmployeeId: employeeId,
          assignedEmployeeName: employeeName,
          jobStatus: "pending",
          updatedAt: serverTimestamp(),
        });

        assignments.push(cleaningId);
      } catch (error: any) {
        errors.push(`Failed to assign cleaning ${cleaningId}: ${error.message}`);
      }
    }

    return NextResponse.json(
      {
        message: `Assigned ${assignments.length} customer(s) successfully`,
        assigned: assignments.length,
        errors: errors.length > 0 ? errors : undefined,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error assigning customers:", error);
    return NextResponse.json(
      { message: error.message || "Failed to assign customers" },
      { status: 500 }
    );
  }
}

