import { NextRequest, NextResponse } from "next/server";
import { validateSiteLeadCapture } from "@/lib/site-leads";
import { getAdminFirestore } from "@/lib/firebase-admin";
import { resolveLeadAssignment } from "@/lib/partner-leads";

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
      serviceCity: typeof body.serviceCity === "string" ? body.serviceCity.trim() : "",
      serviceZipCode: typeof body.serviceZipCode === "string" ? body.serviceZipCode.trim() : "",
    };

    const validationError = validateSiteLeadCapture(payload);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const db = await getAdminFirestore();
    const admin = await import("firebase-admin");

    const partnersSnapshot = await db.collection("partners").where("status", "==", "active").get();
    const partners = partnersSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...(doc.data() as Record<string, unknown>),
    }));

    const assignment = resolveLeadAssignment(partners, {
      partnerCode: payload.partnerCode,
      city: payload.serviceCity,
      zipCode: payload.serviceZipCode,
    });

    const leadRef = await db.collection("siteLeads").add({
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
      serviceCity: payload.serviceCity || null,
      serviceZipCode: payload.serviceZipCode || null,
      source: "site_lead_capture_modal",
      status: "new",
      assignedPartnerId: assignment.assignedPartnerId,
      assignedPartnerName: assignment.assignedPartnerName,
      assignmentSource: assignment.assignmentSource,
      convertedBookingId: null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      leadId: leadRef.id,
      assignedPartnerId: assignment.assignedPartnerId,
    });
  } catch (error: unknown) {
    console.error("[Site Lead Capture] Error:", error);
    const message = error instanceof Error ? error.message : "Failed to save lead";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
