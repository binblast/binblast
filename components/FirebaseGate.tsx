// components/FirebaseGate.tsx
// This component provides Firebase context and blocks rendering until Firebase is ready
"use client";

import { useEffect } from "react";
import { FirebaseProvider } from "@/lib/firebase-context";

export function FirebaseGate({ children }: { children: React.ReactNode }) {
  // CRITICAL: Start Firebase initialization early on client-side
  // Use dynamic import to prevent webpack from bundling firebase-client.ts into page chunks
  useEffect(() => {
    // Start Firebase initialization early - this will trigger the top-level code in firebase-client.ts
    import("@/lib/firebase-client").catch(() => {
      // Silently handle errors - Firebase will initialize when needed
    });
  }, []);

  return <FirebaseProvider>{children}</FirebaseProvider>;
}

