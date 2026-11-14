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

export default nextConfig;
