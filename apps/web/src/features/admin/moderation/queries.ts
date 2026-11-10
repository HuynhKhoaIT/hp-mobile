// Đọc hàng chờ kiểm duyệt cho /admin/moderation (theo request, không cache — dữ liệu staff, đổi liên tục).
// Client theo session (policy is_staff() của moderation_queue / listings / profiles quyết định); không service role.
// Lỗi được NÉM để error.tsx của segment hiện nút thử lại; trang rỗng là kết quả bình thường.
import 'server-only';
import {
  countModerationQueue,
  listModerationQueue,
  listSites,
  type ModerationCounts,
  type ModerationPage,
  type Result,
} from '@hp/core';
import { ModerationQueueQuery } from '@hp/shared';
import { requireStaff } from '../session';

function unwrap<T>(result: Result<T>): T {
  if (result.error) throw new Error(result.error.code);
  return result.data;
}

export type QueueSearchParams = Record<string, string | string[] | undefined>;

/** searchParams (status, reason, page) → bộ lọc hợp lệ; giá trị lạ về mặc định. */
export function parseQueueParams(params: QueueSearchParams) {
  const pick = (key: string) => (typeof params[key] === 'string' ? params[key] : undefined);
  return ModerationQueueQuery.parse({ status: pick('status'), reason: pick('reason'), page: pick('page') });
}

export type QueueData = {
  page: ModerationPage;
  counts: ModerationCounts;
  /** Mã khu → tên (hiện khu vực của tin). */
  sites: Record<string, string>;
  now: number;
};

/** Một trang hàng chờ + số dòng theo trạng thái (nhãn tab, cùng bộ lọc lý do). */
export async function getModerationQueue(params: QueueSearchParams): Promise<QueueData> {
  const check = await requireStaff();
  if (!check.ok) throw new Error(check.code);
  const query = parseQueueParams(params);
  const { supabase } = check.staff;
  const [page, counts, sites] = await Promise.all([
    listModerationQueue(supabase, query),
    countModerationQueue(supabase, query.reason),
    listSites(supabase),
  ]);
  return {
    page: unwrap(page),
    counts: unwrap(counts),
    // Tên khu chỉ để hiển thị: lỗi đọc danh mục khu không chặn hàng chờ.
    sites: Object.fromEntries((sites.data ?? []).map((s) => [s.code, s.name])),
    now: Date.now(),
  };
}

/** Số tin chờ duyệt (badge thanh bên, trang tổng quan). Lỗi → null (badge ẩn, không làm hỏng layout). */
export async function getPendingCounts(): Promise<ModerationCounts | null> {
  const check = await requireStaff();
  if (!check.ok) return null;
  const counts = await countModerationQueue(check.staff.supabase);
  return counts.error ? null : counts.data;
}
