// Hình dạng config của một tính năng Listing (pass, room, job, lost-found) — quy tắc vàng: 4 tính năng dùng chung
// engine features/listing, khác nhau chỉ ở config.ts. Config không biểu diễn được điều cần → mở rộng type này
// + engine để mọi tính năng cùng hưởng (.claude/rules/mobile-features.md).
// Tuần 3: phần đọc (danh sách + chi tiết); tuần 4: `form` cho "Đăng nhanh" (engine form trong features/listing/form).
// Giao diện Stitch (L1): `subtitleKey` (dòng phụ header xanh), `quickFilters` (hàng chip lọc nhanh theo thông số),
// `tipKey` (mẹo an toàn riêng tính năng ở danh sách + chi tiết), `card.display` (điểm nhấn thẻ), `detail.primaryCta`.
// Stitch L3 (danh sách việc ca kíp / trọ / đồ thất lạc): `quickFilters` có thêm chip giá tối đa, `banner` (khối mời đăng tin
// mở thẳng form đúng danh mục), `card.display.owner | bookmark | description`.
// Giao diện Stitch (L2 — form đăng tin): `categoryIcons` (thẻ danh mục ở bước chọn), `form.primaryAttributes` (thông số lên
// bước Thông tin chính), `form.hiddenAttributes`, `form.photosTipKey` / `form.privacyNotice` (bước Ảnh), gợi ý chữ riêng.
// Trang chủ riêng của tính năng (Pass đồ kiểu "chợ đồ cũ"): `home` (lưới danh mục + banner + dải tin trước danh sách đầy đủ),
// filter 'price' (khoảng giá đặt sẵn `priceRanges`) + 'sort', chip lọc nhanh "Cho tặng" (`freeOnly`).
// Mini-app (Chợ Pass Đồ, Stitch "Sub-App Chợ Pass"): `miniApp` — route mini/[feature] có thanh tab riêng.
import type { ListingCategory, ListingFeature, ListingPriceRange, PriceType } from '@hp/shared';
import type { LucideIcon } from 'lucide-react-native';
import type { ListingCardDisplay, ListingCardLayout, ServiceKey } from '@/ui';

/**
 * subcategory: chip category con · site: chip chọn khu (sites) · distance: hàng chip "cách khu làm việc ≤ x km"
 * (maxDistanceM của search_listings — tin không có vị trí bị loại) · price: chip khoảng giá (`priceRanges` → priceMin /
 * priceMax) · sort: chip sắp xếp (LISTING_SORTS → p_sort). Phải nằm trong tập RPC search_listings hỗ trợ.
 */
export type ListingFilterKey = 'subcategory' | 'site' | 'distance' | 'price' | 'sort';

/** Cấu hình form "Đăng nhanh" — trường chi tiết lấy từ ATTRIBUTE_FIELDS[category] của @hp/shared (không khai báo lại). */
export type ListingFormConfig = {
  /** 'recommended': nhắc form.photos_required (không chặn đăng) · 'optional': không nhắc. */
  photos: 'recommended' | 'optional';
  /** Có ô hình thức giá + giá (job: lương nằm trong attributes; lostFound: không có giá). */
  price: boolean;
  /** price_type gửi lên khi form không có ô giá / giá trị mặc định. */
  defaultPriceType: PriceType;
  /** Số ảnh tối thiểu khi đăng / lưu tin (không chặn Lưu nháp), vd trọ LISTING_IMAGES.roomMin. Bỏ trống = không bắt buộc. */
  minPhotos?: number;
  /**
   * Khoá ATTRIBUTE_FIELDS hiện ở bước 2 (Thông tin chính, theo thứ tự) thay vì bước 3 — vd tình trạng đồ, loại đồ + nơi +
   * thời điểm mất / nhặt. Khoá không có trong category bị bỏ qua; lỗi của chúng nhảy về bước 2.
   */
  primaryAttributes?: readonly string[];
  /** Khoá ATTRIBUTE_FIELDS không hiện trong form (vd `returned` — chỉ đặt qua "Đã nhận lại đồ"); giá trị cũ vẫn giữ khi sửa. */
  hiddenAttributes?: readonly string[];
  /** Key i18n mẹo chụp ảnh dưới tiêu đề bước Ảnh. */
  photosTipKey?: string;
  /** Hộp cảnh báo "che số giấy tờ trước khi tải ảnh" ở bước Ảnh (đồ thất lạc). */
  privacyNotice?: boolean;
  /** Key i18n gợi ý ô tiêu đề / mô tả riêng (mặc định `form.title_hint` / `form.description_hint`). */
  titleHintKey?: string;
  descriptionHintKey?: string;
};

