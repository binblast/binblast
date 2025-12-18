// app/api/admin/partners/applications/[id]/approve/route.ts

import { NextRequest, NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

const PARTNER_REVENUE_SHARE = 0.6; // 60% to partner
const PLATFORM_REVENUE_SHARE = 0.4; // 40% to platform

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  let applicationId: string | undefined;
  try {
    // Handle both Promise and direct params (Next.js 13+ vs 14+)
    const resolvedParams = params instanceof Promise ? await params : params;
    applicationId = resolvedParams.id;
    let body;
    try {
      body = await req.json();
    } catch (parseError: any) {
      console.error("[Approve Partner] Failed to parse request body:", parseError);
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }
    const { serviceAreas, revenueSharePartner, revenueSharePlatform } = body;

    if (!applicationId) {
      return NextResponse.json(
        { error: "Application ID is required" },
        { status: 400 }
      );
    }

    // Validate service areas
    if (!serviceAreas || !Array.isArray(serviceAreas) || serviceAreas.length === 0) {
      return NextResponse.json(
        { error: "At least one service area is required" },
        { status: 400 }
      );
    }

    // Validate revenue split
    const partnerShare = revenueSharePartner || PARTNER_REVENUE_SHARE;
    const platformShare = revenueSharePlatform || PLATFORM_REVENUE_SHARE;
    
    if (Math.abs(partnerShare + platformShare - 1) > 0.01) {
      return NextResponse.json(
        { error: "Revenue shares must total 100%" },
        { status: 400 }
      );
    }

    const { getDbInstance } = await import("@/lib/firebase");
    const { safeImportFirestore } = await import("@/lib/firebase-module-loader");
    const { logPartnerAuditEvent } = await import("@/lib/partner-audit-log");
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
    // Note: userId might be null if application was submitted before user registered
    // In that case, userId will be linked when user registers and signs up
    const partnerRef = doc(collection(db, "partners"));
    const partnerData = {
      userId: applicationData.userId || null, // Can be null if user hasn't registered yet
      businessName: applicationData.businessName,
      ownerName: applicationData.ownerName,
      email: applicationData.email,
      phone: applicationData.phone,
      serviceType: applicationData.serviceType,
      serviceArea: applicationData.serviceArea, // Keep for backward compatibility
      serviceAreas: serviceAreas, // New: array of service areas
      status: "active", // Changed: Set to active immediately (was pending_agreement)
      referralCode,
      partnerCode: referralCode, // Alias for referralCode
      bookingLinkSlug: referralCode.toLowerCase(),
      stripeConnected: false,
      revenueSharePartner: partnerShare,
      revenueSharePlatform: platformShare,
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
      approvedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    // Log audit event
    await logPartnerAuditEvent(
      "application_approve",
      "partnerApplication",
      applicationId,
      {
        before: { status: applicationData.status },
        after: { status: "approved", linkedPartnerId: partnerRef.id },
        metadata: {
          serviceAreas,
          revenueSharePartner: partnerShare,
          revenueSharePlatform: platformShare,
        },
      }
    );

    // Also log partner creation
    await logPartnerAuditEvent(
      "partner_create",
      "partner",
      partnerRef.id,
      {
        metadata: {
          fromApplication: applicationId,
          serviceAreas,
          revenueSharePartner: partnerShare,
          revenueSharePlatform: platformShare,
        },
      }
    );

    // IMPORTANT: Partners should NOT have user documents
    // Delete user document if it exists (partners are only in "partners" collection)
    try {
      if (applicationData.userId) {
        const { deleteDoc } = firestore;
        const userRef = doc(db, "users", applicationData.userId);
        const userDoc = await getDoc(userRef);
        if (userDoc.exists()) {
          await deleteDoc(userRef);
          console.log("[Admin] Deleted user document for partner:", applicationData.userId);
        }
      }
    } catch (userDeleteError) {
      console.warn("[Admin] Could not delete user document (may not exist):", userDeleteError);
      // Don't fail the approval if user deletion fails - partner document is the source of truth
    }

    // Generate signup link
    const baseUrl = req.headers.get("origin") || process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const signupLink = `${baseUrl}/partner?partnerId=${partnerRef.id}`;
    
    console.log("[Admin] Partner approved. Signup link:", signupLink);

    // Send approval email to partner (non-blocking - fire and forget)
    (async () => {
      try {
        const { notifyPartnerApproval } = await import("@/lib/email-utils");
        await notifyPartnerApproval({
          email: applicationData.email,
          ownerName: applicationData.ownerName,
          businessName: applicationData.businessName,
          referralCode,
          serviceAreas: serviceAreas.join(", "),
          revenueSharePartner: partnerShare,
          revenueSharePlatform: platformShare,
          signupLink,
        });
      } catch (emailError: any) {
        console.error("[Admin] Failed to send approval email:", emailError?.message || emailError);
        // Don't fail the approval if email fails
      }
    })();

    // Create admin notification for approval (non-blocking - fire and forget)
    (async () => {
      try {
        const notificationsRef = doc(collection(db, "adminNotifications"));
        await setDoc(notificationsRef, {
          type: "partner_approved",
          title: "Partner Application Approved",
          message: `${applicationData.businessName} has been approved and can now sign up`,
          partnerId: partnerRef.id,
          applicationId,
          businessName: applicationData.businessName,
          read: false,
          createdAt: serverTimestamp(),
        });
      } catch (notificationError: any) {
        console.error("[Admin] Failed to create approval notification:", notificationError?.message || notificationError);
        // Don't fail the approval if notification creation fails
      }
    })();

    return NextResponse.json({
      success: true,
      partnerId: partnerRef.id,
      referralCode,
      signupLink,
      message: "Application approved. Partner can now sign up at /partner",
    });
  } catch (err: any) {
    console.error("[Approve Partner] Error approving partner application:", {
      error: err.message,
      stack: err.stack,
      applicationId: typeof applicationId !== 'undefined' ? applicationId : 'unknown',
    });
    return NextResponse.json(
      { 
        error: err.message || "Failed to approve application",
        details: process.env.NODE_ENV === "development" ? err.stack : undefined
      },
      { status: 500 }
    );
  }
}
