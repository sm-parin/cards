import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@cards/ui", "@cards/types", "@cards/config"],
};

export default nextConfig;
