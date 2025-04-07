/** @type {import('next').NextConfig} */

const nextConfig = {
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  reactStrictMode: false,
  productionBrowserSourceMaps: false,
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  experimental: {
    optimizeCss: true,
  },
  webpack: (config) => {
    config.devtool = false;
    // Cache webpack in memory
    config.cache = {
      type: 'memory',
      cacheUnaffected: true,
    };
    return config;
  },
}

module.exports = nextConfig;
