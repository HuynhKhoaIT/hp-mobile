// Chủ nhóm: yêu cầu tham gia đang chờ (ảnh, tên công khai, đánh giá, lời nhắn) + Nhận / Từ chối. Dòng biến mất ngay
// khi bấm (optimistic trong useRespondJoin), lỗi → hiện lại + toast. Hết chỗ → nút Nhận tắt (server vẫn kiểm: group_full).
import type { GroupMember, PublicGroup } from '@hp/core';
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
      <SectionHeader title={t('requests.title')} subtitle={subtitle} />
      {requests.isLoading ? (
        <View className="gap-3 rounded-md bg-surface p-3 shadow-card">
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
        <Text tone="muted">{t('requests.empty')}</Text>
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
    <Card className="gap-3">
      <View className="flex-row items-start gap-3">
        <Avatar uri={profileAvatarUrl(m.avatar_url)} name={m.display_name || '?'} />
        <View className="flex-1 gap-1">
          <Text variant="label">{m.display_name}</Text>
          <Text variant="caption" tone="muted">
            {rating}
          </Text>
          {m.note ? (
            <Text tone="muted" selectable className="italic">
              {m.note}
            </Text>
          ) : null}
        </View>
      </View>
      <View className="flex-row gap-2">
        <View className="flex-1">
          <Button label={t('requests.accept')} size="sm" fullWidth disabled={busy || full} onPress={onAccept} />
        </View>
        <View className="flex-1">
          <Button label={t('requests.decline')} size="sm" variant="outline" fullWidth disabled={busy} onPress={onDecline} />
        </View>
      </View>
    </Card>
  );
}
