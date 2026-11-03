// Huy hiệu (migration 20261104100000_badges_account_admin). Người dùng: upload giấy tờ vào bucket riêng tư
// verification rồi gọi request-badge (functions.ts requestBadge); đọc yêu cầu của mình qua RLS badge_requests.
// Moderator duyệt ở web admin (trigger thêm huy hiệu + audit + thông báo).
import type { Tables } from '@hp/db';
import { type RequestableBadge, VERIFICATION_FILE, verificationPath } from '@hp/shared';
import { type Client, fail, fromSupabase, ok, requireUserId, type Result } from './result';

export type BadgeRequest = Pick<
  Tables<'badge_requests'>,
  'id' | 'badge' | 'status' | 'reject_reason' | 'created_at' | 'reviewed_at'
>;

const EXT = { 'image/webp': 'webp', 'image/jpeg': 'jpg', 'application/pdf': 'pdf' } as const;
export type VerificationContentType = keyof typeof EXT;

/** Upload giấy tờ (ảnh đã nén / PDF ≤ 5 MB) → path `{uid}/{badge}/{ts}.{ext}` để gửi kèm requestBadge. */
export async function uploadVerificationDocument(
  client: Client,
  v: { badge: RequestableBadge; body: ArrayBuffer | Blob; contentType: VerificationContentType; size?: number },
): Promise<Result<string>> {
  if (v.size !== undefined && v.size > VERIFICATION_FILE.maxBytes) return fail('file_too_large');
  const uid = await requireUserId(client);
  if (uid.error) return uid;
  const path = verificationPath(uid.data, v.badge, EXT[v.contentType]);
  const up = await client.storage.from('verification').upload(path, v.body, { contentType: v.contentType, upsert: false });
  if (up.error) {
    const status = String((up.error as { statusCode?: string | number }).statusCode ?? '');
    return fail(status === '413' ? 'file_too_large' : status === '403' ? 'forbidden' : status === '415' ? 'file_type' : 'upload_failed');
  }
  return ok(path);
}

/** Yêu cầu huy hiệu của chính mình (mới nhất trước) — hiện trạng thái chờ duyệt / bị từ chối + lý do. */
export async function listMyBadgeRequests(client: Client): Promise<Result<BadgeRequest[]>> {
  const uid = await requireUserId(client);
  if (uid.error) return uid;
  const res = fromSupabase<BadgeRequest[]>(
    await client
      .from('badge_requests')
      .select('id,badge,status,reject_reason,created_at,reviewed_at')
      .eq('user_id', uid.data)
      .order('created_at', { ascending: false })
      .limit(20),
  );
  return res.error ? res : ok(res.data ?? []);
}

/** Xoá tài khoản (Nghị định 13): ẩn mọi nội dung ngay, xoá hẳn sau 30 ngày. Client đăng xuất sau khi gọi. */
export async function deleteMyAccount(client: Client): Promise<Result<null>> {
  const res = await client.rpc('delete_my_account');
  return res.error ? fromSupabase<null>({ data: null, error: res.error }) : ok(null);
}
