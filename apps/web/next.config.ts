import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // Gói dùng chung trong monorepo xuất thẳng mã TypeScript; Next cần biên dịch chúng.
  transpilePackages: ["@hp/core", "@hp/shared", "@hp/db", "@hp/tokens"],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
