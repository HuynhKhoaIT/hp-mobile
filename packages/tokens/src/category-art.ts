// Hình minh hoạ danh mục (phẳng, nhiều màu, lưới 48×48) — dùng chung app (react-native-svg) và web (<svg>).
// Là dữ liệu hình thuần (rect / circle / path), không phụ thuộc React hay React Native; mỗi nền tảng tự vẽ bằng
// `CategoryArt` của mình. Mã màu minh hoạ nằm ở đây (gói tokens là nơi duy nhất được chứa hex); màu giao diện vẫn là token.
// Danh mục chưa có hình → `getCategoryArt` trả undefined và nơi gọi giữ icon Lucide cũ.
export const CATEGORY_ART_SIZE = 48;

export type ArtShape =
  | { readonly t: 'rect'; readonly x: number; readonly y: number; readonly w: number; readonly h: number; readonly rx: number; readonly fill: string; readonly o?: number }
  | { readonly t: 'circle'; readonly cx: number; readonly cy: number; readonly r: number; readonly fill: string; readonly o?: number }
  /** Có `stroke` → nét bo tròn (không tô); không → tô `fill`. */
  | { readonly t: 'path'; readonly d: string; readonly fill?: string; readonly stroke?: string; readonly sw?: number; readonly o?: number };

export type CategoryArt = {
  /** Nền ô ở giao diện sáng / tối. */
  readonly tint: { readonly light: string; readonly dark: string };
  readonly shapes: readonly ArtShape[];
};

const rect = (x: number, y: number, w: number, h: number, rx: number, fill: string, o?: number): ArtShape => ({ t: 'rect', x, y, w, h, rx, fill, o });
const circle = (cx: number, cy: number, r: number, fill: string, o?: number): ArtShape => ({ t: 'circle', cx, cy, r, fill, o });
const fillPath = (d: string, fill: string, o?: number): ArtShape => ({ t: 'path', d, fill, o });
const strokePath = (d: string, stroke: string, sw: number, o?: number): ArtShape => ({ t: 'path', d, stroke, sw, o });

