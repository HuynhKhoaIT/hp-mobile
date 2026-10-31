// Bộ lọc danh sách — chạy được khi tắt JS: chip là link (?category=), ô tìm + khu là form GET.
// Trang một tính năng: chip theo category của tính năng. Trang /tin (tất cả): chip là 4 tính năng (link sang trang riêng).
// Lọc thuộc tính (chip "Tìm nhanh" của trang chủ, vd ?has_loft=1): giữ qua form tìm (input ẩn) và qua chip category
// khi còn hợp lệ với category đó; hiện thành viên thuốc có nút bỏ lọc để người dùng biết danh sách đang bị lọc.
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
import { attributeQuery, attributesFor, filterQuery, type ListFilterState } from '../filters';
import { SiteSelect } from './site-select';

type Props = {
  /** Đường dẫn trang (chưa có tiền tố ngôn ngữ) cho Link. */
  path: string;
  /** Đường dẫn đã có tiền tố ngôn ngữ cho form GET. */
  action: string;
  /** null = trang /tin (tất cả tính năng). */
  feature: ListingFeature | null;
  categories: readonly ListingCategory[];
  filters: ListFilterState;
  sites: Site[];
  searchPlaceholder: string;
};

function Chip({ href, selected, children }: { href: Parameters<typeof Link>[0]['href']; selected: boolean; children: ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={selected ? 'page' : undefined}
      className={cn(
        'inline-flex min-h-11 shrink-0 items-center justify-center rounded-full border px-4 text-md font-medium whitespace-nowrap transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
        selected ? 'border-primary bg-primary-light text-primary' : 'border-border bg-surface text-fg hover:bg-surface-2',
      )}
    >
      {children}
    </Link>
  );
}

export function ListFilters({ path, action, feature, categories, filters, sites, searchPlaceholder }: Props) {
  const t = useTranslations();
  const keep = { query: filters.query, site: filters.site };
  /** Chữ của một thuộc tính đang lọc: enum → tên giá trị ("Ca đêm"), bool → tên thuộc tính ("Có gác") / "…: Không". */
  const attributeLabel = (key: string, value: string | boolean) =>
    typeof value === 'boolean'
      ? value
        ? t(`listing.attr.${key}`)
        : `${t(`listing.attr.${key}`)}: ${t('listing.attr_value.bool.no')}`
      : t(`listing.attr_value.${key}.${value}`);
  const attributeEntries = Object.entries(filters.attributes);

  return (
    <div className="flex flex-col gap-3">
      <form action={action} role="search" className="flex flex-col gap-2 sm:flex-row">
        {filters.category ? <input type="hidden" name="category" value={filters.category} /> : null}
        {Object.entries(attributeQuery(filters.attributes)).map(([key, value]) => (
          <input key={key} type="hidden" name={key} value={value} />
        ))}
        <label className="relative block flex-1">
          <span className="sr-only">{searchPlaceholder}</span>
          <Search
            aria-hidden
            strokeWidth={1.75}
            className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-muted"
          />
          <Input name="q" type="search" defaultValue={filters.query} placeholder={searchPlaceholder} maxLength={100} className="pl-10" />
        </label>
        <div className="flex gap-2">
          {sites.length > 0 ? (
            <SiteSelect
              sites={sites}
              value={filters.site}
              label={t('listing.list.site_filter')}
              anyLabel={t('listing.list.site_any')}
              className="flex-1 sm:w-56 sm:flex-none"
            />
          ) : null}
          <Button type="submit" size="lg">
            {t('listing.list.search_submit')}
          </Button>
        </div>
      </form>

      {filters.query || attributeEntries.length > 0 ? (
        <ul className="flex flex-wrap gap-2">
          {attributeEntries.map(([key, value]) => {
            const label = attributeLabel(key, value);
            const rest = Object.fromEntries(attributeEntries.filter(([k]) => k !== key));
            return (
              <li key={key}>
                <Link
                  href={{ pathname: path, query: filterQuery({ ...filters, attributes: rest }) }}
                  aria-label={t('web.listing.remove_filter', { label })}
                  className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-primary-light pr-3 pl-4 text-md font-medium text-primary outline-none transition-colors hover:bg-primary-light/70 focus-visible:ring-3 focus-visible:ring-ring/50"
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

      <nav
        aria-label={feature ? t('web.listing.categories_label') : t('web.listing.features_label')}
        className="-mx-4 overflow-x-auto px-4"
      >
        <ul className="flex gap-2 pb-1">
          <li>
            <Chip
              href={{ pathname: path, query: filterQuery({ ...keep, attributes: attributesFor(filters.attributes, categories) }) }}
              selected={!filters.category}
            >
              {t('listing.list.filter_all')}
            </Chip>
          </li>
          {feature
            ? categories.map((c) => (
                <li key={c}>
                  <Chip
                    href={{ pathname: path, query: filterQuery({ ...keep, category: c, attributes: attributesFor(filters.attributes, [c]) }) }}
                    selected={filters.category === c}
                  >
                    {t(`common.category.${c}`)}
                  </Chip>
                </li>
              ))
            : LISTING_FEATURE_ORDER.map((f) => {
                const cfg = LISTING_FEATURE_CONFIGS[f];
                return (
                  <li key={f}>
                    <Chip href={{ pathname: cfg.path, query: filterQuery(keep) }} selected={false}>
                      <cfg.Icon aria-hidden strokeWidth={1.75} className={cn('mr-2 size-5', cfg.tone.fg)} />
                      {t(`common.feature.${f}`)}
                    </Chip>
                  </li>
                );
              })}
        </ul>
      </nav>
    </div>
  );
}
