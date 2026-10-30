import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Lets several dev servers run side by side (e.g. NEXT_DIST_DIR=.next-preview).
  distDir: process.env.NEXT_DIST_DIR || ".next",
  // The dev badge covers the bottom-left of /preview screenshots.
  devIndicators: false,
};

export default nextConfig;
