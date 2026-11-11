// @hp/tokens — nguồn duy nhất của token thiết kế cho app (NativeWind + useTheme) và web (Tailwind v4).
// Giá trị: apps/mobile/CLAUDE.md mục 5, docs/ARCHITECTURE.md mục 9.1 / 9.5 / 9.9.
// Đổi giá trị ở đây rồi chạy `pnpm --filter @hp/tokens build` để sinh lại theme.css (CI kiểm tra file đã cập nhật).
// Hex chỉ được phép xuất hiện trong file này.

export const colors = {
  light: {
    primary: '#0B4A9C',
    primaryLight: '#E6EFFA',
    /** Cam (nút Đăng, nhãn "Mới", số chưa đọc, banner). Chỉ làm NỀN với chữ / icon on-accent (trắng); không dùng làm màu chữ trên nền sáng (~3,6:1). */
    accent: '#EA580C',
    success: '#1E9E5A',
    warning: '#E0A100',
    danger: '#D93025',
    bg: '#F8FAFC',
    surface: '#FFFFFF',
    surface2: '#F1F5F9',
    border: '#E2E8F0',
    text: '#111827',
    /** Slate đậm hơn #64748B một bậc để đạt ≥ 4,5:1 cả trên surface2. */
    textMuted: '#5B6B82',
    textDisabled: '#94A3B8',
    onPrimary: '#FFFFFF',
    /** Chữ trên nền accent: trắng (~3,6:1 — đạt AA cho chữ lớn / đậm và icon; chữ nhỏ trên cam nên đậm). */
    onAccent: '#FFFFFF',
  },
  dark: {
    primary: '#5B9BE6',
    primaryLight: '#15283F',
    /** Cùng cam với light để chữ trắng trên cam vẫn đọc được (cam sáng #FB923C + trắng chỉ ~2,3:1). */
    accent: '#EA580C',
    success: '#3CBF78',
    warning: '#F0B429',
    danger: '#F05252',
    bg: '#0B1120',
    surface: '#131B2B',
    surface2: '#1C2537',
    border: '#273247',
    text: '#F1F5F9',
    textMuted: '#94A3B8',
    textDisabled: '#64748B',
    onPrimary: '#0B1120',
    onAccent: '#FFFFFF',
  },
} as const;

export type ColorScheme = keyof typeof colors;
export type ColorToken = keyof (typeof colors)['light'];

/**
 * Màu nhận diện dịch vụ — tông dịu: nền nhạt (`soft`) cho ô ServiceTile / chip, màu đậm vừa (`fg`) cho icon, chấm màu.
 * Đã chọn 2026-10-30. Tương phản fg / soft ≥ 3:1 (WCAG 1.4.11, thành phần đồ hoạ) ở cả light và dark.
 * Chữ nhãn dịch vụ luôn dùng text-fg (không dùng màu dịch vụ cho chữ).
 */
export const serviceColors = {
  light: {
    pass: { fg: '#D9692E', soft: '#FDF0E6' },      // cam đất
    room: { fg: '#7C5CC4', soft: '#F2EEFB' },      // tím oải hương
    job: { fg: '#2E9461', soft: '#E8F5EE' },       // xanh lá dịu
    ride: { fg: '#1B8A86', soft: '#E4F4F3' },      // xanh ngọc
    sport: { fg: '#D2555A', soft: '#FCECEC' },     // đỏ san hô
    lostFound: { fg: '#A87A00', soft: '#FBF3D9' }, // vàng mật ong
  },
  dark: {
    pass: { fg: '#F0A070', soft: '#3A2A20' },
    room: { fg: '#B39DEB', soft: '#2C2640' },
    job: { fg: '#6CC79A', soft: '#1E3229' },
    ride: { fg: '#5FC4BF', soft: '#1A3332' },
    sport: { fg: '#EE8A8D', soft: '#3A2224' },
    lostFound: { fg: '#E6BE55', soft: '#3A3220' },
  },
} as const;
export type ServiceKey = keyof (typeof serviceColors)['light'];

/** Gradient header trang chủ / thương hiệu. */
export const gradients = {
  brand: ['#0B4A9C', '#1E6FD9'],
} as const;

/** Thang 4. Padding màn hình = 4 (16), khoảng cách card = 3 (12). */
export const space = { 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32 } as const;

/** sm input / badge vuông · md nút, ảnh thumbnail · lg card, sheet · xl header, khối lớn · full chip, pill. */
export const radius = { sm: 8, md: 12, lg: 16, xl: 24, full: 999 } as const;

