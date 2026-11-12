// Trang chủ mini-app (/pass-do — Stitch pass_home), Server Component, cùng dữ liệu / cache với danh sách thường
// (listing-list-page.tsx đọc trang đầu rồi giao cho đây khi config.miniApp):
// Chưa lọc:
//   header mini-app (MiniAppHomeHeader) → "Khu:" chip các khu (?site= — "Điểm nóng" của Stitch) → lưới danh mục 4 cột:
//   `homeCategoryCount` danh mục đầu (icon nền màu dịch vụ nhạt + tên ngắn, ?category=) + "Cho tặng" (?free=1) + "Tất cả mục"
//   (→ trang bộ lọc /pass-do/bo-loc — đủ 10 danh mục + loại đồ cụ thể) → banner `web_pass` (bảng banners; rỗng → khối "An tâm
//   trao tay": huy hiệu xác minh → /toi/huy-hieu) → chip nhanh (Tất cả · Gần {khu đầu} · chip lọc nhanh của config TRỪ "Cho
//   tặng" — đã có ô "Cho tặng" trong lưới danh mục ngay trên, không lặp) → "Tin mới đăng quanh bạn" + "Lọc thêm" (→ trang bộ
//   lọc, giữ tham số) → lưới 2 cột + Xem thêm → đoạn giới thiệu SEO (web.listing.<tính năng>.description — chữ thật, cuối
//   trang; H1 = tên mini-app + tiêu đề SEO dạng sr-only, xem mini-app-header.tsx).
// Danh sách rỗng → "Đăng tin" mở trang đăng của mini-app (paths.post), không rời mini-app.
// Đang lọc / tìm: cùng header → hàng chip danh mục + lọc nhanh + "Xoá lọc" (ListChips) → H1 kết quả ("Pass đồ gần {khu}" /
//   "Kết quả cho …") + "Lọc thêm (n)" → lưới. Có từ khoá → ghi "Tìm gần đây" ở trình duyệt.
// Dòng miễn trừ "không thuộc Tập đoàn Hòa Phát": footer / MobileDisclaimer của layout (app).
// Khác Stitch (cố ý): không "1.400+ tin mới", nhãn Hot / Mới trên ô danh mục, nhãn thẻ "Bán gấp / Thợ chính chủ / Mới 98%"
// (chưa có dữ liệu); "Gần tôi (< 3km)" → "Gần {khu đầu}" (web không đọc vị trí máy, lọc theo khu làm việc).
import type { Page, PublicListing, Site } from '@hp/core';
import type { ListingCategory, Locale } from '@hp/shared';
import { Gift, LayoutGrid, MapPin, ShieldCheck, SlidersHorizontal } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { Button } from '@/components/ui/button';
import { BannerCarousel } from '@/features/home/components/banner-carousel';
import { getBanners } from '@/features/home/queries';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import {
  activeFilterCount,
  filterQuery,
  isFiltered,
  isFreeQuickFilter,
  type ListFilterState,
  NO_FILTERS,
  type searchFiltersOf,
} from '../../filters';
import type { MiniAppConfig } from '../../mini-app';
import { FilterChip, ListChips, QuickFilterChips } from '../list-filters';
import { ListResults } from '../list-results';
import { BarHeading } from '../safety-tip';
import { MiniAppHomeHeader } from './mini-app-header';
import { RememberSearch } from './remember-search';

const TILE =
  'group flex h-full min-h-12 flex-col items-center gap-2 rounded-md px-0.5 py-1.5 outline-none transition duration-200 hover:bg-surface-2 focus-visible:ring-3 focus-visible:ring-ring/50 active:scale-97 motion-reduce:active:scale-100';
const TILE_ICON =
  'flex size-12 shrink-0 items-center justify-center rounded-md transition-transform duration-200 group-hover:-translate-y-0.5 motion-reduce:group-hover:translate-y-0';
const TILE_LABEL = 'flex min-h-9 items-start justify-center text-center text-xs leading-tight font-medium text-fg sm:text-sm';

