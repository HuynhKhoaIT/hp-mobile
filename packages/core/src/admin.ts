// Quản trị (web /admin) — migration 20261104100000_badges_account_admin + bảng có policy staff từ các tuần trước.
// Mọi hàm nhận client theo phiên STAFF (không service role): RLS + is_staff() / is_admin() quyết định; người không đủ quyền
// đọc ra 0 dòng hoặc nhận forbidden. audit_log do trigger / RPC ghi trong cùng transaction (không ghi lại ở đây):
//   reports → report.update · badge_requests → badge.approve|reject · profiles → user.role|ban|unban|suspend|unsuspend|badges
//   staff_set_listing_status → listing.status · staff_cancel_group → group.cancel · sites → site.* · venues → venue.*
//   banned_keywords → keyword.* · banners → banner.* · export_audit_log → audit.export
//   marketing_leads → lead.update · export_marketing_leads → lead.export
// Thu nhỏ PII: SĐT luôn che (maskVnPhone) ngay tại đây, không đọc toạ độ (location) của tin / nhà / sân.
// Kiểm input bằng hàm nhỏ trong file này (enum + uuid + độ dài) vì Zod schema admin chưa có ở @hp/shared — xem
// docs/plan/web.md mục 3l (chuyển sang @hp/shared khi backend thêm).
import type { Database, Json, Tables } from '@hp/db';
import {
  BADGES,
  type Badge,
  GROUP_KINDS,
  GROUP_STATUSES,
  type GroupKind,
  type GroupStatus,
  LISTING_CATEGORIES,
  LISTING_STATUSES,
  type ListingCategory,
  type ListingStatus,
  maskVnPhone,
  REPORT_REASONS,
  REPORT_TARGETS,
  type ReportReason,
  type ReportTarget,
  ROLES,
  type Role,
  LEAD_KINDS,
  LEAD_STATUSES,
  type LeadKind,
  type LeadStatus,
  LeadUpdateInput,
} from '@hp/shared';
import { type Client, fail, fromSupabase, ok, type Result } from './result';

// ── Hằng số (khớp CHECK trong migration) ─────────────────────────────────────────
export const ADMIN_PAGE_SIZE = 25;
export const ADMIN_MAX_PAGE_SIZE = 50;
export const ADMIN_NOTE_MAX = 500;
export const ADMIN_BULK_MAX = 50;
/** Signed URL giấy tờ huy hiệu: 5 phút (.claude/rules/web-admin.md). */
export const VERIFICATION_URL_TTL = 300;
/** Số ngày khoá tạm moderator được chọn. */
export const SUSPEND_DAYS = [1, 3, 7, 30] as const;
export type SuspendDays = (typeof SUSPEND_DAYS)[number];

export const REPORT_STATUSES = ['open', 'reviewing', 'resolved', 'dismissed'] as const;
export type ReportStatus = (typeof REPORT_STATUSES)[number];
/** Bộ lọc báo cáo: `active` = open + reviewing (hàng chờ). */
export const REPORT_FILTERS = ['active', ...REPORT_STATUSES] as const;
export type ReportFilter = (typeof REPORT_FILTERS)[number];

export const BADGE_REQUEST_STATUSES = ['pending', 'approved', 'rejected'] as const;
export type BadgeRequestStatus = (typeof BADGE_REQUEST_STATUSES)[number];

export const VENUE_STATUSES = ['pending', 'approved', 'rejected'] as const;
export type VenueStatus = (typeof VENUE_STATUSES)[number];
export const VENUE_SPORTS = ['football', 'badminton', 'pickleball'] as const;
export type VenueSport = (typeof VENUE_SPORTS)[number];

export const KEYWORD_ACTIONS = ['reject', 'review'] as const;
export type KeywordAction = (typeof KEYWORD_ACTIONS)[number];

/** Trạng thái staff được đặt cho tin ngoài hàng chờ (RPC staff_set_listing_status). */
export const STAFF_LISTING_STATUSES = ['active', 'closed', 'rejected'] as const;
export type StaffListingStatus = (typeof STAFF_LISTING_STATUSES)[number];

export const USER_STATES = ['active', 'suspended', 'banned', 'deleted'] as const;
export type UserState = (typeof USER_STATES)[number];

export const AUDIT_EXPORT_MAX = 10000;

