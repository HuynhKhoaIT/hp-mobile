// Hàng ngang thẻ tin (Hub "Tin mới", chi tiết "Tin tương tự"): ≤ 6 thẻ grid rộng cố định w-44.
// Ít item, không cần ảo hoá → ScrollView ngang (không lồng list cùng chiều trong màn cuộn dọc).
import type { PublicListing } from '@hp/core';
import { ScrollView } from 'react-native';
import { ListingCard } from '@/ui';
import { openListing } from '../navigation';

export type ListingRailProps = {
  items: PublicListing[];
  /** Tràn qua padding ngang của Screen (-mx-4) khi đặt trong màn có lề. */
  bleed?: boolean;
};

export function ListingRail({ items, bleed = false }: ListingRailProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      className={bleed ? '-mx-4' : undefined}
      contentContainerClassName="items-start gap-3 px-4 pb-2 pt-1"
    >
      {items.map((listing) => (
        <ListingCard key={listing.id} listing={listing} layout="grid" className="w-44" onPress={() => openListing(listing.id)} />
      ))}
    </ScrollView>
  );
}
