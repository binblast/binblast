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
  if (typeof window === 'undefined') return;
  
  // Check if app is already ready
  if ((window as any).__firebaseAppReady) {
    return;
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
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  
  if (!(window as any).__firebaseAppReady) {
    console.warn("[Firebase Module Loader] Firebase app not ready after timeout");
  }
}

