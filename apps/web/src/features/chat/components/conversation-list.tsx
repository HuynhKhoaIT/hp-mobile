'use client';

// Hộp thư (cột trái trên desktop, cả trang /tin-nhan trên điện thoại): useConversations (mới nhất trước, cursor) — Realtime
// ở DataProvider làm mới khi có tin. Dòng: avatar · tên + giờ · tin ngữ cảnh · xem trước + số chưa đọc · ảnh tin
// (giống ConversationRow của app). Chưa đọc: tên + xem trước đậm, số trên nền accent (luôn kèm số, không chỉ màu).
// Chat nhóm (kind = 'group'): icon dịch vụ thay avatar · tiêu đề nhóm · "N thành viên" thay dòng tin ngữ cảnh ·
// xem trước "{người gửi}: …"; không ảnh tin. Hiện ngay khi được nhận vào nhóm, kể cả chưa có tin.
// Khách (proxy đã chặn, phòng khi phiên hết hạn giữa chừng) → mời đăng nhập. Loading / lỗi + thử lại / trống + CTA.
import type { ConversationSummary } from '@hp/core';
import { useConversations, useSession } from '@hp/core/react';
import { formatRelative, unreadBadge } from '@hp/shared';
import { BellOff, LogIn, MessageCircle } from 'lucide-react';
import Image from 'next/image';
import { useLocale, useTranslations } from 'next-intl';
import { ClientOnly } from '@/components/shared/client-only';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState } from '@/components/shared/error-state';
import { LoginDialog } from '@/components/shared/login-dialog';
import { UserAvatar } from '@/components/shared/user-avatar';
import { Button } from '@/components/ui/button';
import { asLocale } from '@/features/listing/display';
import { Link } from '@/i18n/navigation';
import { listingImageUrl } from '@/lib/images';
import { cn } from '@/lib/utils';
import { conversationHref, isGroupChat, usePreviewText } from '../use-chat';
import { GroupChatIcon } from './group-chat-icon';
import { ConversationListSkeleton } from './chat-skeletons';

export function ConversationList({ selectedId }: { selectedId: string | null }) {
  const t = useTranslations('chat');
  return (
    <div className="flex flex-col">
      <h1 className="px-4 pt-4 pb-2 text-2xl font-semibold text-fg">{t('title')}</h1>
      <ClientOnly fallback={<ConversationListSkeleton />}>
        <ConversationItems selectedId={selectedId} />
      </ClientOnly>
    </div>
  );
}

function ConversationItems({ selectedId }: { selectedId: string | null }) {
  const t = useTranslations();
  const session = useSession();
  const conversations = useConversations();

  let body;
  if (session.isLoading || (session.userId && conversations.isPending)) {
    body = <ConversationListSkeleton />;
  } else if (!session.userId) {
    body = (
      <EmptyState
        icon={MessageCircle}
        title={t('chat.inbox.login_title')}
        description={t('chat.inbox.login_body')}
        action={
          <LoginDialog
            trigger={
              <Button>
                <LogIn strokeWidth={1.75} aria-hidden />
                {t('auth.sign_in')}
              </Button>
            }
          />
        }
      />
    );
  } else if (conversations.isError && conversations.items.length === 0) {
    body = <ErrorState code={conversations.error.code} onRetry={() => void conversations.refetch()} />;
  } else if (conversations.items.length === 0) {
    body = (
      <EmptyState
        icon={MessageCircle}
        title={t('chat.inbox.empty_title')}
        description={t('chat.inbox.empty_body')}
        action={
          <Button asChild>
            <Link href="/tin">{t('chat.inbox.empty_cta')}</Link>
          </Button>
        }
      />
    );
  } else {
    body = (
      <>
        <ul className="flex flex-col divide-y divide-border">
          {conversations.items.map((c) => (
            <li key={c.id}>
              <ConversationRow conversation={c} selected={c.id === selectedId} />
            </li>
          ))}
        </ul>
        {conversations.hasNextPage ? (
          <div className="flex justify-center p-4">
            <Button
              type="button"
              variant="outline"
              disabled={conversations.isFetchingNextPage}
              onClick={() => void conversations.fetchNextPage()}
            >
              {t('listing.list.load_more')}
            </Button>
          </div>
        ) : null}
      </>
    );
  }

  return body;
}

function ConversationRow({ conversation: c, selected }: { conversation: ConversationSummary; selected: boolean }) {
  const t = useTranslations('chat.inbox');
  const tg = useTranslations('group.chat');
  const locale = asLocale(useLocale());
  const preview = usePreviewText();
  const group = isGroupChat(c);
  const name = group ? c.group_title || tg('open') : c.other_name || t('deleted_user');
  const unread = unreadBadge(c.unread_count);
  const when = c.last_message_at ?? c.created_at;

  return (
    <Link
      href={conversationHref(c.id)}
      aria-current={selected ? 'page' : undefined}
      className={cn(
        'flex min-h-20 items-center gap-3 px-4 py-3 outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset',
        selected ? 'bg-primary-light' : 'hover:bg-surface-2',
      )}
    >
      {group ? <GroupChatIcon kind={c.group_kind} /> : <UserAvatar avatar={c.other_avatar_url} name={name} />}
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex items-center gap-2">
          <span className={cn('flex-1 truncate text-md text-fg', unread ? 'font-bold' : 'font-medium')}>{name}</span>
          {c.muted ? (
            <BellOff strokeWidth={1.75} className="size-4 shrink-0 text-muted" aria-label={t('muted')} role="img" />
          ) : null}
          <time dateTime={when} className={cn('shrink-0 text-xs', unread ? 'font-medium text-primary' : 'text-muted')}>
            {formatRelative(when, locale)}
          </time>
        </span>
        <span className="truncate text-sm text-muted">
          {group ? tg('members', { count: c.member_count ?? 0 }) : c.listing_title || t('listing_gone')}
        </span>
        <span className="flex items-center gap-2">
          <span className={cn('flex-1 truncate text-md', unread ? 'font-semibold text-fg' : 'text-muted')}>{preview(c)}</span>
          {unread ? (
            <span className="flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full bg-accent px-1.5 text-xs font-bold text-on-accent">
              <span aria-hidden>{unread}</span>
              <span className="sr-only">{t('unread', { count: c.unread_count })}</span>
            </span>
          ) : null}
        </span>
      </span>
      {!group && c.listing_image ? (
        <span className="relative size-12 shrink-0 overflow-hidden rounded-sm bg-surface-2">
          <Image src={listingImageUrl(c.listing_image, 'thumb')} alt="" fill unoptimized sizes="48px" className="object-cover" />
        </span>
      ) : null}
    </Link>
  );
}
