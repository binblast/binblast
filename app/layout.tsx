import type { Metadata } from "next";
import "./globals.css";
import { FirebaseGate } from "@/components/FirebaseGate";
import { FirebaseErrorBoundary } from "@/components/FirebaseErrorBoundary";
// CRITICAL: Do NOT statically import firebase-client.ts here
// Static imports cause webpack to bundle firebase-client.ts into page chunks
// Firebase will initialize automatically when firebase-client.ts is first dynamically imported
// The FirebaseGate component will trigger initialization when needed

export const metadata: Metadata = {
  title: "Bin Blast Co. - Professional Trash Bin Cleaning Service",
  description: "Professional trash bin cleaning service that keeps your bins fresh, sanitized, and odor-free.",
  viewport: "width=device-width, initial-scale=1, maximum-scale=5",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
      </head>
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

