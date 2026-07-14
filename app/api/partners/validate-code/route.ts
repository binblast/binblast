import { NextRequest, NextResponse } from "next/server";
import { getAdminFirestore } from "@/lib/firebase-admin";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rawCode = typeof body.partnerCode === "string" ? body.partnerCode : "";
    const normalizedCode = rawCode.trim().toUpperCase();

    if (!normalizedCode) {
      return NextResponse.json({
        valid: false,
        error: "Partner code is required",
      });
    }

    const db = await getAdminFirestore();

    const byReferralCode = await db
      .collection("partners")
      .where("referralCode", "==", normalizedCode)
      .where("status", "==", "active")
      .limit(1)
      .get();

    let partnerDoc = byReferralCode.empty ? null : byReferralCode.docs[0];

    if (!partnerDoc) {
      const byPartnerCode = await db
        .collection("partners")
        .where("partnerCode", "==", normalizedCode)
        .where("status", "==", "active")
        .limit(1)
        .get();

      partnerDoc = byPartnerCode.empty ? null : byPartnerCode.docs[0];
    }

    if (!partnerDoc) {
      return NextResponse.json({
        valid: false,
        error: "Invalid partner code",
      });
    }

    const partnerData = partnerDoc.data();
    const matchedCode =
      partnerData.referralCode || partnerData.partnerCode || normalizedCode;

    return NextResponse.json({
      valid: true,
      matchedCode: String(matchedCode).toUpperCase(),
      businessName: partnerData.businessName || "Partner",
      partnerId: partnerDoc.id,
      message: `Partner code applied! Your booking supports ${partnerData.businessName || "this partner"}.`,
    });
  } catch (err: unknown) {
    console.error("[Validate Partner Code] Error:", err);
    const message = err instanceof Error ? err.message : "Failed to validate partner code";
    return NextResponse.json({ valid: false, error: message }, { status: 500 });
  }
}
