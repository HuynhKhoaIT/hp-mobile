// Hook riêng mobile của engine Listing — chỉ gọi lại @hp/core và thêm phần của app (state bộ lọc, toast, haptic,
// Share sheet, gọi điện, requireAuth, analytics). Không gọi supabase trực tiếp, không khai báo query key.
import { type Banner, logSearch, type MyListing, type MyListingsTab, type PublicListing } from '@hp/core';
import {
  useBanners,
  useBookmarkedListingIds,
  useDeleteListing,
  useListingList,
  useLostFoundMatches,
  useMyListingStats,
  useRenewListing,
  useRevealContact,
  useSession,
  useSetListingStatus,
  useSupabase,
  useToggleBookmark,
  useTranslateListing,
} from '@hp/core/react';
import {
  APP_NAME,
  featureOfCategory,
  HOME_SHORTCUTS,
  LISTING_CATEGORIES,
  type ListingCategory,
  type ListingFeature,
  type ListingFilters,
  type ListingSort,
  type Locale,
  LOCALES,
  type OwnerListingStatus,
  toE164,
} from '@hp/shared';
import * as Haptics from 'expo-haptics';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Linking, Platform, Share } from 'react-native';
import { track } from '@/core/analytics';
import { requireAuth } from '@/core/auth';
import { useErrorText } from '@/lib/errors';
import { formatDate } from '@/lib/format';
import { listingShareUrl } from '@/lib/urls';
import { toast } from '@/ui';
import { useOpenConversation } from '@/features/chat/hooks';
import { LISTING_ROUTE_SLUG, type MiniSlug, openPostForm, openPostPicker } from './navigation';
import type { ListingFeatureConfig, ListingQuickFilter } from './types';

/** Giá trị chip "Tất cả" / "Mọi khu" / "Mọi khoảng cách" (không lọc). Mã category / site không bao giờ rỗng. */
export const ALL = '' as const;

/** Mốc mặc định của filter 'distance' (km) khi config không khai báo distanceOptionsKm. */
export const DISTANCE_OPTIONS_KM: readonly number[] = [1, 2, 5];

/**
 * Bộ lọc đặt sẵn khi mở danh sách từ Hub (chip "Tìm nhanh", "Dành cho bạn → Xem tất cả"): nhóm category + lọc theo
 * attributes, hiện thành một chip đang chọn bỏ được ở đầu hàng lọc.
 */
export type ListingPreset = {
  label: string;
  categories?: readonly ListingCategory[];
  attributes?: Readonly<Record<string, string | number | boolean>>;
};

/** Chip lọc nhanh theo giá tối đa (p_price_max) — còn lại là chip theo thông số (p_attributes) hoặc "Cho tặng". */
export const isPriceQuickFilter = (f: ListingQuickFilter): f is Extract<ListingQuickFilter, { priceMax: number }> => 'priceMax' in f;

/** Chip lọc nhanh "Cho tặng" (p_free_only). */
export const isFreeQuickFilter = (f: ListingQuickFilter): f is Extract<ListingQuickFilter, { freeOnly: true }> => 'freeOnly' in f;

/** Thứ tự mặc định của danh sách (không tính là đang lọc). */
export const DEFAULT_SORT: ListingSort = 'newest';

/** Khoảng giá (config.priceRanges) theo key → priceMin / priceMax; key lạ / ALL → không lọc giá. */
function priceBounds(config: ListingFeatureConfig, key: string): { priceMin?: number; priceMax?: number } {
  const range = config.priceRanges?.find((r) => r.key === key);
  if (!range) return {};
  return { ...('min' in range ? { priceMin: range.min } : {}), ...('max' in range ? { priceMax: range.max } : {}) };
}

/**
 * Thao tác của danh sách mà khối `header` (trang chủ riêng của tính năng — FeatureHome) gọi được: chọn danh mục, bật
 * "Cho tặng", lọc theo khu. Gọi xong danh sách thành "đang lọc" → khối header ẩn, chip "Xoá lọc" đưa về trang chủ.
 */
export type ListingBrowserApi = {
  selectCategory: (category: ListingCategory) => void;
  showFree: () => void;
  selectSite: (site: string) => void;
};

