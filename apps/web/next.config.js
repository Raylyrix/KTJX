/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000',
    NEXT_PUBLIC_AI_API_URL: process.env.NEXT_PUBLIC_AI_API_URL || 'http://localhost:4001',
  },
  async rewrites() {
    return [
      {
        source: '/api/analytics/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/v1/analytics/:path*`,
      },
      {
        source: '/api/ai/:path*',
        destination: `${process.env.NEXT_PUBLIC_AI_API_URL || 'http://localhost:4001'}/api/v1/ai/:path*`,
      },
      {
        source: '/api/ingestion/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/v1/ingestion/:path*`,
      },
    ]
  },
}

module.exports = nextConfig
