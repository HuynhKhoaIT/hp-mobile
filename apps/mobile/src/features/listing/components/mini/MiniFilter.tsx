// Màn "Bộ lọc & tìm kiếm" của mini-app (style Stitch "Bộ lọc & Tìm kiếm"), tab ẩn — thanh tab vẫn hiện (ô trang chủ sáng):
//   header (← trang chủ mini-app, tiêu đề, "Đặt lại") + ô tìm + nút Tìm + lịch sử tìm (8 từ khoá gần nhất / tính năng,
//   MMKV; chạm → tìm luôn, × xoá một, "Xoá hết").
//   Bộ lọc đặt sẵn (chip "Tìm nhanh" của Hub / ?categories= — chip đang chọn, × bỏ; chọn danh mục / "Tất cả" cũng bỏ).
//   Danh mục lớn (chọn 1: Tất cả + config.categories) → loại đồ cụ thể = giá trị enum của khoá "loại" (ô enum đầu tiên,
//   khác `condition`, trong ATTRIBUTE_FIELDS của danh mục) → p_attributes. Vị trí: khu (Tất cả khu + sites) + khoảng cách
//   tới khu (Toàn bộ / < 2 / 5 / 10 km — config.distanceOptionsKm → maxDistanceM). Khoảng giá: ô Tối thiểu / Tối đa (VND,
//   tối thiểu < tối đa — sai thì báo và khoá "Áp dụng") + chip khoảng giá config.priceRanges + chip "Cho tặng" (freeOnly —
//   loại trừ với lọc giá: chọn bên này bỏ bên kia, NO_PRICE).
//   Tình trạng (CONDITIONS — khi danh mục của tính năng có trường condition). Sắp xếp (LISTING_SORTS, nút radio).
//   Thanh dính đáy (trên thanh tab): "{n} bộ lọc" + "Áp dụng" → ghi bộ lọc vào phiên mini-app, về trang chủ.
// Màn sửa bản nháp (chép từ bộ lọc đang áp dụng mỗi lần mở) — chưa "Áp dụng" thì trang chủ không đổi.
// Khác Stitch (cố ý): không đếm "148 tin" trên nút / "Kết quả lọc" (RPC phân trang, không trả tổng), không "Tin phù hợp hàng
// đầu", không công tắc "Chỉ người bán đã xác thực / Có video test / Hẹn giao dịch không cọc / Bán gấp", không sắp xếp
// "Gần tôi nhất" / "Xem nhiều nhất" (chưa có dữ liệu / RPC), không "Tự định vị" (lọc theo khu, không theo GPS).
import { ATTRIBUTE_FIELDS, CONDITIONS, type ListingCategory, LISTING_SORTS } from '@hp/shared';
import { useFocusEffect } from 'expo-router';
import { Filter, History, RotateCcw, X } from 'lucide-react-native';
import { type ReactNode, useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, View } from 'react-native';
import { formatNumber } from '@/lib/format';
import { Button, Card, Chip, Icon, PriceInput, RadioOption, SearchBar, StickyCta, Text } from '@/ui';
import { activeFilterCount, ALL, DISTANCE_OPTIONS_KM, isFreeQuickFilter, type ListingBrowserState, NO_PRICE } from '../../hooks';
import { type MiniAppFeatureConfig, useMiniApp, useMiniFilterState, useRecentSearches } from '../../miniApp';
import { openMiniTab } from '../../navigation';
import { MiniDisclaimer } from './MiniDisclaimer';
import { MiniTabHeader } from './MiniHeader';

/** Khoá "loại đồ" của danh mục: trường enum đầu tiên khác `condition` (ATTRIBUTE_FIELDS — @hp/shared). */
function typeFieldOf(category: ListingCategory) {
  const field = ATTRIBUTE_FIELDS[category].find((f) => f.kind === 'enum' && f.key !== 'condition');
  return field?.kind === 'enum' ? field : null;
}