const isCategory = (v: string): v is ListingCategory => (LISTING_CATEGORIES as readonly string[]).includes(v);

/**
 * Tham số route `listings/[feature]` → bộ lọc đặt sẵn: `shortcut` = id trong HOME_SHORTCUTS (@hp/shared, nhãn
 * `common.home.shortcut.<id>`); `categories` = danh sách category cách nhau dấu phẩy (nhãn = tên các tính năng).
 */
export function useListingPreset(params: { shortcut?: string; categories?: string }): ListingPreset | undefined {
  const { t } = useTranslation();
  const { shortcut, categories } = params;
  return useMemo(() => listingPresetOf({ shortcut, categories }, t), [shortcut, categories, t]);
}

/** Như useListingPreset, ngoài hook (link banner trong mini-app); `t` của namespace common. */
export function listingPresetOf(params: { shortcut?: string; categories?: string }, t: (key: string) => string): ListingPreset | undefined {
  const shortcut = params.shortcut ? HOME_SHORTCUTS.find((s) => s.id === params.shortcut) : undefined;
  if (shortcut) return { label: t(`home.shortcut.${shortcut.id}`), categories: shortcut.categories, attributes: shortcut.attributes };
  const categories = (params.categories ?? '').split(',').filter(isCategory);
  if (categories.length === 0) return undefined;
  const features = [...new Set(categories.map(featureOfCategory))];
  return { label: features.map((f) => t(`feature.${f}`)).join(' · '), categories };
}

/**
 * State bộ lọc của danh sách (một object — để mini-app nâng lên store dùng chung giữa trang chủ và màn Bộ lọc).
 * `customPrice`: khoảng giá tự nhập ở màn Bộ lọc của mini-app (loại trừ với `priceRange` / `priceMax`).
 */
export type ListingBrowserState = {
  input: string;
  query: string;
  category: ListingCategory | typeof ALL;
  site: string;
  /** Khoảng cách tới khu tối đa (mét, dạng chuỗi cho FilterBar); ALL = không lọc. */
  distance: string;
  preset: ListingPreset | null;
  /** Chip lọc nhanh đang bật: khoá thông số → giá trị (search_listings p_attributes, ghép với thuộc tính đặt sẵn). */
  attributes: Readonly<Record<string, string | boolean>>;
  /** Chip giá tối đa đang bật (VND, search_listings p_price_max); null = không lọc giá. */
  priceMax: number | null;
  /** Khoảng giá đang chọn (key trong config.priceRanges); ALL = mọi mức giá. */
  priceRange: string;
  customPrice: { min: number | null; max: number | null } | null;
  /** Chỉ đồ cho tặng (search_listings p_free_only). */
  freeOnly: boolean;
  sort: ListingSort;
};

export type ListingBrowserInitial = { site?: string; query?: string; preset?: ListingPreset };

/** State ban đầu: bộ lọc đặt sẵn chỉ là một category con của tính năng (vd "Đồ bảo hộ") → chọn luôn chip đó. */
export function initialBrowserState(config: ListingFeatureConfig, initial: ListingBrowserInitial = {}): ListingBrowserState {
  const single = initial.preset?.categories?.length === 1 && !initial.preset.attributes ? initial.preset.categories[0] : undefined;
  const asChip = single && config.categories.includes(single) ? single : undefined;
  return {
    input: initial.query ?? '',
    query: initial.query?.trim() ?? '',
    category: asChip ?? ALL,
    site: initial.site ?? ALL,
    distance: ALL,
    preset: asChip ? null : (initial.preset ?? null),
    attributes: {},
    priceMax: null,
    priceRange: ALL,
    customPrice: null,
    freeOnly: false,
    sort: DEFAULT_SORT,
  };
}

