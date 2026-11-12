// Hook chat riêng mobile (ghép @hp/core với điều hướng, chọn ảnh, MMKV). Dữ liệu + optimistic ở @hp/core/react.
// Hộp thư: dịch vụ của hội thoại (conversationFeature) và lọc tại chỗ (useInboxFilter) ở @hp/core — dùng chung web;
// chữ giá tin ngữ cảnh (useConversationPrice) dịch + định dạng ở đây.
import { type ChatMessage, type ConversationSummary, conversationFeature, conversationPriceSource } from '@hp/core';
import { useConversations, useDiscardMessage, useSendMessage, useSession, useStartConversation } from '@hp/core/react';
import { type ChatContentError, type Feature, hasPhoneNumber, isChatContentError, newUuid } from '@hp/shared';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { track } from '@/core/analytics';
import { requireAuth } from '@/core/auth';
import { kv, storage } from '@/core/storage';
import { pickImages, prepareListingImage } from '@/core/upload';
import { useErrorText } from '@/lib/errors';
import { formatDate } from '@/lib/format';
import { usePriceText } from '@/lib/listing';
import { toast, type MessageStatus } from '@/ui';

/** Hướng dẫn giao dịch an toàn: hiện một lần trước cuộc trò chuyện đầu tiên (CLAUDE.md mục 10), nhớ trên máy. */
export const useChatSafety = create<{ seen: boolean; markSeen: () => void }>()(
  persist((set) => ({ seen: false, markSeen: () => set({ seen: true }) }), {
    name: 'chat-safety',
    storage: createJSONStorage(() => kv(storage)),
  }),
);

export function openConversation(id: string, opts: { replace?: boolean } = {}) {
  const href = { pathname: '/chat/[conversationId]', params: { conversationId: id } } as const;
  if (opts.replace) router.replace(href);
  else router.push(href);
}

/**
 * Lối duy nhất listing / group dùng chat (.claude/rules/mobile-features.md). `open`: CTA "Nhắn tin" ở chi tiết tin —
 * khách → đăng nhập; mở (hoặc lấy lại) hội thoại rồi vào màn chat. `openGroupChat`: nút "Chat nhóm" ở chi tiết nhóm —
 * hội thoại nhóm đã có sẵn (chỉ chủ nhóm / thành viên đã được nhận đọc được id qua useGroupConversationId).
 */
export function useOpenConversation() {
  const start = useStartConversation();
  const errorText = useErrorText();
  const open = (listing: { id: string; category: string }) =>
    requireAuth(() => {
      track('contact', { channel: 'chat', listing_id: listing.id, category: listing.category });
      start.mutate(
        { listingId: listing.id },
        {
          onSuccess: (conversationId) => openConversation(conversationId),
          onError: (e) => toast.show(errorText(e.code), 'danger'),
        },
      );
    });
  const openGroupChat = (conversationId: string) => requireAuth(() => openConversation(conversationId));
  return { open, openGroupChat, isPending: start.isPending };
}

/** Gửi chữ / ảnh / gửi lại tin lỗi. Optimistic + giữ tin lỗi trong cache (persist MMKV) ở useSendMessage. */
export function useChatSender(conversationId: string) {
  const { userId } = useSession();
  const send = useSendMessage();
  const discard = useDiscardMessage();
  const errorText = useErrorText();

  /**
   * Gửi chữ. Có SĐT → không gửi, báo ngay (`onRejected`). Server chặn nội dung (SĐT lách, từ thô tục) → gỡ bong bóng
   * tạm và `onRejected(code)` để màn trả chữ về ô nhập, hiện lỗi dưới ô (không để tin "lỗi, gửi lại" vô nghĩa).
   */
  const sendText = (body: string, onRejected: (code: ChatContentError, body: string) => void) => {
    if (!userId) return;
    if (hasPhoneNumber(body)) {
      onRejected('message_has_phone', body);
      return;
    }
    const id = newUuid();
    send.mutate(
      { id, conversationId, senderId: userId, body },
      {
        onError: (e) => {
          if (!isChatContentError(e.code)) return;
          discard(conversationId, id);
          onRejected(e.code, body);
        },
      },
    );
  };

  const sendImage = async () => {
    if (!userId) return;
    const [picked] = await pickImages(1);
    if (!picked) return;
    const prepared = await prepareListingImage(picked);
    if ('error' in prepared) {
      toast.show(errorText(prepared.error), 'danger');
      return;
    }
    send.mutate({
      id: newUuid(),
      conversationId,
      senderId: userId,
      image: { ...prepared.data, localUri: picked.uri },
    });
  };

  /** Gửi lại tin chữ lỗi (ảnh lỗi: chọn lại ảnh — bản nén không giữ qua lần mở app). */
  const retry = (m: ChatMessage) => {
    if (!userId || !m.body) return false;
    send.mutate({ id: m.id, conversationId, senderId: userId, body: m.body });
    return true;
  };

  return { sendText, sendImage, retry };
}

