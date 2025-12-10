// lib/firebase-init-sync.ts
// This module ensures Firebase is initialized synchronously before any dynamic chunks load
// It's imported in the root layout to run before React hydrates

import { logFirebaseEnvStatus } from "./firebase-env-check";

// CRITICAL: Skip initialization during Next.js build
// During build, Next.js executes this module, but Firebase shouldn't initialize
if (typeof window !== 'undefined' && !process.env.NEXT_PHASE) {
  // Log environment variable status for debugging
  logFirebaseEnvStatus();
  
  // Initialize Firebase immediately when this module loads
  // This happens before any page components can load
  // Only run in browser (not server) and not during build
  (async () => {
    try {
      const apiKey = (process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "").trim();
      const projectId = (process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "").trim();
      const authDomain = (process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "").trim();
      
      // Debug: Log environment variable availability (without exposing values)
      if (!apiKey || !projectId || !authDomain) {
        console.error("[Firebase Sync Init] Missing environment variables:", {
          hasApiKey: !!apiKey && apiKey.length > 0,
          hasProjectId: !!projectId && projectId.length > 0,
          hasAuthDomain: !!authDomain && authDomain.length > 0,
        });
        console.error("[Firebase Sync Init] Make sure NEXT_PUBLIC_FIREBASE_* variables are set in your deployment environment");
        return;
      }
      
      if (apiKey.length > 0 && projectId.length > 0 && authDomain.length > 0) {
        // Import and initialize Firebase immediately
        const { initializeApp, getApps } = await import("firebase/app");
        
        // Check if app already exists
        const existingApps = getApps();
        if (existingApps.length > 0) {
          // Verify existing app has valid config
          for (const existingApp of existingApps) {
            if (existingApp.options && existingApp.options.apiKey && typeof existingApp.options.apiKey === 'string' && existingApp.options.apiKey.length > 0) {
              console.log("[Firebase Sync Init] Using existing app with valid config");
              return;
            }
          }
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
      } else {
        console.warn("[Firebase Sync Init] Environment variables are empty strings");
      }
    } catch (error: any) {
      // Log all errors to help debug
      const errorMessage = error?.message || String(error);
      console.error("[Firebase Sync Init] Error:", errorMessage);
      // Don't throw - allow app to continue and try lazy initialization
    }
  })();
}

