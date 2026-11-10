// Hook thông báo + tuỳ chọn push + hồ sơ công khai (tuần 6). Đánh dấu đã đọc / đổi tuỳ chọn: optimistic + rollback.
import type { NotificationPrefs } from '@hp/shared';
import { type InfiniteData, useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { keys } from '../keys';
import { listListingsByOwner, type PublicListing } from '../listings';
import { readNotificationPrefs, subscribeToNotifications, updateNotificationPrefs } from '../notifications';
import { getPublicProfile, type MyProfile, type PublicProfile } from '../profile';
import type { AppError } from '../result';
import { listNotifications, markNotificationsRead, type Notification, type Page } from '../social';
import { unwrap, useSession } from './hooks';
import { useSupabase } from './provider';

type NotificationPages = InfiniteData<Page<Notification>, string | null>;

/** Danh sách thông báo (mới nhất trước, cursor). */
export function useNotifications(opts: { enabled?: boolean } = {}) {
  const client = useSupabase();
  const { userId } = useSession();
  const result = useInfiniteQuery<Page<Notification>, AppError, NotificationPages, readonly unknown[], string | null>({
    queryKey: keys.notifications(),
    queryFn: ({ pageParam }) => unwrap(listNotifications(client, { cursor: pageParam })),
    initialPageParam: null,
    getNextPageParam: (last) => last.nextCursor,
    enabled: !!userId && (opts.enabled ?? true),
    staleTime: 15_000,
  });
  const items = result.data?.pages.flatMap((p) => p.items) ?? [];
  return { ...result, items };
}

/** Đánh dấu đã đọc (danh sách id, hoặc tất cả khi bỏ trống) — chấm đỏ tắt ngay. */
export function useMarkNotificationsRead() {
  const client = useSupabase();
  const qc = useQueryClient();
  return useMutation<null, AppError, { ids?: string[] }, { list?: NotificationPages; count?: number }>({
    mutationFn: (v) => unwrap(markNotificationsRead(client, v.ids)),
    onMutate: async (v) => {
      await qc.cancelQueries({ queryKey: keys.notifications() });
      const list = qc.getQueryData<NotificationPages>(keys.notifications());
      const count = qc.getQueryData<number>(keys.unreadCount());
      const now = new Date().toISOString();
      const hit = (n: Notification) => !n.read_at && (!v.ids || v.ids.includes(n.id));
      const marked = list?.pages.reduce((sum, p) => sum + p.items.filter(hit).length, 0) ?? 0;
      if (list) {
        qc.setQueryData<NotificationPages>(keys.notifications(), {
          ...list,
          pages: list.pages.map((p) => ({ ...p, items: p.items.map((n) => (hit(n) ? { ...n, read_at: now } : n)) })),
        });
      }
      if (count !== undefined) qc.setQueryData<number>(keys.unreadCount(), v.ids ? Math.max(0, count - marked) : 0);
      return { list, count };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.list) qc.setQueryData(keys.notifications(), ctx.list);
      if (ctx?.count !== undefined) qc.setQueryData(keys.unreadCount(), ctx.count);
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: keys.notifications() });
    },
  });
}

/** Nghe thông báo mới của mình (gắn một lần khi đăng nhập, vd layout tab) → làm mới chuông + danh sách. */
export function useNotificationsRealtime(enabled = true) {
  const client = useSupabase();
  const qc = useQueryClient();
  const { userId } = useSession();
  useEffect(() => {
    if (!userId || !enabled) return;
    return subscribeToNotifications(client, {
      userId,
      onInsert: () => {
        // keys.notifications() là cha của keys.unreadCount() → làm mới cả hai
        void qc.invalidateQueries({ queryKey: keys.notifications() });
      },
    });
  }, [client, qc, userId, enabled]);
}

/** Tuỳ chọn push (đủ 4 nhóm, thiếu = bật) của chính mình. */
export function useNotificationPrefs(profile: Pick<MyProfile, 'notification_prefs'> | undefined) {
  return readNotificationPrefs(profile?.notification_prefs);
}

/** Bật / tắt một nhóm push — công tắc đổi ngay, lỗi thì trả lại. */
export function useUpdateNotificationPrefs() {
  const client = useSupabase();
  const qc = useQueryClient();
  const { userId } = useSession();
  return useMutation<MyProfile, AppError, NotificationPrefs, { previous?: MyProfile }>({
    mutationFn: (prefs) => unwrap(updateNotificationPrefs(client, prefs)),
    onMutate: async (prefs) => {
      const key = keys.me(userId ?? undefined);
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<MyProfile>(key);
      if (previous) qc.setQueryData<MyProfile>(key, { ...previous, notification_prefs: readNotificationPrefs(prefs) });
      return { previous };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.previous) qc.setQueryData(keys.me(userId ?? undefined), ctx.previous);
    },
    onSuccess: (profile) => qc.setQueryData(keys.me(profile.id), profile),
  });
}

// ── Hồ sơ công khai ─────────────────────────────────────────────────────────────

export function usePublicProfile(id: string | undefined) {
  const client = useSupabase();
  return useQuery<PublicProfile, AppError>({
    queryKey: keys.profile(id ?? ''),
    queryFn: () => unwrap(getPublicProfile(client, id ?? '')),
    enabled: !!id,
    staleTime: 60_000,
  });
}

/** Tin đang hiện của một người (cursor). */
export function useOwnerListings(ownerId: string | undefined) {
  const client = useSupabase();
  const result = useInfiniteQuery<
    Page<PublicListing>,
    AppError,
    InfiniteData<Page<PublicListing>, string | null>,
    readonly unknown[],
    string | null
  >({
    queryKey: keys.ownerListings(ownerId ?? ''),
    queryFn: ({ pageParam }) => unwrap(listListingsByOwner(client, { ownerId: ownerId ?? '', cursor: pageParam })),
    initialPageParam: null,
    getNextPageParam: (last) => last.nextCursor,
    enabled: !!ownerId,
    staleTime: 60_000,
  });
  const items = result.data?.pages.flatMap((p) => p.items) ?? [];
  return { ...result, items };
}
