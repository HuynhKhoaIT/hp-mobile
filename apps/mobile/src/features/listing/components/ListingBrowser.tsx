// Màn danh sách tin dùng chung 4 tính năng, tab Khám phá và màn Tìm kiếm (config 'all') — style Stitch "Khám phá & Bộ lọc":
//   1 header xanh (PageHero: nút quay lại trong mờ, ô icon dịch vụ, tiêu đề + dòng phụ theo config.subtitleKey) chứa ô tìm
//     kiếm nổi (SearchBar elevated). Tìm có từ khoá → log_search + event `search` (useListingBrowser).
//   2 hàng chip tràn mép: [Xoá lọc ×] (khi đang lọc) · [bộ lọc đặt sẵn ×] · [Khu ▾] · [Khoảng cách ▾] (trọ) · chip danh mục
//     con (nhãn theo config.card.display.categoryBadge nếu có — đồ thất lạc: "Mất đồ / Nhặt được").
//   3 hàng chip lọc nhanh theo thông số (config.quickFilters — bật / tắt, vd trọ "Có gác", "Chỗ để xe").
//   4 danh sách cuộn vô hạn; khi chưa tìm / lọc, đầu danh sách: `header` (vd dải nhóm ở Khám phá) → mẹo an toàn riêng tính
//     năng (config.tipKey, Notice bordered) → tiêu đề "Tin mới đăng" có vạch cam.
// Khác Stitch (cố ý): không đếm "Tìm thấy N tin" (RPC phân trang cursor, không trả tổng), không "Sắp xếp" (RPC chỉ mới nhất),
// không bản đồ, không mic (bàn phím hệ thống đã có nhập giọng nói), không chip khu đặt tên tay — khu lấy từ bảng sites.
import { useSites } from '@hp/core/react';
import type { ListingCategory } from '@hp/shared';
import { X } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, View } from 'react-native';
import { formatNumber } from '@/lib/format';
import { Chip, Col, FilterBar, Notice, PageHero, SearchBar, SectionHeader, Select } from '@/ui';
import { ALL, DISTANCE_OPTIONS_KM, type ListingPreset, useListingBrowser, usePostListing } from '../hooks';
import type { ListingFeatureConfig } from '../types';
import { ListingFeed } from './ListingFeed';

export type ListingBrowserProps = {
  config: ListingFeatureConfig;
  /** Config tính năng của từng tin (danh sách trộn 'all'): điểm nhấn thẻ + nhãn chip danh mục. */
  configOf?: (category: ListingCategory) => ListingFeatureConfig;
  /** Tiêu đề header xanh; mặc định tên tính năng (config.titleKey). */
  title?: string;
  /** Có → nút quay lại trên header xanh. */
  onBack?: () => void;
  /** Vùng phải của header xanh (vd nút Tin đã lưu ở Khám phá). */
  heroRight?: ReactNode;
  initialSite?: string;
  initialQuery?: string;
  initialPreset?: ListingPreset;
  autoFocus?: boolean;
  /** Khối trên danh sách khi chưa tìm / lọc (trước mẹo an toàn + "Tin mới đăng"). */
  header?: ReactNode;
};

export function ListingBrowser({
  config,
  configOf,
  title,
  onBack,
  heroRight,
  initialSite,
  initialQuery,
  initialPreset,
  autoFocus,
  header,
}: ListingBrowserProps) {
  const { t } = useTranslation('listing');
  const sites = useSites();
  const browser = useListingBrowser(config, { site: initialSite, query: initialQuery, preset: initialPreset });
  const post = usePostListing(config.key);
  const featureName = t(config.titleKey);

  const categoryLabel = (c: ListingCategory) => {
    const key = (configOf?.(c) ?? config).card.display?.categoryBadge?.[c]?.labelKey;
    return key ? t(key) : t(`common:category.${c}`);
  };
  const categoryOptions = [{ value: ALL, label: t('list.filter_all') }, ...config.categories.map((c) => ({ value: c, label: categoryLabel(c) }))];
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
    <Select
      trigger="chip"
      label={t('distance.label')}
      value={browser.distance}
      neutralValue={ALL}
      options={distanceOptions}
      onChange={browser.setDistance}
    />
  ) : null;

  const clearChip = browser.isFiltered ? (
    <Chip label={t('list.clear_filters')} trailingIcon={X} onPress={browser.clearAll} />
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

  const quick = config.quickFilters ?? [];
  const quickRow =
    quick.length > 0 ? (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        accessibilityLabel={t('list.quick_filters')}
        className="-mx-4 grow-0"
        contentContainerClassName="gap-2 px-4 py-1"
      >
        {quick.map((f) => (
          <Chip
            key={`${f.key}:${String(f.value)}`}
            size="sm"
            dot={config.color ?? 'accent'}
            label={typeof f.value === 'boolean' ? t(`attr.${f.key}`) : t(`attr_value.${f.key}.${f.value}`)}
            selected={browser.attributes[f.key] === f.value}
            onPress={() => browser.toggleAttribute(f.key, f.value)}
          />
        ))}
      </ScrollView>
    ) : null;

  const feedHeader = (
    <Col gap={4}>
      {header}
      {config.tipKey ? <Notice variant="bordered" tone="warning" title={t('tip.title')} text={t(config.tipKey)} /> : null}
      <SectionHeader title={t('hub.latest_title')} bar="accent" size="md" />
    </Col>
  );

  return (
    <>
      <PageHero
        title={title ?? featureName}
        subtitle={config.subtitleKey ? t(config.subtitleKey) : undefined}
        service={config.color}
        onBack={onBack}
        right={heroRight}
      >
        <SearchBar
          variant="elevated"
          value={browser.input}
          onChangeText={browser.setInput}
          onSubmit={browser.submit}
          autoFocus={autoFocus}
          placeholder={config.searchPlaceholderKey ? t(config.searchPlaceholderKey) : t('list.search_placeholder', { feature: featureName })}
        />
      </PageHero>
      <View className="gap-1 pb-1 pt-3">
        <FilterBar
          bleed
          options={config.filters.includes('subcategory') ? categoryOptions : []}
          value={browser.category}
          onChange={browser.setCategory}
          leading={
            <>
              {clearChip}
              {presetChip}
              {siteFilter}
              {distanceFilter}
            </>
          }
        />
        {quickRow}
      </View>
      <View className="flex-1">
        <ListingFeed
          config={config}
          configOf={configOf}
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
          header={browser.isFiltered ? undefined : feedHeader}
        />
      </View>
    </>
  );
}
