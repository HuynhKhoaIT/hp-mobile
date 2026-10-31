// Hook riêng mobile của engine Listing — chỉ gọi lại @hp/core và thêm phần của app (state bộ lọc, toast,
// Share sheet, requireAuth). Không gọi supabase trực tiếp, không khai báo query key.
import { logSearch, type PublicListing } from '@hp/core';
import { useListingList, useSupabase } from '@hp/core/react';
import { APP_NAME, type ListingCategory } from '@hp/shared';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, Share } from 'react-native';
import { requireAuth } from '@/core/auth';
import { listingShareUrl } from '@/lib/urls';
import { toast } from '@/ui';
import type { ListingFeatureConfig } from './types';

/** Giá trị chip "Tất cả" / "Mọi khu" (không lọc). Mã category / site không bao giờ rỗng. */
export const ALL = '' as const;

/**
 * State màn danh sách: từ khoá (gõ / đã tìm), category con, khu → useListingList (cursor, staleTime 60s).
 * Tìm có từ khoá → ghi log_search (số kết quả trang đầu) một lần cho mỗi bộ lọc.
 */
export function useListingBrowser(config: ListingFeatureConfig, initial: { site?: string } = {}) {
  const client = useSupabase();
  const [input, setInput] = useState('');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<ListingCategory | typeof ALL>(ALL);
  const [site, setSite] = useState<string>(initial.site ?? ALL);

  const filters = useMemo(
    () => ({
      // 'all' không giới hạn category trừ khi chọn chip.
      ...(category !== ALL ? { categories: [category] } : config.key === 'all' ? {} : { categories: [...config.categories] }),
      ...(query ? { query } : {}),
      ...(site !== ALL ? { site } : {}),
    }),
    [category, config.categories, config.key, query, site],
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
    void logSearch(client, {
      query,
      category: category !== ALL ? category : undefined,
      results: firstPage.items.length,
    });
  }, [client, query, category, filters, firstPage]);

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
    /** Đang lọc (từ khoá / category / khu) → rỗng là "không tìm thấy", không phải "chưa có tin". */
    isFiltered: !!query || category !== ALL || site !== ALL,
  };
}

/** Đăng tin (tuần 4): bắt đăng nhập trước, hiện tại báo "sắp ra mắt". */
export function usePostListing() {
  const { t } = useTranslation();
  return () => requireAuth(() => toast.show(t('common:coming_soon.body')));
}

/** Nhắn tin với người đăng (chat ở tuần 5): bắt đăng nhập trước, hiện tại báo sắp có. */
export function useContactListing() {
  const { t } = useTranslation();
  return () => requireAuth(() => toast.show(t('listing:detail.contact_soon')));
}

/** Chia sẻ tin qua Share sheet hệ thống — luôn URL web https://tenapp.vn/tin/{slug}. */
export function useShareListing() {
  const { t } = useTranslation();
  return (listing: Pick<PublicListing, 'slug' | 'title'>) => {
    const url = listingShareUrl(listing.slug);
    const text = t('listing:detail.share_text', { title: listing.title, app: APP_NAME });
    // iOS nhận url riêng (xem trước link); Android chỉ có message → gắn link vào cuối.
    const content = Platform.OS === 'ios' ? { message: text, url } : { message: `${text}\n${url}` };
    Share.share(content).catch(() => toast.show(t('errors:unknown'), 'danger'));
  };
}
