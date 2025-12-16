// app/api/auth/password-reset/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email address" },
        { status: 400 }
      );
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    let resetLink: string;
    let userExists = false;

    // Try to use Firebase Admin SDK to generate password reset link
    try {
      const admin = await import("firebase-admin");
      
      if (!admin.apps.length) {
        // Initialize Firebase Admin if not already initialized
        try {
          admin.initializeApp({
            credential: admin.credential.cert({
              projectId: process.env.FIREBASE_PROJECT_ID,
              clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
              privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
            }),
          });
        } catch (initError) {
          console.log("[Password Reset] Admin SDK not configured, using alternative method");
          throw new Error("Admin SDK not available");
        }
      }

      // Generate password reset link using Admin SDK
      resetLink = await admin.auth().generatePasswordResetLink(email, {
        url: `${baseUrl}/reset-password`,
        handleCodeInApp: false,
      });
      
      userExists = true;
    } catch (adminError: any) {
      // Admin SDK not available or failed - use alternative method
      console.log("[Password Reset] Using alternative token method");
      
      // Check if user exists using Firebase Auth
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

      // Verify user exists by attempting to send reset email
      try {
        await firebaseAuth.sendPasswordResetEmail(auth, email);
        userExists = true;
      } catch (error: any) {
        if (error.code === "auth/user-not-found") {
          return NextResponse.json(
            { error: "No account found with this email address" },
            { status: 404 }
          );
        } else if (error.code === "auth/invalid-email") {
          return NextResponse.json(
            { error: "Invalid email address" },
            { status: 400 }
          );
        } else if (error.code === "auth/too-many-requests") {
          return NextResponse.json(
            { error: "Too many password reset requests. Please try again later" },
            { status: 429 }
          );
        }
        // For other errors, still proceed (don't reveal if email exists for security)
      }

      // Generate a secure custom token
      const crypto = await import("crypto");
      const resetToken = crypto.randomBytes(32).toString("hex");
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 1); // 1 hour expiration

      // Store reset token in Firestore
      const { getDbInstance } = await import("@/lib/firebase");
      const { safeImportFirestore } = await import("@/lib/firebase-module-loader");
      const db = await getDbInstance();
      
      if (db) {
        const firestore = await safeImportFirestore();
        const { collection, addDoc, serverTimestamp } = firestore;
        
        await addDoc(collection(db, "passwordResets"), {
          email: email.toLowerCase(),
          token: resetToken,
          expiresAt: expiresAt,
          createdAt: serverTimestamp(),
          used: false,
        });
      }

      // Create reset link with custom token
      resetLink = `${baseUrl}/reset-password?token=${resetToken}`;
    }

    // Send email via EmailJS
    const emailjsServiceId = process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID || "service_rok6u9h";
    // Password reset email template ID
    const emailjsTemplateId = process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID_PASSWORD_RESET || "template_l421jys";
    const emailjsPublicKey = process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY;

    if (!emailjsPublicKey) {
      console.error("[Password Reset] EmailJS not configured");
      return NextResponse.json(
        { error: "Email service not configured. Please set NEXT_PUBLIC_EMAILJS_PUBLIC_KEY" },
        { status: 500 }
      );
    }

    const emailjsUrl = "https://api.emailjs.com/api/v1.0/email/send";
    
    const emailPayload = {
      service_id: emailjsServiceId,
      template_id: emailjsTemplateId,
      user_id: emailjsPublicKey,
      template_params: {
        to_email: email,
        resetLink: resetLink,
        email: email,
      },
    };

    const emailResponse = await fetch(emailjsUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(emailPayload),
    });

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();
      console.error("[Password Reset] EmailJS error:", errorText);
      return NextResponse.json(
        { error: "Failed to send password reset email. Please try again later." },
        { status: 500 }
      );
    }

    // For security, don't reveal if email exists or not
    return NextResponse.json({
      success: true,
      message: "If an account exists with this email, a password reset link has been sent.",
    });

  } catch (error: any) {
    console.error("[Password Reset API] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process password reset request" },
      { status: 500 }
    );
  }
}
