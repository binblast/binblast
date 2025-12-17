// app/api/admin/partners/[id]/resume/route.ts
// Resume a paused partner

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
    const partnerId = params.id;

    const db = await getDbInstance();
    if (!db) {
      return NextResponse.json(
        { error: "Database not available" },
        { status: 500 }
      );
    }

    const firestore = await safeImportFirestore();
    const { doc, getDoc, updateDoc, serverTimestamp } = firestore;

    // Get the partner
    const partnerRef = doc(db, "partners", partnerId);
    const partnerDoc = await getDoc(partnerRef);

    if (!partnerDoc.exists()) {
      return NextResponse.json(
        { error: "Partner not found" },
        { status: 404 }
      );
    }

    const partnerData = partnerDoc.data();

    if (partnerData.status !== "paused") {
      return NextResponse.json(
        { error: "Partner is not paused" },
        { status: 400 }
      );
    }

    // Update partner status
    await updateDoc(partnerRef, {
      status: "active",
      resumedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    // Log audit event
    await logPartnerAuditEvent(
      "partner_resume",
      "partner",
      partnerId,
      {
        before: { status: partnerData.status },
        after: { status: "active" },
      }
    );

    return NextResponse.json({
      success: true,
      message: "Partner resumed successfully",
    });
  } catch (error: any) {
    console.error("[Resume Partner] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to resume partner" },
      { status: 500 }
    );
  }
}
