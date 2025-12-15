// app/api/admin/employees/[employeeId]/schedule/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getDbInstance } from "@/lib/firebase";
import { safeImportFirestore } from "@/lib/firebase-module-loader";
import { checkAdminAccess } from "@/lib/admin-auth";

export const dynamic = 'force-dynamic';

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
    const { isAdmin } = await checkAdminAccess(req);
    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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
    const { collection, query, where, getDocs, doc, getDoc } = firestore;

    const schedulesRef = collection(db, "employeeSchedules");

    if (weekStartDate) {
      // Get specific week schedule
      const scheduleId = `${employeeId}_${weekStartDate}`;
      const scheduleRef = doc(db, "employeeSchedules", scheduleId);
      const scheduleSnap = await getDoc(scheduleRef);

      if (scheduleSnap.exists()) {
        return NextResponse.json({
          success: true,
          schedule: scheduleSnap.data(),
        });
      } else {
        return NextResponse.json({
          success: true,
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
        success: true,
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
    const { isAdmin } = await checkAdminAccess(req);
    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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

    await setDoc(scheduleRef, {
      employeeId,
      weekStartDate,
      schedule,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }, { merge: true });

    return NextResponse.json({
      success: true,
      message: "Schedule saved successfully",
      scheduleId,
    });
  } catch (error: any) {
    console.error("Error saving schedule:", error);
    return NextResponse.json(
      { error: error.message || "Failed to save schedule" },
      { status: 500 }
    );
  }
}
