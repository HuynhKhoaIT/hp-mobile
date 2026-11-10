// Kiểm duyệt tin cho staff (web /admin/moderation) — migration 20261101090000_listing_write_moderation.
// Đọc: moderation_queue + listings (policy staff đọc mọi dòng) + profiles (staff đọc) + public_profiles (tên rút gọn).
// Ghi: RPC review_listing (security definer: đổi trạng thái tin, đóng dòng hàng chờ, ghi audit_log, thông báo chủ tin).
// RLS / RPC quyết định quyền: người không phải staff đọc ra 0 dòng, gọi RPC nhận forbidden.
// Thu nhỏ PII: không đọc cột location (toạ độ chính xác), SĐT chủ tin che còn 3 số cuối ngay tại đây (không rời server).
import type { Tables } from '@hp/db';
import {
  BulkApproveInput,
  composeReviewNote,
  maskVnPhone,
  MODERATION_REASONS,
  MODERATION_STATUSES,
  ModerationQueueQuery,
  type ModerationReason,
  type ModerationStatus,
  ReviewListingInput,
} from '@hp/shared';
import { MY_LISTING_COLUMNS, type MyListing } from './listings-write';
import { flattenIssues } from './profile';
import { type Client, type Result, fail, fromSupabase, ok } from './result';

type QueueRow = Tables<'moderation_queue'>;
type ProfileRow = Tables<'profiles'>;

const QUEUE_COLUMNS = 'id,listing_id,reasons,risk_score,status,reviewed_by,reviewed_at,note,created_at,updated_at';
/** Tin trong hàng chờ: cột chủ tin thấy + owner_id, deleted_at. Không location (toạ độ chính xác). */
export const MODERATION_LISTING_COLUMNS = `${MY_LISTING_COLUMNS},owner_id,deleted_at` as const;
const OWNER_COLUMNS = 'id,phone,avatar_url,role,is_banned,banned_until,created_at,deleted_at';

export type ModerationListing = MyListing & { owner_id: string; deleted_at: string | null };

/** Chủ tin nhìn từ màn kiểm duyệt: tên rút gọn (public_profiles), SĐT đã che, tuổi tài khoản, trạng thái khoá. */
export type ModerationOwner = {
  id: string;
  /** "An N." — null khi tài khoản đã xoá / chưa đặt tên. */
  display_name: string | null;
  avatar_url: string | null;
  /** `•••• ••• 678` */
  phone_masked: string | null;
  role: ProfileRow['role'];
  is_banned: boolean;
  banned_until: string | null;
  created_at: string;
  deleted: boolean;
};

export type ModerationItem = Omit<QueueRow, 'reasons' | 'status'> & {
  reasons: ModerationReason[];
  status: ModerationStatus;
  listing: ModerationListing;
  owner: ModerationOwner | null;
  /** Tên rút gọn người xử lý; null = chưa xử lý hoặc hệ thống tự từ chối (keyword_reject). */
  reviewer_name: string | null;
};

export type ModerationPage = { items: ModerationItem[]; total: number; page: number; pageSize: number; pageCount: number };
export type ModerationCounts = Record<ModerationStatus, number>;

export type ModerationHistoryEntry = Omit<QueueRow, 'reasons' | 'status'> & {
  reasons: ModerationReason[];
  status: ModerationStatus;
  reviewer_name: string | null;
};

export type ModerationDetail = ModerationItem & {
  /** Mọi lần tin này vào hàng chờ, mới trước (gồm cả dòng hiện tại). */
  history: ModerationHistoryEntry[];
  /** Tin của chủ tin (không tính tin đã xoá). */
  owner_stats: { listings: number; rejected: number };
};

type RawQueueRow = QueueRow & { listing: ModerationListing | null };

const asReasons = (values: string[]): ModerationReason[] =>
  values.filter((v): v is ModerationReason => (MODERATION_REASONS as readonly string[]).includes(v));
const asStatus = (value: string): ModerationStatus =>
  (MODERATION_STATUSES as readonly string[]).includes(value) ? (value as ModerationStatus) : 'pending';

/** Tên rút gọn (public_profiles) cho chủ tin + người xử lý. */
async function displayNames(client: Client, ids: string[]): Promise<Result<Map<string, string>>> {
  const unique = [...new Set(ids)];
  if (unique.length === 0) return ok(new Map());
  const res = fromSupabase(await client.from('public_profiles').select('id,display_name').in('id', unique));
  if (res.error) return res;
  return ok(new Map((res.data ?? []).flatMap((p) => (p.id && p.display_name ? [[p.id, p.display_name] as const] : []))));
}

