// components/FirebaseInitializer.tsx
"use client";

import { useEffect } from "react";

export function FirebaseInitializer() {
  useEffect(() => {
    // Initialize Firebase immediately when component mounts
    // This ensures Firebase is initialized before any dynamic chunks load
    (async () => {
      try {
        const apiKey = (process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "").trim();
        const projectId = (process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "").trim();
        const authDomain = (process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "").trim();

        if (apiKey && projectId && authDomain) {
          // Import and initialize Firebase
          const { getAuthInstance, getDbInstance } = await import("@/lib/firebase");
          await getAuthInstance();
          await getDbInstance();
          console.log("[FirebaseInitializer] Firebase initialized globally");
        }
      } catch (error) {
        console.error("[FirebaseInitializer] Error initializing Firebase:", error);
      }
    })();
  }, []);

  return null; // This component doesn't render anything
}

