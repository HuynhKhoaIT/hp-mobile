// Kiểu cấu hình của một tính năng Listing (pass / room / job / lostFound). Quy tắc vàng: 4 tính năng dùng chung
// features/listing; khác biệt CHỈ nằm trong features/<x>/config.ts (category, đường dẫn, icon, màu dịch vụ, SEO, JSON-LD).
// Thêm tính năng = thêm category ở @hp/shared + một config.ts + một dòng trong features.ts.
// Giao diện Stitch (L1, khớp app `features/<x>/config.ts`): `card` (điểm nhấn thẻ + khối tóm tắt chi tiết), `quickFilters`
// (chip lọc nhanh theo thông số — tham số URL `?has_loft=1`), `tipKey` (mẹo an toàn riêng), `primaryCta` (nút liên hệ chính).
// Stitch L2 (form đăng tin, khớp app `config.form` + `categoryIcons`): `categoryIcons` (thẻ danh mục ở bước chọn), `form`
// (thông số lên bước Thông tin chính, trường ẩn, mẹo / hộp nhắc ở bước Ảnh, gợi ý chữ riêng).
// Stitch L3 (danh sách việc ca kíp / trọ / đồ thất lạc, khớp app): `card.owner | bookmark | description`, chip lọc nhanh giá
// tối đa (`?price_max=1000000`), `banner` (khối mời đăng tin đầu danh sách).
// Chợ Pass đồ ("Trang chủ riêng", khớp app): `priceRanges` (?price=<khoá>), `sortable` (?sort=), chip "Cho tặng" (?free=1),
// `home` (trang chủ mini khi chưa lọc: lưới danh mục → banner → các dải → "Tất cả tin").
// Mini-app "Chợ Pass Đồ" (Stitch pass_home / saved / manage / filter): `miniApp` (điều hướng, header, trang con riêng) +
// `customPrice` (ô giá tối thiểu / tối đa ở trang bộ lọc).
import type { ListingFeaturePath } from '@hp/core';
import type { ListingCategory, ListingFeature, ListingPriceRange } from '@hp/shared';
import type { LucideIcon } from 'lucide-react';
import type { BadgeTone } from '@/components/shared/badge';
import type { MiniAppPaths } from './mini-app-routes';

/** Điểm nhấn thẻ tin theo tính năng — giống `ListingCardDisplay` của app (apps/mobile/src/ui/ListingCard.tsx). */
export type ListingCardDisplay = {
  /** Khoá attributes hiện thành nhãn nhỏ dưới giá (thứ tự hiển thị, tối đa 3). */
  facts?: readonly string[];
  /** Badge danh mục theo category: tone + key i18n nhãn thay cho `common.category.<code>`. */
  categoryBadge?: Partial<Record<ListingCategory, { tone: BadgeTone; labelKey?: string }>>;
  /** Khoá attributes text thay tên khu ở dòng cuối thẻ (vd `place`). */
  placeKey?: string;
  /** Khoá attributes datetime thay thời gian đăng ở dòng cuối thẻ (vd `lost_at`). */
  timeKey?: string;
  /** Đoạn mô tả tối đa 2 dòng dưới thông số (đồ thất lạc: đặc điểm đồ). */
  description?: boolean;
  /** Dòng người đăng cuối thẻ: avatar + tên rút gọn + dấu xác minh (owner_badges). */
  owner?: boolean;
  /** Nút tim lưu tin góc phải trên của thẻ (ẩn với tin của chính mình). */
  bookmark?: boolean;
};

/** Khác biệt của form "Đăng nhanh" theo tính năng — giống `ListingFormConfig` của app (apps/mobile/src/features/listing/types.ts). */
export type ListingFormDisplay = {
  /** Khoá ATTRIBUTE_FIELDS hiện ở bước 2 (Thông tin chính, theo thứ tự); lỗi của chúng nhảy về bước 2. */
  primaryAttributes?: readonly string[];
  /** Khoá ATTRIBUTE_FIELDS không hiện trong form (vd `returned` — chỉ đặt qua "Đã nhận lại đồ"); giá trị cũ vẫn giữ. */
  hiddenAttributes?: readonly string[];
  /** Key i18n mẹo chụp ảnh ở bước Ảnh. */
  photosTipKey?: string;
  /** Hộp nhắc "che số giấy tờ trước khi tải ảnh" (đồ thất lạc). */
  privacyNotice?: boolean;
  /** Key i18n gợi ý ô tiêu đề / mô tả riêng (mặc định listing.form.title_hint / description_hint). */
  titleHintKey?: string;
  descriptionHintKey?: string;
};

/**
 * Chip lọc nhanh: theo thông số (chỉ trường enum / bool — filterableFields của filters.ts), giá tối đa (VND,
 * `?price_max=` → search_listings p_price_max; nhãn riêng qua `labelKey`) hoặc chỉ tin cho tặng (`?free=1` → p_free_only).
 * Giống `ListingQuickFilter` của app.
 */
export type ListingQuickFilter =
  | { key: string; value: string | boolean }
  | { priceMax: number; labelKey: string }
  | { freeOnly: true; labelKey: string };

/** Một dải tin của trang chủ mini: gần khu mặc định · cho tặng · tin mới của một danh mục. Giống `ListingHomeRail` của app. */
export type ListingHomeRail =
  | { key: string; kind: 'near' }
  | { key: string; kind: 'free' }
  | { key: string; kind: 'category'; category: ListingCategory };

