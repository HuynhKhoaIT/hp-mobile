// Hàng thành viên ở chi tiết: avatar chồng mép (≤ 8 người đã nhận từ public_groups.members, +N) + số chỗ còn lại.
// Tham gia ngay → avatar của mình bay vào hàng (AvatarStack) và số chỗ đếm ngược (Ticker). AvatarStack luôn được
// mount (kể cả khi chưa có ai) để avatar đầu tiên cũng có hiệu ứng.
import type { PublicGroup } from '@hp/core';
import { groupMembersPreview } from '@hp/shared';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { profileAvatarUrl } from '@/lib/images';
import { AvatarStack, SectionHeader, Text, Ticker, useGroupTexts } from '@/ui';

export function MembersRow({ group }: { group: PublicGroup }) {
  const { t } = useTranslation('group');
  const texts = useGroupTexts();
  const members = groupMembersPreview(group.members);
  const left = group.seats_left ?? Math.max(0, group.seats_total - group.seats_taken);

  return (
    <View className="gap-2">
      <SectionHeader title={t('detail.members', { count: group.seats_taken })} />
      <View className="flex-row flex-wrap items-center gap-3">
        <AvatarStack
          max={6}
          total={group.seats_taken}
          people={members.map((m) => ({ id: m.id, name: m.name ?? '', uri: profileAvatarUrl(m.avatar_url) }))}
          moreLabel={(count) => t('card.members_more', { count })}
          accessibilityLabel={members.length > 0 ? t('card.members_count', { count: group.seats_taken }) : undefined}
        />
        {members.length === 0 ? (
          <Text tone="muted" className="flex-1">
            {t('detail.members_empty')}
          </Text>
        ) : null}
        <Ticker text={texts.seats(group)} variant="label" tone={left > 0 ? 'success' : 'muted'} />
      </View>
    </View>
  );
}
