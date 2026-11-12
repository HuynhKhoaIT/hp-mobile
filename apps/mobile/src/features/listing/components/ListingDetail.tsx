// Chi tiết tin (mọi category) — dùng cho cả `listing/[id]` (điều hướng nội bộ) và `tin/[slug]` (Universal Link).
// Style Stitch "Chi tiết tin Pass / phòng trọ / tin rơi đồ" — một bố cục chung, khác nhau theo config tính năng:
//   1 ảnh tràn mép 4:3 + đếm ảnh + hàng ảnh nhỏ (hoặc ô giữ chỗ lớn khi chưa có ảnh); nhãn phủ góc trái trên: tình trạng
//     (đang hiện: "Còn trống" / "Đang tuyển"… theo tính năng — listing.availability; đã bán / đóng / hết hạn: common.status;
//     đồ đã nhận lại: "Đã trả lại") + "Đã xác minh" khi người đăng có huy hiệu; trọ: giá phủ góc trái dưới (nền surface/90 —
//     không có token scrim / gradient tối nên dùng nền đặc thay dải mờ)
//   2 thẻ tóm tắt: badge (danh mục — nhãn / tone theo config.card.display.categoryBadge, vd "Mất đồ" đỏ; ngôn ngữ) →
//     "Mã tin #A1B2C3 · Đăng 25 phút trước" → tiêu đề → giá lớn màu primary (đơn vị /tháng chữ nhỏ; đồ thất lạc không có
//     giá) → nhãn thông số nổi bật (config.card.display.facts, vd trọ "20 m² · Có gác") → khu (gần đúng ~300 m) → hết hạn ·
//     lượt xem
//   3 banner tin đã bán / đóng / hết hạn / đã nhận lại → "Tin có thể khớp" (đồ thất lạc, chủ tin)
//   4 mẹo an toàn riêng tính năng (config.tipKey; mặc định detail.safety_tip) → thông tin (lưới ô AttributeList + khối
//     có tiêu đề theo groupAttributeRows: trọ Chi phí / Nội quy, việc Người phụ trách / Yêu cầu)
//   5 người đăng (OwnerCard) → mô tả (+ nút Dịch) → tin tương tự (thẻ cùng điểm nhấn)
// Thanh dính đáy (StickyCta elevated, style Stitch "Chi tiết việc làm"): 2 nút vuông chỉ icon Gọi (Hiện số → Gọi,
// reveal_contact, cần đăng nhập) + Nhắn tin, rồi nút chính rộng theo config.detail.primaryCta ('call' cho trọ / đồ thất lạc:
// "Gọi hỏi phòng" → Hiện số → "Gọi 0912…"; 'chat': "Nhắn người bán" / "Nhắn tin ứng tuyển"…) · chủ tin: Sửa tin + Tin của
// tôi (+ "Đã nhận lại đồ") · tin không còn hiện: không có liên hệ.
// config.detail.sections (trọ — Stitch "Chi tiết phòng trọ", DetailSections): sau thẻ tóm tắt là "Bảng chi phí sinh hoạt" →
// "Vị trí & khoảng cách" (3 khu gần nhất, ~phút xe máy, mở bản đồ) → "Tiện nghi" → mẹo → thông tin còn lại → chủ trọ
// (texts.owner) → "Mô tả & nội quy" (nội quy gộp vào thẻ mô tả). Dòng dưới giá: config.detail.priceNote (vd "Cọc 1 tháng");
// nhãn trên ảnh: config.detail.availabilityKey; dòng đầu thẻ: "Cập nhật {thời gian}" (texts.updated); nút chính:
// config.detail.primaryCtaKey (vd "Liên hệ hẹn xem phòng" → chat).
// Khác Stitch (cố ý): không "Trả giá / Đề xuất giá", Zalo, "Giá niêm yết", giá gốc gạch ngang, "đang trực tuyến", tỉ lệ phản
// hồi, "Đã xác minh CCCD" — không có tính năng / dữ liệu đó; chỉ hiện thông số người đăng đã nhập.
// Tuần 10: nút Dịch (tin khác ngôn ngữ đang dùng) đổi tiêu đề + mô tả sang bản dịch tự động / "Xem bản gốc".
// Tuần 9 (config.detail.lostFound — đồ thất lạc, chủ tin): "Tin có thể khớp" + "Đã nhận lại đồ" / "Đã trả cho chủ"
// (ReturnedSheet — style Stitch L2 → RPC markListingReturned: returned + đóng tin); tin đã nhận lại có nhãn "Đã trả lại".
import { type AppError, listingDisplayStatus, type PublicListing } from '@hp/core';
import { useRecordListingView, useSimilarListings } from '@hp/core/react';
import { featureOfCategory, formatVnPhone, type ListingCategory } from '@hp/shared';
import { Languages, MapPin, MessageCircle, PackageCheck, Pencil, Phone, SearchX } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, View } from 'react-native';
import { track } from '@/core/analytics';
import { formatDate, formatRelative } from '@/lib/format';
import { listingImageUrl } from '@/lib/images';
import { isReturned, useCardFacts, usePriceText, useSiteText } from '@/lib/listing';
import {
  Badge,
  Button,
  Card,
  Divider,
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
import { useContactListing, useIsOwner, useListingMatches, useListingTranslation, useRevealPhone } from '../hooks';
import { backOrHome, type MiniSlug, openEditListing, openListing, openMyListings, openMyListingsFrom } from '../navigation';
import type { ListingFeatureConfig } from '../types';
import { AttributeList } from './AttributeList';
import { AmenityGrid, CostTable, SiteDistances, useRulesLines } from './DetailSections';
import { ListingRail } from './ListingRail';
import { OwnerCard } from './OwnerCard';
import { ListingRateEntry } from './ListingRateSheet';
import { ReturnedSheet, returnedLabelKeys } from './ReturnedSheet';

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
  mini,
}: {
  query: ListingQueryState;
  /** Config của tính năng theo category (route lấy từ registry features/configs) — khối riêng ở `config.detail`. */
  configOf?: (category: ListingCategory) => ListingFeatureConfig;
  /** Mở từ mini-app — nút của chủ tin (Sửa tin, Tin của tôi) ở lại mini-app. */
  mini?: MiniSlug;
}) {
  const { t } = useTranslation('listing');
  if (query.data) return <ListingDetailBody listing={query.data} config={configOf?.(query.data.category)} mini={mini} />;
  if (query.isLoading) {
    return (
      <ScrollView className="-mx-4 flex-1" contentContainerClassName="px-4 pb-6">
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

function ListingDetailBody({ listing, config, mini }: { listing: PublicListing; config?: ListingFeatureConfig; mini?: MiniSlug }) {
  const { t, i18n } = useTranslation('listing');
  const translation = useListingTranslation(listing);
  const returned = isReturned(listing);
  const price = usePriceText()(listing);
  const siteText = useSiteText();
  const facts = useCardFacts()(listing, config?.card.display?.facts);
  const similar = useSimilarListings(listing.id);
  const isOwner = useIsOwner(listing);
  const display = listingDisplayStatus(listing);
  // Đồ thất lạc của mình, còn đang hiện, chưa nhận lại → tin khớp + nút "Đã nhận lại đồ".
  const lostFoundOpen = isOwner && !!config?.detail?.lostFound && !returned && display === 'active';
  const [returnOpen, setReturnOpen] = useState(false);
  const rulesLines = useRulesLines();
  const detail = config?.detail;
  const sections = detail?.sections ?? [];
  const texts = detail?.texts;
  const rules = sections.includes('rules') ? rulesLines(listing) : [];
  useRecordListingView(listing.id);
  useEffect(() => {
    track('view_listing', { listing_id: listing.id, category: listing.category });
  }, [listing.id, listing.category]);

  const site = siteText(listing);
  const showLang = listing.lang !== i18n.language && i18n.exists(`common:locale.${listing.lang}`);
  const categoryBadge = config?.card.display?.categoryBadge?.[listing.category];
  const feature = featureOfCategory(listing.category);
  // Nhãn tình trạng trên ảnh: chữ + tone (không chỉ màu). Đồ thất lạc đang hiện theo category (Đang tìm / Chờ chủ nhận).
  const status = returned
    ? { label: t('lost_found.returned_badge'), tone: 'success' as const }
    : display === 'active'
      ? { label: t(detail?.availabilityKey ?? `availability.${feature === 'lostFound' ? listing.category : feature}`), tone: 'success' as const }
      : { label: t(`common:status.${display}`), tone: 'danger' as const };
  // Cùng quy tắc với OwnerCard: có huy hiệu (đã dịch được) = đã xác minh.
  const verified = listing.owner_badges.some((b) => i18n.exists(`listing:owner_badge.${b}`));
  const header = [
    listing.short_id ? t('detail.code', { code: listing.short_id.toUpperCase() }) : null,
    texts?.updated
      ? t(texts.updated, { time: formatRelative(listing.updated_at) })
      : t('detail.posted_at', { time: formatRelative(listing.created_at) }),
  ]
    .filter(Boolean)
    .join(' · ');
  const meta = [
    display === 'active' && listing.expires_at ? t('detail.expires_at', { date: formatDate(listing.expires_at) }) : null,
    t('detail.views', { count: listing.view_count }),
  ]
    .filter(Boolean)
    .join(' · ');
  const cut = price.lastIndexOf('/');
  const priceNote = detail?.priceNote ? priceNoteOf(listing, detail.priceNote.key) : null;

  return (
    <>
      {/* ScrollView tràn mép (-mx-4, nội dung px-4): ảnh / tin tương tự `bleed` chạm mép màn mà không bị khung cuộn cắt. */}
      <ScrollView className="-mx-4 flex-1" contentContainerClassName="gap-5 px-4 pb-6" showsVerticalScrollIndicator={false}>
        <ImageGallery
          bleed
          uris={listing.images.map((p) => listingImageUrl(p, 'full'))}
          thumbnails={listing.images.map((p) => listingImageUrl(p, 'thumb'))}
          accessibilityLabel={listing.title}
          placeholder={<ListingCover listing={listing} size="full" className="size-full" />}
          overlayTop={
            <>
              <Badge overlay label={status.label} tone={status.tone} />
              {verified ? <Badge overlay label={t('common:profile.verified')} tone="primary" /> : null}
            </>
          }
          overlayBottom={
            feature === 'room' && price ? (
              <View className="self-start rounded-md bg-surface/90 px-3 py-1.5 shadow-card">
                <Text variant="label" weight="bold" tone="primary">
                  {price}
                </Text>
              </View>
            ) : undefined
          }
        />

        <Card className="gap-3">
          <View className="flex-row flex-wrap gap-1">
            <Badge
              label={categoryBadge?.labelKey ? t(categoryBadge.labelKey) : t(`common:category.${listing.category}`)}
              tone={categoryBadge?.tone}
            />
            {showLang ? <Badge label={t(`common:locale.${listing.lang}`)} tone="primary" /> : null}
          </View>
          <Text variant="caption" tone="muted">
            {header}
          </Text>
          <Text variant="heading" accessibilityRole="header" selectable>
            {translation.title}
          </Text>
          {price ? (
            <Text variant="heading" weight="bold" tone="primary">
              {cut > 0 ? price.slice(0, cut) : price}
              {cut > 0 ? (
                <Text variant="body" weight="semibold" tone="muted">
                  {price.slice(cut)}
                </Text>
              ) : null}
            </Text>
          ) : null}
          {priceNote !== null && detail?.priceNote ? (
            <Text variant="caption" tone="muted">
              {t(detail.priceNote.labelKey, { count: priceNote })}
            </Text>
          ) : null}
          {facts.length > 0 ? (
            <View className="flex-row flex-wrap gap-1.5">
              {facts.map((f) => (
                <View key={f} className="rounded-sm bg-primary-light px-2.5 py-1">
                  <Text variant="caption" weight="semibold" tone="primary">
                    {f}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}
          <Divider />
          {site ? (
            <View className="gap-0.5">
              <View className="flex-row items-start gap-1.5">
                <Icon icon={MapPin} tone="primary" size={18} />
                <Text variant="label" className="flex-1">
                  {site}
                </Text>
              </View>
              <Text variant="caption" tone="muted">
                {t('detail.approx_location')}
              </Text>
            </View>
          ) : null}
          <Text variant="caption" tone="muted">
            {meta}
          </Text>
        </Card>

        {returned ? (
          <>
            <Notice icon={PackageCheck} title={t('lost_found.returned_badge')} text={t('lost_found.returned_done')} />
            {/* Người đã chat với chủ tin về món đồ: cảm ơn / đánh giá chủ tin (tự ẩn khi không có ai để chấm). */}
            {isOwner ? null : <ListingRateEntry listingId={listing.id} />}
          </>
        ) : display !== 'active' ? (
          <Notice tone="warning" title={t(`state.${display}`)} text={t('state.inactive_hint')} />
        ) : null}

        {lostFoundOpen ? <LostFoundMatches listing={listing} /> : null}

        <Notice variant="bordered" tone="warning" title={t('tip.title')} text={t(config?.tipKey ?? 'detail.safety_tip')} />

        {sections.includes('costs') ? <CostTable listing={listing} texts={texts} skip={detail?.priceNote?.key} /> : null}
        {sections.includes('distance') ? <SiteDistances listing={listing} texts={texts} /> : null}
        {sections.includes('amenities') ? <AmenityGrid listing={listing} texts={texts} /> : null}

        <AttributeList listing={listing} skipGroups={sections} />

        <OwnerCard listing={listing} title={texts?.owner ? t(texts.owner) : undefined} />

        <View className="gap-2">
          <SectionHeader title={t(sections.includes('rules') ? (texts?.rules ?? 'detail.description') : 'detail.description')} bar="primary" />
          <Card className="gap-2">
            {translation.description ? (
              <Text selectable>{translation.description}</Text>
            ) : rules.length === 0 ? (
              <Text tone="muted">{t('detail.no_description')}</Text>
            ) : null}
            {rules.map((line) => (
              <Text key={line} selectable>
                {`• ${line}`}
              </Text>
            ))}
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
          </Card>
        </View>

        {similar.isLoading ? (
          <View className="gap-2">
            <SectionHeader title={t('detail.similar')} bar="accent" />
            <SkeletonListingCard count={2} horizontal />
          </View>
        ) : similar.data && similar.data.length > 0 ? (
          <View className="gap-2">
            <SectionHeader title={t('detail.similar')} bar="accent" />
            <ListingRail items={similar.data} bleed display={config?.card.display} />
          </View>
        ) : null}
      </ScrollView>

      {isOwner ? (
        <StickyCta elevated>
          {lostFoundOpen ? (
            <Button label={t(returnedLabelKeys(listing.category).action)} icon={PackageCheck} fullWidth onPress={() => setReturnOpen(true)} />
          ) : null}
          <View className="flex-row gap-2">
            <View className="flex-1">
              <Button
                label={t('form.title_edit')}
                icon={Pencil}
                variant={lostFoundOpen ? 'outline' : 'primary'}
                fullWidth
                onPress={() => openEditListing(listing.id, { mini })}
              />
            </View>
            <View className="flex-1">
              <Button
                label={t('form.my_listings')}
                variant="outline"
                fullWidth
                onPress={() => (mini ? openMyListingsFrom(mini, 'active') : openMyListings())}
              />
            </View>
          </View>
        </StickyCta>
      ) : display === 'active' ? (
        <ContactBar listing={listing} primary={detail?.primaryCta ?? 'chat'} primaryKey={detail?.primaryCtaKey} mini={mini} />
      ) : null}

      {lostFoundOpen ? (
        <ReturnedSheet listing={listing} open={returnOpen} onClose={() => setReturnOpen(false)} />
      ) : null}
    </>
  );
}

/** Giá trị số của một thông số (dòng dưới giá — config.detail.priceNote); không có / không phải số → null. */
function priceNoteOf(listing: Pick<PublicListing, 'attributes'>, key: string): number | null {
  const attrs = listing.attributes;
  if (!attrs || typeof attrs !== 'object' || Array.isArray(attrs)) return null;
  const value = attrs[key];
  return typeof value === 'number' && value > 0 ? value : null;
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

/**
 * Liên hệ người đăng (style Stitch): 2 nút vuông chỉ icon — Gọi (Hiện số → Gọi, reveal_contact) và Nhắn tin (chat) — rồi
 * nút chính rộng theo `primary` ('call': trọ / đồ thất lạc; 'chat': pass / việc), nhãn theo tính năng
 * (listing.contact.primary.<cta>_<feature>). Khách bấm → đăng nhập rồi làm tiếp. Đã hiện số mà người đăng không có SĐT →
 * nút chính chuyển sang Nhắn tin + dòng contact.no_phone; đã hiện số khi nút chính là Nhắn tin → dòng "Số điện thoại: …".
 */
function ContactBar({
  listing,
  primary,
  primaryKey,
  mini,
}: {
  listing: PublicListing;
  primary: 'chat' | 'call';
  /** Nhãn nút chính riêng (config.detail.primaryCtaKey). */
  primaryKey?: string;
  /** Mở từ mini-app → chat mở trong màu mini-app. */
  mini?: MiniSlug;
}) {
  const { t } = useTranslation('listing');
  const contact = useContactListing();
  const phone = useRevealPhone(listing);
  const feature = featureOfCategory(listing.category);
  const noPhone = phone.revealed && !phone.phone;
  const cta = primary === 'call' && noPhone ? 'chat' : primary;
  const shown = phone.revealed && phone.phone ? formatVnPhone(phone.phone) : null;
  const onCall = () => (phone.phone ? phone.call(phone.phone) : phone.reveal());
  const chat = () => contact.open(listing, { mini });
  return (
    <StickyCta elevated>
      <View className="flex-row items-center gap-2">
        <Button
          iconOnly
          icon={Phone}
          variant="secondary"
          label={shown ? t('contact.call', { phone: shown }) : t('contact.reveal_call')}
          loading={phone.isPending}
          disabled={noPhone}
          onPress={onCall}
        />
        <Button iconOnly icon={MessageCircle} variant="secondary" label={t('detail.contact')} loading={contact.isPending} onPress={chat} />
        {/* Nút chính rộng bên phải (gần ngón cái), giống Stitch. */}
        <View className="flex-1">
          {cta === 'call' ? (
            <Button
              label={shown ? t('contact.call', { phone: shown }) : t(primaryKey ?? `contact.primary.call_${feature}`)}
              icon={Phone}
              fullWidth
              loading={phone.isPending}
              onPress={onCall}
            />
          ) : (
            <Button
              label={t(primaryKey ?? `contact.primary.chat_${feature}`)}
              icon={MessageCircle}
              fullWidth
              loading={contact.isPending}
              onPress={chat}
            />
          )}
        </View>
      </View>
      {noPhone ? (
        <Text variant="caption" tone="muted" accessibilityLiveRegion="polite">
          {t('contact.no_phone')}
        </Text>
      ) : shown && cta === 'chat' ? (
        <Text variant="label" weight="semibold" accessibilityLiveRegion="polite" selectable>
          {t('contact.phone_line', { phone: shown })}
        </Text>
      ) : null}
    </StickyCta>
  );
}
