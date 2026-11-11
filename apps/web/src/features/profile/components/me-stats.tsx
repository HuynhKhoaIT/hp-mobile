'use client';

// Dải số liệu trang "Tôi" (style Stitch): MỘT card lưới 3 cột ngăn bởi đường kẻ (như CommunitySection trang chủ) —
// Tin đang đăng · Lượt xem (my_listing_stats qua useMyListingStats, đọc ở trình duyệt, cùng khoá với thẻ "Tin của bạn"
// trang chủ) · Đánh giá (rating_avg 1 chữ số thập phân + sao, nhãn "{n} đánh giá"; chưa có → "—" + "Chưa có đánh giá",
// lấy từ hồ sơ đã đọc ở server). Đang tải → số giữ chỗ cùng khung; lỗi → khối lỗi + Thử lại.
import { useMyListingStats } from '@hp/core/react';
import { formatNumber } from '@hp/shared';
import { Star } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { SectionError } from '@/features/home/components/section-error';
import { asLocale } from '@/features/listing/display';

const CARD = 'rounded-lg border border-border bg-surface px-2 py-4 shadow-card';

function Cell({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col-reverse items-center justify-end gap-0.5 px-2 text-center">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="flex min-h-7 items-center gap-1 text-xl font-bold text-primary">{children}</dd>
    </div>
  );
}

export function MeStats({ ratingAvg, ratingCount }: { ratingAvg: number; ratingCount: number }) {
  const t = useTranslations('common');
  const locale = asLocale(useLocale());
  const stats = useMyListingStats();

  if (stats.isError) return <SectionError onRetry={() => void stats.refetch()} />;

  const number = (value: number | undefined) =>
    value === undefined ? <Skeleton className="h-7 w-10" /> : formatNumber(value, locale);
  // formatNumber không nhận tuỳ chọn → làm tròn 1 chữ số thập phân trước (4,9 · 5).
  const rating = Math.round(ratingAvg * 10) / 10;

  return (
    <dl className={`${CARD} grid grid-cols-3 divide-x divide-border`}>
      <Cell label={t('profile.listings')}>{number(stats.data?.active)}</Cell>
      <Cell label={t('home.card.views')}>{number(stats.data?.total_views)}</Cell>
      <Cell label={ratingCount > 0 ? t('profile.ratings', { count: ratingCount }) : t('profile.no_rating')}>
        {ratingCount > 0 ? (
          <>
            {formatNumber(rating, locale)}
            <Star aria-hidden strokeWidth={1.75} className="size-5 fill-warning text-warning" />
          </>
        ) : (
          <span aria-hidden>—</span>
        )}
      </Cell>
    </dl>
  );
}
