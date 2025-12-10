// lib/firebase-sync-init-script.ts
// This generates a script that initializes Firebase synchronously before React loads
// This must run in the HTML <head> to prevent any Firebase module imports from executing first

export const firebaseInitScript = `
(function() {
  if (typeof window === 'undefined') return;
  
  // Check if Firebase is already initialized
  if (window.__firebaseAppInitialized) return;
  
  // Mark as initializing to prevent race conditions
  window.__firebaseAppInitialized = false;
  window.__firebaseInitPromise = new Promise(function(resolve, reject) {
    try {
      var apiKey = "${process.env.NEXT_PUBLIC_FIREBASE_API_KEY || ''}".trim();
      var projectId = "${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || ''}".trim();
      var authDomain = "${process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || ''}".trim();
      
      if (!apiKey || !projectId || !authDomain || apiKey.length === 0 || projectId.length === 0 || authDomain.length === 0) {
        console.warn('[Firebase Sync Script] Missing environment variables - Firebase features may not work');
        window.__firebaseAppInitialized = true;
        resolve();
        return;
      }
      
      // Import Firebase app module and initialize immediately
      // This must happen BEFORE any other Firebase modules can be imported
      import('firebase/app').then(function(firebaseApp) {
        try {
          var getApps = firebaseApp.getApps;
          var initializeApp = firebaseApp.initializeApp;
          
          // Check if app already exists
          var existingApps = getApps();
          if (existingApps.length > 0) {
            // Verify existing app has valid config
            for (var i = 0; i < existingApps.length; i++) {
              var app = existingApps[i];
              if (app && app.options && app.options.apiKey && typeof app.options.apiKey === 'string' && app.options.apiKey.length > 0) {
                console.log('[Firebase Sync Script] Using existing app');
                window.__firebaseAppInitialized = true;
                resolve();
                return;
              }
            }
          }
          
          // Create config
          var config = {
            apiKey: apiKey,
            authDomain: authDomain,
            projectId: projectId
          };
          
          ${process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ? `config.storageBucket = "${process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET}";` : ''}
          ${process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ? `config.messagingSenderId = "${process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID}";` : ''}
          ${process.env.NEXT_PUBLIC_FIREBASE_APP_ID ? `config.appId = "${process.env.NEXT_PUBLIC_FIREBASE_APP_ID}";` : ''}
          
          // Initialize Firebase app BEFORE any other modules can import
          initializeApp(config);
          window.__firebaseAppInitialized = true;
          console.log('[Firebase Sync Script] Firebase initialized');
          resolve();
        } catch (err) {
          console.error('[Firebase Sync Script] Error:', err);
          window.__firebaseAppInitialized = true;
          resolve(); // Resolve anyway to prevent blocking
        }
      }).catch(function(err) {
        console.error('[Firebase Sync Script] Import error:', err);
        window.__firebaseAppInitialized = true;
        resolve(); // Resolve anyway to prevent blocking
      });
    } catch (err) {
      console.error('[Firebase Sync Script] Error:', err);
      window.__firebaseAppInitialized = true;
      resolve(); // Resolve anyway to prevent blocking
    }
  });
})();
`;

