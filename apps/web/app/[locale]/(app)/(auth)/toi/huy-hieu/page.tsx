// /toi/huy-hieu — huy hiệu xác minh: trạng thái 4 huy hiệu + form gửi giấy tờ (ảnh nén / PDF ≤ 5 MB → request-badge).
// Dữ liệu riêng → đọc ở trình duyệt (BadgeRequestView, hook @hp/core/react); server chỉ render khung + skeleton.
// Khu (auth): proxy.ts chặn khách (→ /dang-nhap?next=…), noindex.
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { BadgeRequestView } from '@/features/profile/components/badge-request-view';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('common.badge_request');
  return { title: t('title'), robots: { index: false, follow: false } };
}

export default async function Page() {
  const t = await getTranslations('common.badge_request');
  return (
    <section className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-6">
      <h1 className="text-2xl font-semibold text-fg">{t('title')}</h1>
      <BadgeRequestView />
    </section>
  );
}
