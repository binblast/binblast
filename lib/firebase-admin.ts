// lib/firebase-admin.ts
// Helper for initializing Firebase Admin SDK in API routes

let adminApp: any = null;
let adminInitPromise: Promise<any> | null = null;

/**
 * Get or initialize Firebase Admin SDK app instance
 * This should only be used in server-side API routes
 */
export async function getAdminApp(): Promise<any> {
  // Return existing app if already initialized
  if (adminApp) {
    return adminApp;
  }

  // If initialization in progress, wait for it
  if (adminInitPromise) {
    return adminInitPromise;
  }

  adminInitPromise = (async () => {
    try {
      // Dynamically import firebase-admin
      const admin = await import("firebase-admin");

      // Check if app already exists
      try {
        adminApp = admin.app();
        console.log("[Firebase Admin] Using existing admin app");
        return adminApp;
      } catch {
        // App doesn't exist, need to initialize
      }

      // Get credentials from environment variables
      // Fallback to NEXT_PUBLIC_FIREBASE_PROJECT_ID if FIREBASE_PROJECT_ID is not set
      const projectId = (process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID)?.trim();
      const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim();
      const privateKey = process.env.FIREBASE_PRIVATE_KEY?.trim();

      // Debug: Log what we found (without exposing sensitive values)
      console.log("[Firebase Admin] Environment check:", {
        hasProjectId: !!projectId,
        hasClientEmail: !!clientEmail,
        hasPrivateKey: !!privateKey,
        projectIdLength: projectId?.length || 0,
        clientEmailLength: clientEmail?.length || 0,
        privateKeyLength: privateKey?.length || 0,
        // Check for common alternative names
        hasNextPublicProjectId: !!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        allEnvKeys: Object.keys(process.env).filter(key => key.includes("FIREBASE") || key.includes("firebase")).join(", "),
      });

      // Check if all required credentials are present
      if (!projectId || !clientEmail || !privateKey) {
        const missing: string[] = [];
        if (!projectId) missing.push("FIREBASE_PROJECT_ID (or NEXT_PUBLIC_FIREBASE_PROJECT_ID)");
        if (!clientEmail) missing.push("FIREBASE_CLIENT_EMAIL");
        if (!privateKey) missing.push("FIREBASE_PRIVATE_KEY");

        const errorMsg = `Firebase Admin credentials not configured. Missing environment variables: ${missing.join(", ")}. Please set these in your Vercel project settings.`;
        console.error("[Firebase Admin]", errorMsg);
        throw new Error(errorMsg);
      }

      // Initialize Admin SDK
      // Normalize private key: handle various formats
      let normalizedPrivateKey = privateKey;
      
      // Replace escaped newlines
      normalizedPrivateKey = normalizedPrivateKey.replace(/\\n/g, "\n");
      
      // If the key doesn't have newlines but should, try to add them
      // (some systems store the key as a single line)
      if (!normalizedPrivateKey.includes("\n") && normalizedPrivateKey.includes("-----")) {
        // Try to detect if it's a single-line key that needs formatting
        normalizedPrivateKey = normalizedPrivateKey.replace(/-----BEGIN PRIVATE KEY-----/, "-----BEGIN PRIVATE KEY-----\n");
        normalizedPrivateKey = normalizedPrivateKey.replace(/-----END PRIVATE KEY-----/, "\n-----END PRIVATE KEY-----");
      }
      
      // Ensure proper line breaks around BEGIN/END markers
      if (!normalizedPrivateKey.startsWith("-----BEGIN")) {
        console.warn("[Firebase Admin] Private key may be malformed - missing BEGIN marker");
      }
      if (!normalizedPrivateKey.includes("-----END")) {
        console.warn("[Firebase Admin] Private key may be malformed - missing END marker");
      }

      adminApp = admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey: normalizedPrivateKey,
        } as any),
      });

      console.log("[Firebase Admin] ✅ Admin SDK initialized successfully");
      return adminApp;
    } catch (error: any) {
      console.error("[Firebase Admin] Failed to initialize:", error.message || error);
      console.error("[Firebase Admin] Error details:", {
        message: error.message,
        code: error.code,
        stack: error.stack?.substring(0, 500), // First 500 chars of stack
        errorType: error.constructor?.name,
      });
      adminInitPromise = null; // Reset promise so we can retry
      throw error;
    }
  })();

  return adminInitPromise;
}

/**
 * Get Firestore instance from Admin SDK
 */
export async function getAdminFirestore(): Promise<any> {
  const app = await getAdminApp();
  return app.firestore();
}
