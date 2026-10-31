import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

// next-intl đọc cấu hình theo request từ src/i18n/request.ts.
const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // Chỉ có tác dụng với `next dev`: cho phép mở dev server qua IP LAN (điện thoại cùng wifi). Thiếu dòng này
  // Next chặn websocket HMR từ origin khác localhost → client kết nối lại thất bại rồi tự tải lại trang liên tục.
  allowedDevOrigins: ["10.*.*.*", "192.168.*.*", "172.*.*.*"],
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
