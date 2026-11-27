// Đồ thất lạc — /that-lac. Chỉ khác biệt so với tính năng Listing khác; logic chung ở features/listing.
// Không có loại JSON-LD phù hợp (schema.org không có "đồ thất lạc") → không nhúng.
// returnable: chủ tin xem "Tin có thể khớp" (trigger khớp tự động) + "Đã nhận lại đồ" (attributes.returned + đóng tin).
import { LISTING_FEATURE_PATHS } from '@hp/core';
import { LISTING_FEATURES } from '@hp/shared';
import { BookUser, HandHeart, KeyRound, Megaphone, Search, Smartphone, Wallet } from 'lucide-react';
import type { ListingFeatureConfig } from '@/features/listing/feature-config';
import { miniAppPaths } from '@/features/listing/mini-app-routes';

export const lostFoundConfig: ListingFeatureConfig = {
  feature: 'lostFound',
  path: LISTING_FEATURE_PATHS.lostFound,
  categories: LISTING_FEATURES.lostFound,
  Icon: Search,
  tone: { soft: 'bg-service-lost-found-soft', fg: 'text-service-lost-found' },
  cardLayout: 'row',
  jsonLd: null,
  returnable: true,
  // Stitch L1 (khớp app): badge / chip "Mất đồ" (đỏ) · "Nhặt được" (xanh) thay "Tôi làm mất / Tôi nhặt được"; thẻ không giá,
  // dòng cuối là nơi mất / nhặt · thời điểm (attributes place, lost_at); lọc nhanh theo loại đồ; liên hệ chính là Gọi.
  card: {
    facts: ['item_type'],
    categoryBadge: {
      lost: { tone: 'danger', labelKey: 'listing.lost_found.kind_lost' },
      found: { tone: 'success', labelKey: 'listing.lost_found.kind_found' },
    },
    placeKey: 'place',
    timeKey: 'lost_at',
    // Stitch L3 ("Tìm kiếm đồ thất lạc & Nhặt được", khớp app): mô tả 2 dòng + dòng người đăng; tin đã trả lại: ảnh mờ +
    // tiêu đề gạch ngang (listing-card).
    description: true,
    owner: true,
  },
  quickFilters: [
    { key: 'item_type', value: 'card' },
    { key: 'item_type', value: 'wallet' },
    { key: 'item_type', value: 'phone' },
    { key: 'item_type', value: 'keys' },
  ],
  // Khối 2 nút đầu danh sách → /dang-tin chọn sẵn "Tôi nhặt được" / "Tôi làm mất".
  banner: {
    variant: 'actions',
    textKey: 'listing.list.banner.lost_found_text',
    actions: [
      { labelKey: 'listing.list.banner.found_cta', category: 'found', Icon: HandHeart },
      { labelKey: 'listing.list.banner.lost_cta', category: 'lost', Icon: Megaphone },
    ],
  },
  tipKey: 'listing.tip.lostFound',
  primaryCta: 'call',
  // Stitch L2 (khớp app): 2 thẻ lớn "Tôi làm mất / Tôi nhặt được" ở bước chọn danh mục; hộp nhắc che số giấy tờ ở bước
  // Ảnh; loại đồ + nơi + thời điểm lên bước Thông tin chính; không có giá; `returned` chỉ đặt qua "Đã nhận lại đồ".
  categoryIcons: { lost: Megaphone, found: HandHeart },
  form: {
    primaryAttributes: ['item_type', 'place', 'lost_at'],
    hiddenAttributes: ['returned'],
    privacyNotice: true,
    titleHintKey: 'listing.form.title_hint_lostFound',
    descriptionHintKey: 'listing.form.description_hint_lostFound',
  },
  // Mini-app "Đồ Thất Lạc Dung Quất" (khớp app mini/lost-found): màu hổ phách, header + trang chủ kiểu 'directory' như Nhà Trọ /
  // Việc Làm; 2 ô danh mục "Làm mất" / "Nhặt được" + ô loại đồ (?item_type=), danh sách là thẻ hàng ngang (`latest` — tin ít ảnh
  // nên không có thẻ lớn `featured`). Không có "Đã bán" (chỉ Đóng tin / "Đã nhận lại đồ" → Quản lý tin không có tab "Đã bán":
  // featureListingsTabs). Chi tiết giữ "Tin có thể khớp" + "Đã nhận lại đồ" (returnable).
  miniApp: {
    titleKey: 'listing.mini_app.title.lostFound',
    subtitleKey: 'listing.mini_app.subtitle.lostFound',
    homeTabKey: 'listing.mini_app.tabs.home.lostFound',
    theme: 'lost-found',
    HomeIcon: Megaphone,
    header: { variant: 'directory', badgeKey: 'listing.mini_app.lost-found.badge', nearLabelKey: 'listing.mini_app.lost-found.near_label' },
    home: ['tiles', 'chips', 'trust', 'latest', 'promo'],
    tiles: {
      titleKey: 'listing.mini_app.lost-found.categories_title',
      items: [
        { kind: 'category', category: 'lost' },
        { kind: 'category', category: 'found' },
        {
          kind: 'filter',
          key: 'card',
          labelKey: 'listing.mini_app.lost-found.tile_card',
          hintKey: 'listing.mini_app.lost-found.tile_card_hint',
          Icon: BookUser,
          filter: { attributes: { item_type: 'card' } },
        },
        {
          kind: 'filter',
          key: 'wallet',
          labelKey: 'listing.mini_app.lost-found.tile_wallet',
          hintKey: 'listing.mini_app.lost-found.tile_wallet_hint',
          Icon: Wallet,
          filter: { attributes: { item_type: 'wallet' } },
        },
        {
          kind: 'filter',
          key: 'phone',
          labelKey: 'listing.mini_app.lost-found.tile_phone',
          hintKey: 'listing.mini_app.lost-found.tile_phone_hint',
          Icon: Smartphone,
          filter: { attributes: { item_type: 'phone' } },
        },
        {
          kind: 'filter',
          key: 'keys',
          labelKey: 'listing.mini_app.lost-found.tile_keys',
          hintKey: 'listing.mini_app.lost-found.tile_keys_hint',
          Icon: KeyRound,
          filter: { attributes: { item_type: 'keys' } },
        },
      ],
    },
    trust: { titleKey: 'listing.mini_app.lost-found.trust_title', bodyKey: 'listing.mini_app.lost-found.trust_body' },
    list: { titleKey: 'listing.mini_app.lost-found.list_title', subtitleKey: 'listing.mini_app.lost-found.list_subtitle' },
    promo: {
      eyebrowKey: 'listing.mini_app.lost-found.finder_eyebrow',
      titleKey: 'listing.mini_app.lost-found.finder_title',
      bodyKey: 'listing.mini_app.lost-found.finder_body',
      ctaKey: 'listing.mini_app.lost-found.finder_cta',
      category: 'found',
    },
    filter: {
      categoryTitleKey: 'listing.mini_app.lost-found.filter.category_title',
      locationHintKey: 'listing.mini_app.lost-found.filter.location_hint',
    },
    savedTip: { titleKey: 'listing.mini_app.lost-found.saved.tip_title', bodyKey: 'listing.mini_app.lost-found.saved.tip_body' },
    paths: miniAppPaths(LISTING_FEATURE_PATHS.lostFound),
  },
  detail: {
    activeStatusKey: 'listing.mini_app.lost_found_detail.open',
    updatedLine: { key: 'listing.mini_app.lost_found_detail.updated' },
    posterTitleKey: 'listing.mini_app.lost_found_detail.poster_title',
  },
};
