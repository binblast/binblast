import type { Metadata, Viewport } from "next";
import dynamic from "next/dynamic";
import "./globals.css";
import { FirebaseGate } from "@/components/FirebaseGate";
import { FirebaseErrorBoundary } from "@/components/FirebaseErrorBoundary";
import { JsonLd } from "@/components/seo/JsonLd";
import { globalSchemas } from "@/lib/seo/schema";
import { buildSiteMetadata, FACEBOOK_APP_ID } from "@/lib/site-metadata";
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

export const metadata: Metadata = buildSiteMetadata({
  icons: {
    icon: "/favicon.png",
    apple: "/apple-touch-icon.png",
  },
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.png" type="image/png" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        {FACEBOOK_APP_ID ? (
          <meta property="fb:app_id" content={FACEBOOK_APP_ID} />
        ) : null}
      </head>
      <body>
        <JsonLd data={globalSchemas()} />
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

