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
        // Wait for Firebase app to be initialized with a timeout
        // Don't wait forever - allow site to render even if Firebase fails
        await Promise.race([
          waitForFirebaseApp(),
          new Promise(resolve => setTimeout(resolve, 2000)), // 2 second timeout
        ]);

        if (!mounted) return;

        // Verify Firebase is actually ready by checking if we can get instances
        try {
          const { getAuthInstance, getDbInstance } = await import("@/lib/firebase");
          const auth = await getAuthInstance();
          const db = await getDbInstance();

          if (!mounted) return;

          // Firebase is ready if we have at least one instance
          if (auth || db) {
            setIsReady(true);
            console.log("[FirebaseProvider] Firebase is ready");
          } else {
            // Firebase not configured, but allow app to render
            setIsReady(false);
            console.warn("[FirebaseProvider] Firebase not configured");
          }
        } catch (importError: any) {
          // If import fails, Firebase is not ready
          setIsReady(false);
          console.warn("[FirebaseProvider] Could not import Firebase:", importError?.message);
        }
      } catch (err: any) {
        if (!mounted) return;
        console.error("[FirebaseProvider] Error checking Firebase:", err);
        setError(err);
        setIsReady(false);
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
 */
async function waitForFirebaseApp(): Promise<void> {
  if (typeof window === 'undefined') return;

  // Check if app is already ready
  if ((window as any).__firebaseAppReady) {
    return;
  }

  // Wait for sync init promise with timeout
  if ((window as any).__firebaseSyncInitPromise) {
    try {
      await Promise.race([
        (window as any).__firebaseSyncInitPromise,
        new Promise(resolve => setTimeout(resolve, 1000)), // 1 second timeout
      ]);
    } catch {
      // Continue even if failed
    }
  }

  // Wait for global init promise with timeout
  if ((window as any).__firebaseInitPromise) {
    try {
      await Promise.race([
        (window as any).__firebaseInitPromise,
        new Promise(resolve => setTimeout(resolve, 1000)), // 1 second timeout
      ]);
    } catch {
      // Continue even if failed
    }
  }

  // Poll until app is ready (with shorter timeout)
  const startTime = Date.now();
  const timeout = 2000; // 2 seconds - shorter timeout

  while (!(window as any).__firebaseAppReady && Date.now() - startTime < timeout) {
    // Check if app exists by trying to get apps
    try {
      const firebaseApp = await import("firebase/app");
      const { getApps } = firebaseApp;
      const apps = getApps();
      if (apps.length > 0 && apps[0].options?.apiKey) {
        (window as any).__firebaseAppReady = true;
        break;
      }
    } catch {
      // Continue polling
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  if (!(window as any).__firebaseAppReady) {
    console.warn("[FirebaseProvider] Firebase app not ready after timeout - site will render anyway");
  }
}

