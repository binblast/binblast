// lib/firebase.ts
// IMPORTANT: This module uses lazy initialization to prevent Firebase from initializing
// at module load time, which can cause errors if environment variables aren't set.

// Store Firebase initialization state globally to prevent re-initialization
declare global {
  var __firebaseInitialized: boolean | undefined;
  var __firebaseApp: any | undefined;
}

let app: any = undefined;
let auth: any = undefined;
let db: any = undefined;
let initPromise: Promise<void> | null = null;

// CRITICAL: Initialize Firebase immediately in browser to prevent chunk loading errors
// This ensures Firebase app exists before any dynamic chunks try to use it
// Create a promise that will be resolved when Firebase is initialized
let globalInitPromise: Promise<void> | null = null;

if (typeof window !== 'undefined' && !global.__firebaseInitialized) {
  // Mark as initializing immediately to prevent race conditions
  global.__firebaseInitialized = true;
  
  // CRITICAL: Start initialization IMMEDIATELY and don't defer it
  // This ensures Firebase is initialized before any dynamic chunks can load
  globalInitPromise = (async () => {
    try {
      const apiKey = (process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "").trim();
      const projectId = (process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "").trim();
      const authDomain = (process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "").trim();
      
      // Only initialize if we have ALL required config
      if (apiKey && projectId && authDomain && apiKey.length > 0 && projectId.length > 0 && authDomain.length > 0) {
        // Import and initialize Firebase immediately (don't defer)
        const { initializeApp, getApps } = await import("firebase/app");
        
        // Check if app already exists
        const existingApps = getApps();
        if (existingApps.length > 0) {
          // Use existing app only if it has valid apiKey
          for (const existingApp of existingApps) {
            if (existingApp.options && existingApp.options.apiKey && typeof existingApp.options.apiKey === 'string' && existingApp.options.apiKey.length > 0) {
              app = existingApp;
              global.__firebaseApp = app;
              console.log("[Firebase] Using existing app from global initialization");
              return;
            }
          }
        }
        
        // Create new app only if we have valid config
        const config: any = {
          apiKey,
          authDomain,
          projectId,
        };
        
        if (process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET) {
          config.storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
        }
        if (process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID) {
          config.messagingSenderId = process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID;
        }
        if (process.env.NEXT_PUBLIC_FIREBASE_APP_ID) {
          config.appId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID;
        }
        
        app = initializeApp(config);
        global.__firebaseApp = app;
        console.log("[Firebase] Created app in global initialization");
      } else {
        console.warn("[Firebase] Missing environment variables - skipping global initialization");
      }
    } catch (error: any) {
      console.error("[Firebase] Global initialization error:", error?.message || error);
      // Don't throw - allow lazy initialization to handle it
    }
  })();
  
  // Don't await, but ensure it starts immediately
  // The promise is stored so other code can wait for it
}

