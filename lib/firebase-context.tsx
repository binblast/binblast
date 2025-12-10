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

    async function checkFirebaseReady() {
      try {
        // Wait for Firebase app to be initialized
        await waitForFirebaseApp();

        if (!mounted) return;

        // Verify Firebase is actually ready by checking if we can get instances
        const { getAuthInstance, getDbInstance } = await import("@/lib/firebase");
        const auth = await getAuthInstance();
        const db = await getDbInstance();

        if (!mounted) return;

        // Firebase is ready if we have at least one instance
        if (auth || db) {
          setIsReady(true);
          setIsInitializing(false);
          console.log("[FirebaseProvider] Firebase is ready");
        } else {
          // Firebase not configured, but allow app to render
          setIsReady(false);
          setIsInitializing(false);
          console.warn("[FirebaseProvider] Firebase not configured");
        }
      } catch (err: any) {
        if (!mounted) return;
        console.error("[FirebaseProvider] Error checking Firebase:", err);
        setError(err);
        setIsReady(false);
        setIsInitializing(false);
        // Don't block rendering - components will handle errors gracefully
      }
    }

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
    console.warn("[FirebaseProvider] Firebase app not ready after timeout");
  }
}

