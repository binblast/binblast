// app/api/employee/jobs/[jobId]/start/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getAdminFirestore } from "@/lib/firebase-admin";

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

    const db = await getAdminFirestore();
    const admin = await import("firebase-admin");
    const jobRef = db.collection("scheduledCleanings").doc(jobId);
    const jobDoc = await jobRef.get();

    if (!jobDoc.exists) {
      return NextResponse.json(
        { message: "Job not found" },
        { status: 404 }
      );
    }

    const jobData = jobDoc.data() || {};
    if (jobData.assignedEmployeeId !== employeeId) {
      return NextResponse.json(
        { message: "Job not assigned to this employee" },
        { status: 403 }
      );
    }

    await jobRef.update({
      jobStatus: "in_progress",
      startedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return NextResponse.json(
      { message: "Job started successfully" },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("Error starting job:", error);
    const message = error instanceof Error ? error.message : "Failed to start job";
    return NextResponse.json({ message }, { status: 500 });
  }
}