export const font = {
  size: { xs: 12, sm: 14, md: 16, lg: 18, xl: 20, '2xl': 24, '3xl': 28 },
  /** line-height = size × 1,4 */
  lineHeightRatio: 1.4,
  weight: { body: '400', label: '500', heading: '600', price: '700' },
  family: {
    regular: 'BeVietnamPro_400Regular',
    medium: 'BeVietnamPro_500Medium',
    semibold: 'BeVietnamPro_600SemiBold',
    bold: 'BeVietnamPro_700Bold',
    zh: 'NotoSansSC',
  },
} as const;

/** Bóng tông slate, 1 lớp (React Native không vẽ được nhiều lớp). Chỉ card, thanh nổi và FAB có bóng. */
export const shadow = {
  /** Card / khối nội dung: bóng toả rộng, rất nhạt. */
  card: { x: 0, y: 2, blur: 8, color: 'rgba(15,23,42,0.06)' },
  /** Thanh nổi (tab dưới, thanh CTA dính đáy): bóng hắt lên trên. */
  bar: { x: 0, y: -2, blur: 10, color: 'rgba(15,23,42,0.06)' },
  /** Nút Đăng nổi màu accent: quầng cam. */
  fab: { x: 0, y: 6, blur: 16, color: 'rgba(234,88,12,0.35)' },
} as const;

/**
 * Dải sáng quét qua skeleton (app + web): màu giữa của gradient trong suốt → màu này → trong suốt, đặt trên nền surface2.
 * rgba vì dải phải mờ dần hai mép; light: trắng sáng lên trên slate nhạt, dark: slate nhạt hắt lên trên nền tối.
 */
export const shimmer = {
  light: 'rgba(255,255,255,0.7)',
  dark: 'rgba(148,163,184,0.14)',
} as const;

const SKELETON_SHIMMER_MS = 1200;

export const motion = {
  instant: { duration: 100, easing: 'ease-out' },
  fast: { duration: 200, easing: 'ease-out' },
  base: { duration: 280, easing: 'spring', damping: 18, stiffness: 180 },
  slow: { duration: 400, easing: 'ease-in-out' },
  /** Thay mọi chuyển động khi bật Reduce Motion. */
  reduced: { duration: 150, easing: 'ease-out' },
  /** Item danh sách hiện lần lượt. */
  stagger: { delay: 30, maxItems: 8, translateY: 8 },
  skeletonShimmerMs: SKELETON_SHIMMER_MS,
  /**
   * Skeleton: dải sáng chéo quét trái → phải, một lượt = skeletonShimmerMs. `band` = bề rộng dải / bề rộng khối,
   * `skewDeg` = độ nghiêng dải. Reduce Motion → khối đứng yên, không dải.
   */
  shimmer: { duration: SKELETON_SHIMMER_MS, easing: 'ease-in-out', band: 0.4, skewDeg: -20 },
  /**
   * Chuyển động nền lặp vô hạn, nhịp chậm — CHỈ nút Đăng (`glow`: quầng shadow-fab sáng dần + phóng ≤ 1.04) và nhãn "Mới"
   * (`float`: nổi lên `translateY` px rồi về). `duration` = một chu kỳ đi + về. Reduce Motion → tắt hẳn (không fade thay thế).
   */
  ambient: {
    glow: { duration: 2800, easing: 'ease-in-out', scale: 1.04 },
    float: { duration: 2400, easing: 'ease-in-out', translateY: -3 },
  },
  /** Vòng lan quanh dấu tích thành công: chạy MỘT lần (sau `delay`), phóng 1 → `scale`, mờ `opacity` → 0. Reduce Motion → không vòng. */
  ripple: { duration: 900, delay: 200, easing: 'ease-out', scale: 1.6, opacity: 0.5 },
} as const;

/** Tỉ lệ khung ảnh: thẻ tin 4:3, avatar 1:1, banner Hub 16:7 (class `aspect-card`, `aspect-avatar`, `aspect-banner` ở app và web). */
export const aspect = { card: '4 / 3', avatar: '1 / 1', banner: '16 / 7' } as const;

/** Vùng chạm tối thiểu. */
export const hitTarget = { primary: 48, secondary: 44 } as const;

/** Kích thước icon Lucide. */
export const icon = { button: 20, tab: 24, strokeWidth: 1.75 } as const;

export const tokens = { colors, serviceColors, gradients, space, radius, font, shadow, shimmer, motion, aspect, hitTarget, icon } as const;
export type Tokens = typeof tokens;
