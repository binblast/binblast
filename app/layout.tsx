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
  // Generate Firebase initialization script that runs before page chunks load
  const firebaseInitScript = `
(function() {
  if (typeof window === 'undefined') return;
  if (window.__firebaseAppInitialized) return;
  
  window.__firebaseAppInitialized = false;
  window.__firebaseInitPromise = (function() {
    var apiKey = "${process.env.NEXT_PUBLIC_FIREBASE_API_KEY || ''}".trim();
    var projectId = "${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || ''}".trim();
    var authDomain = "${process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || ''}".trim();
    
    if (!apiKey || !projectId || !authDomain || apiKey.length === 0 || projectId.length === 0 || authDomain.length === 0) {
      console.warn('[Firebase Head Script] Missing environment variables');
      window.__firebaseAppInitialized = true;
      return Promise.resolve();
    }
    
    return import('firebase/app').then(function(firebaseApp) {
      try {
        var getApps = firebaseApp.getApps;
        var initializeApp = firebaseApp.initializeApp;
        var existingApps = getApps();
        
        if (existingApps.length > 0) {
          for (var i = 0; i < existingApps.length; i++) {
            var app = existingApps[i];
            if (app && app.options && app.options.apiKey && typeof app.options.apiKey === 'string' && app.options.apiKey.length > 0) {
              window.__firebaseAppInitialized = true;
              return;
            }
          }
        }
        
        var config = {
          apiKey: apiKey,
          authDomain: authDomain,
          projectId: projectId
        };
        ${process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ? `config.storageBucket = "${process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET}";` : ''}
        ${process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ? `config.messagingSenderId = "${process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID}";` : ''}
        ${process.env.NEXT_PUBLIC_FIREBASE_APP_ID ? `config.appId = "${process.env.NEXT_PUBLIC_FIREBASE_APP_ID}";` : ''}
        
        initializeApp(config);
        window.__firebaseAppInitialized = true;
        console.log('[Firebase Head Script] Firebase initialized');
      } catch (err) {
        console.error('[Firebase Head Script] Error:', err);
        window.__firebaseAppInitialized = true;
      }
    }).catch(function(err) {
      console.error('[Firebase Head Script] Import error:', err);
      window.__firebaseAppInitialized = true;
    });
  })();
})();
`;

  return (
    <html lang="en">
      <body>
        {/* CRITICAL: Initialize Firebase BEFORE React loads to prevent module import errors */}
        <Script
          id="firebase-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: firebaseInitScript }}
        />
        {/* Initialize Firebase before any children render to prevent dynamic chunk errors */}
        <FirebaseInitializer />
        <FirebaseGate>
          {children}
        </FirebaseGate>
      </body>
    </html>
  );
}

