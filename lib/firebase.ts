// lib/firebase.ts
import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";

let app: FirebaseApp | undefined;
let auth: Auth | undefined;
let db: Firestore | undefined;

// Only initialize Firebase on the client side and if config exists
if (typeof window !== "undefined") {
  const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "",
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "",
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "",
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "",
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "",
  };

  // Only initialize if we have ALL required config values (not empty strings)
  const hasRequiredConfig = 
    firebaseConfig.apiKey && 
    firebaseConfig.apiKey !== "" &&
    firebaseConfig.projectId && 
    firebaseConfig.projectId !== "" &&
    firebaseConfig.authDomain && 
    firebaseConfig.authDomain !== "";

  if (hasRequiredConfig) {
    try {
      // Only initialize if we don't already have an app
      const existingApps = getApps();
      if (existingApps.length > 0) {
        app = existingApps[0];
      } else {
        // Validate config before initializing
        if (!firebaseConfig.apiKey || firebaseConfig.apiKey.trim() === "") {
          throw new Error("Firebase API key is empty");
        }
        if (!firebaseConfig.projectId || firebaseConfig.projectId.trim() === "") {
          throw new Error("Firebase project ID is empty");
        }
        app = initializeApp(firebaseConfig);
      }
      
      // Only get auth/db if app was successfully created
      if (app) {
        try {
          auth = getAuth(app);
          db = getFirestore(app);
        } catch (authError) {
          console.error("Firebase auth/db initialization error:", authError);
          // If auth/db fail, don't break the app
          auth = undefined;
          db = undefined;
        }
      }
    } catch (error) {
      console.error("Firebase initialization error:", error);
      // Don't throw - let components handle undefined auth/db gracefully
      app = undefined;
      auth = undefined;
      db = undefined;
    }
  } else {
    if (process.env.NODE_ENV === "development") {
      console.warn("Firebase environment variables are not configured. Firebase features will not work.");
    }
    // Explicitly set to undefined to prevent any accidental access
    app = undefined;
    auth = undefined;
    db = undefined;
  }
}

export { auth, db };

