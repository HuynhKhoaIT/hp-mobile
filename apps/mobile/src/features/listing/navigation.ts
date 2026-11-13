// Điều hướng của engine Listing — một chỗ cho đường dẫn route (listings/[feature], listing/[id], đăng / sửa tin,
// tin của tôi, tin đã lưu, tìm kiếm).
import type { MyListingsTab } from '@hp/core';
import type { ListingCategory, ListingFeature } from '@hp/shared';
import { router } from 'expo-router';
import type { ListingFeatureConfig } from './types';

/** Mã tính năng → tham số route `listings/[feature]` (thư mục feature dùng kebab-case). */
export const LISTING_ROUTE_SLUG: Record<ListingFeature, Exclude<ListingFeatureConfig['slug'], 'all'>> = {
  pass: 'pass',
  room: 'room',
  job: 'job',
  lostFound: 'lost-found',
};

/** Quay lại; mở thẳng từ link / push (không có màn trước) → về trang chủ. */
export function backOrHome() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

/** Chi tiết tin. `mini`: mở từ mini-app (Quản lý tin) → nút của chủ tin (Sửa tin, Tin của tôi) ở lại mini-app. */
export function openListing(id: string, opts: { replace?: boolean; mini?: MiniSlug } = {}) {
  const href = { pathname: '/listing/[id]', params: { id, ...(opts.mini ? { mini: opts.mini } : {}) } } as const;
  if (opts.replace) router.replace(href);
  else router.push(href);
}

/**
 * Danh sách tin của một tính năng. `site`: đặt sẵn khu; `shortcut`: id chip "Tìm nhanh" (HOME_SHORTCUTS);
 * `categories`: nhóm category đặt sẵn (vd "Dành cho bạn") — xem useListingPreset.
 */
export function openListingList(
  slug: ListingFeatureConfig['slug'],
  params: { site?: string; shortcut?: string; categories?: readonly ListingCategory[] } = {},
) {
  const { categories, ...rest } = params;
  const extra = Object.fromEntries(Object.entries(rest).filter(([, v]) => !!v)) as Record<string, string>;
  router.push({
    pathname: '/listings/[feature]',
    params: { feature: slug, ...extra, ...(categories?.length ? { categories: categories.join(',') } : {}) },
  });
}

/**
 * Bước 0 của "Đăng nhanh": chọn loại tin (đặt sẵn tính năng khi đến từ danh sách của tính năng đó). `mini`: mở từ mini-app
 * (slug, vd 'pass') → chỉ danh mục của tính năng, đăng xong về "Quản lý tin" của mini-app (xem openMyListingsFrom).
 */
export function openPostPicker(feature?: ListingFeature, opts: { mini?: MiniSlug; replace?: boolean } = {}) {
  const href = { pathname: '/listing/new', params: { ...(feature ? { feature } : {}), ...(opts.mini ? { mini: opts.mini } : {}) } } as const;
  if (opts.replace) router.replace(href);
  else router.push(href);
}

/** Form đăng tin của một danh mục (bước 1–3). `mini`: luồng đăng của mini-app (giữ tới màn kết quả). */
export function openPostForm(category: ListingCategory, opts: { replace?: boolean; mini?: MiniSlug } = {}) {
  const href = { pathname: '/listing/new/[category]', params: { category, ...(opts.mini ? { mini: opts.mini } : {}) } } as const;
  if (opts.replace) router.replace(href);
  else router.push(href);
}

/** Sửa tin. `mini`: sửa từ mini-app → lưu nháp / gửi duyệt / "Tin của tôi" về "Quản lý tin" của mini-app. */
export function openEditListing(id: string, opts: { replace?: boolean; mini?: MiniSlug } = {}) {
  const href = { pathname: '/listing/edit/[id]', params: { id, ...(opts.mini ? { mini: opts.mini } : {}) } } as const;
  if (opts.replace) router.replace(href);
  else router.push(href);
}

export function openMyListings(tab?: MyListingsTab, opts: { replace?: boolean } = {}) {
  const href = { pathname: '/my-listings', params: tab ? { tab } : {} } as const;
  if (opts.replace) router.replace(href);
  else router.push(href);
}

