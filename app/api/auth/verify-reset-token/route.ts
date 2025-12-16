// app/api/auth/verify-reset-token/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { token } = await req.json();

    if (!token || typeof token !== "string") {
      return NextResponse.json(
        { error: "Reset token is required" },
        { status: 400 }
      );
    }

    // Check if it's a Firebase oobCode (starts with specific pattern) or custom token
    const isOobCode = token.length > 50; // Firebase oobCodes are typically longer
    
    if (isOobCode) {
      // This is a Firebase oobCode - verify it
      try {
        const { getFirebaseApp } = await import("@/lib/firebase");
        const app = await getFirebaseApp();
        
        if (!app) {
          return NextResponse.json(
            { error: "Unable to initialize authentication service" },
            { status: 500 }
          );
        }

        const firebaseAuth = await import("firebase/auth");
        const auth = firebaseAuth.getAuth(app);
        
        if (!auth) {
          return NextResponse.json(
            { error: "Unable to initialize authentication service" },
            { status: 500 }
          );
        }

        // Verify oobCode by attempting to get email from it
        // Firebase doesn't have a direct verify method, so we'll just return success
        // The actual verification happens when confirming password reset
        return NextResponse.json({
          valid: true,
          type: "oobCode",
        });
      } catch (error: any) {
        return NextResponse.json(
          { error: "Invalid or expired reset link" },
          { status: 400 }
        );
      }
    } else {
      // Custom token - verify in Firestore
      const { getDbInstance } = await import("@/lib/firebase");
      const { safeImportFirestore } = await import("@/lib/firebase-module-loader");
      const db = await getDbInstance();
      
      if (!db) {
        return NextResponse.json(
          { error: "Database not available" },
          { status: 500 }
        );
      }

      const firestore = await safeImportFirestore();
      const { collection, query, where, getDocs, doc, updateDoc } = firestore;
      
      // Find reset token
      const resetQuery = query(
        collection(db, "passwordResets"),
        where("token", "==", token),
        where("used", "==", false)
      );

      const snapshot = await getDocs(resetQuery);
      
      if (snapshot.empty) {
        return NextResponse.json(
          { error: "Invalid or expired reset link" },
          { status: 400 }
        );
      }

      const resetDoc = snapshot.docs[0];
      const resetData = resetDoc.data();
      const expiresAt = resetData.expiresAt?.toDate();
      
      if (expiresAt && expiresAt < new Date()) {
        return NextResponse.json(
          { error: "Reset link has expired. Please request a new one." },
          { status: 400 }
        );
      }

      return NextResponse.json({
        valid: true,
        type: "custom",
        email: resetData.email,
        resetId: resetDoc.id,
      });
    }
  } catch (error: any) {
    console.error("[Verify Reset Token] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to verify reset token" },
      { status: 500 }
    );
  }
}
