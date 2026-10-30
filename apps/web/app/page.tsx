// Trang tạm sau khi dựng monorepo. Tuần 1–2 (docs/plan/web.md) chuyển sang app/[locale]/(marketing)/page.tsx
// với next-intl; khi đó mọi chữ đi qua t(), không viết chuỗi thô như ở đây.
export default function Home() {
  return <main className="flex min-h-full flex-1" />;
}
