// Chữ hiển thị của nhóm (giờ, chi phí, tuyến, nhãn trạng thái) — dùng cho card, chi tiết, metadata, JSON-LD; chạy được cả
// server lẫn client. Quy tắc (trạng thái hiển thị, vai trò người xem) ở @hp/shared (group-display.ts) để app và web giống
// nhau; ở đây chỉ dịch (t) + định dạng (format.ts) theo locale.
import type { PublicGroup } from '@hp/core';
import { formatDate, formatMoney, type GroupDisplayStatus, type Locale } from '@hp/shared';
import type { BadgeTone } from '@/components/shared/badge';
import type { Translate } from '@/features/listing/display';

/** Tone badge trạng thái — khớp app (GroupCard): còn chỗ xanh, đủ người vàng, đã huỷ đỏ, đã tới giờ / xong xám. */
export const GROUP_STATUS_TONE: Record<GroupDisplayStatus, BadgeTone> = {
  open: 'success',
  full: 'warning',
  started: 'neutral',
  completed: 'neutral',
  cancelled: 'danger',
};

/**
 * Khoá nhãn trạng thái (group.status.*). Cron đã đổi sang `in_progress` → "Đang diễn ra"; đã qua giờ nhưng cron chưa kịp
 * đổi → "Đã tới giờ" (groupDisplayStatus gộp cả hai thành `started`, tone giữ nguyên).
 */
export function groupStatusKey(group: Pick<PublicGroup, 'status'>, status: GroupDisplayStatus): string {
  return status === 'started' && group.status === 'in_progress' ? 'in_progress' : status;
}

/** Nơi chơi của ghép trận: tên sân trong danh mục (venue_name) nếu có, không thì chữ người tạo gõ (origin_text). */
export function groupVenueText(group: Pick<PublicGroup, 'venue_name' | 'origin_text'>): string {
  return group.venue_name?.trim() || group.origin_text;
}

/** Giờ diễn ra (ngày + giờ, múi giờ Việt Nam — format.ts). */
export function groupTimeText(group: Pick<PublicGroup, 'starts_at'>, locale: Locale): string {
  return formatDate(group.starts_at, locale, 'datetime');
}

/** "120.000 ₫/người" hoặc "Miễn phí". */
export function groupFeeText(group: Pick<PublicGroup, 'fee_per_person'>, t: Translate, locale: Locale): string {
  const fee = Number(group.fee_per_person);
  return fee > 0 ? t('group.card.fee_per_person', { fee: formatMoney(fee, locale) }) : t('group.card.free');
}

/** Tuyến "Điểm đi → Điểm đến" (ghép xe) hoặc tên sân (ghép trận). */
export function groupPlaceText(group: Pick<PublicGroup, 'origin_text' | 'destination_text'>, t: Translate): string {
  return group.destination_text
    ? t('web.group.route', { from: group.origin_text, to: group.destination_text })
    : group.origin_text;
}

/**
 * Bản nhóm gửi xuống client component (đi vào HTML qua RSC payload): bỏ toạ độ — dù view đã làm tròn ~300 m, trang web
 * chưa có bản đồ (chưa có key Goong) nên không cần đưa vào HTML. Client tự đọc lại đầy đủ khi cần (useGroup).
 */
export function toClientGroup(group: PublicGroup): PublicGroup {
  return { ...group, origin_lat: null, origin_lng: null, destination_lat: null, destination_lng: null };
}
