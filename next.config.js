/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Prevent Firebase from being split into dynamic chunks
      // Force Firebase to stay in the main bundle
      const originalSplitChunks = config.optimization.splitChunks;
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          ...originalSplitChunks,
          cacheGroups: {
            ...originalSplitChunks?.cacheGroups,
            // Keep Firebase in initial chunks only (main bundle)
            firebase: {
              test: /[\\/]node_modules[\\/](firebase|@firebase)[\\/]/,
              name: 'firebase',
              chunks: 'initial', // Only include in initial chunks, not async chunks
              enforce: true,
              priority: 30,
            },
          },
        },
      };
    }
    return config;
  },
}

module.exports = nextConfig

