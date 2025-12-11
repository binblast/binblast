// lib/firebase-module-loader.ts
// Wrapper to ensure Firebase app exists before importing Firebase modules
// Uses the unified firebase-client.ts for initialization

import { getFirebaseApp } from "./firebase-client";

/**
 * Safely import firebase/firestore functions
 * Ensures Firebase app is initialized before importing
 */
export async function safeImportFirestore() {
  // CRITICAL: Wait for early initialization promise if it exists
  // This ensures Firebase is initialized before importing modules
  if (typeof window !== 'undefined' && (window as any).__firebaseClientInitPromise) {
    try {
      await (window as any).__firebaseClientInitPromise;
    } catch {
      // Continue even if early init failed - will try again below
    }
  }
  
  // Wait for Firebase app to be initialized via the unified client
  const app = await getFirebaseApp();
  
  if (!app) {
    throw new Error("Firebase app is not initialized");
  }
  
  // Verify app has valid config
  if (!app.options?.apiKey || !app.options?.projectId || !app.options?.appId) {
    throw new Error("Firebase app missing required config");
  }
  
  // Now safe to import firestore
  return await import("firebase/firestore");
}

/**
 * Safely import firebase/auth functions
 * Ensures Firebase app is initialized before importing
 */
export async function safeImportAuth() {
  // CRITICAL: Wait for early initialization promise if it exists
  // This ensures Firebase is initialized before importing modules
  if (typeof window !== 'undefined' && (window as any).__firebaseClientInitPromise) {
    try {
      await (window as any).__firebaseClientInitPromise;
    } catch {
      // Continue even if early init failed - will try again below
    }
  }
  
  // Wait for Firebase app to be initialized via the unified client
  const app = await getFirebaseApp();
  
  if (!app) {
    throw new Error("Firebase app is not initialized");
  }
  
  // Verify app has valid config
  if (!app.options?.apiKey || !app.options?.projectId || !app.options?.appId) {
    throw new Error("Firebase app missing required config");
  }
  
  // Now safe to import auth
  return await import("firebase/auth");
}

