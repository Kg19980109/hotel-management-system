import type { NextConfig } from "next";

const securityHeaders = [
  {
    key: "X-DNS-Prefetch-Control",
    value: "on",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "X-XSS-Protection",
    value: "1; mode=block",
  },
  {
    key: "X-Frame-Options",
    value: "SAMEORIGIN",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  compress: true,

  images: {
    remotePatterns: [{ protocol: "https", hostname: "images.unsplash.com" }],
    formats: ["image/avif", "image/webp"],
    // Aggressively cache remote images to avoid re-fetching
    minimumCacheTTL: 3600,
  },

  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "@radix-ui/react-icons",
      "date-fns",
      "clsx",
      "tailwind-merge",
      "@supabase/supabase-js",
    ],
    // Cache client-router segments for snappy back/forward navigation
    staleTimes: {
      dynamic: 30,    // dynamic pages cached 30s client-side (avoids refetch on back nav)
      static: 180,    // static pages cached 3min client-side
    },
  },

  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
      {
        // Cache static public images (1 day browser, revalidate)
        source: "/images/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=3600" }],
      },
    ];
  },
};

export default nextConfig;
