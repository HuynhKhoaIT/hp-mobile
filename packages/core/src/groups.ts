// Nhóm ghép (migration 20261102110000_groups). Đọc công khai qua public_groups / search_groups / get_group_by_slug
// (đã che PII, anon được); chủ nhóm tạo / sửa / huỷ qua PostgREST + RLS (bảng groups, guard ở trigger).
// Tham gia / duyệt: functions.ts (join-group / respond-join). Rời nhóm: RPC leave_group.
import type { Database, Json } from '@hp/db';
import {
  CreateGroupInput,
  RateGroupInput,
  GroupFilters,
  groupTimeWindow,
  type GroupKind,
  type MemberStatus,
  rideTitle,
  UpdateGroupInput,
} from '@hp/shared';
import { flattenIssues } from './profile';
import { type Client, type Result, fail, fromSupabase, ok, requireUserId } from './result';

type PublicGroupRow = Database['public']['Views']['public_groups']['Row'];

/** Một nhóm công khai (card + chi tiết). `members` là jsonb — đọc bằng groupMembersPreview (@hp/shared). */
export type PublicGroup = PublicGroupRow;

/** Cột client đọc từ public_groups / RPC. Thêm cột vào view → thêm ở đây. */
// prettier-ignore
export const GROUP_COLUMNS = 'id,slug,short_id,kind,sub_kind,status,title,description,site,site_name,starts_at,ends_at,seats_total,seats_taken,seats_left,fee_per_person,origin_text,origin_lat,origin_lng,destination_text,destination_lat,destination_lng,attributes,requires_approval,lang,created_at,updated_at,host_id,host_name,host_avatar_url,host_badges,host_rating_avg,host_rating_count,host_since,members,is_past,venue_id,venue_name,venue_address';

/** Cursor 2 cột vì nhiều nhóm trùng giờ: "<starts_at>|<id>" của dòng cuối. */
export type GroupPage = { items: PublicGroup[]; nextCursor: string | null };
export type GroupQuery = GroupFilters & { kind: GroupKind; cursor?: string | null; limit?: number };

const toPage = (items: PublicGroup[], limit: number): GroupPage => {
  const last = items.at(-1);
  return { items, nextCursor: items.length === limit && last ? `${last.starts_at}|${last.id}` : null };
};

/** Danh sách nhóm sắp diễn ra (sớm nhất trước). */
export async function searchGroups(client: Client, query: GroupQuery): Promise<Result<GroupPage>> {
  const { kind, cursor, limit: rawLimit, ...rest } = query;
  const parsed = GroupFilters.safeParse(rest);
  if (!parsed.success) return fail('invalid_input');
  const f = parsed.data;
  const limit = Math.min(Math.max(rawLimit ?? 20, 1), 50);
  const [cursorAt, cursorId] = cursor ? cursor.split('|') : [undefined, undefined];
  const window = f.when ? groupTimeWindow(f.when) : null;

  const res = await client
    .rpc('search_groups', {
      p_kind: kind,
      p_sub_kinds: f.subKinds?.length ? f.subKinds : undefined,
      p_site: f.site,
      p_query: f.query || undefined,
      p_from: window?.from,
      p_to: window?.to,
      p_dest_lat: f.destLat,
      p_dest_lng: f.destLng,
      p_dest_radius_m: f.destRadiusM,
      p_include_full: f.includeFull,
      p_limit: limit,
      p_cursor_starts_at: cursorAt,
      p_cursor_id: cursorId,
    })
    .select(GROUP_COLUMNS);
  const result = fromSupabase<PublicGroup[]>(res);
  if (result.error) return result;
  return ok(toPage(result.data ?? [], limit));
}

/** Chi tiết theo id (điều hướng nội bộ app, push). */
export async function getGroup(client: Client, id: string): Promise<Result<PublicGroup>> {
  const res = await client.from('public_groups').select(GROUP_COLUMNS).eq('id', id).maybeSingle();
  return fromSupabase<PublicGroup>(res, true);
}

/** Chi tiết theo slug `{tieu-de}-{short_id}` (link chia sẻ /nhom/{slug}). */
export async function getGroupBySlug(client: Client, slug: string): Promise<Result<PublicGroup>> {
  const res = await client.rpc('get_group_by_slug', { p_slug: slug }).select(GROUP_COLUMNS).maybeSingle();
  return fromSupabase<PublicGroup>(res, true);
}

/**
 * Nhóm sắp diễn ra do một người tạo (trang hồ sơ công khai): còn mở / đủ người, chưa tới giờ, sớm nhất trước.
 * Đọc view public_groups (anon được; ẩn khi chặn hai chiều, chủ nhóm bị khoá / đã xoá). Cursor "<starts_at>|<id>".
 */
