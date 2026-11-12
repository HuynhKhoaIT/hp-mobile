'use client';

// Header khung chat (style Stitch "Khung Chat trực tiếp", giống ThreadHeader của app): dải xanh primary + hoạ tiết
// HeaderDecor — quay lại hộp thư (nút trong mờ, khi một cột: < 1024px; trong mini-app — `inboxHref` — luôn hiện) · avatar viền on-primary/30 (dấu xác minh khi có
// huy hiệu) + tên đậm (dòng phụ "Đang nhập…" khi người kia gõ / "Đã xác minh") · menu tuỳ chọn (nút trong mờ).
// Dưới đó, nền surface: thẻ tin ngữ cảnh (ảnh, tiêu đề, giá, nhãn đã bán / ẩn, "Xem tin") → bấm mở /tin/[slug]; tin đã gỡ
// / không còn hiển thị → thẻ mờ, không bấm.
// Chat nhóm: icon dịch vụ + tiêu đề nhóm + "N thành viên" (hoặc "Đang nhập…"); thẻ ngữ cảnh nhóm (ô icon dịch vụ · giờ
// hẹn · còn bao lâu · trạng thái · "Xem nhóm" → /nhom/{slug}); menu chỉ còn tắt / bật thông báo (không chặn, không báo cáo
// người dùng — báo cáo nhóm ở trang nhóm). Không có gọi điện / vị trí xe / đặt chỗ của Stitch.
import type { ConversationSummary } from '@hp/core';
import { formatDate, formatRelative, groupDisplayStatus } from '@hp/shared';
import { BadgeCheck, Ban, Bell, BellOff, ChevronLeft, ChevronRight, EllipsisVertical, Flag, Package } from 'lucide-react';
import Image from 'next/image';
import { useLocale, useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { Badge } from '@/components/shared/badge';
import { HeaderDecor } from '@/components/shared/header-decor';
import { UserAvatar } from '@/components/shared/user-avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { GROUP_STATUS_TONE } from '@/features/group/display';
import { GROUP_FEATURE_CONFIGS, isGroupKind } from '@/features/group/features';
import { asLocale } from '@/features/listing/display';
import { Link } from '@/i18n/navigation';
import { listingImageUrl } from '@/lib/images';
import { cn } from '@/lib/utils';
import { isGroupChat, useConversationPrice } from '../use-chat';
import { GroupChatIcon } from './group-chat-icon';

/** Nút tròn trong mờ trên nền primary (quay lại, tuỳ chọn) — vùng chạm 44. */
const GLASS =
  'inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-on-primary/20 bg-on-primary/15 text-on-primary outline-none transition-colors hover:bg-on-primary/25 focus-visible:ring-3 focus-visible:ring-on-primary/50';

export function ThreadHeader({
  conversation: c,
  inboxHref,
  isTyping,
  isBlocked,
  onToggleMute,
  onReport,
  onToggleBlock,
}: {
  conversation: ConversationSummary | undefined;
  /** Hộp thư để quay lại khi khung chat không nằm cạnh cột hộp thư (mini-app); thiếu → /tin-nhan, ẩn từ 1024px. */
  inboxHref?: string;
  isTyping: boolean;
  isBlocked: boolean;
  onToggleMute: () => void;
  onReport: () => void;
  onToggleBlock: () => void;
}) {
  const t = useTranslations();
  const group = !!c && isGroupChat(c);
  const name = c ? (group ? c.group_title || t('group.chat.open') : c.other_name || t('chat.inbox.deleted_user')) : '';
  const verified = !!c && !group && (c.other_badges?.length ?? 0) > 0;
  const subline = isTyping
    ? t('chat.thread.typing')
    : group && c
      ? t('group.chat.members', { count: c.member_count ?? 0 })
      : verified
        ? t('common.profile.verified')
        : null;

  return (
    <div className="relative z-10 shrink-0">
      <div className="relative overflow-hidden bg-primary text-on-primary shadow-card">
        <HeaderDecor />
        <div className="relative flex min-h-16 items-center gap-2.5 px-3 py-2 lg:px-4">
          <Link href={inboxHref ?? '/tin-nhan'} aria-label={t('common.actions.back')} className={cn(GLASS, !inboxHref && 'lg:hidden')}>
            <ChevronLeft strokeWidth={1.75} className="size-6" aria-hidden />
          </Link>
          {c ? (
            <>
              <span className="relative shrink-0">
                <span className="flex rounded-full border-2 border-on-primary/30">
                  {group ? <GroupChatIcon kind={c.group_kind} /> : <UserAvatar avatar={c.other_avatar_url} name={name} />}
                </span>
                {verified ? (
                  <span aria-hidden className="absolute -right-1 -bottom-1 flex rounded-full bg-surface p-0.5">
                    <BadgeCheck strokeWidth={1.75} className="size-4 text-success" />
                  </span>
                ) : null}
              </span>
              <div className="flex min-w-0 flex-1 flex-col">
                <h2 className="truncate text-lg font-bold">{name}</h2>
                <p aria-live="polite" className={cn('truncate text-sm opacity-90', isTyping && 'font-semibold')}>
                  {subline}
                </p>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button type="button" className={GLASS} aria-label={t('chat.thread.options')} title={t('chat.thread.options')}>
                    <EllipsisVertical strokeWidth={1.75} className="size-5" aria-hidden />
                  </button>
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
            <div className="flex flex-1 items-center gap-2.5">
              <span className="size-12 rounded-full bg-on-primary/15" />
              <span className="h-5 w-32 rounded-full bg-on-primary/15" />
            </div>
          )}
        </div>
      </div>
      {c?.context_type === 'listing' ? <ListingContext conversation={c} /> : null}
      {c && group && c.group_starts_at ? <GroupContext conversation={c} /> : null}
    </div>
  );
}

/** Dải nền surface chứa thẻ ngữ cảnh dưới header xanh. */
function ContextStrip({ children }: { children: ReactNode }) {
  return <div className="border-b border-border bg-surface px-3 py-2.5 lg:px-4">{children}</div>;
}

const CARD = 'flex min-h-14 items-center gap-3 rounded-md border border-border bg-bg p-2';
const CARD_LINK = cn(CARD, 'outline-none transition-colors hover:bg-surface-2 focus-visible:ring-3 focus-visible:ring-ring/50');

/** "Xem tin" / "Xem nhóm" + mũi tên ở cuối thẻ ngữ cảnh. */
function ViewMore({ label }: { label: string }) {
  return (
    <span aria-hidden className="flex shrink-0 items-center text-sm font-semibold text-primary">
      {label}
      <ChevronRight strokeWidth={1.75} className="size-4" />
    </span>
  );
}

function ListingContext({ conversation: c }: { conversation: ConversationSummary }) {
  const t = useTranslations();
  const price = useConversationPrice();
  const gone = !c.listing_title || !c.listing_slug;
  const inactive = !!c.listing_status && c.listing_status !== 'active';
  const priceStr = price(c);

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
        <span className={gone ? 'truncate text-md text-muted' : 'truncate text-md font-semibold text-fg'}>
          {c.listing_title || t('chat.inbox.listing_gone')}
        </span>
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
          {priceStr ? <span className="text-sm font-bold text-primary">{priceStr}</span> : null}
          {inactive && c.listing_status ? (
            <Badge tone="danger">{t.has(`common.status.${c.listing_status}`) ? t(`common.status.${c.listing_status}`) : c.listing_status}</Badge>
          ) : null}
        </span>
      </span>
    </>
  );

  return (
    <ContextStrip>
      {gone ? (
        <div className={CARD}>{content}</div>
      ) : (
        <Link href={`/tin/${c.listing_slug}`} aria-label={`${t('chat.thread.view_listing')}: ${c.listing_title}`} className={CARD_LINK}>
          {content}
          <ViewMore label={t('chat.thread.view_listing')} />
        </Link>
      )}
    </ContextStrip>
  );
}

