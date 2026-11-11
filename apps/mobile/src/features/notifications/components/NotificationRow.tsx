// Một thẻ thông báo (style Stitch "Thông báo có người đặt chuyến"): ô icon bo md nền nhạt theo tone loại · hàng nhãn nhóm
// thông báo (Tin nhắn / Tin đăng của bạn / Ghép xe, ghép trận / Đồ thất lạc — chữ của mục Cài đặt thông báo) + thời gian ·
// tiêu đề + nội dung (dịch từ khoá ns `push` + params) · chấm chưa đọc ở góc ô icon (kèm nhãn cho trình đọc màn hình — không
// chỉ dựa vào màu). Chưa đọc: viền primary nhạt; có người xin vào nhóm của mình (join_request, chưa đọc): viền cam + nhãn
// "Cần phản hồi" + dòng "Xem và duyệt yêu cầu" (cả thẻ là một nút → mở chi tiết nhóm, nơi chủ nhóm Nhận / Từ chối).
// Khác Stitch (cố ý): không nút Xác nhận / Từ chối / Liên hệ ngay trên thẻ (thẻ bấm được đọc thành một nút; duyệt ở chi tiết
// nhóm có đủ ngữ cảnh), không số điện thoại, giá, ghế; không tab lọc theo loại (danh sách phân trang theo cursor).
import type { Notification } from '@hp/core';
import type { LucideIcon } from 'lucide-react-native';
import {
  AlarmClock,
  BadgeCheck,
  BadgeX,
  Bell,
  CalendarX,
  ChevronRight,
  CircleCheck,
  CircleX,
  Clock,
  MessageCircle,
  SearchCheck,
  Star,
  UserCheck,
  Users,
  UserX,
} from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import { formatRelative } from '@/lib/format';
import { Icon, Skeleton, Text, type TextTone } from '@/ui';

/** Nền ô icon theo tone (class đầy đủ để Tailwind quét được). */
const ICON_BOX: Partial<Record<TextTone, string>> = {
  primary: 'bg-primary-light',
  success: 'bg-success/15',
  danger: 'bg-danger/15',
  warning: 'bg-warning/15',
};

/** Nhãn nhóm thông báo theo loại — dùng lại chữ của Cài đặt thông báo (common: notifications.prefs.*). */
function kindKey(type: string): string | null {
  if (type === 'new_message') return 'notifications.prefs.messages';
  if (type.startsWith('listing_')) return 'notifications.prefs.listings';
  if (type.startsWith('join_') || type.startsWith('group_')) return 'notifications.prefs.groups';
  if (type === 'lost_found_match') return 'notifications.prefs.lost_found';
  return null;
}

/** Có người xin vào nhóm của mình, chưa xem → cần chủ nhóm phản hồi (body_key join_request.body; vào ngay / rời: không). */
const needsReply = (n: Pick<Notification, 'type' | 'body_key' | 'read_at'>) =>
  n.type === 'join_request' && n.body_key === 'join_request.body' && !n.read_at;

const ICON: Record<string, [LucideIcon, TextTone]> = {
  new_message: [MessageCircle, 'primary'],
  listing_approved: [CircleCheck, 'success'],
  listing_rejected: [CircleX, 'danger'],
  listing_expiring: [Clock, 'warning'],
  join_request: [Users, 'primary'],
  join_accepted: [UserCheck, 'success'],
  join_declined: [UserX, 'danger'],
  group_cancelled: [CalendarX, 'danger'],
  group_reminder: [AlarmClock, 'warning'],
  group_completed: [Star, 'warning'],
  lost_found_match: [SearchCheck, 'primary'],
};

/**
 * Kết quả duyệt huy hiệu (tuần 10): type `system`, title_key `badge_approved.title` / `badge_rejected.title`, data `{}`
 * → chạm mở màn Huy hiệu (không có trong payload push chuẩn nên không qua routeForNotification).
 */
