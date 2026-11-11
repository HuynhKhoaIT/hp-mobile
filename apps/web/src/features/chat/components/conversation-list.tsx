'use client';

// Hộp thư (cột trái trên desktop, cả trang /tin-nhan trên điện thoại) — style Stitch "Danh sách hộp thư Chat", giống tab
// Tin nhắn của app: header xanh (tiêu đề + dòng phụ, hoạ tiết HeaderDecor, bo đáy khi một cột) → chip lọc tại chỗ (Tất cả ·
// Chưa đọc có số · dịch vụ có trong hộp thư; useInboxFilter) → thẻ hội thoại → hộp nhắc giao dịch an toàn.
// useConversations (mới nhất trước, cursor) — Realtime ở DataProvider làm mới khi có tin.
// Thẻ: avatar (dấu xác minh khi có huy hiệu) · tên + giờ · ô icon dịch vụ + "tiêu đề tin · giá" · xem trước + số chưa đọc.
// Chưa đọc: viền primary/30, tên + xem trước đậm, số trên nền accent (luôn kèm số, không chỉ màu). Đang mở: nền primary-light.
// Chat nhóm (kind = 'group'): icon dịch vụ thay avatar · tiêu đề nhóm · "giờ hẹn · N thành viên" · xem trước
// "{người gửi}: …". Hiện ngay khi được nhận vào nhóm, kể cả chưa có tin.
// Khách (proxy đã chặn, phòng khi phiên hết hạn giữa chừng) → mời đăng nhập. Loading / lỗi + thử lại / trống + CTA;
// lọc không có kết quả → "Xem tất cả". Không có tìm kiếm / "Đã đọc tất cả" của Stitch (chưa có RPC tương ứng).
import type { ConversationSummary } from '@hp/core';
import { useConversations, useSession, useUnreadConversationCount } from '@hp/core/react';
import { formatDate, formatNumber, formatRelative, unreadBadge } from '@hp/shared';
import { BadgeCheck, BellOff, LogIn, MessageCircle, ShieldCheck } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { ClientOnly } from '@/components/shared/client-only';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState } from '@/components/shared/error-state';
import { HeaderDecor } from '@/components/shared/header-decor';
import { LoginDialog } from '@/components/shared/login-dialog';
import { UserAvatar } from '@/components/shared/user-avatar';
import { Button } from '@/components/ui/button';
import { GROUP_FEATURE_CONFIGS } from '@/features/group/features';
import { asLocale } from '@/features/listing/display';
import { LISTING_FEATURE_CONFIGS } from '@/features/listing/features';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import {
  conversationFeature,
  conversationHref,
  type InboxFilter,
  isGroupChat,
  useConversationPrice,
  useInboxFilter,
  usePreviewText,
} from '../use-chat';
import { ConversationListSkeleton, ConversationRowSkeleton } from './chat-skeletons';
import { GroupChatIcon } from './group-chat-icon';

export function ConversationList({ selectedId }: { selectedId: string | null }) {
  const t = useTranslations('chat');
  return (
    <div className="flex flex-1 flex-col bg-bg">
      <div className="relative overflow-hidden bg-primary text-on-primary max-sm:rounded-b-xl">
        <HeaderDecor />
        <div className="relative flex flex-col gap-1 px-4 pt-4 pb-5">
          <h1 className="text-xl font-bold">{t('title')}</h1>
          <p className="text-sm opacity-90">{t('inbox.subtitle')}</p>
        </div>
      </div>
      <ClientOnly fallback={<ConversationListSkeleton />}>
        <ConversationItems selectedId={selectedId} />
      </ClientOnly>
    </div>
  );
}

/** Ô icon + màu của dịch vụ (lấy từ config tính năng — giống ô icon trên thẻ tin / thẻ nhóm). */
function serviceLook(c: ConversationSummary) {
  const feature = conversationFeature(c);
  if (!feature) return null;
  if (feature === 'ride' || feature === 'sport') return GROUP_FEATURE_CONFIGS[feature];
  return LISTING_FEATURE_CONFIGS[feature];
}

