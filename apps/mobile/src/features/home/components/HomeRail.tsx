// Một dải tin ở Hub (§4.7, §4.8, §10): khung dùng chung ListingRailSection của engine listing (tiêu đề + "Xem tất cả",
// thẻ cuộn ngang có snap, chờ / lỗi / rỗng) + analytics của Hub (home_rail_see_all, home_rail_click).
import type { PublicListing } from '@hp/core';
import type { ReactNode } from 'react';
import { track } from '@/core/analytics';
import { ListingRailSection } from '@/features/listing/components/ListingRailSection';
import type { SectionHeaderIcon } from '@/ui';

export type HomeRailProps = {
  /** Mã dải cho analytics (near, for_you, pass, room…). */
  rail: string;
  /** null: tiêu đề chưa biết (vd chờ tên khu) → khung chờ. */
  title: string | null;
  subtitle?: string;
  icon: SectionHeaderIcon;
  items: PublicListing[];
  isLoading: boolean;
  isError: boolean;
  errorCode?: string;
  onRetry: () => void;
  onSeeAll: () => void;
  /** Nội dung khi rỗng; không có → ẩn cả dải. */
  empty?: ReactNode;
  /** Số thẻ đầu tải ảnh sớm (dải đầu tiên: 4). */
  priorityCount?: number;
};

export function HomeRail({ rail, onSeeAll, ...rest }: HomeRailProps) {
  return (
    <ListingRailSection
      {...rest}
      onSeeAll={() => {
        track('home_rail_see_all', { rail });
        onSeeAll();
      }}
      onItemPress={(listing) => track('home_rail_click', { rail, listing_id: listing.id })}
    />
  );
}
