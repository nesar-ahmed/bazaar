import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Catalog imagery comes from the API (seeded as Unsplash URLs, admin can
    // paste any host), so remote optimization is allowed over HTTPS.
    remotePatterns: [
      { protocol: "https", hostname: "**" },
      { protocol: "http", hostname: "localhost" },
      { protocol: "http", hostname: "127.0.0.1" },
    ],
    deviceSizes: [360, 420, 540, 640, 768, 900, 1080, 1280, 1440, 1920],
    imageSizes: [40, 64, 96, 128, 192, 256, 320, 384],
    formats: ["image/webp"],
    minimumCacheTTL: 3600,
  },
};

export default nextConfig;
