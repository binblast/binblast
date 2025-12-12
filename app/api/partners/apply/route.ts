// app/api/partners/apply/route.ts

import { NextRequest, NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, businessName, ownerName, email, phone, serviceAreas, businessType } = body;

    if (!userId || !businessName || !ownerName || !email || !phone || !serviceAreas || !businessType) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 }
      );
    }

    // Dynamically import Firebase
    const { getDbInstance } = await import("@/lib/firebase");
    const { safeImportFirestore } = await import("@/lib/firebase-module-loader");
    const firestore = await safeImportFirestore();
    const { collection, doc, setDoc, getDoc, query, where, getDocs, serverTimestamp } = firestore;

    const db = await getDbInstance();
    if (!db) {
      return NextResponse.json(
        { error: "Firebase is not configured" },
        { status: 500 }
      );
    }

    // Generate unique partner code and slug helper functions
    const generatePartnerCode = (): string => {
      const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Exclude confusing chars
      let code = "";
      for (let i = 0; i < 8; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return code;
    };

    const generatePartnerSlug = (businessName: string): string => {
      return businessName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .substring(0, 50) || `partner-${Date.now()}`;
    };

    // Check if user already has a partner application
    const partnersQuery = query(
      collection(db, "partners"),
      where("userId", "==", userId)
    );
    const existingPartners = await getDocs(partnersQuery);

    let partnerId: string;
    let partnerCode: string;
    let partnerSlug: string;

    if (!existingPartners.empty) {
      // Update existing partner application
      const existingPartner = existingPartners.docs[0];
      partnerId = existingPartner.id;
      const existingData = existingPartner.data();
      partnerCode = existingData.partnerCode || generatePartnerCode();
      partnerSlug = existingData.partnerSlug || generatePartnerSlug(businessName);
    } else {
      // Create new partner application
      partnerCode = generatePartnerCode();
      partnerSlug = generatePartnerSlug(businessName);
      partnerId = doc(collection(db, "partners")).id;
    }

    // Ensure partner code is unique
    let isCodeUnique = false;
    let attempts = 0;
    while (!isCodeUnique && attempts < 10) {
      const codeCheckQuery = query(
        collection(db, "partners"),
        where("partnerCode", "==", partnerCode)
      );
      const codeCheck = await getDocs(codeCheckQuery);
      
      if (codeCheck.empty) {
        isCodeUnique = true;
      } else {
        partnerCode = generatePartnerCode();
        attempts++;
      }
    }

    if (!isCodeUnique) {
      return NextResponse.json(
        { error: "Failed to generate unique partner code. Please try again." },
        { status: 500 }
      );
    }

    // Create or update partner document
    const partnerRef = doc(db, "partners", partnerId);
    const partnerData = {
      userId,
      businessName,
      ownerName,
      email,
      phone,
      serviceAreas: Array.isArray(serviceAreas) ? serviceAreas : serviceAreas.split(",").map((s: string) => s.trim()).filter((s: string) => s),
      businessType,
      partnerStatus: existingPartners.empty ? "pending" : existingPartners.docs[0].data().partnerStatus, // Keep existing status if updating
      revenueSharePartner: 0.6, // Default 60% to partner
      revenueSharePlatform: 0.4, // Default 40% to platform
      partnerCode,
      partnerSlug,
      createdAt: existingPartners.empty ? serverTimestamp() : existingPartners.docs[0].data().createdAt,
      updatedAt: serverTimestamp(),
    };

    await setDoc(partnerRef, partnerData, { merge: true });

    return NextResponse.json({
      success: true,
      partnerId,
      partnerCode,
      partnerSlug,
      message: "Application submitted successfully",
    });
  } catch (err: any) {
    console.error("Partner application error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to submit application" },
      { status: 500 }
    );
  }
}
