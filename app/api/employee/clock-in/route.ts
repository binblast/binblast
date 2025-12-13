// app/api/employee/clock-in/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getDbInstance } from "@/lib/firebase";
import { safeImportFirestore } from "@/lib/firebase-module-loader";
import { getTodayDateString, getActiveClockIn, getEmployeeData } from "@/lib/employee-utils";
import { assignJobsToEmployeeOnClockIn } from "@/lib/job-assignment";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { employeeId, employeeEmail } = body;

    if (!employeeId || !employeeEmail) {
      return NextResponse.json(
        { message: "Missing employeeId or employeeEmail" },
        { status: 400 }
      );
    }

    // Check if employee already has an active clock-in
    const activeClockIn = await getActiveClockIn(employeeId);
    if (activeClockIn) {
      return NextResponse.json(
        {
          message: "Employee already clocked in",
          clockInTime: activeClockIn.clockInTime,
        },
        { status: 400 }
      );
    }

    // Check if employee already clocked in today
    const today = getTodayDateString();
    const db = await getDbInstance();
    if (!db) {
      return NextResponse.json(
        { message: "Database not available" },
        { status: 500 }
      );
    }

    const firestore = await safeImportFirestore();
    const { collection, query, where, getDocs, addDoc, serverTimestamp } = firestore;

    const clockInsRef = collection(db, "clockIns");
    const todayQuery = query(
      clockInsRef,
      where("employeeId", "==", employeeId),
      where("date", "==", today)
    );

    const todaySnapshot = await getDocs(todayQuery);
    if (!todaySnapshot.empty) {
      const existingClockIn = todaySnapshot.docs[0].data();
      return NextResponse.json(
        {
          message: "Employee already clocked in today",
          clockInTime: existingClockIn.clockInTime,
        },
        { status: 400 }
      );
    }

    // Create new clock-in record
    const clockInData = {
      employeeId,
      employeeEmail,
      clockInTime: serverTimestamp(),
      clockOutTime: null,
      date: today,
      isActive: true,
    };

    const clockInDoc = await addDoc(clockInsRef, clockInData);

    // Auto-assign jobs to this employee
    try {
      await assignJobsToEmployeeOnClockIn(employeeId);
    } catch (assignError) {
      console.error("Error assigning jobs on clock-in:", assignError);
      // Don't fail the clock-in if job assignment fails
    }

    return NextResponse.json(
      {
        message: "Clock-in successful",
        clockInId: clockInDoc.id,
        clockInTime: clockInData.clockInTime,
        date: today,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Clock-in error:", error);
    return NextResponse.json(
      { message: error.message || "Failed to clock in" },
      { status: 500 }
    );
  }
}

