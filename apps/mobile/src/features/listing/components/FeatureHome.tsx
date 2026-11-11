// Trang chủ riêng của một tính năng Listing (config.home — Pass đồ như một chợ đồ cũ trong super app), đặt làm `header`
// của ListingBrowser nên chỉ hiện khi chưa tìm / lọc, dưới header xanh + ô tìm kiếm của tính năng:
//   1 lưới danh mục (config.categories theo thứ tự, icon config.categoryIcons trên nền màu dịch vụ nhạt, nhãn
//     `listing:category_short.<code>`; > 8 danh mục → 5 cột) — bấm → chọn chip danh mục ngay trên màn.
//   2 banner trượt của placement config.home.bannerPlacement (lỗi → ẩn, không chặn trang; bấm → mở link như Hub).
//   3 các dải tin theo config.home.rails (khung ListingRailSection như Hub: chờ / lỗi + Thử lại / rỗng → ẩn dải):
//     near "Gần {khu}" (khu đang chọn của Hub, do route truyền) · free "Cho tặng miễn phí" · category "{danh mục} mới đăng".
//     "Xem tất cả" → lọc theo khu / bật "Cho tặng" / chọn danh mục (khối này ẩn, chip "Xoá lọc" đưa về đây).
// Sau khối này ListingBrowser hiện "Tất cả tin {tính năng}" + danh sách đầy đủ.
import { useListingList } from '@hp/core/react';
import type { ListingCategory } from '@hp/shared';
import { Gift, MapPin, Tag } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { Card, SectionHeader, type SectionHeaderIcon, ServiceGrid, ServiceTile } from '@/ui';
import type { ListingBrowserApi } from '../hooks';
import type { ListingFeatureConfig, ListingFeatureHomeRail } from '../types';
import { ListingRailSection } from './ListingRailSection';
import { PlacementBanners } from './PlacementBanners';

/** Số tin mỗi dải (như dải "Gần {khu}" của Hub). */
const RAIL_SIZE = 10;

/** Khu đang chọn của Hub (useHomeSite) — null khi chưa có khu nào. */
export type FeatureHomeSite = { code: string; name: string } | null;

export type FeatureHomeProps = {
  config: ListingFeatureConfig;
  /** Thao tác của danh sách bên dưới (ListingBrowser `header` dạng hàm). */
  browser: ListingBrowserApi;
  site: FeatureHomeSite;
  /** Đang xác định khu → dải "Gần {khu}" chờ. */
  siteLoading: boolean;
  /** Màn đang hiện → banner tự chuyển. */
  active: boolean;
};

export function FeatureHome({ config, browser, site, siteLoading, active }: FeatureHomeProps) {
  const home = config.home;
  if (!home) return null;
  return (
    <View className="gap-6">
      <CategoryGrid config={config} onSelect={browser.selectCategory} />
      {home.bannerPlacement ? (
        <View className="-mx-4">
          <PlacementBanners placement={home.bannerPlacement} active={active} hideOnError />
        </View>
      ) : null}
      {home.rails.length > 0 ? (
        <View className="-mx-4 gap-6">
          {home.rails.map((rail, i) => (
            <FeatureHomeRail
              key={rail.key}
              rail={rail}
              config={config}
              browser={browser}
              site={site}
              siteLoading={siteLoading}
              priorityCount={i === 0 ? 4 : undefined}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

function CategoryGrid({ config, onSelect }: { config: ListingFeatureConfig; onSelect: (category: ListingCategory) => void }) {
  const { t } = useTranslation('listing');
  return (
    <View className="gap-3">
      <SectionHeader title={t('feature_home.categories_title')} size="md" />
      <Card>
        <ServiceGrid columns={config.categories.length > 8 ? 5 : 4}>
          {config.categories.map((c) => {
            const label = t(`category_short.${c}`);
            const icon = config.categoryIcons?.[c];
            const a11y = t('feature_home.category_a11y', { category: t(`common:category.${c}`) });
            return (
              <View key={c} className="flex-1">
                {config.color ? (
                  <ServiceTile
                    variant="grid"
                    service={config.color}
                    icon={icon}
                    label={label}
                    accessibilityLabel={a11y}
                    onPress={() => onSelect(c)}
                  />
                ) : (
                  <ServiceTile variant="grid" icon={icon ?? Tag} label={label} accessibilityLabel={a11y} onPress={() => onSelect(c)} />
                )}
              </View>
            );
          })}
        </ServiceGrid>
      </Card>
    </View>
  );
}

function FeatureHomeRail({
  rail,
  config,
  browser,
  site,
  siteLoading,
  priorityCount,
}: {
  rail: ListingFeatureHomeRail;
  config: ListingFeatureConfig;
  browser: ListingBrowserApi;
  site: FeatureHomeSite;
  siteLoading: boolean;
  priorityCount?: number;
}) {
  const { t } = useTranslation('listing');
  const near = rail.kind === 'near';
  const categories = rail.kind === 'category' ? [rail.category] : [...config.categories];
  const list = useListingList(
    {
      categories,
      limit: RAIL_SIZE,
      ...(near && site ? { site: site.code } : {}),
      ...(rail.kind === 'free' ? { freeOnly: true } : {}),
    },
    // "Gần {khu}" chờ biết khu rồi mới tải (tránh tải hai lần: không khu → có khu).
    { enabled: !near || !siteLoading },
  );

  const categoryIcon = (c: ListingCategory): SectionHeaderIcon =>
    config.color ? { service: config.color, icon: config.categoryIcons?.[c] } : { icon: config.categoryIcons?.[c] ?? Tag, tone: 'primary' };

  const view: { title: string | null; subtitle?: string; icon: SectionHeaderIcon; onSeeAll?: () => void } =
    rail.kind === 'near'
      ? {
          title: siteLoading ? null : site ? t('feature_home.near_title', { site: site.name }) : t('feature_home.near_title_any'),
          icon: { icon: MapPin, tone: 'primary' },
          onSeeAll: site ? () => browser.selectSite(site.code) : undefined,
        }
      : rail.kind === 'free'
        ? {
            title: t('feature_home.free_title'),
            subtitle: t('feature_home.free_subtitle'),
            icon: { icon: Gift, tone: 'accent' },
            onSeeAll: browser.showFree,
          }
        : {
            title: t('feature_home.rail_category', { category: t(`category_short.${rail.category}`) }),
            icon: categoryIcon(rail.category),
            onSeeAll: () => browser.selectCategory(rail.category),
          };

  return (
    <ListingRailSection
      {...view}
      items={list.items}
      isLoading={list.isLoading || (near && siteLoading)}
      isError={list.isError}
      errorCode={list.error?.code}
      onRetry={() => void list.refetch()}
      priorityCount={priorityCount}
      display={config.card.display}
    />
  );
}
