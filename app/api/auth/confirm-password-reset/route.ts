// app/api/auth/confirm-password-reset/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { token, password } = await req.json();

    if (!token || !password) {
      return NextResponse.json(
        { error: "Token and password are required" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    // Check if it's a Firebase oobCode or custom token
    const isOobCode = token.length > 50;
    
    if (isOobCode) {
      // Use Firebase's confirmPasswordReset
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

      try {
        await firebaseAuth.confirmPasswordReset(auth, token, password);
        return NextResponse.json({
          success: true,
          message: "Password reset successfully",
        });
      } catch (error: any) {
        if (error.code === "auth/expired-action-code") {
          return NextResponse.json(
            { error: "Reset link has expired. Please request a new one." },
            { status: 400 }
          );
        } else if (error.code === "auth/invalid-action-code") {
          return NextResponse.json(
            { error: "Invalid reset link. Please request a new one." },
            { status: 400 }
          );
        } else if (error.code === "auth/weak-password") {
          return NextResponse.json(
            { error: "Password is too weak. Please choose a stronger password." },
            { status: 400 }
          );
        }
        throw error;
      }
    } else {
      // Custom token - verify and reset password
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
      
      // Find and verify reset token
      const resetQuery = query(
        collection(db, "passwordResets"),
        where("token", "==", token),
        where("used", "==", false)
      );

      const snapshot = await getDocs(resetQuery);
      
      console.log("[Confirm Password Reset] Token lookup:", {
        tokenLength: token.length,
        tokenPrefix: token.substring(0, 10),
        foundTokens: snapshot.size,
      });
      
      if (snapshot.empty) {
        console.error("[Confirm Password Reset] Token not found in Firestore");
        return NextResponse.json(
          { error: "Invalid or expired reset link. Please request a new one." },
          { status: 400 }
        );
      }

      const resetDoc = snapshot.docs[0];
      const resetData = resetDoc.data();
      const expiresAt = resetData.expiresAt?.toDate();
      
      console.log("[Confirm Password Reset] Token found:", {
        email: resetData.email,
        expiresAt: expiresAt?.toISOString(),
        used: resetData.used,
        now: new Date().toISOString(),
        isExpired: expiresAt && expiresAt < new Date(),
      });
      
      if (expiresAt && expiresAt < new Date()) {
        return NextResponse.json(
          { error: "Reset link has expired. Please request a new one." },
          { status: 400 }
        );
      }

      if (resetData.used) {
        return NextResponse.json(
          { error: "This reset link has already been used. Please request a new one." },
          { status: 400 }
        );
      }

      const email = resetData.email;

      // Use Firebase Admin SDK to update password
      try {
        // Try Admin SDK first - dynamically import (may not be installed)
        // Construct module name at runtime to prevent webpack from analyzing
        let admin: any;
        try {
          const moduleName = 'firebase' + '-admin'; // Construct at runtime
          admin = await import(moduleName);
        } catch (importError: any) {
          // firebase-admin not installed
          if (importError.code === 'MODULE_NOT_FOUND' || importError.message?.includes('Cannot find module') || importError.message?.includes('firebase-admin')) {
            throw new Error("Admin SDK not available");
          }
          throw importError;
        }
        
        if (!admin.apps || !admin.apps.length) {
          // Try to initialize if credentials are available
          if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
            try {
              admin.initializeApp({
                credential: admin.credential.cert({
                  projectId: process.env.FIREBASE_PROJECT_ID,
                  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
                }),
              });
            } catch (initError) {
              throw new Error("Admin SDK not configured");
            }
          } else {
            throw new Error("Admin SDK not configured");
          }
        }
        
        await admin.auth().updateUser(
          (await admin.auth().getUserByEmail(email)).uid,
          { password }
        );
      } catch (adminError: any) {
        // Admin SDK not available - return error with details
        console.error("[Confirm Password Reset] Admin SDK error:", {
          message: adminError?.message,
          code: adminError?.code,
          hasProjectId: !!process.env.FIREBASE_PROJECT_ID,
          hasClientEmail: !!process.env.FIREBASE_CLIENT_EMAIL,
          hasPrivateKey: !!process.env.FIREBASE_PRIVATE_KEY,
        });
        
        // Provide more specific error message
        let errorMessage = "Password reset service temporarily unavailable. Please contact support or request a new reset link.";
        if (adminError?.message?.includes("not available") || adminError?.message?.includes("not configured")) {
          errorMessage = "Password reset requires server configuration. Please contact support.";
        }
        
        return NextResponse.json(
          { error: errorMessage },
          { status: 503 }
        );
      }

      // Mark token as used
      await updateDoc(doc(db, "passwordResets", resetDoc.id), {
        used: true,
        usedAt: firestore.serverTimestamp(),
      });

      return NextResponse.json({
        success: true,
        message: "Password reset successfully",
      });
    }
  } catch (error: any) {
    console.error("[Confirm Password Reset] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to reset password" },
      { status: 500 }
    );
  }
}
