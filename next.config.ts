import type { NextConfig } from "next";

// We use 'any' here to stop TypeScript from complaining about the new feature
const nextConfig: any = {
  experimental: {
    allowedDevOrigins: ["localhost:3000", "192.168.1.108:3000"],
  },
};

export default nextConfig;