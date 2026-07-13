// app/api/operator/jobs/[jobId]/complete/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getAdminFirestore } from "@/lib/firebase-admin";
import { scheduleNextCleaningIfNeeded } from "@/lib/cleaning-schedule";

export async function POST(
  req: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    const { jobId } = params;
    const body = await req.json();
    const { operatorId, notes, binCount } = body;

    if (!jobId || !operatorId) {
      return NextResponse.json(
        { message: "Missing jobId or operatorId" },
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

    const updateData: Record<string, unknown> = {
      jobStatus: "completed",
      status: "completed",
      completedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    if (notes) {
      updateData.operatorNotes = notes;
    }

    if (binCount !== undefined && binCount !== null) {
      updateData.binCount = parseInt(binCount.toString(), 10);
    }

    await jobRef.update(updateData);

    try {
      await scheduleNextCleaningIfNeeded({
        id: jobId,
        userId: jobData.userId,
        userEmail: jobData.userEmail,
        addressLine1: jobData.addressLine1,
        addressLine2: jobData.addressLine2,
        city: jobData.city,
        state: jobData.state,
        zipCode: jobData.zipCode,
        trashDay: jobData.trashDay,
        scheduledTime: jobData.scheduledTime,
        notes: jobData.notes,
        scheduledDate: jobData.scheduledDate,
        status: "completed",
        jobStatus: "completed",
      });
    } catch (scheduleError: unknown) {
      console.error("Error scheduling next cleaning after completion:", scheduleError);
    }

    return NextResponse.json(
      { message: "Job completed successfully" },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("Error completing job:", error);
    const message = error instanceof Error ? error.message : "Failed to complete job";
    return NextResponse.json({ message }, { status: 500 });
  }
}