/** Thẻ ngữ cảnh chat nhóm: ô icon dịch vụ · giờ hẹn · còn bao lâu · trạng thái → /nhom/{slug}. */
function GroupContext({ conversation: c }: { conversation: ConversationSummary }) {
  const t = useTranslations();
  const locale = asLocale(useLocale());
  const cfg = c.group_kind && isGroupKind(c.group_kind) ? GROUP_FEATURE_CONFIGS[c.group_kind] : null;
  const status = groupDisplayStatus({ status: c.group_status, starts_at: c.group_starts_at });
  // Như groupStatusKey: cron đã đổi sang in_progress → "Đang diễn ra", còn lại theo trạng thái hiển thị.
  const label = t(`group.status.${status === 'started' && c.group_status === 'in_progress' ? 'in_progress' : status}`);
  const when = formatDate(c.group_starts_at, locale, 'datetime');
  const relative = formatRelative(c.group_starts_at, locale);

  const content = (
    <>
      <span aria-hidden className={cn('flex size-10 shrink-0 items-center justify-center rounded-md', cfg?.tone.soft ?? 'bg-primary-light')}>
        {cfg ? <cfg.Icon strokeWidth={1.75} className={cn('size-5', cfg.tone.fg)} /> : null}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="truncate text-sm font-semibold text-fg">{when}</span>
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-sm text-muted">{relative}</span>
          <Badge tone={GROUP_STATUS_TONE[status]}>{label}</Badge>
        </span>
      </span>
    </>
  );

  return (
    <ContextStrip>
      {c.group_slug ? (
        <Link
          href={`/nhom/${c.group_slug}`}
          aria-label={[t('group.chat.view_group'), when, relative, label].join(', ')}
          className={CARD_LINK}
        >
          {content}
          <ViewMore label={t('group.chat.view_group')} />
        </Link>
      ) : (
        <div className={CARD}>{content}</div>
      )}
    </ContextStrip>
  );
}
