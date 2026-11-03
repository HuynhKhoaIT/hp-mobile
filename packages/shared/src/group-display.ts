// Quy tắc nhóm ghép dùng chung app, web, Edge Function (tuần 7). Trả mô tả dữ liệu, không trả chữ: client tự dịch.
// Không import file nào (kể cả type) để chạy được trong node --test và Deno (Edge Function đọc GROUP_RULES).
// Tham số nhận string thay vì GroupStatus / MemberStatus / GroupKind của enums.ts vì lý do trên.

/** Luật tạo / tham gia nhóm — khớp trigger trg_groups_guard + RPC join_group_tx (migration 20261102110000_groups). */
export const GROUP_RULES = {
  minLeadMinutes: 15,
  maxDaysAhead: 60,
  maxSeats: 50,
  motorbikeMaxSeats: 2,
  titleMin: 5,
  titleMax: 120,
  descriptionMax: 2000,
  placeMax: 200,
  noteMax: 200,
  feeMax: 100_000_000,
  /** Nhắc trước giờ diễn ra (cron remind_groups, migration 20261103100000). */
  reminderMinutes: 60,
  /** Không có ends_at: coi là xong sau starts_at + số giờ này (cron expire_content). */
  completeAfterHours: 3,
  ratingCommentMax: 500,
} as const;

/** Trạng thái hiển thị (badge): DB status + đã qua giờ (cron chưa kịp đổi). */
export type GroupDisplayStatus = 'open' | 'full' | 'started' | 'completed' | 'cancelled';

type StatusSource = { status: string; starts_at: string };

export function groupDisplayStatus(g: StatusSource, now: Date = new Date()): GroupDisplayStatus {
  if (g.status === 'cancelled') return 'cancelled';
  if (g.status === 'completed') return 'completed';
  if (g.status === 'in_progress' || Date.parse(g.starts_at) <= now.getTime()) return 'started';
  return g.status === 'full' ? 'full' : 'open';
}

/** Còn tham gia / xin được không (ẩn nút ở client; server vẫn kiểm). Nhóm đủ chỗ không nhận thêm yêu cầu. */
export function canJoinGroup(g: StatusSource, now: Date = new Date()): boolean {
  return groupDisplayStatus(g, now) === 'open';
}

/** Vai trò của người xem với nhóm → nút hành động ở chi tiết. */
export type GroupViewerRole = 'guest' | 'host' | 'none' | 'requested' | 'member' | 'declined' | 'left';

export function groupViewerRole(
  g: { host_id: string },
  userId: string | null | undefined,
  membership: string | null | undefined,
): GroupViewerRole {
  if (!userId) return 'guest';
  if (g.host_id === userId) return 'host';
  if (membership === 'accepted') return 'member';
  if (membership === 'requested') return 'requested';
  if (membership === 'declined' || membership === 'kicked') return 'declined';
  if (membership === 'left') return 'left';
  return 'none';
}

export type GroupMemberPreview = { id: string; name: string | null; avatar_url: string | null };

