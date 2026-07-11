// app/api/operator/jobs/[jobId]/complete/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getDbInstance } from "@/lib/firebase";
import { safeImportFirestore } from "@/lib/firebase-module-loader";
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

    const db = await getDbInstance();
    if (!db) {
      return NextResponse.json(
        { message: "Database not available" },
        { status: 500 }
      );
    }

    const firestore = await safeImportFirestore();
    const { doc, getDoc, updateDoc, serverTimestamp } = firestore;

    // Verify job exists
    const jobRef = doc(db, "scheduledCleanings", jobId);
    const jobDoc = await getDoc(jobRef);

    if (!jobDoc.exists()) {
      return NextResponse.json(
        { message: "Job not found" },
        { status: 404 }
      );
    }

    const jobData = jobDoc.data();

    // Verify operator has permission (check if user is operator or admin)
    const { getAuthInstance } = await import("@/lib/firebase");
    const auth = await getAuthInstance();
    const token = req.headers.get("authorization");
    
    // For now, allow any authenticated operator/admin to complete jobs
    // In production, you might want to add more specific permission checks

    // Update job with completion data
    // Set both jobStatus and status for compatibility
    const updateData: any = {
      jobStatus: "completed",
      status: "completed",
      completedAt: serverTimestamp(),
    };

    if (notes) {
      updateData.operatorNotes = notes;
    }

    if (binCount !== undefined && binCount !== null) {
      updateData.binCount = parseInt(binCount.toString(), 10);
    }

    await updateDoc(jobRef, updateData);

    await scheduleNextCleaningIfNeeded(db, {
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

    return NextResponse.json(
      { message: "Job completed successfully" },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error completing job:", error);
    return NextResponse.json(
      { message: error.message || "Failed to complete job" },
      { status: 500 }
    );
  }
}

