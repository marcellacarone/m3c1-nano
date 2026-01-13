import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'grown-concrete-antelope.ngrok-free.app',
      },
    ],
  },
};

export default nextConfig;
