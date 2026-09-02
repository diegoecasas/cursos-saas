import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 'standalone' produces a self-contained server bundle used by the Fly.io Dockerfile.
  // Vercel ignores this setting and uses its own build output.
  output: "standalone",
};

export default nextConfig;
