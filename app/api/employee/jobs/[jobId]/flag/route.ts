// app/api/employee/jobs/[jobId]/flag/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getDbInstance } from "@/lib/firebase";
import { safeImportFirestore } from "@/lib/firebase-module-loader";

const VALID_FLAGS = [
  "missed_bin",
  "excessive_dirt",
  "access_issue",
  "safety_issue",
];

export async function POST(
  req: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    const { jobId } = params;
    const body = await req.json();
    const { employeeId, flag } = body;

    if (!jobId || !employeeId || !flag) {
      return NextResponse.json(
        { message: "Missing jobId, employeeId, or flag" },
        { status: 400 }
      );
    }

    if (!VALID_FLAGS.includes(flag)) {
      return NextResponse.json(
        { message: `Invalid flag. Must be one of: ${VALID_FLAGS.join(", ")}` },
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
    const { doc, getDoc, updateDoc, arrayUnion } = firestore;

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

    // Add flag to job's flags array (if not already present)
    const currentFlags = jobData.flags || [];
    if (!currentFlags.includes(flag)) {
      await updateDoc(jobRef, {
        flags: arrayUnion(flag),
      });
    }

    // Note: In a production system, you might want to notify operator/admin here
    // This could be done via Firestore triggers, email, or push notifications

    return NextResponse.json(
      { message: "Flag added successfully" },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error flagging job:", error);
    return NextResponse.json(
      { message: error.message || "Failed to flag job" },
      { status: 500 }
    );
  }
}

