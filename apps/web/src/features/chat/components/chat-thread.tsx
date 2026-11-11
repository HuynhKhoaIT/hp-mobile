'use client';

// Khung chat (style Stitch "Khung Chat trực tiếp", giống ChatThread của app): header xanh + thẻ tin / nhóm ngữ cảnh → tin
// nhắn cũ ở trên, mới nhất ở đáy (phân cách theo ngày bằng viên thuốc, gộp tin liên tiếp cùng người trong 5 phút; tin
// người kia có avatar ở tin cuối chuỗi, cả chat 1-1) → ô nhập + nút ảnh + nút gửi cam. Không có tin hệ thống / vị trí /
// trả lời nhanh / ghi âm của Stitch (chat không có các loại tin đó). Realtime (tin mới, đang gõ) qua @hp/core/react.
// Mở khung / có tin mới của người kia khi tab đang hiện → đánh dấu đã đọc. Lần đầu chat trên trình duyệt → hướng dẫn an
// toàn. Tuỳ chọn: tắt thông báo, báo cáo người dùng, chặn / bỏ chặn. "Xem tin cũ hơn" giữ nguyên vị trí đang đọc.
// Chat nhóm: tên + avatar người gửi trên tin của người khác (useConversationMembers), không chặn / báo cáo người dùng /
// "Đã xem" (nhiều người đọc), rỗng → group.chat.empty.
import type { ChatMessage } from '@hp/core';
import {
  useChatImageUrls,
  useConversation,
  useConversationMembers,
  useDiscardMessage,
  useMarkConversationRead,
  useMessages,
  useSession,
  useSetConversationMuted,
  useTyping,
} from '@hp/core/react';
import { CHAT, formatDate } from '@hp/shared';
import { MessageCircle, SearchX } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { Fragment, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState } from '@/components/shared/error-state';
import { Button } from '@/components/ui/button';
import { useErrorText } from '@/features/auth/components/use-error-text';
import { asLocale } from '@/features/listing/display';
import { ReportDialog } from '@/features/report/components/report-dialog';
import { useBlockAction, useReportAction } from '@/features/report/use-report';
import { Link } from '@/i18n/navigation';
import { publicEnv } from '@/lib/env';
import { dayKey, isGroupChat, messageStatus, useChatSafety, useChatSender, useDayLabel } from '../use-chat';
import { MessagesSkeleton } from './chat-skeletons';
import { Composer } from './composer';
import { MessageBubble } from './message-bubble';
import { SafetyGuideDialog } from './safety-guide-dialog';
import { ThreadHeader } from './thread-header';

/** Tin liền nhau cùng người gửi trong 5 phút → gộp, chỉ tin cuối chuỗi hiện giờ. */
const GROUP_MS = 5 * 60_000;
/** Cách đáy ít hơn mức này coi như đang ở cuối cuộc trò chuyện → tin mới tự cuộn xuống. */
const NEAR_BOTTOM_PX = 120;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function ChatThread({ conversationId }: { conversationId: string }) {
  if (!UUID.test(conversationId)) return <ThreadNotFound />;
  return <Thread conversationId={conversationId} />;
}