/** Gắn chủ tin + tên người xử lý vào các dòng hàng chờ (2 truy vấn cho cả trang, không N+1). */
async function hydrate(client: Client, rows: RawQueueRow[]): Promise<Result<ModerationItem[]>> {
  const withListing = rows.filter((r): r is RawQueueRow & { listing: ModerationListing } => r.listing !== null);
  const ownerIds = [...new Set(withListing.map((r) => r.listing.owner_id))];
  const reviewerIds = withListing.flatMap((r) => (r.reviewed_by ? [r.reviewed_by] : []));

  const [owners, names] = await Promise.all([
    ownerIds.length ? client.from('profiles').select(OWNER_COLUMNS).in('id', ownerIds) : null,
    displayNames(client, [...ownerIds, ...reviewerIds]),
  ]);
  if (owners?.error) return fromSupabase<ModerationItem[]>({ data: null, error: owners.error });
  if (names.error) return names;

  const ownerMap = new Map(
    (owners?.data ?? []).map((p) => [
      p.id,
      {
        id: p.id,
        display_name: names.data.get(p.id) ?? null,
        avatar_url: p.avatar_url,
        phone_masked: maskVnPhone(p.phone),
        role: p.role,
        is_banned: p.is_banned,
        banned_until: p.banned_until,
        created_at: p.created_at,
        deleted: p.deleted_at !== null,
      } satisfies ModerationOwner,
    ]),
  );

  return ok(
    withListing.map(({ listing, ...row }) => ({
      ...row,
      reasons: asReasons(row.reasons),
      status: asStatus(row.status),
      listing,
      owner: ownerMap.get(listing.owner_id) ?? null,
      reviewer_name: row.reviewed_by ? (names.data.get(row.reviewed_by) ?? null) : null,
    })),
  );
}

function queueSelect(client: Client, status: ModerationStatus, opts: { count?: boolean; head?: boolean } = {}) {
  const q = client
    .from('moderation_queue')
    .select(`${QUEUE_COLUMNS},listing:listings!inner(${MODERATION_LISTING_COLUMNS})`, {
      count: opts.count ? 'exact' : undefined,
      head: opts.head ?? false,
    })
    .eq('status', status);
  // Hàng chờ thật: tin vẫn đang chờ duyệt và chưa xoá. Dòng pending của tin chủ đã rút về nháp / xoá bị ẩn; khi chủ
  // đăng lại, trigger cập nhật đúng dòng pending đó (unique pending / listing) nên nó hiện lại.
  return status === 'pending' ? q.eq('listing.status', 'pending_review').is('listing.deleted_at', null) : q;
}

/**
 * Hàng chờ theo trạng thái (mặc định pending), lọc theo lý do. Chờ duyệt: rủi ro cao trước, cũ trước;
 * đã xử lý: mới xử lý trước. Phân trang theo trang (searchParams `page`), tối đa 50 / trang, kèm tổng số.
 */
export async function listModerationQueue(client: Client, input: ModerationQueueQuery = {}): Promise<Result<ModerationPage>> {
  const query = ModerationQueueQuery.parse(input);
  const from = (query.page - 1) * query.limit;
  let q = queueSelect(client, query.status, { count: true });
  if (query.reason) q = q.contains('reasons', [query.reason]);
  q =
    query.status === 'pending'
      ? q.order('risk_score', { ascending: false }).order('created_at', { ascending: true })
      : q.order('updated_at', { ascending: false });
  const res = await q.order('id').range(from, from + query.limit - 1);
  if (res.error) {
    // Trang vượt quá tổng (PostgREST 416 / PGRST103) → trang rỗng, không lỗi.
    if ((res.error as { code?: string }).code === 'PGRST103') {
      return ok({ items: [], total: res.count ?? 0, page: query.page, pageSize: query.limit, pageCount: 0 });
    }
    return fromSupabase<ModerationPage>({ data: null, error: res.error });
  }
  const items = await hydrate(client, (res.data ?? []) as unknown as RawQueueRow[]);
  if (items.error) return items;
  const total = res.count ?? items.data.length;
  return ok({ items: items.data, total, page: query.page, pageSize: query.limit, pageCount: Math.ceil(total / query.limit) });
}

/** Số dòng theo trạng thái (nhãn tab). Chờ duyệt đếm cùng điều kiện với listModerationQueue. */
export async function countModerationQueue(client: Client, reason?: ModerationReason): Promise<Result<ModerationCounts>> {
  const results = await Promise.all(
    MODERATION_STATUSES.map((status) => {
      const q = queueSelect(client, status, { count: true, head: true });
      return reason ? q.contains('reasons', [reason]) : q;
    }),
  );
  const counts = {} as ModerationCounts;
  for (const [i, status] of MODERATION_STATUSES.entries()) {
    const res = results[i];
    if (!res) return fail('unknown');
    if (res.error) return fromSupabase<ModerationCounts>({ data: null, error: res.error });
    counts[status] = res.count ?? 0;
  }
  return ok(counts);
}

