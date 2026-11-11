// /toi/huy-hieu — huy hiệu xác minh (style Stitch "Huy hiệu & Xác minh (BadgeRequestCard)", cùng kiểu "Nhóm của tôi"):
// header xanh (BadgeHero: H1 + dòng phụ render ở server, hộp tóm tắt số huy hiệu đọc ở trình duyệt) → BadgeRequestView:
// lợi ích → chọn huy hiệu (4 thẻ) → gửi giấy tờ (ảnh nén / PDF ≤ 5 MB → request-badge) → hộp riêng tư → nút gửi.
// Dữ liệu riêng → đọc ở trình duyệt (hook @hp/core/react); server chỉ render khung. Khu (auth): proxy.ts chặn khách
// (→ /dang-nhap?next=…), noindex. Khác Stitch: xem đầu badge-request-view.tsx.
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { BadgeHero } from '@/features/profile/components/badge-hero';
import { BadgeRequestView } from '@/features/profile/components/badge-request-view';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('common.badge_request');
  return { title: t('title'), robots: { index: false, follow: false } };
}

export default function Page() {
  return (
    <section className="mx-auto flex w-full max-w-3xl flex-col gap-5 pb-6 sm:px-4 sm:pt-6">
      <BadgeHero />
      <div className="px-4 sm:px-0">
        <BadgeRequestView />
      </div>
    </section>
  );
}
