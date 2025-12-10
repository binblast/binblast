// components/FirebaseInitializer.tsx
"use client";

import { useEffect } from "react";

export function FirebaseInitializer() {
  useEffect(() => {
    // Initialize Firebase immediately when component mounts
    // This ensures Firebase is initialized before any dynamic chunks load
    // CRITICAL: This must run synchronously on mount to prevent race conditions
    (async () => {
      try {
        // Force initialization immediately - this will use the global initialization
        // from lib/firebase.ts which runs immediately on module load
        const { getAuthInstance, getDbInstance } = await import("@/lib/firebase");
        
        // Initialize both auth and db to ensure Firebase is fully ready
        // This will wait for the global initialization to complete if it's still running
        const authPromise = getAuthInstance();
        const dbPromise = getDbInstance();
        
        // Wait for both to complete
        await Promise.all([authPromise, dbPromise]);
        
        console.log("[FirebaseInitializer] Firebase initialized globally");
      } catch (error) {
        console.error("[FirebaseInitializer] Error initializing Firebase:", error);
        // Don't throw - allow app to continue
      }
    })();
  }, []);

  return null; // This component doesn't render anything
}

