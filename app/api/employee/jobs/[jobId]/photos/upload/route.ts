// app/api/employee/jobs/[jobId]/photos/upload/route.ts
// API endpoint for uploading job photos to Firebase Storage

import { NextRequest, NextResponse } from "next/server";
import { getDbInstance } from "@/lib/firebase";
import { uploadJobPhoto, GPSCoordinates } from "@/lib/job-photo-upload";
import { safeImportFirestore } from "@/lib/firebase-module-loader";

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    const { jobId } = params;
    const formData = await req.formData();

    const file = formData.get("file") as File;
    const photoType = formData.get("photoType") as string;
    const employeeId = formData.get("employeeId") as string;
    const latitude = formData.get("latitude") as string | null;
    const longitude = formData.get("longitude") as string | null;

    if (!file || !photoType || !employeeId) {
      return NextResponse.json(
        { error: "Missing required fields: file, photoType, employeeId" },
        { status: 400 }
      );
    }

    // Validate photo type
    const validPhotoTypes = ["inside", "outside", "dumpster_pad", "sticker_placement"];
    if (!validPhotoTypes.includes(photoType)) {
      return NextResponse.json(
        { error: `Invalid photoType. Must be one of: ${validPhotoTypes.join(", ")}` },
        { status: 400 }
      );
    }

    // Get job data to extract customer info and address
    const db = await getDbInstance();
    if (!db) {
      return NextResponse.json(
        { error: "Database not available" },
        { status: 500 }
      );
    }

    const firestore = await safeImportFirestore();
    const { doc, getDoc } = firestore;

    const jobRef = doc(db, "scheduledCleanings", jobId);
    const jobDoc = await getDoc(jobRef);

    if (!jobDoc.exists()) {
      return NextResponse.json(
        { error: "Job not found" },
        { status: 404 }
      );
    }

    const jobData = jobDoc.data();

    // Verify job is assigned to this employee
    if (jobData.assignedEmployeeId !== employeeId) {
      return NextResponse.json(
        { error: "Job not assigned to this employee" },
        { status: 403 }
      );
    }

    // Parse GPS coordinates if provided
    let gpsCoordinates: GPSCoordinates | undefined;
    if (latitude && longitude) {
      const lat = parseFloat(latitude);
      const lng = parseFloat(longitude);
      if (!isNaN(lat) && !isNaN(lng)) {
        gpsCoordinates = { latitude: lat, longitude: lng };
      }
    }

    // Upload photo
    const result = await uploadJobPhoto(
      jobId,
      photoType as "inside" | "outside" | "dumpster_pad" | "sticker_placement",
      file,
      employeeId,
      {
        customerId: jobData.userId || jobData.customerId,
        userId: jobData.userId || jobData.customerId,
        addressLine1: jobData.addressLine1,
        addressLine2: jobData.addressLine2,
        city: jobData.city,
        state: jobData.state,
        zipCode: jobData.zipCode,
      },
      gpsCoordinates
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to upload photo" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      photoId: result.photoId,
      storageUrl: result.storageUrl,
    });
  } catch (error: any) {
    console.error("[Photo Upload API] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to upload photo" },
      { status: 500 }
    );
  }
}
