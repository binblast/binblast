// lib/firebase-init-sync.ts
// This module ensures Firebase is initialized synchronously before any dynamic chunks load
// It's imported in the root layout to run before React hydrates

// CRITICAL: Skip initialization during Next.js build
// During build, Next.js executes this module, but Firebase shouldn't initialize
if (typeof window !== 'undefined' && !process.env.NEXT_PHASE) {
  // Initialize Firebase immediately when this module loads
  // This happens before any page components can load
  // Only run in browser (not server) and not during build
  (async () => {
    try {
      const apiKey = (process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "").trim();
      const projectId = (process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "").trim();
      const authDomain = (process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "").trim();
      
      if (apiKey && projectId && authDomain && apiKey.length > 0 && projectId.length > 0 && authDomain.length > 0) {
        // Import and initialize Firebase immediately
        const { initializeApp, getApps } = await import("firebase/app");
        
        // Check if app already exists
        const existingApps = getApps();
        if (existingApps.length > 0) {
          // App already exists, we're good
          console.log("[Firebase Sync Init] Using existing app");
          return;
        }
        
        // Create new app
        const config: any = {
          apiKey,
          authDomain,
          projectId,
        };
        
        if (process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET) {
          config.storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
        }
        if (process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID) {
          config.messagingSenderId = process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID;
        }
        if (process.env.NEXT_PUBLIC_FIREBASE_APP_ID) {
          config.appId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID;
        }
        
        initializeApp(config);
        console.log("[Firebase Sync Init] Firebase initialized synchronously");
      }
    } catch (error: any) {
      // Silently handle errors during build - this is expected
      const errorMessage = error?.message || String(error);
      if (!errorMessage.includes("apiKey") && !errorMessage.includes("authenticator")) {
        console.error("[Firebase Sync Init] Error:", errorMessage);
      }
    }
  })();
}