/** Bộ lọc gửi useListingList từ state (dùng chung danh sách + mini-app). */
export function browserFilters(config: ListingFeatureConfig, s: ListingBrowserState): ListingFilters {
  const custom = s.customPrice;
  return {
    // 'all' không giới hạn category trừ khi chọn chip hoặc có bộ lọc đặt sẵn.
    ...(s.category !== ALL
      ? { categories: [s.category] }
      : s.preset?.categories?.length
        ? { categories: [...s.preset.categories] }
        : config.key === 'all'
          ? {}
          : { categories: [...config.categories] }),
    ...(s.preset?.attributes || Object.keys(s.attributes).length > 0 ? { attributes: { ...s.preset?.attributes, ...s.attributes } } : {}),
    ...(s.query ? { query: s.query } : {}),
    ...(s.site !== ALL ? { site: s.site } : {}),
    ...(s.distance !== ALL ? { maxDistanceM: Number(s.distance) } : {}),
    ...(s.priceMax !== null
      ? { priceMax: s.priceMax }
      : custom
        ? { ...(custom.min !== null ? { priceMin: custom.min } : {}), ...(custom.max !== null ? { priceMax: custom.max } : {}) }
        : priceBounds(config, s.priceRange)),
    ...(s.freeOnly ? { freeOnly: true } : {}),
    // Mặc định không gửi → key danh sách mặc định giữ nguyên (cache dùng chung với Hub / web).
    ...(s.sort !== DEFAULT_SORT ? { sort: s.sort } : {}),
  };
}

/**
 * Bỏ mọi lọc giá (chip giá tối đa, khoảng giá, giá tự nhập). "Cho tặng" và lọc giá loại trừ nhau: bật bên này thì bỏ bên kia
 * (trang chủ, danh sách, màn Bộ lọc của mini-app).
 */
export const NO_PRICE = { priceMax: null, priceRange: ALL, customPrice: null } as const satisfies Partial<ListingBrowserState>;

/** Có khoảng giá tự nhập (ít nhất một đầu). */
const hasCustomPrice = (s: ListingBrowserState) => !!s.customPrice && (s.customPrice.min !== null || s.customPrice.max !== null);

/**
 * Số bộ lọc đang bật (chip "N bộ lọc" của mini-app): từ khoá, danh mục, mỗi thông số, khu, khoảng cách, giá, cho tặng,
 * sắp xếp khác mặc định, bộ lọc đặt sẵn. 0 = không lọc.
 */
export function activeFilterCount(s: ListingBrowserState): number {
  const price = s.priceMax !== null || s.priceRange !== ALL || hasCustomPrice(s);
  const flags = [!!s.query, s.category !== ALL, s.site !== ALL, s.distance !== ALL, !!s.preset, price, s.freeOnly, s.sort !== DEFAULT_SORT];
  return flags.filter(Boolean).length + Object.keys(s.attributes).length;
}

/**
 * Nơi giữ state bộ lọc ngoài component (mini-app: store theo phiên mở mini-app, dùng chung trang chủ + màn Bộ lọc).
 * Không truyền → state cục bộ của màn (danh sách tính năng, Khám phá, Tìm kiếm — như cũ).
 */
export type ListingBrowserStore = {
  state: ListingBrowserState;
  update: (fn: (prev: ListingBrowserState) => ListingBrowserState) => void;
};

/**
 * State màn danh sách: từ khoá (gõ / đã tìm), category con, khu, khoảng cách, chip lọc nhanh theo thông số
 * (config.quickFilters — bật / tắt; cùng khoá thì chip sau thay chip trước), chip giá tối đa (priceMax — VND, bật / tắt),
 * khoảng giá (config.priceRanges — loại trừ với chip giá tối đa), "Cho tặng" (freeOnly), sắp xếp (mặc định mới nhất),
 * bộ lọc đặt sẵn → useListingList (cursor — đổi sắp xếp là đổi key, phân trang lại từ đầu; staleTime 60s). `clearAll` bỏ
 * mọi bộ lọc + từ khoá. Tìm có từ khoá → ghi log_search (số kết quả trang đầu) + event `search` một lần cho mỗi bộ lọc.
 * `store` (mini-app) → state nằm ngoài màn, nhiều màn cùng đọc / sửa; không có → state cục bộ (như cũ).
 */
