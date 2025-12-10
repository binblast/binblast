// components/FirebaseGate.tsx
// This component provides Firebase context and blocks rendering until Firebase is ready
"use client";

import { FirebaseProvider } from "@/lib/firebase-context";

export function FirebaseGate({ children }: { children: React.ReactNode }) {
  return <FirebaseProvider>{children}</FirebaseProvider>;
}

