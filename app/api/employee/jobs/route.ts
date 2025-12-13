// app/api/employee/jobs/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getDbInstance } from "@/lib/firebase";
import { safeImportFirestore } from "@/lib/firebase-module-loader";
import { getTodayDateString } from "@/lib/employee-utils";

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const employeeId = searchParams.get("employeeId");

    if (!employeeId) {
      return NextResponse.json(
        { message: "Missing employeeId" },
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
    const { collection, query, where, getDocs, orderBy } = firestore;

    const today = getTodayDateString();
    const cleaningsRef = collection(db, "scheduledCleanings");
    
    // Get jobs assigned to this employee for today
    const jobsQuery = query(
      cleaningsRef,
      where("assignedEmployeeId", "==", employeeId),
      where("scheduledDate", "==", today),
      orderBy("addressLine1", "asc") // Order by address for route planning
    );

    const snapshot = await getDocs(jobsQuery);
    const jobs = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json({ jobs }, { status: 200 });
  } catch (error: any) {
    console.error("Error getting jobs:", error);
    return NextResponse.json(
      { message: error.message || "Failed to get jobs" },
      { status: 500 }
    );
  }
}

