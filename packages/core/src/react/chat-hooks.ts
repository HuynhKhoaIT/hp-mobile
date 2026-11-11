// Hook chat + báo cáo / chặn (tuần 5). Gửi tin optimistic: tin hiện ngay trạng thái 'sending'; lỗi → 'failed' và
// GIỮ trong cache để gửi lại / bỏ (không rollback mất chữ người dùng đã gõ). Realtime chèn tin của người kia vào cache.
import { CHAT, type Feature, FEATURES, type ReportInput } from '@hp/shared';
import { type InfiniteData, type QueryClient, useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  type ChatMessage,
  chatImageUrls,
  type ConversationMember,
  type ConversationSummary,
  conversationFeature,
  countUnreadConversations,
  getConversation,
  getGroupConversationId,
  joinTypingChannel,
  listConversationMembers,
  listConversations,
  listMessages,
  markConversationRead,
  type Message,
  sendMessage,
  setConversationMuted,
  startListingConversation,
  subscribeToMessages,
  uploadChatImage,
} from '../chat';
import { keys } from '../keys';
import { createReport } from '../reports';
import type { AppError } from '../result';
import { listBlocked, type Page, setBlocked } from '../social';
import { unwrap, useSession } from './hooks';
import { idArray, toIdSet } from './listing-hooks';
import { useSupabase } from './provider';

type MessagePages = InfiniteData<Page<ChatMessage>, string | null>;

// Gói chỉ có lib ES2022 (dùng chung app / web / Edge) → khai báo tối thiểu timer có sẵn trên cả ba nền tảng.
type TimerId = number | object;
const timers = globalThis as unknown as { setTimeout(fn: () => void, ms: number): TimerId; clearTimeout(id: TimerId): void };

// ── Hộp thư ─────────────────────────────────────────────────────────────────────

export function useConversations(opts: { enabled?: boolean } = {}) {
  const client = useSupabase();
  const { userId } = useSession();
  const result = useInfiniteQuery<
    Page<ConversationSummary>,
    AppError,
    InfiniteData<Page<ConversationSummary>>,
    readonly unknown[],
    string | null
  >({
    queryKey: keys.conversations(),
    queryFn: ({ pageParam }) => unwrap(listConversations(client, { cursor: pageParam })),
    initialPageParam: null,
    getNextPageParam: (last) => last.nextCursor,
    enabled: !!userId && (opts.enabled ?? true),
    staleTime: 15_000,
  });
  const items = result.data?.pages.flatMap((p) => p.items) ?? [];
  return { ...result, items };
}

export function useConversation(conversationId: string | undefined) {
  const client = useSupabase();
  const qc = useQueryClient();
  return useQuery<ConversationSummary, AppError>({
    queryKey: keys.conversation(conversationId ?? ''),
    queryFn: () => unwrap(getConversation(client, conversationId ?? '')),
    enabled: !!conversationId,
    staleTime: 15_000,
    placeholderData: () => (conversationId ? findCachedConversation(qc, conversationId) : undefined),
  });
}

/** Id chat nhóm của nhóm (null khi chưa là thành viên / khách — không gọi server). */
export function useGroupConversationId(groupId: string | undefined, opts: { enabled?: boolean } = {}) {
  const client = useSupabase();
  const { userId } = useSession();
  return useQuery<string | null, AppError>({
    queryKey: keys.groupConversation(groupId ?? '', userId ?? ''),
    queryFn: () => unwrap(getGroupConversationId(client, groupId ?? '')),
    enabled: !!groupId && !!userId && (opts.enabled ?? true),
    staleTime: 5 * 60_000,
  });
}

/** Thành viên hội thoại — chat nhóm dùng để hiện tên / avatar người gửi. */
export function useConversationMembers(conversationId: string | undefined, opts: { enabled?: boolean } = {}) {
  const client = useSupabase();
  return useQuery<ConversationMember[], AppError>({
    queryKey: keys.conversationMembers(conversationId ?? ''),
    queryFn: () => unwrap(listConversationMembers(client, conversationId ?? '')),
    enabled: !!conversationId && (opts.enabled ?? true),
    staleTime: 60_000,
  });
}

/** Số hội thoại chưa đọc (chấm đỏ tab Chat / header). 0 khi khách. */
export function useUnreadConversationCount() {
  const client = useSupabase();
  const { userId } = useSession();
  return useQuery<number, AppError>({
    queryKey: keys.unreadConversations(),
    queryFn: () => unwrap(countUnreadConversations(client)),
    enabled: !!userId,
    staleTime: 15_000,
  });
}