function ConversationItems({ selectedId }: { selectedId: string | null }) {
  const t = useTranslations();
  const locale = asLocale(useLocale());
  const session = useSession();
  const conversations = useConversations();
  const unread = useUnreadConversationCount();
  const inbox = useInboxFilter(conversations);

  if (session.isLoading || (session.userId && conversations.isPending)) return <ConversationListSkeleton />;
  if (!session.userId) {
    return (
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
  }
  if (conversations.isError && conversations.items.length === 0) {
    return <ErrorState code={conversations.error.code} onRetry={() => void conversations.refetch()} />;
  }
  if (conversations.items.length === 0) {
    return (
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
  }

  const options: { value: InboxFilter; label: string; count?: number }[] = [
    { value: 'all', label: t('chat.inbox.filter_all') },
    { value: 'unread', label: t('chat.inbox.filter_unread'), count: unread.data ? unread.data : undefined },
    ...inbox.features.map((f) => ({ value: f, label: t(`common.feature.${f}`) })),
  ];

  return (
    <div className="flex flex-col gap-3 px-4 pt-3 pb-4 lg:px-3">
      <div role="group" aria-label={t('chat.inbox.filter_label')} className="no-scrollbar -mx-4 overflow-x-auto px-4 lg:-mx-3 lg:px-3">
        <ul className="flex gap-2 py-0.5">
          {options.map((o) => {
            const selected = o.value === inbox.filter;
            return (
              <li key={o.value} className="flex">
                <button
                  type="button"
                  aria-pressed={selected}
                  onClick={() => inbox.setFilter(o.value)}
                  className={cn(
                    'inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-semibold whitespace-nowrap outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50',
                    selected
                      ? 'border-primary bg-primary text-on-primary'
                      : 'border-border bg-surface text-muted hover:bg-surface-2 hover:text-fg',
                  )}
                >
                  {o.label}
                  {o.count !== undefined ? (
                    <span
                      className={cn(
                        'inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-bold',
                        selected ? 'bg-on-primary/20' : 'bg-surface-2 text-fg',
                      )}
                    >
                      {formatNumber(o.count, locale)}
                    </span>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {inbox.visible.length > 0 ? (
        <ul className="flex flex-col gap-3">
          {inbox.visible.map((c) => (
            <li key={c.id}>
              <ConversationRow conversation={c} selected={c.id === selectedId} />
            </li>
          ))}
        </ul>
      ) : conversations.hasNextPage ? (
        <div className="flex flex-col gap-3">
          <ConversationRowSkeleton />
          <ConversationRowSkeleton />
        </div>
      ) : (
        <EmptyState
          icon={MessageCircle}
          title={t('chat.inbox.filter_empty')}
          action={
            <Button type="button" variant="outline" onClick={() => inbox.setFilter('all')}>
              {t('chat.inbox.filter_reset')}
            </Button>
          }
        />
      )}

      {conversations.hasNextPage && inbox.visible.length > 0 ? (
        <div className="flex justify-center">
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

      {conversations.hasNextPage ? null : (
        // Chữ text-muted trên nền warning/10: ~4,8:1 (sáng), ~6:1 (tối) — giống hộp an toàn ở trang chủ.
        <aside role="note" className="flex items-start gap-3 rounded-lg border border-warning/30 bg-warning/10 p-4">
          <span aria-hidden className="flex size-10 shrink-0 items-center justify-center rounded-md bg-warning/15">
            <ShieldCheck strokeWidth={1.75} className="size-6 text-warning" />
          </span>
          <div className="flex min-w-0 flex-col gap-1">
            <p className="text-md font-semibold text-fg">{t('chat.safety.title')}</p>
            <p className="text-sm text-muted">
              {t('chat.safety.tip_deposit')} {t('chat.safety.tip_report')}
            </p>
          </div>
        </aside>
      )}
    </div>
  );
}

function ConversationRow({ conversation: c, selected }: { conversation: ConversationSummary; selected: boolean }) {
  const t = useTranslations();
  const locale = asLocale(useLocale());
  const preview = usePreviewText();
  const price = useConversationPrice();
  const group = isGroupChat(c);
  const look = serviceLook(c);
  const name = group ? c.group_title || t('group.chat.open') : c.other_name || t('chat.inbox.deleted_user');
  const verified = !group && (c.other_badges?.length ?? 0) > 0;
  const context = group
    ? [c.group_starts_at ? formatDate(c.group_starts_at, locale, 'datetime') : null, t('group.chat.members', { count: c.member_count ?? 0 })]
        .filter(Boolean)
        .join(' · ')
    : c.listing_title
      ? [c.listing_title, price(c)].filter(Boolean).join(' · ')
      : t('chat.inbox.listing_gone');
  const unread = unreadBadge(c.unread_count);
  const when = c.last_message_at ?? c.created_at;

  return (
    <Link
      href={conversationHref(c.id)}
      aria-current={selected ? 'page' : undefined}
      className={cn(
        'flex min-h-20 items-center gap-3 rounded-lg border p-3 shadow-card outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50',
        selected ? 'border-primary bg-primary-light' : cn('bg-surface hover:bg-surface-2', unread ? 'border-primary/30' : 'border-border'),
      )}
    >
      <span className="relative shrink-0">
        {group ? <GroupChatIcon kind={c.group_kind} /> : <UserAvatar avatar={c.other_avatar_url} name={name} />}
        {verified ? (
          <span className="absolute -right-1 -bottom-1 flex rounded-full bg-surface p-0.5">
            <BadgeCheck strokeWidth={1.75} className="size-4 text-success" aria-hidden />
            <span className="sr-only">{t('common.profile.verified')}</span>
          </span>
        ) : null}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="flex items-center gap-2">
          <span className={cn('flex-1 truncate text-md text-fg', unread ? 'font-bold' : 'font-semibold')}>{name}</span>
          {c.muted ? (
            <BellOff strokeWidth={1.75} className="size-4 shrink-0 text-muted" aria-label={t('chat.inbox.muted')} role="img" />
          ) : null}
          <time dateTime={when} className={cn('shrink-0 text-sm', unread ? 'font-semibold text-primary' : 'text-muted')}>
            {formatRelative(when, locale)}
          </time>
        </span>
        <span className="flex items-center gap-1.5">
          {look ? (
            <span aria-hidden className={cn('inline-flex size-6 shrink-0 items-center justify-center rounded-full', look.tone.soft)}>
              <look.Icon strokeWidth={1.75} className={cn('size-3.5', look.tone.fg)} />
            </span>
          ) : null}
          <span className="truncate text-sm text-muted">{context}</span>
        </span>
        <span className="flex items-center gap-2">
          <span className={cn('flex-1 truncate text-md', unread ? 'font-semibold text-fg' : 'text-muted')}>{preview(c)}</span>
          {unread ? (
            <span className="flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full bg-accent px-1.5 text-xs font-bold text-on-accent">
              <span aria-hidden>{unread}</span>
              <span className="sr-only">{t('chat.inbox.unread', { count: c.unread_count })}</span>
            </span>
          ) : null}
        </span>
      </span>
    </Link>
  );
}
