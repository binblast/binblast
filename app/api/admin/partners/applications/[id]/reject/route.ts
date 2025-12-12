// app/api/admin/partners/applications/[id]/reject/route.ts

import { NextRequest, NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const applicationId = params.id;
    const body = await req.json();
    const { reason } = body; // Optional rejection reason

    if (!applicationId) {
      return NextResponse.json(
        { error: "Application ID is required" },
        { status: 400 }
      );
    }

    const { getDbInstance } = await import("@/lib/firebase");
    const { safeImportFirestore } = await import("@/lib/firebase-module-loader");
    const firestore = await safeImportFirestore();
    const { doc, getDoc, updateDoc, serverTimestamp } = firestore;

    const db = await getDbInstance();
    if (!db) {
      return NextResponse.json(
        { error: "Firebase is not configured" },
        { status: 500 }
      );
    }

    // Get the application
    const applicationRef = doc(db, "partnerApplications", applicationId);
    const applicationDoc = await getDoc(applicationRef);

    if (!applicationDoc.exists()) {
      return NextResponse.json(
        { error: "Application not found" },
        { status: 404 }
      );
    }

    const applicationData = applicationDoc.data();

    if (applicationData.status === "rejected") {
      return NextResponse.json(
        { error: "Application already rejected" },
        { status: 400 }
      );
    }

    // Update application status
    await updateDoc(applicationRef, {
      status: "rejected",
      rejectionReason: reason || null,
      updatedAt: serverTimestamp(),
    });

    // TODO: Send rejection email to applicant
    console.log("[Admin] Partner application rejected:", {
      applicationId,
      email: applicationData.email,
      reason,
    });

    return NextResponse.json({
      success: true,
      message: "Application rejected",
    });
  } catch (err: any) {
    console.error("Error rejecting partner application:", err);
    return NextResponse.json(
      { error: err.message || "Failed to reject application" },
      { status: 500 }
    );
  }
}
