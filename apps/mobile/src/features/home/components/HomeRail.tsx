// Một dải tin ở Hub (§4.7, §4.8, §10): tiêu đề hàng cao 44 (ô icon size-8 + tiêu đề text-lg 600 + phụ đề, phải:
// "Xem tất cả" + ChevronRight) → thẻ ListingCard grid rộng 208 cuộn ngang có snap. Đang tải → 3 thẻ chờ; lỗi →
// ErrorState gọn ở dải này; rỗng → ẩn (hoặc `empty` hiện thay, vd dải "Gần {khu}" luôn hiện).
import type { PublicListing } from '@hp/core';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { track } from '@/core/analytics';
import { ListingRail } from '@/features/listing/components/ListingRail';
import { ErrorState, SectionHeader, type SectionHeaderIcon, Skeleton, SkeletonListingCard } from '@/ui';

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

export function HomeRail({
  rail,
  title,
  subtitle,
  icon,
  items,
  isLoading,
  isError,
  errorCode,
  onRetry,
  onSeeAll,
  empty,
  priorityCount,
}: HomeRailProps) {
  const { t } = useTranslation();
  if (!isLoading && !isError && items.length === 0 && !empty) return null;

  const header =
    title === null ? (
      <View className="min-h-11 flex-row items-center gap-3 px-4">
        <Skeleton className="size-8 rounded-md" />
        <Skeleton className="h-5 w-1/2" />
      </View>
    ) : (
      <SectionHeader
        className="px-4"
        title={title}
        subtitle={subtitle}
        icon={icon}
        chevron
        action={
          items.length > 0
            ? {
                label: t('home.see_all'),
                accessibilityLabel: `${t('home.see_all')}: ${title}`,
                onPress: () => {
                  track('home_rail_see_all', { rail });
                  onSeeAll();
                },
              }
            : undefined
        }
      />
    );

  return (
    <View className="gap-3">
      {header}
      {isLoading ? (
        <View className="px-4">
          <SkeletonListingCard count={3} horizontal itemClassName="w-52" />
        </View>
      ) : isError ? (
        <ErrorState compact className="mx-4" title={t('home.section_error')} code={errorCode} onRetry={onRetry} />
      ) : items.length === 0 ? (
        <View className="px-4">{empty}</View>
      ) : (
        <ListingRail
          variant="hub"
          items={items}
          priorityCount={priorityCount}
          onItemPress={(listing) => track('home_rail_click', { rail, listing_id: listing.id })}
        />
      )}
    </View>
  );
}
