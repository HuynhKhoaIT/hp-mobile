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
// Mini-app "Nhà Trọ" (Stitch room_home / room_detail): `miniApp.theme` (màu riêng — data-app-theme), `miniApp.header` /
// `home` (khối trang chủ theo thứ tự, thay bố cục cứng của Chợ Pass), `detail` (khối trang chi tiết: chi phí, khoảng cách…).
import type { ListingFeaturePath } from '@hp/core';
import type { AttributeGroupKey, ListingCategory, ListingFeature } from '@hp/shared';
import type { LucideIcon } from 'lucide-react';
import type { BadgeTone } from '@/components/shared/badge';
import type { ListFilterState, PriceRange } from './filters';
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

/** Khoá màu chủ đạo của mini-app — `[data-app-theme='<key>']` trong theme.css của @hp/tokens (kebab của appThemes). */
export type MiniAppTheme = 'pass' | 'room' | 'job' | 'ride' | 'sport' | 'lost-found';

/**
 * Ô của lưới "Danh mục tìm kiếm" (khối `tiles` của trang chủ mini-app): một danh mục (icon config.categoryIcons, nhãn
 * listing.category_short.<code>, gợi ý listing.form.category_hint.<code>) hoặc một bộ lọc đặt sẵn (link trang chủ mini-app
 * kèm tham số — chỉ giá trị thuộc tập hữu hạn của config để trang còn cache được: thuộc tính enum / bool, khoảng cách trong
 * distanceFilterKm, mốc giá của chip giá).
 */
export type MiniAppTile =
  | { kind: 'category'; category: ListingCategory }
  | {
      kind: 'filter';
      key: string;
      labelKey: string;
      hintKey?: string;
      Icon: LucideIcon;
      filter: Partial<Pick<ListFilterState, 'attributes' | 'distanceKm' | 'priceMax' | 'freeOnly'>>;
    };

/**
 * Khối của trang chủ mini-app khi chưa lọc, theo thứ tự (mini-app-list.tsx):
 * - `sites`: "Khu:" + chip từng khu (?site=) — "Điểm nóng" (Pass)
 * - `categories`: thẻ lưới 4 / 8 cột — `homeCategoryCount` danh mục đầu + "Cho tặng" + "Tất cả mục" (Pass)
 * - `tiles`: lưới 3 cột "Danh mục tìm kiếm" — `tiles` (danh mục + bộ lọc đặt sẵn) (Nhà trọ)
 * - `banner`: banner `bannerPlacement` (bảng banners) — rỗng → khối "An tâm trao tay" (Pass)
 * - `chips`: hàng chip "Tất cả · Gần {khu đầu} · chip lọc nhanh của config" (bỏ "Cho tặng" khi trang có khối `categories`)
 * - `trust`: thẻ nhắc an tâm `trust` (Nhà trọ)
 * - `latest`: "Tin mới đăng quanh bạn" + lưới thẻ (Pass)
 * - `featured`: `list` — thẻ lớn cho tin đầu (ảnh, tiện nghi, Gọi / Nhắn tin) rồi các hàng gọn (Nhà trọ)
 * - `promo`: khối mời đăng tin `promo` nền gradient mini-app (Nhà trọ — "Chủ trọ có phòng trống?")
 * Mỗi trang chủ phải có đúng một khối danh sách (`latest` hoặc `featured`).
 */
export type MiniAppHomeSection = 'sites' | 'categories' | 'tiles' | 'banner' | 'chips' | 'trust' | 'latest' | 'featured' | 'promo';

/**
 * Mini-app trong super app (Chợ Pass Đồ, Nhà Trọ — Stitch "pass_home / saved / manage / filter", "room_home"): tính năng có
 * điều hướng riêng (thanh dưới trên điện thoại / dải tab trên desktop: Trang chủ · Đã lưu · Đăng tin · Chat · Quản lý tin),
 * header riêng (gradient màu mini-app — `theme`) và các trang con `paths` (mini-app-routes.ts — đường dẫn cũng phải có trong
 * MINI_APP_BASES để proxy.ts chặn trang cần đăng nhập). Trang chủ (chưa lọc) = các khối `home` theo thứ tự.
 */
