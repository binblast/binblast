/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Prevent Firebase from being split into separate chunks
      // This ensures Firebase is always loaded from the main bundle
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          ...config.optimization.splitChunks,
          cacheGroups: {
            ...config.optimization.splitChunks?.cacheGroups,
            default: false,
            vendors: false,
            // Keep Firebase in main bundle
            firebase: {
              test: /[\\/]node_modules[\\/](firebase|@firebase)[\\/]/,
              name: 'firebase',
              chunks: 'all',
              enforce: true,
              priority: 20,
            },
          },
        },
      };
    }
    return config;
  },
}

module.exports = nextConfig

