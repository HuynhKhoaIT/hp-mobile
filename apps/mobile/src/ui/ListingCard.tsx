// ListingCard — thẻ tin dùng chung 4 tính năng Listing. Khớp web `listing-card.tsx` (cùng thứ tự, cùng prop):
// (1) ảnh bìa 4:3 (`row`: ảnh vuông bên trái) hoặc ô giữ chỗ màu dịch vụ + icon → (2) badge danh mục (neutral)
// + badge ngôn ngữ khi tin khác ngôn ngữ đang dùng → (3) tiêu đề tối đa 2 dòng → (4) giá đậm 700
// → (5) "Cách <khu> <khoảng cách>" (hoặc tên khu) · thời gian đăng.
// ListingCover dùng lại ở chi tiết (ô giữ chỗ cỡ lớn khi tin chưa có ảnh).
import { listingCover, type PublicListing } from '@hp/core';
import { featureOfCategory } from '@hp/shared';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { formatRelative } from '@/lib/format';
import { listingImageUrl } from '@/lib/images';
import { usePriceText, useSiteText } from '@/lib/listing';
import { Badge } from './Badge';
import { Card } from './Card';
import { Icon } from './Icon';
import { Image } from './interop';
import { SERVICE } from './service';
import { Text } from './Text';
import { useTheme } from './theme';

export type ListingCardLayout = 'grid' | 'row';

export type ListingCardProps = {
  listing: PublicListing;
  layout?: ListingCardLayout;
  onPress?: () => void;
  /** Bề rộng / vị trí trong lưới hoặc hàng ngang (vd `w-44`). */
  className?: string;
  /** Ưu tiên tải ảnh (vd 4 thẻ đầu của dải đầu tiên ở Hub: 'high'). */
  imagePriority?: 'low' | 'normal' | 'high';
};

const join = (...parts: (string | false | undefined)[]) => parts.filter(Boolean).join(' ');

/** Ảnh bìa tin, hoặc ô giữ chỗ nền màu dịch vụ + icon khi tin chưa có ảnh. */
export function ListingCover({
  listing,
  size = 'thumb',
  priority,
  className,
}: {
  listing: Pick<PublicListing, 'images' | 'category'>;
  size?: 'thumb' | 'full';
  priority?: 'low' | 'normal' | 'high';
  className?: string;
}) {
  const { t } = useTranslation();
  const { motion } = useTheme();
  const cover = listingCover(listing);
  if (cover) {
    return (
      <Image
        source={{ uri: listingImageUrl(cover, size) }}
        contentFit="cover"
        cachePolicy="memory-disk"
        priority={priority}
        transition={motion.fast.duration}
        accessibilityIgnoresInvertColors
        className={join('bg-surface-2', className)}
      />
    );
  }
  const service = featureOfCategory(listing.category);
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={t('listing:card.no_image')}
      className={join('items-center justify-center', SERVICE[service].soft, className)}
    >
      <Icon icon={SERVICE[service].icon} service={service} size={size === 'full' ? 56 : 32} />
    </View>
  );
}

export function ListingCard({ listing, layout = 'grid', onPress, className, imagePriority }: ListingCardProps) {
  const { t, i18n } = useTranslation();
  const priceText = usePriceText();
  const siteText = useSiteText();
  const price = priceText(listing);
  const meta = [siteText(listing), formatRelative(listing.created_at)].filter(Boolean).join(' · ');
  const showLang = listing.lang !== i18n.language && i18n.exists(`common:locale.${listing.lang}`);

  const body = (
    <View className={layout === 'grid' ? 'gap-1 p-3' : 'flex-1 gap-1'}>
      <View className="flex-row flex-wrap gap-1">
        <Badge label={t(`common:category.${listing.category}`)} numberOfLines={1} />
        {showLang ? <Badge label={t(`common:locale.${listing.lang}`)} tone="primary" numberOfLines={1} /> : null}
      </View>
      <Text variant="label" numberOfLines={2}>
        {listing.title}
      </Text>
      {/* Đơn vị sau "/" cuối (vd /tháng) chữ nhỏ, cho xuống dòng: số + ₫ nối bằng dấu cách không ngắt nên dễ bị cắt (giống web). */}
      <Text variant="price" numberOfLines={2}>
        {price.lastIndexOf('/') > 0 ? price.slice(0, price.lastIndexOf('/')) : price}
        {price.lastIndexOf('/') > 0 ? (
          <Text variant="caption" tone="muted" weight="semibold">
            {price.slice(price.lastIndexOf('/'))}
          </Text>
        ) : null}
      </Text>
      <Text variant="caption" tone="muted" numberOfLines={1}>
        {meta}
      </Text>
    </View>
  );

  return (
    <Card
      padded={layout === 'row'}
      onPress={onPress}
      accessibilityLabel={[listing.title, price, meta].join(', ')}
      className={className}
    >
      {layout === 'grid' ? (
        <>
          <ListingCover listing={listing} priority={imagePriority} className="aspect-card w-full rounded-t-md" />
          {body}
        </>
      ) : (
        <View className="flex-row items-start gap-3">
          <ListingCover listing={listing} priority={imagePriority} className="aspect-avatar w-24 rounded-sm" />
          {body}
        </View>
      )}
    </Card>
  );
}