export function useListingBrowser(config: ListingFeatureConfig, initial: ListingBrowserInitial = {}, store?: ListingBrowserStore) {
  const client = useSupabase();
  const [local, setLocal] = useState<ListingBrowserState>(() => initialBrowserState(config, initial));
  const s = store ? store.state : local;
  const update = store ? store.update : setLocal;
  const patch = (next: Partial<ListingBrowserState>) => update((prev) => ({ ...prev, ...next }));

  const filters = useMemo(() => browserFilters(config, s), [config, s]);
  const list = useListingList(filters);
  const { query, category } = s;

  // log_search: sau khi trang đầu của một lần tìm có từ khoá về xong.
  const logged = useRef<string | null>(null);
  const firstPage = list.data?.pages[0];
  useEffect(() => {
    if (!query || !firstPage) return;
    const signature = JSON.stringify(filters);
    if (logged.current === signature) return;
    logged.current = signature;
    const results = firstPage.items.length;
    void logSearch(client, { query, category: category !== ALL ? category : undefined, results });
    track('search', { feature: config.key, category: category !== ALL ? category : null, results });
  }, [client, query, category, filters, firstPage, config.key]);

  const filterCount = activeFilterCount(s);

  return {
    ...list,
    /** State bộ lọc hiện tại (mini-app: chép làm bản nháp ở màn Bộ lọc). */
    state: s,
    input: s.input,
    setInput: (input: string) => patch({ input }),
    /** Tìm theo chữ đang gõ (bàn phím "Tìm"). */
    submit: (text: string) => patch({ query: text.trim() }),
    query,
    category,
    setCategory: (value: ListingCategory | typeof ALL) => patch({ category: value }),
    site: s.site,
    setSite: (site: string) => patch({ site }),
    distance: s.distance,
    setDistance: (distance: string) => patch({ distance }),
    preset: s.preset,
    clearPreset: () => patch({ preset: null }),
    attributes: s.attributes,
    /** Bật / tắt một chip lọc nhanh (cùng khoá: thay giá trị). */
    toggleAttribute: (key: string, value: string | boolean) =>
      update((prev) => {
        const next = { ...prev.attributes };
        if (prev.attributes[key] === value) delete next[key];
        else next[key] = value;
        return { ...prev, attributes: next };
      }),
    priceMax: s.priceMax,
    /** Bật / tắt chip giá tối đa (bấm lại đúng mốc đang bật → bỏ lọc giá); bỏ khoảng giá đang chọn và "Cho tặng". */
    togglePriceMax: (value: number) =>
      update((prev) => ({ ...prev, ...NO_PRICE, freeOnly: false, priceMax: prev.priceMax === value ? null : value })),
    priceRange: s.priceRange,
    /** Chọn khoảng giá (ALL = mọi mức giá); bỏ chip giá tối đa đang bật (và "Cho tặng" khi chọn một khoảng). */
    setPriceRange: (key: string) => patch({ ...NO_PRICE, priceRange: key, ...(key !== ALL ? { freeOnly: false } : {}) }),
    freeOnly: s.freeOnly,
    /** Bật / tắt "Cho tặng" — bật thì bỏ lọc giá (đồ 0đ mâu thuẫn với khoảng giá). */
    toggleFreeOnly: () => update((prev) => (prev.freeOnly ? { ...prev, freeOnly: false } : { ...prev, ...NO_PRICE, freeOnly: true })),
    sort: s.sort,
    setSort: (sort: ListingSort) => patch({ sort }),
    /** Thao tác cho khối `header` (FeatureHome). */
    api: {
      selectCategory: (value: ListingCategory) => patch({ category: value }),
      showFree: () => patch({ ...NO_PRICE, freeOnly: true }),
      selectSite: (site: string) => patch({ site }),
    } satisfies ListingBrowserApi,
    /** Bộ lọc gửi useListingList — đổi → danh sách cuộn về đầu. */
    filters,
    /** Bỏ mọi bộ lọc + từ khoá (chip "Xoá lọc"). */
    clearAll: () => update(() => initialBrowserState(config)),
    /** Số bộ lọc đang bật (0 = không lọc). */
    filterCount,
    /**
     * Đang lọc (từ khoá / category / khu / khoảng cách / lọc nhanh / giá / cho tặng / sắp xếp khác mặc định / đặt sẵn) →
     * rỗng là "không tìm thấy", không phải "chưa có tin"; khối header (trang chủ riêng) ẩn.
     */
    isFiltered: filterCount > 0,
  };
}

export type ListingBrowserResult = ReturnType<typeof useListingBrowser>;

