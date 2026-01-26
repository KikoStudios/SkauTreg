import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    dynamicIO: true,
  },
  rewrites: async () => {
    return {
      beforeFiles: [
        {
          source: '/:path*',
          destination: '/:path*',
          locale: false,
        },
      ],
    };
  },
};

export default nextConfig;
