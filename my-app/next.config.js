/** @type {import('next').NextConfig} */

const nextConfig = {
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  reactStrictMode: false,
  productionBrowserSourceMaps: false,
  webpack: (config) => {
    config.devtool = 'eval';
    return config;
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:5001/api/:path*',
      },
    ];
  },
}

module.exports = nextConfig;
