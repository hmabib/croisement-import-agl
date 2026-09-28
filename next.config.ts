import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 100% local : aucun appel réseau au runtime, export statique simple.
  reactStrictMode: true,
};

export default nextConfig;
