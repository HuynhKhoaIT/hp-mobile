// Chi tiết tin (mọi category) — dùng cho cả `listing/[id]` (điều hướng nội bộ) và `tin/[slug]` (Universal Link).
// Thứ tự khớp web: ảnh (hoặc ô giữ chỗ lớn) → tiêu đề, giá, badge, đăng lúc + lượt xem → mẹo an toàn
// → thông tin (attributes) → mô tả → khu vực (gần đúng, chưa có bản đồ) → người đăng → tin tương tự;
// thanh dính đáy: Nhắn tin (cần đăng nhập; chat ở tuần 5).
import type { AppError, PublicListing } from '@hp/core';
import { useRecordListingView, useSimilarListings } from '@hp/core/react';
import { MapPin, MessageCircle, SearchX } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { ScrollView, View } from 'react-native';
import { formatRelative } from '@/lib/format';
import { listingImageUrl } from '@/lib/images';
import { usePriceText, useSiteText } from '@/lib/listing';
import {
  Badge,
  Button,
  EmptyState,
  ErrorState,
  Icon,
  ImageGallery,
  ListingCover,
  Notice,
  SectionHeader,
  SkeletonListingCard,
  SkeletonListingDetail,
  StickyCta,
  Text,
} from '@/ui';
import { useContactListing } from '../hooks';
import { backOrHome } from '../navigation';
import { AttributeList } from './AttributeList';
import { ListingRail } from './ListingRail';
import { OwnerCard } from './OwnerCard';

/** Phần cần của kết quả useListing / useListingBySlug. */
export type ListingQueryState = {
  data: PublicListing | undefined;
  isLoading: boolean;
  error: AppError | null;
  refetch: () => unknown;
};

/** Mã lỗi coi như "tin không còn" (id sai dạng → invalid_input). */
const NOT_FOUND = new Set(['not_found', 'invalid_input']);

/** Ba trạng thái của màn chi tiết + nội dung khi có dữ liệu (kể cả dữ liệu tạm từ cache danh sách). */
export function ListingDetailState({ query }: { query: ListingQueryState }) {
  const { t } = useTranslation('listing');
  if (query.data) return <ListingDetailBody listing={query.data} />;
  if (query.isLoading) {
    return (
      <ScrollView className="flex-1" contentContainerClassName="pb-6">
        <SkeletonListingDetail />
      </ScrollView>
    );
  }
  if (!query.error || NOT_FOUND.has(query.error.code)) {
    return (
      <EmptyState
        icon={SearchX}
        title={t('detail.not_found_title')}
        description={t('detail.not_found_body')}
        action={{ label: t('detail.back_to_list'), onPress: backOrHome }}
      />
    );
  }
  return <ErrorState code={query.error.code} onRetry={() => void query.refetch()} />;
}

function ListingDetailBody({ listing }: { listing: PublicListing }) {
  const { t, i18n } = useTranslation('listing');
  const priceText = usePriceText();
  const siteText = useSiteText();
  const contact = useContactListing();
  const similar = useSimilarListings(listing.id);
  useRecordListingView(listing.id);

  const site = siteText(listing);
  const showLang = listing.lang !== i18n.language && i18n.exists(`common:locale.${listing.lang}`);
  const meta = [
    t('detail.posted_at', { time: formatRelative(listing.created_at) }),
    t('detail.views', { count: listing.view_count }),
  ].join(' · ');

  return (
    <>
      <ScrollView className="flex-1" contentContainerClassName="gap-5 pb-6" showsVerticalScrollIndicator={false}>
        {listing.images.length > 0 ? (
          <ImageGallery uris={listing.images.map((p) => listingImageUrl(p, 'full'))} accessibilityLabel={listing.title} />
        ) : (
          <ListingCover listing={listing} size="full" className="aspect-card w-full rounded-md" />
        )}

        <View className="gap-2">
          <Text variant="heading" accessibilityRole="header" selectable>
            {listing.title}
          </Text>
          <Text variant="price">{priceText(listing)}</Text>
          <View className="flex-row flex-wrap gap-1">
            <Badge label={t(`common:category.${listing.category}`)} />
            {showLang ? <Badge label={t(`common:locale.${listing.lang}`)} tone="primary" /> : null}
          </View>
          <Text variant="caption" tone="muted">
            {meta}
          </Text>
        </View>

        <Notice tone="warning" text={t('detail.safety_tip')} />

        <AttributeList listing={listing} />

        <View className="gap-2">
          <SectionHeader title={t('detail.description')} />
          {listing.description ? (
            <Text selectable>{listing.description}</Text>
          ) : (
            <Text tone="muted">{t('detail.no_description')}</Text>
          )}
        </View>

        {site ? (
          <View className="gap-2">
            <SectionHeader title={t('detail.location')} />
            <View className="flex-row items-start gap-2">
              <Icon icon={MapPin} tone="muted" />
              <Text className="flex-1">{site}</Text>
            </View>
            <Text variant="caption" tone="muted">
              {t('detail.approx_location')}
            </Text>
          </View>
        ) : null}

        <OwnerCard listing={listing} />

        {similar.isLoading ? (
          <View className="gap-2">
            <SectionHeader title={t('detail.similar')} />
            <SkeletonListingCard count={2} horizontal />
          </View>
        ) : similar.data && similar.data.length > 0 ? (
          <View className="gap-2">
            <SectionHeader title={t('detail.similar')} />
            <ListingRail items={similar.data} bleed />
          </View>
        ) : null}
      </ScrollView>

      <StickyCta>
        <Button label={t('detail.contact')} icon={MessageCircle} fullWidth onPress={contact} />
      </StickyCta>
    </>
  );
}
