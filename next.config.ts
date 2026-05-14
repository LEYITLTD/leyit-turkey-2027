import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [],
  },
  // Disable client-side router cache for dynamic pages so navigating
  // between /booking/[ref] routes always fetches fresh server data.
  experimental: {
    staleTimes: {
      dynamic: 0,
    },
  },
};

export default nextConfig;
