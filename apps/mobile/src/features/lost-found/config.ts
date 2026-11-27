// Đồ thất lạc — chỉ là config cho engine features/listing (quy tắc vàng). Tuần 9: chủ tin thấy "Tin có thể khớp"
// (trigger khớp mất ↔ nhặt + push lost_found_match) và nút "Đã nhận lại đồ" ở chi tiết (detail.lostFound).
// Stitch L1: chip / badge "Mất đồ" (đỏ) · "Nhặt được" (xanh) thay nhãn danh mục "Tôi làm mất / Tôi nhặt được"; lọc nhanh
// theo loại đồ; thẻ không giá, dòng cuối là nơi mất / nhặt · thời điểm (attributes place, lost_at); liên hệ chính là Gọi;
// mẹo hỏi đặc điểm riêng để trả đúng chủ, che số giấy tờ.
// Stitch L2 (form): chọn "Tôi làm mất / Tôi nhặt được" bằng 2 thẻ lớn ở bước chọn danh mục; bước Ảnh có hộp nhắc che số
// giấy tờ; loại đồ + nơi + thời điểm lên bước Thông tin chính; không có giá; `returned` không hiện trong form (chỉ đặt qua
// "Đã nhận lại đồ"). Gợi ý tiêu đề / mô tả riêng (giữ một chi tiết để hỏi người đến nhận).
// Stitch L3 ("Tìm kiếm đồ thất lạc & Nhặt được"): khối 2 nút "Báo nhặt được" / "Đăng tin tìm đồ" đầu danh sách mở thẳng form
// đúng danh mục; thẻ có mô tả 2 dòng + dòng người đăng; tin đã trả lại: ảnh mờ + tiêu đề gạch ngang (ListingCard).
// Mini-app "Đồ Thất Lạc Dung Quất": bấm Đồ thất lạc ở super app mở mini/lost-found — màu hổ phách (appThemes.lostFound), trang
// chủ bố cục 'directory' (2 thẻ "Làm mất" / "Nhặt được" + ô loại đồ Giấy tờ / Ví / Điện thoại / Chìa khoá → bộ lọc item_type, chip
// nhanh, khối "Trả đồ an toàn", danh sách thẻ hàng, khối mời "Báo nhặt được"), Đã lưu, Chat, Quản lý tin, Bộ lọc. Không có thẻ
// nổi bật (tin ít ảnh) và không có "Đã bán": chỉ "Đóng tin" / "Đã nhận lại đồ" nên Quản lý tin không có tab "Đã bán"
// (featureListingsTabs của @hp/core). Chi tiết giữ khối "Tin có thể khớp" + "Đã nhận lại đồ" (detail.lostFound).
import { LISTING_FEATURES } from '@hp/shared';
import { BookUser, HandHeart, KeyRound, Megaphone, Smartphone, Wallet } from 'lucide-react-native';
import type { ListingFeatureConfig } from '@/features/listing/types';

export const lostFoundConfig: ListingFeatureConfig = {
  key: 'lostFound',
  slug: 'lost-found',
  categories: LISTING_FEATURES.lostFound,
  color: 'lostFound',
  titleKey: 'common:feature.lostFound',
  subtitleKey: 'listing:list.subtitle_lostFound',
  tipKey: 'listing:tip.lostFound',
  quickFilters: [
    { key: 'item_type', value: 'card' },
    { key: 'item_type', value: 'wallet' },
    { key: 'item_type', value: 'phone' },
    { key: 'item_type', value: 'keys' },
  ],
  banner: {
    variant: 'actions',
    textKey: 'listing:list.banner.lost_found_text',
    actions: [
      { labelKey: 'listing:list.banner.found_cta', category: 'found', icon: HandHeart },
      { labelKey: 'listing:list.banner.lost_cta', category: 'lost', icon: Megaphone },
    ],
  },
  card: {
    variant: 'row',
    estimatedHeight: 200,
    display: {
      facts: ['item_type'],
      description: true,
      owner: true,
      categoryBadge: {
        lost: { tone: 'danger', labelKey: 'listing:lost_found.kind_lost' },
        found: { tone: 'success', labelKey: 'listing:lost_found.kind_found' },
      },
      placeKey: 'place',
      timeKey: 'lost_at',
    },
  },
  filters: ['subcategory', 'site'],
  categoryIcons: { lost: Megaphone, found: HandHeart },
  form: {
    photos: 'optional',
    price: false,
    defaultPriceType: 'free',
    primaryAttributes: ['item_type', 'place', 'lost_at'],
    hiddenAttributes: ['returned'],
    privacyNotice: true,
    titleHintKey: 'listing:form.title_hint_lostFound',
    descriptionHintKey: 'listing:form.description_hint_lostFound',
  },
  miniApp: {
    titleKey: 'listing:mini_app.title.lostFound',
    subtitleKey: 'listing:mini_app.subtitle.lostFound',
    homeTabKey: 'listing:mini_app.tabs.home.lostFound',
    icon: Megaphone,
    homeTabIcon: Megaphone,
    home: {
      layout: 'directory',
      badgeKey: 'listing:mini_app.lost-found.badge',
      nearLabelKey: 'listing:mini_app.lost-found.near_label',
      categoriesTitleKey: 'listing:mini_app.lost-found.categories_title',
      // Loại đồ = thông số enum `item_type` (cùng giá trị với chip lọc nhanh ở trên).
      extraTiles: [
        {
          key: 'card',
          labelKey: 'listing:mini_app.lost-found.tile_card',
          hintKey: 'listing:mini_app.lost-found.tile_card_hint',
          icon: BookUser,
          filter: { attributes: { item_type: 'card' } },
        },
        {
          key: 'wallet',
          labelKey: 'listing:mini_app.lost-found.tile_wallet',
          hintKey: 'listing:mini_app.lost-found.tile_wallet_hint',
          icon: Wallet,
          filter: { attributes: { item_type: 'wallet' } },
        },
        {
          key: 'phone',
          labelKey: 'listing:mini_app.lost-found.tile_phone',
          hintKey: 'listing:mini_app.lost-found.tile_phone_hint',
          icon: Smartphone,
          filter: { attributes: { item_type: 'phone' } },
        },
        {
          key: 'keys',
          labelKey: 'listing:mini_app.lost-found.tile_keys',
          hintKey: 'listing:mini_app.lost-found.tile_keys_hint',
          icon: KeyRound,
          filter: { attributes: { item_type: 'keys' } },
        },
      ],
      trust: { titleKey: 'listing:mini_app.lost-found.trust_title', bodyKey: 'listing:mini_app.lost-found.trust_body' },
      list: { titleKey: 'listing:mini_app.lost-found.list_title', subtitleKey: 'listing:mini_app.lost-found.list_subtitle' },
      promo: {
        eyebrowKey: 'listing:mini_app.lost-found.finder_eyebrow',
        titleKey: 'listing:mini_app.lost-found.finder_title',
        bodyKey: 'listing:mini_app.lost-found.finder_body',
        ctaKey: 'listing:mini_app.lost-found.finder_cta',
        category: 'found',
        icon: HandHeart,
        ctaIcon: HandHeart,
      },
    },
  },
  detail: {
    lostFound: true,
    primaryCta: 'call',
    titleKey: 'listing:mini_app.lost_found_detail.title',
    availabilityKey: 'listing:mini_app.lost_found_detail.open',
    texts: { owner: 'listing:mini_app.lost_found_detail.poster_title', updated: 'listing:mini_app.lost_found_detail.updated' },
  },
};