/** Nghe tin mới ở mọi hội thoại (gắn một lần khi đăng nhập, vd ở layout tab) → làm mới hộp thư + chấm đỏ. */
export function useInboxRealtime(enabled = true) {
  const client = useSupabase();
  const qc = useQueryClient();
  const { userId } = useSession();
  useEffect(() => {
    if (!userId || !enabled) return;
    return subscribeToMessages(client, {
      onInsert: (m) => {
        void qc.invalidateQueries({ queryKey: keys.conversations() });
        if (m.sender_id !== userId) void qc.invalidateQueries({ queryKey: keys.unreadCount() });
      },
    });
  }, [client, qc, userId, enabled]);
}

/** Mở hội thoại với chủ tin (CTA "Nhắn tin"). Trả conversation id. */
export function useStartConversation() {
  const client = useSupabase();
  const qc = useQueryClient();
  return useMutation<string, AppError, { listingId: string }>({
    mutationFn: (v) => unwrap(startListingConversation(client, v.listingId)),
    onSuccess: () => void qc.invalidateQueries({ queryKey: keys.conversations() }),
  });
}

// ── Màn hội thoại ───────────────────────────────────────────────────────────────

/**
 * Tin nhắn (mới nhất trước, trang cũ hơn khi cuộn lên) + realtime của hội thoại.
 * `items` mới nhất trước — hợp FlatList `inverted`.
 */
export function useMessages(conversationId: string | undefined) {
  const client = useSupabase();
  const qc = useQueryClient();
  const result = useInfiniteQuery<Page<ChatMessage>, AppError, MessagePages, readonly unknown[], string | null>({
    queryKey: keys.messages(conversationId ?? ''),
    queryFn: async ({ pageParam }) => {
      const page = await unwrap(listMessages(client, { conversationId: conversationId ?? '', cursor: pageParam }));
      // Refetch trang đầu: giữ tin đang gửi / lỗi (server chưa có) đang nằm trong cache
      return pageParam === null ? keepPending(qc.getQueryData<MessagePages>(keys.messages(conversationId ?? '')), page) : page;
    },
    initialPageParam: null,
    getNextPageParam: (last) => last.nextCursor,
    enabled: !!conversationId,
    staleTime: Infinity, // realtime giữ cache mới; mở lại màn → refetch khi mount
    refetchOnMount: 'always',
  });

  useEffect(() => {
    if (!conversationId) return;
    return subscribeToMessages(client, {
      conversationId,
      onInsert: (m) => {
        upsertMessage(qc, conversationId, m);
        void qc.invalidateQueries({ queryKey: keys.conversation(conversationId) });
      },
    });
  }, [client, qc, conversationId]);

  const items = useMemo(() => result.data?.pages.flatMap((p) => p.items) ?? [], [result.data]);
  return { ...result, items };
}

/** Signed URL ảnh của các tin đang hiện (cache 50 phút < hạn 1 giờ). */
export function useChatImageUrls(conversationId: string | undefined, paths: string[], opts: { transform?: boolean } = {}) {
  const client = useSupabase();
  const sorted = useMemo(() => [...new Set(paths)].sort(), [paths]);
  return useQuery<Record<string, string>, AppError>({
    queryKey: keys.chatImages(conversationId ?? '', sorted),
    queryFn: () => unwrap(chatImageUrls(client, sorted, opts)),
    enabled: !!conversationId && sorted.length > 0,
    staleTime: 50 * 60_000,
    placeholderData: (prev) => prev,
  });
}

export type SendChatMessageVars = {
  id: string;
  conversationId: string;
  senderId: string;
  body?: string;
  /** Ảnh đã nén sẵn (app: expo-image-manipulator, web: canvas). */
  image?: { body: ArrayBuffer | Blob; contentType: 'image/webp' | 'image/jpeg'; localUri?: string | null };
};

/** Gửi tin optimistic. Gửi lại tin lỗi: gọi lại mutate với cùng `id`. */
export function useSendMessage() {
  const client = useSupabase();
  const qc = useQueryClient();
  return useMutation<Message, AppError, SendChatMessageVars>({
    mutationFn: async (v) => {
      let imagePath: string | undefined;
      if (v.image) {
        imagePath = await unwrap(
          uploadChatImage(client, { conversationId: v.conversationId, messageId: v.id, body: v.image.body, contentType: v.image.contentType }),
        );
      }
      return unwrap(sendMessage(client, { id: v.id, conversationId: v.conversationId, body: v.body, imagePath }));
    },
    onMutate: async (v) => {
      await qc.cancelQueries({ queryKey: keys.messages(v.conversationId) });
      upsertMessage(qc, v.conversationId, {
        id: v.id,
        conversation_id: v.conversationId,
        sender_id: v.senderId,
        body: v.body?.trim() || null,
        image_path: null,
        created_at: new Date().toISOString(),
        status: 'sending',
        localImageUri: v.image?.localUri ?? null,
      });
    },
    onError: (_e, v) => patchMessage(qc, v.conversationId, v.id, { status: 'failed' }),
    onSuccess: (saved, v) => upsertMessage(qc, v.conversationId, { ...saved, localImageUri: v.image?.localUri ?? null }),
    onSettled: (_d, _e, v) => {
      void qc.invalidateQueries({ queryKey: keys.conversations() });
      void qc.invalidateQueries({ queryKey: keys.conversation(v.conversationId) });
    },
  });
}

