// GroupCard — thẻ nhóm ghép dùng chung Ghép xe / Ghép trận (style Stitch "Ghép xe về quê & Đi làm ca"). Khớp web
// `group-card.tsx` (cùng thứ tự, cùng prop):
// (1) dải đầu thẻ nền surface-2 (bo trên): ô icon dịch vụ nhỏ + badge loại (primary) + badge vai trò (Nhóm của tôi) | viên
//     trạng thái bên phải —
//     còn chỗ: chấm xanh + "Còn N chỗ" (kèo khai đội có sẵn còn thiếu người: "Đã có 6/7 người · cần thêm 1"), trạng thái
//     khác: nhãn trạng thái (Đã đủ người / Đã tới giờ / Đang diễn ra / Đã huỷ) theo tone GROUP_STATUS_TONE
// → (2) tiêu đề tối đa 2 dòng → (3) tuyến dạng timeline "điểm đi • | • điểm đến" (kèo: ghim sân) → (4) giờ hẹn (ngày giờ ·
// còn bao lâu) | chi phí / người (đậm 700, primary) hoặc Miễn phí → (5) hàng avatar thành viên (+N) + "Tạo bởi <tên>".
// Không có ảnh bìa (nhóm không có ảnh), không giá vé / chọn ghế / gọi điện trên thẻ (Stitch có — app không có tính năng đó).
// `roleLabel` (Nhóm của tôi: Bạn tạo / Đã tham gia / Chờ duyệt) + `roleTone` (khớp ROLE_TONE của web my-group-item: chủ
// nhóm primary, đã tham gia success, chờ duyệt warning): nút phụ như Đánh giá đặt ngoài thẻ — thẻ bấm được đọc thành một nút,
// nút lồng bên trong không tới được bằng trình đọc màn hình.
// SkeletonGroupCard theo đúng bố cục trên.
import type { PublicGroup } from '@hp/core';
import { type GroupDisplayStatus, groupDisplayStatus, groupLineup, groupMembersPreview } from '@hp/shared';
import { Clock } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { formatDate, formatMoney, formatRelative } from '@/lib/format';
import { profileAvatarUrl } from '@/lib/images';
import { AvatarStack } from './AvatarStack';
import { Badge, type BadgeTone } from './Badge';
import { Card } from './Card';
import { Icon } from './Icon';
import { RouteSummary } from './RouteSummary';
import { SERVICE } from './service';
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
  /** Vai trò của mình (Nhóm của tôi) — badge sau badge loại. */
  roleLabel?: string;
  /** Tone badge vai trò (mặc định primary). */
  roleTone?: BadgeTone;
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

/** Màu viên trạng thái ở dải đầu thẻ (chấm + chữ). Chữ success / warning giữ fg trên nền nhạt (đủ 4,5:1), như Badge. */
const PILL_BOX: Record<BadgeTone, string> = {
  neutral: 'bg-surface',
  primary: 'bg-primary-light',
  success: 'bg-success/15',
  warning: 'bg-warning/15',
  danger: 'bg-danger/15',
};
const PILL_DOT: Record<BadgeTone, string> = {
  neutral: 'bg-muted',
  primary: 'bg-primary',
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
};

