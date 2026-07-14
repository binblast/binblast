// app/api/partners/registration-prefill/route.ts

import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function splitOwnerName(ownerName: string) {
  const parts = ownerName.trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] || "",
    lastName: parts.slice(1).join(" ") || "",
  };
}

export async function GET(req: NextRequest) {
  try {
    const email = req.nextUrl.searchParams.get("email")?.trim().toLowerCase();
    const partnerId = req.nextUrl.searchParams.get("partnerId")?.trim();

    if (!email && !partnerId) {
      return NextResponse.json(
        { error: "Email or partner ID is required" },
        { status: 400 }
      );
    }

    const { getDbInstance } = await import("@/lib/firebase");
    const { safeImportFirestore } = await import("@/lib/firebase-module-loader");
    const firestore = await safeImportFirestore();
    const { collection, doc, getDoc, query, where, getDocs, limit } = firestore;

    const db = await getDbInstance();
    if (!db) {
      return NextResponse.json({ error: "Database unavailable" }, { status: 500 });
    }

    let partnerDoc: { id: string; data: () => Record<string, unknown> } | null = null;
    let applicationData: Record<string, unknown> | null = null;

    if (partnerId) {
      const partnerRef = doc(db, "partners", partnerId);
      const partnerSnapshot = await getDoc(partnerRef);
      if (partnerSnapshot.exists()) {
        partnerDoc = { id: partnerSnapshot.id, data: () => partnerSnapshot.data() };
      }
    }

    if (!partnerDoc && email) {
      const partnersQuery = query(
        collection(db, "partners"),
        where("email", "==", email),
        limit(1)
      );
      const partnersSnapshot = await getDocs(partnersQuery);
      if (!partnersSnapshot.empty) {
        partnerDoc = {
          id: partnersSnapshot.docs[0].id,
          data: () => partnersSnapshot.docs[0].data(),
        };
      }
    }

    if (!partnerDoc) {
      return NextResponse.json(
        { error: "No approved partner account found for this email" },
        { status: 404 }
      );
    }

    const partnerData = partnerDoc.data();
    const partnerEmail = String(partnerData.email || "").toLowerCase();

    if (email && partnerEmail && partnerEmail !== email) {
      return NextResponse.json({ error: "Partner record does not match email" }, { status: 404 });
    }

    if (partnerData.userId) {
      return NextResponse.json(
        { error: "Partner account already created. Please log in instead.", alreadyRegistered: true },
        { status: 409 }
      );
    }

    if (partnerData.status === "removed") {
      return NextResponse.json({ error: "This partner account is no longer active" }, { status: 403 });
    }

    const applicationsQuery = query(
      collection(db, "partnerApplications"),
      where("linkedPartnerId", "==", partnerDoc.id),
      limit(1)
    );
    const applicationsSnapshot = await getDocs(applicationsQuery);
    if (!applicationsSnapshot.empty) {
      applicationData = applicationsSnapshot.docs[0].data();
      if (applicationData.status !== "approved") {
        return NextResponse.json(
          { error: "Partner application is not approved yet" },
          { status: 403 }
        );
      }
    }

    const ownerName = String(partnerData.ownerName || applicationData?.ownerName || "");
    const { firstName, lastName } = splitOwnerName(ownerName);

    return NextResponse.json({
      success: true,
      partnerId: partnerDoc.id,
      firstName,
      lastName,
      ownerName,
      email: partnerEmail || email,
      phone: String(partnerData.phone || applicationData?.phone || ""),
      businessName: String(partnerData.businessName || applicationData?.businessName || ""),
      referralCode: String(partnerData.referralCode || partnerData.partnerCode || ""),
    });
  } catch (error: unknown) {
    console.error("[Partner Registration Prefill] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load partner details" },
      { status: 500 }
    );
  }
}
