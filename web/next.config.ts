import createMDX from "@next/mdx";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // 95 is used for the founder portraits on /tentang-kami.
    qualities: [75, 95],
  },
  async headers() {
    // Baseline security headers (trust signals for users and crawlers). No CSP
    // yet: inline scripts, Google sign-in, the chat WebSocket and Supabase
    // images need an allow-list that is tested first.
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
        ],
      },
    ];
  },
  async redirects() {
    // The company details moved into /tentang-kami.
    return [{ source: "/perusahaan", destination: "/tentang-kami#perusahaan", permanent: true }];
  },
};

// Articles (/artikel) are MDX files in src/content/artikel, imported by the
// article route; they are not routes themselves, so pageExtensions stays default.
const withMDX = createMDX({});

export default withMDX(nextConfig);