/** Bỏ một tin gửi lỗi khỏi cache. */
export function useDiscardMessage() {
  const qc = useQueryClient();
  return useCallback(
    (conversationId: string, id: string) =>
      qc.setQueryData<MessagePages>(keys.messages(conversationId), (data) =>
        data ? { ...data, pages: data.pages.map((p) => ({ ...p, items: p.items.filter((m) => m.id !== id) })) } : data,
      ),
    [qc],
  );
}

/** Đánh dấu đã đọc khi mở màn / có tin mới. Cập nhật chấm đỏ ngay (optimistic). */
export function useMarkConversationRead() {
  const client = useSupabase();
  const qc = useQueryClient();
  return useMutation<null, AppError, { conversationId: string }>({
    mutationFn: (v) => unwrap(markConversationRead(client, v.conversationId)),
    onMutate: (v) => {
      qc.setQueryData<InfiniteData<Page<ConversationSummary>>>(keys.conversations(), (data) =>
        data
          ? {
              ...data,
              pages: data.pages.map((p) => ({
                ...p,
                items: p.items.map((c) => (c.id === v.conversationId ? { ...c, unread_count: 0 } : c)),
              })),
            }
          : data,
      );
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: keys.unreadConversations() });
      void qc.invalidateQueries({ queryKey: keys.unreadCount() });
      void qc.invalidateQueries({ queryKey: keys.notifications() });
    },
  });
}

export function useSetConversationMuted() {
  const client = useSupabase();
  const qc = useQueryClient();
  const { userId } = useSession();
  return useMutation<null, AppError, { conversationId: string; muted: boolean }>({
    mutationFn: (v) => unwrap(setConversationMuted(client, { ...v, userId: userId ?? '' })),
    onSettled: (_d, _e, v) => {
      void qc.invalidateQueries({ queryKey: keys.conversation(v.conversationId) });
      void qc.invalidateQueries({ queryKey: keys.conversations() });
    },
  });
}

/** "Đang gõ": `isTyping` của người kia + `notifyTyping()` gọi khi mình gõ (đã throttle). */
export function useTyping(conversationId: string | undefined) {
  const client = useSupabase();
  const { userId } = useSession();
  const [isTyping, setTyping] = useState(false);
  const sendRef = useRef<() => void>(() => {});

  useEffect(() => {
    if (!conversationId || !userId) return;
    let timer: TimerId | undefined;
    const ch = joinTypingChannel(client, {
      conversationId,
      userId,
      onTyping: () => {
        setTyping(true);
        if (timer) timers.clearTimeout(timer);
        timer = timers.setTimeout(() => setTyping(false), CHAT.typingTimeoutMs);
      },
    });
    sendRef.current = ch.sendTyping;
    return () => {
      if (timer) timers.clearTimeout(timer);
      sendRef.current = () => {};
      ch.leave();
    };
  }, [client, conversationId, userId]);

  // Tin mới của người kia đến → tắt "đang gõ"
  const stopTyping = useCallback(() => setTyping(false), []);
  const notifyTyping = useCallback(() => sendRef.current(), []);
  return { isTyping, notifyTyping, stopTyping };
}

// ── Báo cáo / chặn ──────────────────────────────────────────────────────────────

export function useReport() {
  const client = useSupabase();
  return useMutation<{ already: boolean }, AppError, ReportInput>({
    mutationFn: (input) => unwrap(createReport(client, input)),
  });
}

/** Danh sách id mình đã chặn. */
export function useBlockedIds(opts: { enabled?: boolean } = {}) {
  const client = useSupabase();
  const { userId } = useSession();
  return useQuery<string[], AppError, Set<string>>({
    queryKey: keys.blocks(),
    queryFn: () => unwrap(listBlocked(client)),
    select: toIdSet, // cache giữ mảng (persist JSON), component nhận Set
    enabled: !!userId && (opts.enabled ?? true),
    staleTime: 60_000,
  });
}

