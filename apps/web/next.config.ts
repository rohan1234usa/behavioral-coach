import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // This Rewrite Rule acts as a Reverse Proxy
  // It tricks the browser into thinking it's uploading to "localhost:3000" (Allowed)
  // But Next.js secretly forwards the data to "127.0.0.1:9000" (The Real Storage)
  async rewrites() {
    return [
      {
        source: '/minio-proxy/:path*',
        destination: 'http://127.0.0.1:9000/:path*',
      },
      {
        source: '/api/upload/:path*',
        destination: 'http://127.0.0.1:8000/api/upload/:path*',
      },
      {
        source: '/api/analysis/:path*',
        destination: 'http://127.0.0.1:8000/api/analysis/:path*',
      },
      {
        source: '/api/sessions/:path*',
        destination: 'http://127.0.0.1:8000/api/sessions/:path*',
      },
      {
        source: '/api/questions/:path*',
        destination: 'http://127.0.0.1:8000/api/questions/:path*',
      },
    ];
  },
};

export default nextConfig;