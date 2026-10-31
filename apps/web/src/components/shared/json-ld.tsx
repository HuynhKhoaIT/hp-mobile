// JsonLd — nhúng dữ liệu có cấu trúc (schema.org) cho SEO. Chỉ dữ liệu có thật (.claude/rules/web-seo-public.md).
// Thoát `<` để chuỗi người dùng không đóng được thẻ <script>.
export function JsonLd({ data }: { data: Record<string, unknown> | Record<string, unknown>[] }) {
  const json = JSON.stringify(data).replace(/</g, '\\u003c');
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}