/** Tên công khai "tên + chữ cái họ" — cùng thuật toán SQL public.short_name: "Nguyễn Văn An" → "An N.". */
export function shortName(fullName: string | null | undefined): string {
  const parts = (fullName ?? '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0]!;
  return `${parts.at(-1)} ${parts[0]!.charAt(0).toUpperCase()}.`;
}

/** public_groups.members (jsonb) → mảng an toàn. */
export function groupMembersPreview(members: unknown): GroupMemberPreview[] {
  if (!Array.isArray(members)) return [];
  return members.flatMap((m) => {
    if (!m || typeof m !== 'object') return [];
    const r = m as Record<string, unknown>;
    if (typeof r.id !== 'string') return [];
    return [{
      id: r.id,
      name: typeof r.name === 'string' ? r.name : null,
      avatar_url: typeof r.avatar_url === 'string' ? r.avatar_url : null,
    }];
  });
}

/** Khoảng giờ lọc nhanh ở danh sách. 'week' = 7 ngày tới. Ngày tính theo giờ Việt Nam (UTC+7, không đổi giờ mùa hè)
 * để server web (Vercel chạy UTC) và app cho cùng kết quả. */
export const GROUP_TIME_WINDOWS = ['today', 'tomorrow', 'week'] as const;
export type GroupTimeWindow = (typeof GROUP_TIME_WINDOWS)[number];

export function groupTimeWindow(w: GroupTimeWindow, now: Date = new Date()): { from: string; to: string } {
  const day = 24 * 60 * 60 * 1000;
  const vnOffset = 7 * 60 * 60 * 1000;
  // Nửa đêm hôm nay theo giờ Việt Nam (dạng mốc UTC)
  const start = new Date(Math.floor((now.getTime() + vnOffset) / day) * day - vnOffset);
  if (w === 'today') return { from: now.toISOString(), to: new Date(start.getTime() + day).toISOString() };
  if (w === 'tomorrow') return { from: new Date(start.getTime() + day).toISOString(), to: new Date(start.getTime() + 2 * day).toISOString() };
  return { from: now.toISOString(), to: new Date(start.getTime() + 8 * day).toISOString() };
}

/** Tiêu đề mặc định ghép xe khi người dùng không tự đặt: "Điểm đi → Điểm đến" (cắt phần sau " — "). */
export function rideTitle(origin: string, destination: string): string {
  const short = (s: string) => s.split(' — ')[0]!.split(',')[0]!.trim();
  return `${short(origin)} → ${short(destination)}`.slice(0, GROUP_RULES.titleMax);
}

/**
 * Đội hình Ghép trận khi chủ nhóm đã có sẵn người (attributes.players_have, tính cả chủ nhóm):
 * have = có sẵn + đã tham gia, total = có sẵn + số chỗ cần thêm, need = chỗ còn trống.
 * Vd đội 7 có 5, cần thêm 2, 1 người đã vào → { have: 6, total: 7, need: 1 }. Không phải sport / không khai → null.
 */
export function groupLineup(
  kind: string,
  attributes: unknown,
  seatsTotal: number,
  seatsTaken: number,
): { have: number; total: number; need: number } | null {
  if (kind !== 'sport' || !attributes || typeof attributes !== 'object') return null;
  const raw = (attributes as Record<string, unknown>).players_have;
  if (typeof raw !== 'number' || !Number.isInteger(raw) || raw < 1) return null;
  const taken = Math.min(Math.max(seatsTaken, 0), seatsTotal);
  return { have: raw + taken, total: raw + seatsTotal, need: seatsTotal - taken };
}

/** Số chỗ tối đa theo loại (xe máy chở kèm ≤ 2). */
export function maxSeatsFor(kind: string, subKind: string): number {
  return kind === 'ride' && subKind === 'motorbike' ? GROUP_RULES.motorbikeMaxSeats : GROUP_RULES.maxSeats;
}

/**
 * Điểm đến hay đi khi chưa có Goong autocomplete (chưa có key): người dùng chọn nhanh hoặc tự gõ.
 * Tên riêng địa danh — không dịch. Toạ độ để lọc bán kính điểm đến.
 */
export const RIDE_PLACES = [
  { id: 'da_nang', name: 'Đà Nẵng', lat: 16.059, lng: 108.172 },
  { id: 'da_nang_airport', name: 'Đà Nẵng — Sân bay', lat: 16.044, lng: 108.199 },
  { id: 'quang_ngai', name: 'TP Quảng Ngãi', lat: 15.12, lng: 108.792 },
  { id: 'hoi_an', name: 'Hội An', lat: 15.88, lng: 108.335 },
  { id: 'tam_ky', name: 'Tam Kỳ', lat: 15.573, lng: 108.474 },
  { id: 'hue', name: 'Huế', lat: 16.456, lng: 107.578 },
  { id: 'quy_nhon', name: 'Quy Nhơn', lat: 13.782, lng: 109.219 },
  { id: 'nui_thanh', name: 'Núi Thành', lat: 15.425, lng: 108.66 },
  { id: 'chu_lai_airport', name: 'Sân bay Chu Lai', lat: 15.406, lng: 108.706 },
] as const;
export type RidePlace = (typeof RIDE_PLACES)[number];
