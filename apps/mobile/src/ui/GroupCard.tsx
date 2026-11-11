// GroupCard — thẻ nhóm ghép dùng chung Ghép xe / Ghép trận. Khớp web `group-card.tsx` (cùng thứ tự, cùng prop):
// (1) badge loại (neutral) + badge trạng thái (groupDisplayStatus, tone GROUP_STATUS_TONE) → (2) tiêu đề tối đa 2 dòng
// → (3) giờ hẹn (ngày giờ · còn bao lâu) → (4) tuyến "điểm đi → điểm đến" (kèo: sân) → (5) chỗ còn lại + chi phí / người
// (đậm 700) hoặc Miễn phí → (6) hàng avatar thành viên (+N) + "Tạo bởi <tên>".
// `roleLabel` (Nhóm của tôi: Bạn tạo / Đã tham gia / Chờ duyệt) thêm badge primary đầu hàng (nút phụ như Đánh giá đặt
// ngoài thẻ — thẻ bấm được đọc thành một nút, nút lồng bên trong không tới được bằng trình đọc màn hình).
// Trạng thái in_progress (cron) hiện "Đang diễn ra" thay cho "Đã tới giờ".
// Kèo khai đội có sẵn (attributes.players_have → groupLineup của @hp/shared): dòng (5) thành "Đã có 6/7 người · cần thêm 1"
// thay cho "Còn N chỗ"; đủ người (need = 0) vẫn "Đã đủ người" như cũ.
// SkeletonGroupCard theo đúng bố cục trên.
import type { PublicGroup } from '@hp/core';
import { type GroupDisplayStatus, groupDisplayStatus, groupLineup, groupMembersPreview } from '@hp/shared';
import { Clock, Users } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { formatDate, formatMoney, formatRelative } from '@/lib/format';
import { profileAvatarUrl } from '@/lib/images';
import { AvatarStack } from './AvatarStack';
import { Badge, type BadgeTone } from './Badge';
import { Card } from './Card';
import { Icon } from './Icon';
import { RouteSummary } from './RouteSummary';
import { Skeleton } from './Skeleton';
import { Text } from './Text';

/** Tone badge trạng thái nhóm — khớp web (StatusBadge của group-card). */
export const GROUP_STATUS_TONE: Record<GroupDisplayStatus, BadgeTone> = {
  open: 'success',
  full: 'warning',
  started: 'neutral',
  completed: 'neutral',
  cancelled: 'danger',
};

export type GroupCardProps = {
  group: PublicGroup;
  onPress?: () => void;
  /** Bề rộng / vị trí trong danh sách hoặc hàng ngang (vd `w-72`). */
  className?: string;
  /** Vai trò của mình (Nhóm của tôi) — badge primary đầu hàng. */
  roleLabel?: string;
};

/** Chữ dùng chung card + chi tiết: chỗ còn lại, chi phí, giờ hẹn. */
export function useGroupTexts() {
  const { t } = useTranslation('group');
  const seats = (g: Pick<PublicGroup, 'seats_left' | 'seats_total' | 'seats_taken'>) => {
    const left = g.seats_left ?? Math.max(0, g.seats_total - g.seats_taken);
    return left > 0 ? t('card.seats_left', { count: left }) : t('card.seats_full');
  };
  return {
    seats,
    /** Dòng chỗ của thẻ: kèo có đội hình còn thiếu → "Đã có 6/7 người · cần thêm 1", còn lại như seats(). */
    cardSeats: (g: Pick<PublicGroup, 'kind' | 'attributes' | 'seats_left' | 'seats_total' | 'seats_taken'>) => {
      const lineup = groupLineup(g.kind, g.attributes, g.seats_total, g.seats_taken);
      if (!lineup || lineup.need <= 0) return seats(g);
      return `${t('card.lineup', { have: lineup.have, total: lineup.total })} · ${t('card.lineup_need', { count: lineup.need })}`;
    },
    fee: (g: Pick<PublicGroup, 'fee_per_person'>) =>
      g.fee_per_person > 0 ? t('card.fee_per_person', { fee: formatMoney(g.fee_per_person) }) : t('card.free'),
    time: (g: Pick<PublicGroup, 'starts_at'>) => `${formatDate(g.starts_at, 'datetime')} · ${formatRelative(g.starts_at)}`,
    /** Nhãn trạng thái: in_progress (cron đã đổi) → "Đang diễn ra", còn lại theo groupDisplayStatus. */
    status: (g: { status: string; starts_at: string }) =>
      t(g.status === 'in_progress' ? 'status.in_progress' : `status.${groupDisplayStatus(g)}`),
  };
}