export type ListingMiniApp = {
  /** Key i18n tên mini-app (header, tiêu đề trang con) — vd listing.mini_app.title.pass. */
  titleKey: string;
  /** Key i18n dòng phụ dưới tên. */
  subtitleKey: string;
  /** Key i18n nhãn tab trang chủ (thanh dưới, nút quay lại của trang con) — vd listing.mini_app.tabs.home.pass. */
  homeTabKey: string;
  /** Màu chủ đạo (header gradient, tab đang mở, nút chính, chữ nhấn) trong khung mini-app. */
  theme: MiniAppTheme;
  /** Icon tab trang chủ (thanh dưới / dải tab). */
  HomeIcon: LucideIcon;
  /**
   * Header trang chủ: 'market' (Pass — ô icon + tên + nhãn MINI-APP + chọn khu cạnh tên, ô tìm + nút Tìm) · 'directory'
   * (Nhà trọ — nhãn `badgeKey` + chuông trên cùng, tên + dòng phụ, viên chọn khu cả hàng "Gần bạn", ô tìm + nút vuông tới
   * trang bộ lọc).
   */
  header: { variant: 'market'; Icon: LucideIcon } | { variant: 'directory'; badgeKey: string; nearLabelKey: string };
  /** Khối trang chủ khi chưa lọc (thứ tự hiển thị). */
  home: readonly MiniAppHomeSection[];
  /** Khối `banner`: vị trí banner (bảng banners, vd `web_pass`); thiếu / rỗng → khối "An tâm trao tay". */
  bannerPlacement?: string;
  /** Khối `categories`: số danh mục đầu (config.categories) hiện ở lưới — còn lại qua "Tất cả mục". */
  homeCategoryCount?: number;
  /** Khối `tiles`: tiêu đề + các ô. */
  tiles?: { titleKey: string; items: readonly MiniAppTile[] };
  /** Khối `trust`. */
  trust?: { titleKey: string; bodyKey: string };
  /**
   * Khối `featured`: tiêu đề + dòng phụ; nhãn nút Gọi / Nhắn tin của thẻ lớn và nhãn số ảnh (`photosKey` nhận {count}).
   */
  list?: { titleKey: string; subtitleKey?: string; callKey: string; chatKey: string; photosKey: string };
  /** Khối `promo`: mời đăng tin → trang đăng của mini-app chọn sẵn `category`. */
  promo?: { eyebrowKey: string; titleKey: string; bodyKey: string; ctaKey: string; category: ListingCategory };
  /**
   * Trang bộ lọc: tiêu đề khối danh mục (thiếu → listing.mini_app.filter.category_title), gợi ý khối vị trí (thiếu →
   * listing.mini_app.filter.location_hint; null = không có), khối bật / tắt thông số bool (`?has_ac=1`).
   */
  filter?: { categoryTitleKey?: string; locationHintKey?: string | null; toggles?: { titleKey: string; keys: readonly string[] } };
  /** Mẹo ở trang "Đã lưu" (thiếu → listing.tip.title + config.tipKey). */
  savedTip?: { titleKey: string; bodyKey: string };
  paths: MiniAppPaths;
};

/**
 * Khối của trang chi tiết tin (thay khối thông số + mô tả mặc định khi config.detail.sections có):
 * - `costs`: bảng 2×2 các khoản tiền của nhóm `costs` (ATTRIBUTE_GROUPS) trừ `exclude` (vd tháng cọc — đã ở cạnh giá);
 *   0 → `freeKey`
 * - `distance`: địa chỉ (address_text) + `nearest` khu gần nhất (toạ độ tin đã làm tròn ~300 m → site_locations, đường chim
 *   bay + phút xe máy — `valueKey`) + link bản đồ quanh toạ độ gần đúng (`mapKey`)
 * - `amenities`: lưới các thông số bool = true của nhóm `amenities`
 * - `attributes`: lưới thông số còn lại (không thuộc khối nào khác của trang)
 * - `description`: mô tả + thông số nhóm `group` (vd nội quy: giờ giấc, ở tối đa) dưới tiêu đề `titleKey`
 */
export type ListingDetailSection =
  | { kind: 'costs'; titleKey: string; freeKey: string; exclude?: readonly string[] }
  | { kind: 'distance'; titleKey: string; valueKey: string; mapKey: string; nearest: number }
  | { kind: 'amenities'; titleKey: string }
  | { kind: 'attributes' }
  | { kind: 'description'; titleKey: string; group?: AttributeGroupKey };

/** Khác biệt trang chi tiết theo tính năng (style Stitch "Chi tiết phòng trọ"). Thiếu = bố cục chung. */
export type ListingDetailDisplay = {
  sections?: readonly ListingDetailSection[];
  /** Nhãn tình trạng trên ảnh khi tin đang hiện (thiếu → listing.availability.<tính năng>). */
  activeStatusKey?: string;
  /** Huy hiệu người đăng (owner_badges) hiện thành nhãn riêng trên ảnh (vd landlord → listing.owner_badge.landlord). */
  ownerBadge?: string;
  /** Thẻ tóm tắt: chip khu + dòng `key` ("Cập nhật {time}" — updated_at) thay dòng mã tin. */
  updatedLine?: { key: string };
  /** Thông số số hiện dưới giá (vd deposit_months → "Cọc 1 tháng" — `key` nhận {count}). */
  priceNote?: { attribute: string; key: string };
  /** Nhãn nút liên hệ chính (thiếu → listing.contact.primary.<cta>_<tính năng>). */
  primaryLabelKey?: string;
  /** Tiêu đề khối người đăng (thiếu → listing.detail.posted_by) — vd "Thông tin chủ trọ". */
  posterTitleKey?: string;
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
  priceRanges?: readonly PriceRange[];
  /** Có ô "Sắp xếp" (?sort=price_asc | price_desc; mặc định mới nhất — không ghi lên URL). */
  sortable?: boolean;
  /** Trang chủ mini khi chưa lọc (thiếu = danh sách thường). Bị `miniApp` thay thế nếu có cả hai. */
  home?: ListingFeatureHome;
  /** Ô nhập giá tối thiểu / tối đa tuỳ ý ở trang bộ lọc (?price_min= / ?price_max=) — trang đó không cache, noindex. */
  customPrice?: boolean;
  /** Chạy dạng mini-app (điều hướng + header + trang con riêng). */
  miniApp?: ListingMiniApp;
  /** Khác biệt trang chi tiết tin. */
  detail?: ListingDetailDisplay;
};
