// app/api/employee/jobs/[jobId]/start/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getDbInstance } from "@/lib/firebase";
import { safeImportFirestore } from "@/lib/firebase-module-loader";

export async function POST(
  req: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    const { jobId } = params;
    const body = await req.json();
    const { employeeId } = body;

    if (!jobId || !employeeId) {
      return NextResponse.json(
        { message: "Missing jobId or employeeId" },
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
    const { doc, getDoc, updateDoc, serverTimestamp } = firestore;

    // Verify job exists and is assigned to this employee
    const jobRef = doc(db, "scheduledCleanings", jobId);
    const jobDoc = await getDoc(jobRef);

    if (!jobDoc.exists()) {
      return NextResponse.json(
        { message: "Job not found" },
        { status: 404 }
      );
    }

    const jobData = jobDoc.data();
    if (jobData.assignedEmployeeId !== employeeId) {
      return NextResponse.json(
        { message: "Job not assigned to this employee" },
        { status: 403 }
      );
    }

    // Update job status to in_progress
    await updateDoc(jobRef, {
      jobStatus: "in_progress",
      startedAt: serverTimestamp(),
    });

    return NextResponse.json(
      { message: "Job started successfully" },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error starting job:", error);
    return NextResponse.json(
      { message: error.message || "Failed to start job" },
      { status: 500 }
    );
  }
}

