import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    localPatterns: [
      {
        pathname: "/logo.svg",
      },
      {
        pathname: "/logo.jpg",
      },
      {
        pathname: "/api/barcode/**",
      },
    ],
  },
};

export default nextConfig;
