// lib/firebase-module-loader.ts
// Wrapper to ensure Firebase app exists before importing Firebase modules
// Uses the unified firebase-client.ts for initialization

import { getFirebaseApp } from "./firebase-client";

/**
 * Safely import firebase/firestore functions
 * Ensures Firebase app is initialized before importing
 */
export async function safeImportFirestore() {
  // CRITICAL: Wait for early initialization promise FIRST
  // This ensures Firebase app exists before importing Firebase modules
  if (typeof window !== 'undefined') {
    // Check both window and global for the promise
    const initPromise = (window as any).__firebaseClientInitPromise || (global as any).__firebaseClientInitPromise;
    if (initPromise) {
      try {
        // Wait for initialization to complete - this is critical
        await initPromise;
      } catch (error: any) {
        // Log but continue - will verify app exists below
        const errorMsg = error?.message || String(error);
        if (!errorMsg.includes("Failed to resolve module specifier")) {
          console.warn("[Firebase Module Loader] Early init promise failed:", errorMsg);
        }
      }
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
  
  // Now safe to import firestore - app is guaranteed to exist
  return await import("firebase/firestore");
}

/**
 * Safely import firebase/auth functions
 * Ensures Firebase app is initialized before importing
 */
export async function safeImportAuth() {
  // CRITICAL: Wait for early initialization promise FIRST
  // This ensures Firebase app exists before importing Firebase modules
  if (typeof window !== 'undefined') {
    // Check both window and global for the promise
    const initPromise = (window as any).__firebaseClientInitPromise || (global as any).__firebaseClientInitPromise;
    if (initPromise) {
      try {
        // Wait for initialization to complete - this is critical
        await initPromise;
      } catch (error: any) {
        // Log but continue - will verify app exists below
        const errorMsg = error?.message || String(error);
        if (!errorMsg.includes("Failed to resolve module specifier")) {
          console.warn("[Firebase Module Loader] Early init promise failed:", errorMsg);
        }
      }
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
  
  // Now safe to import auth - app is guaranteed to exist
  return await import("firebase/auth");
}

