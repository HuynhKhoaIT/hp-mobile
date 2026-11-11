// ListingCard — thẻ tin dùng chung 4 tính năng Listing. Khớp web `listing-card.tsx` (cùng thứ tự, cùng prop):
// (1) ảnh bìa 4:3 (`row`: ảnh vuông bên trái) hoặc ô giữ chỗ màu dịch vụ + icon → (2) badge danh mục (neutral)
// + "Đã trả lại" (đồ thất lạc đã nhận lại, success) + badge ngôn ngữ khi tin khác ngôn ngữ đang dùng
// → (3) tiêu đề tối đa 2 dòng → (4) giá đậm 700 màu primary
// → (5) MapPin + "Cách <khu> <khoảng cách>" (hoặc tên khu) · thời gian đăng.
// Style Stitch: Card bo lg viền hairline; `grid` đặt badge (2) dạng nhãn nổi (Badge overlay) ở góc trái trên ảnh,
// `row` giữ badge trong thân thẻ (ảnh vuông nhỏ không đủ chỗ).
// `display` (config.card.display của tính năng — khớp web `card` trong config): (4b) tối đa 3 nhãn thông số dưới giá
// (trọ: diện tích · có gác · ở tối đa; pass: tình trạng; việc: ca), badge danh mục đổi nhãn + tone theo category (đồ thất
// lạc: "Mất đồ" đỏ / "Nhặt được" xanh), dòng (5) lấy nơi + thời điểm từ attributes (đồ thất lạc: place · lost_at) thay
// cho khu · thời gian đăng. Không truyền → thẻ chung (dải tin ở Hub, Tin đã lưu…).
// ListingCover dùng lại ở chi tiết (ô giữ chỗ cỡ lớn khi tin chưa có ảnh).
import { listingCover, type PublicListing } from '@hp/core';
import { featureOfCategory, type ListingCategory } from '@hp/shared';
import { MapPin } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { formatRelative } from '@/lib/format';
import { listingImageUrl } from '@/lib/images';
import { attributeString, isReturned, useCardFacts, usePriceText, useSiteText } from '@/lib/listing';
import { Badge, type BadgeTone } from './Badge';
import { Card } from './Card';
import { Icon } from './Icon';
import { Image } from './interop';
import { SERVICE } from './service';
import { Text } from './Text';
import { useTheme } from './theme';

export type ListingCardLayout = 'grid' | 'row';

/** Điểm nhấn của thẻ theo tính năng (config.card.display) — xem chú thích đầu file. */
export type ListingCardDisplay = {
  /** Khoá attributes hiện thành nhãn nhỏ dưới giá (thứ tự hiển thị, tối đa 3). */
  facts?: readonly string[];
  /** Badge danh mục theo category: tone + key i18n nhãn thay cho `common:category.<code>`. */
  categoryBadge?: Partial<Record<ListingCategory, { tone: BadgeTone; labelKey?: string }>>;
  /** Khoá attributes text thay tên khu ở dòng cuối (vd `place`). */
  placeKey?: string;
  /** Khoá attributes datetime thay thời gian đăng ở dòng cuối (vd `lost_at`). */
  timeKey?: string;
};

export type ListingCardProps = {
  listing: PublicListing;
  layout?: ListingCardLayout;
  onPress?: () => void;
  /** Bề rộng / vị trí trong lưới hoặc hàng ngang (vd `w-44`). */
  className?: string;
  /** Ưu tiên tải ảnh (vd 4 thẻ đầu của dải đầu tiên ở Hub: 'high'). */
  imagePriority?: 'low' | 'normal' | 'high';
  /** Điểm nhấn theo tính năng (config.card.display). */
  display?: ListingCardDisplay;
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

export function ListingCard({ listing, layout = 'grid', onPress, className, imagePriority, display }: ListingCardProps) {
  const { t, i18n } = useTranslation();
  const priceText = usePriceText();
  const siteText = useSiteText();
  const cardFacts = useCardFacts();
  const price = priceText(listing);
  const site = attributeString(listing, display?.placeKey) ?? siteText(listing);
  const time = attributeString(listing, display?.timeKey) ?? listing.created_at;
  const meta = [site, formatRelative(time)].filter(Boolean).join(' · ');
  const facts = cardFacts(listing, display?.facts);
  const showLang = listing.lang !== i18n.language && i18n.exists(`common:locale.${listing.lang}`);
  const returned = isReturned(listing);
  const grid = layout === 'grid';
  const categoryBadge = display?.categoryBadge?.[listing.category];
  const category = categoryBadge?.labelKey ? t(categoryBadge.labelKey) : t(`common:category.${listing.category}`);

  const badges = (
    <View pointerEvents="none" className={grid ? 'absolute left-2 right-2 top-2 flex-row flex-wrap gap-1' : 'flex-row flex-wrap gap-1'}>
      <Badge overlay={grid} label={category} tone={categoryBadge?.tone} numberOfLines={1} />
      {returned ? <Badge overlay={grid} label={t('listing:lost_found.returned_badge')} tone="success" numberOfLines={1} /> : null}
      {showLang ? <Badge overlay={grid} label={t(`common:locale.${listing.lang}`)} tone="primary" numberOfLines={1} /> : null}
    </View>
  );

  const body = (
    <View className={grid ? 'gap-1 p-3' : 'flex-1 gap-1'}>
      {grid ? null : badges}
      <Text variant="label" weight="semibold" numberOfLines={2}>
        {listing.title}
      </Text>
      {/* Đơn vị sau "/" cuối (vd /tháng) chữ nhỏ, cho xuống dòng: số + ₫ nối bằng dấu cách không ngắt nên dễ bị cắt (giống web).
          ​ (giống <wbr /> của web) là chỗ được ngắt trước đơn vị; thiếu nó, bản web ngắt giữa chữ ("thá|ng"). */}
      {price ? (
        <Text variant="price" tone="primary" numberOfLines={2}>
          {price.lastIndexOf('/') > 0 ? price.slice(0, price.lastIndexOf('/')) : price}
          {price.lastIndexOf('/') > 0 ? (
            <Text variant="caption" tone="muted" weight="semibold">
              {'​'}
              {price.slice(price.lastIndexOf('/'))}
            </Text>
          ) : null}
        </Text>
      ) : null}
      {facts.length > 0 ? (
        <View className="flex-row flex-wrap gap-1">
          {facts.map((f) => (
            <View key={f} className="max-w-full rounded-sm bg-surface-2 px-2 py-0.5">
              <Text variant="caption" weight="medium" tone="muted" numberOfLines={1}>
                {f}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
      <View className="flex-row items-center gap-1">
        {site ? <Icon icon={MapPin} tone="muted" size={14} /> : null}
        <Text variant="caption" tone="muted" numberOfLines={1} className="flex-1">
          {meta}
        </Text>
      </View>
    </View>
  );

  return (
    <Card
      padded={!grid}
      onPress={onPress}
      accessibilityLabel={[category, listing.title, returned ? t('listing:lost_found.returned_badge') : null, price, ...facts, meta]
        .filter(Boolean)
        .join(', ')}
      className={className}
    >
      {grid ? (
        <>
          <View>
            <ListingCover listing={listing} priority={imagePriority} className="aspect-card w-full rounded-t-lg" />
            {badges}
          </View>
          {body}
        </>
      ) : (
        <View className="flex-row items-start gap-3">
          <ListingCover listing={listing} priority={imagePriority} className="aspect-avatar w-24 rounded-md" />
          {body}
        </View>
      )}
    </Card>
  );
}
