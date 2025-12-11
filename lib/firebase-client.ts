// lib/firebase-client.ts
// Single, shared Firebase client module
// This is the ONLY place Firebase should be initialized
// All other modules should import from here

// Store Firebase instances
let app: any = undefined;
let auth: any = undefined;
let db: any = undefined;
let initPromise: Promise<void> | null = null;
let isInitialized = false;

/**
 * Get Firebase config from environment variables
 * This is the ONLY source of Firebase configuration
 */
function getFirebaseConfig(): any | null {
  const apiKey = (process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "").trim();
  const projectId = (process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "").trim();
  const appId = (process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "").trim();
  const authDomain = (process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "").trim();

  if (!apiKey || !projectId || !appId) {
    // Surface which vars are missing without leaking values
    const missing: string[] = [];
    if (!apiKey) missing.push("NEXT_PUBLIC_FIREBASE_API_KEY");
    if (!projectId) missing.push("NEXT_PUBLIC_FIREBASE_PROJECT_ID");
    if (!appId) missing.push("NEXT_PUBLIC_FIREBASE_APP_ID");
    console.error("[Firebase Client] Missing required Firebase env vars:", missing);
    return null;
  }

  const config: any = {
    apiKey,
    projectId,
    appId,
  };

  if (authDomain) {
    config.authDomain = authDomain;
  }
  if (process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET) {
    config.storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
  }
  if (process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID) {
    config.messagingSenderId = process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID;
  }

  return config;
}

/**
 * Initialize Firebase app (called once)
 */
