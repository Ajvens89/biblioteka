import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200],
    imageSizes: [64, 96, 128, 256, 384],
    remotePatterns: [
      { protocol: "https", hostname: "**.supabase.co" },
      { protocol: "https", hostname: "placehold.co" },
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "books.google.com" },
      { protocol: "http", hostname: "books.google.com" },
      { protocol: "https", hostname: "covers.openlibrary.org" },
      { protocol: "https", hostname: "cf.geekdo-static.com" },
      { protocol: "https", hostname: "**.googleusercontent.com" },
      { protocol: "https", hostname: "**.walmartimages.com" },
      { protocol: "https", hostname: "target.scene7.com" },
      { protocol: "https", hostname: "**.booksamillion.com" },
      { protocol: "https", hostname: "**.kohlsimg.com" },
      { protocol: "https", hostname: "**.neweggimages.com" },
      { protocol: "https", hostname: "**.macysassets.com" },
      { protocol: "https", hostname: "**.onbuy.com" },
      { protocol: "https", hostname: "**.r10s.com" },
      { protocol: "https", hostname: "**.r10.io" },
      { protocol: "http", hostname: "**.r10.io" },
      { protocol: "https", hostname: "mediacdn.aent-m.com" },
      { protocol: "https", hostname: "**.jet.com" },
      { protocol: "https", hostname: "firebasestorage.googleapis.com" },
      { protocol: "https", hostname: "**.firebasestorage.app" },
    ],
  },
};

export default nextConfig;
