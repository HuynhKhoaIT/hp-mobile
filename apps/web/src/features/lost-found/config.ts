// Đồ thất lạc — /that-lac. Chỉ khác biệt so với tính năng Listing khác; logic chung ở features/listing.
// Không có loại JSON-LD phù hợp (schema.org không có "đồ thất lạc") → không nhúng.
// returnable: chủ tin xem "Tin có thể khớp" (trigger khớp tự động) + "Đã nhận lại đồ" (attributes.returned + đóng tin).
import { LISTING_FEATURE_PATHS } from '@hp/core';
import { LISTING_FEATURES } from '@hp/shared';
import { HandHeart, Megaphone, Search } from 'lucide-react';
import type { ListingFeatureConfig } from '@/features/listing/feature-config';

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
};
