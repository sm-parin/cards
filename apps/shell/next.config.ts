import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@cards/ui", "@cards/types", "@cards/config", "@cards/auth", "@cards/game-sdk"],
};

export default nextConfig;
