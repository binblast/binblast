// app/api/operator/employees/[employeeId]/shift-status/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getDbInstance } from "@/lib/firebase";
import { safeImportFirestore } from "@/lib/firebase-module-loader";
import { getTodayDateString } from "@/lib/employee-utils";

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
    const { collection, query, where, getDocs, orderBy, limit } = firestore;

    const today = getTodayDateString();

    // Get current clock-in status
    const clockInsRef = collection(db, "clockIns");
    const activeClockInQuery = query(
      clockInsRef,
      where("employeeId", "==", employeeId),
      where("date", "==", today),
      where("isActive", "==", true),
      orderBy("clockInTime", "desc"),
      limit(1)
    );

    const clockInSnapshot = await getDocs(activeClockInQuery);
    const clockInData = clockInSnapshot.empty ? null : clockInSnapshot.docs[0].data();

    // Get today's assigned stops
    const cleaningsRef = collection(db, "scheduledCleanings");
    const assignedStopsQuery = query(
      cleaningsRef,
      where("assignedEmployeeId", "==", employeeId),
      where("scheduledDate", "==", today)
    );

    const stopsSnapshot = await getDocs(assignedStopsQuery);
    const stops = stopsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    const assignedStops = stops.length;
    const completedStops = stops.filter(s => 
      s.status === "completed" || s.jobStatus === "completed"
    ).length;
    const inProgressStops = stops.filter(s => 
      s.status === "in_progress" || s.jobStatus === "in_progress"
    ).length;
    const pendingStops = stops.filter(s => 
      s.status === "pending" || s.jobStatus === "pending"
    ).length;

    // Calculate missed/late stops (scheduled time passed but not completed)
    const now = new Date();
    const missedStops = stops.filter(s => {
      if (s.status === "completed" || s.jobStatus === "completed") return false;
      if (!s.scheduledTime) return false;
      
      const [hours, minutes] = s.scheduledTime.split(":").map(Number);
      const scheduledDateTime = new Date();
      scheduledDateTime.setHours(hours, minutes, 0, 0);
      
      return scheduledDateTime < now;
    }).length;

    // Determine shift status
    let shiftStatus = "not_started";
    let shiftStartTime = null;
    let expectedEndTime = null;

    if (clockInData) {
      shiftStatus = "clocked_in";
      shiftStartTime = clockInData.clockInTime;
      
      // Calculate expected end time (8 hours from clock-in)
      if (clockInData.clockInTime) {
        const clockInDate = clockInData.clockInTime.toDate 
          ? clockInData.clockInTime.toDate() 
          : new Date(clockInData.clockInTime);
        const expectedEnd = new Date(clockInDate);
        expectedEnd.setHours(expectedEnd.getHours() + 8);
        expectedEndTime = expectedEnd;
      }
    }

    return NextResponse.json({
      shiftStatus,
      shiftStartTime,
      expectedEndTime,
      assignedStops,
      completedStops,
      inProgressStops,
      pendingStops,
      missedStops,
      stopsRemaining: assignedStops - completedStops,
    });
  } catch (error: any) {
    console.error("Error getting shift status:", error);
    return NextResponse.json(
      { error: error.message || "Failed to get shift status" },
      { status: 500 }
    );
  }
}