// ── Tiện ích kiểm input ───────────────────────────────────────────────────────────
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (v: unknown): v is string => typeof v === 'string' && UUID.test(v);
export function oneOf<T extends string>(list: readonly T[], v: unknown): v is T {
  return typeof v === 'string' && (list as readonly string[]).includes(v);
}
/** Chữ tự do: cắt khoảng trắng, rỗng → null, quá dài → lỗi (undefined). */
function cleanText(v: unknown, max: number): string | null | undefined {
  if (v === null || v === undefined) return null;
  if (typeof v !== 'string') return undefined;
  const s = v.trim();
  if (s.length > max) return undefined;
  return s || null;
}
/** Ô tìm: bỏ ký tự đặc biệt của bộ lọc PostgREST (`,()*%\`) để không chèn điều kiện. */
export function sanitizeSearch(v: unknown, max = 60): string {
  if (typeof v !== 'string') return '';
  return v.replace(/[,()*%\\:"']/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
}
const uuidList = (v: unknown, max = ADMIN_BULK_MAX): string[] | null => {
  if (!Array.isArray(v) || v.length === 0 || v.length > max || !v.every(isUuid)) return null;
  return [...new Set(v)];
};

export type AdminPage<T> = { items: T[]; total: number; page: number; pageSize: number; pageCount: number };
type PageInput = { page?: number; limit?: number };

function pageWindow(input: PageInput) {
  const page = Math.max(1, Math.floor(Number(input.page) || 1));
  const pageSize = Math.min(Math.max(1, Math.floor(Number(input.limit) || ADMIN_PAGE_SIZE)), ADMIN_MAX_PAGE_SIZE);
  return { page, pageSize, from: (page - 1) * pageSize, to: page * pageSize - 1 };
}

function toPage<T>(items: T[], total: number | null, w: { page: number; pageSize: number }): AdminPage<T> {
  const t = total ?? items.length;
  return { items, total: t, page: w.page, pageSize: w.pageSize, pageCount: Math.ceil(t / w.pageSize) };
}

type RangeRes<T> = { data: T[] | null; error: unknown; count: number | null };
/** Trang vượt quá tổng (PGRST103) → trang rỗng, không lỗi. */
function rangeResult<T>(res: RangeRes<T>): Result<{ rows: T[]; total: number | null }> {
  if (res.error) {
    if ((res.error as { code?: string }).code === 'PGRST103') return ok({ rows: [], total: res.count });
    return fromSupabase<{ rows: T[]; total: number | null }>({ data: null, error: res.error });
  }
  return ok({ rows: res.data ?? [], total: res.count });
}

/** Sắp xếp từ URL: `col` (tăng) / `-col` (giảm), chỉ nhận cột cho phép. */
export function parseSort<C extends string>(raw: unknown, allowed: readonly C[], fallback: `${'-' | ''}${C}`) {
  const s = typeof raw === 'string' ? raw : fallback;
  const desc = s.startsWith('-');
  const col = desc ? s.slice(1) : s;
  if (oneOf(allowed, col)) return { column: col, ascending: !desc, value: s };
  const fd = fallback.startsWith('-');
  return { column: (fd ? fallback.slice(1) : fallback) as C, ascending: !fd, value: fallback as string };
}

/** Tên rút gọn (public_profiles) theo id — một truy vấn cho cả trang. */
async function shortNames(client: Client, ids: (string | null | undefined)[]): Promise<Map<string, string>> {
  const unique = [...new Set(ids.filter((v): v is string => !!v))];
  if (unique.length === 0) return new Map();
  const res = await client.from('public_profiles').select('id,display_name').in('id', unique);
  return new Map((res.data ?? []).flatMap((p) => (p.id && p.display_name ? [[p.id, p.display_name] as const] : [])));
}

const num = (v: Json | undefined): number => (typeof v === 'number' ? v : typeof v === 'string' ? Number(v) || 0 : 0);

// ── Dashboard ────────────────────────────────────────────────────────────────────
export type AdminStats = {
  users_total: number;
  users_new_7d: number;
  users_banned: number;
  listings_active: number;
  listings_new_7d: number;
  listings_by_category: Partial<Record<ListingCategory, number>>;
  groups_upcoming: number;
  groups_new_7d: number;
  messages_24h: number;
  moderation_pending: number;
  reports_open: number;
  badges_pending: number;
  venues_pending: number;
  leads_new: number;
};

/** Số liệu dashboard (RPC admin_stats, staff). Chưa tách nguồn web / app (cần PostHog). */
export async function getAdminStats(client: Client): Promise<Result<AdminStats>> {
  const res = await client.rpc('admin_stats');
  if (res.error) return fromSupabase<AdminStats>({ data: null, error: res.error });
  const j = (res.data && typeof res.data === 'object' && !Array.isArray(res.data) ? res.data : {}) as Record<string, Json | undefined>;
  const cats = j.listings_by_category;
  const byCat: Partial<Record<ListingCategory, number>> = {};
  if (cats && typeof cats === 'object' && !Array.isArray(cats)) {
    for (const [k, v] of Object.entries(cats)) if (oneOf(LISTING_CATEGORIES, k)) byCat[k] = num(v);
  }
  return ok({
    users_total: num(j.users_total),
    users_new_7d: num(j.users_new_7d),
    users_banned: num(j.users_banned),
    listings_active: num(j.listings_active),
    listings_new_7d: num(j.listings_new_7d),
    listings_by_category: byCat,
    groups_upcoming: num(j.groups_upcoming),
    groups_new_7d: num(j.groups_new_7d),
    messages_24h: num(j.messages_24h),
    moderation_pending: num(j.moderation_pending),
    reports_open: num(j.reports_open),
    badges_pending: num(j.badges_pending),
    venues_pending: num(j.venues_pending),
    leads_new: num(j.leads_new),
  });
}

// ── Báo cáo ──────────────────────────────────────────────────────────────────────
/** Đối tượng bị báo cáo, rút gọn cho bảng. Tin nhắn: staff không đọc được nội dung (RLS chỉ thành viên) → title null. */
export type ReportTargetSummary = {
  type: ReportTarget;
  id: string;
  /** Tiêu đề tin / nhóm, tên rút gọn người dùng; null = không đọc được / đã xoá. */
  title: string | null;
  slug: string | null;
  /** Trạng thái tin / nhóm; người dùng: 'banned' | 'suspended' | 'active' | 'deleted'. */
  status: string | null;
  /** Chủ tin / chủ nhóm / chính người dùng — để mở /admin/users/[id]. */
  owner_id: string | null;
  deleted: boolean;
};

export type AdminReport = Omit<Tables<'reports'>, 'status' | 'reason' | 'target_type'> & {
  status: ReportStatus;
  reason: ReportReason;
  target_type: ReportTarget;
  reporter_name: string | null;
  resolver_name: string | null;
  target: ReportTargetSummary;
  /** Số báo cáo đang mở (open + reviewing) của cùng đối tượng. */
  target_open_count: number;
};

export type ReportQuery = PageInput & { status?: string; targetType?: string; reason?: string };

function userState(p: { is_banned: boolean; banned_until: string | null; deleted_at: string | null }, now = Date.now()): UserState {
  if (p.deleted_at) return 'deleted';
  if (p.is_banned) return 'banned';
  if (p.banned_until && new Date(p.banned_until).getTime() > now) return 'suspended';
  return 'active';
}

async function reportTargets(client: Client, rows: Pick<Tables<'reports'>, 'target_type' | 'target_id'>[]) {
  const ids = (type: ReportTarget) => [...new Set(rows.filter((r) => r.target_type === type).map((r) => r.target_id))];
  const listingIds = ids('listing');
  const groupIds = ids('group');
  const profileIds = ids('profile');
  const [listings, groups, profiles, names] = await Promise.all([
    listingIds.length
      ? client.from('listings').select('id,title,slug,status,owner_id,deleted_at').in('id', listingIds)
      : null,
    groupIds.length ? client.from('groups').select('id,title,slug,status,host_id,deleted_at').in('id', groupIds) : null,
    profileIds.length
      ? client.from('profiles').select('id,is_banned,banned_until,deleted_at').in('id', profileIds)
      : null,
    shortNames(client, profileIds),
  ]);
  const map = new Map<string, ReportTargetSummary>();
  for (const l of listings?.data ?? []) {
    map.set(`listing:${l.id}`, {
      type: 'listing', id: l.id, title: l.title, slug: l.slug, status: l.status, owner_id: l.owner_id, deleted: l.deleted_at !== null,
    });
  }
  for (const g of groups?.data ?? []) {
    map.set(`group:${g.id}`, {
      type: 'group', id: g.id, title: g.title, slug: g.slug, status: g.status, owner_id: g.host_id, deleted: g.deleted_at !== null,
    });
  }
  for (const p of profiles?.data ?? []) {
    map.set(`profile:${p.id}`, {
      type: 'profile', id: p.id, title: names.get(p.id) ?? null, slug: null, status: userState(p), owner_id: p.id, deleted: p.deleted_at !== null,
    });
  }
  return map;
}

/**
 * Hàng chờ báo cáo. Mặc định `active` (mở + đang xem), cũ trước (SLA 2 giờ); đã xử lý: mới xử lý trước.
 * Mỗi dòng kèm đối tượng rút gọn + số báo cáo đang mở của đối tượng (gom theo đối tượng ở UI).
 */
export async function listReports(client: Client, input: ReportQuery = {}): Promise<Result<AdminPage<AdminReport>>> {
  const w = pageWindow(input);
  const status: ReportFilter = oneOf(REPORT_FILTERS, input.status) ? input.status : 'active';
  let q = client
    .from('reports')
    .select('id,reporter_id,target_type,target_id,reason,detail,status,resolved_by,resolved_at,created_at,updated_at', { count: 'exact' });
  q = status === 'active' ? q.in('status', ['open', 'reviewing']) : q.eq('status', status);
  if (oneOf(REPORT_TARGETS, input.targetType)) q = q.eq('target_type', input.targetType);
  if (oneOf(REPORT_REASONS, input.reason)) q = q.eq('reason', input.reason);
  q = status === 'active' ? q.order('created_at', { ascending: true }) : q.order('updated_at', { ascending: false });
  const res = rangeResult(await q.order('id').range(w.from, w.to));
  if (res.error) return res;
  const rows = res.data.rows;

  const targetIds = [...new Set(rows.map((r) => r.target_id))];
  const [targets, names, open] = await Promise.all([
    reportTargets(client, rows),
    shortNames(client, rows.flatMap((r) => [r.reporter_id, r.resolved_by])),
    targetIds.length
      ? client.from('reports').select('target_type,target_id').in('target_id', targetIds).in('status', ['open', 'reviewing'])
      : null,
  ]);
  const openCount = new Map<string, number>();
  for (const r of open?.data ?? []) {
    const k = `${r.target_type}:${r.target_id}`;
    openCount.set(k, (openCount.get(k) ?? 0) + 1);
  }

  return ok(
    toPage(
      rows.map((r) => {
        const key = `${r.target_type}:${r.target_id}`;
        const type = (oneOf(REPORT_TARGETS, r.target_type) ? r.target_type : 'listing') as ReportTarget;
        return {
          ...r,
          status: (oneOf(REPORT_STATUSES, r.status) ? r.status : 'open') as ReportStatus,
          reason: (oneOf(REPORT_REASONS, r.reason) ? r.reason : 'other') as ReportReason,
          target_type: type,
          reporter_name: names.get(r.reporter_id) ?? null,
          resolver_name: r.resolved_by ? (names.get(r.resolved_by) ?? null) : null,
          target: targets.get(key) ?? { type, id: r.target_id, title: null, slug: null, status: null, owner_id: null, deleted: false },
          target_open_count: openCount.get(key) ?? 0,
        } satisfies AdminReport;
      }),
      res.data.total,
      w,
    ),
  );
}

/** Đếm báo cáo theo bộ lọc trạng thái (nhãn tab). */
export async function countReports(client: Client): Promise<Result<Record<ReportFilter, number>>> {
  const results = await Promise.all(
    REPORT_FILTERS.map((s) => {
      const q = client.from('reports').select('id', { count: 'exact', head: true });
      return s === 'active' ? q.in('status', ['open', 'reviewing']) : q.eq('status', s);
    }),
  );
  const out = {} as Record<ReportFilter, number>;
  for (const [i, s] of REPORT_FILTERS.entries()) {
    const r = results[i];
    if (!r || r.error) return fromSupabase<Record<ReportFilter, number>>({ data: null, error: r?.error ?? { message: 'unknown' } });
    out[s] = r.count ?? 0;
  }
  return ok(out);
}

/**
 * Đổi trạng thái nhiều báo cáo (≤ 50). Trigger ghi resolved_by / resolved_at + audit `report.update` mỗi dòng.
 * Trả id thật sự đổi (dòng đã ở trạng thái đó bị bỏ qua).
 */
export async function setReportsStatus(
  client: Client,
  input: { ids: unknown; status: unknown },
): Promise<Result<{ updated: string[] }>> {
  const ids = uuidList(input.ids);
  if (!ids || !oneOf(REPORT_STATUSES, input.status)) return fail('invalid_input');
  const res = await client.from('reports').update({ status: input.status }).in('id', ids).neq('status', input.status).select('id');
  if (res.error) return fromSupabase<{ updated: string[] }>({ data: null, error: res.error });
  return ok({ updated: (res.data ?? []).map((r) => r.id) });
}

/** Đóng mọi báo cáo đang mở của một đối tượng (sau khi đã ẩn tin / huỷ nhóm / khoá người dùng). */
export async function resolveReportsForTarget(
  client: Client,
  input: { targetType: unknown; targetId: unknown; status?: unknown },
): Promise<Result<{ updated: string[] }>> {
  const status = input.status ?? 'resolved';
  if (!oneOf(REPORT_TARGETS, input.targetType) || !isUuid(input.targetId) || !oneOf(['resolved', 'dismissed'] as const, status)) {
    return fail('invalid_input');
  }
  const res = await client
    .from('reports')
    .update({ status })
    .eq('target_type', input.targetType)
    .eq('target_id', input.targetId)
    .in('status', ['open', 'reviewing'])
    .select('id');
  if (res.error) return fromSupabase<{ updated: string[] }>({ data: null, error: res.error });
  return ok({ updated: (res.data ?? []).map((r) => r.id) });
}

// ── Huy hiệu ─────────────────────────────────────────────────────────────────────
/** Người xin huy hiệu nhìn từ admin: họ tên đầy đủ (đối chiếu giấy tờ — chỉ staff), SĐT đã che. */
export type AdminPerson = {
  id: string;
  full_name: string;
  display_name: string | null;
  phone_masked: string | null;
  avatar_url: string | null;
  role: Role;
  badges: Badge[];
  state: UserState;
  created_at: string;
};

const PERSON_COLUMNS = 'id,full_name,phone,avatar_url,role,badges,is_banned,banned_until,deleted_at,created_at';
type PersonRow = Pick<Tables<'profiles'>, 'id' | 'full_name' | 'phone' | 'avatar_url' | 'role' | 'badges' | 'is_banned' | 'banned_until' | 'deleted_at' | 'created_at'>;

function toPerson(p: PersonRow, displayName: string | null): AdminPerson {
  return {
    id: p.id,
    full_name: p.full_name.trim(),
    display_name: displayName,
    phone_masked: maskVnPhone(p.phone),
    avatar_url: p.avatar_url,
    role: (oneOf(ROLES, p.role) ? p.role : 'user') as Role,
    badges: p.badges.filter((b): b is Badge => oneOf(BADGES, b)),
    state: userState(p),
    created_at: p.created_at,
  };
}

async function people(client: Client, ids: string[]): Promise<Result<Map<string, AdminPerson>>> {
  const unique = [...new Set(ids)];
  if (unique.length === 0) return ok(new Map());
  const [res, names] = await Promise.all([client.from('profiles').select(PERSON_COLUMNS).in('id', unique), shortNames(client, unique)]);
  if (res.error) return fromSupabase<Map<string, AdminPerson>>({ data: null, error: res.error });
  return ok(new Map((res.data ?? []).map((p) => [p.id, toPerson(p, names.get(p.id) ?? null)])));
}

export type AdminBadgeRequest = Omit<Tables<'badge_requests'>, 'status' | 'badge'> & {
  status: BadgeRequestStatus;
  badge: Badge;
  user: AdminPerson | null;
  reviewer_name: string | null;
  /** Loại tệp theo đuôi path (ảnh / PDF); null khi giấy tờ đã bị purge-files xoá. */
  document_kind: 'image' | 'pdf' | null;
};

export type BadgeRequestQuery = PageInput & { status?: string; badge?: string };

export function documentKind(path: string | null): 'image' | 'pdf' | null {
  if (!path) return null;
  return /\.pdf$/i.test(path) ? 'pdf' : 'image';
}

/** Yêu cầu huy hiệu: chờ duyệt cũ trước (mặc định); đã xử lý mới xử lý trước. */
export async function listBadgeRequests(client: Client, input: BadgeRequestQuery = {}): Promise<Result<AdminPage<AdminBadgeRequest>>> {
  const w = pageWindow(input);
  const status: BadgeRequestStatus = oneOf(BADGE_REQUEST_STATUSES, input.status) ? input.status : 'pending';
  let q = client.from('badge_requests').select('*', { count: 'exact' }).eq('status', status);
  if (oneOf(BADGES, input.badge)) q = q.eq('badge', input.badge);
  q = status === 'pending' ? q.order('created_at', { ascending: true }) : q.order('reviewed_at', { ascending: false, nullsFirst: false });
  const res = rangeResult(await q.order('id').range(w.from, w.to));
  if (res.error) return res;
  const rows = res.data.rows;
  const [users, reviewers] = await Promise.all([people(client, rows.map((r) => r.user_id)), shortNames(client, rows.map((r) => r.reviewed_by))]);
  if (users.error) return users;
  return ok(
    toPage(
      rows.map((r) => ({
        ...r,
        status: (oneOf(BADGE_REQUEST_STATUSES, r.status) ? r.status : 'pending') as BadgeRequestStatus,
        badge: (oneOf(BADGES, r.badge) ? r.badge : 'worker') as Badge,
        user: users.data.get(r.user_id) ?? null,
        reviewer_name: r.reviewed_by ? (reviewers.get(r.reviewed_by) ?? null) : null,
        document_kind: documentKind(r.document_path),
      })),
      res.data.total,
      w,
    ),
  );
}

export async function countBadgeRequests(client: Client): Promise<Result<Record<BadgeRequestStatus, number>>> {
  const results = await Promise.all(
    BADGE_REQUEST_STATUSES.map((s) => client.from('badge_requests').select('id', { count: 'exact', head: true }).eq('status', s)),
  );
  const out = {} as Record<BadgeRequestStatus, number>;
  for (const [i, s] of BADGE_REQUEST_STATUSES.entries()) {
    const r = results[i];
    if (!r || r.error) return fromSupabase<Record<BadgeRequestStatus, number>>({ data: null, error: r?.error ?? { message: 'unknown' } });
    out[s] = r.count ?? 0;
  }
  return ok(out);
}

/**
 * Signed URL xem giấy tờ (bucket riêng tư verification; policy cho staff đọc). Ký bằng phiên staff, hết hạn sau
 * `expiresIn` giây (60–300). Path phải đúng dạng `{uuid}/{badge}/{ts}.{ext}`.
 */
export async function getVerificationDocumentUrl(
  client: Client,
  path: unknown,
  expiresIn: number = VERIFICATION_URL_TTL,
): Promise<Result<string>> {
  if (typeof path !== 'string' || !/^[0-9a-f-]{36}\/[a-z]+\/[0-9]{10,16}\.(webp|jpg|pdf)$/.test(path)) return fail('invalid_input');
  const ttl = Math.min(Math.max(60, Math.floor(expiresIn)), 300);
  const res = await client.storage.from('verification').createSignedUrl(path, ttl);
  if (res.error || !res.data?.signedUrl) {
    const status = String((res.error as { statusCode?: string | number } | null)?.statusCode ?? '');
    return fail(status === '404' || status === '400' ? 'not_found' : status === '403' ? 'forbidden' : 'unknown');
  }
  return ok(res.data.signedUrl);
}

/** Lấy path giấy tờ của một yêu cầu (đọc qua RLS) rồi ký URL — client không tự gửi path. */
export async function getBadgeDocumentUrl(client: Client, requestId: unknown): Promise<Result<{ url: string; kind: 'image' | 'pdf' }>> {
  if (!isUuid(requestId)) return fail('invalid_input');
  const row = await client.from('badge_requests').select('document_path').eq('id', requestId).maybeSingle();
  if (row.error) return fromSupabase<{ url: string; kind: 'image' | 'pdf' }>({ data: null, error: row.error });
  if (!row.data) return fail('not_found');
  const path = row.data.document_path;
  if (!path) return fail('document_missing');
  const url = await getVerificationDocumentUrl(client, path);
  if (url.error) return url;
  return ok({ url: url.data, kind: documentKind(path) ?? 'image' });
}

/**
 * Duyệt / từ chối (chỉ khi còn pending). Trigger: reviewed_by / reviewed_at, thêm huy hiệu vào hồ sơ khi duyệt,
 * audit `badge.approve|reject`, thông báo `system` cho người xin. Từ chối bắt buộc lý do (≤ 200).
 * Lỗi: invalid_input, reason_required, forbidden, conflict (đã được xử lý).
 */
export async function reviewBadgeRequest(
  client: Client,
  input: { id: unknown; approve: unknown; rejectReason?: unknown },
): Promise<Result<{ id: string; user_id: string; badge: string }>> {
  if (!isUuid(input.id) || typeof input.approve !== 'boolean') return fail('invalid_input');
  const reason = cleanText(input.rejectReason, 200);
  if (reason === undefined) return fail('too_long');
  if (!input.approve && !reason) return fail('reason_required');
  const res = await client
    .from('badge_requests')
    .update(input.approve ? { status: 'approved', reject_reason: null } : { status: 'rejected', reject_reason: reason })
    .eq('id', input.id)
    .eq('status', 'pending')
    .select('id,user_id,badge')
    .maybeSingle();
  if (res.error) return fromSupabase<{ id: string; user_id: string; badge: string }>({ data: null, error: res.error });
  if (!res.data) return fail('conflict');
  return ok(res.data);
}

// ── Người dùng ───────────────────────────────────────────────────────────────────
export type AdminUser = AdminPerson & {
  site: string | null;
  banned_until: string | null;
  rating_avg: number;
  rating_count: number;
  reputation_score: number;
};

export type UserQuery = PageInput & { q?: string; role?: string; state?: string; sort?: string };
export const USER_SORTS = ['created_at', 'full_name', 'reputation_score'] as const;

const USER_COLUMNS = `${PERSON_COLUMNS},site,rating_avg,rating_count,reputation_score`;

function toAdminUser(
  p: PersonRow & Pick<Tables<'profiles'>, 'site' | 'rating_avg' | 'rating_count' | 'reputation_score'>,
  displayName: string | null,
): AdminUser {
  return {
    ...toPerson(p, displayName),
    site: p.site,
    banned_until: p.banned_until,
    rating_avg: Number(p.rating_avg) || 0,
    rating_count: p.rating_count,
    reputation_score: p.reputation_score,
  };
}

/**
 * Tìm người dùng (staff): có ≥ 3 chữ số → theo SĐT (0912…, +84912…, 912…), còn lại theo họ tên. Lọc vai trò, tình trạng
 * (đang khoá tạm / bị cấm / đã xoá / bình thường). SĐT trả về đã che.
 */
export async function listUsers(client: Client, input: UserQuery = {}): Promise<Result<AdminPage<AdminUser>>> {
  const w = pageWindow(input);
  const sort = parseSort(input.sort, USER_SORTS, '-created_at');
  let q = client.from('profiles').select(USER_COLUMNS, { count: 'exact' });
  const term = sanitizeSearch(input.q);
  const digits = term.replace(/\D/g, '');
  if (digits.length >= 3 && digits.length === term.replace(/[\s+.-]/g, '').length) {
    // 0912 → 912 (DB lưu 84912…); 84912 / +84912 giữ nguyên.
    const national = digits.startsWith('0') ? digits.slice(1) : digits;
    q = q.ilike('phone', `%${national}%`);
  } else if (term) {
    q = q.ilike('full_name', `%${term}%`);
  }
  if (oneOf(ROLES, input.role)) q = q.eq('role', input.role);
  const nowIso = new Date().toISOString();
  switch (input.state) {
    case 'banned':
      q = q.eq('is_banned', true).is('deleted_at', null);
      break;
    case 'suspended':
      q = q.eq('is_banned', false).gt('banned_until', nowIso).is('deleted_at', null);
      break;
    case 'deleted':
      q = q.not('deleted_at', 'is', null);
      break;
    case 'active':
      q = q.eq('is_banned', false).or(`banned_until.is.null,banned_until.lte.${nowIso}`).is('deleted_at', null);
      break;
  }
  q = q.order(sort.column, { ascending: sort.ascending });
  const res = rangeResult(await q.order('id').range(w.from, w.to));
  if (res.error) return res;
  const names = await shortNames(client, res.data.rows.map((r) => r.id));
  return ok(toPage(res.data.rows.map((p) => toAdminUser(p, names.get(p.id) ?? null)), res.data.total, w));
}

export type AdminUserDetail = AdminUser & {
  stats: { listings: number; listings_active: number; groups_hosted: number; reports_against_open: number; reports_filed: number };
  badge_requests: Pick<Tables<'badge_requests'>, 'id' | 'badge' | 'status' | 'reject_reason' | 'created_at' | 'reviewed_at'>[];
};

/** Hồ sơ đầy đủ cho staff + số tin / nhóm / báo cáo + yêu cầu huy hiệu gần đây. */
export async function getAdminUser(client: Client, id: unknown): Promise<Result<AdminUserDetail>> {
  if (!isUuid(id)) return fail('invalid_input');
  const res = fromSupabase(await client.from('profiles').select(USER_COLUMNS).eq('id', id).maybeSingle(), true);
  if (res.error) return res;
  const profile = res.data;
  if (!profile) return fail('not_found');
  const head = { count: 'exact' as const, head: true };
  const [names, listings, active, groups, against, filed, badges] = await Promise.all([
    shortNames(client, [id]),
    client.from('listings').select('id', head).eq('owner_id', id).is('deleted_at', null),
    client.from('listings').select('id', head).eq('owner_id', id).eq('status', 'active').is('deleted_at', null),
    client.from('groups').select('id', head).eq('host_id', id).is('deleted_at', null),
    client.from('reports').select('id', head).eq('target_type', 'profile').eq('target_id', id).in('status', ['open', 'reviewing']),
    client.from('reports').select('id', head).eq('reporter_id', id),
    client.from('badge_requests').select('id,badge,status,reject_reason,created_at,reviewed_at').eq('user_id', id).order('created_at', { ascending: false }).limit(10),
  ]);
  for (const r of [listings, active, groups, against, filed, badges]) {
    if (r.error) return fromSupabase<AdminUserDetail>({ data: null, error: r.error });
  }
  return ok({
    ...toAdminUser(profile, names.get(id) ?? null),
    stats: {
      listings: listings.count ?? 0,
      listings_active: active.count ?? 0,
      groups_hosted: groups.count ?? 0,
      reports_against_open: against.count ?? 0,
      reports_filed: filed.count ?? 0,
    },
    badge_requests: badges.data ?? [],
  });
}

/** Vai trò + người đó đã xoá chưa (action kiểm "moderator không thao tác trên staff" trước khi ghi). */
export async function getUserRole(client: Client, id: unknown): Promise<Result<{ role: Role; deleted: boolean }>> {
  if (!isUuid(id)) return fail('invalid_input');
  const res = await client.from('profiles').select('role,deleted_at').eq('id', id).maybeSingle();
  if (res.error) return fromSupabase<{ role: Role; deleted: boolean }>({ data: null, error: res.error });
  if (!res.data) return fail('not_found');
  return ok({ role: (oneOf(ROLES, res.data.role) ? res.data.role : 'user') as Role, deleted: res.data.deleted_at !== null });
}

type ProfilePatch = Database['public']['Tables']['profiles']['Update'];

async function patchProfile(client: Client, userId: string, patch: ProfilePatch): Promise<Result<null>> {
  const res = await client.from('profiles').update(patch).eq('id', userId).select('id').maybeSingle();
  if (res.error) return fromSupabase<null>({ data: null, error: res.error });
  return res.data ? ok(null) : fail('not_found');
}

/** Khoá tạm N ngày (staff) hoặc mở khoá (`days: null`). Trigger audit `user.suspend|unsuspend` (meta.until). */
export async function suspendUser(client: Client, input: { userId: unknown; days: unknown }, now = Date.now()): Promise<Result<null>> {
  if (!isUuid(input.userId)) return fail('invalid_input');
  if (input.days !== null && !(SUSPEND_DAYS as readonly unknown[]).includes(input.days)) return fail('invalid_input');
  const until = typeof input.days === 'number' ? new Date(now + input.days * 86_400_000).toISOString() : null;
  return patchProfile(client, input.userId, { banned_until: until });
}

/** Cấm vĩnh viễn / bỏ cấm (chỉ admin — guard trigger chặn moderator). Audit `user.ban|unban`. */
export async function setUserBanned(client: Client, input: { userId: unknown; banned: unknown }): Promise<Result<null>> {
  if (!isUuid(input.userId) || typeof input.banned !== 'boolean') return fail('invalid_input');
  return patchProfile(client, input.userId, { is_banned: input.banned });
}

/** Đổi vai trò (chỉ admin). Audit `user.role` (meta from / to). */
export async function setUserRole(client: Client, input: { userId: unknown; role: unknown }): Promise<Result<null>> {
  if (!isUuid(input.userId) || !oneOf(ROLES, input.role)) return fail('invalid_input');
  return patchProfile(client, input.userId, { role: input.role });
}

/** Đặt lại danh sách huy hiệu (staff). Audit `user.badges` (meta from / to). */
export async function setUserBadges(client: Client, input: { userId: unknown; badges: unknown }): Promise<Result<null>> {
  if (!isUuid(input.userId) || !Array.isArray(input.badges) || !input.badges.every((b) => oneOf(BADGES, b))) return fail('invalid_input');
  const badges = [...new Set(input.badges as Badge[])].sort();
  return patchProfile(client, input.userId, { badges });
}

// ── Tin đăng ─────────────────────────────────────────────────────────────────────
export type AdminListing = Pick<
  Tables<'listings'>,
  'id' | 'short_id' | 'slug' | 'title' | 'price' | 'price_type' | 'site' | 'images' | 'owner_id' | 'created_at' | 'updated_at' | 'expires_at' | 'view_count' | 'moderation_reasons'
> & { category: ListingCategory; status: ListingStatus; owner_name: string | null };

export type AdminListingQuery = PageInput & { q?: string; status?: string; category?: string; site?: string; owner?: string; sort?: string };
export const LISTING_SORTS = ['created_at', 'updated_at', 'view_count', 'price'] as const;
const ADMIN_LISTING_COLUMNS =
  'id,short_id,slug,title,category,status,price,price_type,site,images,owner_id,created_at,updated_at,expires_at,view_count,moderation_reasons';

/** Mọi tin (staff đọc mọi trạng thái, trừ đã xoá mềm). Tìm theo tiêu đề hoặc mã ngắn. */
export async function listAdminListings(client: Client, input: AdminListingQuery = {}): Promise<Result<AdminPage<AdminListing>>> {
  const w = pageWindow(input);
  const sort = parseSort(input.sort, LISTING_SORTS, '-created_at');
  let q = client.from('listings').select(ADMIN_LISTING_COLUMNS, { count: 'exact' }).is('deleted_at', null);
  const term = sanitizeSearch(input.q);
  if (term) q = /^[a-z0-9]{4,12}$/i.test(term) ? q.or(`title.ilike.%${term}%,short_id.eq.${term}`) : q.ilike('title', `%${term}%`);
  if (oneOf(LISTING_STATUSES, input.status)) q = q.eq('status', input.status);
  if (oneOf(LISTING_CATEGORIES, input.category)) q = q.eq('category', input.category);
  if (typeof input.site === 'string' && /^[a-z0-9_]{1,40}$/.test(input.site)) q = q.eq('site', input.site);
  if (isUuid(input.owner)) q = q.eq('owner_id', input.owner);
  q = q.order(sort.column, { ascending: sort.ascending, nullsFirst: false });
  const res = rangeResult(await q.order('id').range(w.from, w.to));
  if (res.error) return res;
  const names = await shortNames(client, res.data.rows.map((r) => r.owner_id));
  return ok(toPage(res.data.rows.map((l) => ({ ...l, owner_name: names.get(l.owner_id) ?? null })), res.data.total, w));
}

/** Ẩn (closed) / mở lại (active) / từ chối tin ngoài hàng chờ (RPC, audit `listing.status`). Lỗi: not_found, forbidden. */
export async function staffSetListingStatus(
  client: Client,
  input: { listingId: unknown; status: unknown; note?: unknown },
): Promise<Result<null>> {
  if (!isUuid(input.listingId) || !oneOf(STAFF_LISTING_STATUSES, input.status)) return fail('invalid_input');
  const note = cleanText(input.note, ADMIN_NOTE_MAX);
  if (note === undefined) return fail('too_long');
  const res = await client.rpc('staff_set_listing_status', {
    p_listing_id: input.listingId,
    p_status: input.status,
    ...(note ? { p_note: note } : {}),
  });
  return res.error ? fromSupabase<null>({ data: null, error: res.error }) : ok(null);
}

// ── Nhóm ghép ────────────────────────────────────────────────────────────────────
export type AdminGroup = Pick<
  Tables<'groups'>,
  'id' | 'short_id' | 'slug' | 'title' | 'sub_kind' | 'starts_at' | 'seats_total' | 'seats_taken' | 'host_id' | 'site' | 'origin_text' | 'destination_text' | 'created_at'
> & { kind: GroupKind; status: GroupStatus; host_name: string | null };

export type AdminGroupQuery = PageInput & { q?: string; kind?: string; status?: string; host?: string; sort?: string };
export const GROUP_SORTS = ['starts_at', 'created_at'] as const;
const ADMIN_GROUP_COLUMNS =
  'id,short_id,slug,title,kind,sub_kind,status,starts_at,seats_total,seats_taken,host_id,site,origin_text,destination_text,created_at';

export async function listAdminGroups(client: Client, input: AdminGroupQuery = {}): Promise<Result<AdminPage<AdminGroup>>> {
  const w = pageWindow(input);
  const sort = parseSort(input.sort, GROUP_SORTS, '-created_at');
  let q = client.from('groups').select(ADMIN_GROUP_COLUMNS, { count: 'exact' }).is('deleted_at', null);
  const term = sanitizeSearch(input.q);
  if (term) q = /^[a-z0-9]{4,12}$/i.test(term) ? q.or(`title.ilike.%${term}%,short_id.eq.${term}`) : q.ilike('title', `%${term}%`);
  if (oneOf(GROUP_KINDS, input.kind)) q = q.eq('kind', input.kind);
  if (oneOf(GROUP_STATUSES, input.status)) q = q.eq('status', input.status);
  if (isUuid(input.host)) q = q.eq('host_id', input.host);
  q = q.order(sort.column, { ascending: sort.ascending });
  const res = rangeResult(await q.order('id').range(w.from, w.to));
  if (res.error) return res;
  const names = await shortNames(client, res.data.rows.map((r) => r.host_id));
  return ok(toPage(res.data.rows.map((g) => ({ ...g, host_name: names.get(g.host_id) ?? null })), res.data.total, w));
}

/** Huỷ nhóm vi phạm (RPC, audit `group.cancel`, thành viên nhận group_cancelled). Lỗi: not_found, group_closed. */
export async function staffCancelGroup(client: Client, input: { groupId: unknown; note?: unknown }): Promise<Result<null>> {
  if (!isUuid(input.groupId)) return fail('invalid_input');
  const note = cleanText(input.note, ADMIN_NOTE_MAX);
  if (note === undefined) return fail('too_long');
  const res = await client.rpc('staff_cancel_group', { p_group_id: input.groupId, ...(note ? { p_note: note } : {}) });
  return res.error ? fromSupabase<null>({ data: null, error: res.error }) : ok(null);
}

// ── Danh mục: khu (sites) ────────────────────────────────────────────────────────
export type AdminSite = Pick<Tables<'sites'>, 'code' | 'name' | 'is_active' | 'sort_order' | 'created_at' | 'updated_at'>;

/** Mọi khu (admin thấy cả khu đang ẩn — policy sites_select_active_or_admin). */
export async function listAdminSites(client: Client): Promise<Result<AdminSite[]>> {
  const res = fromSupabase<AdminSite[]>(
    await client.from('sites').select('code,name,is_active,sort_order,created_at,updated_at').order('sort_order').order('name'),
  );
  return res.error ? res : ok(res.data ?? []);
}

const point = (lat: number, lng: number) => `SRID=4326;POINT(${lng} ${lat})`;
const validLatLng = (lat: unknown, lng: unknown): lat is number =>
  typeof lat === 'number' && typeof lng === 'number' && Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;

/** Thêm khu (admin). Mã `[a-z0-9_]` (dùng trong URL / hồ sơ, không đổi sau khi tạo). Trigger audit `site.*`. */
export async function createSite(
  client: Client,
  input: { code: unknown; name: unknown; lat: unknown; lng: unknown; sortOrder?: unknown },
): Promise<Result<AdminSite>> {
  const name = cleanText(input.name, 80);
  if (typeof input.code !== 'string' || !/^[a-z0-9_]{2,40}$/.test(input.code) || !name || !validLatLng(input.lat, input.lng)) {
    return fail('invalid_input');
  }
  const sort = Number.isInteger(input.sortOrder) ? (input.sortOrder as number) : 0;
  return fromSupabase<AdminSite>(
    await client
      .from('sites')
      .insert({ code: input.code, name, location: point(input.lat, input.lng as number), sort_order: sort })
      .select('code,name,is_active,sort_order,created_at,updated_at')
      .single(),
  );
}

/** Sửa tên / thứ tự / ẩn hiện / toạ độ khu (admin). Ưu tiên ẩn thay vì xoá (hồ sơ giữ khu đã chọn). */
export async function updateSite(
  client: Client,
  input: { code: unknown; name?: unknown; sortOrder?: unknown; isActive?: unknown; lat?: unknown; lng?: unknown },
): Promise<Result<null>> {
  if (typeof input.code !== 'string' || !/^[a-z0-9_]{1,40}$/.test(input.code)) return fail('invalid_input');
  const patch: Database['public']['Tables']['sites']['Update'] = {};
  if (input.name !== undefined) {
    const name = cleanText(input.name, 80);
    if (!name) return fail('invalid_input');
    patch.name = name;
  }
  if (input.sortOrder !== undefined) {
    if (!Number.isInteger(input.sortOrder)) return fail('invalid_input');
    patch.sort_order = input.sortOrder as number;
  }
  if (input.isActive !== undefined) {
    if (typeof input.isActive !== 'boolean') return fail('invalid_input');
    patch.is_active = input.isActive;
  }
  if (input.lat !== undefined || input.lng !== undefined) {
    if (!validLatLng(input.lat, input.lng)) return fail('invalid_input');
    patch.location = point(input.lat, input.lng as number);
  }
  if (Object.keys(patch).length === 0) return fail('invalid_input');
  const res = await client.from('sites').update(patch).eq('code', input.code).select('code').maybeSingle();
  if (res.error) return fromSupabase<null>({ data: null, error: res.error });
  return res.data ? ok(null) : fail('forbidden');
}

// ── Danh mục: sân (venues) ───────────────────────────────────────────────────────
export type AdminVenue = Omit<Tables<'venues'>, 'location' | 'status' | 'sports'> & {
  status: VenueStatus;
  sports: VenueSport[];
  creator_name: string | null;
  reviewer_name: string | null;
};

export type AdminVenueQuery = PageInput & { status?: string; q?: string; hidden?: boolean };
const VENUE_COLUMNS =
  'id,name,sports,site,address_text,price_ref,phone,status,reject_reason,created_by,reviewed_by,reviewed_at,created_at,updated_at,deleted_at';

/** Sân theo trạng thái (mặc định chờ duyệt, cũ trước). `hidden: true` → chỉ sân đã ẩn. SĐT sân là số cơ sở (không che). */
export async function listAdminVenues(client: Client, input: AdminVenueQuery = {}): Promise<Result<AdminPage<AdminVenue>>> {
  const w = pageWindow(input);
  let q = client.from('venues').select(VENUE_COLUMNS, { count: 'exact' });
  if (input.hidden) q = q.not('deleted_at', 'is', null);
  else {
    q = q.is('deleted_at', null);
    const status: VenueStatus = oneOf(VENUE_STATUSES, input.status) ? input.status : 'pending';
    q = q.eq('status', status);
  }
  const term = sanitizeSearch(input.q);
  if (term) q = q.ilike('name', `%${term}%`);
  q = input.status === 'pending' || input.status === undefined ? q.order('created_at', { ascending: true }) : q.order('updated_at', { ascending: false });
  const res = rangeResult(await q.order('id').range(w.from, w.to));
  if (res.error) return res;
  const rows = res.data.rows;
  const names = await shortNames(client, rows.flatMap((r) => [r.created_by, r.reviewed_by]));
  return ok(
    toPage(
      rows.map((v) => ({
        ...v,
        status: (oneOf(VENUE_STATUSES, v.status) ? v.status : 'pending') as VenueStatus,
        sports: v.sports.filter((s): s is VenueSport => oneOf(VENUE_SPORTS, s)),
        creator_name: v.created_by ? (names.get(v.created_by) ?? null) : null,
        reviewer_name: v.reviewed_by ? (names.get(v.reviewed_by) ?? null) : null,
      })),
      res.data.total,
      w,
    ),
  );
}

async function patchVenue(client: Client, id: string, patch: Database['public']['Tables']['venues']['Update']): Promise<Result<null>> {
  const res = await client.from('venues').update(patch).eq('id', id).select('id').maybeSingle();
  if (res.error) return fromSupabase<null>({ data: null, error: res.error });
  return res.data ? ok(null) : fail('not_found');
}

/** Duyệt / từ chối sân (staff). Trigger: reviewed_by / at + audit `venue.approve|reject`. Từ chối cần lý do (≤ 200). */
export async function reviewVenue(client: Client, input: { id: unknown; approve: unknown; rejectReason?: unknown }): Promise<Result<null>> {
  if (!isUuid(input.id) || typeof input.approve !== 'boolean') return fail('invalid_input');
  const reason = cleanText(input.rejectReason, 200);
  if (reason === undefined) return fail('too_long');
  if (!input.approve && !reason) return fail('reason_required');
  return patchVenue(client, input.id, input.approve ? { status: 'approved', reject_reason: null } : { status: 'rejected', reject_reason: reason });
}

/** Sửa thông tin sân (staff). Audit `venue.update`. */
export async function updateVenue(
  client: Client,
  input: { id: unknown; name: unknown; sports: unknown; site?: unknown; addressText?: unknown; priceRef?: unknown; phone?: unknown },
): Promise<Result<null>> {
  if (!isUuid(input.id)) return fail('invalid_input');
  const name = cleanText(input.name, 120);
  const address = cleanText(input.addressText, 200);
  const phone = cleanText(input.phone, 20);
  if (!name || name.length < 2 || address === undefined || phone === undefined) return fail('invalid_input');
  if (!Array.isArray(input.sports) || input.sports.length < 1 || input.sports.length > 3 || !input.sports.every((s) => oneOf(VENUE_SPORTS, s))) {
    return fail('invalid_input');
  }
  if (phone && !/^\+?[0-9][0-9 .]{7,14}$/.test(phone)) return fail('phone_invalid');
  const price = input.priceRef === null || input.priceRef === undefined || input.priceRef === '' ? null : Number(input.priceRef);
  if (price !== null && (!Number.isInteger(price) || price < 0 || price > 100_000_000)) return fail('invalid_input');
  const site = input.site === null || input.site === undefined || input.site === '' ? null : input.site;
  if (site !== null && (typeof site !== 'string' || !/^[a-z0-9_]{1,40}$/.test(site))) return fail('invalid_input');
  return patchVenue(client, input.id, {
    name,
    sports: [...new Set(input.sports as VenueSport[])],
    site,
    address_text: address,
    price_ref: price,
    phone,
  });
}

/** Ẩn sân (deleted_at — không xoá cứng) / hiện lại. Audit `venue.hide`. */
export async function setVenueHidden(client: Client, input: { id: unknown; hidden: unknown }, now = new Date()): Promise<Result<null>> {
  if (!isUuid(input.id) || typeof input.hidden !== 'boolean') return fail('invalid_input');
  return patchVenue(client, input.id, { deleted_at: input.hidden ? now.toISOString() : null });
}

// ── Danh mục: từ khoá cấm ────────────────────────────────────────────────────────
export type AdminKeyword = Omit<Tables<'banned_keywords'>, 'action' | 'categories'> & {
  action: KeywordAction;
  categories: ListingCategory[] | null;
};

/** Mọi từ khoá (staff đọc; bảng nhỏ, không phân trang). */
export async function listBannedKeywords(client: Client, input: { q?: string; action?: string } = {}): Promise<Result<AdminKeyword[]>> {
  let q = client.from('banned_keywords').select('id,keyword,action,categories,created_by,created_at,updated_at');
  const term = sanitizeSearch(input.q);
  if (term) q = q.ilike('keyword', `%${term}%`);
  if (oneOf(KEYWORD_ACTIONS, input.action)) q = q.eq('action', input.action);
  const res = await q.order('keyword').limit(500);
  if (res.error) return fromSupabase<AdminKeyword[]>({ data: null, error: res.error });
  return ok(
    (res.data ?? []).map((k) => ({
      ...k,
      action: (oneOf(KEYWORD_ACTIONS, k.action) ? k.action : 'review') as KeywordAction,
      categories: k.categories ? k.categories.filter((c): c is ListingCategory => oneOf(LISTING_CATEGORIES, c)) : null,
    })),
  );
}

function keywordFields(input: { keyword?: unknown; action: unknown; categories?: unknown }) {
  if (!oneOf(KEYWORD_ACTIONS, input.action)) return null;
  let categories: ListingCategory[] | null = null;
  if (input.categories !== undefined && input.categories !== null) {
    if (!Array.isArray(input.categories) || !input.categories.every((c) => oneOf(LISTING_CATEGORIES, c))) return null;
    categories = input.categories.length ? [...new Set(input.categories as ListingCategory[])] : null;
  }
  return { action: input.action, categories };
}

/** Thêm từ khoá (admin). 2–60 ký tự, chỉ chữ / số / khoảng trắng; trùng (bỏ dấu) → conflict. Audit `keyword.insert`. */
export async function createBannedKeyword(
  client: Client,
  input: { keyword: unknown; action: unknown; categories?: unknown },
): Promise<Result<{ id: string }>> {
  const keyword = cleanText(input.keyword, 60);
  const fields = keywordFields(input);
  if (!keyword || keyword.length < 2 || !/^[\p{L}\p{N} ]+$/u.test(keyword) || !fields) return fail('invalid_input');
  return fromSupabase<{ id: string }>(
    await client.from('banned_keywords').insert({ keyword: keyword.toLowerCase(), ...fields }).select('id').single(),
  );
}

/** Đổi hành động / danh mục áp dụng của từ khoá (admin). Audit `keyword.update`. */
export async function updateBannedKeyword(
  client: Client,
  input: { id: unknown; action: unknown; categories?: unknown },
): Promise<Result<null>> {
  const fields = keywordFields(input);
  if (!isUuid(input.id) || !fields) return fail('invalid_input');
  const res = await client.from('banned_keywords').update(fields).eq('id', input.id).select('id').maybeSingle();
  if (res.error) return fromSupabase<null>({ data: null, error: res.error });
  return res.data ? ok(null) : fail('forbidden');
}

/** Gỡ từ khoá (admin) — cấu hình, không phải nội dung người dùng; audit `keyword.delete` giữ lại từ khoá đã gỡ. */
export async function deleteBannedKeyword(client: Client, id: unknown): Promise<Result<null>> {
  if (!isUuid(id)) return fail('invalid_input');
  const res = await client.from('banned_keywords').delete().eq('id', id).select('id').maybeSingle();
  if (res.error) return fromSupabase<null>({ data: null, error: res.error });
  return res.data ? ok(null) : fail('forbidden');
}

// ── Banner (marketing) ───────────────────────────────────────────────────────────
export const BANNER_PLACEMENTS = ['app_home', 'web_home', 'web_listing', 'app_pass', 'web_pass'] as const;
export type AdminBannerPlacement = (typeof BANNER_PLACEMENTS)[number];
export const BANNER_TONES = ['primary', 'accent', 'pass', 'room', 'job', 'lost-found', 'ride', 'sport'] as const;
export type BannerTone = (typeof BANNER_TONES)[number];

export type AdminBanner = Omit<Tables<'banners'>, 'placement' | 'tone'> & { placement: AdminBannerPlacement; tone: BannerTone };

/** Mọi banner (admin thấy cả banner tắt / hết hạn — policy banners_select_live). */
export async function listAdminBanners(client: Client, input: { placement?: string } = {}): Promise<Result<AdminBanner[]>> {
  let q = client.from('banners').select('*');
  if (oneOf(BANNER_PLACEMENTS, input.placement)) q = q.eq('placement', input.placement);
  const res = await q.order('placement').order('sort').order('created_at', { ascending: false }).limit(200);
  if (res.error) return fromSupabase<AdminBanner[]>({ data: null, error: res.error });
  return ok(
    (res.data ?? []).map((b) => ({
      ...b,
      placement: (oneOf(BANNER_PLACEMENTS, b.placement) ? b.placement : 'web_home') as AdminBannerPlacement,
      tone: (oneOf(BANNER_TONES, b.tone) ? b.tone : 'primary') as BannerTone,
    })),
  );
}

export type BannerInput = {
  id?: unknown;
  placement: unknown;
  locale?: unknown;
  title: unknown;
  subtitle?: unknown;
  ctaLabel?: unknown;
  linkUrl?: unknown;
  tone?: unknown;
  startsAt?: unknown;
  endsAt?: unknown;
  isActive?: unknown;
  sort?: unknown;
};

const isoOrNull = (v: unknown): string | null | undefined => {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v !== 'string') return undefined;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
};

/** Tạo / sửa banner (admin; ảnh banner chưa có trên web — dùng bản không ảnh). Trigger audit `banner.insert|update`. */
export async function saveBanner(client: Client, input: BannerInput): Promise<Result<{ id: string }>> {
  const title = cleanText(input.title, 80);
  const subtitle = cleanText(input.subtitle, 160);
  const cta = cleanText(input.ctaLabel, 30);
  const link = cleanText(input.linkUrl, 300);
  const startsAt = isoOrNull(input.startsAt);
  const endsAt = isoOrNull(input.endsAt);
  const locale = input.locale === null || input.locale === undefined || input.locale === '' ? null : input.locale;
  if (
    !title || subtitle === undefined || cta === undefined || link === undefined || startsAt === undefined || endsAt === undefined ||
    !oneOf(BANNER_PLACEMENTS, input.placement) || (locale !== null && !oneOf(['vi', 'en', 'zh'] as const, locale)) ||
    (input.tone !== undefined && !oneOf(BANNER_TONES, input.tone)) || (input.id !== undefined && !isUuid(input.id))
  ) {
    return fail('invalid_input');
  }
  if (link && !/^(\/[^\s]*|https:\/\/[^\s]+)$/.test(link)) return fail('invalid_input');
  if (startsAt && endsAt && endsAt <= startsAt) return fail('invalid_input');
  const row = {
    placement: input.placement,
    locale: locale as 'vi' | 'en' | 'zh' | null,
    title,
    subtitle,
    cta_label: cta,
    link_url: link,
    tone: oneOf(BANNER_TONES, input.tone) ? input.tone : 'primary',
    starts_at: startsAt,
    ends_at: endsAt,
    is_active: typeof input.isActive === 'boolean' ? input.isActive : true,
    sort: Number.isInteger(input.sort) ? (input.sort as number) : 0,
  };
  if (isUuid(input.id)) {
    const res = await client.from('banners').update(row).eq('id', input.id).select('id').maybeSingle();
    if (res.error) return fromSupabase<{ id: string }>({ data: null, error: res.error });
    return res.data ? ok(res.data) : fail('forbidden');
  }
  return fromSupabase<{ id: string }>(await client.from('banners').insert(row).select('id').single());
}

/** Bật / tắt banner (admin). */
export async function setBannerActive(client: Client, input: { id: unknown; active: unknown }): Promise<Result<null>> {
  if (!isUuid(input.id) || typeof input.active !== 'boolean') return fail('invalid_input');
  const res = await client.from('banners').update({ is_active: input.active }).eq('id', input.id).select('id').maybeSingle();
  if (res.error) return fromSupabase<null>({ data: null, error: res.error });
  return res.data ? ok(null) : fail('forbidden');
}

// ── Lead (marketing) ─────────────────────────────────────────────────────────────
export type AdminLead = Omit<Tables<'marketing_leads'>, 'kind' | 'status' | 'utm'> & {
  kind: LeadKind;
  status: LeadStatus;
  utm: Record<string, string>;
  handler_name: string | null;
};
export type LeadQuery = PageInput & { status?: string; kind?: string; q?: string };
export const LEAD_EXPORT_MAX = 10000;

const utmRecord = (v: Json): Record<string, string> =>
  v && typeof v === 'object' && !Array.isArray(v)
    ? Object.fromEntries(Object.entries(v).flatMap(([k, x]) => (typeof x === 'string' ? [[k, x] as const] : [])))
    : {};

/** Lead (moderator+ — policy marketing_leads_select_staff). Mặc định lead mới, cũ trước để xử lý theo thứ tự. */
export async function listLeads(client: Client, input: LeadQuery = {}): Promise<Result<AdminPage<AdminLead>>> {
  const w = pageWindow(input);
  let q = client.from('marketing_leads').select('*', { count: 'exact' });
  if (oneOf(LEAD_STATUSES, input.status)) q = q.eq('status', input.status);
  if (oneOf(LEAD_KINDS, input.kind)) q = q.eq('kind', input.kind);
  const search = sanitizeSearch(input.q);
  if (search) q = q.or(`contact.ilike.*${search}*,name.ilike.*${search}*`);
  const r = rangeResult(await q.order('created_at', { ascending: input.status === 'new' || !input.status }).range(w.from, w.to));
  if (r.error) return fail(r.error.code, r.error.message);
  const names = await shortNames(client, r.data.rows.map((l) => l.handled_by));
  return ok(
    toPage(
      r.data.rows.map((l) => ({
        ...l,
        kind: (oneOf(LEAD_KINDS, l.kind) ? l.kind : 'user') as LeadKind,
        status: (oneOf(LEAD_STATUSES, l.status) ? l.status : 'new') as LeadStatus,
        utm: utmRecord(l.utm),
        handler_name: l.handled_by ? (names.get(l.handled_by) ?? null) : null,
      })),
      r.data.total,
      w,
    ),
  );
}

/** Đổi trạng thái / ghi chú lead (moderator+). Trigger ghi người xử lý + audit `lead.update`. */
export async function updateLead(client: Client, input: LeadUpdateInput): Promise<Result<null>> {
  const parsed = LeadUpdateInput.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'invalid_input');
  const v = parsed.data;
  const res = await client
    .from('marketing_leads')
    .update({ status: v.status, ...(v.note !== undefined ? { note: v.note || null } : {}) })
    .eq('id', v.id)
    .select('id')
    .maybeSingle();
  if (res.error) return fromSupabase<null>({ data: null, error: res.error });
  return res.data ? ok(null) : fail('forbidden');
}

