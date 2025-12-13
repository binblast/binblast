// app/api/operator/employees/[employeeId]/schedule/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getDbInstance } from "@/lib/firebase";
import { safeImportFirestore } from "@/lib/firebase-module-loader";

function getWeekStartDate(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day; // Get Monday (day 1)
  const monday = new Date(d.setDate(diff));
  return monday.toISOString().split('T')[0];
}

export async function GET(
  req: NextRequest,
  { params }: { params: { employeeId: string } }
) {
  try {
    const employeeId = params.employeeId;
    const searchParams = req.nextUrl.searchParams;
    const weekStartDate = searchParams.get("weekStartDate");

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
    const { collection, query, where, getDocs } = firestore;

    const schedulesRef = collection(db, "employeeSchedules");

    if (weekStartDate) {
      // Get specific week schedule
      const scheduleId = `${employeeId}_${weekStartDate}`;
      const { doc, getDoc } = firestore;
      const scheduleRef = doc(db, "employeeSchedules", scheduleId);
      const scheduleSnap = await getDoc(scheduleRef);

      if (scheduleSnap.exists()) {
        return NextResponse.json({
          schedule: scheduleSnap.data(),
        });
      } else {
        return NextResponse.json({
          schedule: null,
        });
      }
    } else {
      // Get all schedules for this employee
      const schedulesQuery = query(
        schedulesRef,
        where("employeeId", "==", employeeId)
      );
      const schedulesSnapshot = await getDocs(schedulesQuery);
      
      const schedules = schedulesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));

      return NextResponse.json({
        schedules,
      });
    }
  } catch (error: any) {
    console.error("Error getting schedule:", error);
    return NextResponse.json(
      { error: error.message || "Failed to get schedule" },
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
    const { weekStartDate, schedule } = body;

    if (!employeeId || !weekStartDate || !schedule) {
      return NextResponse.json(
        { error: "Missing required fields: employeeId, weekStartDate, schedule" },
        { status: 400 }
      );
    }

    if (!Array.isArray(schedule) || schedule.length !== 7) {
      return NextResponse.json(
        { error: "Schedule must be an array of 7 days" },
        { status: 400 }
      );
    }

    // Validate schedule format
    for (let i = 0; i < schedule.length; i++) {
      const day = schedule[i];
      if (!day.hasOwnProperty('dayOfWeek') || day.dayOfWeek !== i) {
        return NextResponse.json(
          { error: `Invalid dayOfWeek at index ${i}. Expected ${i}, got ${day.dayOfWeek}` },
          { status: 400 }
        );
      }
    }

    const db = await getDbInstance();
    if (!db) {
      return NextResponse.json(
        { error: "Database not available" },
        { status: 500 }
      );
    }

    const firestore = await safeImportFirestore();
    const { doc, setDoc, serverTimestamp } = firestore;

    const scheduleId = `${employeeId}_${weekStartDate}`;
    const scheduleRef = doc(db, "employeeSchedules", scheduleId);

    // Ensure serverTimestamp is available
    const timestamp = serverTimestamp();
    if (!timestamp) {
      // Fallback to current date if serverTimestamp is not available
      const now = new Date();
      await setDoc(scheduleRef, {
        employeeId,
        weekStartDate,
        schedule,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      }, { merge: true });
    } else {
      await setDoc(scheduleRef, {
        employeeId,
        weekStartDate,
        schedule,
        createdAt: timestamp,
        updatedAt: timestamp,
      }, { merge: true });
    }

    return NextResponse.json({
      success: true,
      message: "Schedule saved successfully",
      scheduleId,
    });
  } catch (error: any) {
    console.error("Error saving schedule:", error);
    // Log detailed error for debugging
    if (error.code) {
      console.error("Firestore error code:", error.code);
    }
    if (error.message) {
      console.error("Error message:", error.message);
    }
    return NextResponse.json(
      { error: error.message || "Failed to save schedule" },
      { status: 500 }
    );
  }
}

