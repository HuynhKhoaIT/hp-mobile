'use client';

// Header khung chat (giống ThreadHeader của app): quay lại hộp thư (khi một cột: < 1024px) · avatar + tên (dòng phụ
// "Đang nhập…" khi người kia gõ) · menu tuỳ chọn. Dưới đó: thẻ tin ngữ cảnh (ảnh, tiêu đề, giá, nhãn đã bán / ẩn) →
// bấm mở /tin/[slug]; tin đã gỡ / không còn hiển thị → thẻ mờ, không bấm.
// Chat nhóm: icon dịch vụ + tiêu đề nhóm + "N thành viên" (hoặc "Đang nhập…") + nút "Xem nhóm" (/nhom/{slug}); menu chỉ
// còn tắt / bật thông báo (không chặn, không báo cáo người dùng — báo cáo nhóm ở trang nhóm); không thẻ tin ngữ cảnh.
import type { ConversationSummary } from '@hp/core';
import { type ListingCategory, priceLabel } from '@hp/shared';
import { Ban, Bell, BellOff, ChevronLeft, ChevronRight, EllipsisVertical, Flag, Package, Users } from 'lucide-react';
import Image from 'next/image';
import { useLocale, useTranslations } from 'next-intl';
import { Badge } from '@/components/shared/badge';
import { UserAvatar } from '@/components/shared/user-avatar';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { asLocale, priceText } from '@/features/listing/display';
import { Link } from '@/i18n/navigation';
import { listingImageUrl } from '@/lib/images';
import { isGroupChat } from '../use-chat';
import { GroupChatIcon } from './group-chat-icon';

export function ThreadHeader({
  conversation: c,
  isTyping,
  isBlocked,
  onToggleMute,
  onReport,
  onToggleBlock,
}: {
  conversation: ConversationSummary | undefined;
  isTyping: boolean;
  isBlocked: boolean;
  onToggleMute: () => void;
  onReport: () => void;
  onToggleBlock: () => void;
}) {
  const t = useTranslations();
  const group = !!c && isGroupChat(c);
  const name = c ? (group ? c.group_title || t('group.chat.open') : c.other_name || t('chat.inbox.deleted_user')) : '';
  const subline = isTyping
    ? t('chat.thread.typing')
    : group && c
      ? t('group.chat.members', { count: c.member_count ?? 0 })
      : null;

  return (
    <div className="shrink-0 border-b border-border bg-surface">
      <div className="flex min-h-14 items-center gap-2 px-2 py-1">
        <Button asChild variant="ghost" size="icon" className="lg:hidden">
          <Link href="/tin-nhan" aria-label={t('common.actions.back')}>
            <ChevronLeft strokeWidth={1.75} />
          </Link>
        </Button>
        {c ? (
          <>
            {group ? (
              <GroupChatIcon kind={c.group_kind} size="sm" className="lg:ml-2" />
            ) : (
              <UserAvatar avatar={c.other_avatar_url} name={name} size="sm" className="lg:ml-2" />
            )}
            <div className="flex min-w-0 flex-1 flex-col">
              <h2 className="truncate text-lg font-semibold text-fg">{name}</h2>
              <p aria-live="polite" className={isTyping ? 'text-sm text-primary' : 'text-sm text-muted'}>
                {subline}
              </p>
            </div>
            {group && c.group_slug ? (
              <Button asChild variant="ghost" size="sm">
                <Link href={`/nhom/${c.group_slug}`}>
                  <Users strokeWidth={1.75} aria-hidden />
                  {t('group.chat.view_group')}
                </Link>
              </Button>
            ) : null}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label={t('chat.thread.options')} title={t('chat.thread.options')}>
                  <EllipsisVertical strokeWidth={1.75} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onSelect={onToggleMute}>
                  {c.muted ? <Bell strokeWidth={1.75} aria-hidden /> : <BellOff strokeWidth={1.75} aria-hidden />}
                  {c.muted ? t('chat.thread.unmute') : t('chat.thread.mute')}
                </DropdownMenuItem>
                {group ? null : (
                  <>
                    <DropdownMenuItem onSelect={onReport}>
                      <Flag strokeWidth={1.75} aria-hidden />
                      {t('common.actions.report')}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem variant="destructive" onSelect={onToggleBlock}>
                      <Ban strokeWidth={1.75} aria-hidden />
                      {isBlocked ? t('common.block.unblock') : t('common.actions.block')}
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        ) : (
          <div className="flex flex-1 items-center gap-2 lg:ml-2">
            <Skeleton className="size-9 rounded-full" />
            <Skeleton className="h-5 w-32" />
          </div>
        )}
      </div>
      {c?.context_type === 'listing' ? <ListingContext conversation={c} /> : null}
    </div>
  );
}

function ListingContext({ conversation: c }: { conversation: ConversationSummary }) {
  const t = useTranslations();
  const locale = asLocale(useLocale());
  const gone = !c.listing_title || !c.listing_slug;
  const inactive = !!c.listing_status && c.listing_status !== 'active';
  // Việc làm: lương nằm trong attributes (hộp thư không có) → không hiện giá, giống app.
  const priceStr =
    c.listing_category && !c.listing_category.startsWith('job_') && c.listing_price_type
      ? priceText(
          priceLabel({
            category: c.listing_category as ListingCategory,
            price: c.listing_price,
            price_type: c.listing_price_type,
            attributes: {},
          }),
          t,
          locale,
        )
      : null;

  const content = (
    <>
      <span className="relative flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-sm bg-surface-2">
        {c.listing_image ? (
          <Image src={listingImageUrl(c.listing_image, 'thumb')} alt="" fill unoptimized sizes="48px" className="object-cover" />
        ) : (
          <Package aria-hidden strokeWidth={1.75} className="size-6 text-muted" />
        )}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className={gone ? 'truncate text-md text-muted' : 'truncate text-md font-medium text-fg'}>
          {c.listing_title || t('chat.inbox.listing_gone')}
        </span>
        <span className="flex items-center gap-2">
          {priceStr ? <span className="text-sm font-bold text-fg">{priceStr}</span> : null}
          {inactive && c.listing_status ? (
            <Badge tone="danger">{t.has(`common.status.${c.listing_status}`) ? t(`common.status.${c.listing_status}`) : c.listing_status}</Badge>
          ) : null}
        </span>
      </span>
    </>
  );

  if (gone) {
    return <div className="mx-3 mb-3 flex items-center gap-3 rounded-md bg-bg p-2">{content}</div>;
  }
  return (
    <Link
      href={`/tin/${c.listing_slug}`}
      aria-label={`${t('chat.thread.view_listing')}: ${c.listing_title}`}
      className="mx-3 mb-3 flex items-center gap-3 rounded-md bg-bg p-2 outline-none transition-colors hover:bg-surface-2 focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      {content}
      <ChevronRight aria-hidden strokeWidth={1.75} className="size-5 shrink-0 text-muted" />
    </Link>
  );
}
