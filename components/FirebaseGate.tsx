// components/FirebaseGate.tsx
// This component blocks rendering until Firebase is initialized
"use client";

import { useEffect, useState } from "react";

declare global {
  var __firebaseSyncInitPromise: Promise<void> | undefined;
  var __firebaseSyncInitialized: boolean | undefined;
}

export function FirebaseGate({ children }: { children: React.ReactNode }) {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Wait for Firebase sync initialization to complete
    const initPromise = global.__firebaseSyncInitPromise;
    
    if (global.__firebaseSyncInitialized) {
      // Already initialized
      setIsReady(true);
      return;
    }

    if (initPromise) {
      // Wait for initialization to complete
      initPromise
        .then(() => {
          setIsReady(true);
        })
        .catch(() => {
          // Even if initialization fails, allow app to render
          // Components will handle Firebase errors gracefully
          setIsReady(true);
        });
    } else {
      // No initialization promise - allow app to render
      setIsReady(true);
    }
  }, []);

  // Show nothing while waiting (or show a loading state if desired)
  if (!isReady) {
    return null; // Or return a loading spinner
  }

  return <>{children}</>;
}

