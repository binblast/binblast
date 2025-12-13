// app/api/employee/clock-out/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getDbInstance } from "@/lib/firebase";
import { safeImportFirestore } from "@/lib/firebase-module-loader";
import { getActiveClockIn, calculateHoursWorked } from "@/lib/employee-utils";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { employeeId } = body;

    if (!employeeId) {
      return NextResponse.json(
        { message: "Missing employeeId" },
        { status: 400 }
      );
    }

    // Find active clock-in record
    const activeClockIn = await getActiveClockIn(employeeId);
    if (!activeClockIn) {
      return NextResponse.json(
        { message: "No active clock-in found" },
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
    const { doc, updateDoc, serverTimestamp } = firestore;

    // Update clock-in record with clock-out time
    const clockInRef = doc(db, "clockIns", activeClockIn.id);
    const clockOutTime = serverTimestamp();
    
    await updateDoc(clockInRef, {
      clockOutTime,
      isActive: false,
    });

    // Calculate hours worked
    const hoursWorked = calculateHoursWorked(
      activeClockIn.clockInTime,
      clockOutTime
    );

    return NextResponse.json(
      {
        message: "Clock-out successful",
        clockOutTime,
        hoursWorked: Math.round(hoursWorked * 100) / 100, // Round to 2 decimal places
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Clock-out error:", error);
    return NextResponse.json(
      { message: error.message || "Failed to clock out" },
      { status: 500 }
    );
  }
}

