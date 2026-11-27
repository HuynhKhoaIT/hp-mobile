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

// ── Chiều sâu (gradient + bóng loáng) ──────────────────────────────────────────────────────────────────────
// Hình là khối phẳng; để bớt "giả" mỗi khối tô màu được vẽ bằng gradient dọc: đầu sáng hơn, đáy tối hơn màu gốc
// (tính từ chính màu tô — không phải sửa từng hình). Mỗi màu tô dùng một gradient chung trong ô; id theo mã danh mục nên
// nhiều bản vẽ cùng mã trên một trang cho cùng định nghĩa (vô hại). Nền ô có thêm lớp bóng loáng ở nửa trên.
const DEPTH_LIGHTEN = 0.24;
const DEPTH_DARKEN = 0.16;

const mixHex = (hex: string, to: number, amount: number): string => {
  const n = parseInt(hex.slice(1), 16);
  const ch = (shift: number) => {
    const c = (n >> shift) & 255;
    return Math.round(c + (to - c) * amount)
      .toString(16)
      .padStart(2, '0');
  };
  return `#${ch(16)}${ch(8)}${ch(0)}`;
};

/** Hai đầu gradient dọc (trên, dưới) của một màu tô `#RRGGBB`; màu dạng khác → undefined (tô phẳng). */
export function depthStops(fill: string): readonly [string, string] | undefined {
  if (!/^#[0-9a-fA-F]{6}$/.test(fill)) return undefined;
  return [mixHex(fill, 255, DEPTH_LIGHTEN), mixHex(fill, 0, DEPTH_DARKEN)];
}

/** Các màu tô (không trùng, theo thứ tự xuất hiện) cần gradient trong một hình. */
export function artFills(art: CategoryArt): readonly string[] {
  const seen: string[] = [];
  for (const s of art.shapes) {
    if (s.t === 'path' && s.stroke) continue;
    if (s.fill !== undefined && depthStops(s.fill) && !seen.includes(s.fill)) seen.push(s.fill);
  }
  return seen;
}

/** Id gradient của màu thứ `index` trong `artFills`. */
export const artGradientId = (category: string, index: number): string => `ca-${category}-${index}`;
/** Id gradient bóng loáng của nền ô. */
export const artGlossId = (category: string): string => `ca-${category}-gloss`;
/** Độ đậm vệt bóng loáng ở đầu nền ô (sáng / tối). */
export const ART_GLOSS_OPACITY = { light: 0.55, dark: 0.12 } as const;

/** Mã hình của ô dịch vụ ở Hub (`service_pass`, `service_goiTho`…) — cùng kho với danh mục. */
export const serviceArtKey = (service: string): string => `service_${service}`;

/** Mã hình của một loại thợ Gọi thợ (`trade_electric_plumbing`, `trade_hvac`…). */
export const tradeArtKey = (trade: string): string => `trade_${trade}`;

// Hình dùng ở hai nơi (ô dịch vụ + danh mục con) viết một lần.
const BRIEFCASE: readonly ArtShape[] = [
  strokePath('M18 15V12Q18 9 21 9H27Q30 9 30 12V15', '#15803D', 3.2),
  rect(5, 15, 38, 27, 5, '#16A34A'),
  fillPath('M5 25H43V20Q43 15 38 15H10Q5 15 5 20Z', '#22C55E'),
  rect(5, 30, 38, 1.6, 0.8, '#15803D', 0.7),
  rect(19.5, 22.5, 9, 7, 2.2, '#FEF08A'),
  circle(24, 26, 1.3, '#A16207'),
];

const HOUSE: readonly ArtShape[] = [
  rect(32, 8, 6, 12, 1.5, '#4C1D95'),
  rect(8, 21, 32, 22, 3, '#C4B5FD'),
  fillPath('M24 4L46 23H2Z', '#6D28D9'),
  strokePath('M9 21L24 8.5', '#A78BFA', 2, 0.8),
  rect(20, 29, 9, 14, 2.5, '#6D28D9'),
  circle(26.5, 36.5, 0.9, '#FDE68A'),
  rect(11, 26, 6, 6, 1.5, '#EDE9FE'),
  rect(31, 26, 6, 6, 1.5, '#EDE9FE'),
];

/** Lưới cửa sổ 3 × 3 của toà căn hộ; xen kẽ ô sáng đèn. */
const APARTMENT_WINDOWS: readonly ArtShape[] = [10, 18, 26].flatMap((y, row) =>
  [14.5, 21.5, 28.5].map((x, col) => rect(x, y, 5, 5, 1, (row + col) % 2 === 0 ? '#FDE68A' : '#EDE9FE')),
);

/** Ví + huy hiệu góc: `lost` dấu hỏi đỏ, `found` dấu tích xanh. */
const walletWith = (badge: readonly ArtShape[]): readonly ArtShape[] => [
  rect(5, 15, 36, 27, 5, '#D97706'),
  fillPath('M5 20Q5 15 10 15H36Q41 15 41 20V23H5Z', '#FBBF24'),
  rect(30, 28, 14, 9, 4.5, '#92400E'),
  circle(36, 32.5, 1.8, '#FDE68A'),
  ...badge,
];

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

  // ── Tìm trọ ──────────────────────────────────────────────────────────────────────────────────────────────
  // Phòng cho thuê: cửa phòng + chìa khoá
  room_rent: {
    tint: { light: '#EDE9FE', dark: 'rgba(139,92,246,.24)' },
    shapes: [
      rect(7, 5, 25, 38, 3, '#6D28D9'),
      rect(11, 9, 17, 34, 2, '#8B5CF6'),
      rect(14.5, 13, 10, 8, 2, '#C4B5FD'),
      circle(25, 27, 1.8, '#FDE68A'),
      circle(38, 16, 5.2, '#FBBF24'),
      circle(38, 16, 2, '#EDE9FE'),
      strokePath('M38 21V38', '#FBBF24', 3),
      strokePath('M38 31H42.5', '#F59E0B', 3),
      strokePath('M38 36.5H42.5', '#F59E0B', 3),
    ],
  },
  // Ở ghép: giường hai gối
  room_share: {
    tint: { light: '#EDE9FE', dark: 'rgba(139,92,246,.24)' },
    shapes: [
      rect(3, 10, 5, 31, 2.5, '#4C1D95'),
      rect(3, 37, 42, 4, 2, '#5B21B6'),
      rect(8, 27, 37, 11, 4, '#8B5CF6'),
      rect(8, 22, 37, 8, 4, '#C4B5FD'),
      rect(11, 17, 12, 7.5, 3.5, '#EDE9FE'),
      rect(25, 17, 12, 7.5, 3.5, '#EDE9FE'),
      strokePath('M13 33H40', '#A78BFA', 1.8, 0.8),
    ],
  },
  // Nhà nguyên căn: nhà + cây
  room_house: {
    tint: { light: '#EDE9FE', dark: 'rgba(139,92,246,.24)' },
    shapes: [
      rect(3, 22, 30, 21, 3, '#C4B5FD'),
      fillPath('M18 5L36 22H0Z', '#6D28D9'),
      rect(13, 30, 8, 13, 2.5, '#6D28D9'),
      rect(6, 27, 5, 5, 1.3, '#EDE9FE'),
      rect(25, 27, 5, 5, 1.3, '#EDE9FE'),
      rect(38.5, 30, 3.2, 13, 1.2, '#78350F'),
      circle(40, 24.5, 6.8, '#22C55E'),
      circle(36.8, 29, 4.2, '#16A34A'),
      strokePath('M2 44H46', '#A78BFA', 1.8, 0.9),
    ],
  },
  // Căn hộ / KTX: toà nhà
  room_apartment: {
    tint: { light: '#EDE9FE', dark: 'rgba(139,92,246,.24)' },
    shapes: [
      rect(3, 22, 9, 21, 2.5, '#8B5CF6'),
      rect(36, 16, 9, 27, 2.5, '#8B5CF6'),
      rect(11, 5, 26, 38, 3, '#6D28D9'),
      ...APARTMENT_WINDOWS,
      rect(20, 34, 8, 9, 2, '#C4B5FD'),
      rect(5.5, 27, 3.5, 3.5, 0.9, '#EDE9FE'),
      rect(38.5, 22, 3.5, 3.5, 0.9, '#EDE9FE'),
      rect(38.5, 29, 3.5, 3.5, 0.9, '#EDE9FE'),
    ],
  },

  // ── Tìm việc ─────────────────────────────────────────────────────────────────────────────────────────────
  // Việc chính: cặp tài liệu
  job_main: { tint: { light: '#DCFCE7', dark: 'rgba(34,197,94,.20)' }, shapes: BRIEFCASE },
  // Làm thêm ngoài ca: đồng hồ + đồng xu
  job_parttime: {
    tint: { light: '#DCFCE7', dark: 'rgba(34,197,94,.20)' },
    shapes: [
      circle(21, 24, 16.5, '#16A34A'),
      circle(21, 24, 12.8, '#F0FDF4'),
      strokePath('M21 15.5V24.5L27.5 28', '#15803D', 2.6),
      circle(21, 24, 1.5, '#15803D'),
      circle(37, 35, 9, '#F59E0B'),
      circle(37, 35, 6.4, '#FBBF24'),
      strokePath('M33.2 34Q34.2 31.4 37 31', '#FEF3C7', 1.8, 0.95),
      circle(37, 36.5, 1.6, '#B45309', 0.8),
    ],
  },

  // ── Đồ thất lạc ──────────────────────────────────────────────────────────────────────────────────────────
  lost: {
    tint: { light: '#FEF3C7', dark: 'rgba(252,211,77,.32)' },
    shapes: walletWith([
      circle(36, 12, 8.5, '#EF4444'),
      strokePath('M33.3 10.4Q33.3 7.8 36 7.8Q38.7 7.8 38.7 10.1Q38.7 11.8 36 12.9V13.6', '#FFFFFF', 1.9),
      circle(36, 16.8, 1.1, '#FFFFFF'),
    ]),
  },
  found: {
    tint: { light: '#FEF3C7', dark: 'rgba(252,211,77,.32)' },
    shapes: walletWith([circle(36, 12, 8.5, '#22C55E'), strokePath('M32.2 12.4L35 15.2L40 9.2', '#FFFFFF', 2.4)]),
  },

  // ── Ô dịch vụ ở Hub (`serviceArtKey`) ────────────────────────────────────────────────────────────────────
  // Pass đồ: túi mua sắm
  service_pass: {
    tint: { light: '#FFEDD5', dark: 'rgba(253,186,116,.34)' },
    shapes: [
      strokePath('M17 17V13.5Q17 7.5 24 7.5Q31 7.5 31 13.5V17', '#7C2D12', 3),
      fillPath('M9 17H39L41.5 39Q41.8 43 37.8 43H10.2Q6.2 43 6.5 39Z', '#F97316'),
      fillPath('M9 17H39L39.6 22H8.4Z', '#FB923C'),
      circle(17, 17, 2, '#7C2D12'),
      circle(31, 17, 2, '#7C2D12'),
      strokePath('M18 30Q24 36 30 30', '#FFEDD5', 2.6),
    ],
  },
  // Tìm trọ: ngôi nhà
  service_room: { tint: { light: '#EDE9FE', dark: 'rgba(139,92,246,.24)' }, shapes: HOUSE },
  // Tìm việc: cặp tài liệu
  service_job: { tint: { light: '#DCFCE7', dark: 'rgba(34,197,94,.20)' }, shapes: BRIEFCASE },
  // Đồ thất lạc: kính lúp dấu hỏi
  service_lostFound: {
    tint: { light: '#FEF3C7', dark: 'rgba(252,211,77,.32)' },
    shapes: [
      strokePath('M31 31L41.5 41.5', '#92400E', 5.5),
      circle(21, 21, 14, '#F59E0B'),
      circle(21, 21, 10.2, '#FEF3C7'),
      strokePath('M14.6 17Q16.6 13.6 20.6 13', '#FFFFFF', 2.2, 0.9),
      strokePath('M18.4 19Q18.4 16.4 21 16.4Q23.6 16.4 23.6 18.7Q23.6 20.3 21 21.5V23.2', '#D97706', 2),
      circle(21, 26.4, 1.15, '#D97706'),
    ],
  },
  // Ghép xe: ô tô
  service_ride: {
    tint: { light: '#CCFBF1', dark: 'rgba(20,184,166,.22)' },
    shapes: [
      fillPath('M5 30Q5 23 11 22L15 14Q16 12 19 12H29Q32 12 33 14L37 22Q43 23 43 30V35H5Z', '#0D9488'),
      fillPath('M16 15.5Q16.6 14 18 14H30Q31.4 14 32 15.5L34.5 22H13.5Z', '#CCFBF1'),
      strokePath('M24 14V22', '#0D9488', 1.8),
      rect(8, 31.5, 32, 3.5, 1.75, '#0F766E'),
      circle(10, 28, 2.3, '#FDE68A'),
      circle(38, 28, 2.3, '#FDE68A'),
      circle(14, 36, 5.6, '#1E293B'),
      circle(14, 36, 2.3, '#E2E8F0'),
      circle(34, 36, 5.6, '#1E293B'),
      circle(34, 36, 2.3, '#E2E8F0'),
    ],
  },
  // Ghép trận: cúp
  service_sport: {
    tint: { light: '#FEE2E2', dark: 'rgba(248,113,113,.24)' },
    shapes: [
      strokePath('M14 11H8.5Q8.5 21 15.5 23', '#F87171', 3),
      strokePath('M34 11H39.5Q39.5 21 32.5 23', '#F87171', 3),
      fillPath('M13 6H35V19Q35 29.5 24 31Q13 29.5 13 19Z', '#DC2626'),
      strokePath('M18 10.5V19', '#FCA5A5', 2.4, 0.9),
      circle(24, 17, 3.8, '#FDE68A'),
      rect(21.5, 30, 5, 6.5, 1, '#B91C1C'),
      rect(14, 36, 20, 6.5, 3, '#7F1D1D'),
      rect(17, 38.2, 14, 2, 1, '#FCA5A5', 0.6),
    ],
  },
  // Gọi thợ: búa + tia lửa
  service_goiTho: {
    tint: { light: '#EDE9FE', dark: 'rgba(139,92,246,.24)' },
    shapes: [
      strokePath('M11 38L29 20', '#F59E0B', 5.4),
      fillPath('M39.2 21.5L33.5 27.2L20.8 14.5L26.5 8.8Z', '#6D28D9'),
      strokePath('M27.6 12L36 20.4', '#A78BFA', 1.8, 0.8),
      strokePath('M13 10L16 13', '#FBBF24', 2.4),
      strokePath('M8 17L12 18', '#FBBF24', 2.4),
      strokePath('M19 5.5L19.8 9.5', '#FBBF24', 2.4),
    ],
  },

  // ── Loại thợ (Gọi thợ; mã = `trade_<service_trade>`) ─────────────────────────────────────────────────────
  // Điện nước: tia điện + giọt nước
  trade_electric_plumbing: {
    tint: { light: '#E0F2FE', dark: 'rgba(56,189,248,.22)' },
    shapes: [
      fillPath('M27 4L11 27H22L19 44L37 20H26Z', '#F59E0B'),
      fillPath('M27 4L11 27H17L27 11Z', '#FCD34D', 0.9),
      fillPath('M38.5 27Q43.5 33.5 43.5 38Q43.5 43 38.5 43Q33.5 43 33.5 38Q33.5 33.5 38.5 27Z', '#0EA5E9'),
      strokePath('M36 37.5Q36 40.5 38.5 40.8', '#BAE6FD', 1.6),
    ],
  },
  // Vệ sinh: bình xịt + tia sáng
  trade_cleaning: {
    tint: { light: '#CCFBF1', dark: 'rgba(20,184,166,.22)' },
    shapes: [
      rect(13, 19, 19, 24, 5, '#14B8A6'),
      rect(18.5, 12.5, 8, 7.5, 2, '#0F766E'),
      rect(17, 6, 17, 6.5, 3, '#0F766E'),
      rect(33, 7, 5, 4.5, 1.2, '#5EEAD4'),
      rect(17, 27, 11, 9, 2.4, '#CCFBF1'),
      strokePath('M19.5 31.5H25.5', '#14B8A6', 1.8),
      fillPath('M41 17L42.5 21L46.5 22.5L42.5 24L41 28L39.5 24L35.5 22.5L39.5 21Z', '#FBBF24'),
      circle(37, 12.5, 1.4, '#99F6E4'),
      circle(43.5, 11, 1, '#99F6E4'),
    ],
  },
  // Thợ hàn: mặt nạ hàn + tia lửa
  trade_welding: {
    tint: { light: '#FFEDD5', dark: 'rgba(253,186,116,.34)' },
    shapes: [
      fillPath('M7 22Q7 7 23 7Q39 7 39 22V32Q39 42 29 42H17Q7 42 7 32Z', '#475569'),
      rect(11, 19, 24, 11, 4, '#1E293B'),
      strokePath('M15.5 24.5H30.5', '#FB923C', 2.6),
      strokePath('M12.5 12.5Q15.5 9.5 20 9', '#94A3B8', 2),
      rect(18, 33.5, 10, 2.4, 1.2, '#94A3B8'),
      circle(41, 10, 2.2, '#FBBF24'),
      circle(45, 17.5, 1.5, '#F97316'),
      circle(44.5, 6, 1.2, '#FDE68A'),
    ],
  },
  // Điện lạnh: máy lạnh treo tường + gió mát
  trade_hvac: {
    tint: { light: '#E0F2FE', dark: 'rgba(56,189,248,.22)' },
    shapes: [
      rect(5, 10.5, 38, 17, 5, '#94A3B8'),
      rect(5, 8.5, 38, 17, 5, '#FFFFFF'),
      rect(9, 19, 30, 3.2, 1.6, '#38BDF8'),
      circle(37, 13.5, 1.6, '#22C55E'),
      rect(9, 12.5, 12, 2, 1, '#CBD5E1'),
      strokePath('M12 31Q15 34 12 37Q9 40 12 43', '#38BDF8', 2.2),
      strokePath('M24 31Q27 34 24 37Q21 40 24 43', '#38BDF8', 2.2),
      strokePath('M36 31Q39 34 36 37Q33 40 36 43', '#38BDF8', 2.2),
    ],
  },
  // Khác: bánh răng
  trade_other: {
    tint: { light: '#E2E8F0', dark: 'rgba(148,163,184,.22)' },
    shapes: [
      rect(20, 4, 8, 11, 2.2, '#64748B'),
      rect(20, 33, 8, 11, 2.2, '#64748B'),
      rect(4, 20, 11, 8, 2.2, '#64748B'),
      rect(33, 20, 11, 8, 2.2, '#64748B'),
      circle(24, 24, 14, '#64748B'),
      circle(24, 24, 10.5, '#94A3B8'),
      circle(24, 24, 5.6, '#E2E8F0'),
      circle(24, 24, 2.2, '#F97316'),
    ],
  },
};

/** Hình của một mã danh mục (`pass_vehicle`…); chưa có → undefined (giữ icon Lucide). */
export function getCategoryArt(category: string): CategoryArt | undefined {
  return CATEGORY_ART[category];
}
