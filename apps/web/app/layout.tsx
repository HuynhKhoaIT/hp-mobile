import type { Metadata } from "next";
import "./globals.css";

// Khung tạm. Tuần 1 (docs/plan/web.md): next-intl [locale], font Be Vietnam Pro qua next/font,
// preset Tailwind từ @hp/tokens, theme dark bằng class.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="vi" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
