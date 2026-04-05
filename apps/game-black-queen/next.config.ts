import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  turbopack: {
    /** Expand root to monorepo root so workspace packages (@cards/*) and hoisted node_modules are resolvable */
    root: path.resolve(__dirname, '../..'),
  },
};

export default nextConfig;
