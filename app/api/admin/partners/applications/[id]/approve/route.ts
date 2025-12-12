// app/api/admin/partners/applications/[id]/approve/route.ts

import { NextRequest, NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

const PARTNER_REVENUE_SHARE = 0.6; // 60% to partner
const PLATFORM_REVENUE_SHARE = 0.4; // 40% to platform

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const applicationId = params.id;

    if (!applicationId) {
      return NextResponse.json(
        { error: "Application ID is required" },
        { status: 400 }
      );
    }

    const { getDbInstance } = await import("@/lib/firebase");
    const { safeImportFirestore } = await import("@/lib/firebase-module-loader");
    const firestore = await safeImportFirestore();
    const { collection, doc, getDoc, setDoc, updateDoc, query, where, getDocs, serverTimestamp } = firestore;

    const db = await getDbInstance();
    if (!db) {
      return NextResponse.json(
        { error: "Firebase is not configured" },
        { status: 500 }
      );
    }

    // Get the application
    const applicationRef = doc(db, "partnerApplications", applicationId);
    const applicationDoc = await getDoc(applicationRef);

    if (!applicationDoc.exists()) {
      return NextResponse.json(
        { error: "Application not found" },
        { status: 404 }
      );
    }

    const applicationData = applicationDoc.data();

    if (applicationData.status === "approved") {
      return NextResponse.json(
        { error: "Application already approved" },
        { status: 400 }
      );
    }

    // Generate unique referral code
    const generateReferralCode = (businessName: string, ownerName: string): string => {
      // Create code from business name initials + owner name initials + random
      const businessInitials = businessName
        .split(" ")
        .map(word => word[0])
        .join("")
        .toUpperCase()
        .substring(0, 3);
      
      const ownerInitials = ownerName
        .split(" ")
        .map(word => word[0])
        .join("")
        .toUpperCase()
        .substring(0, 2);
      
      const randomNum = Math.floor(Math.random() * 100);
      return `${businessInitials}${ownerInitials}${randomNum}`.substring(0, 10);
    };

    let referralCode = generateReferralCode(applicationData.businessName, applicationData.ownerName);
    let isCodeUnique = false;
    let attempts = 0;

    // Ensure code is unique
    while (!isCodeUnique && attempts < 10) {
      const codeCheckQuery = query(
        collection(db, "partners"),
        where("referralCode", "==", referralCode)
      );
      const codeCheck = await getDocs(codeCheckQuery);
      
      if (codeCheck.empty) {
        isCodeUnique = true;
      } else {
        referralCode = generateReferralCode(applicationData.businessName, applicationData.ownerName);
        attempts++;
      }
    }

    if (!isCodeUnique) {
      return NextResponse.json(
        { error: "Failed to generate unique referral code. Please try again." },
        { status: 500 }
      );
    }

    // Create Partner record
    const partnerRef = doc(collection(db, "partners"));
    const partnerData = {
      userId: applicationData.userId,
      businessName: applicationData.businessName,
      ownerName: applicationData.ownerName,
      email: applicationData.email,
      phone: applicationData.phone,
      serviceType: applicationData.serviceType,
      serviceArea: applicationData.serviceArea,
      status: "pending_agreement", // Will become "active" after agreement acceptance
      referralCode,
      bookingLinkSlug: referralCode.toLowerCase(),
      stripeConnected: false,
      revenueSharePartner: PARTNER_REVENUE_SHARE,
      revenueSharePlatform: PLATFORM_REVENUE_SHARE,
      agreementAcceptedAt: null,
      agreementVersion: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    await setDoc(partnerRef, partnerData);

    // Update application status
    await updateDoc(applicationRef, {
      status: "approved",
      linkedPartnerId: partnerRef.id,
      updatedAt: serverTimestamp(),
    });

    // Update user role to "partner" if user exists
    try {
      const userRef = doc(db, "users", applicationData.userId);
      const userDoc = await getDoc(userRef);
      if (userDoc.exists()) {
        await updateDoc(userRef, {
          role: "partner",
          updatedAt: serverTimestamp(),
        });
      }
    } catch (userUpdateError) {
      console.warn("[Admin] Could not update user role:", userUpdateError);
      // Don't fail the approval if user update fails
    }

    // TODO: Send email to partner with agreement link
    const agreementLink = `${req.headers.get("origin") || "http://localhost:3000"}/partners/agreement/${partnerRef.id}`;
    console.log("[Admin] Partner approved. Agreement link:", agreementLink);

    return NextResponse.json({
      success: true,
      partnerId: partnerRef.id,
      referralCode,
      agreementLink,
      message: "Application approved and partner created",
    });
  } catch (err: any) {
    console.error("Error approving partner application:", err);
    return NextResponse.json(
      { error: err.message || "Failed to approve application" },
      { status: 500 }
    );
  }
}
