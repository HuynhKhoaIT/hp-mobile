// Đường dẫn của mini-app trong super app (Chợ Pass Đồ — /pass-do, Nhà Trọ — /tro). Thuần, không React / lucide: dùng được cả ở proxy.ts
// (chặn trang cần đăng nhập), robots.ts và config tính năng. Trang chủ mini-app giữ nguyên đường dẫn danh sách (/pass-do —
// SEO, link chia sẻ, deep link app không đổi); trang con là đoạn tiếng Việt cố định dưới nó:
//   /bo-loc (bộ lọc & tìm kiếm — công khai) · /da-luu (tin đã lưu) · /tin-nhan (chat) · /quan-ly (quản lý tin) · /dang-tin
//   (đăng tin, form chỉ có danh mục của tính năng) — 4 trang sau cần đăng nhập (proxy.ts chuyển khách sang /dang-nhap?next=…), noindex.
//   Trang sâu hơn thuộc cùng tiền tố (proxy / robots chặn theo tiền tố): /tin-nhan/[id] (khung chat trong mini-app) ·
//   /quan-ly/[id]/sua (sửa tin trong mini-app).
// Deep link app (.well-known/apple-app-site-association): cả cây MINI_APP_BASES (vd /pass-do, /pass-do/*) mở bằng app.
// Bật mini-app cho một tính năng = thêm đường dẫn vào MINI_APP_BASES + `miniApp` trong config.ts của tính năng đó.
import { LISTING_FEATURE_PATHS, type ListingFeaturePath } from '@hp/core';

export type MiniAppPaths = {
  /** Trang chủ mini-app = trang danh sách của tính năng. */
  home: ListingFeaturePath;
  filter: string;
  saved: string;
  chat: string;
  manage: string;
  post: string;
};

export function miniAppPaths(base: ListingFeaturePath): MiniAppPaths {
  return { home: base, filter: `${base}/bo-loc`, saved: `${base}/da-luu`, chat: `${base}/tin-nhan`, manage: `${base}/quan-ly`, post: `${base}/dang-tin` };
}

/** Trang sửa tin trong mini-app: `{manage}/{id}/sua` (vd /pass-do/quan-ly/<id>/sua). */
export const miniAppEditPath = (manage: string, id: string) => `${manage}/${id}/sua`;

/** Khung chat một hội thoại trong mini-app: `{chat}/{id}` (vd /pass-do/tin-nhan/<id>). */
export const miniAppThreadPath = (chat: string, id: string) => `${chat}/${id}`;

/** Tính năng đang chạy dạng mini-app (đường dẫn gốc). */
export const MINI_APP_BASES: readonly ListingFeaturePath[] = [LISTING_FEATURE_PATHS.pass, LISTING_FEATURE_PATHS.room];

/** Trang con cần đăng nhập (proxy.ts) và không cho thu thập (robots.ts). */
export const MINI_APP_PRIVATE_PATHS: readonly string[] = MINI_APP_BASES.flatMap((base) => {
  const p = miniAppPaths(base);
  return [p.saved, p.chat, p.manage, p.post];
});

/** Đường dẫn (chưa tiền tố ngôn ngữ) thuộc mini-app nào — null nếu không thuộc. */
export function miniAppBaseOf(pathname: string): ListingFeaturePath | null {
  return MINI_APP_BASES.find((base) => pathname === base || pathname.startsWith(`${base}/`)) ?? null;
}
