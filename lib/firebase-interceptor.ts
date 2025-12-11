// lib/firebase-interceptor.ts
// Intercepts Firebase module imports to ensure app is initialized first
// This prevents "Neither apiKey nor config.authenticator provided" errors

if (typeof window !== 'undefined') {
  // Store original import if available
  const originalImport = (window as any).__originalImport || ((window as any).import || null);
  
  // Intercept dynamic imports for Firebase modules
  // This ensures Firebase app is initialized before any Firebase modules can be imported
  (window as any).__firebaseImportInterceptor = async function(moduleSpecifier: string) {
    // Check if this is a Firebase module import
    if (typeof moduleSpecifier === 'string' && (
      moduleSpecifier.includes('firebase/auth') || 
      moduleSpecifier.includes('firebase/firestore') ||
      moduleSpecifier.includes('firebase/app')
    )) {
      // Wait for Firebase app to be initialized
      await waitForFirebaseApp();
      
      // Now safe to import
      return originalImport ? originalImport(moduleSpecifier) : import(moduleSpecifier);
    }
    
    // Not a Firebase module - import normally
    return originalImport ? originalImport(moduleSpecifier) : import(moduleSpecifier);
  };
}

async function waitForFirebaseApp(): Promise<void> {
  if (typeof window === 'undefined') return;
  
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
  
  // Wait for sync init promise FIRST (this is the earliest initialization)
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
  const timeout = 10000; // 10 seconds
  
  while (!(window as any).__firebaseAppReady && Date.now() - startTime < timeout) {
    try {
      const firebaseApp = await import("firebase/app");
      const { getApps } = firebaseApp;
      const apps = getApps();
      if (apps.length > 0 && apps[0].options?.apiKey) {
        (window as any).__firebaseAppReady = true;
        console.log("[Firebase Interceptor] Firebase app verified and ready");
        break;
      }
    } catch {
      // Continue polling
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  if (!(window as any).__firebaseAppReady) {
    console.error("[Firebase Interceptor] Firebase app not ready after timeout");
  }
}

