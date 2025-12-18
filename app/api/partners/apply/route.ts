// app/api/partners/apply/route.ts

import { NextRequest, NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { 
      userId, 
      businessName, 
      ownerName, 
      email, 
      phone, 
      websiteOrInstagram,
      serviceAreas, 
      businessType,
      hasInsurance,
      promotionMethod,
      heardAboutUs
    } = body;

    // userId is optional - applications can be submitted with just email
    // userId will be linked later when user registers
    if (!businessName || !ownerName || !email || !phone || !serviceAreas || !businessType || hasInsurance === undefined || !promotionMethod) {
      return NextResponse.json(
        { error: "All required fields must be filled" },
        { status: 400 }
      );
    }

    // Dynamically import Firebase (same pattern as webhook route)
    const { getDbInstance } = await import("@/lib/firebase");
    const { safeImportFirestore } = await import("@/lib/firebase-module-loader");
    const firestore = await safeImportFirestore();
    const { collection, doc, setDoc, getDoc, query, where, getDocs, serverTimestamp } = firestore;
    
    const db = await getDbInstance();
    if (!db) {
      console.error("[Partner Apply] Firebase Firestore not available. Environment check:", {
        hasApiKey: !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
        hasProjectId: !!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        hasAppId: !!process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
      });
      return NextResponse.json(
        { error: "Firebase is not configured. Please check server logs." },
        { status: 500 }
      );
    }

    // Check if user already has a partner application
    const applicationsQuery = query(
      collection(db, "partnerApplications"),
      where("userId", "==", userId)
    );
    const existingApplications = await getDocs(applicationsQuery);

    let applicationId: string;
    if (!existingApplications.empty) {
      // Update existing application
      applicationId = existingApplications.docs[0].id;
    } else {
      // Create new application
      applicationId = doc(collection(db, "partnerApplications")).id;
    }

    // Create or update partner application document
    const applicationRef = doc(db, "partnerApplications", applicationId);
    const existingData = existingApplications.empty ? null : existingApplications.docs[0].data();
    
    const applicationData = {
      userId: userId || null, // Can be null if user hasn't registered yet
      businessName,
      ownerName,
      email,
      phone,
      websiteOrInstagram: websiteOrInstagram || null,
      serviceType: businessType,
      serviceArea: Array.isArray(serviceAreas) ? serviceAreas.join(", ") : serviceAreas,
      hasInsurance: hasInsurance === true,
      promotionMethod,
      heardAboutUs: heardAboutUs || null,
      status: existingData?.status || "pending", // Keep existing status if updating, otherwise "pending"
      linkedPartnerId: existingData?.linkedPartnerId || null, // Will be set when approved
      createdAt: existingData?.createdAt || serverTimestamp(), // Keep original creation time if updating
      updatedAt: serverTimestamp(),
    };

    await setDoc(applicationRef, applicationData, { merge: true });

    console.log("[Partner Application] Application submitted:", {
      applicationId,
      email,
      businessName,
    });

    // Send email notification to admin (non-blocking)
    try {
      const { notifyAdminNewApplication } = await import("@/lib/email-utils");
      await notifyAdminNewApplication({
        applicationId,
        businessName,
        ownerName,
        email,
        phone,
        serviceAreas: Array.isArray(serviceAreas) ? serviceAreas.join(", ") : serviceAreas,
        businessType,
        submittedAt: new Date().toLocaleString("en-US", {
          dateStyle: "full",
          timeStyle: "short",
        }),
      });
    } catch (emailError) {
      console.error("[Partner Application] Failed to send admin notification:", emailError);
      // Don't fail the application if email fails
    }

    // Create admin notification in Firestore (for dashboard display)
    try {
      const notificationsRef = doc(collection(db, "adminNotifications"));
      await setDoc(notificationsRef, {
        type: "partner_application",
        title: "New Partner Application",
        message: `${businessName} submitted a partnership application`,
        applicationId,
        businessName,
        ownerName,
        email,
        read: false,
        createdAt: serverTimestamp(),
      });
    } catch (notificationError) {
      console.error("[Partner Application] Failed to create notification:", notificationError);
      // Don't fail the application if notification creation fails
    }

    // Return email data so client can send via EmailJS (EmailJS doesn't work server-side)
    return NextResponse.json({
      success: true,
      applicationId,
      message: "Application submitted successfully",
      emailData: {
        businessName,
        ownerName,
        email,
        phone,
        websiteOrInstagram: websiteOrInstagram || "Not provided",
        serviceAreas: Array.isArray(serviceAreas) ? serviceAreas.join(", ") : serviceAreas,
        businessType,
        hasInsurance: hasInsurance ? "Yes" : "No",
        promotionMethod,
        heardAboutUs: heardAboutUs || "Not specified",
        applicationId,
        userId: userId || "Not logged in",
        submittedAt: new Date().toLocaleString("en-US", {
          dateStyle: "full",
          timeStyle: "short",
        }),
      },
    });
  } catch (err: any) {
    console.error("[Partner Apply] Partner application error:", err);
    console.error("[Partner Apply] Error stack:", err.stack);
    
    // Check for Firestore permission errors
    const errorMessage = err.message || "Failed to submit application";
    if (errorMessage.includes("Missing or insufficient permissions") || errorMessage.includes("permission-denied")) {
      console.error("[Partner Apply] Firestore permission error - check security rules");
      return NextResponse.json(
        { error: "Permission error. Please ensure you are logged in and try again." },
        { status: 403 }
      );
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
