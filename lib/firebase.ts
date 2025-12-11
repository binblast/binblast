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

// CRITICAL: Firebase app initialization is handled by lib/firebase-init-sync.ts
// This module should NOT initialize Firebase - it should only wait for sync init to complete
// and then get auth/firestore instances from the already-initialized app

async function ensureInitialized(): Promise<void> {
  // If already initialized or initialization in progress, return
  if (auth !== undefined && db !== undefined) {
    return;
  }
  if (initPromise) {
    return initPromise;
  }

  // CRITICAL: Firebase app initialization is handled by lib/firebase-init-sync.ts
  // This function should ONLY wait for sync init to complete, then get auth/firestore instances
  // It should NOT initialize Firebase itself - that causes duplicate initialization errors

  initPromise = (async () => {
    try {
      // CRITICAL: Skip during build
      if (process.env.NEXT_PHASE === 'phase-production-build' || 
          (typeof process.env.NODE_ENV !== 'undefined' && process.env.NODE_ENV === 'production' && !process.env.NEXT_PUBLIC_FIREBASE_API_KEY)) {
        console.warn("[Firebase] Skipping initialization during build phase");
        auth = null;
        db = null;
        return;
      }

      // CRITICAL: Wait for sync initialization FIRST - this is the SINGLE source of truth
      // Sync init uses config from window.__firebaseConfig set by head script
      if (typeof window !== 'undefined') {
        // Wait for sync init promise - this MUST complete before importing Firebase modules
        if ((window as any).__firebaseSyncInitPromise) {
          try {
            await (window as any).__firebaseSyncInitPromise;
          } catch (error) {
            console.warn("[Firebase] Sync initialization failed:", error);
            auth = null;
            db = null;
            return;
          }
        } else if (global.__firebaseSyncInitPromise) {
          // Fallback to global promise
          try {
            await global.__firebaseSyncInitPromise;
          } catch (error) {
            console.warn("[Firebase] Sync initialization failed:", error);
            auth = null;
            db = null;
            return;
          }
        } else {
          // No sync init - Firebase not initialized
          console.warn("[Firebase] No sync initialization found - Firebase may not be initialized");
          auth = null;
          db = null;
          return;
        }
        
        // CRITICAL: Verify Firebase app exists before proceeding
        // This prevents importing Firebase modules before app is initialized
        const firebaseApp = await import("firebase/app");
        const { getApps } = firebaseApp;
        const apps = getApps();
        
        if (apps.length === 0 || !apps[0].options?.apiKey || !apps[0].options?.projectId || !apps[0].options?.appId) {
          console.error("[Firebase] Firebase app not initialized or missing required config");
          auth = null;
          db = null;
          return;
        }
        
        // Use the app from sync init - it's already initialized
        app = apps[0];
        global.__firebaseApp = app;
        console.log("[Firebase] Using app from sync initialization");
        
        // CRITICAL: Only import auth/firestore AFTER app is verified to exist
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
        
        const getAuth = firebaseAuth.getAuth;
        const getFirestore = firebaseFirestore.getFirestore;
        
        // Get auth instance - only on client side
        if (typeof window !== "undefined") {
          try {
            // CRITICAL: Always pass app explicitly to prevent default app lookup
            auth = getAuth(app);
            console.log("[Firebase] Auth initialized successfully");
          } catch (getAuthError: any) {
            console.error("[Firebase] getAuth() failed:", getAuthError?.message || getAuthError);
            auth = null;
          }
        } else {
          auth = null; // Auth not available on server side
        }
        
        // Get Firestore instance
        try {
          // CRITICAL: Always pass app explicitly to prevent default app lookup
          db = getFirestore(app);
          console.log("[Firebase] Firestore initialized successfully");
        } catch (dbError: any) {
          console.error("[Firebase] Error initializing Firestore:", dbError?.message || dbError);
          db = null;
        }
      } else {
        // Server-side - don't initialize Firebase
        auth = null;
        db = null;
        return;
      }
    } catch (error: any) {
      // During build, Firebase initialization may fail - handle gracefully
      const errorMessage = error?.message || String(error);
      if (errorMessage.includes("apiKey") || errorMessage.includes("authenticator") || errorMessage === "FIREBASE_BUILD_ERROR") {
        console.warn("[Firebase] Initialization failed during build - this is expected. Skipping.");
        auth = null;
        db = null;
        return;
      }
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
  try {
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

