import type { NextConfig } from "next";

// Force rebuild: 2026-05-03
const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Frame-Options",
            value: "ALLOWALL",
          },
          {
            key: "Content-Security-Policy",
            value: "frame-ancestors 'self' https://sea-publishing.com https://*.sea-publishing.com https://seaside-pub.com https://*.seaside-pub.com",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