/**
 * Trang chủ mini của tính năng (khi chưa lọc / sắp xếp): lưới danh mục (icon config.categoryIcons) → banner (`bannerPlacement`,
 * bảng `banners`) → các dải `rails` theo thứ tự → "Tất cả tin {tính năng}". Giống `ListingFeatureHome` của app.
 */
export type ListingFeatureHome = {
  /** Vị trí banner (bảng banners, vd `web_pass`); thiếu = không có khối banner. */
  bannerPlacement?: string;
  rails: readonly ListingHomeRail[];
};

/**
 * Mini-app trong super app (Chợ Pass Đồ — Stitch "pass_home / saved / manage / filter"): tính năng có điều hướng riêng
 * (thanh dưới trên điện thoại / dải tab trên desktop: Trang chủ · Đã lưu · Đăng tin · Chat · Quản lý tin), header riêng
 * (← {APP_NAME} Super App, ô icon túi + tên + nhãn MINI-APP, chọn khu, ô tìm) và các trang con `paths`
 * (mini-app-routes.ts — đường dẫn cũng phải có trong MINI_APP_BASES để proxy.ts chặn trang cần đăng nhập).
 * Trang chủ mini-app (chưa lọc): "Điểm nóng" (chip khu) → lưới `homeCategoryCount` danh mục đầu + "Cho tặng" + "Tất cả mục"
 * (→ trang bộ lọc) → banner `bannerPlacement` (rỗng → khối "An tâm trao tay") → chip nhanh → "Tin mới đăng quanh bạn".
 */
export type ListingMiniApp = {
  /** Key i18n tên mini-app (header, tiêu đề trang con) — vd listing.mini_app.title.pass. */
  titleKey: string;
  /** Key i18n dòng phụ dưới tên. */
  subtitleKey: string;
  /** Key i18n nhãn tab trang chủ (thanh dưới, nút quay lại của trang con) — vd listing.mini_app.tabs.home.pass. */
  homeTabKey: string;
  /** Vị trí banner (bảng banners, vd `web_pass`); thiếu / rỗng → khối "An tâm trao tay". */
  bannerPlacement?: string;
  /** Số danh mục đầu (config.categories) hiện ở lưới trang chủ — còn lại qua "Tất cả mục". */
  homeCategoryCount: number;
  paths: MiniAppPaths;
};

/**
 * Khối mời đăng tin đầu danh sách (khi chưa lọc) — mỗi nút tới /dang-tin chọn sẵn tính năng + danh mục. Giống
 * `ListingListBanner` của app: 'actions' (thẻ chữ + các nút chia đều — đồ thất lạc) · 'strip' (dải mỏng chữ + một nút — trọ).
 */
export type ListingListBanner = {
  variant: 'actions' | 'strip';
  /** Key i18n dòng chữ của khối. */
  textKey: string;
  actions: readonly { labelKey: string; category: ListingCategory; Icon?: LucideIcon }[];
};

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
  /** Lựa chọn lọc "Cách khu làm việc dưới N km" (?distance=N). Rỗng / thiếu = không có bộ lọc khoảng cách. */
  distanceFilterKm?: readonly number[];
  /** Đồ thất lạc: chủ tin thấy "Tin có thể khớp" + "Đã nhận lại đồ"; thẻ / chi tiết có nhãn "Đã trả lại". */
  returnable?: boolean;
  /** Điểm nhấn thẻ / khối tóm tắt chi tiết. */
  card?: ListingCardDisplay;
  /** Chip lọc nhanh dưới chip danh mục (bật / tắt; cùng khoá thì thay giá trị). */
  quickFilters?: readonly ListingQuickFilter[];
  /** Khối mời đăng tin đầu danh sách (trước mẹo an toàn). */
  banner?: ListingListBanner;
  /** Key i18n mẹo an toàn riêng (đầu danh sách + chi tiết); thiếu → `listing.detail.safety_tip`. */
  tipKey?: string;
  /** Nút liên hệ chính ở chi tiết: 'chat' (mặc định) hoặc 'call' (Hiện số → Gọi — trọ, đồ thất lạc). */
  primaryCta?: 'chat' | 'call';
  /** Icon từng danh mục ở bước chọn danh mục (thiếu → Icon của tính năng). Gợi ý: listing.form.category_hint.<code>. */
  categoryIcons?: Partial<Record<ListingCategory, LucideIcon>>;
  form?: ListingFormDisplay;
  /** Khoảng giá đặt sẵn của bộ lọc "Giá" (?price=<khoá> → priceMin / priceMax). Thiếu = không có ô giá. */
  priceRanges?: readonly ListingPriceRange[];
  /** Có ô "Sắp xếp" (?sort=price_asc | price_desc; mặc định mới nhất — không ghi lên URL). */
  sortable?: boolean;
  /** Trang chủ mini khi chưa lọc (thiếu = danh sách thường). Bị `miniApp` thay thế nếu có cả hai. */
  home?: ListingFeatureHome;
  /** Ô nhập giá tối thiểu / tối đa tuỳ ý ở trang bộ lọc (?price_min= / ?price_max=) — trang đó không cache, noindex. */
  customPrice?: boolean;
  /** Chạy dạng mini-app (điều hướng + header + trang con riêng). */
  miniApp?: ListingMiniApp;
};
