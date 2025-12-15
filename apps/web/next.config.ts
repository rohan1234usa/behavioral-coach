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
    ];
  },
};

export default nextConfig;