async function initializeFirebase(): Promise<void> {
  // Skip during build
  if (process.env.NEXT_PHASE === 'phase-production-build') {
    console.warn("[Firebase Client] Skipping initialization during build");
    return;
  }

  // If already initialized, return
  if (isInitialized && app) {
    return;
  }

  // If initialization in progress, wait for it
  if (initPromise) {
    return initPromise;
  }

  initPromise = (async () => {
    try {
      // Get config from environment variables (the ONLY source)
      const config = getFirebaseConfig();
      
      if (!config) {
        // Reject so callers can surface a meaningful message instead of falling through to Firebase's internal error
        throw new Error("Firebase config not available. Check NEXT_PUBLIC_FIREBASE_API_KEY/PROJECT_ID/APP_ID on this deployment.");
      }

      // CRITICAL: Import firebase/app FIRST and initialize BEFORE importing auth/firestore
      // This prevents "Neither apiKey nor config.authenticator provided" errors
      const firebaseApp = await import("firebase/app");
      const { initializeApp, getApps, getApp } = firebaseApp;

      // Check if app already exists
      const existingApps = getApps();
      if (existingApps.length > 0) {
        // Use existing app
        app = existingApps[0];
        console.log("[Firebase Client] Using existing Firebase app");
      } else {
        // Initialize new app as DEFAULT app (no name parameter)
        // CRITICAL: This ensures firebase/auth can find the default app when imported
        app = initializeApp(config);
        console.log("[Firebase Client] ✅ Firebase app initialized as default app");
      }
      
      // CRITICAL: Verify default app exists and is accessible
      // firebase/auth module looks for default app when imported
      try {
        const defaultApp = getApp();
        if (defaultApp !== app) {
          console.warn("[Firebase Client] Default app mismatch - this may cause auth errors");
        }
      } catch (error) {
        // No default app - this will cause firebase/auth to fail
        throw new Error("Firebase default app not accessible - firebase/auth will fail");
      }

      // Verify app has valid config
      if (!app.options?.apiKey || !app.options?.projectId || !app.options?.appId) {
        throw new Error("Firebase app missing required config (apiKey, projectId, appId)");
      }

      // CRITICAL: Mark app as ready on window so page chunks can check
      if (typeof window !== 'undefined') {
        (window as any).__firebaseAppReady = true;
        (window as any).__firebaseApp = app;
      }

      // CRITICAL: Only import auth/firestore AFTER app is initialized
      // This prevents the "Neither apiKey nor config.authenticator provided" error
      // At this point, app is already initialized and marked as ready on window
      // We've verified app has valid config above, so it's safe to import modules
      
      // CRITICAL: Double-check app exists and has config before importing Firebase modules
      // Firebase modules have top-level code that runs on import and will fail if app isn't ready
      if (!app || !app.options?.apiKey) {
        throw new Error("Firebase app not ready - cannot import auth/firestore modules");
      }
      
      // CRITICAL: Verify app is actually initialized in Firebase's registry
      // Sometimes getApps() returns an app that isn't fully initialized
      const registryApps = getApps();
      const ourApp = registryApps.find((a: any) => a.options?.apiKey === app.options?.apiKey);
      if (!ourApp || !ourApp.options?.apiKey) {
        throw new Error("Firebase app not properly initialized in registry");
      }
      
      // CRITICAL: Wait a tick to ensure app is fully registered before importing modules
      // This prevents race conditions where firebase/auth tries to access default app
      await new Promise(resolve => setTimeout(resolve, 0));
      
      // Now safe to import - app is guaranteed to exist with valid config
      // CRITICAL: Import these modules AFTER app is fully initialized and registered
      const [firebaseAuth, firebaseFirestore] = await Promise.all([
        import("firebase/auth"),
        import("firebase/firestore"),
      ]);

      // Get auth instance (client-side only)
      if (typeof window !== "undefined") {
        try {
          // CRITICAL: Always pass app explicitly to prevent default app lookup
          // CRITICAL: getAuth() MUST be called with the app instance, never without
          // Calling getAuth() without an app causes it to look for default app, which may not exist
          auth = firebaseAuth.getAuth(app);
          
          // CRITICAL: Verify auth instance was created successfully
          if (!auth) {
            throw new Error("getAuth() returned null");
          }
          
          console.log("[Firebase Client] Auth initialized");
        } catch (error: any) {
          const errorMsg = error?.message || String(error);
          console.error("[Firebase Client] Failed to initialize auth:", errorMsg);
          // If error is about apiKey/authenticator, the app wasn't ready when firebase/auth imported
          if (errorMsg.includes("apiKey") || errorMsg.includes("authenticator")) {
            throw new Error(`Firebase auth module imported before app was ready: ${errorMsg}`);
          }
          auth = null;
        }
      } else {
        auth = null;
      }

      // Get Firestore instance
      try {
        // CRITICAL: Always pass app explicitly to prevent default app lookup
        db = firebaseFirestore.getFirestore(app);
        console.log("[Firebase Client] Firestore initialized");
      } catch (error: any) {
        console.error("[Firebase Client] Failed to initialize Firestore:", error?.message);
        db = null;
      }

      isInitialized = true;
    } catch (error: any) {
      const errorMsg = error?.message || String(error);
      if (errorMsg.includes("apiKey") || errorMsg.includes("authenticator")) {
        console.error("[Firebase Client] Firebase initialization failed - likely missing env vars or app config:", errorMsg);
        if (typeof window !== "undefined") {
          console.error("[Firebase Client] Check NEXT_PUBLIC_FIREBASE_* env vars on this deployment.");
        }
      } else {
        console.error("[Firebase Client] Firebase initialization error:", errorMsg);
      }
      isInitialized = true; // Mark as initialized even if failed
      app = null;
      auth = null;
      db = null;
    }
  })();

  return initPromise;
}

/**
 * Get Firebase app instance
 */
export async function getFirebaseApp(): Promise<any> {
  // CRITICAL: Wait for early initialization promise if it exists
  // This ensures we don't start a second initialization
  if (typeof window !== 'undefined' && (window as any).__firebaseClientInitPromise) {
    try {
      await (window as any).__firebaseClientInitPromise;
      // If early init completed and we have an app, return it
      if (app) {
        return app;
      }
    } catch {
      // Early init failed - continue with normal initialization
    }
  }
  
  await initializeFirebase();
  return app;
}

/**
 * Get Firebase auth instance
 */
export async function getAuthInstance(): Promise<any> {
  await initializeFirebase();
  return auth;
}

/**
 * Get Firestore instance
 */
export async function getDbInstance(): Promise<any> {
  await initializeFirebase();
  return db;
}

/**
 * Check if Firebase is initialized and ready
 */
