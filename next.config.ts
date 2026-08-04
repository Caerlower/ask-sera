import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Bundle knowledge markdown into the serverless function.
  outputFileTracingIncludes: {
    "/api/chat": ["./knowledge/**/*"],
  },
};

export default nextConfig;