/**
 * Đăng tin: bắt đăng nhập trước → bước chọn loại tin (đặt sẵn tính năng khi gọi từ danh sách của tính năng đó).
 * `mini`: gọi trong mini-app → luồng đăng ở lại mini-app (chỉ danh mục của tính năng, xong về "Quản lý tin").
 */
export function usePostListing(feature?: ListingFeatureConfig['key'], opts: { mini?: boolean } = {}) {
  const preset: ListingFeature | undefined = feature === 'all' ? undefined : feature;
  const mini = opts.mini && preset ? LISTING_ROUTE_SLUG[preset] : undefined;
  return () => requireAuth(() => openPostPicker(preset, { mini }));
}

/**
 * Đăng tin vào thẳng một danh mục (khối mời đăng tin — config.banner, khối mời chủ trọ của mini-app): bắt đăng nhập trước →
 * form bước 1. `mini`: luồng đăng của mini-app (xong về "Quản lý tin" của mini-app, giữ màu mini-app).
 */
export function usePostListingIn() {
  return (category: ListingCategory, opts: { mini?: MiniSlug } = {}) => requireAuth(() => openPostForm(category, opts));
}

/** Nhắn tin với người đăng: khách → đăng nhập; mở (hoặc lấy lại) hội thoại rồi vào màn chat (features/chat). */
export function useContactListing() {
  return useOpenConversation();
}

/** Người đang xem là chủ tin → hiện Sửa / Quản lý thay cho Liên hệ (client chỉ ẩn / hiện; RLS quyết định quyền). */
export function useIsOwner(listing: Pick<PublicListing, 'owner_id'>) {
  const { userId } = useSession();
  return !!userId && userId === listing.owner_id;
}

/**
 * Lưu tin (trái tim): khách → đăng nhập rồi lưu; cập nhật lạc quan + rollback trong useToggleBookmark (@hp/core);
 * app thêm haptic nhẹ khi lưu, toast kết quả, event `save_listing`.
 */
export function useListingBookmark(listingId: string) {
  const { t } = useTranslation('listing');
  const errorText = useErrorText();
  const { userId } = useSession();
  const ids = useBookmarkedListingIds({ enabled: !!userId });
  const toggle = useToggleBookmark();
  const saved = !!userId && !!ids.data?.has(listingId);

  const onToggle = (next: boolean) =>
    requireAuth(() => {
      if (next) {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        track('save_listing', { listing_id: listingId });
      }
      toggle.mutate(
        { listingId, next },
        {
          onSuccess: () => toast.show(t(next ? 'bookmark.saved' : 'bookmark.removed'), 'success'),
          onError: (e) => toast.show(errorText(e.code), 'danger'),
        },
      );
    });

  return { saved, onToggle, labels: { save: t('bookmark.save'), unsave: t('bookmark.unsave') } };
}

/**
 * "Hiện số điện thoại": cần đăng nhập, mỗi lần bấm là một lượt (20 / giờ, ghi audit ở server).
 * Số về dạng 849… → hiện 0912 345 678, gọi bằng tel:+84….
 */
export function useRevealPhone(listing: Pick<PublicListing, 'id' | 'category'>) {
  const errorText = useErrorText();
  const reveal = useRevealContact();
  return {
    reveal: () =>
      requireAuth(() =>
        reveal.mutate(listing.id, {
          onSuccess: () => track('contact', { channel: 'reveal_phone', listing_id: listing.id, category: listing.category }),
          onError: (e) => toast.show(errorText(e.code), 'danger'),
        }),
      ),
    isPending: reveal.isPending,
    revealed: reveal.isSuccess,
    phone: reveal.data?.phone ?? null,
    call: (phone: string) => {
      track('contact', { channel: 'call', listing_id: listing.id, category: listing.category });
      Linking.openURL(`tel:${toE164(phone)}`).catch(() => toast.show(errorText('unknown'), 'danger'));
    },
  };
}

/** Tab "Tin của tôi" (khớp web) — `?tab=` của màn my-listings. */
export const MY_LISTING_TABS: readonly MyListingsTab[] = ['active', 'pending', 'draft', 'closed'];

