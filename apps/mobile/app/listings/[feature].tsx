// Screen type: List
// Danh sách tin của một tính năng Listing (pass | room | job | lost-found) hoặc mọi tin (all) — một màn cho cả 4,
// khác nhau chỉ ở config.ts (quy tắc vàng). `?site=` đặt sẵn khu (Hub → Xem tất cả).
import { useSites } from '@hp/core/react';
import { Redirect, useLocalSearchParams } from 'expo-router';
import { Plus } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { ListingFeed } from '@/features/listing/components/ListingFeed';
import { allListingsConfig } from '@/features/listing/config';
import { ALL, useListingBrowser, usePostListing } from '@/features/listing/hooks';
import type { ListingFeatureConfig } from '@/features/listing/types';
import { jobConfig } from '@/features/job/config';
import { lostFoundConfig } from '@/features/lost-found/config';
import { passConfig } from '@/features/pass/config';
import { roomConfig } from '@/features/room/config';
import { Fab, FilterBar, Header, Screen, SearchBar, Select } from '@/ui';

const CONFIGS: Record<string, ListingFeatureConfig> = {
  pass: passConfig,
  room: roomConfig,
  job: jobConfig,
  'lost-found': lostFoundConfig,
  all: allListingsConfig,
};

export default function ListingListRoute() {
  const { feature, site } = useLocalSearchParams<{ feature: string; site?: string }>();
  const config = CONFIGS[feature ?? ''];
  if (!config) return <Redirect href="/" />;
  // key: đổi tính năng / khu ban đầu → state bộ lọc mới.
  return <ListingListScreen key={`${config.slug}:${site ?? ''}`} config={config} initialSite={site} />;
}

function ListingListScreen({ config, initialSite }: { config: ListingFeatureConfig; initialSite?: string }) {
  const { t } = useTranslation('listing');
  const sites = useSites();
  const browser = useListingBrowser(config, { site: initialSite });
  const post = usePostListing();
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
    <Screen>
      <Header title={title} />
      <View className="gap-2 pb-2">
        <SearchBar
          value={browser.input}
          onChangeText={browser.setInput}
          onSubmit={browser.submit}
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
      <Fab label={t('list.post_cta')} icon={Plus} onPress={post} />
    </Screen>
  );
}
