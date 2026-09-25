import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/",
        destination: "/app",
        permanent: true, // Use true for a 308 permanent redirect, or false for a 307 temporary redirect
      },
    ];
  },
};

export default nextConfig;
