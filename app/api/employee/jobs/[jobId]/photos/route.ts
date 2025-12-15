// app/api/employee/jobs/[jobId]/photos/route.ts
// API endpoint for retrieving and managing job photos

import { NextRequest, NextResponse } from "next/server";
import { getDbInstance } from "@/lib/firebase";
import { getJobPhotos, deleteJobPhoto } from "@/lib/job-photo-upload";
import { safeImportFirestore } from "@/lib/firebase-module-loader";

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    const { jobId } = params;

    if (!jobId) {
      return NextResponse.json(
        { error: "Missing jobId" },
        { status: 400 }
      );
    }

    const photos = await getJobPhotos(jobId);

    // Convert Date objects to ISO strings for JSON serialization
    const serializedPhotos = photos.map(photo => ({
      ...photo,
      timestamp: photo.timestamp.toISOString(),
    }));

    return NextResponse.json({
      success: true,
      photos: serializedPhotos,
    });
  } catch (error: any) {
    console.error("[Job Photos API] Error getting photos:", error);
    return NextResponse.json(
      { error: error.message || "Failed to get job photos" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    const { jobId } = params;
    const body = await req.json();
    const { photoId } = body;

    if (!photoId) {
      return NextResponse.json(
        { error: "Missing photoId" },
        { status: 400 }
      );
    }

    // Verify photo belongs to this job
    const photos = await getJobPhotos(jobId);
    const photo = photos.find(p => p.id === photoId);

    if (!photo) {
      return NextResponse.json(
        { error: "Photo not found or does not belong to this job" },
        { status: 404 }
      );
    }

    // Check if user has permission to delete (operator/admin only)
    // For now, allow deletion - security rules will enforce permissions
    const result = await deleteJobPhoto(photoId);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to delete photo" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Photo deleted successfully",
    });
  } catch (error: any) {
    console.error("[Job Photos API] Error deleting photo:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete photo" },
      { status: 500 }
    );
  }
}
