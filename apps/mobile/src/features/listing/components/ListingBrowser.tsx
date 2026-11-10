// Ô tìm kiếm + bộ lọc (danh mục con, khu) + danh sách tin cuộn vô hạn — dùng chung màn danh sách của 4 tính năng,
// tab Khám phá và màn Tìm kiếm (config 'all'). Tìm có từ khoá → log_search + event `search` (useListingBrowser).
// Bộ lọc đặt sẵn từ Hub (chip "Tìm nhanh"…) hiện thành chip đang chọn có dấu X ở đầu hàng lọc — bấm để bỏ.
// Filter 'distance' (trọ): hàng chip thứ hai "Mọi khoảng cách / Dưới 1 km / …" → maxDistanceM (cách khu làm việc).
// `header` (vd dải nhóm ở Khám phá) cuộn cùng danh sách, chỉ hiện khi chưa tìm / lọc.
import { useSites } from '@hp/core/react';
import { X } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { formatNumber } from '@/lib/format';
import { Chip, FilterBar, SearchBar, Select } from '@/ui';
import { ALL, DISTANCE_OPTIONS_KM, type ListingPreset, useListingBrowser, usePostListing } from '../hooks';
import type { ListingFeatureConfig } from '../types';
import { ListingFeed } from './ListingFeed';

export type ListingBrowserProps = {
  config: ListingFeatureConfig;
  initialSite?: string;
  initialQuery?: string;
  initialPreset?: ListingPreset;
  autoFocus?: boolean;
  /** Khối trên danh sách khi chưa tìm / lọc. */
  header?: ReactNode;
};

export function ListingBrowser({ config, initialSite, initialQuery, initialPreset, autoFocus, header }: ListingBrowserProps) {
  const { t } = useTranslation('listing');
  const sites = useSites();
  const browser = useListingBrowser(config, { site: initialSite, query: initialQuery, preset: initialPreset });
  const post = usePostListing(config.key);
  const title = t(config.titleKey);

  const categoryOptions = [
    { value: ALL, label: t('list.filter_all') },
    ...config.categories.map((c) => ({ value: c, label: t(`common:category.${c}`) })),
  ];
  const siteOptions = [{ value: ALL, label: t('list.site_any') }, ...(sites.data ?? []).map((s) => ({ value: s.code, label: s.name }))];
  const siteFilter =
    config.filters.includes('site') && siteOptions.length > 1 ? (
      <Select
        trigger="chip"
        label={t('list.site_filter')}
        value={browser.site}
        neutralValue={ALL}
        options={siteOptions}
        onChange={browser.setSite}
      />
    ) : null;

  const distanceOptions = [
    { value: ALL, label: t('distance.any') },
    ...(config.distanceOptionsKm ?? DISTANCE_OPTIONS_KM).map((km) => ({ value: String(km * 1000), label: t('distance.within', { km: formatNumber(km) }) })),
  ];
  const distanceFilter = config.filters.includes('distance') ? (
    <View accessibilityRole="radiogroup" accessibilityLabel={t('distance.label')}>
      <FilterBar options={distanceOptions} value={browser.distance} onChange={browser.setDistance} />
    </View>
  ) : null;

  const presetChip = browser.preset ? (
    <Chip
      label={browser.preset.label}
      selected
      trailingIcon={X}
      accessibilityHint={t('common:actions.clear_filter')}
      onPress={browser.clearPreset}
    />
  ) : null;

  return (
    <>
      <View className="gap-2 pb-2">
        <SearchBar
          value={browser.input}
          onChangeText={browser.setInput}
          onSubmit={browser.submit}
          autoFocus={autoFocus}
          placeholder={config.searchPlaceholderKey ? t(config.searchPlaceholderKey) : t('list.search_placeholder', { feature: title })}
        />
        {config.filters.includes('subcategory') || presetChip ? (
          <FilterBar
            options={config.filters.includes('subcategory') ? categoryOptions : []}
            value={browser.category}
            onChange={browser.setCategory}
            leading={
              <>
                {presetChip}
                {siteFilter}
              </>
            }
          />
        ) : (
          siteFilter
        )}
        {distanceFilter}
      </View>
      <View className="flex-1">
        <ListingFeed
          config={config}
          items={browser.items}
          isLoading={browser.isLoading}
          isError={browser.isError}
          errorCode={browser.error?.code}
          isFiltered={browser.isFiltered}
          isRefetching={browser.isRefetching}
          hasNextPage={browser.hasNextPage}
          isFetchingNextPage={browser.isFetchingNextPage}
          isFetchNextPageError={browser.isFetchNextPageError}
          fetchNextPage={() => void browser.fetchNextPage()}
          refetch={() => void browser.refetch()}
          onPost={post}
          header={browser.isFiltered ? undefined : header}
        />
      </View>
    </>
  );
}
