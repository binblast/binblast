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
 */
async function waitForFirebaseApp(): Promise<void> {
  if (typeof window === 'undefined') return; // Server-side, skip waiting
  
  // Check if app is already ready
  if ((window as any).__firebaseAppReady) {
    // Verify app actually exists
    try {
      const firebaseApp = await import("firebase/app");
      const { getApps } = firebaseApp;
      const apps = getApps();
      if (apps.length > 0 && apps[0].options?.apiKey) {
        return; // App is ready
      }
    } catch {
      // Continue waiting
    }
  }
  
  // CRITICAL: Wait for sync init promise FIRST (this is the earliest initialization)
  if ((window as any).__firebaseSyncInitPromise) {
    try {
      await (window as any).__firebaseSyncInitPromise;
      // After sync init completes, verify app exists
      try {
        const firebaseApp = await import("firebase/app");
        const { getApps } = firebaseApp;
        const apps = getApps();
        if (apps.length > 0 && apps[0].options?.apiKey) {
          (window as any).__firebaseAppReady = true;
          return;
        }
      } catch {
        // Continue waiting
      }
    } catch {
      // Continue even if failed
    }
  }
  
  // Wait for global init promise
  if ((window as any).__firebaseInitPromise) {
    try {
      await (window as any).__firebaseInitPromise;
      // After global init completes, verify app exists
      try {
        const firebaseApp = await import("firebase/app");
        const { getApps } = firebaseApp;
        const apps = getApps();
        if (apps.length > 0 && apps[0].options?.apiKey) {
          (window as any).__firebaseAppReady = true;
          return;
        }
      } catch {
        // Continue waiting
      }
    } catch {
      // Continue even if failed
    }
  }
  
  // Poll until app is ready (with timeout)
  const startTime = Date.now();
  const timeout = 10000; // 10 seconds - increased timeout
  
  while (!(window as any).__firebaseAppReady && Date.now() - startTime < timeout) {
    // Check if app exists by trying to get apps
    try {
      const firebaseApp = await import("firebase/app");
      const { getApps } = firebaseApp;
      const apps = getApps();
      if (apps.length > 0 && apps[0].options?.apiKey) {
        (window as any).__firebaseAppReady = true;
        console.log("[Firebase Module Loader] Firebase app verified and ready");
        break;
      }
    } catch (error: any) {
      // Continue polling
      console.warn("[Firebase Module Loader] Error checking app:", error?.message);
    }
    await new Promise(resolve => setTimeout(resolve, 100)); // Check every 100ms
  }
  
  if (!(window as any).__firebaseAppReady) {
    console.error("[Firebase Module Loader] Firebase app not ready after timeout - this may cause errors");
    // Try one more time to verify
    try {
      const firebaseApp = await import("firebase/app");
      const { getApps } = firebaseApp;
      const apps = getApps();
      if (apps.length > 0 && apps[0].options?.apiKey) {
        (window as any).__firebaseAppReady = true;
        console.log("[Firebase Module Loader] Firebase app found after timeout");
      }
    } catch {
      // App still not ready
    }
  }
}

