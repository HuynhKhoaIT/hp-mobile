// Hàng ngang thẻ tin. 'compact' (chi tiết "Tin tương tự"): thẻ grid w-44. 'hub' (dải tin ở trang chủ,
// docs/design/home.md §10): thẻ grid w-52 (208), cách nhau 12, lề 16, dừng đúng đầu thẻ (snap theo bề rộng thẻ đo được).
// Ít item (≤ 10), không cần ảo hoá → ScrollView ngang (không lồng list cùng chiều trong màn cuộn dọc).
import type { PublicListing } from '@hp/core';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { ListingCard, useTheme } from '@/ui';
import { openListing } from '../navigation';

export type ListingRailProps = {
  items: PublicListing[];
  variant?: 'compact' | 'hub';
  /** Tràn qua padding ngang của Screen (-mx-4) khi đặt trong màn có lề. */
  bleed?: boolean;
  /** Gọi trước khi mở chi tiết (analytics). */
  onItemPress?: (listing: PublicListing, index: number) => void;
  /** Số thẻ đầu tải ảnh ưu tiên cao (dải đầu tiên của Hub: 4). */
  priorityCount?: number;
};

export function ListingRail({ items, variant = 'compact', bleed = false, onItemPress, priorityCount = 0 }: ListingRailProps) {
  const { space } = useTheme();
  const [cardWidth, setCardWidth] = useState(0);
  const hub = variant === 'hub';
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      className={bleed ? '-mx-4' : undefined}
      decelerationRate={hub ? 'fast' : 'normal'}
      snapToInterval={hub && cardWidth > 0 ? cardWidth + space[3] : undefined}
      snapToAlignment="start"
      contentContainerClassName="items-start gap-3 px-4 pb-2 pt-1"
    >
      {items.map((listing, i) => (
        <View
          key={listing.id}
          className={hub ? 'w-52' : 'w-44'}
          // Đo thẻ đầu → bước snap = bề rộng thẻ + gap-3 (không ghi số px ở đây).
          onLayout={hub && i === 0 ? (e) => setCardWidth(e.nativeEvent.layout.width) : undefined}
        >
          <ListingCard
            listing={listing}
            layout="grid"
            imagePriority={i < priorityCount ? 'high' : undefined}
            onPress={() => {
              onItemPress?.(listing, i);
              openListing(listing.id);
            }}
          />
        </View>
      ))}
    </ScrollView>
  );
}
