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
  
  // Use firebase-client.ts to wait for initialization
  try {
    const { getFirebaseApp } = await import("./firebase-client");
    await getFirebaseApp();
  } catch (error: any) {
    console.warn("[Firebase Interceptor] Failed to wait for Firebase app:", error?.message);
  }
}

