// lib/firebase.ts
import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";

let app: FirebaseApp | undefined;
let auth: Auth | undefined;
let db: Firestore | undefined;
let initializationAttempted = false;

// Only initialize Firebase on the client side and if config exists
if (typeof window !== "undefined" && !initializationAttempted) {
  initializationAttempted = true;
  
  try {
    const firebaseConfig = {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "",
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "",
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "",
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "",
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "",
    };

    // Strict validation - check for non-empty strings
    const apiKey = (firebaseConfig.apiKey || "").trim();
    const projectId = (firebaseConfig.projectId || "").trim();
    const authDomain = (firebaseConfig.authDomain || "").trim();

    const hasRequiredConfig = 
      apiKey.length > 0 &&
      projectId.length > 0 &&
      authDomain.length > 0;

    if (!hasRequiredConfig) {
      console.warn("[Firebase] Missing required environment variables. Firebase features will not work.");
      console.warn("[Firebase] Required: NEXT_PUBLIC_FIREBASE_API_KEY, NEXT_PUBLIC_FIREBASE_PROJECT_ID, NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN");
      console.warn("[Firebase] Current values:", {
        apiKey: apiKey ? "***" : "MISSING",
        projectId: projectId || "MISSING",
        authDomain: authDomain || "MISSING",
      });
      // Explicitly set to undefined
      app = undefined;
      auth = undefined;
      db = undefined;
    } else {
      // Only initialize if we have valid config
      try {
        // Check if app already exists
        const existingApps = getApps();
        if (existingApps.length > 0) {
          app = existingApps[0];
        } else {
          // Create new app with validated config
          app = initializeApp({
            apiKey,
            authDomain,
            projectId,
            storageBucket: firebaseConfig.storageBucket || undefined,
            messagingSenderId: firebaseConfig.messagingSenderId || undefined,
            appId: firebaseConfig.appId || undefined,
          });
        }
        
        // Only get auth/db if app was successfully created
        if (app) {
          try {
            auth = getAuth(app);
            db = getFirestore(app);
            console.log("[Firebase] Successfully initialized");
          } catch (authError: any) {
            console.error("[Firebase] Error initializing auth/db:", authError);
            // If auth/db fail, don't break the app
            app = undefined;
            auth = undefined;
            db = undefined;
          }
        }
      } catch (initError: any) {
        console.error("[Firebase] Initialization error:", initError);
        // Don't throw - let components handle undefined auth/db gracefully
        app = undefined;
        auth = undefined;
        db = undefined;
      }
    }
  } catch (error: any) {
    console.error("[Firebase] Fatal initialization error:", error);
    app = undefined;
    auth = undefined;
    db = undefined;
  }
}

export { auth, db };

