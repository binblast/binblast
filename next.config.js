/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Prevent Firebase from being split into dynamic chunks
      // Force Firebase to stay in the main bundle
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            default: {
              minChunks: 2,
              priority: -20,
              reuseExistingChunk: true,
            },
            // Keep Firebase out of dynamic chunks
            firebase: {
              test: /[\\/]node_modules[\\/](firebase|@firebase)[\\/]/,
              name: 'firebase',
              chunks: 'initial', // Only include in initial chunks, not async chunks
              enforce: true,
              priority: 30,
            },
            // Prevent other vendors from including Firebase
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendors',
              chunks: 'all',
              priority: 10,
              reuseExistingChunk: true,
              // Exclude Firebase from vendor chunk
              exclude: /[\\/]node_modules[\\/](firebase|@firebase)[\\/]/,
            },
          },
        },
      };
    }
    return config;
  },
}

module.exports = nextConfig

