'use client';

// Một thẻ thông báo (giống NotificationRow của app; style Stitch "Thông báo có người đặt chuyến"): ô icon bo md nền nhạt theo
// tone loại · hàng nhãn nhóm thông báo (Tin nhắn / Tin đăng của bạn / Ghép xe, ghép trận / Đồ thất lạc — chữ của mục cài đặt
// thông báo) + thời gian · tiêu đề + nội dung (dịch từ khoá ns `push` + params, giống send-push) · chấm chưa đọc ở góc ô icon
// (kèm chữ cho trình đọc màn hình — không chỉ dựa vào màu). Chưa đọc: viền primary nhạt; có người xin vào nhóm của mình
// (join_request, chưa đọc): viền cam + nhãn "Cần phản hồi" + dòng "Xem và duyệt yêu cầu" (cả thẻ là một nút → chi tiết nhóm,
// nơi chủ nhóm Nhận / Từ chối). Không nút duyệt / liên hệ / SĐT ngay trên thẻ (như Stitch) — duyệt ở chi tiết nhóm.
// Bấm → nơi gọi đánh dấu đã đọc + mở trang đích.
import type { Notification } from '@hp/core';
import { formatRelative } from '@hp/shared';
import type { LucideIcon } from 'lucide-react';
import {
  AlarmClock,
  BadgeCheck,
  Bell,
  ChevronRight,
  CircleCheck,
  CircleX,
  Clock,
  MessageCircle,
  SearchCheck,
  ShieldX,
  Star,
  Users,
} from 'lucide-react';
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

/** Nền ô icon theo màu icon (class đầy đủ để Tailwind quét được). */
const ICON_BOX: Record<string, string> = {
  'text-primary': 'bg-primary-light',
  'text-success': 'bg-success/15',
  'text-danger': 'bg-danger/15',
  'text-warning': 'bg-warning/15',
};

/** Nhãn nhóm thông báo theo loại — chữ của mục cài đặt thông báo (common.notifications.prefs.*). */
function kindKey(type: string): string | null {
  if (type === 'new_message') return 'prefs.messages';
  if (type.startsWith('listing_')) return 'prefs.listings';
  if (type.startsWith('join_') || type.startsWith('group_')) return 'prefs.groups';
  if (type === 'lost_found_match') return 'prefs.lost_found';
  return null;
}

/** Có người xin vào nhóm của mình, chưa xem → cần chủ nhóm phản hồi (body_key join_request.body; vào ngay / rời: không). */
const needsReply = (n: Pick<Notification, 'type' | 'body_key' | 'read_at'>) =>
  n.type === 'join_request' && n.body_key === 'join_request.body' && !n.read_at;

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
  const reply = needsReply(n);
  const kind = kindKey(n.type);

  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        'flex min-h-16 w-full items-start gap-3 rounded-lg bg-surface p-4 text-left shadow-card outline-none transition-colors hover:bg-surface-2 focus-visible:ring-3 focus-visible:ring-ring/50',
        reply ? 'border-2 border-accent/40' : unread ? 'border border-primary/30' : 'border border-border',
      )}
    >
      <span className="relative shrink-0">
        <span className={cn('flex size-10 items-center justify-center rounded-md', ICON_BOX[tone] ?? 'bg-surface-2')}>
          <Icon aria-hidden strokeWidth={1.75} className={cn('size-5', tone)} />
        </span>
        {unread ? (
          <span
            aria-hidden
            className={cn('absolute -top-1 -right-1 size-3 rounded-full border-2 border-surface', reply ? 'bg-accent' : 'bg-primary')}
          />
        ) : null}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        {unread ? <span className="sr-only">{t('unread')}</span> : null}
        <span className="flex flex-wrap items-center justify-between gap-x-2">
          {reply ? (
            <span className="rounded-full bg-accent px-2.5 py-0.5 text-sm font-semibold text-on-accent">{t('needs_reply')}</span>
          ) : kind ? (
            <span className={cn('line-clamp-1 text-sm font-semibold', unread ? 'text-primary' : 'text-muted')}>{t(kind)}</span>
          ) : (
            <span />
          )}
          <time dateTime={n.created_at} className="text-sm text-muted">
            {formatRelative(n.created_at, locale)}
          </time>
        </span>
        <span className={cn('line-clamp-2 text-md text-fg', unread ? 'font-semibold' : 'font-medium')}>{title}</span>
        {body ? <span className="line-clamp-3 text-md text-muted">{body}</span> : null}
        {reply ? (
          <span className="flex items-center gap-1 pt-1 text-sm font-semibold text-primary">
            {t('review_request')}
            <ChevronRight aria-hidden strokeWidth={1.75} className="size-4" />
          </span>
        ) : null}
      </span>
    </button>
  );
}

export function NotificationRowSkeleton() {
  return (
    <div className="flex min-h-16 items-start gap-3 rounded-lg border border-border bg-surface p-4 shadow-card">
      <Skeleton className="size-10 rounded-md" />
      <div className="flex flex-1 flex-col gap-2">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-full" />
      </div>
    </div>
  );
}
