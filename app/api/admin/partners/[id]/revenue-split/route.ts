// app/api/admin/partners/[id]/revenue-split/route.ts
// Adjust revenue split for a partner

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
    const { revenueSharePartner, revenueSharePlatform, reason } = body;

    if (!revenueSharePartner || !revenueSharePlatform) {
      return NextResponse.json(
        { error: "Both partner and platform shares are required" },
        { status: 400 }
      );
    }

    if (Math.abs(revenueSharePartner + revenueSharePlatform - 1) > 0.01) {
      return NextResponse.json(
        { error: "Revenue shares must total 100%" },
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

    // Update revenue split
    await updateDoc(partnerRef, {
      revenueSharePartner,
      revenueSharePlatform,
      updatedAt: serverTimestamp(),
    });

    // Log audit event
    await logPartnerAuditEvent(
      "partner_revenue_split_adjust",
      "partner",
      partnerId,
      {
        before: {
          revenueSharePartner: partnerData.revenueSharePartner,
          revenueSharePlatform: partnerData.revenueSharePlatform,
        },
        after: {
          revenueSharePartner,
          revenueSharePlatform,
        },
        metadata: { reason: reason || "No reason provided" },
      }
    );

    return NextResponse.json({
      success: true,
      message: "Revenue split updated successfully",
    });
  } catch (error: any) {
    console.error("[Adjust Revenue Split] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to adjust revenue split" },
      { status: 500 }
    );
  }
}
