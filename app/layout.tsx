import type { Metadata } from "next";
import "./globals.css";
import { FirebaseGate } from "@/components/FirebaseGate";
import { FirebaseErrorBoundary } from "@/components/FirebaseErrorBoundary";
// Initialize Firebase client early (it will wait for head script config)
import "@/lib/firebase-client";

export const metadata: Metadata = {
  title: "Bin Blast Co. - Professional Trash Bin Cleaning Service",
  description: "Professional trash bin cleaning service that keeps your bins fresh, sanitized, and odor-free.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Store Firebase config in window for firebase-client.ts to read
  // This runs before modules load, ensuring config is available early
  const firebaseConfigScript = `
(function() {
  if (typeof window === 'undefined') return;
  
  var apiKey = "${process.env.NEXT_PUBLIC_FIREBASE_API_KEY || ''}".trim();
  var projectId = "${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || ''}".trim();
  var appId = "${process.env.NEXT_PUBLIC_FIREBASE_APP_ID || ''}".trim();
  var authDomain = "${process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || ''}".trim();
  
  if (apiKey && projectId && appId && apiKey.length > 0 && projectId.length > 0 && appId.length > 0) {
    window.__firebaseConfig = {
      apiKey: apiKey,
      projectId: projectId,
      appId: appId${process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN && process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN.trim().length > 0 ? `,\n      authDomain: "${process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN}"` : ''}${process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ? `,\n      storageBucket: "${process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET}"` : ''}${process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ? `,\n      messagingSenderId: "${process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID}"` : ''}
    };
    window.__firebaseConfigReady = true;
  }
})();
`;

  return (
    <html lang="en">
      <head>
        {/* Store Firebase config for firebase-client.ts to read */}
        <script
          dangerouslySetInnerHTML={{ __html: firebaseConfigScript }}
        />
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

