// Kiểu cấu hình của một tính năng Listing (pass / room / job / lostFound). Quy tắc vàng: 4 tính năng dùng chung
// features/listing; khác biệt CHỈ nằm trong features/<x>/config.ts (category, đường dẫn, icon, màu dịch vụ, SEO, JSON-LD).
// Thêm tính năng = thêm category ở @hp/shared + một config.ts + một dòng trong features.ts.
import type { ListingFeaturePath } from '@hp/core';
import type { ListingCategory, ListingFeature } from '@hp/shared';
import type { LucideIcon } from 'lucide-react';

export type ListingFeatureConfig = {
  feature: ListingFeature;
  /** Đường dẫn tiếng Việt cố định (LISTING_FEATURE_PATHS của @hp/core). */
  path: ListingFeaturePath;
  categories: readonly ListingCategory[];
  /** Icon lucide (strokeWidth 1.75) — khớp app: pass Package, room House, job Briefcase, lostFound Search. */
  Icon: LucideIcon;
  /** Class đầy đủ (Tailwind quét được, không ghép chuỗi động): nền ô ảnh trống + màu icon dịch vụ. */
  tone: { soft: string; fg: string };
  /** Bố cục thẻ trong danh sách (khớp app): pass / room = lưới ảnh 4:3, job / lostFound = hàng ngang ảnh vuông. */
  cardLayout: 'grid' | 'row';
  /** Loại JSON-LD của trang chi tiết (.claude/rules/web-seo-public.md). null = không có loại phù hợp. */
  jsonLd: 'product' | 'accommodation' | 'job' | null;
};