export function badgeReview(n: Pick<Notification, 'type' | 'title_key'>): 'approved' | 'rejected' | null {
  if (n.type !== 'system') return null;
  if (n.title_key === 'badge_approved.title') return 'approved';
  if (n.title_key === 'badge_rejected.title') return 'rejected';
  return null;
}

/** Chữ của thông báo: khoá ns push + params (giống send-push). Thiếu khoá → rỗng. */
export function useNotificationText() {
  const { t, i18n } = useTranslation('push');
  return (n: Pick<Notification, 'title_key' | 'body_key' | 'params'>) => {
    const params = (n.params ?? {}) as Record<string, unknown>;
    const title = i18n.exists(`push:${n.title_key}`) ? t(n.title_key, params) : '';
    const body = n.body_key && i18n.exists(`push:${n.body_key}`) ? t(n.body_key, params) : '';
    return { title, body };
  };
}

export function NotificationRow({ notification: n, onPress }: { notification: Notification; onPress: () => void }) {
  const { t } = useTranslation();
  const text = useNotificationText();
  const { title, body } = text(n);
  const review = badgeReview(n);
  const [icon, tone]: [LucideIcon, TextTone] =
    review === 'approved' ? [BadgeCheck, 'success'] : review === 'rejected' ? [BadgeX, 'danger'] : (ICON[n.type] ?? [Bell, 'muted']);
  const unread = !n.read_at;
  const reply = needsReply(n);
  const kind = kindKey(n.type);
  const time = formatRelative(n.created_at);
  const box = reply ? 'border-2 border-accent/40' : unread ? 'border border-primary/30' : 'border border-border';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={[unread ? t('notifications.unread') : null, reply ? t('notifications.needs_reply') : null, title, body, time]
        .filter(Boolean)
        .join(', ')}
      onPress={onPress}
      className={`min-h-16 flex-row items-start gap-3 rounded-lg bg-surface p-4 shadow-card active:bg-surface-2 ${box}`}
    >
      <View>
        <View className={`size-10 items-center justify-center rounded-md ${ICON_BOX[tone] ?? 'bg-surface-2'}`}>
          <Icon icon={icon} tone={tone} />
        </View>
        {unread ? (
          <View className={`absolute -right-1 -top-1 size-3 rounded-full border-2 border-surface ${reply ? 'bg-accent' : 'bg-primary'}`} />
        ) : null}
      </View>
      <View className="flex-1 gap-1">
        <View className="flex-row flex-wrap items-center justify-between gap-x-2">
          {reply ? (
            <View className="shrink rounded-full bg-accent px-2.5 py-0.5">
              <Text variant="caption" weight="semibold" tone="onAccent">
                {t('notifications.needs_reply')}
              </Text>
            </View>
          ) : kind ? (
            <Text variant="caption" weight="semibold" tone={unread ? 'primary' : 'muted'} numberOfLines={1} className="shrink">
              {t(kind)}
            </Text>
          ) : (
            <View />
          )}
          <Text variant="caption" tone="muted">
            {time}
          </Text>
        </View>
        <Text variant="label" weight={unread ? 'semibold' : 'medium'} numberOfLines={2}>
          {title}
        </Text>
        {body ? (
          <Text tone="muted" numberOfLines={3}>
            {body}
          </Text>
        ) : null}
        {reply ? (
          <View className="flex-row items-center gap-1 pt-1">
            <Text variant="caption" weight="semibold" tone="primary">
              {t('notifications.review_request')}
            </Text>
            <Icon icon={ChevronRight} tone="primary" size={16} />
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

export function NotificationRowSkeleton() {
  return (
    <View className="min-h-16 flex-row items-start gap-3 rounded-lg border border-border bg-surface p-4 shadow-card">
      <Skeleton className="size-10 rounded-md" />
      <View className="flex-1 gap-2">
        <Skeleton className="h-4 w-1/3 rounded-sm" />
        <Skeleton className="h-4 w-3/4 rounded-sm" />
        <Skeleton className="h-4 w-full rounded-sm" />
      </View>
    </View>
  );
}
