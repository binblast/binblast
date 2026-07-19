import { NextRequest, NextResponse } from "next/server";
import { checkAdminAccess } from "@/lib/admin-auth";
import { getAdminFirestore } from "@/lib/firebase-admin";

export const dynamic = "force-dynamic";

const ALLOWED_STATUSES = new Set(["pending", "assigned", "converted", "rejected", "paid"]);

function serializeReferral(data: Record<string, unknown>, id: string) {
  const serializeTimestamp = (value: unknown): string | null => {
    if (!value) return null;
    if (typeof value === "string") return value;
    if (value instanceof Date) return value.toISOString();
    if (typeof value === "object" && value !== null && "toDate" in value) {
      const maybeDate = (value as { toDate?: () => Date }).toDate?.();
      if (maybeDate instanceof Date) return maybeDate.toISOString();
    }
    return null;
  };

  return {
    id,
    referringPartnerId: String(data.referringPartnerId || ""),
    referringPartnerName: String(data.referringPartnerName || ""),
    customerName: String(data.customerName || ""),
    email: String(data.email || ""),
    phone: String(data.phone || ""),
    serviceAddress: String(data.serviceAddress || ""),
    serviceCity: String(data.serviceCity || ""),
    serviceZipCode: String(data.serviceZipCode || ""),
    propertyType: String(data.propertyType || ""),
    notes: String(data.notes || ""),
    status: String(data.status || "pending"),
    assignedPartnerId: String(data.assignedPartnerId || ""),
    referralFeePercent: Number(data.referralFeePercent || 0),
    createdAt: serializeTimestamp(data.createdAt),
    updatedAt: serializeTimestamp(data.updatedAt),
  };
}

export async function GET(req: NextRequest) {
  try {
    const { isAdmin } = await checkAdminAccess(req);
    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = await getAdminFirestore();
    const snapshot = await db.collection("partnerReferrals").get();
    const referrals = snapshot.docs
      .map((doc) => serializeReferral(doc.data(), doc.id))
      .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));

    return NextResponse.json({
      success: true,
      referrals,
      stats: {
        total: referrals.length,
        pending: referrals.filter((item) => item.status === "pending").length,
      },
    });
  } catch (error: unknown) {
    console.error("[Admin Partner Referrals GET] Error:", error);
    const message = error instanceof Error ? error.message : "Failed to load partner referrals";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { isAdmin } = await checkAdminAccess(req);
    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const referralId = String(body.referralId || "").trim();
    if (!referralId) {
      return NextResponse.json({ error: "Referral ID is required" }, { status: 400 });
    }

    const db = await getAdminFirestore();
    const admin = await import("firebase-admin");
    const referralRef = db.collection("partnerReferrals").doc(referralId);
    const referralDoc = await referralRef.get();

    if (!referralDoc.exists) {
      return NextResponse.json({ error: "Referral not found" }, { status: 404 });
    }

    const updates: Record<string, unknown> = {
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    if (typeof body.status === "string") {
      const status = body.status.trim().toLowerCase();
      if (!ALLOWED_STATUSES.has(status)) {
        return NextResponse.json({ error: "Invalid status" }, { status: 400 });
      }
      updates.status = status;
    }

    if (typeof body.assignedPartnerId === "string") {
      updates.assignedPartnerId = body.assignedPartnerId.trim() || null;
    }

    if (typeof body.notes === "string") {
      updates.adminNotes = body.notes.trim();
    }

    if (Object.keys(updates).length === 1) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    await referralRef.update(updates);

    return NextResponse.json({ success: true, id: referralId, ...updates });
  } catch (error: unknown) {
    console.error("[Admin Partner Referrals PATCH] Error:", error);
    const message = error instanceof Error ? error.message : "Failed to update partner referral";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
