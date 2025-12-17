// app/api/admin/partners/[id]/photo-compliance/route.ts
// Calculate photo compliance for a partner

import { NextRequest, NextResponse } from "next/server";
import { getDbInstance } from "@/lib/firebase";
import { safeImportFirestore } from "@/lib/firebase-module-loader";

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const partnerId = params.id;
    const searchParams = req.nextUrl.searchParams;
    const days = parseInt(searchParams.get("days") || "30");

    const db = await getDbInstance();
    if (!db) {
      return NextResponse.json(
        { error: "Database not available" },
        { status: 500 }
      );
    }

    const firestore = await safeImportFirestore();
    const { collection, query, getDocs, where } = firestore;

    // Get jobs for this partner within the date range
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    const jobsQuery = query(
      collection(db, "scheduledCleanings"),
      where("partnerId", "==", partnerId)
    );
    const jobsSnapshot = await getDocs(jobsQuery);

    let totalJobs = 0;
    let jobsWithPhotos = 0;
    const jobDetails: any[] = [];

    for (const jobDoc of jobsSnapshot.docs) {
      const job = jobDoc.data();
      const jobDate = job.scheduledDate?.toDate?.() || job.createdAt?.toDate?.() || job.createdAt;
      
      // Only count jobs within the date range
      if (jobDate && new Date(jobDate) >= cutoffDate) {
        totalJobs++;
        
        // Check if job has required photos
        const photosQuery = query(
          collection(db, "jobPhotos"),
          where("jobId", "==", jobDoc.id)
        );
        const photosSnapshot = await getDocs(photosQuery);
        
        const photos = photosSnapshot.docs.map(doc => doc.data());
        const hasInsidePhoto = photos.some((p: any) => p.photoType === "inside");
        const hasOutsidePhoto = photos.some((p: any) => p.photoType === "outside");
        const hasBothPhotos = hasInsidePhoto && hasOutsidePhoto;
        
        if (hasBothPhotos) {
          jobsWithPhotos++;
        }
        
        jobDetails.push({
          jobId: jobDoc.id,
          customerName: job.customerName || job.customerEmail || "N/A",
          address: job.addressLine1 || "N/A",
          scheduledDate: jobDate,
          status: job.status || job.jobStatus || "pending",
          hasInsidePhoto,
          hasOutsidePhoto,
          hasBothPhotos,
          insidePhotoUrl: photos.find((p: any) => p.photoType === "inside")?.storageUrl,
          outsidePhotoUrl: photos.find((p: any) => p.photoType === "outside")?.storageUrl,
        });
      }
    }

    const compliancePercentage = totalJobs > 0 ? Math.round((jobsWithPhotos / totalJobs) * 100) : 100;

    return NextResponse.json({
      success: true,
      compliancePercentage,
      totalJobs,
      jobsWithPhotos,
      jobsWithoutPhotos: totalJobs - jobsWithPhotos,
      days,
      jobDetails,
    });
  } catch (error: any) {
    console.error("[Photo Compliance] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to calculate photo compliance" },
      { status: 500 }
    );
  }
}
