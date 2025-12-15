// app/api/employee/clock-in/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getDbInstance } from "@/lib/firebase";
import { safeImportFirestore } from "@/lib/firebase-module-loader";
import { getTodayDateString, getActiveClockIn, getEmployeeData } from "@/lib/employee-utils";
import { assignJobsToEmployeeOnClockIn } from "@/lib/job-assignment";
import { checkCertificationStatus } from "@/lib/training-certification";

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

    // Check certification status
    const certification = await checkCertificationStatus(employeeId);
    if (!certification.canClockIn) {
      if (certification.status === "expired") {
        return NextResponse.json(
          {
            message: "Your certification has expired. Please complete re-certification training before clocking in.",
            certificationStatus: certification.status,
            expiredModules: certification.expiredModules,
          },
          { status: 403 }
        );
      } else {
        return NextResponse.json(
          {
            message: "You must complete all required training modules before clocking in.",
            certificationStatus: certification.status,
            missingModules: certification.missingModules,
            completedModules: certification.completedModules,
            totalModules: certification.totalModules,
          },
          { status: 403 }
        );
      }
    }

    // Allow clock-in at any time - close any existing active clock-in first
    const today = getTodayDateString();
    const db = await getDbInstance();
    if (!db) {
      return NextResponse.json(
        { message: "Database not available" },
        { status: 500 }
      );
    }

    const firestore = await safeImportFirestore();
    const { collection, addDoc, serverTimestamp, doc, updateDoc } = firestore;

    // Close any existing active clock-in
    const activeClockIn = await getActiveClockIn(employeeId);
    if (activeClockIn) {
      try {
        const clockInsRef = collection(db, "clockIns");
        const activeClockInDoc = doc(db, "clockIns", activeClockIn.id);
        await updateDoc(activeClockInDoc, {
          clockOutTime: serverTimestamp(),
          isActive: false,
        });
      } catch (error) {
        console.error("Error closing existing clock-in:", error);
        // Continue with new clock-in even if closing previous one fails
      }
    }

    // Create new clock-in record
    const clockInsRef = collection(db, "clockIns");
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