function Thread({ conversationId }: { conversationId: string }) {
  const t = useTranslations();
  const locale = asLocale(useLocale());
  const { userId } = useSession();
  const conversation = useConversation(conversationId);
  const messages = useMessages(conversationId);
  const { isTyping, notifyTyping, stopTyping } = useTyping(conversationId);
  const { mutate: markRead } = useMarkConversationRead();
  const muted = useSetConversationMuted();
  const discard = useDiscardMessage();
  const sender = useChatSender(conversationId);
  const dayLabel = useDayLabel();
  const safety = useChatSafety();
  const errorText = useErrorText();
  const [draft, setDraft] = useState('');
  const [contentError, setContentError] = useState<string | undefined>();

  const c = conversation.data;
  const isGroup = !!c && isGroupChat(c);
  const report = useReportAction({ type: 'profile', id: c?.other_user_id });
  const block = useBlockAction({ id: c?.other_user_id, name: c?.other_name });
  const blockedByMe = isGroup ? false : block.known ? block.isBlocked : !!c?.blocked_by_me;

  // Chat nhóm: tên / avatar người gửi theo user_id.
  const members = useConversationMembers(conversationId, { enabled: isGroup });
  const memberById = useMemo(() => new Map((members.data ?? []).map((m) => [m.user_id, m])), [members.data]);

  // Đường dẫn ảnh của các tin đang có → signed URL (bucket riêng tư).
  const imagePaths = useMemo(() => messages.items.flatMap((m) => (m.image_path ? [m.image_path] : [])), [messages.items]);
  const images = useChatImageUrls(conversationId, imagePaths, { transform: publicEnv.imageTransform });

  // Đánh dấu đã đọc khi mở và khi tin mới nhất (đã lưu) thay đổi — chỉ khi tab đang hiện; quay lại tab → đánh dấu tiếp.
  const newest = messages.items[0];
  const newestId = newest && !newest.status ? newest.id : undefined;
  const newestFromOther = !!newest && newest.sender_id !== userId;
  useEffect(() => {
    if (!newestId) return;
    if (newestFromOther) stopTyping();
    const mark = () => {
      if (document.visibilityState === 'visible') markRead({ conversationId });
    };
    mark();
    document.addEventListener('visibilitychange', mark);
    return () => document.removeEventListener('visibilitychange', mark);
  }, [newestId, newestFromOther, conversationId, markRead, stopTyping]);

  // ── Cuộn: mới nhất ở đáy ────────────────────────────────────────────────────────────────────────────────────
  const scrollRef = useRef<HTMLDivElement>(null);
  const nearBottom = useRef(true);
  const heightBeforeOlder = useRef<number | null>(null);
  const oldestId = messages.items.at(-1)?.id;
  const latestId = messages.items[0]?.id;
  const latestMine = messages.items[0]?.sender_id === userId;

  // Trang cũ hơn vừa chèn phía trên → giữ nguyên tin đang đọc.
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el || heightBeforeOlder.current === null) return;
    el.scrollTop += el.scrollHeight - heightBeforeOlder.current;
    heightBeforeOlder.current = null;
  }, [oldestId]);

  // Tin mới (của mình, hoặc của người kia khi đang ở cuối) / lần tải đầu → cuộn xuống đáy.
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el || !latestId) return;
    if (nearBottom.current || latestMine) el.scrollTop = el.scrollHeight;
  }, [latestId, latestMine]);

  const loadOlder = () => {
    const el = scrollRef.current;
    if (!el || !messages.hasNextPage || messages.isFetchingNextPage) return;
    heightBeforeOlder.current = el.scrollHeight;
    void messages.fetchNextPage();
  };

  const send = () => {
    const body = draft.trim();
    if (!body) return;
    setContentError(undefined);
    setDraft('');
    sender.sendText(body, (code, rejected) => {
      setDraft(rejected);
      setContentError(errorText(code));
    });
  };

  if (conversation.isError && !c) {
    if (conversation.error.code === 'not_found') return <ThreadNotFound />;
    return (
      <div className="flex flex-1 flex-col justify-center">
        <ErrorState code={conversation.error.code} onRetry={() => void conversation.refetch()} />
      </div>
    );
  }

  const latestMineId = messages.items.find((m) => m.sender_id === userId)?.id;
  const blockedText = isGroup
    ? undefined
    : blockedByMe
      ? t('chat.blocked.by_me')
      : c?.blocked_me
        ? t('chat.blocked.by_them')
        : undefined;
  // Hiện từ cũ → mới (items của hook: mới nhất trước).
  const ordered = [...messages.items].reverse();

  const renderMessage = (item: ChatMessage, index: number) => {
    const mine = item.sender_id === userId;
    const older = ordered[index - 1];
    const newer = ordered[index + 1];
    const lastOfRun =
      !newer || newer.sender_id !== item.sender_id || Date.parse(newer.created_at) - Date.parse(item.created_at) > GROUP_MS;
    const newDay = !older || dayKey(older.created_at) !== dayKey(item.created_at);
    const firstOfRun =
      newDay || older.sender_id !== item.sender_id || Date.parse(item.created_at) - Date.parse(older.created_at) > GROUP_MS;
    const member = isGroup && !mine && item.sender_id ? memberById.get(item.sender_id) : undefined;
    // Nhóm: tên + avatar người gửi; 1-1: chỉ avatar người kia (tên đã ở header).
    const senderInfo = mine
      ? undefined
      : isGroup
        ? {
            name: member?.display_name || t('chat.inbox.deleted_user'),
            avatar: member?.avatar_url ?? null,
            showName: firstOfRun,
            showAvatar: lastOfRun,
          }
        : c
          ? { name: c.other_name || t('chat.inbox.deleted_user'), avatar: c.other_avatar_url ?? null, showName: false, showAvatar: lastOfRun }
          : undefined;
    const status = mine
      ? messageStatus(item, { latestMine: item.id === latestMineId, otherReadAt: c?.other_last_read_at ?? null })
      : undefined;
    const imageUri = item.localImageUri ?? (item.image_path ? images.data?.[item.image_path] : null);

    return (
      <Fragment key={item.id}>
        {newDay ? (
          <li className="flex justify-center py-3" aria-hidden>
            <span className="rounded-full border border-border bg-surface-2 px-3 py-1 text-sm font-medium text-muted">
              {dayLabel(item.created_at)}
            </span>
          </li>
        ) : null}
        <li className={lastOfRun ? 'pb-3' : 'pb-1'}>
          <MessageBubble
            mine={mine}
            body={item.body}
            imageUri={imageUri}
            imagePending={!!item.image_path && !imageUri}
            time={formatDate(item.created_at, locale, 'time')}
            status={status}
            showMeta={lastOfRun || status === 'failed'}
            sender={senderInfo}
            onRetry={() => {
              if (!sender.retry(item)) discard(conversationId, item.id);
            }}
          />
        </li>
      </Fragment>
    );
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ThreadHeader
        conversation={c}
        isTyping={isTyping}
        isBlocked={blockedByMe}
        onToggleMute={() => {
          if (c) muted.mutate({ conversationId, muted: !c.muted });
        }}
        onReport={report.open}
        onToggleBlock={block.ask}
      />

      <div
        ref={scrollRef}
        onScroll={(e) => {
          const el = e.currentTarget;
          nearBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < NEAR_BOTTOM_PX;
        }}
        className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain bg-bg"
      >
        {messages.isPending ? (
          <MessagesSkeleton />
        ) : messages.isError && messages.items.length === 0 ? (
          <div className="flex flex-1 flex-col justify-center">
            <ErrorState code={messages.error.code} onRetry={() => void messages.refetch()} />
          </div>
        ) : messages.items.length === 0 ? (
          <div className="flex flex-1 flex-col justify-center">
            <EmptyState icon={MessageCircle} title={isGroup ? t('group.chat.empty') : t('chat.thread.start_hint')} />
          </div>
        ) : (
          <div className="mt-auto flex flex-col px-4 pt-3">
            {messages.hasNextPage ? (
              <div className="flex justify-center pb-3">
                <Button type="button" variant="outline" size="sm" disabled={messages.isFetchingNextPage} onClick={loadOlder}>
                  {t('chat.thread.load_older')}
                </Button>
              </div>
            ) : null}
            <ol aria-label={t('chat.title')} className="flex flex-col">
              {ordered.map(renderMessage)}
            </ol>
          </div>
        )}
      </div>

      <Composer
        value={draft}
        onChange={(text) => {
          setDraft(text);
          if (contentError) setContentError(undefined);
          if (text) notifyTyping();
        }}
        onSend={send}
        onPickImage={(file) => void sender.sendImage(file)}
        maxLength={CHAT.bodyMax}
        error={contentError}
        disabledText={blockedText}
        disabledAction={blockedByMe ? { label: t('common.block.unblock'), onClick: block.unblock, pending: block.isPending } : undefined}
      />

      <ReportDialog {...report.dialogProps} />
      <ConfirmDialog {...block.confirmProps} />
      <SafetyGuideDialog open={!safety.seen && !!c} onAccept={safety.markSeen} />
    </div>
  );
}

function ThreadNotFound() {
  const t = useTranslations();
  return (
    <div className="flex flex-1 flex-col justify-center">
      <EmptyState
        icon={SearchX}
        title={t('chat.thread.not_found')}
        action={
          <Button asChild variant="outline">
            <Link href="/tin-nhan">{t('chat.title')}</Link>
          </Button>
        }
      />
    </div>
  );
}
