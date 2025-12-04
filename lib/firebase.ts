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

  initPromise = (async () => {
    try {
      // Check environment variables FIRST before importing Firebase
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

      // Only import Firebase after confirming we have config
      const { initializeApp, getApps } = await import("firebase/app");
      const { getAuth } = await import("firebase/auth");
      const { getFirestore } = await import("firebase/firestore");

      // Check if app already exists and validate it has proper config
      const existingApps = getApps();
      let existingAppWithConfig = null;
      
      if (existingApps.length > 0) {
        // Find an existing app that matches our config
        for (const existingApp of existingApps) {
          if (existingApp.options && existingApp.options.apiKey && existingApp.options.apiKey === apiKey) {
            existingAppWithConfig = existingApp;
            break;
          }
        }
      }
      
      if (existingAppWithConfig) {
        app = existingAppWithConfig;
      } else {
        // Ensure all required config values are present before initializing
        const config = {
          apiKey,
          authDomain,
          projectId,
        };
        
        // Only add optional fields if they exist
        if (process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET) {
          (config as any).storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
        }
        if (process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID) {
          (config as any).messagingSenderId = process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID;
        }
        if (process.env.NEXT_PUBLIC_FIREBASE_APP_ID) {
          (config as any).appId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID;
        }
        
        app = initializeApp(config);
      }

      // Validate app has proper config before using it
      if (!app || !app.options || !app.options.apiKey || app.options.apiKey !== apiKey) {
        console.error("[Firebase] App missing required config (apiKey) or config mismatch");
        auth = null;
        db = null;
        return;
      }

      // Final validation before initializing auth/db
      const hasValidApiKey = app && app.options && app.options.apiKey && typeof app.options.apiKey === 'string' && app.options.apiKey.length > 0;
      
      if (!hasValidApiKey) {
        console.error("[Firebase] Cannot initialize - app missing valid apiKey");
        auth = null;
        db = null;
        return;
      }

      // Only get auth/db if app was successfully created and has valid config
      // Auth should only be initialized on client side
      if (typeof window !== "undefined") {
        try {
          // Triple-check: app exists, has options, and has non-empty apiKey
          if (app && app.options && app.options.apiKey && app.options.apiKey.trim().length > 0) {
            auth = getAuth(app);
            console.log("[Firebase] Auth initialized successfully");
          } else {
            throw new Error("App missing valid apiKey configuration");
          }
        } catch (authError: any) {
          console.error("[Firebase] Error initializing auth:", authError);
          console.error("[Firebase] App state:", { 
            hasApp: !!app, 
            hasOptions: !!(app && app.options), 
            hasApiKey: !!(app && app.options && app.options.apiKey),
            apiKeyValue: app && app.options ? app.options.apiKey : 'N/A'
          });
          auth = null;
        }
      } else {
        auth = null; // Auth not available on server side
      }
      
      // Firestore can be used on both client and server
      try {
        if (app && app.options && app.options.apiKey && app.options.apiKey.trim().length > 0) {
          db = getFirestore(app);
          console.log("[Firebase] Successfully initialized");
        } else {
          throw new Error("App missing valid apiKey configuration");
        }
      } catch (dbError: any) {
        console.error("[Firebase] Error initializing Firestore:", dbError);
        db = null;
      }
    } catch (error: any) {
      console.error("[Firebase] Initialization error:", error);
      auth = null;
      db = null;
      // Reset initPromise so we can retry
      initPromise = null;
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

// Note: We don't export auth and db directly to prevent premature access
// Always use getAuthInstance() and getDbInstance() instead

