'use client';

// Hook chat riêng web (ghép @hp/core/react với điều hướng, chọn ảnh, localStorage). Dữ liệu + optimistic + Realtime ở
// @hp/core/react — cùng hành vi với app (apps/mobile/src/features/chat/hooks.ts). Hộp thư: dịch vụ của hội thoại
// (conversationFeature) và lọc tại chỗ (useInboxFilter) ở @hp/core — dùng chung app; chữ giá tin ngữ cảnh
// (useConversationPrice) dịch + định dạng ở đây.
import { type ChatMessage, type ConversationSummary, conversationPriceSource } from '@hp/core';
import { useDiscardMessage, useSendMessage, useSession, useStartConversation } from '@hp/core/react';
import { type ChatContentError, formatDate, hasPhoneNumber, isChatContentError, newUuid, priceLabel } from '@hp/shared';
import { useLocale, useTranslations } from 'next-intl';
import { useCallback, useSyncExternalStore } from 'react';
import { useToast } from '@/components/shared/toast';
import { useErrorText } from '@/features/auth/components/use-error-text';
import { asLocale, priceText } from '@/features/listing/display';
import { prepareListingImage } from '@/features/listing/listing-image';
import { useRouter } from '@/i18n/navigation';

export type MessageStatus = 'sending' | 'sent' | 'seen' | 'failed';

export const conversationHref = (id: string) => `/tin-nhan/${id}`;

/** Chat nhóm (ghép xe / ghép trận): thành viên là chủ nhóm + người được nhận; không có "người kia", không chặn / tin. */
export const isGroupChat = (c: Pick<ConversationSummary, 'kind'>) => c.kind === 'group';

// ── Hướng dẫn giao dịch an toàn: hiện một lần trước cuộc trò chuyện đầu tiên, nhớ trên trình duyệt này ─────────

const SAFETY_KEY = 'hp:chat-safety-seen';
const safetyListeners = new Set<() => void>();

function readSafetySeen(): boolean {
  try {
    return window.localStorage.getItem(SAFETY_KEY) === '1';
  } catch {
    // localStorage bị chặn (chế độ riêng tư): không làm phiền mỗi lần mở chat.
    return true;
  }
}

function subscribeSafety(listener: () => void) {
  safetyListeners.add(listener);
  window.addEventListener('storage', listener);
  return () => {
    safetyListeners.delete(listener);
    window.removeEventListener('storage', listener);
  };
}

/** `seen` = đã bấm "Tôi đã hiểu". Server render coi như đã xem (không nháy dialog trước khi đọc được localStorage). */
export function useChatSafety() {
  const seen = useSyncExternalStore(subscribeSafety, readSafetySeen, () => true);
  const markSeen = useCallback(() => {
    try {
      window.localStorage.setItem(SAFETY_KEY, '1');
    } catch {
      // Không lưu được: lần sau hiện lại, không lỗi.
    }
    for (const l of safetyListeners) l();
  }, []);
  return { seen, markSeen };
}

// ── Mở hội thoại từ chi tiết tin ────────────────────────────────────────────────────────────────────────────

/** CTA "Nhắn tin": mở (hoặc lấy lại) hội thoại với chủ tin rồi vào khung chat. Lỗi (tin của mình, bị chặn…) → toast. */
export function useOpenConversation() {
  const { mutate, isPending } = useStartConversation();
  const router = useRouter();
  const toast = useToast();
  const errorText = useErrorText();
  const open = useCallback(
    (listingId: string) =>
      mutate(
        { listingId },
        {
          onSuccess: (conversationId) => router.push(conversationHref(conversationId)),
          onError: (e) => toast.show(errorText(e.code), 'error'),
        },
      ),
    [mutate, router, toast, errorText],
  );
  return { open, isPending };
}

// ── Gửi tin ─────────────────────────────────────────────────────────────────────────────────────────────────

