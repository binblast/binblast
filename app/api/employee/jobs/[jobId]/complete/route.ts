// app/api/employee/jobs/[jobId]/complete/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getDbInstance } from "@/lib/firebase";
import { safeImportFirestore } from "@/lib/firebase-module-loader";
import { getJobPhotos } from "@/lib/job-photo-upload";

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

    // ENFORCE MANDATORY PHOTO REQUIREMENTS (NON-NEGOTIABLE)
    // Both inside and outside photos are REQUIRED for every job completion
    if (!insidePhotoUrl || !outsidePhotoUrl) {
      return NextResponse.json(
        { 
          message: "Both inside and outside photos are required to complete this job. Please upload both photos before marking the job as complete.",
          requiredPhotos: ["inside", "outside"],
          missingPhotos: [
            !insidePhotoUrl ? "inside" : null,
            !outsidePhotoUrl ? "outside" : null,
          ].filter(Boolean),
        },
        { status: 400 }
      );
    }

    // Verify photos exist in jobPhotos collection
    try {
      const jobPhotos = await getJobPhotos(jobId);
      const hasInsidePhoto = jobPhotos.some(p => p.photoType === "inside");
      const hasOutsidePhoto = jobPhotos.some(p => p.photoType === "outside");

      if (!hasInsidePhoto || !hasOutsidePhoto) {
        return NextResponse.json(
          { 
            message: "Required photos not found in photo documentation. Please ensure photos are uploaded before completing the job.",
            missingInDatabase: {
              inside: !hasInsidePhoto,
              outside: !hasOutsidePhoto,
            },
          },
          { status: 400 }
        );
      }
    } catch (photoError: any) {
      console.error("Error verifying photos in jobPhotos collection:", photoError);
      // Continue with completion if verification fails (photos may be in process of uploading)
      // But still require the URLs to be provided
    }

    // Update job with completion data
    // Set both jobStatus and status for compatibility with customer dashboard
    const updateData: any = {
      jobStatus: "completed",
      status: "completed",
      completedAt: serverTimestamp(),
      hasRequiredPhotos: true,
      photoDocumentationStatus: "complete",
    };

    // Store photo URLs for backward compatibility
    if (completionPhotoUrl) {
      updateData.completionPhotoUrl = completionPhotoUrl;
    }

    if (insidePhotoUrl) {
      updateData.insidePhotoUrl = insidePhotoUrl;
    }

    if (outsidePhotoUrl) {
      updateData.outsidePhotoUrl = outsidePhotoUrl;
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

