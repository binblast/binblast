// lib/firebase-init-sync.ts
// This module ensures Firebase is initialized synchronously before any dynamic chunks load
// It's imported in the root layout to run before React hydrates

import { logFirebaseEnvStatus } from "./firebase-env-check";

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
    
    // CRITICAL: Check if config is available from head script and initialize immediately
    // According to Firebase docs, REQUIRED fields are: apiKey, projectId, appId
    // See: https://firebase.google.com/support/guides/init-options
    const headConfig = (window as any).__firebaseConfig;
    if (headConfig && headConfig.apiKey && headConfig.projectId && headConfig.appId) {
      // Validate all required fields are present
      if (!headConfig.apiKey || !headConfig.projectId || !headConfig.appId) {
        console.error("[Firebase Sync Init] Head script config missing REQUIRED fields:", {
          hasApiKey: !!headConfig.apiKey,
          hasProjectId: !!headConfig.projectId,
          hasAppId: !!headConfig.appId,
        });
        global.__firebaseSyncInitialized = true;
        return;
      }
      
      // Initialize immediately using head script config
      global.__firebaseSyncInitPromise = (async () => {
        try {
          const firebaseApp = await import("firebase/app");
          const { initializeApp, getApps } = firebaseApp;
          
          const existingApps = getApps();
          if (existingApps.length === 0) {
            initializeApp(headConfig);
            global.__firebaseSyncInitialized = true;
            global.__firebaseAppReady = true;
            (window as any).__firebaseAppReady = true;
            console.log("[Firebase Sync Init] Initialized immediately from head script (apiKey, projectId, appId validated)");
          } else {
            global.__firebaseSyncInitialized = true;
            global.__firebaseAppReady = true;
            (window as any).__firebaseAppReady = true;
          }
        } catch (error: any) {
          console.error("[Firebase Sync Init] Immediate init error:", error?.message || error);
          global.__firebaseSyncInitialized = true;
        }
      })();
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

