// Sheet xác nhận "Đã nhận lại đồ" / "Đã trả cho chủ" (đồ thất lạc, chủ tin) — style Stitch "Popup xác minh nhận lại đồ":
// thẻ nhỏ của món đồ (ảnh bìa, nhãn Mất đồ / Nhặt được, tiêu đề, nơi mất / nhặt) → (tin nhặt được) hộp nhắc hỏi đặc điểm
// riêng trước khi trao → giải thích tin sẽ đóng → nút chính ghi rõ việc + Huỷ. Gọi RPC mark_listing_returned qua
// useMarkReturned (returned = true + đóng tin trong một lệnh). Dùng ở chi tiết tin của mình và thẻ "Tin của tôi".
// Cố ý khác Stitch: không có form khai tên / CCCD / ảnh đối chiếu / giờ đến nhận gửi "đội bảo vệ" — app không có luồng
// yêu cầu nhận đồ hay dữ liệu đó; việc đối chiếu diễn ra khi hai bên nhắn tin / gặp mặt.
import type { PublicListing } from '@hp/core';
import { MapPin, PackageCheck, ShieldCheck } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { attributeString } from '@/lib/listing';
import { Badge, BottomSheet, Button, Icon, ListingCover, Notice, Text } from '@/ui';
import { useMarkReturned } from '../hooks';

type ReturnedListing = Pick<PublicListing, 'id' | 'title' | 'category' | 'images' | 'attributes'>;

/** Chữ nút / tiêu đề theo loại tin: mất đồ → "Đã nhận lại đồ", nhặt được → "Đã trả cho chủ". */
export function returnedLabelKeys(category: PublicListing['category']) {
  return category === 'found'
    ? { action: 'lost_found.mark_returned_found', title: 'lost_found.mark_returned_found_confirm_title' }
    : { action: 'lost_found.mark_returned', title: 'lost_found.mark_returned_confirm_title' };
}

export function ReturnedSheet({ listing, open, onClose }: { listing: ReturnedListing; open: boolean; onClose: () => void }) {
  const { t } = useTranslation('listing');
  const mark = useMarkReturned(listing.id);
  const labels = returnedLabelKeys(listing.category);
  const found = listing.category === 'found';
  const place = attributeString(listing, 'place');

  return (
    <BottomSheet open={open} onClose={onClose} title={t(labels.title)}>
      <View className="flex-row items-center gap-3 rounded-lg border border-border bg-surface-2 p-3">
        <View className="size-14 overflow-hidden rounded-md border border-border">
          <ListingCover listing={listing} className="size-full" />
        </View>
        <View className="flex-1 gap-1">
          <Badge
            label={t(found ? 'lost_found.kind_found' : 'lost_found.kind_lost')}
            tone={found ? 'success' : 'danger'}
            numberOfLines={1}
          />
          <Text variant="label" weight="semibold" numberOfLines={2}>
            {listing.title}
          </Text>
          {place ? (
            <View className="flex-row items-center gap-1">
              <Icon icon={MapPin} tone="muted" size={16} />
              <Text variant="caption" tone="muted" numberOfLines={1} className="shrink">
                {place}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
      {found ? <Notice icon={ShieldCheck} text={t('lost_found.returned_check')} /> : null}
      <Text tone="muted">{t('lost_found.mark_returned_confirm_body')}</Text>
      <Button
        label={t(labels.action)}
        icon={PackageCheck}
        fullWidth
        loading={mark.isPending}
        onPress={() => mark.markReturned(onClose)}
      />
      <Button label={t('common:actions.cancel')} variant="ghost" fullWidth onPress={onClose} />
    </BottomSheet>
  );
}
