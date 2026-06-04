import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.supabase.co" },
      { protocol: "https", hostname: "placehold.co" },
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "books.google.com" },
      { protocol: "http", hostname: "books.google.com" },
      { protocol: "https", hostname: "covers.openlibrary.org" },
      { protocol: "https", hostname: "cf.geekdo-static.com" },
      { protocol: "https", hostname: "**.googleusercontent.com" },
    ],
  },
};

export default nextConfig;
