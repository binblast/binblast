// lib/firebase-module-loader.ts
// Wrapper to ensure Firebase app exists before importing Firebase modules
// This prevents "Neither apiKey nor config.authenticator provided" errors

/**
 * Safely import firebase/firestore functions
 * Ensures Firebase app is initialized before importing
 * CRITICAL: This MUST complete before any Firebase modules can be imported
 */
export async function safeImportFirestore() {
  // CRITICAL: Wait for Firebase app to be ready - this blocks until initialization completes
  await waitForFirebaseApp();
  
  // Verify app exists before importing
  try {
    const firebaseApp = await import("firebase/app");
    const { getApps } = firebaseApp;
    const apps = getApps();
    if (apps.length === 0 || !apps[0].options?.apiKey) {
      throw new Error("Firebase app not initialized - missing apiKey");
    }
  } catch (error: any) {
    console.error("[Firebase Module Loader] Cannot import firestore - app not ready:", error?.message || error);
    throw new Error("Firebase app must be initialized before importing firestore modules");
  }
  
  // Now safe to import
  return await import("firebase/firestore");
}

/**
 * Safely import firebase/auth functions
 * Ensures Firebase app is initialized before importing
 * CRITICAL: This MUST complete before any Firebase modules can be imported
 */
export async function safeImportAuth() {
  // CRITICAL: Wait for Firebase app to be ready - this blocks until initialization completes
  await waitForFirebaseApp();
  
  // Verify app exists before importing
  try {
    const firebaseApp = await import("firebase/app");
    const { getApps } = firebaseApp;
    const apps = getApps();
    if (apps.length === 0 || !apps[0].options?.apiKey) {
      throw new Error("Firebase app not initialized - missing apiKey");
    }
  } catch (error: any) {
    console.error("[Firebase Module Loader] Cannot import auth - app not ready:", error?.message || error);
    throw new Error("Firebase app must be initialized before importing auth modules");
  }
  
  // Now safe to import
  return await import("firebase/auth");
}

/**
 * Wait for Firebase app to be initialized
 * CRITICAL: This must complete before any Firebase modules can be imported
 * IMPORTANT: This function does NOT import Firebase modules directly to prevent errors
 */
async function waitForFirebaseApp(): Promise<void> {
  if (typeof window === 'undefined') return; // Server-side, skip waiting
  
  // Check if app is already ready (set by sync init)
  if ((window as any).__firebaseAppReady) {
    return; // App is ready, no need to import Firebase modules
  }
  
  // CRITICAL: Wait for sync init promise FIRST (this is the SINGLE source of truth)
  // Do NOT import Firebase modules here - that causes "Neither apiKey nor config.authenticator provided" errors
  if ((window as any).__firebaseSyncInitPromise) {
    try {
      // Wait for sync init to complete (with timeout)
      await Promise.race([
        (window as any).__firebaseSyncInitPromise,
        new Promise(resolve => setTimeout(resolve, 5000)), // 5 second timeout
      ]);
      
      // After sync init completes, check if app is ready (don't import Firebase modules)
      if ((window as any).__firebaseAppReady) {
        return; // App is ready
      }
    } catch (error: any) {
      // If sync init failed, Firebase won't work
      console.warn("[Firebase Module Loader] Sync initialization failed:", error?.message || error);
      return;
    }
  }
  
  // If no sync init promise exists, Firebase is not being initialized
  if (!(window as any).__firebaseSyncInitPromise) {
    console.warn("[Firebase Module Loader] No sync initialization found - Firebase may not be configured");
  }
}

