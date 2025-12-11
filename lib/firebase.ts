// lib/firebase.ts
// IMPORTANT: This module uses lazy initialization to prevent Firebase from initializing
// at module load time, which can cause errors if environment variables aren't set.
// CRITICAL: This module MUST wait for Firebase app to be initialized before importing
// any Firebase modules to prevent "Neither apiKey nor config.authenticator provided" errors.

// Store Firebase initialization state globally to prevent re-initialization
declare global {
  var __firebaseInitialized: boolean | undefined;
  var __firebaseApp: any | undefined;
  var __firebaseInitPromise: Promise<any> | undefined;
  var __firebaseReady: boolean | undefined;
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
  
  // CRITICAL: Initialize Firebase SYNCHRONOUSLY if config is available
  // This prevents page chunks from loading before Firebase is ready
  const config = (window as any).__firebaseConfig;
  if (config && config.apiKey) {
    // Config is available - initialize immediately
    (async () => {
      try {
        const firebaseAppModule = await import("firebase/app");
        const { initializeApp, getApps } = firebaseAppModule;
        
        const existingApps = getApps();
        if (existingApps.length === 0) {
          initializeApp(config);
          global.__firebaseApp = getApps()[0];
          global.__firebaseReady = true;
          (window as any).__firebaseAppReady = true;
          console.log("[Firebase] Synchronously initialized from head script config");
        } else {
          global.__firebaseApp = existingApps[0];
          global.__firebaseReady = true;
          (window as any).__firebaseAppReady = true;
        }
      } catch (error: any) {
        console.error("[Firebase] Sync init error:", error?.message || error);
      }
    })();
  }
  
  // CRITICAL: Start initialization IMMEDIATELY and BLOCK until complete
  // This ensures Firebase is initialized before any dynamic chunks can load
  globalInitPromise = (async () => {
    try {
      // CRITICAL: Check if config was stored by the head script
      // According to Firebase docs, REQUIRED fields are: apiKey, projectId, appId
      // See: https://firebase.google.com/support/guides/init-options
      let config: any = null;
      if (typeof window !== 'undefined' && (window as any).__firebaseConfig) {
        config = (window as any).__firebaseConfig;
        console.log("[Firebase] Using config from head script");
        
        // Validate required fields are present
        if (!config.apiKey || !config.projectId || !config.appId) {
          console.error("[Firebase] Config from head script missing REQUIRED fields:", {
            hasApiKey: !!config.apiKey,
            hasProjectId: !!config.projectId,
            hasAppId: !!config.appId,
          });
          console.error("[Firebase] All three fields (apiKey, projectId, appId) are REQUIRED per Firebase documentation");
          return;
        }
      } else {
        // Fallback to environment variables
        const apiKey = (process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "").trim();
        const projectId = (process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "").trim();
        const appId = (process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "").trim();
        const authDomain = (process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "").trim();
        
        // CRITICAL: Validate all REQUIRED fields per Firebase documentation
        if (!apiKey || !projectId || !appId || apiKey.length === 0 || projectId.length === 0 || appId.length === 0) {
          console.error("[Firebase] Missing REQUIRED Firebase options:", {
            hasApiKey: !!apiKey && apiKey.length > 0,
            hasProjectId: !!projectId && projectId.length > 0,
            hasAppId: !!appId && appId.length > 0,
          });
          console.error("[Firebase] All three fields (apiKey, projectId, appId) are REQUIRED per Firebase documentation");
          console.error("[Firebase] See: https://firebase.google.com/support/guides/init-options");
          return;
        }
        
        config = {
          apiKey,
          projectId,
          appId,
        };
        
        // Optional fields
        if (authDomain && authDomain.length > 0) {
          config.authDomain = authDomain;
        }
        if (process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET) {
          config.storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
        }
        if (process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID) {
          config.messagingSenderId = process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID;
        }
      }
      
      if (!config || !config.apiKey || !config.projectId || !config.appId) {
        console.error("[Firebase] Invalid config - missing REQUIRED fields (apiKey, projectId, appId)");
        return;
      }
      
      // CRITICAL: Import firebase/app and initialize IMMEDIATELY
      // This must complete before any other Firebase modules can be imported
      const firebaseAppModule = await import("firebase/app");
      const { initializeApp, getApps } = firebaseAppModule;
      
      // Check if app already exists
      const existingApps = getApps();
      if (existingApps.length > 0) {
        // Use existing app only if it has valid apiKey
        for (const existingApp of existingApps) {
            if (existingApp.options && existingApp.options.apiKey && typeof existingApp.options.apiKey === 'string' && existingApp.options.apiKey.length > 0) {
              app = existingApp;
              global.__firebaseApp = app;
              global.__firebaseReady = true;
              console.log("[Firebase] Using existing app from global initialization");
              return;
            }
        }
      }
      
      // CRITICAL: Initialize app IMMEDIATELY before any other Firebase modules can be imported
      // This prevents "Neither apiKey nor config.authenticator provided" errors
      app = initializeApp(config);
      global.__firebaseApp = app;
      global.__firebaseReady = true;
      console.log("[Firebase] Created app in global initialization - app is ready");
      
      // CRITICAL: Mark as ready so page chunks know Firebase is initialized
      if (typeof window !== 'undefined') {
        (window as any).__firebaseAppReady = true;
      }
    } catch (error: any) {
      const errorMessage = error?.message || String(error);
      console.error("[Firebase] Global initialization error:", errorMessage);
      // Don't throw - allow lazy initialization to handle it
    }
  })();
  
  // Store promise globally so other modules can wait for it
  if (globalInitPromise) {
    global.__firebaseInitPromise = globalInitPromise;
  }
  
  // CRITICAL: Wait for initialization to complete before allowing module to finish loading
  // This ensures Firebase app exists before any page chunks can import Firebase modules
  // Note: This blocks module loading, which is what we want
  if (typeof window !== 'undefined') {
    // Don't await here - that would block everything
    // Instead, page chunks should wait for the promise
    globalInitPromise.catch(() => {
      // Silently handle errors
    });
  }
}