export type LeadExportRow = Database['public']['Functions']['export_marketing_leads']['Returns'][number];

/** Xuất lead (admin, RPC export_marketing_leads ghi audit `lead.export`). Ngày theo giờ VN như nhật ký. */
export async function exportLeads(
  client: Client,
  input: { from?: string; to?: string; status?: string; limit?: number } = {},
): Promise<Result<LeadExportRow[]>> {
  const from = vnDayStart(input.from);
  const to = vnDayStart(input.to, 1);
  const limit = Math.min(Math.max(1, Math.floor(input.limit ?? 5000)), LEAD_EXPORT_MAX);
  const res = await client.rpc('export_marketing_leads', {
    ...(from ? { p_from: from } : {}),
    ...(to ? { p_to: to } : {}),
    ...(oneOf(LEAD_STATUSES, input.status) ? { p_status: input.status } : {}),
    p_limit: limit,
  });
  if (res.error) return fromSupabase<LeadExportRow[]>({ data: null, error: res.error });
  return ok(res.data ?? []);
}

/** CSV lead (cùng quy tắc csvCell / BOM với nhật ký). */
export function leadsCsv(rows: LeadExportRow[]): string {
  const header = ['id', 'created_at', 'kind', 'name', 'contact', 'contact_type', 'site', 'message', 'source', 'locale', 'utm', 'status', 'note', 'handled_at'];
  const lines = rows.map((r) =>
    [r.id, r.created_at, r.kind, r.name, r.contact, r.contact_type, r.site, r.message, r.source, r.locale, r.utm, r.status, r.note, r.handled_at]
      .map(csvCell)
      .join(','),
  );
  return `﻿${[header.join(','), ...lines].join('\r\n')}\r\n`;
}

