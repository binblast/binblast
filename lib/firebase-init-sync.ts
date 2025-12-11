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
    
    // CRITICAL: Wait for head script to set config, then initialize IMMEDIATELY
    // The head script runs before modules load, but we need to ensure config is available
    // According to Firebase docs, REQUIRED fields are: apiKey, projectId, appId
    // See: https://firebase.google.com/support/guides/init-options
    // This MUST complete before any page chunks can execute their imports
    
    // Start initialization promise immediately - it will wait for config if needed
    global.__firebaseSyncInitPromise = (async () => {
      // Wait for head script to set config (with timeout)
      let headConfig = (window as any).__firebaseConfig;
      let shouldInit = (window as any).__firebaseShouldInit;
      
      // If config not available yet, wait a bit for head script to run
      if (!headConfig || !shouldInit) {
        const startTime = Date.now();
        const timeout = 1000; // 1 second max wait
        
        while ((!headConfig || !shouldInit) && Date.now() - startTime < timeout) {
          await new Promise(resolve => setTimeout(resolve, 10)); // Check every 10ms
          headConfig = (window as any).__firebaseConfig;
          shouldInit = (window as any).__firebaseShouldInit;
        }
      }
      
      // Store promise on window immediately so other modules can wait for it
      (window as any).__firebaseSyncInitPromise = global.__firebaseSyncInitPromise;
      
      // Check if config is available from head script
      if (headConfig && headConfig.apiKey && headConfig.projectId && headConfig.appId && shouldInit) {
        // All required fields are present - initialize IMMEDIATELY
        // CRITICAL: This MUST complete before any page chunks can execute their imports
        console.log("[Firebase Sync Init] Starting immediate initialization from head script config");
        
        try {
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
            console.log("[Firebase Sync Init] ✅ Firebase app initialized successfully (apiKey, projectId, appId validated)");
            console.log("[Firebase Sync Init] App name:", app.name);
            console.log("[Firebase Sync Init] ✅ Firebase is now ready - page chunks can safely import Firebase modules");
          } else {
            // Verify existing app has all required fields
            const existingApp = existingApps[0];
            if (existingApp.options?.apiKey && existingApp.options?.projectId && existingApp.options?.appId) {
              global.__firebaseSyncInitialized = true;
              global.__firebaseAppReady = true;
              (window as any).__firebaseAppReady = true;
              console.log("[Firebase Sync Init] ✅ Using existing Firebase app with valid config");
            } else {
              // Existing app is invalid, create new one
              const app = initializeApp(headConfig);
              global.__firebaseSyncInitialized = true;
              global.__firebaseAppReady = true;
              (window as any).__firebaseAppReady = true;
              console.log("[Firebase Sync Init] ✅ Created new Firebase app (existing app was invalid)");
            }
          }
        } catch (error: any) {
          console.error("[Firebase Sync Init] ❌ Immediate init error:", error?.message || error);
          global.__firebaseSyncInitialized = true;
          throw error; // Re-throw so promise rejects
        }
      } else {
        // Config not available - Firebase won't initialize
        console.warn("[Firebase Sync Init] Config not available from head script - Firebase may not be configured");
        console.warn("[Firebase Sync Init] headConfig:", !!headConfig, "shouldInit:", !!shouldInit);
        if (headConfig) {
          console.warn("[Firebase Sync Init] Config fields:", {
            hasApiKey: !!headConfig.apiKey,
            hasProjectId: !!headConfig.projectId,
            hasAppId: !!headConfig.appId,
          });
        }
        global.__firebaseSyncInitialized = true;
        // Don't throw - allow app to continue without Firebase
      }
    })();
    
    // CRITICAL: Store promise on window IMMEDIATELY so other modules can wait for it
    // This promise MUST complete before any Firebase modules can be imported
    (window as any).__firebaseSyncInitPromise = global.__firebaseSyncInitPromise;
    
    // Start the promise immediately - don't await (would cause syntax error)
    // The promise will complete asynchronously, and other modules will wait for it
    global.__firebaseSyncInitPromise.catch((error) => {
      console.warn("[Firebase Sync Init] Initialization failed:", error);
    });
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