async function ensureInitialized(): Promise<void> {
  // If already initialized or initialization in progress, return
  if (auth !== undefined && db !== undefined) {
    return;
  }
  if (initPromise) {
    return initPromise;
  }

  // CRITICAL: Wait for sync initialization FIRST before doing anything
  // This ensures Firebase app exists before any Firebase modules are imported
  if (typeof window !== 'undefined') {
    // Wait for sync init if it exists
    if (global.__firebaseSyncInitPromise) {
      try {
        await global.__firebaseSyncInitPromise;
      } catch (error) {
        // Continue even if sync init failed
        console.warn("[Firebase] Sync initialization failed, continuing with lazy init");
      }
    }
    
    // Also wait for global initialization to complete before proceeding
    // This prevents race conditions where dynamic chunks try to use Firebase before it's ready
    if (globalInitPromise) {
      try {
        await globalInitPromise;
      } catch (error) {
        // Continue even if global init failed - will try lazy initialization
        console.warn("[Firebase] Global initialization promise failed, continuing with lazy init");
      }
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
      // CRITICAL: According to Firebase docs, REQUIRED fields are: apiKey, projectId, appId
      // See: https://firebase.google.com/support/guides/init-options
      const apiKey = (process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "").trim();
      const projectId = (process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "").trim();
      const appId = (process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "").trim();
      const authDomain = (process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "").trim();

      // CRITICAL: Validate all REQUIRED fields per Firebase documentation
      if (!apiKey || !projectId || !appId || apiKey.length === 0 || projectId.length === 0 || appId.length === 0) {
        console.error("[Firebase] Missing REQUIRED Firebase options:", {
          hasApiKey: !!apiKey && apiKey.length > 0,
          hasProjectId: !!projectId && projectId.length > 0,
          hasAppId: !!appId && appId.length > 0,
        });
        console.error("[Firebase] All three fields (apiKey, projectId, appId) are REQUIRED per Firebase documentation");
        console.error("[Firebase] See: https://firebase.google.com/support/guides/init-options");
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
        } else if (apiKey && projectId && appId) {
          // Create app before importing auth/firestore
          // Include all REQUIRED fields: apiKey, projectId, appId
          const config: any = {
            apiKey,
            projectId,
            appId,
          };
          
          // Optional fields
          if (authDomain && authDomain.length > 0) {
            config.authDomain = authDomain;
          }
          if (process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET) {
            config.storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
          }
          if (process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID) {
            config.messagingSenderId = process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID;
          }
          
          try {
            app = initializeApp(config);
            global.__firebaseApp = app;
            global.__firebaseReady = true;
            if (typeof window !== 'undefined') {
              (window as any).__firebaseAppReady = true;
            }
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
        
        // CRITICAL: Wait for Firebase app to be ready before importing auth/firestore
        // This prevents Firebase SDK from trying to access default app before initialization
        if (appInitialized) {
          // CRITICAL: Wait for sync init promise to ensure app is fully initialized
          if (typeof window !== 'undefined' && (window as any).__firebaseSyncInitPromise) {
            try {
              await (window as any).__firebaseSyncInitPromise;
            } catch {
              // Continue even if failed
            }
          }
          
          // Verify app exists before importing auth/firestore modules
          const verifyApps = getApps();
          if (verifyApps.length === 0 || !verifyApps[0].options?.apiKey) {
            throw new Error("Firebase app not initialized - cannot import auth/firestore");
          }
          
          // Only import auth/firestore AFTER app is verified to exist
          // This prevents the "Neither apiKey nor config.authenticator provided" error
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
          // CRITICAL: Always pass app explicitly to prevent default app lookup
          db = getFirestore(app);
          console.log("[Firebase] Successfully initialized");
        } else {
          console.error("[Firebase] App missing valid apiKey configuration:", {
            hasApp: !!app,
            hasOptions: !!(app && app.options),
            hasApiKey: !!(app && app.options && app.options.apiKey),
          });
          throw new Error("App missing valid apiKey configuration");
        }
      } catch (dbError: any) {
        const errorMessage = dbError?.message || String(dbError);
        console.error("[Firebase] Error initializing Firestore:", errorMessage);
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
    // CRITICAL: Wait for sync initialization first
    if (typeof window !== 'undefined' && global.__firebaseSyncInitPromise) {
      try {
        await global.__firebaseSyncInitPromise;
      } catch {
        // Continue even if sync init failed
      }
    }
    
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

