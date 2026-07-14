// app/api/admin/partners/[id]/service-areas/route.ts
// Update service areas for a partner

import { NextRequest, NextResponse } from "next/server";
import { checkAdminAccess } from "@/lib/admin-auth";
import { getAdminFirestore } from "@/lib/firebase-admin";
import { logPartnerAuditEvent } from "@/lib/partner-audit-log";

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { isAdmin } = await checkAdminAccess(req);
    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const partnerId = params.id;
    const body = await req.json();
    const { serviceAreas } = body;

    if (!serviceAreas || !Array.isArray(serviceAreas)) {
      return NextResponse.json(
        { error: "Service areas must be an array" },
        { status: 400 }
      );
    }

    const db = await getAdminFirestore();
    const partnerRef = db.collection("partners").doc(partnerId);
    const partnerDoc = await partnerRef.get();

    if (!partnerDoc.exists) {
      return NextResponse.json(
        { error: "Partner not found" },
        { status: 404 }
      );
    }

    const partnerData = partnerDoc.data() || {};

    await partnerRef.update({
      serviceAreas,
      updatedAt: new Date(),
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
