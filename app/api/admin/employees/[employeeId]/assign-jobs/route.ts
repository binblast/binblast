// app/api/admin/employees/[employeeId]/assign-jobs/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getDbInstance } from "@/lib/firebase";
import { safeImportFirestore } from "@/lib/firebase-module-loader";
import { getEmployeeData } from "@/lib/employee-utils";
import { checkAdminAccess, logAdminAction } from "@/lib/admin-auth";

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: { employeeId: string } }
) {
  try {
    const { isAdmin, userId } = await checkAdminAccess(req);
    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const employeeId = params.employeeId;
    const body = await req.json();
    const { jobIds, date } = body;

    if (!employeeId || !jobIds || !Array.isArray(jobIds) || jobIds.length === 0) {
      return NextResponse.json(
        { error: "Missing required fields: employeeId, jobIds (array)" },
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

    // Get employee data
    const employee = await getEmployeeData(employeeId);
    if (!employee) {
      return NextResponse.json(
        { error: "Employee not found" },
        { status: 404 }
      );
    }

    const employeeName = `${employee.firstName} ${employee.lastName}`;

    const firestore = await safeImportFirestore();
    const { doc, getDoc, updateDoc, serverTimestamp } = firestore;

    const assignments = [];
    const errors = [];

    for (const jobId of jobIds) {
      try {
        const cleaningDoc = await getDoc(doc(db, "scheduledCleanings", jobId));
        
        if (!cleaningDoc.exists()) {
          errors.push(`Cleaning ${jobId} not found`);
          continue;
        }

        const cleaningData = cleaningDoc.data();
        
        // Check if cleaning is already assigned to someone else
        if (cleaningData.assignedEmployeeId && cleaningData.assignedEmployeeId !== employeeId) {
          errors.push(`Cleaning ${jobId} is already assigned to another employee`);
          continue;
        }

        // Check if date matches (if provided)
        if (date && cleaningData.scheduledDate !== date) {
          errors.push(`Cleaning ${jobId} date doesn't match selected date`);
          continue;
        }

        // Assign cleaning
        await updateDoc(doc(db, "scheduledCleanings", jobId), {
          assignedEmployeeId: employeeId,
          assignedEmployeeName: employeeName,
          jobStatus: "pending",
          updatedAt: serverTimestamp(),
        });

        assignments.push(jobId);
      } catch (error: any) {
        errors.push(`Failed to assign cleaning ${jobId}: ${error.message}`);
      }
    }

    // Audit logging for job assignments
    if (assignments.length > 0) {
      await logAdminAction("assign_jobs", userId || "admin", {
        employeeId,
        jobCount: assignments.length,
        date,
        jobIds: assignments,
      });
    }

    return NextResponse.json({
      success: true,
      message: `Assigned ${assignments.length} job(s) successfully`,
      assigned: assignments.length,
      assignedJobIds: assignments,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error: any) {
    console.error("Error assigning jobs:", error);
    return NextResponse.json(
      { error: error.message || "Failed to assign jobs" },
      { status: 500 }
    );
  }
}
