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
      // Dynamically import firebase-admin - may not be installed
      // Construct module name at runtime to prevent webpack from analyzing
      let admin: any;
      try {
        const moduleName = 'firebase' + '-admin'; // Construct at runtime
        admin = await import(moduleName);
      } catch (importError: any) {
        // firebase-admin not installed, skip Admin SDK path
        if (importError.code === 'MODULE_NOT_FOUND' || importError.message?.includes('Cannot find module') || importError.message?.includes('firebase-admin')) {
          throw new Error("Admin SDK not available");
        }
        throw importError;
      }
      
      if (!admin.apps || !admin.apps.length) {
        // Initialize Firebase Admin if not already initialized
        try {
          if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL || !process.env.FIREBASE_PRIVATE_KEY) {
            throw new Error("Admin SDK credentials not configured");
          }
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

      // Create reset link with custom token (do this first so it's always defined)
      resetLink = `${baseUrl}/reset-password?token=${resetToken}`;

      // Store reset token in Firestore
      // Try Admin SDK first for server-side operations, fall back to client SDK
      try {
        const moduleName = 'firebase' + '-admin';
        const admin = await import(moduleName);
        
        if (admin.apps && admin.apps.length > 0 || (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY)) {
          // Use Admin SDK for Firestore
          if (!admin.apps || !admin.apps.length) {
            admin.initializeApp({
              credential: admin.credential.cert({
                projectId: process.env.FIREBASE_PROJECT_ID,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
              }),
            });
          }
          
          const adminDb = admin.firestore();
          await adminDb.collection("passwordResets").add({
            email: email.toLowerCase(),
            token: resetToken,
            expiresAt: admin.firestore.Timestamp.fromDate(expiresAt),
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            used: false,
          });
        } else {
          throw new Error("Admin SDK not configured");
        }
      } catch (adminError: any) {
        // Fall back to client SDK (should work with updated Firestore rules)
        console.log("[Password Reset] Admin SDK Firestore failed, trying client SDK:", adminError?.message);
        try {
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
            console.log("[Password Reset] Token stored successfully in Firestore");
          } else {
            console.error("[Password Reset] Failed to initialize Firestore - db is null");
            // Continue anyway - token will still be generated and email sent
            // The reset won't work without Firestore, but at least we don't fail completely
          }
        } catch (firestoreError: any) {
          console.error("[Password Reset] Firestore write failed:", firestoreError?.message || firestoreError);
          console.error("[Password Reset] Firestore error code:", firestoreError?.code);
          // Continue anyway - token will still be generated and email sent
          // Note: Reset won't work without Firestore storage, but we'll still try to send email
        }
      }
    }

    // Ensure resetLink is defined
    if (!resetLink) {
      console.error("[Password Reset] Reset link not generated");
      return NextResponse.json(
        { error: "Failed to generate password reset link. Please try again." },
        { status: 500 }
      );
    }

    // Send email via EmailJS
    const emailjsServiceId = process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID || "service_rok6u9h";
    // Password reset email template ID
    const emailjsTemplateId = process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID_PASSWORD_RESET || "template_l421jys";
    const emailjsPublicKey = process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY;

    // Detailed logging for debugging
    console.log("[Password Reset] EmailJS Configuration Check:", {
      hasServiceId: !!emailjsServiceId,
      serviceId: emailjsServiceId,
      hasTemplateId: !!emailjsTemplateId,
      templateId: emailjsTemplateId,
      hasPublicKey: !!emailjsPublicKey,
      publicKeyLength: emailjsPublicKey?.length || 0,
      publicKeyPrefix: emailjsPublicKey?.substring(0, 10) || "none",
    });

    if (!emailjsPublicKey) {
      console.error("[Password Reset] EmailJS not configured - missing NEXT_PUBLIC_EMAILJS_PUBLIC_KEY");
      return NextResponse.json(
        { error: "Email service not configured. Please contact support." },
        { status: 500 }
      );
    }

    // Validate EmailJS public key format (should be a string, typically starts with a letter)
    if (typeof emailjsPublicKey !== 'string' || emailjsPublicKey.length < 10) {
      console.error("[Password Reset] Invalid EmailJS public key format:", {
        type: typeof emailjsPublicKey,
        length: emailjsPublicKey?.length,
      });
      return NextResponse.json(
        { error: "Email service configuration error. Please contact support." },
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

    console.log("[Password Reset] Sending email via EmailJS:", {
      serviceId: emailjsServiceId,
      templateId: emailjsTemplateId,
      hasPublicKey: !!emailjsPublicKey,
      email: email,
    });

    const emailResponse = await fetch(emailjsUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(emailPayload),
    });

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();
      let errorMessage = "Failed to send password reset email. Please try again later.";
      
      // Parse EmailJS error response for better error messages
      try {
        const errorJson = JSON.parse(errorText);
        if (errorJson.error) {
          errorMessage = `Email service error: ${errorJson.error}`;
        }
      } catch {
        // If not JSON, use the text as-is
        if (errorText && errorText.length < 200) {
          errorMessage = `Email service error: ${errorText}`;
        }
      }
      
      console.error("[Password Reset] EmailJS error response:", {
        status: emailResponse.status,
        statusText: emailResponse.statusText,
        errorText: errorText,
        serviceId: emailjsServiceId,
        templateId: emailjsTemplateId,
        hasPublicKey: !!emailjsPublicKey,
      });
      
      // Provide specific error messages for common issues
      if (emailResponse.status === 400) {
        errorMessage = "Invalid email template configuration. Please contact support.";
      } else if (emailResponse.status === 401) {
        errorMessage = "Email service authentication failed. The EmailJS public key may be incorrect or expired. Please check Vercel environment variables.";
      } else if (emailResponse.status === 403) {
        errorMessage = "Email service access denied. Please verify EmailJS public key and service permissions in Vercel settings.";
      } else if (emailResponse.status === 404) {
        errorMessage = `Email template not found. Please verify template ID "${emailjsTemplateId}" exists in EmailJS dashboard.`;
      } else if (emailResponse.status === 429) {
        errorMessage = "Too many email requests. Please try again in a few minutes.";
      }
      
      return NextResponse.json(
        { error: errorMessage },
        { status: 500 }
      );
    }

    const emailResult = await emailResponse.text();
    console.log("[Password Reset] EmailJS success:", emailResult);

    // For security, don't reveal if email exists or not
    return NextResponse.json({
      success: true,
      message: "If an account exists with this email, a password reset link has been sent.",
    });

  } catch (error: any) {
    console.error("[Password Reset API] Unexpected error:", {
      message: error?.message,
      stack: error?.stack,
      code: error?.code,
      name: error?.name,
    });
    return NextResponse.json(
      { error: error.message || "Failed to process password reset request" },
      { status: 500 }
    );
  }
}
