// lib/firebase.ts
// IMPORTANT: This module uses lazy initialization to prevent Firebase from initializing
// at module load time, which can cause errors if environment variables aren't set.

let app: any = undefined;
let auth: any = undefined;
let db: any = undefined;
let initPromise: Promise<void> | null = null;

async function ensureInitialized(): Promise<void> {
  // If already initialized or initialization in progress, return
  if (auth !== undefined && db !== undefined) {
    return;
  }
  if (initPromise) {
    return initPromise;
  }

  // Only initialize on client side
  if (typeof window === "undefined") {
    return;
  }

  initPromise = (async () => {
    try {
      const { initializeApp, getApps } = await import("firebase/app");
      const { getAuth } = await import("firebase/auth");
      const { getFirestore } = await import("firebase/firestore");

      const apiKey = (process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "").trim();
      const projectId = (process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "").trim();
      const authDomain = (process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "").trim();

      // Only initialize if we have valid config
      if (!apiKey || !projectId || !authDomain) {
        console.warn("[Firebase] Missing required environment variables. Firebase features will not work.");
        auth = null;
        db = null;
        return;
      }

      // Check if app already exists
      const existingApps = getApps();
      if (existingApps.length > 0) {
        app = existingApps[0];
      } else {
        app = initializeApp({
          apiKey,
          authDomain,
          projectId,
          storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || undefined,
          messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || undefined,
          appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || undefined,
        });
      }

      // Only get auth/db if app was successfully created
      if (app) {
        auth = getAuth(app);
        db = getFirestore(app);
        console.log("[Firebase] Successfully initialized");
      }
    } catch (error: any) {
      console.error("[Firebase] Initialization error:", error);
      auth = null;
      db = null;
    }
  })();

  return initPromise;
}

// Export getters that ensure initialization
export const getAuthInstance = async () => {
  await ensureInitialized();
  return auth;
};

export const getDbInstance = async () => {
  await ensureInitialized();
  return db;
};

// For backward compatibility - but these will be null/undefined until initialized
// Components should use getAuthInstance/getDbInstance instead
export { auth, db };

