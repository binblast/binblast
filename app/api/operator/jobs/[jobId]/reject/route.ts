// app/api/operator/jobs/[jobId]/reject/route.ts
// API endpoint for operators to reject jobs due to photo/documentation issues

import { NextRequest, NextResponse } from "next/server";
import { getDbInstance } from "@/lib/firebase";
import { safeImportFirestore } from "@/lib/firebase-module-loader";
import { checkAdminAccess } from "@/lib/admin-auth";

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    const { jobId } = params;
    const body = await req.json();
    const { rejectionReason, operatorId } = body;

    if (!rejectionReason || !rejectionReason.trim()) {
      return NextResponse.json(
        { error: "Rejection reason is required" },
        { status: 400 }
      );
    }

    // Verify operator/admin access
    const authCheck = await checkAdminAccess(req);
    if (!authCheck.isAdmin) {
      return NextResponse.json(
        { error: "Unauthorized - operator/admin access required" },
        { status: 403 }
      );
    }

    const db = await getDbInstance();
    if (!db) {
      return NextResponse.json(
        { error: "Database not available" },
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
        { error: "Job not found" },
        { status: 404 }
      );
    }

    const jobData = jobDoc.data();

    // Update job with rejection status
    await updateDoc(jobRef, {
      photoDocumentationStatus: "rejected",
      rejectedAt: serverTimestamp(),
      rejectionReason: rejectionReason.trim(),
      jobStatus: "rejected",
      status: "rejected", // For compatibility
      rejectedBy: operatorId || authCheck.userId,
    });

    return NextResponse.json({
      success: true,
      message: "Job rejected successfully",
    });
  } catch (error: any) {
    console.error("[Job Rejection API] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to reject job" },
      { status: 500 }
    );
  }
}