/** Gửi chữ / ảnh / gửi lại tin lỗi. Optimistic + giữ tin lỗi trong cache ở useSendMessage. */
export function useChatSender(conversationId: string) {
  const { userId } = useSession();
  const send = useSendMessage();
  const discard = useDiscardMessage();
  const toast = useToast();
  const errorText = useErrorText();

  /**
   * Gửi chữ. Có SĐT → không gửi, báo ngay (`onRejected`). Server chặn nội dung (SĐT lách, từ thô tục) → gỡ bong bóng
   * tạm và `onRejected(code)` để khung chat trả chữ về ô nhập, hiện lỗi dưới ô (không để tin "lỗi, gửi lại" vô nghĩa).
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

  /** Ảnh: nén trong trình duyệt (cạnh dài 1280, WebP, ≤ 2 MB — cùng quy tắc ảnh tin) rồi gửi; xem trước bằng object URL. */
  const sendImage = async (file: File) => {
    if (!userId) return;
    const prepared = await prepareListingImage(file);
    if (prepared.error) {
      toast.show(errorText(prepared.error), 'error');
      return;
    }
    send.mutate({
      id: newUuid(),
      conversationId,
      senderId: userId,
      // Object URL không thu hồi: giữ cho bong bóng tới khi rời trang (một ảnh / lần gửi, giải phóng khi tải lại).
      image: { body: prepared.data.blob, contentType: prepared.data.contentType, localUri: URL.createObjectURL(prepared.data.blob) },
    });
  };

  /** Gửi lại tin chữ lỗi. Ảnh lỗi: bản nén không giữ lại → trả false để nơi gọi bỏ tin (người dùng chọn lại ảnh). */
  const retry = (m: ChatMessage) => {
    if (!userId || !m.body) return false;
    send.mutate({ id: m.id, conversationId, senderId: userId, body: m.body });
    return true;
  };

  return { sendText, sendImage, retry };
}

/** Tin "đang gửi" quá lâu (mạng treo, tab ngủ) → coi là lỗi để người dùng gửi lại. */
const STALE_SENDING_MS = 60_000;

/** Trạng thái hiển thị cho tin của mình. Chỉ tin mới nhất của mình hiện "Đã gửi / Đã xem". */
export function messageStatus(m: ChatMessage, opts: { latestMine: boolean; otherReadAt: string | null }): MessageStatus | undefined {
  if (m.status === 'failed') return 'failed';
  if (m.status === 'sending') return Date.now() - Date.parse(m.created_at) > STALE_SENDING_MS ? 'failed' : 'sending';
  if (!opts.latestMine) return undefined;
  return opts.otherReadAt && opts.otherReadAt >= m.created_at ? 'seen' : 'sent';
}

/** Ngày theo giờ Việt Nam (UTC+7) — giống formatDate và app. */
export const dayKey = (iso: string) => new Date(Date.parse(iso) + 7 * 3_600_000).toISOString().slice(0, 10);

/** Nhãn ngày phân cách: Hôm nay / Hôm qua / ngày. */
export function useDayLabel() {
  const t = useTranslations('chat.thread');
  const locale = asLocale(useLocale());
  return (iso: string) => {
    const key = dayKey(iso);
    if (key === dayKey(new Date().toISOString())) return t('today');
    if (key === dayKey(new Date(Date.now() - 86_400_000).toISOString())) return t('yesterday');
    return formatDate(iso, locale, 'date');
  };
}

/**
 * Dòng xem trước ở hộp thư: "Bạn: …" khi mình gửi tin cuối, "Đã gửi một ảnh" khi tin cuối là ảnh. Chat nhóm: tin của
 * người khác có tên người gửi ("An N.: …").
 */
export function usePreviewText() {
  const t = useTranslations();
  const { userId } = useSession();
  return (c: ConversationSummary) => {
    if (!c.last_message_at) return t('chat.inbox.no_messages');
    const text = c.last_message_preview ?? t('chat.inbox.image');
    if (c.last_sender_id === userId) return t('chat.inbox.you', { text });
    return isGroupChat(c) && c.last_sender_name ? t('web.chat.group_preview', { name: c.last_sender_name, text }) : text;
  };
}

// ── Hộp thư: dịch vụ, giá, lọc tại chỗ (giống app) ────────────────────────────────────────────────────────────

export { conversationFeature } from '@hp/core';
export { type InboxFilter, useInboxFilter } from '@hp/core/react';

/** Chữ giá của tin ngữ cảnh; việc làm / hội thoại nhóm / không giá → null. */
export function useConversationPrice() {
  const t = useTranslations();
  const locale = asLocale(useLocale());
  return useCallback(
    (c: Pick<ConversationSummary, 'listing_category' | 'listing_price' | 'listing_price_type'>) => {
      const source = conversationPriceSource(c);
      return source ? priceText(priceLabel(source), t, locale) || null : null;
    },
    [t, locale],
  );
}
