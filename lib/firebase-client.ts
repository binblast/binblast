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
 * Get Firebase config from head script or environment variables
 */
function getFirebaseConfig(): any | null {
  if (typeof window === 'undefined') {
    // Server-side: use environment variables
    const apiKey = (process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "").trim();
    const projectId = (process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "").trim();
    const appId = (process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "").trim();
    const authDomain = (process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "").trim();

    if (!apiKey || !projectId || !appId) {
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
  } else {
    // Client-side: prefer head script config, fallback to env vars
    const headConfig = (window as any).__firebaseConfig;
    if (headConfig && headConfig.apiKey && headConfig.projectId && headConfig.appId) {
      return headConfig;
    }

    // Fallback to environment variables
    const apiKey = (process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "").trim();
    const projectId = (process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "").trim();
    const appId = (process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "").trim();
    const authDomain = (process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "").trim();

    if (!apiKey || !projectId || !appId) {
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
      // Wait for head script config if on client-side (with timeout)
      let config: any = null;
      if (typeof window !== 'undefined') {
        // Wait for head script to set config (with timeout)
        if (!(window as any).__firebaseConfig && !(window as any).__firebaseConfigReady) {
          const startTime = Date.now();
          const timeout = 2000; // 2 seconds max wait
          
          while (!(window as any).__firebaseConfig && Date.now() - startTime < timeout) {
            await new Promise(resolve => setTimeout(resolve, 50));
          }
        }
        
        // Prefer head script config if available
        const headConfig = (window as any).__firebaseConfig;
        if (headConfig && headConfig.apiKey && headConfig.projectId && headConfig.appId) {
          config = headConfig;
        }
      }
      
      // Fallback to getFirebaseConfig() if head script config not available
      if (!config) {
        config = getFirebaseConfig();
      }
      
      if (!config) {
        console.warn("[Firebase Client] Firebase config not available - Firebase features will not work");
        isInitialized = true;
        return;
      }

      // Import firebase/app
      const firebaseApp = await import("firebase/app");
      const { initializeApp, getApps } = firebaseApp;

      // Check if app already exists
      const existingApps = getApps();
      if (existingApps.length > 0) {
        // Use existing app
        app = existingApps[0];
        console.log("[Firebase Client] Using existing Firebase app");
      } else {
        // Initialize new app
        app = initializeApp(config);
        console.log("[Firebase Client] ✅ Firebase app initialized");
      }

      // Verify app has valid config
      if (!app.options?.apiKey || !app.options?.projectId || !app.options?.appId) {
        throw new Error("Firebase app missing required config (apiKey, projectId, appId)");
      }

      // Import auth and firestore AFTER app is initialized
      const [firebaseAuth, firebaseFirestore] = await Promise.all([
        import("firebase/auth"),
        import("firebase/firestore"),
      ]);

      // Get auth instance (client-side only)
      if (typeof window !== "undefined") {
        try {
          auth = firebaseAuth.getAuth(app);
          console.log("[Firebase Client] Auth initialized");
        } catch (error: any) {
          console.error("[Firebase Client] Failed to initialize auth:", error?.message);
          auth = null;
        }
      } else {
        auth = null;
      }

      // Get Firestore instance
      try {
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
        console.warn("[Firebase Client] Firebase initialization failed - likely during build or missing config");
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
  const authInstance = await getAuthInstance();
  if (!authInstance) {
    callback(null);
    return () => {};
  }
  const { onAuthStateChanged: firebaseOnAuthStateChanged } = await import("firebase/auth");
  return firebaseOnAuthStateChanged(authInstance, callback);
}

export async function signInWithEmailAndPassword(email: string, password: string) {
  const authInstance = await getAuthInstance();
  if (!authInstance) {
    throw new Error("Firebase auth is not available");
  }
  const { signInWithEmailAndPassword: firebaseSignIn } = await import("firebase/auth");
  return await firebaseSignIn(authInstance, email, password);
}

export async function createUserWithEmailAndPassword(email: string, password: string) {
  const authInstance = await getAuthInstance();
  if (!authInstance) {
    throw new Error("Firebase auth is not available");
  }
  const { createUserWithEmailAndPassword: firebaseCreateUser } = await import("firebase/auth");
  return await firebaseCreateUser(authInstance, email, password);
}

export async function signOut() {
  const authInstance = await getAuthInstance();
  if (!authInstance) {
    throw new Error("Firebase auth is not available");
  }
  const { signOut: firebaseSignOut } = await import("firebase/auth");
  return await firebaseSignOut(authInstance);
}

export async function updateProfile(user: any, profile: { displayName?: string; photoURL?: string }) {
  const authInstance = await getAuthInstance();
  if (!authInstance) {
    throw new Error("Firebase auth is not available");
  }
  const { updateProfile: firebaseUpdateProfile } = await import("firebase/auth");
  return await firebaseUpdateProfile(user, profile);
}

// Initialize Firebase early if on client-side
// This ensures Firebase is ready before page chunks load
if (typeof window !== 'undefined' && !process.env.NEXT_PHASE) {
  // Start initialization immediately (don't await - let it happen in background)
  initializeFirebase().catch(() => {
    // Silently handle errors - they'll be logged in initializeFirebase
  });
}