export async function listGroupsByHost(
  client: Client,
  v: { hostId: string; cursor?: string | null; limit?: number },
): Promise<Result<GroupPage>> {
  const limit = Math.min(Math.max(v.limit ?? 20, 1), 50);
  let q = client
    .from('public_groups')
    .select(GROUP_COLUMNS)
    .eq('host_id', v.hostId)
    .in('status', ['open', 'full'])
    .eq('is_past', false)
    .order('starts_at', { ascending: true })
    .order('id', { ascending: true })
    .limit(limit);
  if (v.cursor) {
    const [at, id] = v.cursor.split('|');
    q = q.or(`starts_at.gt.${at},and(starts_at.eq.${at},id.gt.${id})`);
  }
  const res = fromSupabase<PublicGroup[]>(await q);
  return res.error ? res : ok(toPage(res.data ?? [], limit));
}

/** Trạng thái của chính mình trong nhóm (null = chưa tham gia). Khách → null. */
export async function getMyMembership(client: Client, groupId: string): Promise<Result<MemberStatus | null>> {
  const { data: session } = await client.auth.getSession();
  const uid = session.session?.user.id;
  if (!uid) return ok(null);
  const res = await client
    .from('group_members')
    .select('status')
    .eq('group_id', groupId)
    .eq('user_id', uid)
    .maybeSingle();
  const result = fromSupabase<{ status: MemberStatus } | null>(res);
  return result.error ? result : ok(result.data?.status ?? null);
}

export type GroupMember = Database['public']['Functions']['list_group_members']['Returns'][number];

/** Thành viên theo quyền xem: chủ nhóm thấy cả người xin + lời nhắn; thành viên thấy nhau. */
export async function listGroupMembers(client: Client, groupId: string): Promise<Result<GroupMember[]>> {
  const result = fromSupabase<GroupMember[]>(await client.rpc('list_group_members', { p_group_id: groupId }));
  return result.error ? result : ok(result.data ?? []);
}

/** lat / lng → EWKT cho cột geography. */
function toPoint(lat: number | null | undefined, lng: number | null | undefined): string | null | undefined {
  if (lat === undefined && lng === undefined) return undefined;
  if (lat == null || lng == null) return null;
  return `SRID=4326;POINT(${lng} ${lat})`;
}

function invalid<T>(issues: { path: PropertyKey[]; message: string }[]): Result<T> {
  const first = issues[0];
  return fail<T>(first && /^[a-z_]+$/.test(first.message) ? first.message : 'invalid_input', 'invalid_input', flattenIssues(issues));
}

export type SavedGroup = { id: string; slug: string | null; status: Database['public']['Enums']['group_status'] };

/**
 * Tạo nhóm. Ghép xe để trống tiêu đề → "điểm đi → điểm đến" (rideTitle). Server đặt host / site / chat nhóm.
 * Lỗi nghiệp vụ: starts_too_soon, starts_too_far, rate_limited, banned (RLS → forbidden).
 */
export async function createGroup(client: Client, input: Omit<CreateGroupInput, 'title'> & { title?: string }): Promise<Result<SavedGroup>> {
  const title =
    input.title?.trim() || (input.kind === 'ride' && input.destination_text ? rideTitle(input.origin_text, input.destination_text) : '');
  const parsed = CreateGroupInput.safeParse({ ...input, title });
  if (!parsed.success) return invalid(parsed.error.issues);
  const uid = await requireUserId(client);
  if (uid.error) return uid;
  const { origin_lat, origin_lng, destination_lat, destination_lng, attributes, ...v } = parsed.data;
  return fromSupabase<SavedGroup>(
    await client
      .from('groups')
      .insert({
        ...v,
        host_id: uid.data,
        attributes: attributes as NonNullable<Json>,
        origin: toPoint(origin_lat, origin_lng) ?? null,
        destination: toPoint(destination_lat, destination_lng) ?? null,
      })
      .select('id,slug,status')
      .single(),
  );
}

/** Sửa nhóm (chủ nhóm, nhóm còn mở và chưa tới giờ). */
export async function updateGroup(client: Client, id: string, input: UpdateGroupInput): Promise<Result<SavedGroup>> {
  const parsed = UpdateGroupInput.safeParse(input);
  if (!parsed.success) return invalid(parsed.error.issues);
  const { kind: _k, sub_kind: _s, origin_lat, origin_lng, destination_lat, destination_lng, attributes, ...v } = parsed.data;
  const origin = toPoint(origin_lat, origin_lng);
  const destination = toPoint(destination_lat, destination_lng);
  const patch = {
    ...v,
    ...(attributes === undefined ? {} : { attributes: attributes as NonNullable<Json> }),
    ...(origin === undefined ? {} : { origin }),
    ...(destination === undefined ? {} : { destination }),
  };
  return fromSupabase<SavedGroup>(await client.from('groups').update(patch).eq('id', id).select('id,slug,status').maybeSingle(), true);
}

