import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import { FirebaseInitializer } from "@/components/FirebaseInitializer";
import { FirebaseGate } from "@/components/FirebaseGate";
// CRITICAL: Import Firebase sync init to ensure Firebase is initialized before any dynamic chunks load
import "@/lib/firebase-init-sync";

export const metadata: Metadata = {
  title: "Bin Blast Co. - Professional Trash Bin Cleaning Service",
  description: "Professional trash bin cleaning service that keeps your bins fresh, sanitized, and odor-free.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Generate Firebase initialization script
  // Store config globally so Firebase can initialize immediately when module loads
  const firebaseInitScript = `
(function() {
  if (typeof window === 'undefined') return;
  
  // CRITICAL: According to Firebase docs, these three fields are REQUIRED:
  // - apiKey (API key)
  // - projectId (Project ID)
  // - appId (Application ID)
  // See: https://firebase.google.com/support/guides/init-options
  var apiKey = "${process.env.NEXT_PUBLIC_FIREBASE_API_KEY || ''}".trim();
  var projectId = "${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || ''}".trim();
  var appId = "${process.env.NEXT_PUBLIC_FIREBASE_APP_ID || ''}".trim();
  var authDomain = "${process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || ''}".trim();
  
  // Validate all REQUIRED fields are present
  if (apiKey && projectId && appId && apiKey.length > 0 && projectId.length > 0 && appId.length > 0) {
    window.__firebaseConfig = {
      apiKey: apiKey,
      projectId: projectId,
      appId: appId${authDomain && authDomain.length > 0 ? `,\n      authDomain: "${authDomain}"` : ''}${process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ? `,\n      storageBucket: "${process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET}"` : ''}${process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ? `,\n      messagingSenderId: "${process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID}"` : ''}
    };
    window.__firebaseConfigReady = true;
    console.log('[Firebase Init] Config stored in window.__firebaseConfig (apiKey, projectId, appId validated)');
  } else {
    console.error('[Firebase Init] Missing REQUIRED Firebase options:', {
      hasApiKey: !!apiKey && apiKey.length > 0,
      hasProjectId: !!projectId && projectId.length > 0,
      hasAppId: !!appId && appId.length > 0
    });
    console.error('[Firebase Init] All three fields (apiKey, projectId, appId) are REQUIRED per Firebase documentation');
  }
})();
`;

  return (
    <html lang="en">
      <head>
        {/* CRITICAL: Store Firebase config BEFORE any modules load */}
        <script
          dangerouslySetInnerHTML={{ __html: firebaseInitScript }}
        />
      </head>
      <body>
        {/* Initialize Firebase before any children render to prevent dynamic chunk errors */}
        <FirebaseInitializer />
        <FirebaseGate>
          {children}
        </FirebaseGate>
      </body>
    </html>
  );
}

