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

    if (!userId || !businessName || !ownerName || !email || !phone || !serviceAreas || !businessType || hasInsurance === undefined || !promotionMethod) {
      return NextResponse.json(
        { error: "All required fields must be filled" },
        { status: 400 }
      );
    }

    // Dynamically import Firebase (same pattern as webhook route)
    const { getDbInstance } = await import("@/lib/firebase");
    const { collection, doc, setDoc, getDoc, query, where, getDocs, serverTimestamp } = await import("firebase/firestore");
    
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
    const applicationData = {
      userId,
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
      status: existingApplications.empty ? "pending" : existingApplications.docs[0].data().status, // Keep existing status if updating
      linkedPartnerId: null, // Will be set when approved
      createdAt: existingApplications.empty ? serverTimestamp() : existingApplications.docs[0].data().createdAt,
      updatedAt: serverTimestamp(),
    };

    await setDoc(applicationRef, applicationData, { merge: true });

    // TODO: Send confirmation email to applicant
    // For now, just log it
    console.log("[Partner Application] Application submitted:", {
      applicationId,
      email,
      businessName,
    });

    return NextResponse.json({
      success: true,
      applicationId,
      message: "Application submitted successfully",
    });
  } catch (err: any) {
    console.error("[Partner Apply] Partner application error:", err);
    console.error("[Partner Apply] Error stack:", err.stack);
    return NextResponse.json(
      { error: err.message || "Failed to submit application" },
      { status: 500 }
    );
  }
}
