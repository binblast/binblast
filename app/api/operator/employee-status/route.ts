// app/api/operator/employee-status/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getAllEmployees, getTodayDateString, getEmployeeClockInStatus } from "@/lib/employee-utils";
import { getDbInstance } from "@/lib/firebase";
import { safeImportFirestore } from "@/lib/firebase-module-loader";

export async function GET(req: NextRequest) {
  try {
    const employees = await getAllEmployees();
    const today = getTodayDateString();

    const db = await getDbInstance();
    if (!db) {
      return NextResponse.json(
        { message: "Database not available" },
        { status: 500 }
      );
    }

    const firestore = await safeImportFirestore();
    const { collection, query, where, getDocs } = firestore;

    const employeeStatuses = await Promise.all(
      employees.map(async (employee) => {
        // Get clock-in status
        const clockInStatus = await getEmployeeClockInStatus(employee.id);

        // Count assigned jobs
        const cleaningsRef = collection(db, "scheduledCleanings");
        const assignedJobsQuery = query(
          cleaningsRef,
          where("assignedEmployeeId", "==", employee.id),
          where("scheduledDate", "==", today)
        );
        const assignedSnapshot = await getDocs(assignedJobsQuery);
        const assignedJobs = assignedSnapshot.size;

        // Count completed jobs
        const completedJobsQuery = query(
          cleaningsRef,
          where("assignedEmployeeId", "==", employee.id),
          where("scheduledDate", "==", today),
          where("jobStatus", "==", "completed")
        );
        const completedSnapshot = await getDocs(completedJobsQuery);
        const completedJobs = completedSnapshot.size;

        const remainingJobs = assignedJobs - completedJobs;

        return {
          id: employee.id,
          name: `${employee.firstName} ${employee.lastName}`,
          email: employee.email,
          serviceArea: employee.serviceArea || [],
          clockInStatus: clockInStatus
            ? {
                isActive: clockInStatus.isActive,
                clockInTime: clockInStatus.clockInTime,
                clockOutTime: clockInStatus.clockOutTime,
              }
            : null,
          jobsAssigned: assignedJobs,
          jobsCompleted: completedJobs,
          jobsRemaining: remainingJobs,
        };
      })
    );

    return NextResponse.json({ employees: employeeStatuses }, { status: 200 });
  } catch (error: any) {
    console.error("Error getting employee status:", error);
    return NextResponse.json(
      { message: error.message || "Failed to get employee status" },
      { status: 500 }
    );
  }
}

