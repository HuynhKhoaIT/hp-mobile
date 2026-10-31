// Hook của trang chủ (Hub) — docs/design/home.md §4, §5, §8. Chỉ gọi lại hook của @hp/core và thêm phần riêng app
// (khu đã chọn lưu MMKV, toast, analytics, kéo để làm mới). Không gọi supabase, không khai báo query key.
import { needsOnboarding } from '@hp/core';
import {
  useBanners,
  useListingList,
  useMyListingStats,
  useMyProfile,
  usePublicStats,
  useSession,
  useSites,
  useUnreadNotificationCount,
  useUpdateProfile,
} from '@hp/core/react';
import { HOME_RAIL_SIZE, LISTING_FEATURES, type ListingCategory, type ListingFeature, type Locale } from '@hp/shared';
import { useFocusEffect } from 'expo-router';
import { useAnimatedScrollHandler, useSharedValue } from 'react-native-reanimated';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { track } from '@/core/analytics';
import { useSettings } from '@/core/settings';
import { useErrorText } from '@/lib/errors';
import { toast } from '@/ui';

/** Thứ tự dải theo dịch vụ (§4.8) — cùng thứ tự LISTING_FEATURE_ORDER của web. */
export const HOME_FEATURE_ORDER: readonly ListingFeature[] = ['pass', 'room', 'job', 'lostFound'];

const isListingFeature = (f: string): f is ListingFeature => f in LISTING_FEATURES;

/**
 * Khu làm việc của Hub (§4.1): profiles.site → khu chọn lần trước trên máy → khu đầu tiên theo sort_order.
 * Đổi khu: luôn lưu máy; đã đăng nhập thì ghi thêm profiles.site (useUpdateProfile). Trong lúc ghi, hiện ngay khu mới.
 */
export function useHomeSite() {
  const errorText = useErrorText();
  const me = useMyProfile();
  const sites = useSites();
  const saved = useSettings((s) => s.homeSite);
  const setSaved = useSettings((s) => s.setHomeSite);
  const update = useUpdateProfile();
  const [pending, setPending] = useState<string | null>(null);

  const list = useMemo(() => sites.data ?? [], [sites.data]);
  const known = (code: string | null | undefined) => (code && list.some((s) => s.code === code) ? code : undefined);
  const code = known(pending) ?? known(me.data?.site) ?? known(saved) ?? list[0]?.code;
  const site = list.find((s) => s.code === code) ?? null;

  const change = (next: string) => {
    if (next === code) return;
    setSaved(next);
    track('home_site_change', { site: next });
    if (!me.data) return;
    setPending(next);
    update.mutate(
      { site: next },
      {
        onError: (e) => toast.show(errorText(e.code), 'danger'),
        onSettled: () => setPending(null),
      },
    );
  };

  return {
    site,
    sites: list,
    change,
    isLoading: sites.isLoading || me.isLoading,
    isError: sites.isError,
    refetch: () => sites.refetch(),
  };
}

export type HomeSite = ReturnType<typeof useHomeSite>;

export type PersonalCardKind = 'guest' | 'onboarding' | 'mine' | 'first_post';

/** Thẻ cá nhân (§4.5): chọn 1 biến thể theo thứ tự ưu tiên khách → chưa hoàn thiện hồ sơ → có tin → chưa có tin. */
export function usePersonalCard() {
  const session = useSession();
  const me = useMyProfile();
  const onboarding = !!me.data && needsOnboarding(me.data);
  const stats = useMyListingStats({ enabled: !!me.data && !onboarding });
  const s = stats.data;
  const hasListings = !!s && s.active + s.pending + s.rejected + s.drafts > 0;
  const kind: PersonalCardKind | null = session.isLoading
    ? null
    : !session.userId
      ? 'guest'
      : me.isLoading
        ? null
        : onboarding
          ? 'onboarding'
          : stats.isLoading || stats.isError
            ? null
            : hasListings
              ? 'mine'
              : 'first_post';
  return {
    kind,
    stats: s,
    isLoading: kind === null && !stats.isError && !me.isError,
    isError: me.isError || stats.isError,
    errorCode: (me.error ?? stats.error)?.code,
    refetch: () => {
      void me.refetch();
      void stats.refetch();
    },
  };
}

/**
 * Dải tin của Hub (§4.7, §4.8): "Gần {khu}" (10 tin mọi tính năng), "Dành cho bạn" (10 tin theo profile.interests,
 * bỏ tin đã có ở "Gần bạn"; không có interests Listing → ẩn), 4 dải theo dịch vụ (8 tin mới nhất, rỗng → ẩn).
 */
