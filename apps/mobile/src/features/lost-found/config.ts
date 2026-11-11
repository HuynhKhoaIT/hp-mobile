// Đồ thất lạc — chỉ là config cho engine features/listing (quy tắc vàng). Tuần 9: chủ tin thấy "Tin có thể khớp"
// (trigger khớp mất ↔ nhặt + push lost_found_match) và nút "Đã nhận lại đồ" ở chi tiết (detail.lostFound).
// Stitch L1: chip / badge "Mất đồ" (đỏ) · "Nhặt được" (xanh) thay nhãn danh mục "Tôi làm mất / Tôi nhặt được"; lọc nhanh
// theo loại đồ; thẻ không giá, dòng cuối là nơi mất / nhặt · thời điểm (attributes place, lost_at); liên hệ chính là Gọi;
// mẹo hỏi đặc điểm riêng để trả đúng chủ, che số giấy tờ.
// Stitch L2 (form): chọn "Tôi làm mất / Tôi nhặt được" bằng 2 thẻ lớn ở bước chọn danh mục; bước Ảnh có hộp nhắc che số
// giấy tờ; loại đồ + nơi + thời điểm lên bước Thông tin chính; không có giá; `returned` không hiện trong form (chỉ đặt qua
// "Đã nhận lại đồ"). Gợi ý tiêu đề / mô tả riêng (giữ một chi tiết để hỏi người đến nhận).
import { LISTING_FEATURES } from '@hp/shared';
import { HandHeart, Megaphone } from 'lucide-react-native';
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
  card: {
    variant: 'row',
    estimatedHeight: 150,
    display: {
      facts: ['item_type'],
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
  detail: { lostFound: true, primaryCta: 'call' },
};
