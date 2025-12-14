// app/api/employee/jobs/[jobId]/complete/route.ts
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
    const { employeeId, completionPhotoUrl, insidePhotoUrl, outsidePhotoUrl, employeeNotes, binCount, stickerStatus, stickerPlaced } = body;

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

    // Update job with completion data
    // Set both jobStatus and status for compatibility with customer dashboard
    const updateData: any = {
      jobStatus: "completed",
      status: "completed",
      completedAt: serverTimestamp(),
    };

    if (completionPhotoUrl) {
      updateData.completionPhotoUrl = completionPhotoUrl;
    }

    if (insidePhotoUrl) {
      updateData.insidePhotoUrl = insidePhotoUrl;
    }

    if (outsidePhotoUrl) {
      updateData.outsidePhotoUrl = outsidePhotoUrl;
    }

    // Check photo documentation training completion
    try {
      const { getModuleProgress } = await import("@/lib/training-certification");
      const photoTraining = await getModuleProgress(employeeId, "photo-documentation");
      
      if (photoTraining.completed && photoTraining.certificationStatus === "completed") {
        // Require 2 photos if photo documentation training is completed
        if (!insidePhotoUrl || !outsidePhotoUrl) {
          return NextResponse.json(
            { message: "Photo Documentation training requires exactly 2 photos: inside and outside of bin" },
            { status: 400 }
          );
        }
        updateData.photoDocumentationCompliant = true;
      }
    } catch (error) {
      console.error("Error checking photo documentation training:", error);
      // Don't fail the completion if check fails
    }

    if (employeeNotes) {
      updateData.employeeNotes = employeeNotes;
    }

    if (binCount !== undefined && binCount !== null) {
      updateData.binCount = parseInt(binCount.toString(), 10);
    }

    if (stickerStatus) {
      updateData.stickerStatus = stickerStatus;
    }

    if (stickerPlaced !== undefined) {
      updateData.stickerPlaced = stickerPlaced;
    }

    await updateDoc(jobRef, updateData);

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

