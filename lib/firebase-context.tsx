// lib/firebase-context.tsx
// Context and hook for tracking Firebase initialization state
"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";

interface FirebaseContextType {
  isReady: boolean;
  isInitializing: boolean;
  error: Error | null;
}

const FirebaseContext = createContext<FirebaseContextType>({
  isReady: false,
  isInitializing: true,
  error: null,
});

export function FirebaseProvider({ children }: { children: ReactNode }) {
  const [isReady, setIsReady] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let mounted = true;

    // CRITICAL: Set initializing to false immediately so site can render
    // Don't block rendering - check Firebase in background
    setIsInitializing(false);

    async function checkFirebaseReady() {
      try {
        // CRITICAL: Wait for sync init to complete first
        // This ensures Firebase app is initialized before we try to use it
        await waitForFirebaseApp();

        if (!mounted) return;

        // CRITICAL: Only check Firebase readiness if sync init completed successfully
        // Don't try to import Firebase modules if sync init didn't complete
        if (!(window as any).__firebaseAppReady) {
          // Sync init didn't complete - Firebase is not available
          setIsReady(false);
          setIsInitializing(false);
          console.warn("[FirebaseProvider] Firebase sync initialization did not complete - Firebase features may not be available");
          return;
        }

        // Now safe to verify Firebase is ready by getting instances
        // This will use the app initialized by sync init
        try {
          const { getAuthInstance, getDbInstance } = await import("@/lib/firebase");
          const auth = await getAuthInstance();
          const db = await getDbInstance();

          if (!mounted) return;

          // Firebase is ready if we have at least one instance
          if (auth || db) {
            setIsReady(true);
            setIsInitializing(false);
            console.log("[FirebaseProvider] ✅ Firebase is ready");
          } else {
            // Firebase not configured, but allow app to render
            setIsReady(false);
            setIsInitializing(false);
            console.warn("[FirebaseProvider] Firebase instances not available");
          }
        } catch (importError: any) {
          // If import fails, Firebase is not ready
          setIsReady(false);
          setIsInitializing(false);
          const errorMsg = importError?.message || String(importError);
          // Don't log "apiKey" errors - those are expected if Firebase isn't configured
          if (!errorMsg.includes("apiKey") && !errorMsg.includes("authenticator")) {
            console.warn("[FirebaseProvider] Could not import Firebase:", errorMsg);
          }
        }
      } catch (err: any) {
        if (!mounted) return;
        setIsReady(false);
        setIsInitializing(false);
        const errorMsg = err?.message || String(err);
        // Don't log "apiKey" errors - those are expected if Firebase isn't configured
        if (!errorMsg.includes("apiKey") && !errorMsg.includes("authenticator")) {
          console.error("[FirebaseProvider] Error checking Firebase:", errorMsg);
          setError(err);
        }
        // Don't block rendering - components will handle errors gracefully
      }
    }

    // Check Firebase in background - don't block rendering
    checkFirebaseReady();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <FirebaseContext.Provider value={{ isReady, isInitializing, error }}>
      {children}
    </FirebaseContext.Provider>
  );
}

export function useFirebase() {
  return useContext(FirebaseContext);
}

/**
 * Wait for Firebase app to be initialized
 * CRITICAL: This function does NOT import Firebase modules directly to prevent
 * "Neither apiKey nor config.authenticator provided" errors.
 * It only waits for the sync init promise to complete.
 */
async function waitForFirebaseApp(): Promise<void> {
  if (typeof window === 'undefined') return;

  // Check if app is already ready (set by sync init)
  if ((window as any).__firebaseAppReady) {
    return;
  }

  // CRITICAL: Wait for sync init promise - this is the SINGLE source of truth
  // Do NOT import Firebase modules here - that causes the error
  if ((window as any).__firebaseSyncInitPromise) {
    try {
      // Wait for sync init to complete (with timeout)
      await Promise.race([
        (window as any).__firebaseSyncInitPromise,
        new Promise(resolve => setTimeout(resolve, 3000)), // 3 second timeout
      ]);
      
      // After sync init completes, check if app is ready
      // Don't import Firebase modules - just check the flag set by sync init
      if ((window as any).__firebaseAppReady) {
        return;
      }
    } catch (error: any) {
      // If sync init failed, Firebase won't work
      console.warn("[FirebaseProvider] Sync initialization failed:", error?.message || error);
      return;
    }
  }

  // If no sync init promise exists, Firebase is not being initialized
  // This is OK - the site can still render
  if (!(window as any).__firebaseSyncInitPromise) {
    console.warn("[FirebaseProvider] No sync initialization found - Firebase may not be configured");
  }
}

