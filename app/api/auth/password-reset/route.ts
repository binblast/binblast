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

    // Determine the production domain
    // Priority: 1. NEXT_PUBLIC_APP_URL env var, 2. VERCEL_URL (auto-set by Vercel), 3. Request headers
    let baseUrl = process.env.NEXT_PUBLIC_APP_URL;
    
    // If NEXT_PUBLIC_APP_URL is not set or is localhost, try Vercel's auto-provided URL
    if (!baseUrl || baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1')) {
      // Vercel automatically sets VERCEL_URL in production
      if (process.env.VERCEL_URL) {
        baseUrl = `https://${process.env.VERCEL_URL}`;
      } else if (process.env.NEXT_PUBLIC_VERCEL_URL) {
        baseUrl = `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`;
      } else {
        // Try to get from request headers (for production deployments)
        const host = req.headers.get('host');
        if (host && !host.includes('localhost') && !host.includes('127.0.0.1')) {
          const protocol = req.headers.get('x-forwarded-proto') || 'https';
          baseUrl = `${protocol}://${host}`;
        } else {
          // Last resort: use a placeholder that should be replaced
          baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://yourdomain.com";
          console.warn("[Password Reset] Using fallback URL. Please set NEXT_PUBLIC_APP_URL in Vercel:", baseUrl);
        }
      }
    }
    
    // Ensure baseUrl is a full URL with protocol
    if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
      baseUrl = `https://${baseUrl}`;
    }
    
    // Remove trailing slash
    baseUrl = baseUrl.replace(/\/$/, '');
    
    // Ensure we're not using localhost in production
    if (baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1')) {
      console.error("[Password Reset] WARNING: Using localhost URL in production! Set NEXT_PUBLIC_APP_URL in Vercel.");
    }
    
    console.log("[Password Reset] Using base URL:", baseUrl);
    
    let resetLink: string;

    // Try to use Firebase Admin SDK to generate password reset link (preferred - gives oobCode)
    // This generates an oobCode that works with Firebase's client SDK confirmPasswordReset
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

      // Generate password reset link using Admin SDK (doesn't send email, just generates link)
      // This generates a link with oobCode that works with Firebase client SDK confirmPasswordReset
      resetLink = await admin.auth().generatePasswordResetLink(email, {
        url: `${baseUrl}/reset-password`,
        handleCodeInApp: false,
      });
      
      console.log("[Password Reset] Generated reset link using Admin SDK (oobCode format, no email sent by Firebase)");
      console.log("[Password Reset] Reset link preview:", resetLink.substring(0, Math.min(150, resetLink.length)) + "...");
    } catch (adminError: any) {
      // Admin SDK not available or failed - use alternative method
      console.log("[Password Reset] Using alternative token method");
      
      // Check if user exists by querying Firestore (doesn't trigger Firebase email)
      try {
        const { getDbInstance } = await import("@/lib/firebase");
        const { safeImportFirestore } = await import("@/lib/firebase-module-loader");
        const db = await getDbInstance();
        
        if (db) {
          const firestore = await safeImportFirestore();
          const { collection, query, where, getDocs } = firestore;
          
          // Query users collection by email
          const usersQuery = query(
            collection(db, "users"),
            where("email", "==", email.toLowerCase())
          );
          const usersSnapshot = await getDocs(usersQuery);
          
          if (!usersSnapshot.empty) {
            console.log("[Password Reset] User found in Firestore");
          } else {
            // Also check Firebase Auth users if Admin SDK is available
            // But don't send email - just check existence
            try {
              const moduleName = 'firebase' + '-admin';
              const admin = await import(moduleName);
              
              if (admin.apps && admin.apps.length > 0 || (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY)) {
                if (!admin.apps || !admin.apps.length) {
                  admin.initializeApp({
                    credential: admin.credential.cert({
                      projectId: process.env.FIREBASE_PROJECT_ID,
                      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
                    }),
                  });
                }
                
                // Check if user exists in Firebase Auth (doesn't send email)
                try {
                  await admin.auth().getUserByEmail(email);
                  console.log("[Password Reset] User found in Firebase Auth");
                } catch (authError: any) {
                  if (authError.code === 'auth/user-not-found') {
                    // User doesn't exist - return error
                    return NextResponse.json(
                      { error: "No account found with this email address" },
                      { status: 404 }
                    );
                  }
                  // For other errors, continue (don't reveal if email exists for security)
                }
              }
            } catch (adminCheckError) {
              // Admin SDK not available for user check - continue anyway
              console.log("[Password Reset] Cannot verify user existence, proceeding with reset");
            }
          }
        }
      } catch (checkError: any) {
        console.error("[Password Reset] Error checking user existence:", checkError);
        // Continue anyway - don't reveal if email exists for security
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
          
          if (!db) {
            console.error("[Password Reset] Failed to initialize Firestore - db is null");
            console.error("[Password Reset] This means password reset tokens cannot be stored.");
            console.error("[Password Reset] Please configure Firebase Admin SDK or ensure NEXT_PUBLIC_FIREBASE_* env vars are set.");
            // Don't continue - password reset won't work without token storage
            return NextResponse.json(
              { error: "Password reset service is temporarily unavailable. Please contact support." },
              { status: 503 }
            );
          }
          
          const firestore = await safeImportFirestore();
          const { collection, addDoc, serverTimestamp, Timestamp } = firestore;
          
          // Convert JavaScript Date to Firestore Timestamp
          const expiresAtTimestamp = Timestamp.fromDate(expiresAt);
          
          const docRef = await addDoc(collection(db, "passwordResets"), {
            email: email.toLowerCase(),
            token: resetToken,
            expiresAt: expiresAtTimestamp, // Use Firestore Timestamp, not JavaScript Date
            createdAt: serverTimestamp(),
            used: false,
          });
          
          // Verify the token was stored correctly by reading it back
          const { getDoc } = firestore;
          const verifyDoc = await getDoc(docRef);
          if (!verifyDoc.exists()) {
            throw new Error("Token was not stored - verification read failed");
          }
          const verifyData = verifyDoc.data();
          
          console.log("[Password Reset] Token stored and verified in Firestore (client SDK):", {
            docId: docRef.id,
            tokenPrefix: resetToken.substring(0, 10),
            storedTokenPrefix: verifyData.token?.substring(0, 10),
            tokensMatch: verifyData.token === resetToken,
            email: email.toLowerCase(),
            storedEmail: verifyData.email,
            expiresAt: verifyData.expiresAt?.toDate?.()?.toISOString(),
          });
        } catch (firestoreError: any) {
          console.error("[Password Reset] Firestore write failed:", firestoreError?.message || firestoreError);
          console.error("[Password Reset] Firestore error code:", firestoreError?.code);
          console.error("[Password Reset] Firestore error details:", {
            name: firestoreError?.name,
            code: firestoreError?.code,
            stack: firestoreError?.stack?.substring(0, 300),
          });
          
          // Don't continue - password reset won't work without token storage
          return NextResponse.json(
            { error: "Failed to store password reset token. Please try again or contact support." },
            { status: 500 }
          );
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

    // Validate EmailJS configuration before proceeding
    const emailjsServiceId = process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID || "service_rok6u9h";
    const emailjsTemplateId = process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID_PASSWORD_RESET || "template_l421jys";
    const emailjsPublicKey = process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY;

    if (!emailjsPublicKey || typeof emailjsPublicKey !== 'string' || emailjsPublicKey.length < 10) {
      console.error("[Password Reset] EmailJS not configured properly");
      return NextResponse.json(
        { error: "Email service not configured. Please contact support." },
        { status: 500 }
      );
    }

    // Return success immediately - send email asynchronously (non-blocking)
    // This significantly improves perceived response time
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

    // Send email asynchronously (fire-and-forget) - don't await
    // This allows the API to return immediately while email sends in background
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => abortController.abort(), 10000); // 10 second timeout
    
    fetch(emailjsUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(emailPayload),
      signal: abortController.signal,
    })
      .then(async (emailResponse) => {
        clearTimeout(timeoutId); // Clear timeout on success
        if (!emailResponse.ok) {
          const errorText = await emailResponse.text();
          console.error("[Password Reset] EmailJS error response:", {
            status: emailResponse.status,
            statusText: emailResponse.statusText,
            errorText: errorText.substring(0, 200),
            serviceId: emailjsServiceId,
            templateId: emailjsTemplateId,
            email: email,
          });
          
          // Log specific errors for debugging
          if (emailResponse.status === 403 && errorText.includes('non-browser applications')) {
            console.error("[Password Reset] EmailJS server-side API calls disabled. Enable in EmailJS Dashboard → Account → General.");
          }
        } else {
          const emailResult = await emailResponse.text();
          console.log("[Password Reset] EmailJS success:", emailResult.substring(0, 100));
        }
      })
      .catch((emailError: any) => {
        clearTimeout(timeoutId); // Clear timeout on error
        // Log but don't fail the request - email sending errors shouldn't block user
        if (emailError?.name === 'AbortError') {
          console.warn("[Password Reset] EmailJS request timed out (non-blocking):", email);
        } else {
          console.error("[Password Reset] EmailJS send error (non-blocking):", {
            message: emailError?.message,
            name: emailError?.name,
            email: email,
          });
        }
      });

    // Return immediately - user gets instant feedback
    // Email is sent in background
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
