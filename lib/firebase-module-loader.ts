// lib/firebase-module-loader.ts
// Wrapper to ensure Firebase app exists before importing Firebase modules
// Uses the unified firebase-client.ts for initialization
// CRITICAL: Use dynamic import to prevent webpack from bundling firebase-client.ts into page chunks

/**
 * Safely import firebase/firestore functions
 * Ensures Firebase app is initialized before importing
 */
export async function safeImportFirestore() {
  // CRITICAL: Wait for Firebase app to be ready before importing
  // This MUST complete before importing firebase/firestore to prevent "Neither apiKey nor config.authenticator provided" errors
  if (typeof window !== 'undefined') {
    // Check if app is already ready
    if ((window as any).__firebaseAppReady && (window as any).__firebaseApp) {
      // App is ready - safe to import
    } else {
      // CRITICAL: Wait for initialization promise - this blocks until Firebase is initialized
      const initPromise = (window as any).__firebaseClientInitPromise || (global as any).__firebaseClientInitPromise;
      if (initPromise) {
        try {
          // Wait for initialization to complete - this is critical and blocking
          await initPromise;
        } catch (error: any) {
          // Log but continue - will verify app exists below
          const errorMsg = error?.message || String(error);
          if (!errorMsg.includes("Failed to resolve module specifier")) {
            console.warn("[Firebase Module Loader] Early init promise failed:", errorMsg);
          }
        }
      } else {
        // No promise yet - wait for initialization to start
        // Poll until promise is available or app is ready
        const startTime = Date.now();
        const timeout = 5000; // 5 second timeout
        
        while (!(window as any).__firebaseClientInitPromise && !(window as any).__firebaseAppReady && Date.now() - startTime < timeout) {
          await new Promise(resolve => setTimeout(resolve, 50));
        }
        
        // If promise is now available, wait for it
        const promise = (window as any).__firebaseClientInitPromise || (global as any).__firebaseClientInitPromise;
        if (promise) {
          await promise;
        }
      }
    }
  }
  
  // Wait for Firebase app to be initialized via the unified client
  // CRITICAL: Use dynamic import to prevent webpack from bundling firebase-client.ts into page chunks
  const { getFirebaseApp } = await import("./firebase-client");
  const app = await getFirebaseApp();
  
  if (!app) {
    throw new Error("Firebase app is not initialized");
  }

  // Verify app has valid config and surface stack for debugging
  const options = (app as any).options || {};
  const missing: string[] = [];
  if (!options.apiKey) missing.push("apiKey");
  if (!options.projectId) missing.push("projectId");
  if (!options.appId) missing.push("appId");

  if (missing.length > 0) {
    const err = new Error(`[Firebase Loader] Firebase app missing required options: ${missing.join(", ")}`);
    console.error("[Firebase Loader] App options check failed", {
      missing,
      options,
      stack: err.stack,
    });
    throw err;
  }
  
  // Now safe to import firestore - app is guaranteed to exist
  return await import("firebase/firestore");
}

/**
 * Safely import firebase/auth functions
 * Ensures Firebase app is initialized before importing
 */
export async function safeImportAuth() {
  // CRITICAL: Wait for Firebase app to be ready before importing
  // This MUST complete before importing firebase/auth to prevent "Neither apiKey nor config.authenticator provided" errors
  if (typeof window !== 'undefined') {
    // Check if app is already ready
    if ((window as any).__firebaseAppReady && (window as any).__firebaseApp) {
      // App is ready - safe to import
    } else {
      // CRITICAL: Wait for initialization promise - this blocks until Firebase is initialized
      const initPromise = (window as any).__firebaseClientInitPromise || (global as any).__firebaseClientInitPromise;
      if (initPromise) {
        try {
          // Wait for initialization to complete - this is critical and blocking
          await initPromise;
        } catch (error: any) {
          // Log but continue - will verify app exists below
          const errorMsg = error?.message || String(error);
          if (!errorMsg.includes("Failed to resolve module specifier")) {
            console.warn("[Firebase Module Loader] Early init promise failed:", errorMsg);
          }
        }
      } else {
        // No promise yet - wait for initialization to start
        // Poll until promise is available or app is ready
        const startTime = Date.now();
        const timeout = 5000; // 5 second timeout
        
        while (!(window as any).__firebaseClientInitPromise && !(window as any).__firebaseAppReady && Date.now() - startTime < timeout) {
          await new Promise(resolve => setTimeout(resolve, 50));
        }
        
        // If promise is now available, wait for it
        const promise = (window as any).__firebaseClientInitPromise || (global as any).__firebaseClientInitPromise;
        if (promise) {
          await promise;
        }
      }
    }
  }
  
  // Wait for Firebase app to be initialized via the unified client
  // CRITICAL: Use dynamic import to prevent webpack from bundling firebase-client.ts into page chunks
  const { getFirebaseApp } = await import("./firebase-client");
  const app = await getFirebaseApp();
  
  if (!app) {
    throw new Error("Firebase app is not initialized");
  }

  // Verify app has valid config and surface stack for debugging
  const options = (app as any).options || {};
  const missing: string[] = [];
  if (!options.apiKey) missing.push("apiKey");
  if (!options.projectId) missing.push("projectId");
  if (!options.appId) missing.push("appId");

  if (missing.length > 0) {
    const err = new Error(`[Firebase Loader] Firebase app missing required options: ${missing.join(", ")}`);
    console.error("[Firebase Loader] App options check failed", {
      missing,
      options,
      stack: err.stack,
    });
    throw err;
  }
  
  // Now safe to import auth - app is guaranteed to exist
  return await import("firebase/auth");
}

