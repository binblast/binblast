// app/api/employee/jobs/[jobId]/complete/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getAdminFirestore } from "@/lib/firebase-admin";
import { getJobPhotos } from "@/lib/job-photo-upload";
import { scheduleNextCleaningIfNeeded } from "@/lib/cleaning-schedule";

export async function POST(
  req: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    const { jobId } = params;
    const body = await req.json();
    const {
      employeeId,
      completionPhotoUrl,
      insidePhotoUrl,
      outsidePhotoUrl,
      employeeNotes,
      stickerStatus,
      stickerPlaced,
    } = body;

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

    if (!insidePhotoUrl || !outsidePhotoUrl) {
      return NextResponse.json(
        {
          message:
            "Both inside and outside photos are required to complete this job. Please upload both photos before marking the job as complete.",
          requiredPhotos: ["inside", "outside"],
          missingPhotos: [
            !insidePhotoUrl ? "inside" : null,
            !outsidePhotoUrl ? "outside" : null,
          ].filter(Boolean),
        },
        { status: 400 }
      );
    }

    try {
      const jobPhotos = await getJobPhotos(jobId);
      const hasInsidePhoto = jobPhotos.some((p) => p.photoType === "inside");
      const hasOutsidePhoto = jobPhotos.some((p) => p.photoType === "outside");

      if (!hasInsidePhoto || !hasOutsidePhoto) {
        return NextResponse.json(
          {
            message:
              "Required photos not found in photo documentation. Please ensure photos are uploaded before completing the job.",
            missingInDatabase: {
              inside: !hasInsidePhoto,
              outside: !hasOutsidePhoto,
            },
          },
          { status: 400 }
        );
      }
    } catch (photoError: unknown) {
      console.error("Error verifying photos in jobPhotos collection:", photoError);
    }

    const updateData: Record<string, unknown> = {
      jobStatus: "completed",
      status: "completed",
      completedAt: admin.firestore.FieldValue.serverTimestamp(),
      hasRequiredPhotos: true,
      photoDocumentationStatus: "complete",
      insidePhotoUrl,
      outsidePhotoUrl,
      binCount: jobData.binCount ?? jobData.binsCount ?? 1,
    };

    if (completionPhotoUrl) {
      updateData.completionPhotoUrl = completionPhotoUrl;
    }

    if (employeeNotes) {
      updateData.employeeNotes = employeeNotes;
    }

    if (stickerStatus) {
      updateData.stickerStatus = stickerStatus;
    }

    if (stickerPlaced !== undefined) {
      updateData.stickerPlaced = stickerPlaced;
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
        assignedEmployeeId: jobData.assignedEmployeeId,
        assignedEmployeeName: jobData.assignedEmployeeName,
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
