// Khu, thông báo, lưu tin, chặn — các bảng Core nhỏ (migration 20261030100000_core).
import type { Tables } from '@hp/db';
import { type Client, type Result, clampLimit, fromSupabase, ok } from './result';

// ── sites ──────────────────────────────────────────────────────────────────────
export type Site = Pick<Tables<'sites'>, 'code' | 'name'>;

export async function listSites(client: Client): Promise<Result<Site[]>> {
  return fromSupabase(await client.from('sites').select('code, name').order('name'));
}

// ── notifications ──────────────────────────────────────────────────────────────
export type Notification = Tables<'notifications'>;
export type Page<T> = { items: T[]; nextCursor: string | null };

/** Phân trang cursor theo created_at (không offset). */
export async function listNotifications(
  client: Client,
  opts: { cursor?: string | null; limit?: number } = {},
): Promise<Result<Page<Notification>>> {
  const limit = clampLimit(opts.limit);
  let q = client.from('notifications').select('*').order('created_at', { ascending: false }).limit(limit);
  if (opts.cursor) q = q.lt('created_at', opts.cursor);
  const res = fromSupabase(await q);
  if (res.error) return res;
  const items = res.data ?? [];
  return ok({ items, nextCursor: items.length === limit ? (items.at(-1)?.created_at ?? null) : null });
}

export async function countUnreadNotifications(client: Client): Promise<Result<number>> {
  const { count, error } = await client
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .is('read_at', null);
  return error ? fromSupabase<number>({ data: null, error }) : ok(count ?? 0);
}

/** Đánh dấu đã đọc: danh sách id, hoặc tất cả khi bỏ trống. */
export async function markNotificationsRead(client: Client, ids?: string[]): Promise<Result<null>> {
  let q = client.from('notifications').update({ read_at: new Date().toISOString() }).is('read_at', null);
  if (ids?.length) q = q.in('id', ids);
  const res = await q;
  return res.error ? fromSupabase({ data: null, error: res.error }) : ok(null);
}

// ── bookmarks ──────────────────────────────────────────────────────────────────
export type BookmarkTarget = { targetType: 'listing' | 'group'; targetId: string };

export async function listBookmarks(client: Client, targetType?: 'listing' | 'group'): Promise<Result<Tables<'bookmarks'>[]>> {
  let q = client.from('bookmarks').select('*').order('created_at', { ascending: false });
  if (targetType) q = q.eq('target_type', targetType);
  return fromSupabase(await q);
}

/** Lưu / bỏ lưu. `next = true` là lưu. Lưu trùng coi như thành công. user_id do DB gán (auth.uid()). */
export async function setBookmark(client: Client, v: BookmarkTarget & { next: boolean }): Promise<Result<null>> {
  const res = v.next
    ? await client
        .from('bookmarks')
        .upsert({ target_type: v.targetType, target_id: v.targetId }, { onConflict: 'user_id,target_type,target_id', ignoreDuplicates: true })
    : await client.from('bookmarks').delete().match({ target_type: v.targetType, target_id: v.targetId });
  return res.error ? fromSupabase({ data: null, error: res.error }) : ok(null);
}

// ── blocks ─────────────────────────────────────────────────────────────────────
export async function listBlocked(client: Client): Promise<Result<string[]>> {
  const res = fromSupabase(await client.from('blocks').select('blocked_id'));
  return res.error ? res : ok((res.data ?? []).map((r) => r.blocked_id));
}

export async function setBlocked(client: Client, v: { userId: string; next: boolean }): Promise<Result<null>> {
  const res = v.next
    ? await client.from('blocks').upsert({ blocked_id: v.userId }, { onConflict: 'blocker_id,blocked_id', ignoreDuplicates: true })
    : await client.from('blocks').delete().eq('blocked_id', v.userId);
  return res.error ? fromSupabase({ data: null, error: res.error }) : ok(null);
}
