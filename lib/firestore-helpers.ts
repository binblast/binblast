// lib/firestore-helpers.ts
// Helper functions to safely import and use Firestore functions
// This ensures Firebase app is initialized before importing firestore modules

import { getDbInstance } from "./firebase";

// Cache for Firestore functions to avoid repeated imports
let firestoreModule: any = null;
let firestoreImportPromise: Promise<any> | null = null;

async function ensureFirestoreModule() {
  if (firestoreModule) {
    return firestoreModule;
  }
  
  if (firestoreImportPromise) {
    return firestoreImportPromise;
  }
  
  // CRITICAL: Ensure Firebase is initialized before importing firestore
  // This prevents "Neither apiKey nor config.authenticator provided" errors
  firestoreImportPromise = (async () => {
    // Wait for Firebase to be initialized first
    const db = await getDbInstance();
    if (!db) {
      throw new Error("Firebase Firestore is not available. Check environment variables.");
    }
    
    // Now safe to import firestore - app is already initialized
    firestoreModule = await import("firebase/firestore");
    return firestoreModule;
  })();
  
  return firestoreImportPromise;
}

// Export commonly used Firestore functions with safe initialization
export async function getFirestoreDoc(path: string, ...pathSegments: string[]) {
  const firestore = await ensureFirestoreModule();
  return firestore.doc(await getDbInstance(), path, ...pathSegments);
}

export async function getFirestoreCollection(path: string, ...pathSegments: string[]) {
  const firestore = await ensureFirestoreModule();
  return firestore.collection(await getDbInstance(), path, ...pathSegments);
}

// Re-export Firestore functions with initialization guarantee
export async function getFirestoreFunctions() {
  const firestore = await ensureFirestoreModule();
  const db = await getDbInstance();
  if (!db) {
    throw new Error("Firebase Firestore is not available");
  }
  
  // Return functions bound to our db instance
  return {
    doc: (...pathSegments: string[]) => firestore.doc(db, ...pathSegments),
    collection: (...pathSegments: string[]) => firestore.collection(db, ...pathSegments),
    query: firestore.query,
    where: firestore.where,
    orderBy: firestore.orderBy,
    limit: firestore.limit,
    getDoc: firestore.getDoc,
    getDocs: firestore.getDocs,
    setDoc: firestore.setDoc,
    updateDoc: firestore.updateDoc,
    addDoc: firestore.addDoc,
    serverTimestamp: firestore.serverTimestamp,
    increment: firestore.increment,
    // Add other functions as needed
  };
}

// Helper to safely import firestore and get db instance
export async function getFirestoreModule() {
  const firestore = await ensureFirestoreModule();
  const db = await getDbInstance();
  if (!db) {
    throw new Error("Firebase Firestore is not available");
  }
  return { firestore, db };
}

