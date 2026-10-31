// Hình dạng config của một tính năng Listing (pass, room, job, lost-found) — quy tắc vàng: 4 tính năng dùng chung
// engine features/listing, khác nhau chỉ ở config.ts. Config không biểu diễn được điều cần → mở rộng type này
// + engine để mọi tính năng cùng hưởng (.claude/rules/mobile-features.md).
// Tuần 3: phần đọc (danh sách + chi tiết); tuần 4: `form` cho "Đăng nhanh" (engine form trong features/listing/form).
import type { ListingCategory, ListingFeature, PriceType } from '@hp/shared';
import type { ListingCardLayout, ServiceKey } from '@/ui';

/** subcategory: chip category con · site: chip chọn khu (sites). Phải nằm trong tập RPC search_listings hỗ trợ. */
export type ListingFilterKey = 'subcategory' | 'site';

/** Cấu hình form "Đăng nhanh" — trường chi tiết lấy từ ATTRIBUTE_FIELDS[category] của @hp/shared (không khai báo lại). */
export type ListingFormConfig = {
  /** 'recommended': nhắc form.photos_required (không chặn đăng) · 'optional': không nhắc. */
  photos: 'recommended' | 'optional';
  /** Có ô hình thức giá + giá (job: lương nằm trong attributes; lostFound: không có giá). */
  price: boolean;
  /** price_type gửi lên khi form không có ô giá / giá trị mặc định. */
  defaultPriceType: PriceType;
};

export type ListingFeatureConfig = {
  /** Mã tính năng (khớp LISTING_FEATURES của @hp/shared); 'all' = danh sách mọi tin (Hub → Xem tất cả). */
  key: ListingFeature | 'all';
  /** Tham số route `listings/[feature]`. */
  slug: 'pass' | 'room' | 'job' | 'lost-found' | 'all';
  /** Category con — chip lọc + giới hạn tìm kiếm. */
  categories: readonly ListingCategory[];
  /** Màu + icon dịch vụ (t.serviceColors.<color>); null cho 'all'. */
  color: ServiceKey | null;
  /** Key i18n tiêu đề màn (vd 'common:feature.pass'). */
  titleKey: string;
  /** Key i18n gợi ý ô tìm kiếm; mặc định `listing:list.search_placeholder` với tên tính năng. */
  searchPlaceholderKey?: string;
  card: {
    /** Prop `layout` của ListingCard: 'grid' = lưới 2 cột, 'row' = một cột ảnh vuông bên trái. */
    variant: ListingCardLayout;
    /** Chiều cao ước lượng một hàng (px) — tính ngưỡng tải trang tiếp khi còn ~5 item (FlashList v2 tự đo item). */
    estimatedHeight: number;
  };
  /** Bộ lọc trên màn danh sách, theo thứ tự hiển thị. Thêm filter (price, condition, radius, sort…) → thêm mã ở đây + engine. */
  filters: readonly ListingFilterKey[];
  /** Form đăng tin; không có ở danh sách tổng hợp 'all'. */
  form?: ListingFormConfig;
};