export const CATEGORY_ART: Readonly<Record<string, CategoryArt>> = {
  // Điện thoại
  pass_electronics: {
    tint: { light: '#DBEAFE', dark: 'rgba(59,130,246,.22)' },
    shapes: [
      rect(13, 4, 22, 40, 5.5, '#1D4ED8'),
      rect(16, 8, 16, 32, 2.5, '#60A5FA'),
      fillPath('M16 10.5Q16 8 18.5 8H25L16 21Z', '#FFFFFF', 0.35),
      circle(24, 22, 5, '#FFFFFF', 0.95),
      rect(19, 31, 10, 2.5, 1.25, '#FFFFFF', 0.85),
      circle(24, 6, 1, '#93C5FD'),
      rect(35, 14, 1.6, 6, 0.8, '#1E40AF'),
    ],
  },
  // Xe tay ga
  pass_vehicle: {
    tint: { light: '#FFEDD5', dark: 'rgba(253,186,116,.34)' },
    shapes: [
      circle(12, 35, 6.5, '#1F2937'),
      circle(12, 35, 2.6, '#E2E8F0'),
      circle(38, 35, 6.5, '#1F2937'),
      circle(38, 35, 2.6, '#E2E8F0'),
      fillPath('M4 27Q4 20 11 20H23Q27 20 27 24V31H12Q4 31 4 27Z', '#F97316'),
      strokePath('M9 24H20', '#FDBA74', 2),
      fillPath('M7 18Q7 14.5 11 14.5H23Q26 14.5 26 17.5V20H7Z', '#7C2D12'),
      rect(25, 30, 11, 3.5, 1.75, '#C2410C'),
      fillPath('M28 31L31.5 13H36L34.5 31Z', '#F97316'),
      strokePath('M35.5 22L38 35', '#1F2937', 3),
      strokePath('M31 11H38', '#1F2937', 3),
      circle(39, 17, 2.6, '#FDE68A'),
      rect(3.5, 22, 2.2, 3.2, 1, '#EF4444'),
    ],
  },
  // Tủ lạnh
  pass_appliance: {
    tint: { light: '#CCFBF1', dark: 'rgba(20,184,166,.22)' },
    shapes: [
      rect(12, 4, 24, 40, 5, '#0F766E'),
      fillPath('M12 19V9Q12 4 17 4H31Q36 4 36 9V19Z', '#99F6E4'),
      fillPath('M12 21H36V39Q36 44 31 44H17Q12 44 12 39Z', '#5EEAD4'),
      rect(15.5, 9.5, 2.5, 6, 1.25, '#0F766E'),
      rect(15.5, 25, 2.5, 10, 1.25, '#0F766E'),
      rect(30, 8, 2, 7, 1, '#FFFFFF', 0.6),
      rect(30, 24, 2, 12, 1, '#FFFFFF', 0.5),
      rect(15, 44, 4, 2.5, 1, '#134E4A'),
      rect(29, 44, 4, 2.5, 1, '#134E4A'),
    ],
  },
  // Sofa
  pass_home: {
    tint: { light: '#EDE9FE', dark: 'rgba(139,92,246,.24)' },
    shapes: [
      rect(8, 37, 3.5, 6, 1.4, '#4C1D95'),
      rect(36.5, 37, 3.5, 6, 1.4, '#4C1D95'),
      rect(9, 8, 30, 22, 6, '#6D28D9'),
      rect(12, 11.5, 11.5, 13.5, 3.5, '#8B5CF6'),
      rect(24.5, 11.5, 11.5, 13.5, 3.5, '#8B5CF6'),
      rect(9, 24, 30, 13.5, 4, '#A78BFA'),
      strokePath('M24 25.5V36', '#8B5CF6', 1.6),
      rect(3, 19, 9.5, 20, 4.75, '#7C3AED'),
      rect(35.5, 19, 9.5, 20, 4.75, '#7C3AED'),
      strokePath('M6.5 24V30', '#C4B5FD', 1.8),
    ],
  },
  // Áo thun
  pass_fashion: {
    tint: { light: '#FCE7F3', dark: 'rgba(236,72,153,.22)' },
    shapes: [
      fillPath('M17 6L8 11L3.5 19.5L11 23.5L14 20.5V41Q14 42.5 15.5 42.5H32.5Q34 42.5 34 41V20.5L37 23.5L44.5 19.5L40 11L31 6Q28 11 24 11Q20 11 17 6Z', '#EC4899'),
      fillPath('M17 6Q20 12.5 24 12.5Q28 12.5 31 6L28.6 5Q27 9.5 24 9.5Q21 9.5 19.4 5Z', '#9D174D'),
      fillPath('M14 20.5L11 23.5L3.5 19.5L8 11L10.6 9.6Z', '#F472B6'),
      rect(25.5, 23, 6, 6, 1.5, '#F9A8D4'),
      strokePath('M17.5 17V36', '#F9A8D4', 2, 0.7),
    ],
  },
  // Tạ tay
  pass_sport: {
    tint: { light: '#DCFCE7', dark: 'rgba(34,197,94,.20)' },
    shapes: [
      rect(15, 20.5, 18, 7, 3.5, '#CBD5E1'),
      rect(21, 20.5, 2, 7, 0, '#94A3B8'),
      rect(25, 20.5, 2, 7, 0, '#94A3B8'),
      rect(9, 8, 8, 32, 3.5, '#16A34A'),
      rect(3, 14, 7.5, 20, 3, '#22C55E'),
      rect(31, 8, 8, 32, 3.5, '#16A34A'),
      rect(37.5, 14, 7.5, 20, 3, '#22C55E'),
      rect(11.2, 11, 2, 10, 1, '#86EFAC'),
      rect(33.2, 11, 2, 10, 1, '#86EFAC'),
    ],
  },
  // Hộp đồ nghề
  pass_tools: {
    tint: { light: '#FEF3C7', dark: 'rgba(252,211,77,.32)' },
    shapes: [
      strokePath('M17 19V13Q17 9.5 20.5 9.5H27.5Q31 9.5 31 13V19', '#78350F', 3.6),
      fillPath('M5 27H43V38Q43 42.5 38.5 42.5H9.5Q5 42.5 5 38Z', '#D97706'),
      fillPath('M5 27V22.5Q5 18 9.5 18H38.5Q43 18 43 22.5V27Z', '#FBBF24'),
      rect(19.5, 23, 9, 8, 2.4, '#FEF3C7'),
      circle(24, 27, 1.6, '#92400E'),
      strokePath('M9.5 22H17', '#FEF08A', 2),
      rect(8, 38, 5, 2, 1, '#92400E', 0.45),
      rect(35, 38, 5, 2, 1, '#92400E', 0.45),
    ],
  },
  // Bình sữa
  pass_baby: {
    tint: { light: '#CFFAFE', dark: 'rgba(6,182,212,.22)' },
    shapes: [
      fillPath('M20.5 9.5L21 5.5Q24 2 27 5.5L27.5 9.5Z', '#FDE68A'),
      rect(15.5, 9, 17, 5.5, 2.75, '#0891B2'),
      rect(14, 14, 20, 30, 5.5, '#FFFFFF'),
      fillPath('M14 27H34V38.5Q34 44 28.5 44H19.5Q14 44 14 38.5Z', '#22D3EE'),
      rect(26, 18, 5, 2, 1, '#67E8F9'),
      rect(26, 22.5, 5, 2, 1, '#67E8F9'),
      fillPath('M24 37.2c-3-2-4.2-3.4-4.2-4.8a2.1 2.1 0 0 1 4.2-.4a2.1 2.1 0 0 1 4.2.4c0 1.4-1.2 2.8-4.2 4.8Z', '#FFFFFF', 0.9),
    ],
  },
  // Mũ bảo hộ
  pass_ppe: {
    tint: { light: '#FEF9C3', dark: 'rgba(234,179,8,.22)' },
    shapes: [
      fillPath('M7.5 32C7.5 18 15 11 24 11C33 11 40.5 18 40.5 32Z', '#FACC15'),
      rect(20.5, 8.5, 7, 23.5, 3.5, '#EAB308'),
      strokePath('M12.5 27C12.5 21 15.5 17 19 15', '#FEF08A', 2.6),
      rect(3.5, 31, 41, 7.5, 3.75, '#CA8A04'),
      rect(8, 33, 14, 2, 1, '#FDE047', 0.7),
    ],
  },
  // Thùng hàng
  pass_other: {
    tint: { light: '#E2E8F0', dark: 'rgba(148,163,184,.22)' },
    shapes: [
      fillPath('M24 7L40 16V34L24 43L8 34V16Z', '#94A3B8'),
      fillPath('M24 7L40 16L24 25L8 16Z', '#CBD5E1'),
      fillPath('M24 25L40 16V34L24 43Z', '#64748B'),
      fillPath('M19 9.8L35 18.8L29 22.2L13 13.2Z', '#FBBF24'),
      fillPath('M14 21.5L19 24.3V29.2L14 26.4Z', '#FFFFFF', 0.28),
    ],
  },
};

/** Hình của một mã danh mục (`pass_vehicle`…); chưa có → undefined (giữ icon Lucide). */
export function getCategoryArt(category: string): CategoryArt | undefined {
  return CATEGORY_ART[category];
}