export async function MiniAppList({
  cfg,
  filters,
  sites,
  locale,
  page,
  now,
  heading,
  listCategories,
  extra,
}: {
  cfg: MiniAppConfig;
  filters: ListFilterState;
  sites: Site[];
  locale: Locale;
  page: Page<PublicListing>;
  now: number;
  /** H1 SEO của danh sách (theo khu khi lọc khu). */
  heading: string;
  listCategories: readonly ListingCategory[];
  extra: ReturnType<typeof searchFiltersOf>;
}) {
  const t = await getTranslations();
  const filtered = isFiltered(filters);
  const { paths } = cfg.miniApp;
  const count = activeFilterCount(filters) + (filters.sort !== 'newest' ? 1 : 0);
  // Hàng chip trang chủ: bỏ "Cho tặng" (đã là ô trong lưới danh mục).
  const homeChipCfg = { ...cfg, quickFilters: (cfg.quickFilters ?? []).filter((q) => !isFreeQuickFilter(q)) };

  return (
    <>
      <MiniAppHomeHeader cfg={cfg} filters={filters} sites={sites} locale={locale} titleAs={filtered ? 'p' : 'h1'} />
      {filters.query ? <RememberSearch feature={cfg.feature} query={filters.query} /> : null}

      <div className="flex flex-col gap-5 px-4 sm:px-0">
        {filtered ? (
          <ListChips path={cfg.path} feature={cfg.feature} categories={cfg.categories} filters={filters} />
        ) : (
          <>
            {sites.length > 0 ? <SiteStrip cfg={cfg} sites={sites} /> : null}
            <CategoryTiles cfg={cfg} />
            <HomeBanner cfg={cfg} locale={locale} />
            <nav aria-label={t('listing.list.quick_filters')} className="no-scrollbar -mx-4 overflow-x-auto px-4">
              <ul className="flex gap-2 py-1">
                <li>
                  <FilterChip href={cfg.path} selected>
                    {t('listing.mini_app.home.chip_all')}
                  </FilterChip>
                </li>
                {sites[0] ? (
                  <li>
                    <FilterChip href={{ pathname: cfg.path, query: filterQuery({ site: sites[0].code }) }} selected={false}>
                      <MapPin aria-hidden strokeWidth={1.75} className={cn('size-4', cfg.tone.fg)} />
                      {t('listing.mini_app.home.chip_near', { site: sites[0].name })}
                    </FilterChip>
                  </li>
                ) : null}
                <QuickFilterChips path={cfg.path} cfg={homeChipCfg} categories={cfg.categories} filters={NO_FILTERS} />
              </ul>
            </nav>
          </>
        )}

        <section aria-labelledby="mini-latest" className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-3">
            <BarHeading as={filtered ? 'h1' : 'h2'} id="mini-latest" className={filtered ? 'text-xl' : undefined}>
              {filters.query
                ? t('web.listing.search_results', { query: filters.query })
                : filtered
                  ? heading
                  : t('listing.mini_app.home.latest_title')}
            </BarHeading>
            <Button asChild variant="ghost" size="sm" className="shrink-0 font-semibold text-primary">
              <Link href={{ pathname: paths.filter, query: filterQuery(filters) }}>
                {t('listing.mini_app.home.filter_more')}
                {count > 0 ? (
                  <>
                    <span aria-hidden className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-xs font-bold text-on-primary">
                      {count}
                    </span>
                    <span className="sr-only">{t('listing.mini_app.filter.active_count', { count })}</span>
                  </>
                ) : null}
                <SlidersHorizontal aria-hidden strokeWidth={1.75} />
              </Link>
            </Button>
          </div>
          <ListResults
            items={page.items}
            nextCursor={page.nextCursor}
            now={now}
            filters={filters}
            extra={extra}
            categories={listCategories}
            path={cfg.path}
            feature={cfg.feature}
            layout={cfg.cardLayout}
            prioritizeFirst={filtered}
            postHref={paths.post}
          />
        </section>

        {filtered ? null : <p className="text-sm text-muted">{t(`web.listing.${cfg.feature}.description`)}</p>}
      </div>
    </>
  );
}

