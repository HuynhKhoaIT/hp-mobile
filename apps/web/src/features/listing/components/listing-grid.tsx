// Lưới thẻ tin (grid 2 / 3 / 4 cột hoặc row 1 / 2 cột theo config.cardLayout). Không 'use client': dùng cho trang đầu SSR và các trang "Xem thêm" ở client.
import type { PublicListing } from '@hp/core';
import { LISTING_GRID_CLASS } from '@/components/shared/skeletons';
import { ListingCard } from './listing-card';

/** Số thẻ đầu tải ảnh sớm (hàng đầu trên desktop 4 cột). */
const PRIORITY_COUNT = 4;

export function ListingGrid({
  items,
  now,
  layout = 'grid',
  prioritizeFirst = false,
}: {
  items: PublicListing[];
  layout?: 'grid' | 'row';
  /** Thời điểm đọc dữ liệu (ms) — xem ListingCardProps.now. */
  now: number;
  prioritizeFirst?: boolean;
}) {
  return (
    <ul className={LISTING_GRID_CLASS[layout]}>
      {items.map((listing, i) => (
        <li key={listing.id} className="flex flex-col *:flex-1">
          <ListingCard listing={listing} layout={layout} now={now} priority={prioritizeFirst && i < PRIORITY_COUNT} />
        </li>
      ))}
    </ul>
  );
}
