// app/api/admin/partners/assign-user/route.ts

import { NextRequest, NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { partnerId, userEmail } = body;

    if (!userEmail) {
      return NextResponse.json(
        { error: "userEmail is required" },
        { status: 400 }
      );
    }

    // Dynamically import Firebase
    const { getDbInstance } = await import("@/lib/firebase");
    const { safeImportFirestore } = await import("@/lib/firebase-module-loader");
    const firestore = await safeImportFirestore();
    const { collection, doc, getDoc, updateDoc, query, where, getDocs, serverTimestamp } = firestore;

    const db = await getDbInstance();
    if (!db) {
      return NextResponse.json(
        { error: "Firebase is not configured" },
        { status: 500 }
      );
    }

    // Find user by email in users collection (Firebase Auth UID is the document ID)
    // We need to query users collection to find the userId
    let userId: string | null = null;
    try {
      const usersQuery = query(
        collection(db, "users"),
        where("email", "==", userEmail.toLowerCase())
      );
      const usersSnapshot = await getDocs(usersQuery);
      if (!usersSnapshot.empty) {
        userId = usersSnapshot.docs[0].id; // Document ID is the Firebase Auth UID
      }
    } catch (queryErr: any) {
      console.warn("[Assign User] Could not query users collection:", queryErr);
    }

    // If user not found in users collection, try to find by checking if they have a Firebase Auth account
    // Note: This requires Firebase Admin SDK which may not be available
    if (!userId) {
      // Try Firebase Admin SDK as fallback
      try {
        const admin = await import("firebase-admin");
        if (admin.apps.length > 0) {
          const userRecord = await admin.auth().getUserByEmail(userEmail);
          userId = userRecord.uid;
        }
      } catch (adminErr: any) {
        console.warn("[Assign User] Firebase Admin SDK not available:", adminErr.message);
      }
    }

    if (!userId) {
      return NextResponse.json(
        { error: `User with email ${userEmail} not found. User must register first.` },
        { status: 404 }
      );
    }

    // Find partner record
    let partnerRef;
    let partnerDoc;
    
    if (partnerId) {
      // Use provided partnerId
      partnerRef = doc(db, "partners", partnerId);
      partnerDoc = await getDoc(partnerRef);
      
      if (!partnerDoc.exists()) {
        return NextResponse.json(
          { error: "Partner not found" },
          { status: 404 }
        );
      }
    } else {
      // Find partner by email
      const partnersQuery = query(
        collection(db, "partners"),
        where("email", "==", userEmail.toLowerCase())
      );
      const partnersSnapshot = await getDocs(partnersQuery);
      
      if (partnersSnapshot.empty) {
        return NextResponse.json(
          { error: `No partner record found for email ${userEmail}` },
          { status: 404 }
        );
      }
      
      partnerDoc = partnersSnapshot.docs[0];
      partnerRef = doc(db, "partners", partnerDoc.id);
    }

    const partnerData = partnerDoc.data();

    // Check if partner already has a different userId assigned
    if (partnerData.userId && partnerData.userId !== userId) {
      return NextResponse.json(
        { 
          error: `Partner already assigned to a different user (${partnerData.userId}). Cannot reassign.`,
          currentUserId: partnerData.userId
        },
        { status: 400 }
      );
    }

    // Update partner record with userId
    await updateDoc(partnerRef, {
      userId: userId,
      email: userEmail.toLowerCase(), // Ensure email matches
      updatedAt: serverTimestamp(),
    });

    // Also update partner application if it exists
    try {
      const applicationsQuery = query(
        collection(db, "partnerApplications"),
        where("email", "==", userEmail.toLowerCase())
      );
      const applicationsSnapshot = await getDocs(applicationsQuery);
      
      if (!applicationsSnapshot.empty) {
        const { updateDoc: updateAppDoc, doc: appDoc } = firestore;
        for (const appDocSnapshot of applicationsSnapshot.docs) {
          await updateAppDoc(appDoc(db, "partnerApplications", appDocSnapshot.id), {
            userId: userId,
            updatedAt: serverTimestamp(),
          });
        }
      }
    } catch (appUpdateErr) {
      console.warn("[Assign User] Could not update partner application:", appUpdateErr);
      // Don't fail if application update fails
    }

    return NextResponse.json({
      success: true,
      message: `User ${userEmail} successfully assigned to partner account`,
      partnerId: partnerDoc.id,
      userId: userId,
      partnerData: {
        businessName: partnerData.businessName,
        email: partnerData.email,
        status: partnerData.status,
      }
    });
  } catch (err: any) {
    console.error("Error assigning user to partner:", err);
    return NextResponse.json(
      { error: err.message || "Failed to assign user to partner" },
      { status: 500 }
    );
  }
}
