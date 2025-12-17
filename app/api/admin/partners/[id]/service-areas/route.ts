// app/api/admin/partners/[id]/service-areas/route.ts
// Update service areas for a partner

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
    const { serviceAreas } = body;

    if (!serviceAreas || !Array.isArray(serviceAreas)) {
      return NextResponse.json(
        { error: "Service areas must be an array" },
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

    // Update service areas
    await updateDoc(partnerRef, {
      serviceAreas,
      updatedAt: serverTimestamp(),
    });

    // Log audit event
    await logPartnerAuditEvent(
      "partner_service_areas_update",
      "partner",
      partnerId,
      {
        before: { serviceAreas: partnerData.serviceAreas || [] },
        after: { serviceAreas },
      }
    );

    return NextResponse.json({
      success: true,
      message: "Service areas updated successfully",
    });
  } catch (error: any) {
    console.error("[Update Service Areas] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update service areas" },
      { status: 500 }
    );
  }
}
