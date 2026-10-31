// @hp/tokens — nguồn duy nhất của token thiết kế cho app (NativeWind + useTheme) và web (Tailwind v4).
// Giá trị: apps/mobile/CLAUDE.md mục 5, docs/ARCHITECTURE.md mục 9.1 / 9.5 / 9.9.
// Đổi giá trị ở đây rồi chạy `pnpm --filter @hp/tokens build` để sinh lại theme.css (CI kiểm tra file đã cập nhật).
// Hex chỉ được phép xuất hiện trong file này.

export const colors = {
  light: {
    primary: '#0B4F9C',
    primaryLight: '#E6EFFA',
    accent: '#F2762E',
    success: '#1E9E5A',
    warning: '#E0A100',
    danger: '#D93025',
    bg: '#F6F7F9',
    surface: '#FFFFFF',
    surface2: '#EEF0F3',
    border: '#E2E5EA',
    text: '#111827',
    textMuted: '#6B7280',
    textDisabled: '#9CA3AF',
    onPrimary: '#FFFFFF',
    /** Chữ trên nút cam (Đăng tin): chữ trắng trên accent chỉ ~2,9:1, chữ tối đạt ≥ 4,5:1. */
    onAccent: '#111827',
  },
  dark: {
    primary: '#5B9BE6',
    primaryLight: '#15283F',
    accent: '#F58A4C',
    success: '#3CBF78',
    warning: '#F0B429',
    danger: '#F05252',
    bg: '#0F1115',
    surface: '#171A20',
    surface2: '#1F232B',
    border: '#2A2F38',
    text: '#F3F4F6',
    textMuted: '#9CA3AF',
    textDisabled: '#6B7280',
    onPrimary: '#0F1115',
    onAccent: '#0F1115',
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
  brand: ['#0B4F9C', '#1E6FD9'],
} as const;

/** Thang 4. Padding màn hình = 4 (16), khoảng cách card = 3 (12). */
export const space = { 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32 } as const;

/** sm input · md card · lg sheet · xl · full chip. */
export const radius = { sm: 6, md: 10, lg: 14, xl: 20, full: 999 } as const;

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

export const shadow = {
  /** Chỉ card và FAB có bóng: 0 1 3 rgba(0,0,0,0.06). */
  card: { x: 0, y: 1, blur: 3, color: 'rgba(0,0,0,0.06)' },
} as const;

export const motion = {
  instant: { duration: 100, easing: 'ease-out' },
  fast: { duration: 200, easing: 'ease-out' },
  base: { duration: 280, easing: 'spring', damping: 18, stiffness: 180 },
  slow: { duration: 400, easing: 'ease-in-out' },
  /** Thay mọi chuyển động khi bật Reduce Motion. */
  reduced: { duration: 150, easing: 'ease-out' },
  /** Item danh sách hiện lần lượt. */
  stagger: { delay: 30, maxItems: 8, translateY: 8 },
  skeletonShimmerMs: 1200,
} as const;

/** Tỉ lệ khung ảnh: thẻ tin 4:3, avatar 1:1 (class `aspect-card`, `aspect-avatar` ở app và web). */
export const aspect = { card: '4 / 3', avatar: '1 / 1' } as const;

/** Vùng chạm tối thiểu. */
export const hitTarget = { primary: 48, secondary: 44 } as const;

/** Kích thước icon Lucide. */
export const icon = { button: 20, tab: 24, strokeWidth: 1.75 } as const;

export const tokens = { colors, serviceColors, gradients, space, radius, font, shadow, motion, aspect, hitTarget, icon } as const;
export type Tokens = typeof tokens;