/** Tin "đang gửi" khôi phục từ cache sau khi app bị tắt giữa chừng → coi là lỗi để người dùng gửi lại. */
const STALE_SENDING_MS = 60_000;

/** Trạng thái hiển thị cho tin của mình. Chỉ tin mới nhất của mình hiện "Đã gửi / Đã xem". */
export function messageStatus(m: ChatMessage, opts: { latestMine: boolean; otherReadAt: string | null }): MessageStatus | undefined {
  if (m.status === 'failed') return 'failed';
  if (m.status === 'sending') return Date.now() - Date.parse(m.created_at) > STALE_SENDING_MS ? 'failed' : 'sending';
  if (!opts.latestMine) return undefined;
  return opts.otherReadAt && opts.otherReadAt >= m.created_at ? 'seen' : 'sent';
}

/** Nhãn ngày phân cách: Hôm nay / Hôm qua / ngày. */
export function useDayLabel() {
  const { t } = useTranslation('chat');
  return (iso: string) => {
    const key = dayKey(iso);
    if (key === dayKey(new Date().toISOString())) return t('thread.today');
    if (key === dayKey(new Date(Date.now() - 86_400_000).toISOString())) return t('thread.yesterday');
    return formatDate(iso, 'date');
  };
}

/** Ngày theo giờ Việt Nam (UTC+7) — khu liên hợp, giống formatDate. */
export const dayKey = (iso: string) => new Date(Date.parse(iso) + 7 * 3_600_000).toISOString().slice(0, 10);

/**
 * Dòng xem trước ở hộp thư: "Bạn: …" khi mình gửi tin cuối, "Đã gửi một ảnh" khi tin cuối là ảnh. Chat nhóm: tin của
 * người khác kèm tên người gửi ("An N.: …").
 */
export function usePreviewText() {
  const { t } = useTranslation('chat');
  const { userId } = useSession();
  return (c: ConversationSummary) => {
    if (!c.last_message_at) return t('inbox.no_messages');
    const text = c.last_message_preview ?? t('inbox.image');
    if (c.last_sender_id === userId) return t('inbox.you', { text });
    return isGroupConversation(c) && c.last_sender_name ? t('inbox.sender', { name: c.last_sender_name, text }) : text;
  };
}

/** Hội thoại nhóm (ghép xe / ghép trận) — không có "người kia", không chặn / hiện SĐT; ngữ cảnh là nhóm. */
export const isGroupConversation = (c: Pick<ConversationSummary, 'kind'>) => c.kind === 'group';

export { conversationFeature } from '@hp/core';
export { type InboxFilter, useInboxFilter } from '@hp/core/react';

/** Hộp thư khoá theo một dịch vụ (tab Chat của mini-app) tự tải thêm trang tới khi đủ số dòng này (giống useInboxFilter). */
const LOCKED_MIN_VISIBLE = 8;

/**
 * Hộp thư chỉ một dịch vụ (tab Chat của mini-app — vd Chợ Pass chỉ hội thoại về tin pass đồ): lọc tại chỗ theo
 * conversationFeature; ít dòng mà còn trang → tự tải thêm. Không có chip lọc (useInboxFilter chỉ bật chip khi hộp thư có
 * từ hai dịch vụ trở lên nên không khoá được). `feature` undefined → trả nguyên hộp thư, không tự tải thêm.
 */
export function useFeatureInbox(
  list: { items: ConversationSummary[]; hasNextPage: boolean; isFetchingNextPage: boolean; fetchNextPage: () => unknown },
  feature: Feature | undefined,
) {
  const { items, hasNextPage, isFetchingNextPage, fetchNextPage } = list;
  const visible = useMemo(() => (feature ? items.filter((c) => conversationFeature(c) === feature) : items), [items, feature]);
  const short = !!feature && visible.length < LOCKED_MIN_VISIBLE;
  useEffect(() => {
    if (short && hasNextPage && !isFetchingNextPage) void fetchNextPage();
  }, [short, hasNextPage, isFetchingNextPage, fetchNextPage]);
  return visible;
}

/**
 * Số hội thoại chưa đọc của một dịch vụ (ô Chat trên thanh tab mini-app — khớp hộp thư khoá theo tính năng, không đếm
 * dịch vụ khác): đếm trên các trang hộp thư đã tải (useFeatureInbox tự tải thêm khi ít dòng; cùng cache với tab Chat).
 */
export function useFeatureUnreadCount(feature: Feature): number {
  const session = useSession();
  const list = useConversations({ enabled: !!session.userId });
  const visible = useFeatureInbox(list, feature);
  return useMemo(() => visible.filter((c) => c.unread_count > 0).length, [visible]);
}

/** Chữ giá của tin ngữ cảnh ("1.500.000 ₫", "Thoả thuận"…); việc làm / hội thoại nhóm / không giá → null. */
export function useConversationPrice() {
  const price = usePriceText();
  return useCallback(
    (c: Pick<ConversationSummary, 'listing_category' | 'listing_price' | 'listing_price_type'>) => {
      const source = conversationPriceSource(c);
      return source ? price(source) || null : null;
    },
    [price],
  );
}
