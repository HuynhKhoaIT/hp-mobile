'use client';

// Một dòng thông báo (giống NotificationRow của app): icon theo loại · tiêu đề + nội dung (dịch từ khoá ns `push` + params,
// giống send-push) · thời gian · chấm chưa đọc (kèm chữ cho trình đọc màn hình — không chỉ dựa vào màu).
// Bấm → nơi gọi đánh dấu đã đọc + mở trang đích.
import type { Notification } from '@hp/core';
import { formatRelative } from '@hp/shared';
import type { LucideIcon } from 'lucide-react';
import { AlarmClock, BadgeCheck, Bell, CircleCheck, CircleX, Clock, MessageCircle, SearchCheck, ShieldX, Star, Users } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { Skeleton } from '@/components/ui/skeleton';
import { asLocale } from '@/features/listing/display';
import { cn } from '@/lib/utils';

const ICON: Record<string, [LucideIcon, string]> = {
  new_message: [MessageCircle, 'text-primary'],
  listing_approved: [CircleCheck, 'text-success'],
  listing_rejected: [CircleX, 'text-danger'],
  listing_expiring: [Clock, 'text-warning'],
  join_request: [Users, 'text-primary'],
  join_accepted: [Users, 'text-success'],
  join_declined: [Users, 'text-muted'],
  group_cancelled: [CircleX, 'text-danger'],
  group_reminder: [AlarmClock, 'text-warning'],
  group_completed: [Star, 'text-warning'],
  lost_found_match: [SearchCheck, 'text-primary'],
};

/** Thông báo `system` không có màn đích riêng — phân theo title_key (huy hiệu được duyệt / bị từ chối). */
const SYSTEM_ICON: Record<string, [LucideIcon, string]> = {
  'badge_approved.title': [BadgeCheck, 'text-success'],
  'badge_rejected.title': [ShieldX, 'text-danger'],
};

/** Thông báo kết quả xin huy hiệu (type system) → mở /toi/huy-hieu. */
export const isBadgeNotification = (n: Pick<Notification, 'type' | 'title_key'>) =>
  n.type === 'system' && n.title_key in SYSTEM_ICON;

/** Tham số của thông báo (jsonb) → giá trị next-intl nhận được (chuỗi / số); null, object → chuỗi rỗng. */
function paramsOf(raw: Notification['params']): Record<string, string | number> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  return Object.fromEntries(
    Object.entries(raw).map(([k, v]) => [k, typeof v === 'number' || typeof v === 'string' ? v : '']),
  );
}

/** Chữ của thông báo: khoá ns push + params. Thiếu khoá (loại mới chưa có bản dịch) → tiêu đề chung, không nội dung. */
export function useNotificationText() {
  const t = useTranslations();
  return (n: Pick<Notification, 'title_key' | 'body_key' | 'params'>) => {
    const params = paramsOf(n.params);
    const title = t.has(`push.${n.title_key}`) ? t(`push.${n.title_key}`, params) : t('common.notifications.title');
    const body = n.body_key && t.has(`push.${n.body_key}`) ? t(`push.${n.body_key}`, params) : '';
    return { title, body };
  };
}

export function NotificationRow({ notification: n, onOpen }: { notification: Notification; onOpen: () => void }) {
  const t = useTranslations('common.notifications');
  const locale = asLocale(useLocale());
  const text = useNotificationText();
  const { title, body } = text(n);
  const [Icon, tone] = (n.type === 'system' ? SYSTEM_ICON[n.title_key] : ICON[n.type]) ?? [Bell, 'text-muted'];
  const unread = !n.read_at;

  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        'flex min-h-16 w-full items-start gap-3 px-4 py-3 text-left outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset',
        unread ? 'bg-primary-light hover:bg-primary-light/70' : 'hover:bg-surface-2',
      )}
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-surface">
        <Icon aria-hidden strokeWidth={1.75} className={cn('size-5', tone)} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        {unread ? <span className="sr-only">{t('unread')}</span> : null}
        <span className={cn('line-clamp-2 text-md text-fg', unread ? 'font-semibold' : 'font-medium')}>{title}</span>
        {body ? <span className="line-clamp-3 text-md text-muted">{body}</span> : null}
        <time dateTime={n.created_at} className={cn('text-sm', unread ? 'text-primary' : 'text-muted')}>
          {formatRelative(n.created_at, locale)}
        </time>
      </span>
      {unread ? <span aria-hidden className="mt-2 size-2.5 shrink-0 rounded-full bg-accent" /> : null}
    </button>
  );
}

export function NotificationRowSkeleton() {
  return (
    <div className="flex min-h-16 items-start gap-3 px-4 py-3">
      <Skeleton className="size-10 rounded-full" />
      <div className="flex flex-1 flex-col gap-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-3 w-1/4" />
      </div>
    </div>
  );
}
