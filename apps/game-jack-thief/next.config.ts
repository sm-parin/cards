import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@cards/types",
    "@cards/ui",
    "@cards/i18n",
    "@cards/hooks",
    "@cards/theme",
    "@cards/game-sdk",
  ],
  turbopack: {
    /** Expand root to monorepo root so workspace packages and hoisted node_modules are resolvable */
    root: path.resolve(__dirname, '../..'),
  },
};

export default nextConfig;
