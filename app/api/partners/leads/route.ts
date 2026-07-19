import { NextRequest, NextResponse } from "next/server";
import { checkPartnerAccess } from "@/lib/partner-api-auth";
import {
  PARTNER_UPDATABLE_LEAD_STATUSES,
  type SiteLeadStatus,
} from "@/lib/partner-types";
import { serializeLeadForPartner } from "@/lib/partner-leads";
import { getAdminFirestore } from "@/lib/firebase-admin";

export const dynamic = "force-dynamic";

interface FirestoreDocument {
  id: string;
  data: () => Record<string, unknown>;
}

export async function GET(req: NextRequest) {
  try {
    const auth = await checkPartnerAccess(req);
    if (!auth.isPartner || !auth.partner?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = await getAdminFirestore();
    const snapshot = await db
      .collection("siteLeads")
      .where("assignedPartnerId", "==", auth.partner.id)
      .get();

    const leads = (snapshot.docs as FirestoreDocument[])
      .map((doc) => serializeLeadForPartner(doc.data(), doc.id))
      .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));

    return NextResponse.json({
      success: true,
      leads,
      stats: {
        total: leads.length,
        new: leads.filter((lead) => lead.status === "new").length,
        contacted: leads.filter((lead) => lead.status === "contacted").length,
        quoted: leads.filter((lead) => lead.status === "quoted").length,
        converted: leads.filter((lead) => lead.status === "converted").length,
      },
    });
  } catch (error: unknown) {
    console.error("[Partner Leads GET] Error:", error);
    const message = error instanceof Error ? error.message : "Failed to load leads";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await checkPartnerAccess(req);
    if (!auth.isPartner || !auth.partner?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const leadId = String(body.leadId || "").trim();
    const status = String(body.status || "").trim().toLowerCase() as SiteLeadStatus;

    if (!leadId) {
      return NextResponse.json({ error: "Lead ID is required" }, { status: 400 });
    }

    if (!PARTNER_UPDATABLE_LEAD_STATUSES.has(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const db = await getAdminFirestore();
    const leadRef = db.collection("siteLeads").doc(leadId);
    const leadDoc = await leadRef.get();

    if (!leadDoc.exists) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    const leadData = leadDoc.data() || {};
    if (leadData.assignedPartnerId !== auth.partner.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const admin = await import("firebase-admin");
    const updates: Record<string, unknown> = {
      status,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      lastUpdatedByPartnerId: auth.partner.id,
    };

    if (typeof body.notes === "string") {
      updates.notes = body.notes.trim();
    }

    await leadRef.update(updates);

    return NextResponse.json({ success: true, id: leadId, status });
  } catch (error: unknown) {
    console.error("[Partner Leads PATCH] Error:", error);
    const message = error instanceof Error ? error.message : "Failed to update lead";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