/** Chặn / bỏ chặn (optimistic). Chặn có hiệu lực lên tin đăng (public_listings) và chat → làm mới cả hai. */
export function useToggleBlock() {
  const client = useSupabase();
  const qc = useQueryClient();
  return useMutation<null, AppError, { userId: string; next: boolean }, { previous: string[] | undefined }>({
    mutationFn: (v) => unwrap(setBlocked(client, v)),
    onMutate: async (v) => {
      await qc.cancelQueries({ queryKey: keys.blocks() });
      const previous = qc.getQueryData<string[]>(keys.blocks());
      const rest = idArray(previous).filter((id) => id !== v.userId);
      qc.setQueryData<string[]>(keys.blocks(), v.next ? [v.userId, ...rest] : rest);
      return { previous };
    },
    onError: (_e, _v, ctx) => qc.setQueryData(keys.blocks(), ctx?.previous),
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: keys.blocks() });
      void qc.invalidateQueries({ queryKey: keys.conversations() });
      void qc.invalidateQueries({ queryKey: keys.listings() });
      void qc.invalidateQueries({ queryKey: ['hp', 'listing'] });
    },
  });
}

// ── cache helpers ───────────────────────────────────────────────────────────────

function upsertMessage(qc: QueryClient, conversationId: string, m: ChatMessage) {
  qc.setQueryData<MessagePages>(keys.messages(conversationId), (data) => {
    if (!data) return { pages: [{ items: [m], nextCursor: null }], pageParams: [null] };
    let found = false;
    const pages = data.pages.map((p) => ({
      ...p,
      items: p.items.map((x) => {
        if (x.id !== m.id) return x;
        found = true;
        return { ...x, ...m, localImageUri: m.localImageUri ?? x.localImageUri, status: m.status };
      }),
    }));
    if (!found && pages[0]) pages[0] = { ...pages[0], items: [m, ...pages[0].items] };
    return { ...data, pages };
  });
}

function patchMessage(qc: QueryClient, conversationId: string, id: string, patch: Partial<ChatMessage>) {
  qc.setQueryData<MessagePages>(keys.messages(conversationId), (data) =>
    data
      ? { ...data, pages: data.pages.map((p) => ({ ...p, items: p.items.map((m) => (m.id === id ? { ...m, ...patch } : m)) })) }
      : data,
  );
}

/** Trang đầu mới từ server + tin đang gửi / lỗi của cache cũ chưa có trên server. */
function keepPending(old: MessagePages | undefined, first: Page<ChatMessage>): Page<ChatMessage> {
  const ids = new Set(first.items.map((m) => m.id));
  const keep = old?.pages[0]?.items.filter((m) => m.status && !ids.has(m.id)) ?? [];
  return keep.length === 0 ? first : { ...first, items: [...keep, ...first.items] };
}

function findCachedConversation(qc: QueryClient, id: string): ConversationSummary | undefined {
  const data = qc.getQueryData<InfiniteData<Page<ConversationSummary>>>(keys.conversations());
  for (const page of data?.pages ?? []) {
    const hit = page.items.find((c) => c.id === id);
    if (hit) return hit;
  }
  return undefined;
}

// ── Hộp thư: lọc tại chỗ (app + web) ────────────────────────────────────────────────────────────────────────────

export type InboxFilter = 'all' | 'unread' | Feature;

/** Đang lọc mà ít hơn số dòng này (khoảng một màn hình) → tải thêm trang. */
const FILTER_MIN_VISIBLE = 8;

/**
 * Lọc hộp thư tại chỗ trên các trang đã tải: Tất cả · Chưa đọc · theo dịch vụ. Chip dịch vụ chỉ có khi hộp thư có từ 2
 * dịch vụ trở lên (một dịch vụ thì trùng "Tất cả"); dịch vụ đang lọc không còn → về Tất cả. Đang lọc mà ít hơn một màn
 * kết quả và server còn trang → tự tải trang kế để không bỏ sót hội thoại cũ hơn.
 */
export function useInboxFilter(list: {
  items: ConversationSummary[];
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => unknown;
}) {
  const { items, hasNextPage, isFetchingNextPage, fetchNextPage } = list;
  const [filter, setFilter] = useState<InboxFilter>('all');
  const features = useMemo(() => {
    const present = FEATURES.filter((f) => items.some((c) => conversationFeature(c) === f));
    return present.length > 1 ? present : [];
  }, [items]);
  const active: InboxFilter = filter === 'all' || filter === 'unread' || features.includes(filter) ? filter : 'all';
  const visible = useMemo(
    () =>
      active === 'all' ? items : items.filter((c) => (active === 'unread' ? c.unread_count > 0 : conversationFeature(c) === active)),
    [items, active],
  );
  const short = active !== 'all' && visible.length < FILTER_MIN_VISIBLE;
  useEffect(() => {
    if (short && hasNextPage && !isFetchingNextPage) void fetchNextPage();
  }, [short, hasNextPage, isFetchingNextPage, fetchNextPage]);
  return { filter: active, setFilter, features, visible };
}