export const isMyListingsTab = (v: string | undefined): v is MyListingsTab => !!v && (MY_LISTING_TABS as readonly string[]).includes(v);

/**
 * Chip tab "Tin của tôi" kèm số tin (my_listing_stats): Đang đăng = active · Chờ duyệt = pending + rejected (tab gồm cả
 * bị từ chối, xem TAB_STATUSES ở @hp/core) · Nháp = drafts · Đã đóng không có số. Số chưa về / lỗi → chip không số.
 */
export function useMyListingTabOptions() {
  const { t } = useTranslation('listing');
  const stats = useMyListingStats();
  const s = stats.data;
  const count: Record<MyListingsTab, number | undefined> = {
    active: s?.active,
    pending: s ? s.pending + s.rejected : undefined,
    draft: s?.drafts,
    closed: undefined,
  };
  return MY_LISTING_TABS.map((value) => ({ value, label: t(`manage.tab.${value}`), count: count[value] }));
}

/** Còn ≤ 3 ngày hoặc đã hết hạn → được gia hạn (server kiểm lại: too_early). */
const RENEW_WINDOW_MS = 3 * 24 * 60 * 60 * 1000;

/** Thao tác chủ tin hiện được với tin này (client chỉ ẩn / hiện; DB guard từ chối nếu sai). */
export function ownerActions(listing: Pick<MyListing, 'status' | 'expires_at'>, now: number = Date.now()) {
  const expiresAt = listing.expires_at ? new Date(listing.expires_at).getTime() : null;
  const expired = listing.status === 'expired' || (listing.status === 'active' && expiresAt !== null && expiresAt <= now);
  const live = listing.status === 'active' && !expired;
  return {
    // Khớp trg_listings_guard: chỉ từ tin đã công khai; nháp / chờ duyệt / bị từ chối → forbidden nên không hiện.
    markSold: listing.status === 'active' || listing.status === 'closed' || listing.status === 'expired',
    close: live,
    // Chờ duyệt / bị từ chối / hết hạn không tự mở lại được (DB guard) → không hiện.
    reopen: listing.status === 'sold' || listing.status === 'closed',
    // Bị từ chối → gửi duyệt lại (DB luôn chuyển thành pending_review, lý do `resubmit`).
    resubmit: listing.status === 'rejected',
    renew: (listing.status === 'active' || listing.status === 'expired') && (expired || (expiresAt !== null && expiresAt - now <= RENEW_WINDOW_MS)),
    expired,
  };
}

/** Đổi trạng thái / gia hạn / xoá tin của tôi — optimistic + rollback trong @hp/core; app thêm toast. */
export function useOwnerListingActions() {
  const { t } = useTranslation('listing');
  const errorText = useErrorText();
  const setStatus = useSetListingStatus();
  const remove = useDeleteListing();
  const renew = useRenewListing();
  const fail = (e: { code: string }) => toast.show(errorText(e.code), 'danger');
  // `forbidden` ở đây là guard trạng thái (DB) — thường do danh sách trên máy đã cũ, nói rõ hơn "không có quyền".
  const failStatus = (status: OwnerListingStatus) => (e: { code: string }) =>
    e.code === 'forbidden' ? toast.show(t(status === 'sold' ? 'manage.sold_forbidden' : 'manage.status_forbidden'), 'danger') : fail(e);

  const changeStatus = (id: string, status: 'sold' | 'closed', doneKey: string) =>
    setStatus.mutate({ id, status }, { onSuccess: () => toast.show(t(doneKey), 'success'), onError: failStatus(status) });

  // Mở lại / gửi duyệt lại: DB quyết định kết quả (tin bị khoá kiểm duyệt → pending_review, từ khoá cấm → rejected) → báo theo status trả về.
  const publish = (id: string) =>
    setStatus.mutate(
      { id, status: 'active' },
      {
        onSuccess: (saved) => {
          if (saved.status === 'pending_review') toast.show(t('form.pending_title'), 'info');
          else if (saved.status === 'rejected') toast.show(t('form.rejected_title'), 'danger');
          else toast.show(t('manage.reopened'), 'success');
        },
        onError: failStatus('active'),
      },
    );

  return {
    markSold: (id: string) => changeStatus(id, 'sold', 'manage.sold_done'),
    close: (id: string) => changeStatus(id, 'closed', 'manage.closed_done'),
    reopen: publish,
    resubmit: publish,
    renew: (id: string) =>
      renew.mutate(id, {
        onSuccess: (expires) => toast.show(t('manage.renewed', { date: formatDate(expires) }), 'success'),
        onError: fail,
      }),
    remove: (id: string) => remove.mutate(id, { onSuccess: () => toast.show(t('manage.deleted'), 'success'), onError: fail }),
  };
}

