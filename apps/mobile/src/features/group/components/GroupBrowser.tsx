// Màn danh sách nhóm dùng chung Ghép xe và Ghép trận (khác nhau chỉ ở config.ts) — style Stitch "Ghép xe về quê & Đi làm ca":
//   1 header xanh (PageHero: nút quay lại trong mờ, ô icon dịch vụ, tiêu đề + dòng phụ theo config.labels) chứa ô tìm nổi
//     (SearchBar elevated, tìm khi bấm "Tìm" trên bàn phím).
//   2 hàng chip tràn mép: [Mọi ngày ▾] (sheet Hôm nay / Ngày mai / 7 ngày tới) · chip loại con (Tất cả / Xe cá nhân / Xe khách
//     gom / Xe máy chở kèm — kèo: Bóng đá / Cầu lông / Pickleball).
//   3 danh sách cuộn vô hạn; khi chưa tìm / lọc, đầu danh sách: mẹo an toàn riêng tính năng (config.labels.tip, Notice
//     bordered) → tiêu đề có vạch cam ("Chuyến sắp khởi hành" / "Kèo sắp diễn ra").
// Khác Stitch (cố ý): không ô "điểm đón / điểm đến / ca" riêng, "Gần tôi", đếm "45+ chuyến hôm nay" (RPC cursor không trả
// tổng), chip "Ô tô 4-7 chỗ / Chỉ nữ / Chia xăng" (không có dữ liệu đó) — tìm theo chữ + loại con + khoảng ngày có sẵn;
// không banner "Tạo chuyến" (đã có nút Tạo nổi — một hành động chính mỗi màn).
import { GROUP_TIME_WINDOWS } from '@hp/shared';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { Col, FilterBar, type FilterOption, Notice, PageHero, SearchBar, SectionHeader, Select } from '@/ui';
import { ALL, useCreateGroupAction, useGroupBrowser } from '../hooks';
import type { GroupFeatureConfig } from '../types';
import { GroupFeed } from './GroupFeed';

export function GroupBrowser({ config, onBack }: { config: GroupFeatureConfig; onBack?: () => void }) {
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

  const feedHeader = (
    <Col gap={4} className="pb-3">
      <Notice variant="bordered" tone="warning" title={t('listing:tip.title')} text={t(config.labels.tip)} />
      <SectionHeader title={t(config.labels.upcoming)} bar="accent" size="md" />
    </Col>
  );

  return (
    <>
      <PageHero title={t(config.labels.title)} subtitle={t(config.labels.subtitle)} service={config.color} onBack={onBack}>
        <SearchBar
          variant="elevated"
          value={browser.input}
          onChangeText={browser.setInput}
          onSubmit={browser.submit}
          placeholder={t(config.labels.searchPlaceholder)}
        />
      </PageHero>
      <View className="pb-1 pt-3">
        <FilterBar
          bleed
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
          header={browser.isFiltered ? undefined : feedHeader}
        />
      </View>
    </>
  );
}
