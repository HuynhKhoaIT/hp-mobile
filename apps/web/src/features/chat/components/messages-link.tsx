'use client';

// Nút "Tin nhắn" trên header (từ 640px) kèm số hội thoại chưa đọc (useUnreadConversationCount — Realtime ở DataProvider
// và đánh dấu đã đọc làm mới). > 9 → "9+", 0 / khách → không hiện số. Cùng kiểu với NotificationBell (ghost).
import { useUnreadConversationCount } from '@hp/core/react';
import { MessageCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

export function MessagesLink({ className }: { className?: string }) {
  const t = useTranslations();
  const count = useUnreadConversationCount().data ?? 0;
  const label = count ? `${t('common.nav.messages')}, ${t('chat.inbox.unread', { count })}` : t('common.nav.messages');

  return (
    <Link
      href="/tin-nhan"
      aria-label={label}
      className={cn(
        'relative inline-flex size-11 shrink-0 items-center justify-center rounded-md text-fg outline-none transition-colors hover:bg-surface-2 focus-visible:ring-3 focus-visible:ring-ring/50',
        className,
      )}
    >
      <MessageCircle aria-hidden strokeWidth={1.75} className="size-5" />
      {count ? (
        <span
          aria-hidden
          className="absolute top-0.5 right-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 text-xs font-bold text-on-accent ring-2 ring-surface"
        >
          {count > 9 ? '9+' : count}
        </span>
      ) : null}
    </Link>
  );
}