/** Chủ nhóm huỷ nhóm → thành viên nhận thông báo group_cancelled. */
export async function cancelGroup(client: Client, id: string): Promise<Result<SavedGroup>> {
  return fromSupabase<SavedGroup>(
    await client.from('groups').update({ status: 'cancelled' }).eq('id', id).select('id,slug,status').maybeSingle(),
    true,
  );
}

/** Rời nhóm / rút yêu cầu tham gia. */
export async function leaveGroup(client: Client, groupId: string): Promise<Result<null>> {
  const res = await client.rpc('leave_group', { p_group_id: groupId });
  return res.error ? fromSupabase<null>({ data: null, error: res.error }) : ok(null);
}

/**
 * Realtime cho chủ nhóm / thành viên: group_members của nhóm đổi (người xin mới, được duyệt, rời).
 * RLS lọc: người ngoài không nhận event. Trả hàm huỷ đăng ký.
 */
export function subscribeToGroup(client: Client, groupId: string, onChange: () => void): () => void {
  const channel = client
    .channel(`group:${groupId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'group_members', filter: `group_id=eq.${groupId}` }, () => onChange())
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'groups', filter: `id=eq.${groupId}` }, () => onChange())
    .subscribe();
  return () => {
    void client.removeChannel(channel);
  };
}

// ── Nhóm của tôi, đánh giá (migration 20261103100000_group_lifecycle_chat) ─────────────────────────────

type MyGroupRow = Database['public']['Views']['my_groups']['Row'];
/** Nhóm của tôi: PublicGroup + vai trò (host | requested | accepted), còn hoạt động, điểm mình đã chấm. */
export type MyGroup = MyGroupRow;
export type MyGroupsTab = 'upcoming' | 'past';
export type MyGroupPage = { items: MyGroup[]; nextCursor: string | null };

/**
 * Sắp tới (open / full / in_progress, sớm nhất trước) hoặc đã qua (completed / cancelled, mới nhất trước).
 * Cursor "<starts_at>|<id>" của dòng cuối.
 */
export async function listMyGroups(
  client: Client,
  opts: { tab: MyGroupsTab; cursor?: string | null; limit?: number },
): Promise<Result<MyGroupPage>> {
  const uid = await requireUserId(client);
  if (uid.error) return uid;
  const limit = Math.min(Math.max(opts.limit ?? 20, 1), 50);
  const upcoming = opts.tab === 'upcoming';
  let q = client
    .from('my_groups')
    .select(`${GROUP_COLUMNS},my_role,is_upcoming,my_rating`)
    .eq('is_upcoming', upcoming)
    .order('starts_at', { ascending: upcoming })
    .order('id', { ascending: upcoming })
    .limit(limit);
  if (opts.cursor) {
    const [at, id] = opts.cursor.split('|');
    const op = upcoming ? 'gt' : 'lt';
    q = q.or(`starts_at.${op}.${at},and(starts_at.eq.${at},id.${op}.${id})`);
  }
  const res = fromSupabase<MyGroup[]>(await q);
  if (res.error) return res;
  const items = res.data ?? [];
  const last = items.at(-1);
  return ok({ items, nextCursor: items.length === limit && last ? `${last.starts_at}|${last.id}` : null });
}

/** Thành viên đã được nhận chấm chủ nhóm (1–5) sau khi nhóm diễn ra. Lỗi: group_not_finished, already_rated, forbidden. */
export async function rateGroup(client: Client, input: RateGroupInput): Promise<Result<null>> {
  const parsed = RateGroupInput.safeParse(input);
  if (!parsed.success) return invalid(parsed.error.issues);
  const res = await client.rpc('rate_group', {
    p_group_id: parsed.data.groupId,
    p_score: parsed.data.score,
    p_comment: parsed.data.comment ?? undefined,
  });
  return res.error ? fromSupabase<null>({ data: null, error: res.error }) : ok(null);
}

/** Điểm mình đã chấm nhóm này (null = chưa chấm / khách). */
export async function getMyGroupRating(client: Client, groupId: string): Promise<Result<number | null>> {
  const { data: session } = await client.auth.getSession();
  const uid = session.session?.user.id;
  if (!uid) return ok(null);
  const res = fromSupabase<{ score: number } | null>(
    await client
      .from('ratings')
      .select('score')
      .eq('rater_id', uid)
      .eq('context_type', 'group')
      .eq('context_id', groupId)
      .maybeSingle(),
  );
  return res.error ? res : ok(res.data?.score ?? null);
}
