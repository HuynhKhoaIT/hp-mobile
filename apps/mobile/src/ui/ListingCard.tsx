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
// Stitch L3 (việc ca kíp, trọ, đồ thất lạc): `display.description` (4c) mô tả 2 dòng; `display.owner` (6) dòng người đăng
// (avatar + tên rút gọn của view + dấu xác minh khi có huy hiệu); prop `bookmark` → nút tim lưu tin góc phải trên (grid: nổi
// trên ảnh, nền surface-2; row: góc thẻ) — feature quyết định có truyền hay không theo `display.bookmark` (hook lưu tin nằm
// ở features/listing). Nút tim là anh em của Card (không lồng trong Pressable của thẻ) để trình đọc màn hình bấm riêng được.
// Đồ thất lạc đã trả lại: ảnh mờ + tiêu đề gạch ngang chữ muted (kèm badge "Đã trả lại" — không chỉ bằng màu).
// ListingCover dùng lại ở chi tiết (ô giữ chỗ cỡ lớn khi tin chưa có ảnh).
// layout 'featured' (thẻ nổi bật đầu danh sách trang chủ mini-app Nhà trọ, style Stitch "Phòng trọ giá tốt ca kíp"): ảnh 4:3
// tràn mép + badge góc trái trên + `coverLabel` góc trái dưới (vd "5 ảnh") + tim góc phải trên → giá lớn primary + viên
// thông số nền primary-light ("22 m² • Có gác") → tiêu đề 2 dòng → dòng khu → tối đa 4 viên tiện nghi
// (`display.highlights` — thông số bool đang có) → `footer` (vd nút Gọi / Nhắn tin). Vùng bấm mở tin (ảnh + thân) và
// `footer` là hai vùng riêng (nút trong footer bấm / đọc màn hình được riêng, không lồng trong nút thẻ).
import { listingCover, type PublicListing } from '@hp/core';
import { featureOfCategory, type ListingCategory } from '@hp/shared';
import { BadgeCheck, MapPin } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import { formatRelative } from '@/lib/format';
import { listingImageUrl, profileAvatarUrl } from '@/lib/images';
import { attributeString, isReturned, useCardFacts, usePriceText, useSiteText } from '@/lib/listing';
import { Avatar } from './Avatar';
import { Badge, type BadgeTone } from './Badge';
import { BookmarkButton, type BookmarkButtonProps } from './BookmarkButton';
import { Card } from './Card';
import { Icon } from './Icon';
import { Image } from './interop';
import { SERVICE } from './service';
import { Text } from './Text';
import { useTheme } from './theme';

export type ListingCardLayout = 'grid' | 'row';
/** Bố cục một thẻ: lưới / hàng (config.card.variant) hoặc thẻ nổi bật ('featured' — đặt cho từng thẻ, không phải bố cục danh sách). */
export type ListingCardVariant = ListingCardLayout | 'featured';

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
  /** Đoạn mô tả tối đa 2 dòng dưới thông số (đồ thất lạc: đặc điểm đồ). */
  description?: boolean;
  /** Dòng người đăng cuối thẻ: avatar + tên rút gọn + dấu xác minh (owner_badges). */
  owner?: boolean;
  /** Nút lưu tin trên thẻ — feature truyền prop `bookmark` khi bật (thẻ chỉ hiển thị). */
  bookmark?: boolean;
  /** Thẻ 'featured': khoá thông số bool hiện thành viên tiện nghi khi true (tối đa 4), vd trọ WC riêng · Wifi · Camera. */
  highlights?: readonly string[];
};

/** Trạng thái + thao tác của nút tim trên thẻ (useListingBookmark của features/listing). */
export type ListingCardBookmark = Pick<BookmarkButtonProps, 'saved' | 'onToggle' | 'labels'>;