/** Chia sẻ tin qua Share sheet hệ thống — luôn URL web https://tenapp.vn/tin/{slug}. */
export function useShareListing() {
  const { t } = useTranslation();
  return (listing: Pick<PublicListing, 'slug' | 'title'>) => {
    track('share_listing', { slug: listing.slug });
    const url = listingShareUrl(listing.slug);
    const text = t('listing:detail.share_text', { title: listing.title, app: APP_NAME });
    // iOS nhận url riêng (xem trước link); Android chỉ có message → gắn link vào cuối.
    const content = Platform.OS === 'ios' ? { message: text, url } : { message: `${text}\n${url}` };
    Share.share(content).catch(() => toast.show(t('errors:unknown'), 'danger'));
  };
}

const isLocale = (v: string): v is Locale => (LOCALES as readonly string[]).includes(v);

/** Banner của một placement theo ngôn ngữ đang dùng (Hub 'app_home', trang chủ riêng của tính năng — config.home). */
export function usePlacementBanners(placement: Banner['placement']) {
  const { i18n } = useTranslation();
  return useBanners(placement, isLocale(i18n.language) ? i18n.language : 'vi');
}

/**
 * Nút "Dịch" ở chi tiết: chỉ khi `listing.lang` khác ngôn ngữ đang dùng. Bấm → translate-content (cache theo tin +
 * ngôn ngữ trong @hp/core) → đổi tiêu đề + mô tả sang bản dịch; "Xem bản gốc" đổi lại. Lỗi (translate_unavailable —
 * chưa cấu hình API dịch, translate_failed, rate_limited) → toast, giữ bản gốc.
 */
export function useListingTranslation(listing: Pick<PublicListing, 'id' | 'lang' | 'title' | 'description'>) {
  const { i18n } = useTranslation();
  const errorText = useErrorText();
  const translate = useTranslateListing(listing.id);
  const [showing, setShowing] = useState(false);
  const locale = isLocale(i18n.language) ? i18n.language : null;
  const available = !!locale && listing.lang !== locale;
  const data = translate.data && translate.data.lang === locale ? translate.data : null;
  const translated = showing && !!data;

  return {
    available,
    translated,
    isPending: translate.isPending,
    title: translated && data ? data.title : listing.title,
    description: translated && data ? data.description : listing.description,
    run: () => {
      if (!locale) return;
      if (data) return setShowing(true);
      translate.mutate(locale, {
        onSuccess: () => setShowing(true),
        onError: (e) => toast.show(errorText(e.code), 'danger'),
      });
    },
    showOriginal: () => setShowing(false),
  };
}

/** "Tin có thể khớp" của tin mất / nhặt — chỉ gọi khi người xem là chủ tin và tin chưa "nhận lại". */
export function useListingMatches(listing: Pick<PublicListing, 'id'>, enabled: boolean) {
  return useLostFoundMatches(listing.id, { enabled });
}


/**
 * Mở ứng dụng bản đồ của máy tại toạ độ công khai của tin (đã làm tròn ~300 m ở view — không lộ vị trí chính xác): iOS Apple
 * Maps (`maps:`), Android `geo:`; không mở được → Google Maps trên web. Khối "Vị trí & khoảng cách" ở chi tiết.
 */
export function useOpenMap() {
  const errorText = useErrorText();
  return (point: { lat: number; lng: number }) => {
    const q = `${point.lat},${point.lng}`;
    const native = Platform.OS === 'ios' ? `maps:?q=${q}` : `geo:${q}?q=${q}`;
    Linking.openURL(native)
      .catch(() => Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${q}`))
      .catch(() => toast.show(errorText('unknown'), 'danger'));
  };
}
