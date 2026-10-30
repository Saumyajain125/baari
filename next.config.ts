import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Lets several dev servers run side by side (e.g. NEXT_DIST_DIR=.next-preview).
  distDir: process.env.NEXT_DIST_DIR || ".next",
  // The dev badge covers the bottom-left of /preview screenshots.
  devIndicators: false,
  // The per-clinic link-preview images render on demand and read these fonts
  // from disk; file tracing doesn't follow the readFile calls on its own.
  outputFileTracingIncludes: {
    "/q/**/opengraph-image": ["./src/lib/og/fonts/*.ttf"],
  },
};

export default nextConfig;
