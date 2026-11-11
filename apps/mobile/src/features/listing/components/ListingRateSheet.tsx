// "Đánh giá & lời cảm ơn" mở riêng (không qua bước trả đồ) cho tin đồ thất lạc đã trả lại:
// - ListingRateSheet: BottomSheet bọc ListingRateForm — chủ tin mở từ thẻ "Tin của tôi" ("Cảm ơn người trả đồ" /
//   "Đánh giá người nhận").
// - ListingRateEntry: nút + sheet tự ẩn cho NGƯỜI KHÔNG PHẢI CHỦ TIN (đã nhắn tin với chủ tin về tin) — gắn ở chi tiết tin
//   khi tin đã trả lại (`isReturned(listing)` và người xem không phải chủ tin). Chưa chat / khách / đã chấm → không hiện
//   nút (đã chấm → dòng "Bạn đã chấm N/5"). Quyền thật ở RPC rate_listing.
import { ratedCounterpart } from '@hp/core';
import { useListingCounterparts } from '@hp/core/react';
import { Star } from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { BottomSheet, Button, StarRating, Text } from '@/ui';
import { ListingRateForm } from './ListingRateForm';

export function ListingRateSheet({ listingId, open, onClose }: { listingId: string; open: boolean; onClose: () => void }) {
  const { t } = useTranslation('listing');
  return (
    <BottomSheet open={open} onClose={onClose} title={t('lost_found.rate.title')}>
      {open ? <ListingRateForm listingId={listingId} onDone={onClose} /> : null}
    </BottomSheet>
  );
}

/** Nút "Đánh giá chủ tin" cho người đã chat về tin đã trả lại (tự ẩn khi không có ai để chấm). */
export function ListingRateEntry({ listingId }: { listingId: string }) {
  const { t } = useTranslation('listing');
  const people = useListingCounterparts(listingId);
  const [open, setOpen] = useState(false);
  const list = people.data ?? [];
  const owner = list.find((c) => c.isOwner);
  if (!owner) return null;
  const rated = ratedCounterpart(list);
  if (rated?.myScore) {
    return (
      <View className="flex-row items-center gap-2">
        <StarRating value={rated.myScore} size="sm" accessibilityLabel={t('group:rate.your_score', { score: rated.myScore })} />
        <Text variant="caption" tone="muted">
          {t('group:rate.your_score', { score: rated.myScore })}
        </Text>
      </View>
    );
  }
  return (
    <>
      <Button label={t('lost_found.rate_cta_owner')} icon={Star} variant="outline" fullWidth onPress={() => setOpen(true)} />
      <ListingRateSheet listingId={listingId} open={open} onClose={() => setOpen(false)} />
    </>
  );
}
