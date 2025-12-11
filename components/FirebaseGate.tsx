// components/FirebaseGate.tsx
// This component provides Firebase context and blocks rendering until Firebase is ready
"use client";

import { FirebaseProvider } from "@/lib/firebase-context";

// CRITICAL: Import firebase-client.ts statically here so it's guaranteed to be in the main bundle
// Since FirebaseGate is imported in the root layout, this ensures firebase-client.ts
// is always in the main bundle and initializes before any page chunks load
// The webpack config ensures this file stays in the main bundle (not code-split)
import "@/lib/firebase-client";

export function FirebaseGate({ children }: { children: React.ReactNode }) {
  // Firebase initialization happens automatically when firebase-client.ts module loads
  // The top-level code in firebase-client.ts starts initialization immediately
  
  return <FirebaseProvider>{children}</FirebaseProvider>;
}

