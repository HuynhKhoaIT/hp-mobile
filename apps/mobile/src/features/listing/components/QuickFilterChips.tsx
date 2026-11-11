// Chip lọc nhanh của tính năng (config.quickFilters): theo thông số (bật / tắt, cùng khoá thì chip sau thay chip trước),
// giá tối đa, hoặc "Cho tặng" — dùng chung hàng lọc nhanh của danh sách (ListingBrowser) và trang chủ mini-app. Chỉ trả các
// Chip; nơi gọi tự đặt trong hàng cuộn ngang.
import { useTranslation } from 'react-i18next';
import { Chip } from '@/ui';
import { isFreeQuickFilter, isPriceQuickFilter, type ListingBrowserResult } from '../hooks';
import type { ListingFeatureConfig } from '../types';

export type QuickFilterChipsProps = {
  config: ListingFeatureConfig;
  browser: Pick<ListingBrowserResult, 'freeOnly' | 'toggleFreeOnly' | 'priceMax' | 'togglePriceMax' | 'attributes' | 'toggleAttribute'>;
};

export function QuickFilterChips({ config, browser }: QuickFilterChipsProps) {
  const { t } = useTranslation('listing');
  const dot = config.color ?? 'accent';
  return (
    <>
      {(config.quickFilters ?? []).map((f) =>
        isFreeQuickFilter(f) ? (
          <Chip key="free_only" size="sm" dot={dot} label={t(f.labelKey)} selected={browser.freeOnly} onPress={browser.toggleFreeOnly} />
        ) : isPriceQuickFilter(f) ? (
          <Chip
            key={`price_max:${f.priceMax}`}
            size="sm"
            dot={dot}
            label={t(f.labelKey)}
            selected={browser.priceMax === f.priceMax}
            onPress={() => browser.togglePriceMax(f.priceMax)}
          />
        ) : (
          <Chip
            key={`${f.key}:${String(f.value)}`}
            size="sm"
            dot={dot}
            label={typeof f.value === 'boolean' ? t(`attr.${f.key}`) : t(`attr_value.${f.key}.${f.value}`)}
            selected={browser.attributes[f.key] === f.value}
            onPress={() => browser.toggleAttribute(f.key, f.value)}
          />
        ),
      )}
    </>
  );
}
