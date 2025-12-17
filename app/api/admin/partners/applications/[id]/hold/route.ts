// app/api/admin/partners/applications/[id]/hold/route.ts
// Mark application as "Hold/Needs Review"

import { NextRequest, NextResponse } from "next/server";
import { getDbInstance } from "@/lib/firebase";
import { safeImportFirestore } from "@/lib/firebase-module-loader";
import { logPartnerAuditEvent } from "@/lib/partner-audit-log";

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const applicationId = params.id;
    const body = await req.json();
    const { notes } = body;

    const db = await getDbInstance();
    if (!db) {
      return NextResponse.json(
        { error: "Database not available" },
        { status: 500 }
      );
    }

    const firestore = await safeImportFirestore();
    const { doc, getDoc, updateDoc, serverTimestamp } = firestore;

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

    // Update application status
    await updateDoc(applicationRef, {
      status: "hold",
      holdNotes: notes || null,
      updatedAt: serverTimestamp(),
    });

    // Log audit event
    await logPartnerAuditEvent(
      "application_hold",
      "partnerApplication",
      applicationId,
      {
        before: { status: applicationData.status },
        after: { status: "hold", holdNotes: notes },
        metadata: { notes },
      }
    );

    return NextResponse.json({
      success: true,
      message: "Application marked as 'Hold/Needs Review'",
    });
  } catch (error: any) {
    console.error("[Hold Application] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to hold application" },
      { status: 500 }
    );
  }
}
