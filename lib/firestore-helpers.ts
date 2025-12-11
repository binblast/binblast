// lib/firestore-helpers.ts
// Helper functions to safely import and use Firestore functions
// This ensures Firebase app is initialized before importing firestore modules
// DEPRECATED: Use firebase-module-loader.ts instead
// This file is kept for backward compatibility but now uses the unified firebase-module-loader

// CRITICAL: Use dynamic imports to prevent webpack from bundling firebase-client.ts into page chunks

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
  
  // CRITICAL: Use the unified safe import wrapper from firebase-module-loader
  // This ensures Firebase app is initialized before importing firestore modules
  firestoreImportPromise = (async () => {
    // CRITICAL: Use dynamic imports to prevent webpack from bundling firebase-client.ts into page chunks
    const { safeImportFirestore } = await import("./firebase-module-loader");
    // Wait for Firebase to be initialized first using the unified safe wrapper
    firestoreModule = await safeImportFirestore();
    return firestoreModule;
  })();
  
  return firestoreImportPromise;
}

// Export commonly used Firestore functions with safe initialization
export async function getFirestoreDoc(path: string, ...pathSegments: string[]) {
  const firestore = await ensureFirestoreModule();
  const { getDbInstance } = await import("./firebase");
  return firestore.doc(await getDbInstance(), path, ...pathSegments);
}

export async function getFirestoreCollection(path: string, ...pathSegments: string[]) {
  const firestore = await ensureFirestoreModule();
  const { getDbInstance } = await import("./firebase");
  return firestore.collection(await getDbInstance(), path, ...pathSegments);
}

// Re-export Firestore functions with initialization guarantee
export async function getFirestoreFunctions() {
  const firestore = await ensureFirestoreModule();
  const { getDbInstance } = await import("./firebase");
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
  const { getDbInstance } = await import("./firebase");
  const db = await getDbInstance();
  if (!db) {
    throw new Error("Firebase Firestore is not available");
  }
  return { firestore, db };
}

