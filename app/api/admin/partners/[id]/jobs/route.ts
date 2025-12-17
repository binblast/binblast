// app/api/admin/partners/[id]/jobs/route.ts
// Get jobs for a partner

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
    const status = searchParams.get("status");
    const county = searchParams.get("county");

    const db = await getDbInstance();
    if (!db) {
      return NextResponse.json(
        { error: "Database not available" },
        { status: 500 }
      );
    }

    const firestore = await safeImportFirestore();
    const { collection, query, getDocs, where, orderBy } = firestore;

    // Query jobs for this partner
    let jobsQuery = query(
      collection(db, "scheduledCleanings"),
      where("partnerId", "==", partnerId),
      orderBy("scheduledDate", "desc")
    );

    // Apply filters if provided
    if (status) {
      jobsQuery = query(
        collection(db, "scheduledCleanings"),
        where("partnerId", "==", partnerId),
        where("status", "==", status),
        orderBy("scheduledDate", "desc")
      );
    }

    const jobsSnapshot = await getDocs(jobsQuery);
    
    // Get jobs with photo information
    const jobs = await Promise.all(
      jobsSnapshot.docs.map(async (doc) => {
        const job = doc.data();
        
        // Get photos for this job
        const photosQuery = query(
          collection(db, "jobPhotos"),
          where("jobId", "==", doc.id)
        );
        const photosSnapshot = await getDocs(photosQuery);
        const photos = photosSnapshot.docs.map(photoDoc => photoDoc.data());
        
        const hasInsidePhoto = photos.some((p: any) => p.photoType === "inside");
        const hasOutsidePhoto = photos.some((p: any) => p.photoType === "outside");
        const insidePhotoUrl = photos.find((p: any) => p.photoType === "inside")?.storageUrl;
        const outsidePhotoUrl = photos.find((p: any) => p.photoType === "outside")?.storageUrl;
        
        return {
          id: doc.id,
          jobId: doc.id,
          ...job,
          hasInsidePhoto,
          hasOutsidePhoto,
          hasBothPhotos: hasInsidePhoto && hasOutsidePhoto,
          insidePhotoUrl,
          outsidePhotoUrl,
        };
      })
    );

    // Filter by county if provided (client-side filter since Firestore doesn't support multiple where clauses easily)
    let filteredJobs = jobs;
    if (county) {
      filteredJobs = jobs.filter((job: any) => job.county === county);
    }

    return NextResponse.json({
      success: true,
      jobs: filteredJobs,
    });
  } catch (error: any) {
    console.error("[Get Partner Jobs] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch jobs" },
      { status: 500 }
    );
  }
}
