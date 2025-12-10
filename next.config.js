/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Prevent Firebase from being split into dynamic chunks
      // Force Firebase to stay in the main bundle and be available immediately
      const originalSplitChunks = config.optimization.splitChunks;
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          ...originalSplitChunks,
          cacheGroups: {
            ...originalSplitChunks?.cacheGroups,
            // Keep Firebase in initial chunks only (main bundle)
            // This prevents Firebase from being loaded in dynamic chunks before initialization
            firebase: {
              test: /[\\/]node_modules[\\/](firebase|@firebase)[\\/]/,
              name: 'firebase',
              chunks: 'initial', // Only include in initial chunks, not async chunks
              enforce: true,
              priority: 30,
            },
            // Prevent any module that imports Firebase from being split
            default: {
              ...originalSplitChunks?.cacheGroups?.default,
              minChunks: 2,
              priority: -20,
              reuseExistingChunk: true,
            },
          },
        },
      };
      
      // Ensure Firebase modules are resolved correctly
      config.resolve.alias = {
        ...config.resolve.alias,
      };
    }
    return config;
  },
}

module.exports = nextConfig

