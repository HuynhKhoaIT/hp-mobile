// Tìm trọ — /tro. Chỉ khác biệt so với tính năng Listing khác; logic chung ở features/listing.
// Lọc khoảng cách tới khu làm việc (?distance=1|2|5, tuần 9). Chế độ bản đồ: chờ key Goong.
// Mini-app "Nhà Trọ" (Stitch room_home / room_detail, khớp app): màu ngọc lục bảo (theme room), header kiểu 'directory'
// (nhãn "Nhà trọ KKT" + chuông, viên "Gần bạn: {khu}", ô tìm + nút vuông tới trang bộ lọc), trang chủ = lưới 6 ô "Danh mục
// tìm kiếm" (4 loại phòng + "Phòng máy lạnh" ?has_ac=1 + "Gần cổng KKT" ?distance=2) → chip nhanh → thẻ "Thuê trọ an tâm"
// → "Phòng trọ giá tốt ca kíp" (thẻ lớn rồi các hàng gọn) → khối mời chủ trọ đăng tin. Chi tiết tin: bảng chi phí, vị trí &
// khoảng cách tới các khu, tiện nghi, chủ trọ, mô tả & nội quy (detail.sections).
import { LISTING_FEATURE_PATHS } from '@hp/core';
import { LISTING_FEATURES, ROOM_PRICE_RANGES } from '@hp/shared';
import { AirVent, BedDouble, Building2, Factory, House, Users } from 'lucide-react';
import type { ListingFeatureConfig } from '@/features/listing/feature-config';
import { miniAppPaths } from '@/features/listing/mini-app-routes';

/**
 * Khoảng giá thuê / tháng (VND) của trang bộ lọc (?price=<khoá>, tập hữu hạn → trang còn cache được). Nhãn i18n
 * `listing.price_range.<khoá>`.
 */

export const roomConfig: ListingFeatureConfig = {
  feature: 'room',
  path: LISTING_FEATURE_PATHS.room,
  categories: LISTING_FEATURES.room,
  Icon: House,
  tone: { soft: 'bg-service-room-soft', fg: 'text-service-room' },
  cardLayout: 'grid',
  jsonLd: 'accommodation',
  distanceFilterKm: [1, 2, 5],
  // Stitch L1 (khớp app): thẻ nhấn giá tháng + diện tích · có gác · ở tối đa. Stitch L3: dòng chủ trọ (+ dấu xác minh), tim
  // lưu tin. Stitch room_home: chip giá · Có gác · Giờ giấc tự do · Không chung chủ · Điều hoà.
  card: { facts: ['area_m2', 'has_loft', 'max_people'], owner: true, bookmark: true },
  quickFilters: [
    { priceMax: 1_000_000, labelKey: 'listing.list.quick_price_under_1m' },
    { key: 'has_loft', value: true },
    { key: 'free_hours', value: true },
    { key: 'no_landlord', value: true },
    { key: 'has_ac', value: true },
  ],
  priceRanges: ROOM_PRICE_RANGES,
  tipKey: 'listing.tip.room',
  // Stitch room_detail: nút chính "Liên hệ hẹn xem phòng" mở chat (Gọi vẫn là nút vuông bên cạnh).
  primaryCta: 'chat',
  categoryIcons: { room_rent: BedDouble, room_share: Users, room_house: House, room_apartment: Building2 },
  form: { primaryAttributes: ['area_m2'], photosTipKey: 'listing.form.photos_tip.room' },
  miniApp: {
    titleKey: 'listing.mini_app.title.room',
    subtitleKey: 'listing.mini_app.subtitle.room',
    homeTabKey: 'listing.mini_app.tabs.home.room',
    theme: 'room',
    HomeIcon: House,
    header: { variant: 'directory', badgeKey: 'listing.mini_app.room.badge', nearLabelKey: 'listing.mini_app.room.near_label' },
    home: ['tiles', 'chips', 'trust', 'featured', 'promo'],
    tiles: {
      titleKey: 'listing.mini_app.room.categories_title',
      items: [
        { kind: 'category', category: 'room_rent' },
        { kind: 'category', category: 'room_share' },
        { kind: 'category', category: 'room_house' },
        { kind: 'category', category: 'room_apartment' },
        {
          kind: 'filter',
          key: 'ac',
          labelKey: 'listing.mini_app.room.tile_ac',
          hintKey: 'listing.mini_app.room.tile_ac_hint',
          Icon: AirVent,
          filter: { attributes: { has_ac: true } },
        },
        {
          kind: 'filter',
          key: 'near',
          labelKey: 'listing.mini_app.room.tile_near',
          hintKey: 'listing.mini_app.room.tile_near_hint',
          Icon: Factory,
          filter: { distanceKm: 2 },
        },
      ],
    },
    trust: { titleKey: 'listing.mini_app.room.trust_title', bodyKey: 'listing.mini_app.room.trust_body' },
    list: {
      titleKey: 'listing.mini_app.room.list_title',
      subtitleKey: 'listing.mini_app.room.list_subtitle',
      callKey: 'listing.mini_app.room.call',
      chatKey: 'listing.mini_app.room.chat',
      photosKey: 'listing.mini_app.room.photos',
    },
    promo: {
      eyebrowKey: 'listing.mini_app.room.landlord_eyebrow',
      titleKey: 'listing.mini_app.room.landlord_title',
      bodyKey: 'listing.mini_app.room.landlord_body',
      ctaKey: 'listing.mini_app.room.landlord_cta',
      category: 'room_rent',
    },
    filter: {
      categoryTitleKey: 'listing.mini_app.room.categories_title',
      locationHintKey: null,
      toggles: {
        titleKey: 'listing.attr_group.amenities',
        keys: ['has_loft', 'has_ac', 'private_wc', 'has_kitchen', 'has_wifi', 'has_camera', 'has_parking', 'free_hours', 'no_landlord'],
      },
    },
    paths: miniAppPaths(LISTING_FEATURE_PATHS.room),
  },
  detail: {
    activeStatusKey: 'listing.mini_app.room_detail.vacant',
    ownerBadge: 'landlord',
    updatedLine: { key: 'listing.mini_app.room_detail.updated' },
    priceNote: { attribute: 'deposit_months', key: 'listing.mini_app.room_detail.deposit' },
    primaryLabelKey: 'listing.mini_app.room_detail.contact_cta',
    posterTitleKey: 'listing.mini_app.room_detail.landlord_title',
    sections: [
      {
        kind: 'costs',
        titleKey: 'listing.mini_app.room_detail.costs_title',
        freeKey: 'listing.mini_app.room_detail.free',
        exclude: ['deposit_months'],
      },
      {
        kind: 'distance',
        titleKey: 'listing.mini_app.room_detail.distance_title',
        valueKey: 'listing.mini_app.room_detail.distance_value',
        mapKey: 'listing.mini_app.room_detail.map_cta',
        nearest: 3,
      },
      { kind: 'amenities', titleKey: 'listing.mini_app.room_detail.amenities_title' },
      { kind: 'attributes' },
      { kind: 'description', titleKey: 'listing.mini_app.room_detail.rules_title', group: 'rules' },
    ],
  },
};
