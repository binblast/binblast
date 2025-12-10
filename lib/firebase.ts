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
        // CRITICAL: Import firebase/app first and ensure app exists before importing auth/firestore
        // This prevents Firebase SDK from trying to access default app before initialization
        const firebaseApp = await import("firebase/app").catch((err) => {
          if (err?.message?.includes("apiKey") || err?.message?.includes("authenticator")) {
            throw new Error("FIREBASE_BUILD_ERROR");
          }
          throw err;
        });
        initializeApp = firebaseApp.initializeApp;
        getApps = firebaseApp.getApps;
        
        // Check if app already exists before importing auth/firestore
        // This prevents Firebase SDK from trying to create a default app
        const existingApps = getApps();
        let appExists = false;
        if (existingApps.length > 0) {
          for (const existingApp of existingApps) {
            if (existingApp.options && existingApp.options.apiKey && typeof existingApp.options.apiKey === 'string' && existingApp.options.apiKey.length > 0) {
              appExists = true;
              break;
            }
          }
        }
        
        // CRITICAL: Initialize app FIRST before importing auth/firestore
        // This prevents Firebase SDK from trying to access default app before initialization
        let appInitialized = false;
        if (appExists) {
          appInitialized = true;
        } else if (apiKey && projectId && authDomain) {
          // Create app before importing auth/firestore
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
          
          try {
            app = initializeApp(config);
            global.__firebaseApp = app;
            appInitialized = true;
            console.log("[Firebase] App initialized before importing auth/firestore");
          } catch (initErr: any) {
            // If initialization fails, check for existing apps
            const apps = getApps();
            if (apps.length > 0) {
              app = apps[0];
              global.__firebaseApp = app;
              appInitialized = true;
            } else {
              throw new Error("FIREBASE_BUILD_ERROR");
            }
          }
        } else {
          throw new Error("FIREBASE_BUILD_ERROR");
        }
        
        // Only import auth/firestore AFTER app is initialized
        // This prevents the "Neither apiKey nor config.authenticator provided" error
        if (appInitialized) {
          const [firebaseAuth, firebaseFirestore] = await Promise.all([
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
          getAuth = firebaseAuth.getAuth;
          getFirestore = firebaseFirestore.getFirestore;
        } else {
          throw new Error("FIREBASE_BUILD_ERROR");
        }
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

      // CRITICAL: Use the app we just initialized (or found) above
      // If app was already set during initialization above, use it
      // Otherwise, check global app or existing apps
      if (!app) {
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
          }
        }
      }
      
      // Ensure app exists and has valid config
      if (!app || !app.options || !app.options.apiKey || app.options.apiKey.trim().length === 0) {
        console.error("[Firebase] App missing required config (apiKey)");
        auth = null;
        db = null;
        return;
      }

      // Only get auth/db if app was successfully created and has valid config
      // Auth should only be initialized on client side
      // App is already validated above, so we can safely initialize auth
      if (typeof window !== "undefined") {
        try {
          // Call getAuth with explicit app to prevent default app lookup
          // App is guaranteed to exist and have valid config at this point
          auth = getAuth(app);
          console.log("[Firebase] Auth initialized successfully");
        } catch (getAuthError: any) {
          // If getAuth fails, don't crash - just set auth to null
          console.error("[Firebase] getAuth() failed:", getAuthError?.message || getAuthError);
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

// Helper functions to safely use Firebase auth functions
// These ensure Firebase is initialized before importing auth modules
export const onAuthStateChanged = async (callback: (user: any) => void) => {
  try {
    const authInstance = await getAuthInstance();
    if (!authInstance) {
      callback(null);
      return () => {};
    }
    
    // Import onAuthStateChanged only after auth is initialized
    const { onAuthStateChanged: firebaseOnAuthStateChanged } = await import("firebase/auth");
    return firebaseOnAuthStateChanged(authInstance, callback);
  } catch (error: any) {
    console.warn("[Firebase] onAuthStateChanged error:", error?.message || error);
    callback(null);
    return () => {};
  }
};

export const signInWithEmailAndPassword = async (email: string, password: string) => {
  try {
    const authInstance = await getAuthInstance();
    if (!authInstance) {
      throw new Error("Firebase auth is not available");
    }
    
    const { signInWithEmailAndPassword: firebaseSignIn } = await import("firebase/auth");
    return await firebaseSignIn(authInstance, email, password);
  } catch (error: any) {
    console.error("[Firebase] signInWithEmailAndPassword error:", error?.message || error);
    throw error;
  }
};

export const createUserWithEmailAndPassword = async (email: string, password: string) => {
  try {
    const authInstance = await getAuthInstance();
    if (!authInstance) {
      throw new Error("Firebase auth is not available");
    }
    
    const { createUserWithEmailAndPassword: firebaseCreateUser } = await import("firebase/auth");
    return await firebaseCreateUser(authInstance, email, password);
  } catch (error: any) {
    console.error("[Firebase] createUserWithEmailAndPassword error:", error?.message || error);
    throw error;
  }
};

export const signOut = async () => {
  try {
    const authInstance = await getAuthInstance();
    if (!authInstance) {
      throw new Error("Firebase auth is not available");
    }
    
    const { signOut: firebaseSignOut } = await import("firebase/auth");
    return await firebaseSignOut(authInstance);
  } catch (error: any) {
    console.error("[Firebase] signOut error:", error?.message || error);
    throw error;
  }
};

export const updateProfile = async (user: any, profile: { displayName?: string; photoURL?: string }) => {
  try {
    const authInstance = await getAuthInstance();
    if (!authInstance) {
      throw new Error("Firebase auth is not available");
    }
    
    const { updateProfile: firebaseUpdateProfile } = await import("firebase/auth");
    return await firebaseUpdateProfile(user, profile);
  } catch (error: any) {
    console.error("[Firebase] updateProfile error:", error?.message || error);
    throw error;
  }
};

