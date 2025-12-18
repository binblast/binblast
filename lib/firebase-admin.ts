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
      const projectId = process.env.FIREBASE_PROJECT_ID?.trim();
      const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim();
      const privateKey = process.env.FIREBASE_PRIVATE_KEY?.trim();

      // Check if all required credentials are present
      if (!projectId || !clientEmail || !privateKey) {
        const missing: string[] = [];
        if (!projectId) missing.push("FIREBASE_PROJECT_ID");
        if (!clientEmail) missing.push("FIREBASE_CLIENT_EMAIL");
        if (!privateKey) missing.push("FIREBASE_PRIVATE_KEY");

        const errorMsg = `Firebase Admin credentials not configured. Missing environment variables: ${missing.join(", ")}. Please set these in your Vercel project settings.`;
        console.error("[Firebase Admin]", errorMsg);
        throw new Error(errorMsg);
      }

      // Initialize Admin SDK
      adminApp = admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey: privateKey.replace(/\\n/g, "\n"),
        } as any),
      });

      console.log("[Firebase Admin] ✅ Admin SDK initialized successfully");
      return adminApp;
    } catch (error: any) {
      console.error("[Firebase Admin] Failed to initialize:", error.message || error);
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
