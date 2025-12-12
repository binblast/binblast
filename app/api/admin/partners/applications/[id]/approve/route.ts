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

    // IMPORTANT: Partners should NOT have user documents
    // Delete user document if it exists (partners are only in "partners" collection)
    try {
      const { deleteDoc } = firestore;
      const userRef = doc(db, "users", applicationData.userId);
      const userDoc = await getDoc(userRef);
      if (userDoc.exists()) {
        await deleteDoc(userRef);
        console.log("[Admin] Deleted user document for partner:", applicationData.userId);
      }
    } catch (userDeleteError) {
      console.warn("[Admin] Could not delete user document (may not exist):", userDeleteError);
      // Don't fail the approval if user deletion fails - partner document is the source of truth
    }

    // TODO: Send email to partner with signup link
    const signupLink = `${req.headers.get("origin") || "http://localhost:3000"}/partner?partnerId=${partnerRef.id}`;
    console.log("[Admin] Partner approved. Signup link:", signupLink);

    return NextResponse.json({
      success: true,
      partnerId: partnerRef.id,
      referralCode,
      signupLink,
      message: "Application approved. Partner can now sign up at /partner",
    });
  } catch (err: any) {
    console.error("Error approving partner application:", err);
    return NextResponse.json(
      { error: err.message || "Failed to approve application" },
      { status: 500 }
    );
  }
}