export function GroupCard({ group, onPress, className, roleLabel }: GroupCardProps) {
  const { t } = useTranslation('group');
  const texts = useGroupTexts();
  const status = groupDisplayStatus(group);
  const members = groupMembersPreview(group.members);
  const isRide = group.kind === 'ride';
  const time = texts.time(group);
  const seats = texts.cardSeats(group);
  const fee = texts.fee(group);
  const route = isRide && group.destination_text ? `${group.origin_text} → ${group.destination_text}` : group.origin_text;

  return (
    <Card
      onPress={onPress}
      accessibilityLabel={[roleLabel, group.title, texts.status(group), time, route, seats, fee].filter(Boolean).join(', ')}
      className={['gap-2', className].filter(Boolean).join(' ')}
    >
      <View className="flex-row flex-wrap gap-1">
        {roleLabel ? <Badge label={roleLabel} tone="primary" numberOfLines={1} /> : null}
        <Badge label={t(`sub_kind.${group.sub_kind}`)} numberOfLines={1} />
        <Badge label={texts.status(group)} tone={GROUP_STATUS_TONE[status]} numberOfLines={1} />
      </View>
      <Text variant="label" numberOfLines={2}>
        {group.title}
      </Text>
      <View className="flex-row items-start gap-2">
        <Icon icon={Clock} tone="muted" size={16} />
        <Text variant="caption" numberOfLines={1} className="flex-1">
          {time}
        </Text>
      </View>
      <RouteSummary
        variant="compact"
        from={group.origin_text}
        to={isRide ? group.destination_text : null}
        fromLabel={t(isRide ? 'detail.from' : 'detail.venue')}
        toLabel={t('detail.to')}
      />
      <View className="flex-row flex-wrap items-center justify-between gap-2">
        <View className="flex-row items-center gap-2">
          <Icon icon={Users} tone={status === 'open' ? 'success' : 'muted'} size={16} />
          <Text variant="caption" weight="medium" tone={status === 'open' ? 'success' : 'muted'}>
            {seats}
          </Text>
        </View>
        <Text variant="price" numberOfLines={1}>
          {fee}
        </Text>
      </View>
      <View className="flex-row items-center gap-2 border-t border-border pt-2">
        {members.length > 0 ? (
          <AvatarStack
            size="sm"
            max={4}
            total={group.seats_taken}
            people={members.map((m) => ({ id: m.id, name: m.name ?? '', uri: profileAvatarUrl(m.avatar_url) }))}
            moreLabel={(count) => t('card.members_more', { count })}
            accessibilityLabel={t('card.members_count', { count: group.seats_taken })}
          />
        ) : null}
        <Text variant="caption" tone="muted" numberOfLines={1} className="flex-1">
          {t('card.by_host', { name: group.host_name ?? '' })}
        </Text>
      </View>
    </Card>
  );
}

function CardBones() {
  return (
    <View className="gap-2 rounded-lg border border-border bg-surface p-4 shadow-card">
      <View className="flex-row gap-1">
        <Skeleton className="h-6 w-24 rounded-full" />
        <Skeleton className="h-6 w-20 rounded-full" />
      </View>
      <Skeleton className="h-5 w-11/12" />
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="h-4 w-3/4" />
      <View className="flex-row justify-between">
        <Skeleton className="h-4 w-1/4" />
        <Skeleton className="h-6 w-1/3" />
      </View>
      <View className="flex-row items-center gap-2 pt-2">
        <Skeleton className="h-8 w-16 rounded-full" />
        <Skeleton className="h-4 w-1/3" />
      </View>
    </View>
  );
}

/** Màn chi tiết nhóm đang tải: badge → tiêu đề → tuyến → khối giờ / chỗ / chi phí → hàng avatar → người tạo. */
export function SkeletonGroupDetail() {
  return (
    <View className="gap-5">
      <View className="gap-2">
        <View className="flex-row gap-1">
          <Skeleton className="h-6 w-24 rounded-full" />
          <Skeleton className="h-6 w-20 rounded-full" />
        </View>
        <Skeleton className="h-7 w-11/12" />
        <Skeleton className="h-7 w-1/2" />
      </View>
      <Skeleton className="h-28 w-full" />
      <Skeleton className="h-36 w-full" />
      <View className="flex-row gap-1">
        <Skeleton className="h-10 w-10 rounded-full" />
        <Skeleton className="h-10 w-10 rounded-full" />
        <Skeleton className="h-10 w-10 rounded-full" />
      </View>
      <View className="flex-row items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-full" />
        <View className="flex-1 gap-2">
          <Skeleton className="h-5 w-1/2" />
          <Skeleton className="h-4 w-1/3" />
        </View>
      </View>
    </View>
  );
}

/** Thẻ chờ đúng hình GroupCard (danh sách một cột). */
export function SkeletonGroupCard({ count = 1 }: { count?: number }) {
  return (
    <View className="gap-3">
      {Array.from({ length: count }, (_, i) => (
        <CardBones key={i} />
      ))}
    </View>
  );
}