/**
 * Chip lọc nhanh: theo thông số (search_listings p_attributes — chỉ trường enum / bool của ATTRIBUTE_FIELDS), giá tối
 * đa (p_price_max, VND — vd trọ "Dưới 1 triệu/tháng"; nhãn riêng qua `labelKey`) hoặc chỉ đồ cho tặng (p_free_only —
 * Pass đồ "Cho tặng"). Khớp web `ListingQuickFilter`.
 */
export type ListingQuickFilter =
  | { key: string; value: string | boolean }
  | { priceMax: number; labelKey: string }
  | { freeOnly: true; labelKey: string };

/**
 * Một dải tin ở trang chủ riêng của tính năng: 'near' = tin của tính năng ở khu đang chọn của Hub ("Gần {khu}") ·
 * 'free' = đồ cho tặng (Xem tất cả → bật "Cho tặng") · 'category' = tin mới của một danh mục (Xem tất cả → chọn danh mục).
 */
export type ListingFeatureHomeRail =
  | { key: string; kind: 'near' }
  | { key: string; kind: 'free' }
  | { key: string; kind: 'category'; category: ListingCategory };

/**
 * Trang chủ riêng của tính năng (mini-app trong super app — Pass đồ kiểu chợ đồ cũ), hiện trên danh sách khi chưa tìm /
 * lọc: lưới danh mục (`categories` + `categoryIcons`, luôn có khi khai báo `home`) → banner theo placement → các dải tin →
 * "Tất cả tin {tính năng}". Bấm ô danh mục / "Xem tất cả" → áp bộ lọc ngay trên màn (khối trang chủ ẩn khi đang lọc).
 */
export type ListingFeatureHomeConfig = {
  /** banners.placement của tính năng (vd 'app_pass'); không có → không có khối banner. */
  bannerPlacement?: string;
  rails: readonly ListingFeatureHomeRail[];
};

/**
 * Mini-app riêng của tính năng (Pass đồ → "Chợ Pass Đồ"): bấm tính năng ở super app mở `mini/[feature]` có thanh tab
 * riêng (Trang chủ chợ · Đã lưu · [Đăng tin] · Chat · Quản lý tin) thay cho danh sách `listings/[feature]`. Engine:
 * features/listing/miniApp.ts + components/mini. Không khai báo → tính năng vẫn mở danh sách như cũ.
 */
export type ListingMiniAppConfig = {
  /** Key i18n tên mini-app (vd 'listing:mini_app.title.pass' — "Chợ Pass Đồ"). */
  titleKey: string;
  /** Key i18n dòng phụ dưới tên ở header trang chủ mini-app. */
  subtitleKey: string;
  /** Key i18n nhãn tab trang chủ + nút quay về trang chủ ở các tab khác (vd "Chợ Pass"). */
  homeTabKey: string;
  /** Icon ô vuông trước tên mini-app ở header (nền accent). */
  icon: LucideIcon;
  /** banners.placement của trang chủ mini-app (vd 'app_pass'); placement chưa có banner nào → khối "An tâm trao tay". */
  bannerPlacement: string;
  /** Số ô danh mục hiện trước ô "Cho tặng" + "Tất cả mục" ở lưới trang chủ (lưới 4 cột → 6 = 2 hàng). */
  homeCategoryCount: number;
};

