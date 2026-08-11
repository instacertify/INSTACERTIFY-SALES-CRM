import type { NextConfig } from "next";

/**
 * Do not set `distDir` to a parent path — Next.js forbids output outside the app.
 * Hostinger root `.next` is created by `scripts/hostinger-postbuild.mjs` (copy).
 *
 * /api proxy is handled in server.mjs for Hostinger. Rewrites below help local
 * `next start` when API runs separately.
 */
const apiProxy =
  process.env.API_INTERNAL_URL ||
  `http://127.0.0.1:${process.env.API_PORT || process.env.PORT_API || "4000"}`;

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
  async rewrites() {
    // When using server.mjs, it proxies /api before Next — these are a fallback.
    if (process.env.HOSTINGER_CUSTOM_SERVER === "1") return [];
    return [
      {
        source: "/api/v1/:path*",
        destination: `${apiProxy}/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
