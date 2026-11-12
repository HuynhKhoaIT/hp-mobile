// Tìm trọ — chỉ là config cho engine features/listing (quy tắc vàng). Tuần 9: lọc khoảng cách tới khu làm việc
// (chip Khoảng cách: Mọi khoảng cách / < 1 / < 2 / < 5 km), thẻ có "Cách <khu> <khoảng cách>", đăng tin cần ≥ 3 ảnh.
// Stitch L1: lọc nhanh Có gác / Chỗ để xe; thẻ nhấn giá tháng + diện tích · có gác · ở tối đa; mẹo xem phòng tận nơi, không
// đặt cọc qua mạng.
// Chế độ bản đồ cluster: chờ key Goong + src/ui/MapView (chưa có thư viện bản đồ).
// Stitch L2 (form): thẻ danh mục có icon; diện tích + tiền cọc + số người lên bước Thông tin chính; mẹo chụp ảnh phòng.
// Stitch L3 ("Tìm phòng trọ & Nhà trọ"): chip "Dưới 1 triệu/tháng" (p_price_max); thẻ có dòng chủ trọ (+ dấu xác minh) và
// nút tim lưu tin; dải "Bạn là chủ trọ? Đăng tin" đầu danh sách mở thẳng form phòng cho thuê.
// Mini-app "Nhà Trọ Dung Quất" (Stitch, 2026-11-12): bấm Tìm trọ ở super app mở mini/room — màu emerald (appThemes.room),
// trang chủ bố cục 'directory' (6 ô danh mục 3 cột gồm "Phòng máy lạnh" / "Gần cổng KKT", chip nhanh tiện nghi, khối tin cậy,
// thẻ nổi bật + thẻ hàng, khối mời chủ trọ đăng tin), Đã lưu, Chat, Quản lý tin, Bộ lọc. Chi tiết theo Stitch "Chi tiết phòng
// trọ": bảng chi phí, khoảng cách tới các khu, tiện nghi, nội quy gộp mô tả, nút chính "Liên hệ hẹn xem phòng" (chat).
// Không có banner placement riêng cho trọ (chỉ 'app_pass') → không có khối banner.
import { LISTING_FEATURES, LISTING_IMAGES, ROOM_PRICE_RANGES } from '@hp/shared';
import { Building, CirclePlus, DoorOpen, House, Megaphone, Navigation, Plus, Snowflake, Users } from 'lucide-react-native';
import type { ListingFeatureConfig } from '@/features/listing/types';

export const roomConfig: ListingFeatureConfig = {
  key: 'room',
  slug: 'room',
  categories: LISTING_FEATURES.room,
  color: 'room',
  titleKey: 'common:feature.room',
  subtitleKey: 'listing:list.subtitle_room',
  tipKey: 'listing:tip.room',
  quickFilters: [
    { priceMax: 1_000_000, labelKey: 'listing:list.quick_price_under_1m' },
    { key: 'has_loft', value: true },
    { key: 'free_hours', value: true },
    { key: 'no_landlord', value: true },
    { key: 'has_ac', value: true },
    { key: 'has_parking', value: true },
  ],
  banner: {
    variant: 'strip',
    textKey: 'listing:list.banner.landlord_text',
    actions: [{ labelKey: 'listing:list.banner.landlord_cta', category: 'room_rent', icon: Plus }],
  },
  // Danh sách mini-app: thẻ nổi bật đầu tiên + thẻ hàng (miniApp.home 'directory'); danh sách thường / dải Hub: lưới.
  card: {
    variant: 'grid',
    estimatedHeight: 360,
    display: { facts: ['area_m2', 'has_loft', 'max_people'], owner: true, bookmark: true },
  },
  filters: ['subcategory', 'site', 'distance', 'price', 'sort'],
  // Khoảng giá thuê / tháng (ROOM_PRICE_RANGES — cùng bộ với web): chip ở màn Bộ lọc mini-app + filter "Giá" của danh sách.
  priceRanges: ROOM_PRICE_RANGES,
  distanceOptionsKm: [1, 2, 5],
  categoryIcons: { room_rent: DoorOpen, room_share: Users, room_house: House, room_apartment: Building },
  miniApp: {
    titleKey: 'listing:mini_app.title.room',
    subtitleKey: 'listing:mini_app.subtitle.room',
    homeTabKey: 'listing:mini_app.tabs.home.room',
    icon: House,
    homeTabIcon: House,
    home: {
      layout: 'directory',
      badgeKey: 'listing:mini_app.room.badge',
      nearLabelKey: 'listing:mini_app.room.near_label',
      categoriesTitleKey: 'listing:mini_app.room.categories_title',
      extraTiles: [
        {
          key: 'ac',
          labelKey: 'listing:mini_app.room.tile_ac',
          hintKey: 'listing:mini_app.room.tile_ac_hint',
          icon: Snowflake,
          filter: { attributes: { has_ac: true } },
        },
        {
          key: 'near',
          labelKey: 'listing:mini_app.room.tile_near',
          hintKey: 'listing:mini_app.room.tile_near_hint',
          icon: Navigation,
          filter: { distanceKm: 2 },
        },
      ],
      trust: { titleKey: 'listing:mini_app.room.trust_title', bodyKey: 'listing:mini_app.room.trust_body' },
      list: { titleKey: 'listing:mini_app.room.list_title', subtitleKey: 'listing:mini_app.room.list_subtitle' },
      featured: {
        photosKey: 'listing:mini_app.room.photos',
        callKey: 'listing:mini_app.room.call',
        chatKey: 'listing:mini_app.room.chat',
        highlights: ['private_wc', 'has_wifi', 'has_camera', 'free_hours', 'has_ac', 'has_kitchen', 'no_landlord', 'has_parking'],
      },
      promo: {
        eyebrowKey: 'listing:mini_app.room.landlord_eyebrow',
        titleKey: 'listing:mini_app.room.landlord_title',
        bodyKey: 'listing:mini_app.room.landlord_body',
        ctaKey: 'listing:mini_app.room.landlord_cta',
        category: 'room_rent',
        icon: Megaphone,
        ctaIcon: CirclePlus,
      },
    },
  },
  form: {
    photos: 'recommended',
    price: true,
    defaultPriceType: 'fixed',
    minPhotos: LISTING_IMAGES.roomMin,
    primaryAttributes: ['area_m2', 'deposit_months', 'max_people'],
    photosTipKey: 'listing:form.photos_tip.room',
  },
  detail: {
    primaryCta: 'chat',
    primaryCtaKey: 'listing:mini_app.room_detail.contact_cta',
    titleKey: 'listing:mini_app.room_detail.title',
    sections: ['costs', 'distance', 'amenities', 'rules'],
    priceNote: { key: 'deposit_months', labelKey: 'listing:mini_app.room_detail.deposit' },
    availabilityKey: 'listing:mini_app.room_detail.vacant',
    texts: {
      costs: 'listing:mini_app.room_detail.costs_title',
      distance: 'listing:mini_app.room_detail.distance_title',
      distanceValue: 'listing:mini_app.room_detail.distance_value',
      mapCta: 'listing:mini_app.room_detail.map_cta',
      amenities: 'listing:mini_app.room_detail.amenities_title',
      owner: 'listing:mini_app.room_detail.landlord_title',
      rules: 'listing:mini_app.room_detail.rules_title',
      updated: 'listing:mini_app.room_detail.updated',
    },
  },
};
