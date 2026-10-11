import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [{ source: "/", destination: "/demo/beam-button", permanent: false }];
  },
};

export default nextConfig;
