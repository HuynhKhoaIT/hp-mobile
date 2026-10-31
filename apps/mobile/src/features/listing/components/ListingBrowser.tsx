// Ô tìm kiếm + bộ lọc (danh mục con, khu) + danh sách tin cuộn vô hạn — dùng chung màn danh sách của 4 tính năng,
// tab Khám phá và màn Tìm kiếm (config 'all'). Tìm có từ khoá → log_search + event `search` (useListingBrowser).
import { useSites } from '@hp/core/react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { FilterBar, SearchBar, Select } from '@/ui';
import { ALL, useListingBrowser, usePostListing } from '../hooks';
import type { ListingFeatureConfig } from '../types';
import { ListingFeed } from './ListingFeed';

export type ListingBrowserProps = {
  config: ListingFeatureConfig;
  initialSite?: string;
  initialQuery?: string;
  autoFocus?: boolean;
};

export function ListingBrowser({ config, initialSite, initialQuery, autoFocus }: ListingBrowserProps) {
  const { t } = useTranslation('listing');
  const sites = useSites();
  const browser = useListingBrowser(config, { site: initialSite, query: initialQuery });
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
        {config.filters.includes('subcategory') ? (
          <FilterBar options={categoryOptions} value={browser.category} onChange={browser.setCategory} leading={siteFilter} />
        ) : (
          siteFilter
        )}
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
        />
      </View>
    </>
  );
}
