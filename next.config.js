/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // CRITICAL: Prevent Firebase from being code-split
      // Force all Firebase modules into the main bundle so they load together
      // This ensures firebase/app initializes before firebase/auth or firebase/firestore can be imported
      const originalSplitChunks = config.optimization.splitChunks;
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          ...originalSplitChunks,
          cacheGroups: {
            ...originalSplitChunks?.cacheGroups,
            // CRITICAL: Keep ALL Firebase modules in the main bundle
            // This prevents firebase/auth and firebase/firestore from loading before firebase/app initializes
            firebase: {
              test: /[\\/]node_modules[\\/](firebase|@firebase)[\\/]/,
              name: 'firebase',
              chunks: 'initial', // Only in initial chunks, never in async chunks
              enforce: true,
              priority: 100, // Highest priority to ensure it's in main bundle FIRST
              maxAsyncRequests: 1, // Minimum value (1) to prevent async loading
              maxInitialRequests: Infinity,
              // CRITICAL: Force Firebase into main bundle by setting minSize to 0
              // This ensures Firebase loads before any page chunks
              minSize: 0,
            },
            // CRITICAL: Force firebase-client.ts and firebase-module-loader.ts into main bundle
            // This ensures Firebase initialization happens before any page chunks can execute
            firebaseClient: {
              test: /[\\/]lib[\\/](firebase-client|firebase-module-loader)[\\/]/,
              name: 'firebase-client',
              chunks: 'initial',
              enforce: true,
              priority: 100, // Same priority as Firebase modules
              minSize: 0,
            },
            // Prevent modules that import Firebase from being split separately
            // This ensures Firebase initialization happens before page chunks load
            default: {
              ...originalSplitChunks?.cacheGroups?.default,
              minChunks: 2,
              priority: -20,
              reuseExistingChunk: true,
              // Don't split chunks that import Firebase
              test: (module) => {
                // Allow splitting unless module imports Firebase
                return true;
              },
            },
          },
        },
      };
      
      // Ensure Firebase modules load in correct order
      config.resolve.alias = {
        ...config.resolve.alias,
      };
    }
    return config;
  },
}

module.exports = nextConfig

