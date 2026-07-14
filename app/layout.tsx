import type { Metadata, Viewport } from "next";
import dynamic from "next/dynamic";
import "./globals.css";
import { FirebaseGate } from "@/components/FirebaseGate";
import { FirebaseErrorBoundary } from "@/components/FirebaseErrorBoundary";
// CRITICAL: Do NOT statically import firebase-client.ts here
// Static imports cause webpack to bundle firebase-client.ts into page chunks
// Firebase will initialize automatically when firebase-client.ts is first dynamically imported
// The FirebaseGate component will trigger initialization when needed

const SiteLeadCaptureGate = dynamic(
  () => import("@/components/SiteLeadCaptureGate").then((mod) => mod.SiteLeadCaptureGate),
  { ssr: false }
);

const AttributionBootstrap = dynamic(
  () => import("@/components/AttributionBootstrap").then((mod) => mod.AttributionBootstrap),
  { ssr: false }
);

export const metadata: Metadata = {
  title: "Bin Blast Co. - Professional Trash Bin Cleaning Service",
  description: "Professional trash bin cleaning service that keeps your bins fresh, sanitized, and odor-free.",
  icons: {
    icon: "/bin-blast-mascot.png",
    apple: "/bin-blast-mascot.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/bin-blast-mascot.png" type="image/png" />
      </head>
      <body>
        {/* Error boundary to catch Firebase errors and allow site to render */}
        <FirebaseErrorBoundary>
          <FirebaseGate>
            {children}
            <AttributionBootstrap />
            <SiteLeadCaptureGate />
          </FirebaseGate>
        </FirebaseErrorBoundary>
      </body>
    </html>
  );
}

