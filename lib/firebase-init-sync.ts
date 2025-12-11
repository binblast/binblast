// lib/firebase-init-sync.ts
// This module ensures Firebase is initialized synchronously before any dynamic chunks load
// It's imported in the root layout to run before React hydrates
// CRITICAL: This module MUST initialize Firebase before any page chunks can execute

import { logFirebaseEnvStatus } from "./firebase-env-check";

// CRITICAL: Export a function that blocks until Firebase is initialized
// This can be called by modules that need to ensure Firebase is ready
export async function ensureFirebaseReady(): Promise<void> {
  if (typeof window === 'undefined') return;
  
  // Wait for sync init promise
  if ((window as any).__firebaseSyncInitPromise) {
    await (window as any).__firebaseSyncInitPromise;
  }
  
  // Verify app exists
  try {
    const firebaseApp = await import("firebase/app");
    const { getApps } = firebaseApp;
    const apps = getApps();
    if (apps.length > 0 && apps[0].options?.apiKey) {
      return;
    }
  } catch {
    // App not ready yet
  }
  
  // Wait a bit more if needed
  await new Promise(resolve => setTimeout(resolve, 100));
}

// Store initialization promise and state globally
declare global {
  var __firebaseSyncInitPromise: Promise<void> | undefined;
  var __firebaseSyncInitialized: boolean | undefined;
  var __firebaseAppReady: boolean | undefined;
}

