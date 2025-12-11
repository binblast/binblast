// lib/firebase.ts
// Re-export from firebase-client.ts for backward compatibility
// All new code should import directly from firebase-client.ts
export {
  getFirebaseApp,
  getAuthInstance,
  getDbInstance,
  isFirebaseReady,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile,
} from "./firebase-client";