// ── Audit log ────────────────────────────────────────────────────────────────────
export type AuditEntry = Tables<'audit_log'> & { actor_name: string | null };
export type AuditQuery = PageInput & { from?: string; to?: string; action?: string; actor?: string; target?: string };

/** `2026-11-03` → ISO đầu ngày (giờ VN, +07:00). Sai định dạng → undefined. */
export function vnDayStart(v: unknown, addDays = 0): string | undefined {
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return undefined;
  const d = new Date(`${v}T00:00:00+07:00`);
  if (Number.isNaN(d.getTime())) return undefined;
  return new Date(d.getTime() + addDays * 86_400_000).toISOString();
}
const actionPrefix = (v: unknown) => (typeof v === 'string' && /^[a-z_]{1,30}(\.[a-z_]{0,30})?$/.test(v) ? v : undefined);

/** Nhật ký (admin — policy audit_log_select_admin): lọc ngày (giờ VN, `to` tính hết ngày), tiền tố hành động, người làm. */
export async function listAuditLog(client: Client, input: AuditQuery = {}): Promise<Result<AdminPage<AuditEntry>>> {
  const w = pageWindow(input);
  let q = client.from('audit_log').select('*', { count: 'exact' });
  const from = vnDayStart(input.from);
  const to = vnDayStart(input.to, 1);
  const prefix = actionPrefix(input.action);
  if (from) q = q.gte('created_at', from);
  if (to) q = q.lt('created_at', to);
  if (prefix) q = q.like('action', `${prefix}%`);
  if (isUuid(input.actor)) q = q.eq('actor_id', input.actor);
  if (typeof input.target === 'string' && /^[\w-]{1,64}$/.test(input.target)) q = q.eq('target_id', input.target);
  const res = rangeResult(await q.order('created_at', { ascending: false }).order('id', { ascending: false }).range(w.from, w.to));
  if (res.error) return res;
  const names = await shortNames(client, res.data.rows.map((r) => r.actor_id));
  return ok(toPage(res.data.rows.map((r) => ({ ...r, actor_name: r.actor_id ? (names.get(r.actor_id) ?? null) : null })), res.data.total, w));
}