export type ListingCardProps = {
  listing: PublicListing;
  layout?: ListingCardVariant;
  onPress?: () => void;
  /** Bề rộng / vị trí trong lưới hoặc hàng ngang (vd `w-44`). */
  className?: string;
  /** Ưu tiên tải ảnh (vd 4 thẻ đầu của dải đầu tiên ở Hub: 'high'). */
  imagePriority?: 'low' | 'normal' | 'high';
  /** Điểm nhấn theo tính năng (config.card.display). */
  display?: ListingCardDisplay;
  /** Có → nút tim lưu tin ở góc phải trên (không truyền cho tin của chính mình). */
  bookmark?: ListingCardBookmark;
  /** Thẻ 'featured': nhãn góc trái dưới ảnh (vd "5 ảnh"). */
  coverLabel?: string;
  /** Thẻ 'featured': hàng nút cuối thẻ (vùng bấm riêng). */
  footer?: ReactNode;
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

export function ListingCard(props: ListingCardProps) {
  if (props.layout === 'featured') return <FeaturedListingCard {...props} />;
  return <StandardListingCard {...props} layout={props.layout} />;
}

function StandardListingCard({
  listing,
  layout = 'grid',
  onPress,
  className,
  imagePriority,
  display,
  bookmark,
}: ListingCardProps & { layout?: ListingCardLayout }) {
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
  const description = display?.description ? listing.description?.trim() : null;
  const ownerName = display?.owner ? listing.owner_name?.trim() : null;
  const verified = !!ownerName && listing.owner_badges.some((b) => i18n.exists(`listing:owner_badge.${b}`));
  const ownerLabel = ownerName ? (verified ? `${ownerName}, ${t('common:profile.verified')}` : ownerName) : null;

  const badges = (
    <View
      pointerEvents="none"
      className={grid ? join('absolute left-2 top-2 flex-row flex-wrap gap-1', bookmark ? 'right-12' : 'right-2') : 'flex-row flex-wrap gap-1'}
    >
      <Badge overlay={grid} label={category} tone={categoryBadge?.tone} numberOfLines={1} />
      {returned ? <Badge overlay={grid} label={t('listing:lost_found.returned_badge')} tone="success" numberOfLines={1} /> : null}
      {showLang ? <Badge overlay={grid} label={t(`common:locale.${listing.lang}`)} tone="primary" numberOfLines={1} /> : null}
    </View>
  );

  const body = (
    <View className={grid ? 'gap-1 p-3' : join('flex-1 gap-1', bookmark && 'pr-8')}>
      {grid ? null : badges}
      <Text
        variant="label"
        weight="semibold"
        tone={returned ? 'muted' : undefined}
        numberOfLines={2}
        className={returned ? 'line-through' : undefined}
      >
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
      {description ? (
        <Text variant="body" tone="muted" numberOfLines={2}>
          {description}
        </Text>
      ) : null}
      <View className="flex-row items-center gap-1">
        {site ? <Icon icon={MapPin} tone="muted" size={14} /> : null}
        <Text variant="caption" tone="muted" numberOfLines={1} className="flex-1">
          {meta}
        </Text>
      </View>
      {ownerName ? (
        <View className="mt-1 flex-row items-center gap-2 border-t border-border pt-2">
          <Avatar uri={profileAvatarUrl(listing.owner_avatar_url)} name={ownerName} size="sm" />
          <Text variant="caption" weight="medium" numberOfLines={1} className="shrink">
            {ownerName}
          </Text>
          {verified ? <Icon icon={BadgeCheck} tone="success" size={16} /> : null}
        </View>
      ) : null}
    </View>
  );

  // Đồ thất lạc đã trả lại: ảnh mờ (chữ giữ tương phản ≥ 4,5:1; trạng thái đọc bằng badge + tiêu đề gạch ngang).
  const coverDim = returned ? 'opacity-50' : undefined;
  const card = (
    <Card
      padded={!grid}
      onPress={onPress}
      accessibilityLabel={[category, listing.title, returned ? t('listing:lost_found.returned_badge') : null, price, ...facts, meta, ownerLabel]
        .filter(Boolean)
        .join(', ')}
      className={bookmark ? undefined : className}
    >
      {grid ? (
        <>
          <View>
            <ListingCover listing={listing} priority={imagePriority} className={join('aspect-card w-full rounded-t-lg', coverDim)} />
            {badges}
          </View>
          {body}
        </>
      ) : (
        <View className="flex-row items-start gap-3">
          <ListingCover listing={listing} priority={imagePriority} className={join('aspect-avatar w-24 rounded-md', coverDim)} />
          {body}
        </View>
      )}
    </Card>
  );
  if (!bookmark) return card;
  // Nút tim nằm ngoài Pressable của thẻ (anh em, đặt tuyệt đối) → VoiceOver / TalkBack bấm riêng được; vùng chạm 44.
  return (
    <View className={join('relative', className)}>
      {card}
      <View className="absolute right-1 top-1">
        <BookmarkButton
          saved={bookmark.saved}
          onToggle={bookmark.onToggle}
          labels={bookmark.labels}
          variant={grid ? 'filled' : 'ghost'}
          size="button"
        />
      </View>
    </View>
  );
}

/** Thẻ nổi bật (layout 'featured') — xem chú thích đầu file. */
function FeaturedListingCard({ listing, onPress, className, imagePriority, display, bookmark, coverLabel, footer }: ListingCardProps) {
  const { t, i18n } = useTranslation();
  const priceText = usePriceText();
  const siteText = useSiteText();
  const cardFacts = useCardFacts();
  const price = priceText(listing);
  const site = attributeString(listing, display?.placeKey) ?? siteText(listing);
  const meta = [site, formatRelative(listing.created_at)].filter(Boolean).join(' · ');
  const facts = cardFacts(listing, display?.facts, 2);
  const highlights = cardFacts(listing, display?.highlights, 4);
  const categoryBadge = display?.categoryBadge?.[listing.category];
  const category = categoryBadge?.labelKey ? t(categoryBadge.labelKey) : t(`common:category.${listing.category}`);
  const verified = listing.owner_badges.some((b) => i18n.exists(`listing:owner_badge.${b}`));
  const cut = price.lastIndexOf('/');
  const a11y = [category, verified ? t('common:profile.verified') : null, listing.title, price, ...facts, meta, ...highlights, coverLabel];

  return (
    <View className={join('relative rounded-lg border border-border bg-surface shadow-card', className)}>
      <Pressable accessibilityRole="button" accessibilityLabel={a11y.filter(Boolean).join(', ')} onPress={onPress} className="active:opacity-90">
        <View>
          <ListingCover listing={listing} priority={imagePriority} className="aspect-card w-full rounded-t-lg" />
          <View pointerEvents="none" className={join('absolute left-2 top-2 flex-row flex-wrap gap-1', bookmark ? 'right-12' : 'right-2')}>
            <Badge overlay label={category} tone={categoryBadge?.tone} numberOfLines={1} />
            {verified ? <Badge overlay label={t('common:profile.verified')} tone="success" numberOfLines={1} /> : null}
          </View>
          {coverLabel ? (
            <View pointerEvents="none" className="absolute bottom-2 left-2">
              <Badge overlay label={coverLabel} numberOfLines={1} />
            </View>
          ) : null}
        </View>
        <View className="gap-1.5 p-3">
          <View className="flex-row flex-wrap items-center justify-between gap-2">
            {price ? (
              <Text variant="title" weight="bold" tone="primary" className="shrink">
                {cut > 0 ? price.slice(0, cut) : price}
                {cut > 0 ? (
                  <Text variant="caption" tone="muted" weight="semibold">
                    {'​'}
                    {price.slice(cut)}
                  </Text>
                ) : null}
              </Text>
            ) : null}
            {facts.length > 0 ? (
              <View className="rounded-sm bg-primary-light px-2 py-0.5">
                <Text variant="caption" weight="semibold" tone="primary" numberOfLines={1}>
                  {facts.join(' • ')}
                </Text>
              </View>
            ) : null}
          </View>
          <Text variant="label" weight="bold" numberOfLines={2}>
            {listing.title}
          </Text>
          {meta ? (
            <View className="flex-row items-center gap-1">
              {site ? <Icon icon={MapPin} tone="primary" size={14} /> : null}
              <Text variant="caption" tone="muted" numberOfLines={1} className="flex-1">
                {meta}
              </Text>
            </View>
          ) : null}
          {highlights.length > 0 ? (
            <View className="mt-1 flex-row flex-wrap gap-1.5 border-t border-border pt-2">
              {highlights.map((h) => (
                <View key={h} className="rounded-sm border border-primary/15 bg-primary-light px-2 py-0.5">
                  <Text variant="caption" tone="primary" numberOfLines={1}>
                    {h}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>
      </Pressable>
      {footer ? <View className="px-3 pb-3">{footer}</View> : null}
      {bookmark ? (
        <View className="absolute right-1 top-1">
          <BookmarkButton saved={bookmark.saved} onToggle={bookmark.onToggle} labels={bookmark.labels} variant="filled" size="button" />
        </View>
      ) : null}
    </View>
  );
}
