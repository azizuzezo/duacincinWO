import createMDX from "@next/mdx";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // 95 is used for the founder portraits on /tentang-kami.
    qualities: [75, 95],
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
