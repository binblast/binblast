// app/api/admin/partners/[id]/pause/route.ts
// Pause a partner (no new job assignments)

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

    if (partnerData.status === "paused") {
      return NextResponse.json(
        { error: "Partner is already paused" },
        { status: 400 }
      );
    }

    if (partnerData.status === "removed") {
      return NextResponse.json(
        { error: "Cannot pause a removed partner" },
        { status: 400 }
      );
    }

    // Update partner status
    await updateDoc(partnerRef, {
      status: "paused",
      pausedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    // Log audit event
    await logPartnerAuditEvent(
      "partner_pause",
      "partner",
      partnerId,
      {
        before: { status: partnerData.status },
        after: { status: "paused" },
      }
    );

    return NextResponse.json({
      success: true,
      message: "Partner paused successfully",
    });
  } catch (error: any) {
    console.error("[Pause Partner] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to pause partner" },
      { status: 500 }
    );
  }
}