/**
 * Khối mời đăng tin đầu danh sách (khi chưa lọc), mỗi nút mở thẳng form đúng danh mục (bắt đăng nhập trước).
 * 'actions': thẻ có dòng chữ + các nút chia đều (đồ thất lạc: "Báo nhặt được" / "Đăng tin tìm đồ") · 'strip': dải mỏng
 * chữ + một nút (trọ: "Bạn là chủ trọ? Đăng tin"). Khớp web `ListingListBanner`.
 */
export type ListingListBanner = {
  variant: 'actions' | 'strip';
  /** Key i18n dòng chữ của khối. */
  textKey: string;
  actions: readonly { labelKey: string; category: ListingCategory; icon?: LucideIcon }[];
};

/** Khối thêm ở màn chi tiết. */
export type ListingDetailConfig = {
  /** "Tin có thể khớp" (useLostFoundMatches) + "Đã nhận lại đồ" (attributes.returned + đóng tin) — đồ thất lạc. */
  lostFound?: boolean;
  /**
   * Nút chính của thanh liên hệ dính đáy: 'chat' (mặc định — Nhắn tin nền primary, Hiện số / Gọi viền) hoặc 'call'
   * (Hiện số / Gọi là nút chính — trọ, đồ thất lạc cần gọi nhanh). Số chỉ lộ qua reveal_contact sau đăng nhập.
   */
  primaryCta?: 'chat' | 'call';
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
  /** Key i18n dòng phụ dưới tiêu đề ở header xanh màn danh sách. */
  subtitleKey?: string;
  /** Key i18n mẹo an toàn riêng (đầu danh sách + chi tiết); thiếu → `listing:detail.safety_tip`. */
  tipKey?: string;
  /** Icon Lucide của từng danh mục ở bước chọn danh mục (thiếu → icon dịch vụ). Gợi ý: `listing:form.category_hint.<code>`. */
  categoryIcons?: Partial<Record<ListingCategory, LucideIcon>>;
  /** Chip lọc nhanh theo thông số (bật / tắt từng chip, ghép AND) — hàng thứ hai dưới chip danh mục. */
  quickFilters?: readonly ListingQuickFilter[];
  /** Khối mời đăng tin đầu danh sách (sau `header`, trước mẹo an toàn). */
  banner?: ListingListBanner;
  card: {
    /** Prop `layout` của ListingCard: 'grid' = lưới 2 cột, 'row' = một cột ảnh vuông bên trái. */
    variant: ListingCardLayout;
    /** Chiều cao ước lượng một hàng (px) — tính ngưỡng tải trang tiếp khi còn ~5 item (FlashList v2 tự đo item). */
    estimatedHeight: number;
    /** Điểm nhấn thẻ (nhãn thông số, badge danh mục, nơi / thời điểm) — prop `display` của ListingCard. */
    display?: ListingCardDisplay;
  };
  /** Bộ lọc trên màn danh sách, theo thứ tự hiển thị. Thêm filter (price, condition, radius, sort…) → thêm mã ở đây + engine. */
  filters: readonly ListingFilterKey[];
  /** Mốc của filter 'distance' (km, tăng dần) — mặc định DISTANCE_OPTIONS_KM của engine. */
  distanceOptionsKm?: readonly number[];
  /** Khoảng giá của filter 'price' (VND, nhãn `listing:price_range.<key>`) — vd PASS_PRICE_RANGES của @hp/shared. */
  priceRanges?: readonly ListingPriceRange[];
  /** Trang chủ riêng của tính năng (lưới danh mục, banner, dải tin) trên danh sách khi chưa lọc. */
  home?: ListingFeatureHomeConfig;
  /** Mini-app riêng có thanh tab (thay danh sách `listings/[feature]`). */
  miniApp?: ListingMiniAppConfig;
  /** Khối riêng ở chi tiết (chủ tin). */
  detail?: ListingDetailConfig;
  /** Form đăng tin; không có ở danh sách tổng hợp 'all'. */
  form?: ListingFormConfig;
};