/** Một dòng hàng chờ + lịch sử kiểm duyệt của tin + số tin của chủ tin (panel chi tiết). */
export async function getModerationItem(client: Client, id: string): Promise<Result<ModerationDetail>> {
  const res = fromSupabase(
    await client
      .from('moderation_queue')
      .select(`${QUEUE_COLUMNS},listing:listings!inner(${MODERATION_LISTING_COLUMNS})`)
      .eq('id', id)
      .maybeSingle(),
    true,
  );
  if (res.error) return res;
  const hydrated = await hydrate(client, [res.data as unknown as RawQueueRow]);
  if (hydrated.error) return hydrated;
  const item = hydrated.data[0];
  if (!item) return fail('not_found');

  const ownerId = item.listing.owner_id;
  const [history, total, rejected] = await Promise.all([
    client.from('moderation_queue').select(QUEUE_COLUMNS).eq('listing_id', item.listing_id).order('created_at', { ascending: false }).limit(20),
    client.from('listings').select('id', { count: 'exact', head: true }).eq('owner_id', ownerId).is('deleted_at', null),
    client.from('listings').select('id', { count: 'exact', head: true }).eq('owner_id', ownerId).eq('status', 'rejected').is('deleted_at', null),
  ]);
  if (history.error) return fromSupabase<ModerationDetail>({ data: null, error: history.error });
  if (total.error) return fromSupabase<ModerationDetail>({ data: null, error: total.error });
  if (rejected.error) return fromSupabase<ModerationDetail>({ data: null, error: rejected.error });

  const rows = history.data ?? [];
  const names = await displayNames(client, rows.flatMap((r) => (r.reviewed_by ? [r.reviewed_by] : [])));
  if (names.error) return names;

  return ok({
    ...item,
    history: rows.map((r) => ({
      ...r,
      reasons: asReasons(r.reasons),
      status: asStatus(r.status),
      reviewer_name: r.reviewed_by ? (names.data.get(r.reviewed_by) ?? null) : null,
    })),
    owner_stats: { listings: total.count ?? 0, rejected: rejected.count ?? 0 },
  });
}

/**
 * Duyệt (tin → active, gia hạn) / từ chối (→ rejected, kèm lý do mẫu + ghi chú vào note) qua RPC review_listing.
 * RPC ghi audit_log `listing.approve` / `listing.reject` và thông báo cho chủ tin.
 * Lỗi: invalid_input / reason_required / too_long, forbidden (không phải staff), not_found, conflict (tin không còn chờ duyệt).
 */
export async function reviewListing(client: Client, input: ReviewListingInput): Promise<Result<null>> {
  const parsed = ReviewListingInput.safeParse(input);
  if (!parsed.success) {
    const first = parsed.error.issues[0]?.message;
    return fail(first && /^[a-z_]+$/.test(first) ? first : 'invalid_input', 'invalid_input', flattenIssues(parsed.error.issues));
  }
  const v = parsed.data;
  const note = composeReviewNote(v.approve ? null : v.reason, v.note);
  const res = await client.rpc('review_listing', {
    p_listing_id: v.listingId,
    p_approve: v.approve,
    ...(note ? { p_note: note } : {}),
  });
  return res.error ? fromSupabase<null>({ data: null, error: res.error }) : ok(null);
}

/** Kết quả duyệt hàng loạt: id đã duyệt + id lỗi kèm mã (tin đã được người khác xử lý → conflict). */
export type BulkReviewResult = { approved: string[]; failed: { listingId: string; code: string }[] };

/** Duyệt nhiều tin (≤ 50), mỗi tin một lần gọi review_listing (mỗi tin một audit + một thông báo), chạy 5 song song. */
export async function approveListings(client: Client, input: BulkApproveInput): Promise<Result<BulkReviewResult>> {
  const parsed = BulkApproveInput.safeParse(input);
  if (!parsed.success) return fail('invalid_input', 'invalid_input', flattenIssues(parsed.error.issues));
  const ids = [...new Set(parsed.data.listingIds)];
  const out: BulkReviewResult = { approved: [], failed: [] };
  for (let i = 0; i < ids.length; i += 5) {
    const chunk = ids.slice(i, i + 5);
    const results = await Promise.all(chunk.map((listingId) => reviewListing(client, { listingId, approve: true })));
    // Không phải staff: mọi tin đều sẽ lỗi như nhau → dừng ngay.
    if (results.some((r) => r.error?.code === 'forbidden')) return fail('forbidden');
    results.forEach((r, j) => {
      const listingId = chunk[j];
      if (!listingId) return;
      if (r.error) out.failed.push({ listingId, code: r.error.code });
      else out.approved.push(listingId);
    });
  }
  return ok(out);
}