export type AuditExportRow = Database['public']['Functions']['export_audit_log']['Returns'][number];

/** Xuất audit (admin, RPC ghi `audit.export`). ≤ 10.000 dòng, mới nhất trước. */
export async function exportAuditLog(
  client: Client,
  input: { from?: string; to?: string; action?: string; limit?: number } = {},
): Promise<Result<AuditExportRow[]>> {
  const from = vnDayStart(input.from);
  const to = vnDayStart(input.to, 1);
  const prefix = actionPrefix(input.action);
  const limit = Math.min(Math.max(1, Math.floor(input.limit ?? 5000)), AUDIT_EXPORT_MAX);
  const res = await client.rpc('export_audit_log', {
    ...(from ? { p_from: from } : {}),
    ...(to ? { p_to: to } : {}),
    ...(prefix ? { p_action_prefix: prefix } : {}),
    p_limit: limit,
  });
  if (res.error) return fromSupabase<AuditExportRow[]>({ data: null, error: res.error });
  return ok(res.data ?? []);
}

/** Một ô CSV: bọc ngoặc kép, nhân đôi ngoặc kép; chặn công thức (=, +, -, @ đầu ô) khi mở bằng Excel. */
export function csvCell(value: unknown): string {
  let s = value === null || value === undefined ? '' : typeof value === 'string' ? value : JSON.stringify(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}

/** CSV (UTF-8 có BOM để Excel đọc đúng tiếng Việt), dòng phân cách CRLF. */
export function auditCsv(rows: AuditExportRow[]): string {
  const header = ['id', 'created_at', 'actor_id', 'actor_name', 'action', 'target_type', 'target_id', 'meta'];
  const lines = rows.map((r) =>
    [r.id, r.created_at, r.actor_id, r.actor_name, r.action, r.target_type, r.target_id, r.meta].map(csvCell).join(','),
  );
  return `﻿${[header.join(','), ...lines].join('\r\n')}\r\n`;
}