/** Khoảng giá đang hiện trong hai ô: tự nhập, hoặc theo chip khoảng giá đang chọn. */
function priceOf(config: MiniAppFeatureConfig, d: ListingBrowserState): { min: number | null; max: number | null } {
  if (d.customPrice) return d.customPrice;
  const range = config.priceRanges?.find((r) => r.key === d.priceRange);
  if (!range) return { min: null, max: d.priceMax };
  return { min: 'min' in range ? range.min : null, max: 'max' in range ? range.max : null };
}

export function MiniFilter() {
  const { t } = useTranslation('listing');
  const { config, sites } = useMiniApp();
  const store = useMiniFilterState();
  const recent = useRecentSearches(config.slug);
  const [draft, setDraft] = useState<ListingBrowserState>(store.state);
  const set = (patch: Partial<ListingBrowserState>) => setDraft((d) => ({ ...d, ...patch }));

  // Mỗi lần mở màn: bản nháp = bộ lọc đang áp dụng ở trang chủ.
  const applied = store.state;
  useFocusEffect(useCallback(() => setDraft(applied), [applied]));

  const apply = (next: ListingBrowserState) => {
    const q = next.input.trim();
    recent.add(q);
    store.update(() => ({ ...next, input: q, query: q }));
    openMiniTab(config.slug, 'index');
  };

  const price = priceOf(config, draft);
  const priceInvalid = price.min !== null && price.max !== null && price.min >= price.max;
  const count = activeFilterCount({ ...draft, query: draft.input.trim() });
  const free = config.quickFilters?.find(isFreeQuickFilter);
  const showCategory = config.filters.includes('subcategory');
  const showSite = config.filters.includes('site') && sites.length > 0;
  const distanceKm = config.distanceOptionsKm ?? (config.filters.includes('distance') ? DISTANCE_OPTIONS_KM : null);
  const showPrice = config.filters.includes('price') || !!config.priceRanges;
  const showCondition = config.categories.some((c) => ATTRIBUTE_FIELDS[c].some((f) => f.key === 'condition'));
  const typeField = draft.category !== ALL ? typeFieldOf(draft.category) : null;

  /** Chọn danh mục lớn: bỏ "loại đồ" của danh mục khác (khoá loại riêng từng danh mục). */
  const selectCategory = (category: ListingCategory | typeof ALL) =>
    setDraft((d) => {
      const keep = category !== ALL ? typeFieldOf(category)?.key : undefined;
      const attributes = { ...d.attributes };
      for (const c of config.categories) {
        const key = typeFieldOf(c)?.key;
        if (key && key !== keep) delete attributes[key];
      }
      return { ...d, category, attributes, preset: null };
    });
  const toggleAttribute = (key: string, value: string) =>
    setDraft((d) => {
      const attributes = { ...d.attributes };
      if (attributes[key] === value) delete attributes[key];
      else attributes[key] = value;
      return { ...d, attributes };
    });
  // Bộ lọc đặt sẵn (Hub / link): chip đang chọn, bấm → bỏ.
  const presetChip = draft.preset ? (
    <Chip
      selected
      label={draft.preset.label}
      trailingIcon={X}
      accessibilityHint={t('common:actions.clear_filter')}
      onPress={() => set({ preset: null })}
    />
  ) : null;
  const setPrice = (bound: 'min' | 'max', value: number | null) =>
    set({ customPrice: { ...price, [bound]: value }, priceRange: ALL, priceMax: null, ...(value !== null ? { freeOnly: false } : {}) });
  const toggleFree = () => set(draft.freeOnly ? { freeOnly: false } : { ...NO_PRICE, freeOnly: true });

  return (
    <>
      <MiniTabHeader
        title={t('mini_app.filter.title')}
        right={
          <Button
            size="sm"
            variant="glass"
            shape="pill"
            icon={RotateCcw}
            label={t('mini_app.filter.reset')}
            onPress={() => setDraft(store.initial)}
          />
        }
      >
        <View className="flex-row items-center gap-2">
          <View className="flex-1">
            <SearchBar
              variant="elevated"
              value={draft.input}
              onChangeText={(input) => set({ input })}
              onClear={() => set({ input: '' })}
              onSubmit={(text) => apply({ ...draft, input: text })}
              placeholder={t('list.search_placeholder', { feature: t(config.titleKey) })}
            />
          </View>
          {/* Nút phụ (kính trên header xanh) — hành động chính của màn là "Áp dụng". */}
          <Button size="sm" variant="glass" shape="pill" label={t('list.search_submit')} onPress={() => apply(draft)} />
        </View>
        {recent.list.length > 0 ? (
          <View className="gap-1">
            <View className="flex-row items-center gap-1.5">
              <Icon icon={History} tone="onPrimary" size={16} />
              <Text variant="caption" weight="semibold" tone="onPrimary" className="flex-1">
                {t('mini_app.filter.recent')}
              </Text>
              <Button size="sm" variant="glass" shape="pill" label={t('mini_app.filter.recent_clear')} onPress={recent.clear} />
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              className="-mx-4 grow-0"
              contentContainerClassName="gap-2 px-4 py-1"
            >
              {recent.list.map((q) => (
                <Chip
                  key={q}
                  size="sm"
                  label={q}
                  onPress={() => apply({ ...draft, input: q })}
                  onRemove={() => recent.remove(q)}
                  removeAccessibilityLabel={t('mini_app.filter.recent_remove_a11y', { query: q })}
                />
              ))}
            </ScrollView>
          </View>
        ) : null}
      </MiniTabHeader>

      <ScrollView className="flex-1" contentContainerClassName="gap-4 pb-6 pt-4" keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {presetChip && !showCategory ? <ChipWrap>{presetChip}</ChipWrap> : null}
        {showCategory ? (
          <Section title={t('mini_app.filter.category_title')}>
            <Caption>{t('mini_app.filter.category_big')}</Caption>
            <ChipWrap>
              {presetChip}
              <Chip
                label={t('mini_app.filter.category_all')}
                selected={draft.category === ALL && !draft.preset}
                onPress={() => selectCategory(ALL)}
              />
              {config.categories.map((c) => (
                <Chip key={c} label={t(`common:category.${c}`)} selected={draft.category === c} onPress={() => selectCategory(c)} />
              ))}
            </ChipWrap>
            {typeField ? (
              <>
                <Caption>{t('mini_app.filter.category_sub')}</Caption>
                <ChipWrap>
                  {typeField.options.map((v) => (
                    <Chip
                      key={v}
                      size="sm"
                      label={t(`attr_value.${typeField.key}.${v}`)}
                      selected={draft.attributes[typeField.key] === v}
                      onPress={() => toggleAttribute(typeField.key, v)}
                    />
                  ))}
                </ChipWrap>
              </>
            ) : null}
          </Section>
        ) : null}

        {showSite || distanceKm ? (
          <Section title={t('mini_app.filter.location_title')}>
            <Text variant="caption" tone="muted">
              {t('mini_app.filter.location_hint')}
            </Text>
            {showSite ? (
              <ChipWrap>
                <Chip label={t('mini_app.filter.location_all')} selected={draft.site === ALL} onPress={() => set({ site: ALL })} />
                {sites.map((s) => (
                  <Chip key={s.code} label={s.name} selected={draft.site === s.code} onPress={() => set({ site: s.code })} />
                ))}
              </ChipWrap>
            ) : null}
            {distanceKm ? (
              <>
                <Caption>{t('mini_app.filter.radius_title')}</Caption>
                <ChipWrap>
                  <Chip size="sm" label={t('mini_app.filter.radius_any')} selected={draft.distance === ALL} onPress={() => set({ distance: ALL })} />
                  {distanceKm.map((km) => {
                    const value = String(km * 1000);
                    return (
                      <Chip
                        key={value}
                        size="sm"
                        label={t('mini_app.filter.radius_km', { km: formatNumber(km) })}
                        selected={draft.distance === value}
                        onPress={() => set({ distance: value })}
                      />
                    );
                  })}
                </ChipWrap>
              </>
            ) : null}
          </Section>
        ) : null}

        {showPrice ? (
          <Section title={t('mini_app.filter.price_title')}>
            <View className="flex-row items-start gap-2">
              <View className="flex-1">
                <PriceInput label={t('mini_app.filter.price_min')} value={price.min} onChange={(v) => setPrice('min', v)} />
              </View>
              <View className="flex-1">
                <PriceInput label={t('mini_app.filter.price_max')} value={price.max} onChange={(v) => setPrice('max', v)} />
              </View>
            </View>
            {priceInvalid ? (
              <Text variant="caption" tone="danger" accessibilityLiveRegion="polite">
                {t('mini_app.filter.price_invalid')}
              </Text>
            ) : null}
            <ChipWrap>
              {(config.priceRanges ?? []).map((r) => {
                const selected = !draft.customPrice && draft.priceRange === r.key;
                return (
                  <Chip
                    key={r.key}
                    size="sm"
                    label={t(`price_range.${r.key}`)}
                    selected={selected}
                    onPress={() => set(selected ? NO_PRICE : { ...NO_PRICE, priceRange: r.key, freeOnly: false })}
                  />
                );
              })}
              {free ? (
                <Chip size="sm" dot="accent" label={t(free.labelKey)} selected={draft.freeOnly} onPress={toggleFree} />
              ) : null}
            </ChipWrap>
          </Section>
        ) : null}

        {showCondition ? (
          <Section title={t('mini_app.filter.condition_title')}>
            <ChipWrap>
              <Chip
                size="sm"
                label={t('mini_app.filter.condition_any')}
                selected={draft.attributes.condition === undefined}
                onPress={() =>
                  setDraft((d) => {
                    const attributes = { ...d.attributes };
                    delete attributes.condition;
                    return { ...d, attributes };
                  })
                }
              />
              {CONDITIONS.map((c) => (
                <Chip
                  key={c}
                  size="sm"
                  label={t(`attr_value.condition.${c}`)}
                  selected={draft.attributes.condition === c}
                  onPress={() => toggleAttribute('condition', c)}
                />
              ))}
            </ChipWrap>
          </Section>
        ) : null}

        {config.filters.includes('sort') ? (
          <Section title={t('mini_app.filter.sort_title')}>
            <View accessibilityRole="radiogroup" className="gap-2">
              {LISTING_SORTS.map((s) => (
                <RadioOption key={s} label={t(`sort.${s}`)} selected={draft.sort === s} onPress={() => set({ sort: s })} />
              ))}
            </View>
          </Section>
        ) : null}

        <MiniDisclaimer />
      </ScrollView>

      <StickyCta elevated>
        <View className="flex-row items-center gap-3">
          <Text variant="label" weight="semibold" className="flex-1">
            {t('mini_app.filter.active_count', { count })}
          </Text>
          <Button variant="accent" icon={Filter} label={t('mini_app.filter.apply')} disabled={priceInvalid} onPress={() => apply(draft)} />
        </View>
      </StickyCta>
    </>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card className="gap-3">
      <Text variant="title" weight="bold" accessibilityRole="header">
        {title}
      </Text>
      {children}
    </Card>
  );
}

function Caption({ children }: { children: string }) {
  return (
    <Text variant="caption" weight="semibold" tone="muted" className="uppercase">
      {children}
    </Text>
  );
}

function ChipWrap({ children }: { children: ReactNode }) {
  return <View className="flex-row flex-wrap gap-2">{children}</View>;
}
