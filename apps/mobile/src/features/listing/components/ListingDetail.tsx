// Chi tiết tin (mọi category) — dùng cho cả `listing/[id]` (điều hướng nội bộ) và `tin/[slug]` (Universal Link).
// Thứ tự khớp web: ảnh (hoặc ô giữ chỗ lớn) → tiêu đề, giá, badge, đăng lúc + lượt xem → banner tin đã bán /
// đóng / hết hạn → mẹo an toàn → thông tin (attributes) → mô tả → khu vực (gần đúng) → người đăng → tin tương tự;
// thanh dính đáy: Nhắn tin + Hiện số điện thoại (cần đăng nhập) · chủ tin: Sửa tin + Tin của tôi · tin không còn
// hiện: không có liên hệ.
// Tuần 10: nút Dịch (tin khác ngôn ngữ đang dùng) đổi tiêu đề + mô tả sang bản dịch tự động / "Xem bản gốc".
// Tuần 9 (config.detail.lostFound — đồ thất lạc, chủ tin): "Tin có thể khớp" + "Đã nhận lại đồ" (sheet xác nhận →
// RPC markListingReturned: returned + đóng tin); tin đã nhận lại có nhãn "Đã trả lại".
import { type AppError, listingDisplayStatus, type PublicListing } from '@hp/core';
import { useRecordListingView, useSimilarListings } from '@hp/core/react';
import { formatVnPhone, type ListingCategory } from '@hp/shared';
import { Languages, MapPin, MessageCircle, PackageCheck, Pencil, Phone, SearchX } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, View } from 'react-native';
import { track } from '@/core/analytics';
import { formatRelative } from '@/lib/format';
import { listingImageUrl } from '@/lib/images';
import { isReturned, usePriceText, useSiteText } from '@/lib/listing';
import {
  Badge,
  Button,
  Card,
  ConfirmSheet,
  EmptyState,
  ErrorState,
  Icon,
  ImageGallery,
  ListingCard,
  ListingCover,
  Notice,
  SectionHeader,
  SkeletonListingCard,
  SkeletonListingDetail,
  StickyCta,
  Text,
} from '@/ui';
import { useContactListing, useIsOwner, useListingMatches, useListingTranslation, useMarkReturned, useRevealPhone } from '../hooks';
import { backOrHome, openEditListing, openListing, openMyListings } from '../navigation';
import type { ListingFeatureConfig } from '../types';
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
export function ListingDetailState({
  query,
  configOf,
}: {
  query: ListingQueryState;
  /** Config của tính năng theo category (route lấy từ registry features/configs) — khối riêng ở `config.detail`. */
  configOf?: (category: ListingCategory) => ListingFeatureConfig;
}) {
  const { t } = useTranslation('listing');
  if (query.data) return <ListingDetailBody listing={query.data} config={configOf?.(query.data.category)} />;
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

function ListingDetailBody({ listing, config }: { listing: PublicListing; config?: ListingFeatureConfig }) {
  const { t, i18n } = useTranslation('listing');
  const translation = useListingTranslation(listing);
  const returned = isReturned(listing);
  const price = usePriceText()(listing);
  const siteText = useSiteText();
  const similar = useSimilarListings(listing.id);
  const isOwner = useIsOwner(listing);
  const display = listingDisplayStatus(listing);
  // Đồ thất lạc của mình, còn đang hiện, chưa nhận lại → tin khớp + nút "Đã nhận lại đồ".
  const lostFoundOpen = isOwner && !!config?.detail?.lostFound && !returned && display === 'active';
  const [returnOpen, setReturnOpen] = useState(false);
  const markReturned = useMarkReturned(listing.id);
  useRecordListingView(listing.id);
  useEffect(() => {
    track('view_listing', { listing_id: listing.id, category: listing.category });
  }, [listing.id, listing.category]);

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
            {translation.title}
          </Text>
          {price ? <Text variant="price">{price}</Text> : null}
          <View className="flex-row flex-wrap gap-1">
            <Badge label={t(`common:category.${listing.category}`)} />
            {returned ? <Badge label={t('lost_found.returned_badge')} tone="success" /> : null}
            {showLang ? <Badge label={t(`common:locale.${listing.lang}`)} tone="primary" /> : null}
          </View>
          <Text variant="caption" tone="muted">
            {meta}
          </Text>
        </View>

        {returned ? (
          <Notice icon={PackageCheck} title={t('lost_found.returned_badge')} text={t('lost_found.returned_done')} />
        ) : display !== 'active' ? (
          <Notice tone="warning" title={t(`state.${display}`)} text={t('state.inactive_hint')} />
        ) : null}

        {lostFoundOpen ? <LostFoundMatches listing={listing} /> : null}

        <Notice tone="warning" text={t('detail.safety_tip')} />

        <AttributeList listing={listing} />

        <View className="gap-2">
          <SectionHeader title={t('detail.description')} />
          {translation.description ? (
            <Text selectable>{translation.description}</Text>
          ) : (
            <Text tone="muted">{t('detail.no_description')}</Text>
          )}
          {translation.available ? (
            <View className="flex-row flex-wrap items-center gap-2" accessibilityLiveRegion="polite">
              {translation.translated ? (
                <Text variant="caption" tone="muted">
                  {t('translate.translated_note')}
                </Text>
              ) : null}
              <Button
                size="sm"
                variant="ghost"
                icon={Languages}
                label={
                  translation.translated
                    ? t('translate.show_original')
                    : translation.isPending
                      ? t('translate.translating')
                      : t('translate.action')
                }
                loading={translation.isPending}
                onPress={translation.translated ? translation.showOriginal : translation.run}
              />
            </View>
          ) : null}
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

      {isOwner ? (
        <StickyCta>
          {lostFoundOpen ? (
            <Button label={t('lost_found.mark_returned')} icon={PackageCheck} fullWidth onPress={() => setReturnOpen(true)} />
          ) : null}
          <View className="flex-row gap-2">
            <View className="flex-1">
              <Button
                label={t('form.title_edit')}
                icon={Pencil}
                variant={lostFoundOpen ? 'outline' : 'primary'}
                fullWidth
                onPress={() => openEditListing(listing.id)}
              />
            </View>
            <View className="flex-1">
              <Button label={t('form.my_listings')} variant="outline" fullWidth onPress={() => openMyListings()} />
            </View>
          </View>
        </StickyCta>
      ) : display === 'active' ? (
        <ContactBar listing={listing} />
      ) : null}

      {lostFoundOpen ? (
        <ConfirmSheet
          open={returnOpen}
          onClose={() => setReturnOpen(false)}
          title={t('lost_found.mark_returned_confirm_title')}
          body={t('lost_found.mark_returned_confirm_body')}
          confirmLabel={t('lost_found.mark_returned')}
          confirmVariant="primary"
          loading={markReturned.isPending}
          onConfirm={() => markReturned.markReturned(() => setReturnOpen(false))}
        />
      ) : null}
    </>
  );
}

