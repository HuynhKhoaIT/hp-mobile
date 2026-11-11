'use client';

// Hàng chip trạng thái "Tin của tôi" (style Stitch): Đang đăng · Chờ duyệt · Nháp · Đã đóng, cuộn ngang tràn mép.
// Số trên chip từ useMyListingStats (@hp/core/react; khoá nằm dưới myListings() nên thao tác tin làm mới số): Chờ duyệt =
// pending + rejected (tab pending của listMyListings gồm cả tin bị từ chối), Đã đóng không có số. Đang tải / lỗi → chip
// không số (khối danh sách tự báo lỗi). Hai kiểu: link `?tab=` (trang /toi/tin-cua-toi — chạy cả khi tắt JS) hoặc nút chọn
// tại chỗ (`onSelect`, khối xem trước ở /toi).
import type { MyListingStats, MyListingsTab } from '@hp/core';
import { useMyListingStats } from '@hp/core/react';
import { formatNumber } from '@hp/shared';
import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import { asLocale } from '../display';
import { MY_LISTING_TABS } from '../manage';

function countOf(tab: MyListingsTab, s: MyListingStats | undefined): number | null {
  if (!s) return null;
  if (tab === 'active') return s.active;
  if (tab === 'pending') return s.pending + s.rejected;
  if (tab === 'draft') return s.drafts;
  return null;
}

const CHIP =
  'inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-semibold whitespace-nowrap outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50';

export function MyListingChips({
  current,
  onSelect,
  className,
}: {
  current: MyListingsTab | null;
  /** Có → nút chọn tại chỗ (aria-pressed); không → link /toi/tin-cua-toi?tab=. */
  onSelect?: (tab: MyListingsTab) => void;
  className?: string;
}) {
  const t = useTranslations('listing.manage');
  const locale = asLocale(useLocale());
  const stats = useMyListingStats().data;

  const chip = (tab: MyListingsTab) => {
    const selected = current === tab;
    const count = countOf(tab, stats);
    const inner = (
      <>
        {t(`tab.${tab}`)}
        {count !== null ? (
          <span
            className={cn(
              'inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-bold',
              selected ? 'bg-on-primary/20' : 'bg-surface-2 text-fg',
            )}
          >
            {formatNumber(count, locale)}
          </span>
        ) : null}
      </>
    );
    const look = selected
      ? 'border-primary bg-primary text-on-primary'
      : 'border-border bg-surface text-muted hover:bg-surface-2 hover:text-fg';
    return onSelect ? (
      <button type="button" aria-pressed={selected} onClick={() => onSelect(tab)} className={cn(CHIP, look)}>
        {inner}
      </button>
    ) : (
      <Link
        href={{ pathname: '/toi/tin-cua-toi', query: { tab } }}
        aria-current={selected ? 'page' : undefined}
        className={cn(CHIP, look)}
      >
        {inner}
      </Link>
    );
  };

  const list = (
    <ul className="flex gap-2 py-0.5">
      {MY_LISTING_TABS.map((tab) => (
        <li key={tab} className="flex">
          {chip(tab)}
        </li>
      ))}
    </ul>
  );
  const wrap = cn('no-scrollbar -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0', className);
  return onSelect ? (
    <div role="group" aria-label={t('title')} className={wrap}>
      {list}
    </div>
  ) : (
    <nav aria-label={t('title')} className={wrap}>
      {list}
    </nav>
  );
}
