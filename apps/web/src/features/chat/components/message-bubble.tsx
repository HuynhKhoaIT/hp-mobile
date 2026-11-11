'use client';

// MessageBubble — một tin nhắn trong khung chat (giống apps/mobile/src/ui/MessageBubble.tsx). Của mình: nền primary, bên
// phải, góc dưới phải nhọn; người kia: nền surface có viền, bên trái. Ảnh (signed URL hoặc object URL khi đang gửi) bo theo
// bong bóng, bấm mở ảnh lớn ở tab mới. Dòng phụ: giờ + trạng thái chữ (đang gửi / đã gửi / đã xem) kèm icon đồng hồ / ✓ /
// ✓✓ (đã xem: màu primary); lỗi → nút chữ đỏ "Chưa gửi được…" để gửi lại (không truyền tin chỉ bằng màu / icon).
// `sender` (tin của người khác): chat nhóm có tên người gửi ở tin đầu chuỗi + avatar ở tin cuối chuỗi; chat 1-1 chỉ avatar
// (cột avatar giữ chỗ để các bong bóng cùng người thẳng hàng).
import { Check, CheckCheck, CircleAlert, Clock, LoaderCircle, type LucideIcon } from 'lucide-react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { UserAvatar } from '@/components/shared/user-avatar';
import { cn } from '@/lib/utils';
import type { MessageStatus } from '../use-chat';

const STATUS_ICON: Record<Exclude<MessageStatus, 'failed'>, LucideIcon> = { sending: Clock, sent: Check, seen: CheckCheck };

export type MessageBubbleProps = {
  mine: boolean;
  body?: string | null;
  /** URL ảnh đã ký hoặc object URL. `imagePending` = có ảnh nhưng chưa lấy được URL. */
  imageUri?: string | null;
  imagePending?: boolean;
  time: string;
  /** Chỉ tin của mình. Không truyền → không hiện trạng thái. */
  status?: MessageStatus;
  /** Hiện giờ / trạng thái (tắt cho tin giữa chuỗi liên tiếp). */
  showMeta?: boolean;
  onRetry?: () => void;
  /** Chat nhóm, tin của người khác: tên rút gọn + avatar người gửi. */
  sender?: { name: string; avatar: string | null; showName: boolean; showAvatar: boolean };
};

export function MessageBubble({
  mine,
  body,
  imageUri,
  imagePending = false,
  time,
  status,
  showMeta = true,
  onRetry,
  sender,
}: MessageBubbleProps) {
  const t = useTranslations();
  const failed = status === 'failed';
  const statusText =
    status === 'sending'
      ? t('chat.thread.sending')
      : status === 'seen'
        ? t('chat.thread.seen')
        : status === 'sent'
          ? t('chat.thread.sent')
          : null;
  const hasImage = !!imageUri || imagePending;

  const bubble = (
    <div className={cn('flex w-full min-w-0 flex-col gap-1', mine ? 'items-end' : 'items-start')}>
      {sender?.showName ? <p className="px-1 text-sm font-medium text-muted">{sender.name}</p> : null}
      <div
        className={cn(
          'max-w-xs overflow-hidden rounded-xl sm:max-w-sm',
          mine ? 'rounded-br-sm bg-primary text-on-primary' : 'rounded-bl-sm border border-border bg-surface text-fg',
          failed && 'opacity-70',
        )}
      >
        {hasImage ? (
          imageUri ? (
            <a
              href={imageUri}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={t('web.chat.open_image')}
              className="relative block aspect-square w-56 bg-surface-2 outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <Image src={imageUri} alt={t('chat.thread.image_alt')} fill unoptimized sizes="224px" className="object-cover" />
            </a>
          ) : (
            <div role="img" aria-label={t('chat.thread.image_alt')} className="flex aspect-square w-56 items-center justify-center bg-surface-2">
              <LoaderCircle aria-hidden strokeWidth={1.75} className="size-6 animate-spin text-muted motion-reduce:animate-none" />
            </div>
          )
        ) : null}
        {body ? <p className="px-3 py-2 text-md wrap-break-word whitespace-pre-wrap">{body}</p> : null}
      </div>
      {failed ? (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex min-h-11 items-center gap-1 rounded-sm px-1 text-sm text-danger outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <CircleAlert aria-hidden strokeWidth={1.75} className="size-5" />
          {t('chat.thread.failed')}
        </button>
      ) : showMeta ? (
        <p className="flex items-center gap-1 px-1 text-xs text-muted">
          {statusText && mine ? `${time} · ${statusText}` : time}
          {mine && status ? <StatusIcon status={status} /> : null}
        </p>
      ) : null}
    </div>
  );

  if (!sender) return bubble;
  return (
    <div className="flex w-full items-end gap-2">
      {sender.showAvatar ? (
        <UserAvatar avatar={sender.avatar} name={sender.name} size="sm" className={showMeta ? 'mb-5' : undefined} />
      ) : (
        <span aria-hidden className="size-9 shrink-0" />
      )}
      {bubble}
    </div>
  );
}

function StatusIcon({ status }: { status: Exclude<MessageStatus, 'failed'> }) {
  const Glyph = STATUS_ICON[status];
  return <Glyph aria-hidden strokeWidth={1.75} className={cn('size-4', status === 'seen' && 'text-primary')} />;
}
