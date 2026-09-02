import type { NextConfig } from "next";

// 'standalone' produces a self-contained server bundle used by the Fly.io Dockerfile.
// Vercel does its own tracing and breaks when standalone is on, so we only opt in
// via NEXT_OUTPUT_STANDALONE=1 (set inside the Dockerfile builder stage).
const nextConfig: NextConfig = {
  output: process.env.NEXT_OUTPUT_STANDALONE === "1" ? "standalone" : undefined,
};

export default nextConfig;
