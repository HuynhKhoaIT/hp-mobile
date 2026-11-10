// Ô tìm kiếm + bộ lọc (khoảng ngày, loại con) + danh sách nhóm cuộn vô hạn — một màn cho Ghép xe và Ghép trận,
// khác nhau chỉ ở config.ts. Chip "Mọi ngày" mở sheet chọn Hôm nay / Ngày mai / 7 ngày tới.
import { GROUP_TIME_WINDOWS } from '@hp/shared';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { FilterBar, type FilterOption, SearchBar, Select } from '@/ui';
import { ALL, useCreateGroupAction, useGroupBrowser } from '../hooks';
import type { GroupFeatureConfig } from '../types';
import { GroupFeed } from './GroupFeed';

export function GroupBrowser({ config }: { config: GroupFeatureConfig }) {
  const { t } = useTranslation('group');
  const browser = useGroupBrowser(config);
  const create = useCreateGroupAction(config.kind);

  const subOptions: FilterOption<string>[] = [
    { value: ALL, label: t('list.sub_any') },
    ...config.subKinds.map((s) => ({ value: s, label: t(`sub_kind.${s}`) })),
  ];
  const whenOptions = [
    { value: ALL, label: t('list.when_any') },
    ...GROUP_TIME_WINDOWS.map((w) => ({ value: w, label: t(`list.when.${w}`) })),
  ];

  return (
    <>
      <View className="gap-2 pb-2">
        <SearchBar
          value={browser.input}
          onChangeText={browser.setInput}
          onSubmit={browser.submit}
          placeholder={t(config.labels.searchPlaceholder)}
        />
        <FilterBar
          options={subOptions}
          value={browser.subKind}
          onChange={browser.setSubKind}
          leading={
            <Select
              trigger="chip"
              label={t('detail.time')}
              value={browser.when}
              neutralValue={ALL}
              options={whenOptions}
              onChange={browser.setWhen}
            />
          }
        />
      </View>
      <View className="flex-1">
        <GroupFeed
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
          onCreate={create}
        />
      </View>
    </>
  );
}
