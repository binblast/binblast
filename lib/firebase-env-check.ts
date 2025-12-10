// lib/firebase-env-check.ts
// Utility to check Firebase environment variables at runtime
// This helps debug missing environment variable issues

export function checkFirebaseEnvVars(): {
  allPresent: boolean;
  missing: string[];
  present: string[];
} {
  const requiredVars = [
    'NEXT_PUBLIC_FIREBASE_API_KEY',
    'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
    'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
  ];
  
  const optionalVars = [
    'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
    'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
    'NEXT_PUBLIC_FIREBASE_APP_ID',
  ];
  
  const missing: string[] = [];
  const present: string[] = [];
  
  for (const varName of requiredVars) {
    const value = process.env[varName];
    if (!value || value.trim().length === 0) {
      missing.push(varName);
    } else {
      present.push(varName);
    }
  }
  
  for (const varName of optionalVars) {
    const value = process.env[varName];
    if (value && value.trim().length > 0) {
      present.push(varName);
    }
  }
  
  return {
    allPresent: missing.length === 0,
    missing,
    present,
  };
}

// Log environment variable status (without exposing values)
export function logFirebaseEnvStatus() {
  if (typeof window === 'undefined') {
    // Server-side - don't log
    return;
  }
  
  const status = checkFirebaseEnvVars();
  
  if (status.allPresent) {
    console.log('[Firebase Env Check] All required environment variables are present');
  } else {
    console.error('[Firebase Env Check] Missing required environment variables:', status.missing);
    console.error('[Firebase Env Check] Present variables:', status.present);
    console.error('[Firebase Env Check] Make sure NEXT_PUBLIC_* variables are set in your deployment environment');
  }
  
  return status;
}

