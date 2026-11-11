// Hook riêng mobile của engine Listing — chỉ gọi lại @hp/core và thêm phần của app (state bộ lọc, toast, haptic,
// Share sheet, gọi điện, requireAuth, analytics). Không gọi supabase trực tiếp, không khai báo query key.
import { logSearch, type MyListing, type MyListingsTab, type PublicListing } from '@hp/core';
import {
  useBookmarkedListingIds,
  useDeleteListing,
  useListingList,
  useLostFoundMatches,
  useMarkListingReturned,
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
import { openPostPicker } from './navigation';
import type { ListingFeatureConfig } from './types';

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

const isCategory = (v: string): v is ListingCategory => (LISTING_CATEGORIES as readonly string[]).includes(v);

/**
 * Tham số route `listings/[feature]` → bộ lọc đặt sẵn: `shortcut` = id trong HOME_SHORTCUTS (@hp/shared, nhãn
 * `common.home.shortcut.<id>`); `categories` = danh sách category cách nhau dấu phẩy (nhãn = tên các tính năng).
 */
export function useListingPreset(params: { shortcut?: string; categories?: string }): ListingPreset | undefined {
  const { t } = useTranslation();
  return useMemo(() => {
    const shortcut = params.shortcut ? HOME_SHORTCUTS.find((s) => s.id === params.shortcut) : undefined;
    if (shortcut) return { label: t(`home.shortcut.${shortcut.id}`), categories: shortcut.categories, attributes: shortcut.attributes };
    const categories = (params.categories ?? '').split(',').filter(isCategory);
    if (categories.length === 0) return undefined;
    const features = [...new Set(categories.map(featureOfCategory))];
    return { label: features.map((f) => t(`feature.${f}`)).join(' · '), categories };
  }, [params.categories, params.shortcut, t]);
}

/**
 * State màn danh sách: từ khoá (gõ / đã tìm), category con, khu, khoảng cách, chip lọc nhanh theo thông số
 * (config.quickFilters — bật / tắt; cùng khoá thì chip sau thay chip trước), bộ lọc đặt sẵn → useListingList (cursor,
 * staleTime 60s). `clearAll` bỏ mọi bộ lọc + từ khoá. Tìm có từ khoá → ghi log_search (số kết quả trang đầu) + event
 * `search` một lần cho mỗi bộ lọc.
 */
export function useListingBrowser(
  config: ListingFeatureConfig,
  initial: { site?: string; query?: string; preset?: ListingPreset } = {},
) {
  const client = useSupabase();
  // Bộ lọc đặt sẵn chỉ là một category con của tính năng (vd "Đồ bảo hộ") → chọn luôn chip đó, không cần chip riêng.
  const single = initial.preset?.categories?.length === 1 && !initial.preset.attributes ? initial.preset.categories[0] : undefined;
  const asChip = single && config.categories.includes(single) ? single : undefined;
  const [input, setInput] = useState(initial.query ?? '');
  const [query, setQuery] = useState(initial.query?.trim() ?? '');
  const [category, setCategory] = useState<ListingCategory | typeof ALL>(asChip ?? ALL);
  const [site, setSite] = useState<string>(initial.site ?? ALL);
  /** Khoảng cách tới khu tối đa (mét, dạng chuỗi cho FilterBar); ALL = không lọc. */
  const [distance, setDistance] = useState<string>(ALL);
  const [preset, setPreset] = useState<ListingPreset | null>(asChip ? null : (initial.preset ?? null));
  /** Chip lọc nhanh đang bật: khoá thông số → giá trị (search_listings p_attributes, ghép với thuộc tính đặt sẵn). */
  const [attributes, setAttributes] = useState<Readonly<Record<string, string | boolean>>>({});

  const filters = useMemo(
    () => ({
      // 'all' không giới hạn category trừ khi chọn chip hoặc có bộ lọc đặt sẵn.
      ...(category !== ALL
        ? { categories: [category] }
        : preset?.categories?.length
          ? { categories: [...preset.categories] }
          : config.key === 'all'
            ? {}
            : { categories: [...config.categories] }),
      ...(preset?.attributes || Object.keys(attributes).length > 0 ? { attributes: { ...preset?.attributes, ...attributes } } : {}),
      ...(query ? { query } : {}),
      ...(site !== ALL ? { site } : {}),
      ...(distance !== ALL ? { maxDistanceM: Number(distance) } : {}),
    }),
    [category, config.categories, config.key, preset, query, site, distance, attributes],
  );
  const list = useListingList(filters);

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

  return {
    ...list,
    input,
    setInput,
    /** Tìm theo chữ đang gõ (bàn phím "Tìm"). */
    submit: (text: string) => setQuery(text.trim()),
    query,
    category,
    setCategory,
    site,
    setSite,
    distance,
    setDistance,
    preset,
    clearPreset: () => setPreset(null),
    attributes,
    /** Bật / tắt một chip lọc nhanh (cùng khoá: thay giá trị). */
    toggleAttribute: (key: string, value: string | boolean) =>
      setAttributes((prev) => {
        const next = { ...prev };
        if (prev[key] === value) delete next[key];
        else next[key] = value;
        return next;
      }),
    /** Bỏ mọi bộ lọc + từ khoá (chip "Xoá lọc"). */
    clearAll: () => {
      setInput('');
      setQuery('');
      setCategory(ALL);
      setSite(ALL);
      setDistance(ALL);
      setPreset(null);
      setAttributes({});
    },
    /** Đang lọc (từ khoá / category / khu / khoảng cách / lọc nhanh / đặt sẵn) → rỗng là "không tìm thấy", không phải "chưa có tin". */
    isFiltered: !!query || category !== ALL || site !== ALL || distance !== ALL || !!preset || Object.keys(attributes).length > 0,
  };
}

/** Đăng tin: bắt đăng nhập trước → bước chọn loại tin (đặt sẵn tính năng khi gọi từ danh sách của tính năng đó). */
export function usePostListing(feature?: ListingFeatureConfig['key']) {
  const preset: ListingFeature | undefined = feature === 'all' ? undefined : feature;
  return () => requireAuth(() => openPostPicker(preset));
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
 * "Đã nhận lại đồ": RPC một giao dịch (useMarkListingReturned của @hp/core — attributes.returned = true + đóng tin;
 * trigger khớp bỏ qua tin này). Thành công → toast `returned_done`; lỗi (auth_required, not_found) → errors.<code>.
 */
export function useMarkReturned(listingId: string) {
  const { t } = useTranslation('listing');
  const errorText = useErrorText();
  const mark = useMarkListingReturned(listingId);
  return {
    markReturned: (onDone?: () => void) =>
      mark.mutate(undefined, {
        onSuccess: () => {
          toast.show(t('lost_found.returned_done'), 'success');
          onDone?.();
        },
        onError: (e) => toast.show(errorText(e.code), 'danger'),
      }),
    isPending: mark.isPending,
  };
}
