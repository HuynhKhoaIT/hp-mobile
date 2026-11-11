// Chủ nhóm: yêu cầu tham gia đang chờ (style Stitch "Thông báo có người đặt chuyến"): tiêu đề có vạch cam + số yêu cầu,
// mỗi yêu cầu một thẻ viền cam nhạt — ảnh, tên công khai, đánh giá, lời nhắn (khung trích dẫn vạch cam) → Từ chối (viền) |
// Nhận (primary, bên phải gần ngón cái). Dòng biến mất ngay khi bấm (optimistic trong useRespondJoin), lỗi → hiện lại +
// toast. Hết chỗ → nút Nhận tắt (server vẫn kiểm: group_full).
// Khác Stitch (cố ý): không "Liên hệ" / số điện thoại / ghế số / thanh toán trên thẻ — chat nhóm mở sau khi nhận.
import type { GroupMember, PublicGroup } from '@hp/core';
import { Check, X } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { formatNumber } from '@/lib/format';
import { profileAvatarUrl } from '@/lib/images';
import { Avatar, Button, Card, ErrorState, SectionHeader, Skeleton, Text } from '@/ui';
import { useJoinRequests } from '../hooks';

export function RequestsList({ group }: { group: PublicGroup }) {
  const { t } = useTranslation('group');
  const requests = useJoinRequests(group.id, true);
  const full = (group.seats_left ?? group.seats_total - group.seats_taken) <= 0;
  const subtitle = requests.pending.length > 0 ? t('requests.pending', { count: requests.pending.length }) : undefined;

  return (
    <View className="gap-2">
      <SectionHeader title={t('requests.title')} subtitle={subtitle} bar="accent" />
      {requests.isLoading ? (
        <View className="gap-3 rounded-lg border border-border bg-surface p-4 shadow-card">
          <View className="flex-row items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <View className="flex-1 gap-2">
              <Skeleton className="h-5 w-1/2" />
              <Skeleton className="h-4 w-1/3" />
            </View>
          </View>
          <Skeleton className="h-11 w-full" />
        </View>
      ) : requests.isError ? (
        <ErrorState compact code={requests.error.code} onRetry={() => void requests.refetch()} />
      ) : requests.pending.length === 0 ? (
        <Card>
          <Text tone="muted">{t('requests.empty')}</Text>
        </Card>
      ) : (
        <View className="gap-3">
          {requests.pending.map((m) => (
            <RequestRow
              key={m.user_id}
              member={m}
              busy={requests.busyId === m.user_id}
              full={full}
              onAccept={() => requests.accept(m)}
              onDecline={() => requests.decline(m)}
            />
          ))}
        </View>
      )}
    </View>
  );
}

function RequestRow({
  member: m,
  busy,
  full,
  onAccept,
  onDecline,
}: {
  member: GroupMember;
  busy: boolean;
  full: boolean;
  onAccept: () => void;
  onDecline: () => void;
}) {
  const { t } = useTranslation('group');
  const rating =
    m.rating_count > 0
      ? t('listing:detail.rating', { avg: formatNumber(Math.round(m.rating_avg * 10) / 10), count: m.rating_count })
      : t('listing:detail.no_rating');
  return (
    <Card className="gap-3 border-2 border-accent/40">
      <View className="flex-row items-start gap-3">
        <Avatar uri={profileAvatarUrl(m.avatar_url)} name={m.display_name || '?'} />
        <View className="flex-1 gap-0.5">
          <Text variant="label" weight="semibold">
            {m.display_name}
          </Text>
          <Text variant="caption" tone="muted">
            {rating}
          </Text>
        </View>
      </View>
      {m.note ? (
        <View className="rounded-sm border-l-2 border-accent bg-surface-2 px-3 py-2">
          <Text tone="muted" selectable className="italic">
            {m.note}
          </Text>
        </View>
      ) : null}
      <View className="flex-row gap-2">
        <View className="flex-1">
          <Button label={t('requests.decline')} icon={X} size="sm" variant="outline" fullWidth disabled={busy} onPress={onDecline} />
        </View>
        <View className="flex-1">
          <Button label={t('requests.accept')} icon={Check} size="sm" fullWidth disabled={busy || full} onPress={onAccept} />
        </View>
      </View>
    </Card>
  );
}
