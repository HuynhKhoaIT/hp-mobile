// Hook riêng mobile của engine Listing — chỉ gọi lại @hp/core và thêm phần của app (state bộ lọc, toast, haptic,
// Share sheet, gọi điện, requireAuth, analytics). Không gọi supabase trực tiếp, không khai báo query key.
import { logSearch, type MyListing, type PublicListing } from '@hp/core';
import {
  useBookmarkedListingIds,
  useDeleteListing,
  useListingList,
  useRenewListing,
  useRevealContact,
  useSession,
  useSetListingStatus,
  useSupabase,
  useToggleBookmark,
} from '@hp/core/react';
import {
  APP_NAME,
  featureOfCategory,
  HOME_SHORTCUTS,
  LISTING_CATEGORIES,
  type ListingCategory,
  type ListingFeature,
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
import { openPostPicker } from './navigation';
import type { ListingFeatureConfig } from './types';

/** Giá trị chip "Tất cả" / "Mọi khu" (không lọc). Mã category / site không bao giờ rỗng. */
export const ALL = '' as const;

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
 * State màn danh sách: từ khoá (gõ / đã tìm), category con, khu, bộ lọc đặt sẵn → useListingList (cursor, staleTime 60s).
 * Tìm có từ khoá → ghi log_search (số kết quả trang đầu) + event `search` một lần cho mỗi bộ lọc.
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
  const [preset, setPreset] = useState<ListingPreset | null>(asChip ? null : (initial.preset ?? null));

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
      ...(preset?.attributes ? { attributes: { ...preset.attributes } } : {}),
      ...(query ? { query } : {}),
      ...(site !== ALL ? { site } : {}),
    }),
    [category, config.categories, config.key, preset, query, site],
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
    preset,
    clearPreset: () => setPreset(null),
    /** Đang lọc (từ khoá / category / khu / đặt sẵn) → rỗng là "không tìm thấy", không phải "chưa có tin". */
    isFiltered: !!query || category !== ALL || site !== ALL || !!preset,
  };
}

/** Đăng tin: bắt đăng nhập trước → bước chọn loại tin (đặt sẵn tính năng khi gọi từ danh sách của tính năng đó). */
export function usePostListing(feature?: ListingFeatureConfig['key']) {
  const preset: ListingFeature | undefined = feature === 'all' ? undefined : feature;
  return () => requireAuth(() => openPostPicker(preset));
}

/** Nhắn tin với người đăng (chat ở tuần 5): bắt đăng nhập trước, hiện tại báo sắp có. */
export function useContactListing() {
  const { t } = useTranslation();
  return (listing: Pick<PublicListing, 'id' | 'category'>) =>
    requireAuth(() => {
      track('contact', { channel: 'chat', listing_id: listing.id, category: listing.category });
      toast.show(t('listing:detail.contact_soon'));
    });
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

/** Còn ≤ 3 ngày hoặc đã hết hạn → được gia hạn (server kiểm lại: too_early). */
const RENEW_WINDOW_MS = 3 * 24 * 60 * 60 * 1000;

/** Thao tác chủ tin hiện được với tin này (client chỉ ẩn / hiện; DB guard từ chối nếu sai). */
export function ownerActions(listing: Pick<MyListing, 'status' | 'expires_at'>, now: number = Date.now()) {
  const expiresAt = listing.expires_at ? new Date(listing.expires_at).getTime() : null;
  const expired = listing.status === 'expired' || (listing.status === 'active' && expiresAt !== null && expiresAt <= now);
  const live = listing.status === 'active' && !expired;
  return {
    markSold: live,
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

  const changeStatus = (id: string, status: OwnerListingStatus, doneKey: string) =>
    setStatus.mutate({ id, status }, { onSuccess: () => toast.show(t(doneKey), 'success'), onError: fail });

  return {
    markSold: (id: string) => changeStatus(id, 'sold', 'manage.sold_done'),
    close: (id: string) => changeStatus(id, 'closed', 'manage.closed_done'),
    reopen: (id: string) => changeStatus(id, 'active', 'manage.reopened'),
    /** Kết quả luôn là chờ duyệt → toast "Tin đang chờ duyệt". */
    resubmit: (id: string) => changeStatus(id, 'active', 'form.pending_title'),
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
