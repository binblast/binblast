// lib/firebase-context.tsx
// Context and hook for tracking Firebase initialization state
// CRITICAL: This file must NOT import firebase-client.ts statically to prevent webpack bundling
"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";

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
  const [isInitializing, setIsInitializing] = useState(true); // Start as true since we're checking
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let mounted = true;
    setIsInitializing(true);

    // Check Firebase readiness in background - don't block rendering
    async function checkFirebaseReady() {
      try {
        // CRITICAL: Use dynamic import (but DO NOT webpackIgnore).
        // `webpackIgnore: true` forces a runtime fetch like `/_next/static/chunks/app/firebase-client`,
        // which 404s in Next.js and can cascade into repeated client-side exceptions.
        const firebaseClientModule = await import("./firebase-client");
        const ready = await firebaseClientModule.isFirebaseReady();
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

