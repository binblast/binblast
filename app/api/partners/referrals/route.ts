import { NextRequest, NextResponse } from "next/server";
import { checkPartnerAccess } from "@/lib/partner-api-auth";
import { getPartnerTierDefinition } from "@/lib/partner-types";
import { getAdminFirestore } from "@/lib/firebase-admin";

export const dynamic = "force-dynamic";

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
    customerName: String(data.customerName || ""),
    email: String(data.email || ""),
    phone: String(data.phone || ""),
    serviceAddress: String(data.serviceAddress || ""),
    serviceCity: String(data.serviceCity || ""),
    serviceZipCode: String(data.serviceZipCode || ""),
    propertyType: String(data.propertyType || ""),
    notes: String(data.notes || ""),
    status: String(data.status || "pending"),
    referralFeePercent: Number(data.referralFeePercent || 0),
    createdAt: serializeTimestamp(data.createdAt),
    updatedAt: serializeTimestamp(data.updatedAt),
  };
}

export async function GET(req: NextRequest) {
  try {
    const auth = await checkPartnerAccess(req);
    if (!auth.isPartner || !auth.partner?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = await getAdminFirestore();
    const snapshot = await db
      .collection("partnerReferrals")
      .where("referringPartnerId", "==", auth.partner.id)
      .get();

    const referrals = snapshot.docs
      .map((doc) => serializeReferral(doc.data(), doc.id))
      .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));

    return NextResponse.json({ success: true, referrals });
  } catch (error: unknown) {
    console.error("[Partner Referrals GET] Error:", error);
    const message = error instanceof Error ? error.message : "Failed to load referrals";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await checkPartnerAccess(req);
    if (!auth.isPartner || !auth.partner?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const customerName = String(body.customerName || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const phone = String(body.phone || "").trim();
    const serviceAddress = String(body.serviceAddress || "").trim();
    const serviceCity = String(body.serviceCity || "").trim();
    const serviceZipCode = String(body.serviceZipCode || "").trim();
    const propertyType = String(body.propertyType || "").trim();
    const notes = String(body.notes || "").trim();

    if (!customerName) {
      return NextResponse.json({ error: "Customer name is required" }, { status: 400 });
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
    }
    if (!phone) {
      return NextResponse.json({ error: "Phone is required" }, { status: 400 });
    }
    if (!serviceAddress && !serviceCity) {
      return NextResponse.json(
        { error: "Service address or city is required" },
        { status: 400 }
      );
    }

    const tierDef = getPartnerTierDefinition(auth.partner.partnerTier as string | undefined);
    const db = await getAdminFirestore();
    const admin = await import("firebase-admin");

    const referralRef = await db.collection("partnerReferrals").add({
      referringPartnerId: auth.partner.id,
      referringPartnerName: auth.partner.businessName || "Partner",
      referringPartnerEmail: auth.email || null,
      customerName,
      email,
      phone,
      serviceAddress,
      serviceCity,
      serviceZipCode,
      propertyType: propertyType || "residential",
      notes,
      status: "pending",
      referralFeePercent: tierDef.referralFeePercent,
      assignedPartnerId: null,
      convertedBookingId: null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      referralId: referralRef.id,
      message: "Referral submitted. Our team will review and route it to the right market.",
    });
  } catch (error: unknown) {
    console.error("[Partner Referrals POST] Error:", error);
    const message = error instanceof Error ? error.message : "Failed to submit referral";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
