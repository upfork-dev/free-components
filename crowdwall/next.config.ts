import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    qualities: [75],
    // Only photos under public/images are optimized. If yours live on a CDN, add it to remotePatterns.
    localPatterns: [{ pathname: "/images/**", search: "" }],
  },
  async redirects() {
    return [{ source: "/", destination: "/demo/community-hero", permanent: false }];
  },
};

export default nextConfig;