// CRITICAL: Skip initialization during Next.js build
// During build, Next.js executes this module, but Firebase shouldn't initialize
if (typeof window !== 'undefined' && !process.env.NEXT_PHASE) {
  // Prevent multiple initializations
  if (!global.__firebaseSyncInitPromise && !global.__firebaseSyncInitialized) {
    // Log environment variable status for debugging
    logFirebaseEnvStatus();
    
    // CRITICAL: Check if config is available from head script and initialize IMMEDIATELY
    // According to Firebase docs, REQUIRED fields are: apiKey, projectId, appId
    // See: https://firebase.google.com/support/guides/init-options
    // This MUST complete before any page chunks can execute their imports
    const headConfig = (window as any).__firebaseConfig;
    const shouldInit = (window as any).__firebaseShouldInit;
    
    if (headConfig && headConfig.apiKey && headConfig.projectId && headConfig.appId && shouldInit) {
      // All required fields are present - initialize IMMEDIATELY
      // CRITICAL: This MUST complete before any page chunks can execute their imports
      // Use a blocking approach by starting initialization immediately and storing the promise
      global.__firebaseSyncInitPromise = (async () => {
        try {
          console.log("[Firebase Sync Init] Starting immediate initialization from head script config");
          
          // CRITICAL: Import firebase/app FIRST - this is the only way to initialize
          // Use dynamic import to ensure we can catch errors
          let firebaseApp: any;
          try {
            firebaseApp = await import("firebase/app");
          } catch (importError: any) {
            console.error("[Firebase Sync Init] Failed to import firebase/app:", importError?.message || importError);
            throw importError;
          }
          
          const { initializeApp, getApps } = firebaseApp;
          
          // Check if app already exists
          const existingApps = getApps();
          if (existingApps.length === 0) {
            // No app exists - create one immediately
            const app = initializeApp(headConfig);
            global.__firebaseSyncInitialized = true;
            global.__firebaseAppReady = true;
            (window as any).__firebaseAppReady = true;
            (window as any).__firebaseSyncInitPromise = global.__firebaseSyncInitPromise;
            console.log("[Firebase Sync Init] Firebase app initialized successfully (apiKey, projectId, appId validated)");
            console.log("[Firebase Sync Init] App name:", app.name);
            console.log("[Firebase Sync Init] Firebase is now ready - page chunks can safely import Firebase modules");
          } else {
            // Verify existing app has all required fields
            const existingApp = existingApps[0];
            if (existingApp.options?.apiKey && existingApp.options?.projectId && existingApp.options?.appId) {
              global.__firebaseSyncInitialized = true;
              global.__firebaseAppReady = true;
              (window as any).__firebaseAppReady = true;
              (window as any).__firebaseSyncInitPromise = global.__firebaseSyncInitPromise;
              console.log("[Firebase Sync Init] Using existing Firebase app with valid config");
            } else {
              // Existing app is invalid, create new one
              const app = initializeApp(headConfig);
              global.__firebaseSyncInitialized = true;
              global.__firebaseAppReady = true;
              (window as any).__firebaseAppReady = true;
              (window as any).__firebaseSyncInitPromise = global.__firebaseSyncInitPromise;
              console.log("[Firebase Sync Init] Created new Firebase app (existing app was invalid)");
            }
          }
        } catch (error: any) {
          console.error("[Firebase Sync Init] Immediate init error:", error?.message || error);
          global.__firebaseSyncInitialized = true;
          // Still store promise so other modules know initialization was attempted
          (window as any).__firebaseSyncInitPromise = global.__firebaseSyncInitPromise;
        }
      })();
      
      // CRITICAL: Store promise on window IMMEDIATELY so other modules can wait for it
      // This promise MUST complete before any Firebase modules can be imported
      if (global.__firebaseSyncInitPromise) {
        (window as any).__firebaseSyncInitPromise = global.__firebaseSyncInitPromise;
        
        // Start the promise immediately - don't await (would cause syntax error)
        // The promise will complete asynchronously, and other modules will wait for it
        global.__firebaseSyncInitPromise.catch((error) => {
          console.warn("[Firebase Sync Init] Initialization failed:", error);
        });
      }
    } else {
      // Fallback to async initialization with env vars
      // Initialize Firebase immediately when this module loads
      // This happens before any page components can load
      // Only run in browser (not server) and not during build
      global.__firebaseSyncInitPromise = (async () => {
        try {
        const apiKey = (process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "").trim();
        const projectId = (process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "").trim();
        const appId = (process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "").trim();
        const authDomain = (process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "").trim();
        
        // CRITICAL: Validate all REQUIRED fields per Firebase documentation
        if (!apiKey || !projectId || !appId || apiKey.length === 0 || projectId.length === 0 || appId.length === 0) {
          console.error("[Firebase Sync Init] Missing REQUIRED Firebase options:", {
            hasApiKey: !!apiKey && apiKey.length > 0,
            hasProjectId: !!projectId && projectId.length > 0,
            hasAppId: !!appId && appId.length > 0,
          });
          console.error("[Firebase Sync Init] All three fields (apiKey, projectId, appId) are REQUIRED per Firebase documentation");
          console.error("[Firebase Sync Init] See: https://firebase.google.com/support/guides/init-options");
          global.__firebaseSyncInitialized = true; // Mark as done even if failed
          return;
        }
        
        // CRITICAL: Import firebase/app FIRST and initialize BEFORE any other Firebase modules
        // This prevents other Firebase modules from trying to access default app before it exists
        const firebaseApp = await import("firebase/app");
        const { initializeApp, getApps } = firebaseApp;
        
        // Check if app already exists
        const existingApps = getApps();
        if (existingApps.length > 0) {
          // Verify existing app has valid config with all required fields
          for (const existingApp of existingApps) {
            if (existingApp.options && 
                existingApp.options.apiKey && 
                existingApp.options.projectId &&
                existingApp.options.appId &&
                typeof existingApp.options.apiKey === 'string' && 
                existingApp.options.apiKey.length > 0) {
              console.log("[Firebase Sync Init] Using existing app with valid config");
              global.__firebaseSyncInitialized = true;
              global.__firebaseAppReady = true;
              return;
            }
          }
        }
        
        // Create new app BEFORE any other Firebase modules can be imported
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
        
        initializeApp(config);
        global.__firebaseSyncInitialized = true;
        global.__firebaseAppReady = true;
        console.log("[Firebase Sync Init] Firebase initialized synchronously (apiKey, projectId, appId validated)");
      } catch (error: any) {
        // Log all errors to help debug
        const errorMessage = error?.message || String(error);
        console.error("[Firebase Sync Init] Error:", errorMessage);
        global.__firebaseSyncInitialized = true; // Mark as done even if failed
        // Don't throw - allow app to continue and try lazy initialization
      }
      })();
    }
    
    // CRITICAL: Start the promise immediately and don't await
    // This ensures initialization starts as soon as this module loads
    if (global.__firebaseSyncInitPromise) {
      global.__firebaseSyncInitPromise.catch(() => {
        // Silently handle errors
      });
    }
  }
}

// Export a function to wait for initialization
export async function waitForFirebaseInit(): Promise<void> {
  if (global.__firebaseSyncInitialized || global.__firebaseAppReady) {
    return;
  }
  
  if (global.__firebaseSyncInitPromise) {
    await global.__firebaseSyncInitPromise;
  }
}

