import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

// next-intl đọc cấu hình theo request từ src/i18n/request.ts.
const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

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

export default withNextIntl(nextConfig);