/** "Khu:" + chip từng khu (link ?site=) — "Điểm nóng" của Stitch, cuộn ngang tràn mép. */
async function SiteStrip({ cfg, sites }: { cfg: MiniAppConfig; sites: Site[] }) {
  const t = await getTranslations();
  return (
    <nav aria-label={t('listing.list.site_filter')} className="no-scrollbar -mx-4 flex items-center gap-2 overflow-x-auto px-4">
      <span className="flex shrink-0 items-center gap-1.5 text-sm font-semibold text-fg">
        <MapPin aria-hidden strokeWidth={1.75} className="size-4 text-primary" />
        {t('listing.list.site_filter')}
      </span>
      <ul className="flex gap-2 py-1">
        {sites.map((s) => (
          <li key={s.code}>
            <Link
              href={{ pathname: cfg.path, query: filterQuery({ site: s.code }) }}
              className="inline-flex min-h-11 shrink-0 items-center rounded-full border border-border bg-surface px-4 text-sm font-medium whitespace-nowrap text-fg shadow-card outline-none transition-colors hover:bg-surface-2 focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              {s.name}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/**
 * Lưới danh mục 4 cột (8 cột từ 1024px): N danh mục đầu + "Cho tặng" + "Tất cả mục". Ô: khung icon 48 bo md nền màu dịch vụ
 * nhạt + icon 24 + nhãn ngắn 1–2 dòng. Link thật, chạy khi tắt JS.
 */
async function CategoryTiles({ cfg }: { cfg: MiniAppConfig }) {
  const t = await getTranslations();
  const headingId = `${cfg.feature}-mini-categories`;
  const shown = cfg.categories.slice(0, cfg.miniApp.homeCategoryCount);
  const freeLabel = t('listing.list.quick_free');
  const allLabel = t('listing.mini_app.home.all_categories');
  return (
    <nav aria-labelledby={headingId} className="flex flex-col gap-3 rounded-lg border border-border bg-surface px-3 py-4 shadow-card sm:p-4">
      <h2 id={headingId} className="flex items-center gap-2 px-1 text-md font-semibold text-fg sm:text-lg">
        <LayoutGrid aria-hidden strokeWidth={1.75} className={cn('size-5', cfg.tone.fg)} />
        {t('listing.mini_app.home.categories_title', { feature: t(`common.feature.${cfg.feature}`) })}
      </h2>
      <ul className="grid grid-cols-4 gap-x-1 gap-y-3 lg:grid-cols-8 lg:gap-x-2">
        {shown.map((c) => {
          const Icon = cfg.categoryIcons?.[c] ?? cfg.Icon;
          const label = t(`listing.category_short.${c}`);
          return (
            <li key={c}>
              <Link
                href={{ pathname: cfg.path, query: filterQuery({ category: c }) }}
                aria-label={t('listing.feature_home.category_a11y', { category: label })}
                className={TILE}
              >
                <span aria-hidden className={cn(TILE_ICON, cfg.tone.soft)}>
                  <Icon strokeWidth={1.75} className={cn('size-6', cfg.tone.fg)} />
                </span>
                <span aria-hidden className={TILE_LABEL}>
                  {label}
                </span>
              </Link>
            </li>
          );
        })}
        <li>
          <Link href={{ pathname: cfg.path, query: filterQuery({ freeOnly: true }) }} className={TILE}>
            <span aria-hidden className={cn(TILE_ICON, 'bg-success/15')}>
              <Gift strokeWidth={1.75} className="size-6 text-success" />
            </span>
            <span className={TILE_LABEL}>{freeLabel}</span>
          </Link>
        </li>
        <li>
          <Link href={cfg.miniApp.paths.filter} className={TILE}>
            <span aria-hidden className={cn(TILE_ICON, 'bg-surface-2')}>
              <LayoutGrid strokeWidth={1.75} className="size-6 text-muted" />
            </span>
            <span className={TILE_LABEL}>{allLabel}</span>
          </Link>
        </li>
      </ul>
    </nav>
  );
}

/** Banner `bannerPlacement` (cache 300s) — rỗng → khối "An tâm trao tay"; lỗi server → carousel tự tải lại ở trình duyệt. */
async function HomeBanner({ cfg, locale }: { cfg: MiniAppConfig; locale: Locale }) {
  const placement = cfg.miniApp.bannerPlacement;
  const banners = placement ? await getBanners(placement, locale) : [];
  if (placement && (banners === null || banners.length > 0)) return <BannerCarousel initial={banners} placement={placement} />;
  return <SafeBanner />;
}

/**
 * "An tâm trao tay" (Stitch): thẻ primary bo xl — nhãn viên thuốc + tiêu đề + mô tả + nút "Xác minh ngay" (→ /toi/huy-hieu,
 * khách được proxy chuyển đăng nhập), khiên lớn trang trí bên phải.
 */
async function SafeBanner() {
  const t = await getTranslations('listing.mini_app.home');
  return (
    <section aria-labelledby="mini-safe" className="relative overflow-hidden rounded-xl bg-primary p-4 text-on-primary shadow-card sm:p-6">
      <div className="relative flex items-center gap-4">
        <div className="flex min-w-0 flex-1 flex-col items-start gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-on-primary/15 px-3 py-1 text-xs font-bold tracking-wide uppercase">
            <ShieldCheck aria-hidden strokeWidth={2} className="size-4" />
            {t('safe_badge')}
          </span>
          <h2 id="mini-safe" className="text-xl leading-snug font-bold">
            {t('safe_title')}
          </h2>
          <p className="text-sm text-on-primary/90">{t('safe_body')}</p>
          <Button asChild variant="outline" size="sm" className="mt-1 border-transparent font-semibold text-primary">
            <Link href="/toi/huy-hieu">{t('safe_cta')}</Link>
          </Button>
        </div>
        <span aria-hidden className="flex size-20 shrink-0 items-center justify-center rounded-full bg-on-primary/15 sm:size-24">
          <ShieldCheck strokeWidth={1.75} className="size-10 text-on-primary sm:size-12" />
        </span>
      </div>
    </section>
  );
}
