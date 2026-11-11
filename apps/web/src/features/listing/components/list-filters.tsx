// Bộ lọc danh sách (style Stitch "Khám phá & Bộ lọc") — chạy được khi tắt JS: chip là link, ô tìm + khu + khoảng cách là
// form GET. Hai phần:
// - ListSearchForm: đặt trong header xanh — ô tìm nổi (nền surface, bo tròn, shadow-card), chọn khu, khoảng cách (trọ:
//   `distanceOptions` từ config, ?distance=N km), nút Tìm. Giữ category + thuộc tính đang lọc qua input ẩn.
// - ListChips: dưới header — hàng chip danh mục (trang một tính năng: category, nhãn theo config.card.categoryBadge nếu có —
//   đồ thất lạc "Mất đồ / Nhặt được"; /tin + /tim-kiem: 4 tính năng, link sang trang riêng) → hàng chip lọc nhanh theo thông
//   số (config.quickFilters, bật / tắt — `?has_loft=1`; chip giá tối đa — `?price_max=1000000`) → thuộc tính khác đang lọc (chip "Tìm nhanh" của trang chủ) dạng
//   viên có nút bỏ + "Xoá từ khoá" + "Xoá lọc" (bỏ mọi tham số) khi đang lọc.
// Khác Stitch (cố ý): không thanh trượt giá / "Sắp xếp" / xác thực người bán / ship nội bộ — RPC và dữ liệu không có.
import type { Site } from '@hp/core';
import type { ListingCategory, ListingFeature } from '@hp/shared';
import { Search, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import { LISTING_FEATURE_CONFIGS, LISTING_FEATURE_ORDER } from '../features';
import { activeFilterCount, attributeQuery, attributesFor, filterQuery, isPriceQuickFilter, type ListFilterState } from '../filters';
import { FilterSelect, SiteSelect } from './site-select';

const RING = 'outline-none focus-visible:ring-3 focus-visible:ring-ring/50';

function Chip({
  href,
  selected,
  children,
  pressed,
}: {
  href: Parameters<typeof Link>[0]['href'];
  selected: boolean;
  children: ReactNode;
  /** Chip bật / tắt (lọc nhanh) → aria-pressed thay cho aria-current. */
  pressed?: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={pressed === undefined && selected ? 'page' : undefined}
      aria-pressed={pressed}
      className={cn(
        'inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-full border px-4 text-md font-medium whitespace-nowrap transition-colors',
        RING,
        selected ? 'border-primary bg-primary-light text-primary' : 'border-border bg-surface text-fg shadow-card hover:bg-surface-2',
      )}
    >
      {children}
    </Link>
  );
}

export function ListSearchForm({
  action,
  filters,
  sites,
  distanceOptions = [],
  searchPlaceholder,
}: {
  /** Đường dẫn đã có tiền tố ngôn ngữ cho form GET. */
  action: string;
  filters: ListFilterState;
  sites: Site[];
  /** Lựa chọn km của bộ lọc khoảng cách (rỗng = không hiện). */
  distanceOptions?: readonly number[];
  searchPlaceholder: string;
}) {
  const t = useTranslations();
  return (
    <form action={action} role="search" className="flex flex-col gap-2 lg:flex-row">
      {filters.category ? <input type="hidden" name="category" value={filters.category} /> : null}
      {filters.priceMax ? <input type="hidden" name="price_max" value={filters.priceMax} /> : null}
      {Object.entries(attributeQuery(filters.attributes)).map(([key, value]) => (
        <input key={key} type="hidden" name={key} value={value} />
      ))}
      <label className="relative block flex-1">
        <span className="sr-only">{searchPlaceholder}</span>
        <Search aria-hidden strokeWidth={1.75} className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted" />
        <Input
          name="q"
          type="search"
          defaultValue={filters.query}
          placeholder={searchPlaceholder}
          maxLength={100}
          className="rounded-full border-transparent pl-11 shadow-card focus-visible:ring-on-primary/60"
        />
      </label>
      <div className="flex flex-wrap gap-2">
        {distanceOptions.length > 0 ? (
          <FilterSelect
            name="distance"
            options={distanceOptions.map((km) => ({ value: String(km), label: t('listing.distance.within', { km }) }))}
            value={filters.distanceKm === null ? null : String(filters.distanceKm)}
            label={t('listing.distance.label')}
            anyLabel={t('listing.distance.any')}
            className="min-w-40 flex-1 lg:w-48 lg:flex-none"
          />
        ) : null}
        {sites.length > 0 ? (
          <SiteSelect
            sites={sites}
            value={filters.site}
            label={t('listing.list.site_filter')}
            anyLabel={t('listing.list.site_any')}
            className="min-w-40 flex-1 lg:w-56 lg:flex-none"
          />
        ) : null}
        <Button type="submit" size="lg" variant="outline" className="border-transparent font-semibold text-primary shadow-card">
          {t('listing.list.search_submit')}
        </Button>
      </div>
    </form>
  );
}

export function ListChips({
  path,
  feature,
  categories,
  filters,
}: {
  /** Đường dẫn trang (chưa có tiền tố ngôn ngữ) cho Link. */
  path: string;
  /** null = trang /tin, /tim-kiem (tất cả tính năng). */
  feature: ListingFeature | null;
  categories: readonly ListingCategory[];
  filters: ListFilterState;
}) {
  const t = useTranslations();
  const cfg = feature ? LISTING_FEATURE_CONFIGS[feature] : null;
  // Đổi chip danh mục giữ từ khoá / khu / khoảng cách / giá; sang trang tính năng khác (/tin) thì bỏ giá (mốc riêng tính năng).
  const keep = { query: filters.query, site: filters.site, distanceKm: filters.distanceKm };
  const quick = cfg?.quickFilters ?? [];
  const isQuick = (key: string) => quick.some((q) => !isPriceQuickFilter(q) && q.key === key);
  /** Chữ của một thuộc tính: enum → tên giá trị ("Ca đêm"), bool → tên thuộc tính ("Có gác") / "…: Không". */
  const attributeLabel = (key: string, value: string | boolean) =>
    typeof value === 'boolean'
      ? value
        ? t(`listing.attr.${key}`)
        : `${t(`listing.attr.${key}`)}: ${t('listing.attr_value.bool.no')}`
      : t(`listing.attr_value.${key}.${value}`);
  const categoryLabel = (c: ListingCategory) => {
    const key = cfg?.card?.categoryBadge?.[c]?.labelKey;
    return key ? t(key) : t(`common.category.${c}`);
  };
  // Thuộc tính đang lọc không có chip lọc nhanh (vd từ chip "Tìm nhanh" trang chủ) → viên có nút bỏ.
  const otherAttributes = Object.entries(filters.attributes).filter(([key]) => !isQuick(key));
  const filtered = activeFilterCount(filters) > 0;

  return (
    <div className="flex flex-col gap-2">
      <nav aria-label={feature ? t('web.listing.categories_label') : t('web.listing.features_label')} className="no-scrollbar -mx-4 overflow-x-auto px-4">
        <ul className="flex gap-2 py-1">
          {filtered ? (
            <li>
              <Link
                href={path}
                className={cn(
                  'inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border border-border bg-surface pr-3 pl-4 text-md font-medium whitespace-nowrap text-fg shadow-card transition-colors hover:bg-surface-2',
                  RING,
                )}
              >
                {t('listing.list.clear_filters')}
                <X aria-hidden strokeWidth={1.75} className="size-4" />
              </Link>
            </li>
          ) : null}
          <li>
            <Chip
              href={{ pathname: path, query: filterQuery({ ...keep, priceMax: filters.priceMax, attributes: attributesFor(filters.attributes, categories) }) }}
              selected={!filters.category}
            >
              {t('listing.list.filter_all')}
            </Chip>
          </li>
          {feature
            ? categories.map((c) => (
                <li key={c}>
                  <Chip
                    href={{
                      pathname: path,
                      query: filterQuery({ ...keep, priceMax: filters.priceMax, category: c, attributes: attributesFor(filters.attributes, [c]) }),
                    }}
                    selected={filters.category === c}
                  >
                    {categoryLabel(c)}
                  </Chip>
                </li>
              ))
            : LISTING_FEATURE_ORDER.map((f) => {
                const fc = LISTING_FEATURE_CONFIGS[f];
                return (
                  <li key={f}>
                    <Chip href={{ pathname: fc.path, query: filterQuery(keep) }} selected={false}>
                      <fc.Icon aria-hidden strokeWidth={1.75} className={cn('size-5', fc.tone.fg)} />
                      {t(`common.feature.${f}`)}
                    </Chip>
                  </li>
                );
              })}
        </ul>
      </nav>

      {quick.length > 0 && cfg ? (
        <nav aria-label={t('listing.list.quick_filters')} className="no-scrollbar -mx-4 overflow-x-auto px-4">
          <ul className="flex gap-2 py-1">
            {quick.map((q) => {
              if (isPriceQuickFilter(q)) {
                const on = filters.priceMax === q.priceMax;
                return (
                  <li key={`price_max:${q.priceMax}`}>
                    <Chip href={{ pathname: path, query: filterQuery({ ...filters, priceMax: on ? null : q.priceMax }) }} selected={on} pressed={on}>
                      <span aria-hidden className={cn('size-2 rounded-full bg-current', cfg.tone.fg)} />
                      {t(q.labelKey)}
                    </Chip>
                  </li>
                );
              }
              const on = filters.attributes[q.key] === q.value;
              const next: Record<string, string | boolean> = { ...filters.attributes };
              if (on) delete next[q.key];
              else next[q.key] = q.value;
              return (
                <li key={`${q.key}:${String(q.value)}`}>
                  <Chip
                    href={{ pathname: path, query: filterQuery({ ...filters, attributes: attributesFor(next, filters.category ? [filters.category] : categories) }) }}
                    selected={on}
                    pressed={on}
                  >
                    <span aria-hidden className={cn('size-2 rounded-full bg-current', cfg.tone.fg)} />
                    {attributeLabel(q.key, q.value)}
                  </Chip>
                </li>
              );
            })}
          </ul>
        </nav>
      ) : null}

      {filters.query || otherAttributes.length > 0 ? (
        <ul className="flex flex-wrap gap-2">
          {otherAttributes.map(([key, value]) => {
            const label = attributeLabel(key, value);
            const rest = Object.fromEntries(Object.entries(filters.attributes).filter(([k]) => k !== key));
            return (
              <li key={key}>
                <Link
                  href={{ pathname: path, query: filterQuery({ ...filters, attributes: rest }) }}
                  aria-label={t('web.listing.remove_filter', { label })}
                  className={cn(
                    'inline-flex min-h-11 items-center gap-1.5 rounded-full bg-primary-light pr-3 pl-4 text-md font-medium text-primary transition-colors hover:bg-primary-light/70',
                    RING,
                  )}
                >
                  {label}
                  <X aria-hidden strokeWidth={1.75} className="size-4" />
                </Link>
              </li>
            );
          })}
          {filters.query ? (
            <li>
              <Button asChild variant="ghost" size="sm">
                <Link href={{ pathname: path, query: filterQuery({ ...filters, query: '' }) }}>
                  <X strokeWidth={1.75} aria-hidden />
                  {t('listing.list.clear_search')}
                </Link>
              </Button>
            </li>
          ) : null}
        </ul>
      ) : null}
    </div>
  );
}
