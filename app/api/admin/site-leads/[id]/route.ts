import { NextRequest, NextResponse } from "next/server";
import { checkAdminAccess } from "@/lib/admin-auth";
import { getAdminFirestore } from "@/lib/firebase-admin";

export const dynamic = "force-dynamic";

const ALLOWED_STATUSES = new Set([
  "new",
  "contacted",
  "quoted",
  "converted",
  "lost",
  "archived",
  "spam",
]);

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { isAdmin } = await checkAdminAccess(req);
    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const leadId = params.id?.trim();
    if (!leadId) {
      return NextResponse.json({ error: "Lead ID is required" }, { status: 400 });
    }

    const body = await req.json();
    const updates: Record<string, unknown> = {};
    const admin = await import("firebase-admin");

    if (typeof body.status === "string") {
      const status = body.status.trim().toLowerCase();
      if (!ALLOWED_STATUSES.has(status)) {
        return NextResponse.json({ error: "Invalid status" }, { status: 400 });
      }
      updates.status = status;
    }

    if (typeof body.notes === "string") {
      updates.notes = body.notes.trim();
    }

    if (typeof body.assignedPartnerId === "string") {
      updates.assignedPartnerId = body.assignedPartnerId.trim() || null;
    }

    if (typeof body.assignedPartnerName === "string") {
      updates.assignedPartnerName = body.assignedPartnerName.trim() || null;
    }

    if (typeof body.assignmentSource === "string") {
      updates.assignmentSource = body.assignmentSource.trim() || "admin";
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    const db = await getAdminFirestore();
    const leadRef = db.collection("siteLeads").doc(leadId);
    const leadDoc = await leadRef.get();

    if (!leadDoc.exists) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    updates.updatedAt = admin.firestore.FieldValue.serverTimestamp();
    await leadRef.update(updates);

    return NextResponse.json({ success: true, id: leadId, ...updates });
  } catch (error: unknown) {
    console.error("[Admin Site Leads PATCH] Error:", error);
    const message = error instanceof Error ? error.message : "Failed to update site lead";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { isAdmin } = await checkAdminAccess(req);
    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const leadId = params.id?.trim();
    if (!leadId) {
      return NextResponse.json({ error: "Lead ID is required" }, { status: 400 });
    }

    const db = await getAdminFirestore();
    const leadRef = db.collection("siteLeads").doc(leadId);
    const leadDoc = await leadRef.get();

    if (!leadDoc.exists) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    await leadRef.delete();

    return NextResponse.json({ success: true, id: leadId });
  } catch (error: unknown) {
    console.error("[Admin Site Leads DELETE] Error:", error);
    const message = error instanceof Error ? error.message : "Failed to delete site lead";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
