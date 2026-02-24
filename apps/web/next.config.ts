import type { NextConfig } from "next";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:8000';
const STORAGE_URL = process.env.NEXT_PUBLIC_STORAGE_URL || 'http://127.0.0.1:9000';

const nextConfig: NextConfig = {
  // This Rewrite Rule acts as a Reverse Proxy
  // It tricks the browser into thinking it's uploading to "localhost:3000" (Allowed)
  // But Next.js secretly forwards the data to the storage or API
  async rewrites() {
    return [
      {
        source: '/minio-proxy/:path*',
        destination: `${STORAGE_URL}/:path*`,
      },
      {
        source: '/api/upload/:path*',
        destination: `${BACKEND_URL}/api/upload/:path*`,
      },
      {
        source: '/api/analysis/:path*',
        destination: `${BACKEND_URL}/api/analysis/:path*`,
      },
      {
        source: '/api/sessions/:path*',
        destination: `${BACKEND_URL}/api/sessions/:path*`,
      },
      {
        source: '/api/questions/:path*',
        destination: `${BACKEND_URL}/api/questions/:path*`,
      },
    ];
  },
};

export default nextConfig;