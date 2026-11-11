// Lối tắt tab Tôi (style Stitch): 3 ô thẻ nhỏ cùng hàng — Đăng tin (ô icon cam đặc, icon on-accent: cam không làm màu
// icon trên nền sáng) · Tin của tôi (primary-light / primary) · Nhóm của tôi (màu dịch vụ ghép xe). Mỗi ô là một nút
// thật cao ≥ 96, nhãn text-sm đậm 600 căn giữa (xuống dòng, không cắt chữ).
import { ListChecks, type LucideIcon, Plus, Users } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import { openMyGroups } from '@/features/group/navigation';
import { usePostListing } from '@/features/listing/hooks';
import { openMyListings } from '@/features/listing/navigation';
import { Icon, type IconProps, SERVICE, Text } from '@/ui';

type Tile = { key: string; label: string; icon: LucideIcon; box: string; color: Pick<IconProps, 'tone' | 'service'>; onPress: () => void };

export function ProfileShortcuts() {
  const { t } = useTranslation();
  const post = usePostListing();
  const tiles: Tile[] = [
    { key: 'post', label: t('actions.post'), icon: Plus, box: 'bg-accent', color: { tone: 'onAccent' }, onPress: post },
    { key: 'mine', label: t('listing:manage.title'), icon: ListChecks, box: 'bg-primary-light', color: { tone: 'primary' }, onPress: () => openMyListings() },
    { key: 'groups', label: t('group:mine.title'), icon: Users, box: SERVICE.ride.soft, color: { service: 'ride' }, onPress: () => openMyGroups() },
  ];
  return (
    <View className="flex-row gap-2.5">
      {tiles.map((tile) => (
        <Pressable
          key={tile.key}
          accessibilityRole="button"
          accessibilityLabel={tile.label}
          onPress={tile.onPress}
          className="min-h-24 flex-1 items-center justify-center gap-2 rounded-lg border border-border bg-surface p-3 shadow-card active:bg-surface-2"
        >
          <View className={`size-10 items-center justify-center rounded-full ${tile.box}`}>
            <Icon icon={tile.icon} {...tile.color} />
          </View>
          <Text variant="caption" weight="semibold" className="text-center">
            {tile.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

export function ProfileShortcutsSkeleton() {
  return (
    <View className="flex-row gap-2.5">
      {[0, 1, 2].map((i) => (
        <View key={i} className="min-h-24 flex-1 items-center justify-center gap-2 rounded-lg border border-border bg-surface p-3">
          <View className="size-10 rounded-full bg-surface-2" />
          <View className="h-4 w-3/4 rounded-full bg-surface-2" />
        </View>
      ))}
    </View>
  );
}
