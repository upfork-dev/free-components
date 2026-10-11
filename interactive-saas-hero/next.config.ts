import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [{ source: "/", destination: "/demo/interactive-hero", permanent: false }];
  },
};

export default nextConfig;
