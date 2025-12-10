// lib/firebase-module-loader.ts
// Wrapper to ensure Firebase app exists before importing Firebase modules
// This prevents "Neither apiKey nor config.authenticator provided" errors

/**
 * Safely import firebase/firestore functions
 * Ensures Firebase app is initialized before importing
 */
export async function safeImportFirestore() {
  // Wait for Firebase app to be ready
  await waitForFirebaseApp();
  
  // Now safe to import
  return await import("firebase/firestore");
}

/**
 * Safely import firebase/auth functions
 * Ensures Firebase app is initialized before importing
 */
export async function safeImportAuth() {
  // Wait for Firebase app to be ready
  await waitForFirebaseApp();
  
  // Now safe to import
  return await import("firebase/auth");
}

/**
 * Wait for Firebase app to be initialized
 */
async function waitForFirebaseApp(): Promise<void> {
  if (typeof window === 'undefined') return; // Server-side, skip waiting
  
  // Check if app is already ready
  if ((window as any).__firebaseAppReady) {
    return;
  }
  
  // CRITICAL: Wait for Firebase app to exist before importing modules
  // Check if Firebase app exists by checking getApps()
  try {
    // Import firebase/app to check if app exists
    const firebaseApp = await import("firebase/app");
    const { getApps } = firebaseApp;
    
    // Check if any app exists
    const apps = getApps();
    if (apps.length > 0) {
      // App exists, mark as ready
      (window as any).__firebaseAppReady = true;
      return;
    }
  } catch {
    // If import fails, continue with waiting
  }
  
  // Wait for sync init promise
  if ((window as any).__firebaseSyncInitPromise) {
    try {
      await (window as any).__firebaseSyncInitPromise;
    } catch {
      // Continue even if failed
    }
  }
  
  // Wait for global init promise
  if ((window as any).__firebaseInitPromise) {
    try {
      await (window as any).__firebaseInitPromise;
    } catch {
      // Continue even if failed
    }
  }
  
  // Poll until app is ready (with timeout)
  const startTime = Date.now();
  const timeout = 5000; // 5 seconds
  
  while (!(window as any).__firebaseAppReady && Date.now() - startTime < timeout) {
    // Check if app exists by trying to get apps
    try {
      const firebaseApp = await import("firebase/app");
      const { getApps } = firebaseApp;
      const apps = getApps();
      if (apps.length > 0) {
        (window as any).__firebaseAppReady = true;
        break;
      }
    } catch {
      // Continue polling
    }
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  
  if (!(window as any).__firebaseAppReady) {
    console.warn("[Firebase Module Loader] Firebase app not ready after timeout - proceeding anyway");
  }
}

