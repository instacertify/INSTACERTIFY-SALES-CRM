import type { NextConfig } from "next";

/**
 * Do not set `distDir` to a parent path — Next.js forbids output outside the app.
 * Hostinger root `.next` is created by `scripts/hostinger-postbuild.mjs` (copy).
 */
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
