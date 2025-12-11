// lib/firebase-context.tsx
// Context and hook for tracking Firebase initialization state
"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { isFirebaseReady } from "./firebase-client";

interface FirebaseContextType {
  isReady: boolean;
  isInitializing: boolean;
  error: Error | null;
}

const FirebaseContext = createContext<FirebaseContextType>({
  isReady: false,
  isInitializing: false,
  error: null,
});

export function FirebaseProvider({ children }: { children: ReactNode }) {
  const [isReady, setIsReady] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let mounted = true;

    // Check Firebase readiness in background - don't block rendering
    async function checkFirebaseReady() {
      try {
        const ready = await isFirebaseReady();
        if (!mounted) return;
        
        setIsReady(ready);
        setIsInitializing(false);
        
        if (ready) {
          console.log("[FirebaseProvider] ✅ Firebase is ready");
        } else {
          console.warn("[FirebaseProvider] Firebase is not available - features may be limited");
        }
      } catch (err: any) {
        if (!mounted) return;
        const errorMsg = err?.message || String(err);
        // Don't log initialization errors - they're handled by firebase-client
        if (!errorMsg.includes("apiKey") && !errorMsg.includes("authenticator")) {
          console.error("[FirebaseProvider] Error checking Firebase:", errorMsg);
          setError(err);
        }
        setIsReady(false);
        setIsInitializing(false);
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