/** Số thẻ tối đa ở "Tin có thể khớp" (RPC trả ≤ 20, gần nhất trước). */
const MATCHES_SHOWN = 5;

/** "Tin có thể khớp" (chủ tin mất / nhặt): skeleton → lỗi gọn (Thử lại) → rỗng (sẽ báo khi có) → thẻ hàng. */
function LostFoundMatches({ listing }: { listing: PublicListing }) {
  const { t } = useTranslation('listing');
  const matches = useListingMatches(listing, true);
  const items = (matches.data ?? []).slice(0, MATCHES_SHOWN);
  return (
    <View className="gap-2">
      <SectionHeader title={t('lost_found.matches_title')} subtitle={t('lost_found.matches_hint')} />
      {matches.isLoading ? (
        <SkeletonListingCard count={2} layout="row" />
      ) : matches.isError ? (
        <ErrorState compact code={matches.error.code} onRetry={() => void matches.refetch()} />
      ) : items.length === 0 ? (
        <Card>
          <Text tone="muted">{t('lost_found.matches_empty')}</Text>
        </Card>
      ) : (
        <View className="gap-3">
          {items.map((m) => (
            <ListingCard key={m.id} listing={m} layout="row" onPress={() => openListing(m.id)} />
          ))}
        </View>
      )}
    </View>
  );
}

/** Liên hệ người đăng: Nhắn tin (chat tuần 5) + Hiện số điện thoại → Gọi. Khách bấm → đăng nhập rồi làm tiếp. */
function ContactBar({ listing }: { listing: PublicListing }) {
  const { t } = useTranslation('listing');
  const contact = useContactListing();
  const phone = useRevealPhone(listing);
  return (
    <StickyCta>
      <View className="flex-row gap-2">
        <View className="flex-1">
          <Button label={t('detail.contact')} icon={MessageCircle} fullWidth loading={contact.isPending} onPress={() => contact.open(listing)} />
        </View>
        <View className="flex-1">
          {phone.revealed && phone.phone ? (
            <Button
              label={t('contact.call', { phone: formatVnPhone(phone.phone) })}
              icon={Phone}
              variant="outline"
              fullWidth
              onPress={() => phone.phone && phone.call(phone.phone)}
            />
          ) : (
            <Button
              label={t('contact.reveal')}
              icon={Phone}
              variant="outline"
              fullWidth
              loading={phone.isPending}
              disabled={phone.revealed}
              onPress={phone.reveal}
            />
          )}
        </View>
      </View>
      <Text variant="caption" tone="muted" accessibilityLiveRegion="polite">
        {phone.revealed && !phone.phone ? t('contact.no_phone') : t('contact.hint')}
      </Text>
    </StickyCta>
  );
}
