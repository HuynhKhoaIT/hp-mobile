// Lưới 8 dịch vụ (§4.3, §10): thẻ surface rounded-xl shadow-card p-4 nổi đè lên đáy header 48 (-mt-12 do màn đặt),
// 4 cột × 2 hàng theo HOME_TILES (@hp/shared). Ô hiện lần lượt khi mở Hub (StaggerItem, motion.stagger).
// Nhãn: dịch vụ → common.feature.<id>, tiện ích → common.home.tiles.<id>; nhãn góc "Sắp có" / "Mới".
import { HOME_TILES, type HomeTile } from '@hp/shared';
import { ClipboardList, LayoutGrid } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { track } from '@/core/analytics';
import { ServiceGrid, ServiceTile, type ServiceTileBadge, StaggerItem } from '@/ui';
import { openTile } from '../navigation';

const UTILITY_ICON = { my_listings: ClipboardList, all: LayoutGrid } as const;

export function HomeServices({ className }: { className?: string }) {
  const { t } = useTranslation();
  const badgeOf = (tile: HomeTile): ServiceTileBadge | undefined =>
    tile.kind === 'service' && tile.soon
      ? { label: t('home.badge.soon'), tone: 'soon' }
      : tile.isNew
        ? { label: t('home.badge.new'), tone: 'new' }
        : undefined;
  const press = (tile: HomeTile) => {
    track('home_tile_click', { tile: tile.id });
    openTile(tile);
  };

  return (
    <View className={['rounded-xl bg-surface p-4 shadow-card', className].filter(Boolean).join(' ')}>
      <ServiceGrid>
        {HOME_TILES.map((tile, i) => (
          <StaggerItem key={tile.id} index={i} className="flex-1">
            {tile.kind === 'service' ? (
              <ServiceTile
                variant="grid"
                service={tile.id}
                label={t(`feature.${tile.id}`)}
                badge={badgeOf(tile)}
                soon={!!tile.soon}
                onPress={() => press(tile)}
              />
            ) : (
              <ServiceTile
                variant="grid"
                icon={UTILITY_ICON[tile.id]}
                label={t(`home.tiles.${tile.id}`)}
                badge={badgeOf(tile)}
                onPress={() => press(tile)}
              />
            )}
          </StaggerItem>
        ))}
      </ServiceGrid>
    </View>
  );
}
