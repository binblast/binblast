// lib/firebase.ts
// Re-export from firebase-client.ts for backward compatibility
// All new code should import directly from firebase-client.ts
// CRITICAL: This file uses dynamic re-exports to prevent webpack from bundling firebase-client.ts into page chunks
// All functions are async and dynamically import from firebase-client.ts

export async function getFirebaseApp() {
  const { getFirebaseApp: fn } = await import("./firebase-client");
  return fn();
}

export async function getAuthInstance() {
  const { getAuthInstance: fn } = await import("./firebase-client");
  return fn();
}

export async function getDbInstance() {
  const { getDbInstance: fn } = await import("./firebase-client");
  return fn();
}

export async function isFirebaseReady() {
  const { isFirebaseReady: fn } = await import("./firebase-client");
  return fn();
}

export async function onAuthStateChanged(callback: (user: any) => void) {
  const { onAuthStateChanged: fn } = await import("./firebase-client");
  return fn(callback);
}

export async function signInWithEmailAndPassword(email: string, password: string) {
  const { signInWithEmailAndPassword: fn } = await import("./firebase-client");
  return fn(email, password);
}

export async function createUserWithEmailAndPassword(email: string, password: string) {
  const { createUserWithEmailAndPassword: fn } = await import("./firebase-client");
  return fn(email, password);
}

export async function signOut() {
  const { signOut: fn } = await import("./firebase-client");
  return fn();
}

export async function updateProfile(user: any, profile: { displayName?: string; photoURL?: string }) {
  const { updateProfile: fn } = await import("./firebase-client");
  return fn(user, profile);
}

export async function sendPasswordResetEmail(email: string) {
  const { sendPasswordResetEmail: fn } = await import("./firebase-client");
  return fn(email);
}
