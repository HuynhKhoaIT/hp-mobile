// Đọc hồ sơ công khai phía server cho /u/[id] (.claude/rules/web-routing-rsc.md: cache 600s).
// Chỉ gọi @hp/core với client ẩn danh (createPublicClient — không cookie) → view công khai đã che PII: public_profiles
// (tên "An N.", không SĐT), public_listings, public_groups (vị trí làm tròn). Tag `profile:{id}` + `listings` + `groups`
// để webhook / Server Action làm mới cùng các trang tin / nhóm.
// - id không phải UUID → null (trang 404) mà không hỏi DB (Postgres báo lỗi kiểu dữ liệu, không phải "không thấy").
// - Lỗi (mạng, DB) được NÉM ra trong hàm cache để không bị cache; trang hiện error.tsx (thử lại). "Không thấy" → null.
// - Trả kèm `now` (thời điểm đọc) cho "x phút trước" / "đã tới giờ": Cache Components không cho new Date() khi prerender.
import 'server-only';
import {
  getPublicProfile,
  type GroupPage,
  listGroupsByHost,
  listListingsByOwner,
  type Page,
  type PublicListing,
  type PublicProfile,
  type Result,
} from '@hp/core';
import { cacheLife, cacheTag } from 'next/cache';
import { createPublicClient } from '@/lib/supabase/public';

/** Số tin trang đầu (chia hết cho lưới 2 / 3 / 4 cột); trang sau đọc ở trình duyệt (PublicProfileMore). */
export const PROFILE_LISTINGS_PAGE_SIZE = 24;
/** Nhóm sắp diễn ra hiện trên hồ sơ (một trang; người tạo hiếm khi mở nhiều hơn cùng lúc). */
export const PROFILE_GROUPS_LIMIT = 12;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type PublicProfilePage = {
  profile: PublicProfile | null;
  listings: Page<PublicListing>;
  groups: GroupPage;
  now: number;
};

const EMPTY: Omit<PublicProfilePage, 'now'> = {
  profile: null,
  listings: { items: [], nextCursor: null },
  groups: { items: [], nextCursor: null },
};

function unwrap<T>(result: Result<T>): T {
  if (result.error) throw new Error(result.error.code);
  return result.data;
}

/** Hồ sơ + trang đầu tin đang đăng + nhóm sắp diễn ra. profile null = không có / đã xoá / bị khoá / id sai. */
export async function getPublicProfilePage(id: string): Promise<PublicProfilePage> {
  'use cache';
  cacheLife({ revalidate: 600 });
  cacheTag('listings', 'groups', `profile:${id}`);
  if (!UUID.test(id)) return { ...EMPTY, now: Date.now() };
  const client = createPublicClient();
  const profile = await getPublicProfile(client, id);
  if (profile.error && profile.error.code !== 'not_found') throw new Error(profile.error.code);
  if (!profile.data) return { ...EMPTY, now: Date.now() };
  const [listings, groups] = await Promise.all([
    listListingsByOwner(client, { ownerId: id, limit: PROFILE_LISTINGS_PAGE_SIZE }),
    listGroupsByHost(client, { hostId: id, limit: PROFILE_GROUPS_LIMIT }),
  ]);
  return { profile: profile.data, listings: unwrap(listings), groups: unwrap(groups), now: Date.now() };
}
