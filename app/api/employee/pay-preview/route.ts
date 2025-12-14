// app/api/employee/pay-preview/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getDbInstance } from "@/lib/firebase";
import { safeImportFirestore } from "@/lib/firebase-module-loader";
import { getTodayDateString, getEmployeeData } from "@/lib/employee-utils";

export const dynamic = 'force-dynamic';

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
    const { collection, query, where, getDocs } = firestore;

    // Get employee data to find pay rate
    const employee = await getEmployeeData(employeeId);
    if (!employee) {
      return NextResponse.json(
        { message: "Employee not found" },
        { status: 404 }
      );
    }

    const payRatePerJob = employee.payRatePerJob || 0;

    // Count completed jobs today
    const today = getTodayDateString();
    const cleaningsRef = collection(db, "scheduledCleanings");
    const completedJobsQuery = query(
      cleaningsRef,
      where("assignedEmployeeId", "==", employeeId),
      where("scheduledDate", "==", today),
      where("jobStatus", "==", "completed")
    );

    const completedSnapshot = await getDocs(completedJobsQuery);
    const completedJobsCount = completedSnapshot.size;

    // Calculate estimated pay
    const estimatedPay = completedJobsCount * payRatePerJob;

    return NextResponse.json(
      {
        completedJobs: completedJobsCount,
        payRatePerJob,
        estimatedPay,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error getting pay preview:", error);
    return NextResponse.json(
      { message: error.message || "Failed to get pay preview" },
      { status: 500 }
    );
  }
}

