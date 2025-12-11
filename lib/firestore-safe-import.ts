// lib/firestore-safe-import.ts
// Safe wrapper for importing firebase/firestore that ensures Firebase is initialized first
// DEPRECATED: Use firebase-module-loader.ts instead
// This file is kept for backward compatibility but now uses the unified firebase-module-loader

import { getDbInstance } from "./firebase";
import { safeImportFirestore as safeImportFirestoreFromLoader } from "./firebase-module-loader";

let firestoreModuleCache: any = null;
let importPromise: Promise<any> | null = null;

/**
 * Safely import firebase/firestore functions.
 * This ensures Firebase app is initialized before importing firestore modules.
 * 
 * @returns Promise that resolves to firestore module and db instance
 * @deprecated Use safeImportFirestore from firebase-module-loader.ts instead
 */
export async function safeImportFirestore(): Promise<{ firestore: any; db: any }> {
  // If already cached, return immediately
  if (firestoreModuleCache) {
    const db = await getDbInstance();
    if (!db) {
      throw new Error("Firebase Firestore is not available. Check environment variables.");
    }
    return { firestore: firestoreModuleCache, db };
  }
  
  // If import in progress, wait for it
  if (importPromise) {
    return importPromise;
  }
  
  // Start new import using the unified safe wrapper
  importPromise = (async () => {
    try {
      // CRITICAL: Use the unified safe import wrapper from firebase-module-loader
      // This ensures Firebase app is initialized before importing firestore modules
      const firestore = await safeImportFirestoreFromLoader();
      
      // Get db instance
      const db = await getDbInstance();
      
      if (!db) {
        throw new Error("Firebase Firestore is not available. Check that NEXT_PUBLIC_FIREBASE_* environment variables are set.");
      }
      
      // Cache the module
      firestoreModuleCache = firestore;
      
      return { firestore, db };
    } catch (error: any) {
      // Reset promise on error so we can retry
      importPromise = null;
      const errorMessage = error?.message || String(error);
      
      if (errorMessage.includes("apiKey") || errorMessage.includes("authenticator")) {
        throw new Error("Firebase initialization failed. Check that NEXT_PUBLIC_FIREBASE_API_KEY, NEXT_PUBLIC_FIREBASE_PROJECT_ID, and NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN are set in your environment variables.");
      }
      
      throw error;
    }
  })();
  
  return importPromise;
}

/**
 * Get Firestore functions with automatic initialization.
 * This is a convenience wrapper that ensures Firebase is ready.
 */
export async function getFirestoreFunctions() {
  const { firestore, db } = await safeImportFirestore();
  
  return {
    // Document functions
    doc: (...pathSegments: string[]) => firestore.doc(db, ...pathSegments),
    getDoc: firestore.getDoc,
    setDoc: firestore.setDoc,
    updateDoc: firestore.updateDoc,
    deleteDoc: firestore.deleteDoc,
    
    // Collection functions
    collection: (...pathSegments: string[]) => firestore.collection(db, ...pathSegments),
    addDoc: firestore.addDoc,
    getDocs: firestore.getDocs,
    
    // Query functions
    query: firestore.query,
    where: firestore.where,
    orderBy: firestore.orderBy,
    limit: firestore.limit,
    startAt: firestore.startAt,
    startAfter: firestore.startAfter,
    endAt: firestore.endAt,
    endBefore: firestore.endBefore,
    
    // Field values
    serverTimestamp: firestore.serverTimestamp,
    increment: firestore.increment,
    arrayUnion: firestore.arrayUnion,
    arrayRemove: firestore.arrayRemove,
    
    // Return db instance for advanced usage
    db,
  };
}

