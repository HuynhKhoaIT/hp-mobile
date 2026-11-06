// Trang tính năng + link kho có UTM (.claude/rules/web-marketing.md). Đổi slug trang tính năng ảnh hưởng SEO: hỏi trước.
import type { Feature } from '@hp/shared';
import { publicEnv } from '@/lib/env';

export const FEATURE_PAGES = [
  { slug: 'pass-do', feature: 'pass', href: '/pass-do', kind: 'listing' },
  { slug: 'tim-tro', feature: 'room', href: '/tro', kind: 'listing' },
  { slug: 'tim-viec', feature: 'job', href: '/viec-lam', kind: 'listing' },
  { slug: 'do-that-lac', feature: 'lostFound', href: '/that-lac', kind: 'listing' },
  { slug: 'ghep-xe', feature: 'ride', href: '/ghep-xe', kind: 'group' },
  { slug: 'ghep-tran', feature: 'sport', href: '/ghep-tran', kind: 'group' },
] as const satisfies readonly { slug: string; feature: Feature; href: string; kind: 'listing' | 'group' }[];

const withUtm = (url: string, medium: string, campaign: string) => {
  const u = new URL(url);
  u.searchParams.set('utm_source', 'web');
  u.searchParams.set('utm_medium', medium);
  u.searchParams.set('utm_campaign', campaign);
  return u.toString();
};

/** Link kho đang có (chưa cấu hình → rỗng), gắn UTM theo vị trí nút. */
export function storeLinks(medium: string, campaign = 'launch') {
  return [
    { key: 'app_store', href: publicEnv.appStoreUrl },
    { key: 'play_store', href: publicEnv.playStoreUrl },
  ]
    .filter((s) => s.href)
    .map((s) => ({ key: s.key as 'app_store' | 'play_store', href: withUtm(s.href, medium, campaign) }));
}

/** Đường dẫn /tai-app cho QR (quét bằng điện thoại → trang tự chuyển sang kho). */
export const qrPath = (campaign: string) => `/tai-app?utm_source=web&utm_medium=qr&utm_campaign=${campaign}`;
