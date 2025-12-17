// app/api/admin/partners/[id]/remove/route.ts
// Soft delete/remove a partner

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
    const body = await req.json();
    const { reason } = body;

    if (!reason || !reason.trim()) {
      return NextResponse.json(
        { error: "Removal reason is required" },
        { status: 400 }
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
    const { doc, getDoc, updateDoc, collection, query, where, getDocs, serverTimestamp } = firestore;

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

    if (partnerData.status === "removed") {
      return NextResponse.json(
        { error: "Partner is already removed" },
        { status: 400 }
      );
    }

    // Check unpaid balance
    const payoutsQuery = query(
      collection(db, "partnerPayouts"),
      where("partnerId", "==", partnerId),
      where("status", "==", "pending")
    );
    const payoutsSnapshot = await getDocs(payoutsQuery);
    let unpaidBalance = 0;
    payoutsSnapshot.forEach(doc => {
      unpaidBalance += doc.data().amount || 0;
    });

    // Update partner status (soft delete)
    await updateDoc(partnerRef, {
      status: "removed",
      removedAt: serverTimestamp(),
      removedBy: "admin", // TODO: Get actual admin user ID
      removalReason: reason,
      updatedAt: serverTimestamp(),
    });

    // Log audit event
    await logPartnerAuditEvent(
      "partner_remove",
      "partner",
      partnerId,
      {
        before: { status: partnerData.status },
        after: { status: "removed", removalReason: reason },
        metadata: { unpaidBalance },
      }
    );

    return NextResponse.json({
      success: true,
      message: "Partner removed successfully",
      unpaidBalance,
    });
  } catch (error: any) {
    console.error("[Remove Partner] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to remove partner" },
      { status: 500 }
    );
  }
}
