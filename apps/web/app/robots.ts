// /robots.txt — chặn khu không công khai (mọi tiền tố ngôn ngữ: vi không tiền tố, /en, /zh) + trỏ sitemap index.
// Lưu ý: toàn site `noindex` ở layout gốc trừ khi NEXT_PUBLIC_ALLOW_INDEX=true; robots.txt vẫn cho phép thu thập để Google
// đọc được thẻ noindex đó.
import type { MetadataRoute } from 'next';
import { publicEnv } from '@/lib/env';
import { withLocale } from '@/i18n/paths';
import { routing } from '@/i18n/routing';

const PRIVATE = ['/admin', '/toi', '/tin-nhan', '/dang-tin', '/thong-bao', '/tao-nhom', '/dang-nhap'] as const;

export default function robots(): MetadataRoute.Robots {
  const base = publicEnv.siteUrl.replace(/\/+$/, '');
  const disallow = routing.locales.flatMap((locale) => PRIVATE.map((p) => withLocale(p, locale)));
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: [...disallow, '/api/'] }],
    sitemap: `${base}/sitemap.xml`,
  };
}
