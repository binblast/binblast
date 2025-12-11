import type { Metadata } from "next";
import "./globals.css";
import { FirebaseGate } from "@/components/FirebaseGate";
import { FirebaseErrorBoundary } from "@/components/FirebaseErrorBoundary";
// CRITICAL: Use dynamic import to prevent webpack from bundling firebase-client.ts into page chunks
// Firebase will initialize when first needed via the dynamic import in firebase-client.ts itself
if (typeof window !== 'undefined') {
  // Start Firebase initialization early on client-side only
  // Use dynamic import to prevent webpack code-splitting
  import("@/lib/firebase-client").catch(() => {
    // Silently handle errors - Firebase will initialize when needed
  });
}

export const metadata: Metadata = {
  title: "Bin Blast Co. - Professional Trash Bin Cleaning Service",
  description: "Professional trash bin cleaning service that keeps your bins fresh, sanitized, and odor-free.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {/* Error boundary to catch Firebase errors and allow site to render */}
        <FirebaseErrorBoundary>
          <FirebaseGate>
            {children}
          </FirebaseGate>
        </FirebaseErrorBoundary>
      </body>
    </html>
  );
}

