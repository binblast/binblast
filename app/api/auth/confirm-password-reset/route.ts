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

      const email = resetData.email;

      // Use Firebase Admin SDK to update password, or use client SDK with temporary sign-in
      try {
        // Try Admin SDK first
        const admin = await import("firebase-admin");
        
        if (admin.apps.length) {
          await admin.auth().updateUser(
            (await admin.auth().getUserByEmail(email)).uid,
            { password }
          );
        } else {
          throw new Error("Admin SDK not available");
        }
      } catch (adminError) {
        // Fallback: Use client SDK (requires temporary sign-in)
        // This is more complex and less secure, so we'll require Admin SDK
        return NextResponse.json(
          { error: "Password reset service temporarily unavailable. Please contact support." },
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