async function ensureInitialized(): Promise<void> {
  // If already initialized or initialization in progress, return
  if (auth !== undefined && db !== undefined) {
    return;
  }
  if (initPromise) {
    return initPromise;
  }

  // CRITICAL: Wait for global initialization to complete before proceeding
  // This prevents race conditions where dynamic chunks try to use Firebase before it's ready
  if (globalInitPromise && typeof window !== 'undefined') {
    try {
      await globalInitPromise;
    } catch (error) {
      // Continue even if global init failed - will try lazy initialization
      console.warn("[Firebase] Global initialization promise failed, continuing with lazy init");
    }
  }

  initPromise = (async () => {
    // Wrap entire initialization in try-catch to handle build-time errors
    try {
      // CRITICAL: During Next.js build, environment variables may not be available
      // Skip initialization during build to prevent errors
      // Check if we're in a build context (Next.js sets NEXT_PHASE during build)
      if (process.env.NEXT_PHASE === 'phase-production-build' || 
          (typeof process.env.NODE_ENV !== 'undefined' && process.env.NODE_ENV === 'production' && !process.env.NEXT_PUBLIC_FIREBASE_API_KEY)) {
        console.warn("[Firebase] Skipping initialization during build phase");
        auth = null;
        db = null;
        return;
      }

      // Check environment variables FIRST before importing Firebase
      const apiKey = (process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "").trim();
      const projectId = (process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "").trim();
      const authDomain = (process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "").trim();

      // Only initialize if we have valid config
      if (!apiKey || !projectId || !authDomain || apiKey.length === 0 || projectId.length === 0 || authDomain.length === 0) {
        console.warn("[Firebase] Missing required environment variables. Firebase features will not work.");
        auth = null;
        db = null;
        return;
      }

      // Only import Firebase after confirming we have config
      // Wrap in try-catch to handle build-time errors gracefully
      let initializeApp: any, getApps: any, getAuth: any, getFirestore: any;
      try {
        // Use dynamic import with error handling
        const [firebaseApp, firebaseAuth, firebaseFirestore] = await Promise.all([
          import("firebase/app").catch((err) => {
            if (err?.message?.includes("apiKey") || err?.message?.includes("authenticator")) {
              throw new Error("FIREBASE_BUILD_ERROR");
            }
            throw err;
          }),
          import("firebase/auth").catch((err) => {
            if (err?.message?.includes("apiKey") || err?.message?.includes("authenticator")) {
              throw new Error("FIREBASE_BUILD_ERROR");
            }
            throw err;
          }),
          import("firebase/firestore").catch((err) => {
            if (err?.message?.includes("apiKey") || err?.message?.includes("authenticator")) {
              throw new Error("FIREBASE_BUILD_ERROR");
            }
            throw err;
          }),
        ]);
        initializeApp = firebaseApp.initializeApp;
        getApps = firebaseApp.getApps;
        getAuth = firebaseAuth.getAuth;
        getFirestore = firebaseFirestore.getFirestore;
      } catch (importError: any) {
        // If import fails (e.g., during build), gracefully handle it
        const errorMessage = importError?.message || String(importError);
        if (errorMessage.includes("apiKey") || errorMessage.includes("authenticator") || errorMessage === "FIREBASE_BUILD_ERROR") {
          console.warn("[Firebase] Firebase import failed - likely during build. Skipping initialization.");
          auth = null;
          db = null;
          return;
        }
        throw importError;
      }

      // CRITICAL: Check global app first (set during module load)
      if (global.__firebaseApp && global.__firebaseApp.options && global.__firebaseApp.options.apiKey) {
        app = global.__firebaseApp;
        console.log("[Firebase] Using global app instance");
      } else {
        // Check if app already exists and validate it has proper config
        const existingApps = getApps();
        let existingAppWithConfig = null;
        
        if (existingApps.length > 0) {
          // Find an existing app that matches our config OR has valid apiKey
          for (const existingApp of existingApps) {
            // Accept any app with a valid apiKey, not just exact match
            // This handles cases where Firebase is initialized from different chunks
            if (existingApp.options && existingApp.options.apiKey && typeof existingApp.options.apiKey === 'string' && existingApp.options.apiKey.length > 0) {
              // Prefer exact match, but accept any valid app
              if (existingApp.options.apiKey === apiKey) {
                existingAppWithConfig = existingApp;
                break;
              } else if (!existingAppWithConfig) {
                // Use first valid app as fallback
                existingAppWithConfig = existingApp;
              }
            }
          }
        }
        
        if (existingAppWithConfig) {
          app = existingAppWithConfig;
          global.__firebaseApp = app;
          console.log("[Firebase] Using existing app:", existingAppWithConfig.options?.apiKey?.substring(0, 10) + '...');
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
          
          try {
            app = initializeApp(config);
            global.__firebaseApp = app;
            console.log("[Firebase] Created new app instance");
          } catch (initError: any) {
            // If initialization fails, try to get existing app
            const apps = getApps();
            if (apps.length > 0) {
              app = apps[0];
              global.__firebaseApp = app;
              console.log("[Firebase] Initialization failed, using existing app:", apps[0].options?.apiKey?.substring(0, 10) + '...');
            } else {
              throw initError;
            }
          }
        }
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
          // If app doesn't have valid config, try to get existing app from Firebase
          if (!app || !app.options || !app.options.apiKey || app.options.apiKey.trim().length === 0) {
            const { getApps } = await import("firebase/app");
            const existingApps = getApps();
            if (existingApps.length > 0) {
              // Use first existing app that has apiKey
              for (const existingApp of existingApps) {
                if (existingApp.options && existingApp.options.apiKey && existingApp.options.apiKey.trim().length > 0) {
                  app = existingApp;
                  console.log("[Firebase] Using existing app from getApps()");
                  break;
                }
              }
            }
          }
          
          // Triple-check: app exists, has options, and has non-empty apiKey
          if (app && app.options && app.options.apiKey && typeof app.options.apiKey === 'string' && app.options.apiKey.trim().length > 0) {
            // Call getAuth with explicit app to prevent default app lookup
            try {
        auth = getAuth(app);
              console.log("[Firebase] Auth initialized successfully");
            } catch (getAuthError: any) {
              // If getAuth fails, don't crash - just set auth to null
              console.error("[Firebase] getAuth() failed:", getAuthError);
              auth = null;
            }
          } else {
            console.warn("[Firebase] App missing valid apiKey configuration - skipping auth initialization");
            auth = null;
          }
        } catch (authError: any) {
          // Check if this is the specific "Neither apiKey nor config.authenticator provided" error
          if (authError.message && authError.message.includes("apiKey") && authError.message.includes("authenticator")) {
            console.error("[Firebase] Firebase tried to initialize without apiKey - trying to recover");
            // Try to get existing app and use it
            try {
              const { getApps } = await import("firebase/app");
              const existingApps = getApps();
              if (existingApps.length > 0) {
                // Find an app with valid apiKey
                for (const existingApp of existingApps) {
                  if (existingApp.options && existingApp.options.apiKey && typeof existingApp.options.apiKey === 'string' && existingApp.options.apiKey.trim().length > 0) {
                    try {
                      auth = getAuth(existingApp);
                      console.log("[Firebase] Recovered by using existing app");
                      break;
                    } catch (getAuthErr: any) {
                      console.warn("[Firebase] getAuth failed for existing app:", getAuthErr?.message || getAuthErr);
                      continue;
                    }
                  }
                }
                if (!auth) {
                  auth = null;
                }
              } else {
                auth = null;
              }
            } catch (recoveryError: any) {
              console.error("[Firebase] Recovery failed:", recoveryError?.message || recoveryError);
              auth = null;
            }
          } else {
            console.error("[Firebase] Error initializing auth:", authError);
            auth = null;
          }
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
      // During build, Firebase initialization may fail - handle gracefully
      const errorMessage = error?.message || String(error);
      if (errorMessage.includes("apiKey") || errorMessage.includes("authenticator")) {
        console.warn("[Firebase] Initialization failed during build - this is expected. Skipping.");
        auth = null;
        db = null;
        // Don't reset initPromise - mark as completed (failed)
        return;
      }
      console.error("[Firebase] Initialization error:", error);
      auth = null;
      db = null;
      // Reset initPromise so we can retry
      initPromise = null;
      // Don't throw - allow getDbInstance to return null gracefully
    }
  })();

  return initPromise;
}

// Export getters that ensure initialization
export const getAuthInstance = async () => {
  try {
    // CRITICAL: Wait for global initialization first if it exists
    if (globalInitPromise && typeof window !== 'undefined') {
      try {
        await globalInitPromise;
      } catch (error) {
        // Continue even if global init failed
        console.warn("[Firebase] Global init promise failed, continuing with lazy init");
      }
    }
    
    await ensureInitialized();
    // Validate auth before returning
    if (auth && typeof auth === "object") {
      return auth;
    }
    return null;
  } catch (error: any) {
    console.warn("[Firebase] getAuthInstance error:", error?.message || error);
    return null;
  }
};

export const getDbInstance = async () => {
  // CRITICAL: Wait for global initialization first if it exists
  if (globalInitPromise && typeof window !== 'undefined') {
    try {
      await globalInitPromise;
    } catch (error) {
      // Continue even if global init failed
      console.warn("[Firebase] Global init promise failed, continuing with lazy init");
    }
  }
  
  try {
    await ensureInitialized();
    return db;
  } catch (error: any) {
    // During build, Firebase initialization may fail - return null gracefully
    const errorMessage = error?.message || String(error);
    if (errorMessage.includes("apiKey") || errorMessage.includes("authenticator")) {
      console.warn("[Firebase] getDbInstance failed - likely during build. Returning null.");
      return null;
    }
    // For other errors, still return null to prevent crashes
    console.warn("[Firebase] getDbInstance error:", errorMessage);
    return null;
  }
};

// Note: We don't export auth and db directly to prevent premature access
// Always use getAuthInstance() and getDbInstance() instead

