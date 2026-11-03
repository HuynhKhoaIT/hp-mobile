'use server';

// Ghi nhóm ghép từ web (.claude/rules/web-server-actions.md): Zod (@hp/shared) → đăng nhập → @hp/core (RLS + trigger
// trg_groups_guard quyết định quyền, giờ / số chỗ, giới hạn 10 nhóm / 24h) → làm mới cache → ActionResult.
// - Tham gia / rút / duyệt / huỷ: trình duyệt gọi hook @hp/core/react (Edge Function join-group / respond-join, RPC
//   leave_group, PostgREST + RLS) để có optimistic update; xong gọi refreshGroupAction để trang công khai (cache 'use cache')
//   đọc lại ngay — webhook DB trg_groups_revalidate cũng làm việc này nhưng chạy nền (pg_net).
// - Làm mới: updateTag (read-your-own-writes) cho `group:{id}` và `groups` (danh sách, chi tiết).
import { contributeVenue, type ContributedVenue, createGroup, flattenIssues, type SavedGroup } from '@hp/core';
import { ContributeVenueInput, CreateGroupInput } from '@hp/shared';
import { updateTag } from 'next/cache';
import { type ActionResult, err, fromResult, ok } from '@/lib/action-result';
import { createServerClient } from '@/lib/supabase/server';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Client Supabase theo cookie + kiểm đăng nhập (JWT đã kiểm chữ ký). null = khách. */
async function signedInClient() {
  const supabase = await createServerClient();
  const { data } = await supabase.auth.getClaims();
  return data?.claims?.sub ? supabase : null;
}

function invalidate(groupId: string) {
  updateTag(`group:${groupId}`);
  updateTag('groups');
}

/**
 * Tạo nhóm. Client đã điền tiêu đề mặc định của ghép xe (rideTitle) trước khi gửi nên tiêu đề luôn có.
 * Lỗi nghiệp vụ từ DB: starts_too_soon, starts_too_far, rate_limited, banned (RLS → forbidden).
 */
export async function createGroupAction(raw: unknown): Promise<ActionResult<SavedGroup>> {
  const parsed = CreateGroupInput.safeParse(raw);
  if (!parsed.success) {
    const first = parsed.error.issues[0]?.message;
    return err(first && /^[a-z_]+$/.test(first) ? first : 'invalid_input', flattenIssues(parsed.error.issues));
  }
  const supabase = await signedInClient();
  if (!supabase) return err('auth_required');
  const result = await createGroup(supabase, parsed.data);
  if (!result.error) invalidate(result.data.id);
  return fromResult(result);
}

/**
 * Làm mới cache trang nhóm sau khi trình duyệt vừa ghi (tham gia, rút, duyệt, huỷ) qua hook @hp/core/react.
 * Chỉ người đã đăng nhập; không đọc / ghi dữ liệu — quyền ghi đã do RLS / Edge Function quyết định trước đó.
 */
export async function refreshGroupAction(groupId: unknown): Promise<ActionResult<null>> {
  if (typeof groupId !== 'string' || !UUID.test(groupId)) return err('invalid_input');
  const supabase = await signedInClient();
  if (!supabase) return err('auth_required');
  invalidate(groupId);
  return ok(null);
}

/**
 * Góp sân mới từ form tạo kèo (/tao-nhom/sport). Sân luôn `pending` (RLS + trigger trg_venues_guard: 5 sân / ngày, người bị
 * cấm → forbidden) và chỉ hiện trong search_venues sau khi moderator duyệt → không trang công khai nào cần làm mới.
 * Lỗi: invalid_input / phone_invalid / too_short… (Zod, kèm fieldErrors), auth_required, rate_limited, forbidden.
 */
export async function contributeVenueAction(raw: unknown): Promise<ActionResult<ContributedVenue>> {
  const parsed = ContributeVenueInput.safeParse(raw);
  if (!parsed.success) {
    const first = parsed.error.issues[0]?.message;
    return err(first && /^[a-z_]+$/.test(first) ? first : 'invalid_input', flattenIssues(parsed.error.issues));
  }
  const supabase = await signedInClient();
  if (!supabase) return err('auth_required');
  return fromResult(await contributeVenue(supabase, parsed.data));
}
