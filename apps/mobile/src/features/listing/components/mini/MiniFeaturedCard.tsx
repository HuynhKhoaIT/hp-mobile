// Thẻ nổi bật đầu danh sách trang chủ mini-app bố cục 'directory' (Nhà trọ — Stitch "Phòng trọ giá tốt ca kíp"): ListingCard
// layout 'featured' (ảnh lớn + "{n} ảnh", giá + thông số, tiện nghi `home.featured.highlights`) + tim lưu tin (config
// card.display.bookmark, không cho tin của mình) + hai nút: Gọi (Hiện số → Gọi — reveal_contact, cần đăng nhập, như thanh liên
// hệ ở chi tiết) · Nhắn tin (mở chat trong mini-app). Tin của mình → không có nút liên hệ.
import type { PublicListing } from '@hp/core';
import { formatVnPhone } from '@hp/shared';
import { MessageCircle, Phone } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { Button, ListingCard } from '@/ui';
import { useContactListing, useIsOwner, useListingBookmark, useRevealPhone } from '../../hooks';
import { useMiniApp } from '../../miniApp';
import { openListing } from '../../navigation';

export type MiniFeaturedCardProps = {
  listing: PublicListing;
  featured: { photosKey: string; callKey: string; chatKey: string; highlights: readonly string[] };
};

export function MiniFeaturedCard({ listing, featured }: MiniFeaturedCardProps) {
  const { t } = useTranslation('listing');
  const { config } = useMiniApp();
  const isOwner = useIsOwner(listing);
  const bookmark = useListingBookmark(listing.id);
  const phone = useRevealPhone(listing);
  const contact = useContactListing();
  const shown = phone.revealed && phone.phone ? formatVnPhone(phone.phone) : null;
  const noPhone = phone.revealed && !phone.phone;
  const display = config.card.display;
  const photos = listing.images.length;

  const footer = isOwner ? null : (
    <View className="flex-row gap-2">
      <View className="flex-1">
        <Button
          variant="secondary"
          icon={Phone}
          fullWidth
          label={shown ? t('contact.call', { phone: shown }) : t(featured.callKey)}
          accessibilityLabel={shown ? t('contact.call', { phone: shown }) : t('contact.reveal_call')}
          loading={phone.isPending}
          disabled={noPhone}
          onPress={() => (phone.phone ? phone.call(phone.phone) : phone.reveal())}
        />
      </View>
      <View className="flex-1">
        <Button
          icon={MessageCircle}
          fullWidth
          label={t(featured.chatKey)}
          loading={contact.isPending}
          onPress={() => contact.open(listing, { mini: config.slug })}
        />
      </View>
    </View>
  );

  return (
    <ListingCard
      layout="featured"
      listing={listing}
      display={{ ...display, highlights: featured.highlights }}
      coverLabel={photos > 0 ? t(featured.photosKey, { count: photos }) : undefined}
      bookmark={display?.bookmark && !isOwner ? bookmark : undefined}
      imagePriority="high"
      footer={footer}
      onPress={() => openListing(listing.id, { mini: config.slug })}
    />
  );
}
