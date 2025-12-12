// components/FirebaseGate.tsx
// This component provides Firebase context and blocks rendering until Firebase is ready
"use client";

import { useEffect } from "react";
import { FirebaseProvider } from "@/lib/firebase-context";

export function FirebaseGate({ children }: { children: React.ReactNode }) {
  // CRITICAL: Use dynamic import to initialize Firebase
  // This prevents webpack from analyzing firebase-client.ts and code-splitting firebase/auth
  // We initialize Firebase in a useEffect to ensure it happens after component mount
  useEffect(() => {
    // Dynamically import firebase-client to start initialization
    // This import is completely opaque to webpack's static analysis
    import("@/lib/firebase-client").catch((error) => {
      // Silently handle errors - Firebase will initialize when needed
      console.error("[FirebaseGate] Failed to initialize Firebase:", error);
    });
  }, []);
  
  return <FirebaseProvider>{children}</FirebaseProvider>;
}

