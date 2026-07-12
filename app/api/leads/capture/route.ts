import { NextRequest, NextResponse } from "next/server";
import { validateSiteLeadCapture } from "@/lib/site-leads";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const payload = {
      name: typeof body.name === "string" ? body.name.trim() : "",
      email: typeof body.email === "string" ? body.email.trim().toLowerCase() : "",
      phone: typeof body.phone === "string" ? body.phone.trim() : "",
      referredBy: typeof body.referredBy === "string" ? body.referredBy.trim() : "",
      heardAboutUs: typeof body.heardAboutUs === "string" ? body.heardAboutUs.trim() : "",
      referralCode: typeof body.referralCode === "string" ? body.referralCode.trim() : "",
      partnerCode: typeof body.partnerCode === "string" ? body.partnerCode.trim() : "",
      utmSource: typeof body.utmSource === "string" ? body.utmSource.trim() : "",
      utmMedium: typeof body.utmMedium === "string" ? body.utmMedium.trim() : "",
      utmCampaign: typeof body.utmCampaign === "string" ? body.utmCampaign.trim() : "",
      landingPage: typeof body.landingPage === "string" ? body.landingPage.trim() : "",
      pageReferrer: typeof body.pageReferrer === "string" ? body.pageReferrer.trim() : "",
    };

    const validationError = validateSiteLeadCapture(payload);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const { getDbInstance } = await import("@/lib/firebase");
    const { safeImportFirestore } = await import("@/lib/firebase-module-loader");
    const db = await getDbInstance();
    if (!db) {
      return NextResponse.json({ error: "Database not available" }, { status: 500 });
    }

    const firestore = await safeImportFirestore();
    const { collection, addDoc, serverTimestamp } = firestore;

    const leadDoc = await addDoc(collection(db, "siteLeads"), {
      name: payload.name,
      email: payload.email,
      phone: payload.phone,
      referredBy: payload.referredBy,
      heardAboutUs: payload.heardAboutUs,
      referralCode: payload.referralCode || null,
      partnerCode: payload.partnerCode || null,
      utmSource: payload.utmSource || null,
      utmMedium: payload.utmMedium || null,
      utmCampaign: payload.utmCampaign || null,
      landingPage: payload.landingPage || null,
      pageReferrer: payload.pageReferrer || null,
      source: "site_lead_capture_modal",
      status: "new",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return NextResponse.json({ success: true, leadId: leadDoc.id });
  } catch (error: unknown) {
    console.error("[Site Lead Capture] Error:", error);
    const message = error instanceof Error ? error.message : "Failed to save lead";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