export function openSavedListings() {
  router.push('/saved');
}

export function openSearch() {
  router.push('/search');
}

// ── Mini-app (config.miniApp — vd Chợ Pass Đồ): route mini/[feature] có thanh tab riêng ─────────────────────────────

/** Tab của mini-app (`index` = trang chủ chợ; `filter` = màn Bộ lọc, không có ô trên thanh tab). */
export type MiniAppTab = 'index' | 'saved' | 'chat' | 'manage' | 'filter';

export type MiniSlug = Exclude<ListingFeatureConfig['slug'], 'all'>;

export const isMiniSlug = (v: string | undefined): v is MiniSlug =>
  !!v && (Object.values(LISTING_ROUTE_SLUG) as string[]).includes(v);

/** Bộ lọc đặt sẵn khi mở mini-app (giống openListingList): khu, chip "Tìm nhanh", nhóm category. */
export type MiniAppParams = { site?: string; shortcut?: string; categories?: string };

/** Href trang chủ mini-app (kèm bộ lọc đặt sẵn) — dùng cả cho Redirect từ `listings/[feature]` và link web. */
export function miniAppHref(slug: MiniSlug, params: MiniAppParams = {}) {
  const extra = Object.fromEntries(Object.entries(params).filter(([, v]) => !!v)) as Record<string, string>;
  return { pathname: '/mini/[feature]', params: { feature: slug, ...extra } } as const;
}

/** Mở mini-app của tính năng (Hub, link web, banner). */
export function openMiniApp(slug: MiniSlug, params: { site?: string; shortcut?: string; categories?: readonly ListingCategory[] } = {}) {
  const { categories, ...rest } = params;
  router.push(miniAppHref(slug, { ...rest, ...(categories?.length ? { categories: categories.join(',') } : {}) }));
}

/** Href một tab của mini-app (link web tới trang con: `params` = bộ lọc đặt sẵn của phiên). */
export function miniTabHref(slug: MiniSlug, tab: MiniAppTab, params: MiniAppParams = {}) {
  const extra = Object.fromEntries(Object.entries(params).filter(([, v]) => !!v)) as Record<string, string>;
  const p = { feature: slug, ...extra };
  switch (tab) {
    case 'index':
      return { pathname: '/mini/[feature]', params: p } as const;
    case 'saved':
      return { pathname: '/mini/[feature]/saved', params: p } as const;
    case 'chat':
      return { pathname: '/mini/[feature]/chat', params: p } as const;
    case 'manage':
      return { pathname: '/mini/[feature]/manage', params: p } as const;
    case 'filter':
      return { pathname: '/mini/[feature]/filter', params: p } as const;
  }
}

/** Chuyển tab trong mini-app đang mở. */
export function openMiniTab(slug: MiniSlug, tab: MiniAppTab) {
  router.navigate(miniTabHref(slug, tab));
}

/**
 * Kết thúc luồng đăng / sửa → "Tin của tôi". Từ mini-app (`mini`): đóng các màn đăng tin và về tab "Quản lý tin" của
 * mini-app (nháp nằm ở tab Đã ẩn) — không rơi ra màn của super app. Ngoài mini-app → màn my-listings như cũ.
 * `at` (mốc giờ): mỗi lần về là một yêu cầu mới — tab Quản lý chuyển tab kể cả khi `tab` trùng lần trước.
 */
export function openMyListingsFrom(mini: MiniSlug | undefined, tab: 'active' | 'pending' | 'draft') {
  if (!mini) return openMyListings(tab, { replace: true });
  router.dismissTo({
    pathname: '/mini/[feature]/manage',
    params: { feature: mini, tab: tab === 'draft' ? 'hidden' : tab, at: String(Date.now()) },
  });
}

/** Rời mini-app về super app (gỡ cả route mini-app khỏi stack gốc); mở thẳng từ link (không có màn trước) → Hub. */
export function leaveMiniApp() {
  if (router.canDismiss()) router.dismiss();
  else router.replace('/');
}
