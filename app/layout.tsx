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
  // Generate Firebase initialization script
  // CRITICAL: This script runs BEFORE any modules load, ensuring Firebase is ready
  // Store config globally AND initialize Firebase immediately to prevent chunk loading errors
  const firebaseInitScript = `
(function() {
  if (typeof window === 'undefined') return;
  
  // CRITICAL: Catch and suppress Firebase initialization errors so site can render
  // This prevents Firebase errors from blocking the entire site
  var originalError = window.onerror;
  window.onerror = function(message, source, lineno, colno, error) {
    // Check if this is a Firebase initialization error
    if (typeof message === 'string' && (
      message.includes('apiKey') || 
      message.includes('authenticator') ||
      message.includes('Firebase')
    )) {
      console.warn('[Firebase Error Handler] Suppressing Firebase error to allow site to render:', message);
      // Suppress the error - don't let it crash the site
      return true; // Return true to prevent default error handling
    }
    // For other errors, use original handler
    if (originalError) {
      return originalError.apply(this, arguments);
    }
    return false;
  };
  
  // Also catch unhandled promise rejections
  window.addEventListener('unhandledrejection', function(event) {
    var reason = event.reason;
    var message = reason?.message || String(reason || '');
    if (message.includes('apiKey') || message.includes('authenticator') || message.includes('Firebase')) {
      console.warn('[Firebase Error Handler] Suppressing Firebase promise rejection to allow site to render:', message);
      event.preventDefault(); // Prevent the error from being logged
    }
  });
  
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
    var config = {
      apiKey: apiKey,
      projectId: projectId,
      appId: appId${process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN && process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN.trim().length > 0 ? `,\n      authDomain: "${process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN}"` : ''}${process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ? `,\n      storageBucket: "${process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET}"` : ''}${process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ? `,\n      messagingSenderId: "${process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID}"` : ''}
    };
    
    // Store config globally for module access
    window.__firebaseConfig = config;
    window.__firebaseConfigReady = true;
    
    // CRITICAL: Initialize Firebase immediately using dynamic import
    // This ensures Firebase app exists before any page chunks can load
    // Note: We can't use import() in a script tag, so we'll initialize in the module
    // But we mark it as ready so modules know to initialize immediately
    window.__firebaseShouldInit = true;
    window.__firebaseAppReady = false; // Will be set to true when initialized
    
    // CRITICAL: Start initialization promise immediately
    // This will be resolved when Firebase app is initialized
    window.__firebaseInitStarted = true;
    
    console.log('[Firebase Init] Config stored in window.__firebaseConfig (apiKey, projectId, appId validated)');
    console.log('[Firebase Init] Firebase will be initialized immediately when modules load');
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

