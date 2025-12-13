// app/api/operator/employees/[employeeId]/stops/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getDbInstance } from "@/lib/firebase";
import { safeImportFirestore } from "@/lib/firebase-module-loader";
import { getTodayDateString } from "@/lib/employee-utils";

function getDateString(date: Date): string {
  return date.toISOString().split('T')[0];
}

function getNext7Days(): string[] {
  const today = new Date();
  const dates: string[] = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    dates.push(getDateString(date));
  }
  return dates;
}

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
    const { collection, query, where, getDocs, orderBy } = firestore;

    const today = getTodayDateString();
    const next7Days = getNext7Days();

    const cleaningsRef = collection(db, "scheduledCleanings");

    // Get today's stops
    const todayStopsQuery = query(
      cleaningsRef,
      where("assignedEmployeeId", "==", employeeId),
      where("scheduledDate", "==", today),
      orderBy("scheduledTime", "asc")
    );

    const todaySnapshot = await getDocs(todayStopsQuery);
    const todayStops = todaySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Get next 7 days stops
    const upcomingStopsQuery = query(
      cleaningsRef,
      where("assignedEmployeeId", "==", employeeId),
      where("scheduledDate", ">=", next7Days[1]),
      where("scheduledDate", "<=", next7Days[6]),
      orderBy("scheduledDate", "asc"),
      orderBy("scheduledTime", "asc")
    );

    const upcomingSnapshot = await getDocs(upcomingStopsQuery);
    const upcomingStops = upcomingSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json({
      todayStops,
      upcomingStops,
    });
  } catch (error: any) {
    console.error("Error getting stops:", error);
    return NextResponse.json(
      { error: error.message || "Failed to get stops" },
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
    const { cleaningId, priority, recurring } = body;

    if (!employeeId || !cleaningId) {
      return NextResponse.json(
        { error: "Missing required fields: employeeId, cleaningId" },
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

    // Get employee name
    const employeeRef = doc(db, "users", employeeId);
    const employeeSnap = await getDoc(employeeRef);
    if (!employeeSnap.exists()) {
      return NextResponse.json(
        { error: "Employee not found" },
        { status: 404 }
      );
    }
    const employeeData = employeeSnap.data();
    const employeeName = `${employeeData.firstName || ""} ${employeeData.lastName || ""}`.trim();

    // Get cleaning document
    const cleaningRef = doc(db, "scheduledCleanings", cleaningId);
    const cleaningSnap = await getDoc(cleaningRef);

    if (!cleaningSnap.exists()) {
      return NextResponse.json(
        { error: "Cleaning not found" },
        { status: 404 }
      );
    }

    const cleaningData = cleaningSnap.data();

    // Validate assignment (check counties, drive time, etc.)
    // This is a basic validation - can be enhanced
    if (cleaningData.assignedEmployeeId && cleaningData.assignedEmployeeId !== employeeId) {
      return NextResponse.json(
        { error: "Cleaning is already assigned to another employee" },
        { status: 400 }
      );
    }

    // Update cleaning assignment
    await updateDoc(cleaningRef, {
      assignedEmployeeId: employeeId,
      assignedEmployeeName: employeeName,
      jobStatus: "pending",
      priority: priority || "normal",
      updatedAt: serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      message: "Stop assigned successfully",
    });
  } catch (error: any) {
    console.error("Error assigning stop:", error);
    return NextResponse.json(
      { error: error.message || "Failed to assign stop" },
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
    const { cleaningId, priority, reassignToEmployeeId } = body;

    if (!employeeId || !cleaningId) {
      return NextResponse.json(
        { error: "Missing required fields: employeeId, cleaningId" },
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

    const cleaningRef = doc(db, "scheduledCleanings", cleaningId);
    const cleaningSnap = await getDoc(cleaningRef);

    if (!cleaningSnap.exists()) {
      return NextResponse.json(
        { error: "Cleaning not found" },
        { status: 404 }
      );
    }

    const updateData: any = {
      updatedAt: serverTimestamp(),
    };

    if (priority) {
      updateData.priority = priority;
    }

    if (reassignToEmployeeId) {
      // Get new employee name
      const newEmployeeRef = doc(db, "users", reassignToEmployeeId);
      const newEmployeeSnap = await getDoc(newEmployeeRef);
      if (newEmployeeSnap.exists()) {
        const newEmployeeData = newEmployeeSnap.data();
        const newEmployeeName = `${newEmployeeData.firstName || ""} ${newEmployeeData.lastName || ""}`.trim();
        updateData.assignedEmployeeId = reassignToEmployeeId;
        updateData.assignedEmployeeName = newEmployeeName;
      }
    }

    await updateDoc(cleaningRef, updateData);

    return NextResponse.json({
      success: true,
      message: "Stop updated successfully",
    });
  } catch (error: any) {
    console.error("Error updating stop:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update stop" },
      { status: 500 }
    );
  }
}