export function GroupCard({ group, onPress, className, roleLabel, roleTone = 'primary' }: GroupCardProps) {
  const { t } = useTranslation('group');
  const texts = useGroupTexts();
  const status = groupDisplayStatus(group);
  const members = groupMembersPreview(group.members);
  const isRide = group.kind === 'ride';
  const time = texts.time(group);
  const seats = texts.cardSeats(group);
  const fee = texts.fee(group);
  const tone = GROUP_STATUS_TONE[status];
  // Còn chỗ → viên trạng thái nói luôn số chỗ (thay cho chữ "Còn chỗ"); trạng thái khác → nhãn trạng thái.
  const pill = status === 'open' ? seats : texts.status(group);
  const route = isRide && group.destination_text ? `${group.origin_text} → ${group.destination_text}` : group.origin_text;

  return (
    <Card
      onPress={onPress}
      padded={false}
      accessibilityLabel={[roleLabel, t(`sub_kind.${group.sub_kind}`), group.title, texts.status(group), seats, route, time, fee]
        .filter(Boolean)
        .join(', ')}
      className={className}
    >
      <View className="flex-row flex-wrap items-center justify-between gap-2 rounded-t-lg border-b border-border bg-surface-2 px-4 py-2.5">
        <View className="shrink flex-row flex-wrap items-center gap-1">
          <View className={`size-7 items-center justify-center rounded-sm ${SERVICE[group.kind].soft}`}>
            <Icon icon={SERVICE[group.kind].icon} service={group.kind} size={16} />
          </View>
          <Badge label={t(`sub_kind.${group.sub_kind}`)} tone="primary" numberOfLines={1} />
          {roleLabel ? <Badge label={roleLabel} tone={roleTone} numberOfLines={1} /> : null}
        </View>
        <View className={`max-w-full flex-row items-center gap-1.5 self-start rounded-full px-3 py-1 ${PILL_BOX[tone]}`}>
          <View className={`size-2 rounded-full ${PILL_DOT[tone]}`} />
          <Text variant="caption" weight="semibold" tone={tone === 'danger' ? 'danger' : 'default'} numberOfLines={1} className="shrink">
            {pill}
          </Text>
        </View>
      </View>
      <View className="gap-3 p-4">
        <Text variant="label" weight="semibold" numberOfLines={2}>
          {group.title}
        </Text>
        <RouteSummary
          variant="timeline"
          from={group.origin_text}
          to={isRide ? group.destination_text : null}
          fromLabel={t(isRide ? 'detail.from' : 'detail.venue')}
          toLabel={t('detail.to')}
        />
        <View className="flex-row flex-wrap items-center justify-between gap-x-3 gap-y-1">
          <View className="shrink flex-row items-center gap-1.5">
            <Icon icon={Clock} tone="primary" size={16} />
            <Text variant="caption" weight="medium" numberOfLines={1} className="shrink">
              {time}
            </Text>
          </View>
          <Text variant="price" tone="primary" numberOfLines={1}>
            {fee}
          </Text>
        </View>
        <View className="flex-row items-center gap-2 border-t border-border pt-3">
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
      </View>
    </Card>
  );
}

function CardBones() {
  return (
    <View className="rounded-lg border border-border bg-surface shadow-card">
      <View className="flex-row justify-between rounded-t-lg border-b border-border bg-surface-2 px-4 py-2.5">
        <Skeleton className="h-7 w-24 rounded-full" />
        <Skeleton className="h-7 w-20 rounded-full" />
      </View>
      <View className="gap-3 p-4">
        <Skeleton className="h-5 w-11/12" />
        <View className="flex-row gap-3">
          <Skeleton className="h-14 w-2.5 rounded-full" />
          <View className="flex-1 gap-2 py-0.5">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-5 w-2/3" />
          </View>
        </View>
        <View className="flex-row justify-between">
          <Skeleton className="h-4 w-2/5" />
          <Skeleton className="h-6 w-1/3" />
        </View>
        <View className="flex-row items-center gap-2 border-t border-border pt-3">
          <Skeleton className="h-8 w-16 rounded-full" />
          <Skeleton className="h-4 w-1/3" />
        </View>
      </View>
    </View>
  );
}

/**
 * Màn chi tiết nhóm đang tải (khớp GroupDetail): thẻ tóm tắt (badge → tiêu đề → chi phí → giờ / số chỗ) → tiêu đề khối +
 * thẻ tuyến → hàng avatar thành viên → người tạo.
 */
export function SkeletonGroupDetail() {
  return (
    <View className="gap-5">
      <View className="gap-3 rounded-lg border border-border bg-surface p-4 shadow-card">
        <View className="flex-row gap-1">
          <Skeleton className="h-7 w-24 rounded-full" />
          <Skeleton className="h-7 w-20 rounded-full" />
        </View>
        <Skeleton className="h-7 w-11/12" />
        <Skeleton className="h-7 w-2/5" />
        <Skeleton className="h-px w-full" />
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-6 w-full" />
      </View>
      <View className="gap-2">
        <Skeleton className="h-6 w-1/3" />
        <Skeleton className="h-28 w-full rounded-lg" />
      </View>
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