export function useHomeRails(siteCode: string | undefined) {
  const me = useMyProfile();
  const near = useListingList({ site: siteCode, limit: HOME_RAIL_SIZE.near }, { enabled: !!siteCode });

  const interestCategories = useMemo<ListingCategory[]>(
    () => (me.data?.interests ?? []).filter(isListingFeature).flatMap((f) => [...LISTING_FEATURES[f]]),
    [me.data?.interests],
  );
  const forYou = useListingList({ categories: interestCategories, limit: HOME_RAIL_SIZE.forYou }, { enabled: interestCategories.length > 0 });
  const nearIds = useMemo(() => new Set(near.items.map((l) => l.id)), [near.items]);
  const forYouItems = useMemo(() => forYou.items.filter((l) => !nearIds.has(l.id)), [forYou.items, nearIds]);

  const pass = useListingList({ categories: [...LISTING_FEATURES.pass], limit: HOME_RAIL_SIZE.feature });
  const room = useListingList({ categories: [...LISTING_FEATURES.room], limit: HOME_RAIL_SIZE.feature });
  const job = useListingList({ categories: [...LISTING_FEATURES.job], limit: HOME_RAIL_SIZE.feature });
  const lostFound = useListingList({ categories: [...LISTING_FEATURES.lostFound], limit: HOME_RAIL_SIZE.feature });
  const byFeature = { pass, room, job, lostFound };
  const features = HOME_FEATURE_ORDER.map((feature) => ({ feature, query: byFeature[feature] }));

  const settled = (q: { isLoading: boolean; isError: boolean }) => !q.isLoading && !q.isError;
  // Toàn bộ không có tin nào (đã tải xong, không lỗi) → một EmptyState thay cho các dải (§5).
  const allEmpty =
    !!siteCode &&
    settled(near) &&
    near.items.length === 0 &&
    features.every(({ query }) => settled(query) && query.items.length === 0) &&
    (interestCategories.length === 0 || (settled(forYou) && forYouItems.length === 0));

  return {
    near,
    forYou: { ...forYou, items: forYouItems, enabled: interestCategories.length > 0, categories: interestCategories },
    features,
    allEmpty,
    refetchAll: () =>
      Promise.all([
        siteCode ? near.refetch() : undefined,
        interestCategories.length > 0 ? forYou.refetch() : undefined,
        ...features.map(({ query }) => query.refetch()),
      ]),
  };
}

/** Banner theo ngôn ngữ đang dùng (đổi ngôn ngữ → tải bộ banner của ngôn ngữ đó). */
export function useHomeBanners() {
  const { i18n } = useTranslation();
  return useBanners('app_home', i18n.language as Locale);
}

/** Số chưa đọc cho chuông (khách: 0, không gọi server). */
export function useHomeUnread() {
  const unread = useUnreadNotificationCount();
  return { count: unread.data ?? 0, refetch: () => unread.refetch() };
}

export { usePublicStats as useHomeStats };

/**
 * Kéo xuống làm mới (§5): refetch mọi query của Hub cùng lúc (hồ sơ, khu, banner, thẻ cá nhân, số thông báo, số liệu,
 * các dải tin); vòng quay chạy tới khi tất cả xong. Query theo người dùng chỉ làm mới khi đã đăng nhập.
 */
export function useHubRefresh(refetchRails: () => Promise<unknown>) {
  const session = useSession();
  const me = useMyProfile();
  const sites = useSites();
  const banners = useHomeBanners();
  const stats = usePublicStats();
  const unread = useUnreadNotificationCount();
  const mine = useMyListingStats({ enabled: false });
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = () => {
    setRefreshing(true);
    const signedIn = !!session.userId;
    void Promise.allSettled([
      sites.refetch(),
      banners.refetch(),
      stats.refetch(),
      refetchRails(),
      ...(signedIn ? [me.refetch(), unread.refetch(), mine.refetch()] : []),
    ]).finally(() => setRefreshing(false));
  };
  return { refreshing, onRefresh };
}

/** Vị trí cuộn dọc của Hub (UI thread) cho header thu gọn. */
export function useHubScroll() {
  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((e) => {
    scrollY.set(e.contentOffset.y);
  });
  return { scrollY, onScroll };
}

/** Event `home_view` mỗi lần tab Trang chủ được mở lại. */
export function useHomeViewEvent() {
  useFocusEffect(
    useCallback(() => {
      track('home_view');
    }, []),
  );
}
