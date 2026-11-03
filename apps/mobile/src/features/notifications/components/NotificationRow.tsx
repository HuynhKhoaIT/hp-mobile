// Một dòng thông báo: icon theo loại · tiêu đề + nội dung (dịch từ khoá ns `push` + params) · thời gian · chấm chưa
// đọc (kèm nhãn cho trình đọc màn hình — không chỉ dựa vào màu). Chạm → đánh dấu đọc + mở màn đích.
import type { Notification } from '@hp/core';
import type { LucideIcon } from 'lucide-react-native';
import {
  AlarmClock,
  BadgeCheck,
  BadgeX,
  Bell,
  CalendarX,
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
  const [icon, tone]: [LucideIcon, TextTone] = review === 'approved' ? [BadgeCheck, 'success'] : review === 'rejected' ? [BadgeX, 'danger'] : (ICON[n.type] ?? [Bell, 'muted']);
  const unread = !n.read_at;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={[unread ? t('notifications.unread') : null, title, body, formatRelative(n.created_at)].filter(Boolean).join(', ')}
      onPress={onPress}
      className={['min-h-16 flex-row items-start gap-3 px-4 py-3 active:bg-surface-2', unread ? 'bg-primary-light' : ''].join(' ')}
    >
      <View className="h-10 w-10 items-center justify-center rounded-full bg-surface">
        <Icon icon={icon} tone={tone} />
      </View>
      <View className="flex-1 gap-0.5">
        <Text variant="label" weight={unread ? 'semibold' : 'medium'} numberOfLines={2}>
          {title}
        </Text>
        {body ? (
          <Text tone="muted" numberOfLines={3}>
            {body}
          </Text>
        ) : null}
        <Text variant="caption" tone={unread ? 'primary' : 'muted'}>
          {formatRelative(n.created_at)}
        </Text>
      </View>
      {unread ? <View className="mt-2 h-2.5 w-2.5 rounded-full bg-accent" /> : null}
    </Pressable>
  );
}

export function NotificationRowSkeleton() {
  return (
    <View className="min-h-16 flex-row items-start gap-3 px-4 py-3">
      <Skeleton className="h-10 w-10 rounded-full" />
      <View className="flex-1 gap-2">
        <Skeleton className="h-4 w-3/4 rounded-sm" />
        <Skeleton className="h-4 w-full rounded-sm" />
        <Skeleton className="h-3 w-1/4 rounded-sm" />
      </View>
    </View>
  );
}
