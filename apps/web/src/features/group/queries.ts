// Đọc nhóm ghép phía server cho trang công khai (/ghep-xe, /ghep-tran, /nhom/[slug]).
// Chỉ gọi @hp/core với client ẩn danh (createPublicClient — không cookie) để cache được bằng 'use cache'
// (.claude/rules/web-routing-rsc.md):
// - Danh sách: trang đầu không từ khoá / không khoảng giờ cache 60s + tag `groups` (giờ khởi hành trôi qua nhanh hơn tin
//   đăng nên ngắn hơn 300s của tin). Có từ khoá hoặc ?when= (khoảng giờ tính theo "bây giờ") → đọc theo request.
// - Chi tiết: 300s + tag `group:{id}` (webhook trg_groups_revalidate → /api/revalidate, Server Action → updateTag).
// - Lỗi (mạng, DB) được NÉM ra trong hàm cache để không bị cache; trang hiện error.tsx (thử lại). "Không thấy" → null.
// - Hàm cache trả kèm `now` (thời điểm đọc) cho nhãn "đã tới giờ": Cache Components không cho new Date() khi prerender.
// - Khu đăng nhập (/toi/nhom-cua-toi): client theo cookie phiên, đọc theo request, KHÔNG 'use cache'.
import 'server-only';
import {
  getGroup,
  getGroupBySlug,
  type GroupPage,
  listMyGroups,
  type MyGroupPage,
  type MyGroupsTab,
  type PublicGroup,
  type Result,
  searchGroups,
} from '@hp/core';
import type { GroupKind, GroupSubKind } from '@hp/shared';
import { cacheLife, cacheTag } from 'next/cache';
import { createPublicClient } from '@/lib/supabase/public';
import { createServerClient } from '@/lib/supabase/server';
import { type GroupFilterState, NO_GROUP_FILTERS, toGroupFilters } from './filters';

/** Số nhóm mỗi trang: chia hết cho lưới 1 / 2 / 3 cột. */
export const GROUP_PAGE_SIZE = 24;

export type Timed<T> = T & { now: number };

function unwrap<T>(result: Result<T>): T {
  if (result.error) throw new Error(result.error.code);
  return result.data;
}

async function fetchGroupPage(kind: GroupKind, filters: GroupFilterState): Promise<GroupPage> {
  return unwrap(await searchGroups(createPublicClient(), { kind, ...toGroupFilters(filters), limit: GROUP_PAGE_SIZE }));
}

/** Trang đầu theo loại con / "hiện cả nhóm đủ người": tập tham số hữu hạn → cache 60s. */
async function getCachedGroupPage(kind: GroupKind, sub: GroupSubKind | null, includeFull: boolean) {
  'use cache';
  cacheLife({ revalidate: 60 });
  cacheTag('groups');
  const page = await fetchGroupPage(kind, { ...NO_GROUP_FILTERS, sub, includeFull });
  return { page, now: Date.now() };
}

/** Trang đầu của danh sách. Có từ khoá / khoảng giờ → đọc theo request; chỉ gọi sau khi đã đọc searchParams. */
export async function getGroupListPage(kind: GroupKind, filters: GroupFilterState): Promise<Timed<{ page: GroupPage }>> {
  if (!filters.query && !filters.when) return getCachedGroupPage(kind, filters.sub, filters.includeFull);
  const page = await fetchGroupPage(kind, filters);
  return { page, now: Date.now() };
}

/**
 * Chi tiết theo slug `{tieu-de}-{short_id}` (RPC so short_id cuối slug; trả slug chuẩn để trang redirect 301).
 * Gồm cả nhóm đã đủ / đã tới giờ / đã huỷ (trang hiện nhãn). null = không có / đã xoá / chủ nhóm bị khoá.
 */
export async function getGroupPage(slug: string): Promise<Timed<{ group: PublicGroup | null }>> {
  'use cache';
  cacheLife({ revalidate: 300 });
  cacheTag('groups');
  const result = await getGroupBySlug(createPublicClient(), slug);
  if (result.error && result.error.code !== 'not_found') throw new Error(result.error.code);
  if (result.data) cacheTag(`group:${result.data.id}`);
  return { group: result.data, now: Date.now() };
}

/** Slug chuẩn theo id (thông báo chỉ mang id nhóm → /nhom/id/[id] chuyển tới /nhom/{slug}). Không cache. */
export async function getGroupSlugById(id: string): Promise<string | null> {
  const result = await getGroup(createPublicClient(), id);
  if (result.error && result.error.code !== 'not_found') throw new Error(result.error.code);
  return result.data?.slug ?? null;
}

/**
 * Slug nhóm sắp diễn ra để prerender lúc build (generateStaticParams của /nhom/[slug]). Cache Components bắt buộc ít nhất
 * một giá trị; DB không truy cập được lúc build → slug giữ chỗ (trang đó render not-found, vẫn hợp lệ).
 */
export async function getGroupPrerenderSlugs(perKind = 10): Promise<string[]> {
  const client = createPublicClient();
  const pages = await Promise.all((['ride', 'sport'] as const).map((kind) => searchGroups(client, { kind, limit: perKind })));
  const slugs = pages.flatMap((p) => p.data?.items.map((g) => g.slug) ?? []).filter((s): s is string => !!s);
  return slugs.length > 0 ? slugs : ['nhom-000000'];
}

// ── Khu đăng nhập: theo request (cookie phiên), KHÔNG 'use cache' — gọi trong <Suspense> ─────────────────

/** Số nhóm mỗi trang "Nhóm của tôi" (chia hết cho lưới 1 / 2 cột). */
export const MY_GROUPS_PAGE_SIZE = 20;

/** Nhóm của tôi theo tab (trang /toi/nhom-cua-toi) + thời điểm đọc (nhãn "đã tới giờ", nút đánh giá — component thuần). */
export async function getMyGroupsPage(tab: MyGroupsTab): Promise<{ result: Result<MyGroupPage>; now: number }> {
  const result = await listMyGroups(await createServerClient(), { tab, limit: MY_GROUPS_PAGE_SIZE });
  return { result, now: Date.now() };
}