export async function isFirebaseReady(): Promise<boolean> {
  try {
    await initializeFirebase();
    return !!(app && (auth || db));
  } catch {
    return false;
  }
}

// Re-export Firebase auth functions for convenience
export async function onAuthStateChanged(callback: (user: any) => void) {
  // CRITICAL: Wait for Firebase to be initialized before importing auth module
  const authInstance = await getAuthInstance();
  if (!authInstance) {
    callback(null);
    return () => {};
  }
  // Use safe import to ensure app exists before importing auth module
  const { safeImportAuth } = await import("./firebase-module-loader");
  const firebaseAuth = await safeImportAuth();
  return firebaseAuth.onAuthStateChanged(authInstance, callback);
}

export async function signInWithEmailAndPassword(email: string, password: string) {
  // CRITICAL: Wait for Firebase to be initialized before importing auth module
  const authInstance = await getAuthInstance();
  if (!authInstance) {
    throw new Error("Firebase auth is not available");
  }
  // Use safe import to ensure app exists before importing auth module
  const { safeImportAuth } = await import("./firebase-module-loader");
  const firebaseAuth = await safeImportAuth();
  return await firebaseAuth.signInWithEmailAndPassword(authInstance, email, password);
}

export async function createUserWithEmailAndPassword(email: string, password: string) {
  // CRITICAL: Wait for Firebase to be initialized before importing auth module
  const authInstance = await getAuthInstance();
  if (!authInstance) {
    throw new Error("Firebase auth is not available");
  }
  // Use safe import to ensure app exists before importing auth module
  const { safeImportAuth } = await import("./firebase-module-loader");
  const firebaseAuth = await safeImportAuth();
  return await firebaseAuth.createUserWithEmailAndPassword(authInstance, email, password);
}

export async function signOut() {
  // CRITICAL: Wait for Firebase to be initialized before importing auth module
  const authInstance = await getAuthInstance();
  if (!authInstance) {
    throw new Error("Firebase auth is not available");
  }
  // Use safe import to ensure app exists before importing auth module
  const { safeImportAuth } = await import("./firebase-module-loader");
  const firebaseAuth = await safeImportAuth();
  return await firebaseAuth.signOut(authInstance);
}

export async function updateProfile(user: any, profile: { displayName?: string; photoURL?: string }) {
  // CRITICAL: Wait for Firebase to be initialized before importing auth module
  const authInstance = await getAuthInstance();
  if (!authInstance) {
    throw new Error("Firebase auth is not available");
  }
  // Use safe import to ensure app exists before importing auth module
  const { safeImportAuth } = await import("./firebase-module-loader");
  const firebaseAuth = await safeImportAuth();
  return await firebaseAuth.updateProfile(user, profile);
}

// Initialize Firebase early if on client-side
// This ensures Firebase is ready before page chunks load
// CRITICAL: Start initialization immediately when module loads
// Store promise globally so all Firebase imports can wait for it
// CRITICAL: This file is now statically imported in FirebaseGate (root layout)
// so it's guaranteed to be in the main bundle and will initialize before page chunks
if (typeof window !== 'undefined' && !process.env.NEXT_PHASE) {
  // CRITICAL: Start initialization immediately and store promise BEFORE any page chunks can load
  // This promise MUST be available immediately so page chunks can wait for it
  const initPromise = initializeFirebase().catch((error) => {
    // Log errors but don't throw - allow app to continue
    const errorMsg = error?.message || String(error);
    // Don't log "Failed to resolve module specifier" - that's expected if head script tried to import
    if (!errorMsg.includes("Failed to resolve module specifier")) {
      console.error("[Firebase Client] Early initialization error:", errorMsg);
    }
  });
  
  // Store promise on window IMMEDIATELY so page chunks can wait for it
  (window as any).__firebaseClientInitPromise = initPromise;
  
  // CRITICAL: Also store on global for modules that check global
  if (typeof global !== 'undefined') {
    (global as any).__firebaseClientInitPromise = initPromise;
  }
  
  // CRITICAL: Also store a flag that indicates initialization has started
  // This allows page chunks to detect if initialization is in progress
  (window as any).__firebaseInitStarted = true;
}
