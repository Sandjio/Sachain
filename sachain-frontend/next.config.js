/** @type {import('next').NextConfig} */

const nextConfig = {
  i18n: {
    locales: ['en', 'fr'],
    defaultLocale: 'en',
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination:
          'https://hev5at4o19.execute-api.us-east-1.amazonaws.com/dev/:path*',
      },
    ];
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

module.exports = nextConfig;
