// Trang chủ mini-app (/pass-do — Stitch pass_home, /tro — Stitch room_home), Server Component, cùng dữ liệu / cache với
// danh sách thường (listing-list-page.tsx đọc trang đầu rồi giao cho đây khi config.miniApp). Khung trang đã gắn
// data-app-theme (màu mini-app).
// Chưa lọc: header mini-app (MiniAppHomeHeader) → các khối `config.miniApp.home` theo thứ tự (feature-config.ts —
//   MiniAppHomeSection):
//   Chợ Pass: sites ("Khu:" chip các khu — "Điểm nóng") → categories (thẻ lưới 4 / 8 cột: `homeCategoryCount` danh mục đầu
//     + "Cho tặng" + "Tất cả mục" → trang bộ lọc) → banner (`web_pass`; rỗng → "An tâm trao tay" → /toi/huy-hieu) → chips
//     (Tất cả · Gần {khu đầu} · chip lọc nhanh của config TRỪ "Cho tặng" — đã có ô trong lưới) → latest ("Tin mới đăng quanh
//     bạn" + "Lọc thêm" + lưới 2 cột + Xem thêm).
//   Nhà Trọ: tiles (lưới 3 cột "Danh mục tìm kiếm": 4 loại phòng + "Phòng máy lạnh" ?has_ac=1 + "Gần cổng KKT" ?distance=2 —
//     tập giá trị hữu hạn nên trang đích còn cache được) → chips → trust ("Thuê trọ an tâm") → featured ("Phòng trọ giá tốt
//     ca kíp": thẻ lớn cho tin đầu — MiniAppFeatureCard — rồi các hàng gọn + Xem thêm dạng hàng) → promo ("Chủ trọ có phòng
//     trống?" → trang đăng của mini-app chọn sẵn room_rent).
//   Cuối trang: đoạn giới thiệu SEO (web.listing.<tính năng>.description — chữ thật; H1 = tên mini-app + tiêu đề SEO dạng
//   sr-only, xem mini-app-header.tsx).
// Danh sách rỗng → "Đăng tin" mở trang đăng của mini-app (paths.post), không rời mini-app.
// Đang lọc / tìm: cùng header → hàng chip danh mục + lọc nhanh + "Xoá lọc" (ListChips) → H1 kết quả ("Pass đồ gần {khu}" /
//   "Kết quả cho …") + "Lọc thêm (n)" → lưới theo config.cardLayout. Có từ khoá → ghi "Tìm gần đây" ở trình duyệt.
// Dòng miễn trừ "không thuộc Tập đoàn Hòa Phát": footer / MobileDisclaimer của layout (app).
// Khác Stitch (cố ý): không "1.400+ tin mới", "15.000+ phòng", nhãn Hot / Mới trên ô danh mục, nhãn thẻ "Bán gấp / Thợ chính
// chủ / Mới 98% / 100% xác thực / Đi bộ đi làm", hotline (chưa có dữ liệu); "Gần tôi (< 3km)" → "Gần {khu đầu}" (web không
// đọc vị trí máy, lọc theo khu làm việc); "Xem thêm" của khối featured → "Lọc thêm" (trang bộ lọc) như Chợ Pass.
import type { Page, PublicListing, Site } from '@hp/core';
import type { ListingCategory, Locale } from '@hp/shared';
import { Gift, LayoutGrid, MapPin, Megaphone, ShieldCheck, SlidersHorizontal } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { Button } from '@/components/ui/button';
import { BannerCarousel } from '@/features/home/components/banner-carousel';
import { getBanners } from '@/features/home/queries';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import type { MiniAppHomeSection } from '../../feature-config';
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
import { LIST_PAGE_SIZE } from '../../queries';
import { FilterChip, ListChips, QuickFilterChips } from '../list-filters';
import { ListResults } from '../list-results';
import { ListingGrid } from '../listing-grid';
import { LoadMore } from '../load-more';
import { BarHeading, SafetyTip } from '../safety-tip';
import { MiniAppFeatureCard } from './mini-app-feature-card';
import { MiniAppHomeHeader } from './mini-app-header';
import { RememberSearch } from './remember-search';

const TILE =
  'group flex h-full min-h-12 flex-col items-center gap-2 rounded-md px-0.5 py-1.5 outline-none transition duration-200 hover:bg-surface-2 focus-visible:ring-3 focus-visible:ring-ring/50 active:scale-97 motion-reduce:active:scale-100';
const TILE_ICON =
  'flex size-12 shrink-0 items-center justify-center rounded-md transition-transform duration-200 group-hover:-translate-y-0.5 motion-reduce:group-hover:translate-y-0';
const TILE_LABEL = 'flex min-h-9 items-start justify-center text-center text-xs leading-tight font-medium text-fg sm:text-sm';

type ListData = {
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
};

export async function MiniAppList(props: ListData) {
  const { cfg, filters, sites, locale } = props;
  const t = await getTranslations();
  const filtered = isFiltered(filters);

  return (
    <>
      <MiniAppHomeHeader cfg={cfg} filters={filters} sites={sites} locale={locale} titleAs={filtered ? 'p' : 'h1'} />
      {filters.query ? <RememberSearch feature={cfg.feature} query={filters.query} /> : null}

      <div className="flex flex-col gap-5 px-4 sm:px-0">
        {filtered ? (
          <>
            <ListChips path={cfg.path} feature={cfg.feature} categories={cfg.categories} filters={filters} />
            <ListSection {...props} kind="latest" />
          </>
        ) : (
          cfg.miniApp.home.map((section) => <HomeSection key={section} section={section} {...props} />)
        )}

        {filtered ? null : <p className="text-sm text-muted">{t(`web.listing.${cfg.feature}.description`)}</p>}
      </div>
    </>
  );
}

function HomeSection({ section, ...data }: ListData & { section: MiniAppHomeSection }) {
  const { cfg, sites, locale } = data;
  switch (section) {
    case 'sites':
      return sites.length > 0 ? <SiteStrip cfg={cfg} sites={sites} /> : null;
    case 'categories':
      return <CategoryTiles cfg={cfg} />;
    case 'tiles':
      return <SearchTiles cfg={cfg} />;
    case 'banner':
      return <HomeBanner cfg={cfg} locale={locale} />;
    case 'chips':
      return <HomeChips cfg={cfg} sites={sites} />;
    case 'trust':
      return <TrustNote cfg={cfg} />;
    case 'latest':
    case 'featured':
      return <ListSection {...data} kind={section} />;
    case 'promo':
      return <PromoBanner cfg={cfg} />;
  }
}

/**
 * Khối danh sách: tiêu đề ("Tin mới đăng quanh bạn" / tiêu đề `list` + dòng phụ / H1 kết quả khi lọc) + "Lọc thêm (n)" →
 * lưới theo config.cardLayout (`latest`) hoặc thẻ lớn + hàng gọn (`featured`).
 */
async function ListSection({ kind, ...data }: ListData & { kind: 'latest' | 'featured' }) {
  const { cfg, filters, heading } = data;
  const t = await getTranslations();
  const filtered = isFiltered(filters);
  const count = activeFilterCount(filters) + (filters.sort !== 'newest' ? 1 : 0);
  const list = kind === 'featured' ? cfg.miniApp.list : undefined;
  const title = filters.query
    ? t('web.listing.search_results', { query: filters.query })
    : filtered
      ? heading
      : list
        ? t(list.titleKey)
        : t('listing.mini_app.home.latest_title');

  return (
    <section aria-labelledby="mini-latest" className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <BarHeading as={filtered ? 'h1' : 'h2'} id="mini-latest" className={filtered ? 'text-xl' : undefined}>
            {title}
          </BarHeading>
          {list?.subtitleKey && !filtered ? <p className="pl-3.5 text-sm text-muted">{t(list.subtitleKey)}</p> : null}
        </div>
        <Button asChild variant="ghost" size="sm" className="shrink-0 font-semibold text-primary">
          <Link href={{ pathname: cfg.miniApp.paths.filter, query: filterQuery(filters) }}>
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
      {kind === 'featured' && !filtered ? <FeaturedResults {...data} /> : <Results {...data} layout={data.cfg.cardLayout} />}
    </section>
  );
}

function Results({ cfg, filters, page, now, listCategories, extra, layout }: ListData & { layout: 'grid' | 'row' }) {
  return (
    <ListResults
      items={page.items}
      nextCursor={page.nextCursor}
      now={now}
      filters={filters}
      extra={extra}
      categories={listCategories}
      path={cfg.path}
      feature={cfg.feature}
      layout={layout}
      prioritizeFirst={isFiltered(filters)}
      postHref={cfg.miniApp.paths.post}
    />
  );
}

/** Thẻ lớn cho tin đầu rồi các hàng gọn; "Xem thêm" đọc tiếp dạng hàng (cùng bộ lọc + cursor). Rỗng → như ListResults. */
function FeaturedResults(data: ListData) {
  const { cfg, filters, page, now, listCategories, extra } = data;
  const [first, ...rest] = page.items;
  if (!first) return <Results {...data} layout="row" />;
  return (
    <div className="flex flex-col gap-3">
      <MiniAppFeatureCard cfg={cfg} listing={first} />
      {rest.length > 0 ? <ListingGrid items={rest} now={now} layout="row" /> : null}
      <LoadMore
        key={new URLSearchParams(filterQuery(filters)).toString()}
        categories={listCategories}
        query={filters.query}
        site={filters.site}
        attributes={filters.attributes}
        {...extra}
        pageSize={LIST_PAGE_SIZE}
        initialCursor={page.nextCursor}
        layout="row"
      />
    </div>
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

/** Hàng chip: Tất cả · Gần {khu đầu} · chip lọc nhanh của config (bỏ "Cho tặng" khi lưới danh mục đã có ô Cho tặng). */
async function HomeChips({ cfg, sites }: { cfg: MiniAppConfig; sites: Site[] }) {
  const t = await getTranslations();
  const hasFreeTile = cfg.miniApp.home.includes('categories');
  const chipCfg = { ...cfg, quickFilters: (cfg.quickFilters ?? []).filter((q) => !(hasFreeTile && isFreeQuickFilter(q))) };
  return (
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
              <MapPin aria-hidden strokeWidth={1.75} className="size-4 text-primary" />
              {t('listing.mini_app.home.chip_near', { site: sites[0].name })}
            </FilterChip>
          </li>
        ) : null}
        <QuickFilterChips path={cfg.path} cfg={chipCfg} categories={cfg.categories} filters={NO_FILTERS} />
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
  const shown = cfg.categories.slice(0, cfg.miniApp.homeCategoryCount ?? cfg.categories.length);
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

/**
 * Lưới 3 cột (6 cột từ 1024px) "Danh mục tìm kiếm" (Stitch room_home): ô danh mục (icon config.categoryIcons nền màu dịch
 * vụ nhạt, tên ngắn + gợi ý listing.form.category_hint) và ô bộ lọc đặt sẵn (icon nền primary-light của mini-app). Link thật.
 */
async function SearchTiles({ cfg }: { cfg: MiniAppConfig }) {
  const tiles = cfg.miniApp.tiles;
  if (!tiles) return null;
  const t = await getTranslations();
  const headingId = `${cfg.feature}-mini-tiles`;
  return (
    <nav aria-labelledby={headingId} className="flex flex-col gap-3">
      <BarHeading id={headingId} tone="primary">
        {t(tiles.titleKey)}
      </BarHeading>
      <ul className="grid grid-cols-3 gap-2 sm:gap-3 lg:grid-cols-6">
        {tiles.items.map((tile) => {
          const isCategory = tile.kind === 'category';
          const Icon = isCategory ? (cfg.categoryIcons?.[tile.category] ?? cfg.Icon) : tile.Icon;
          const label = isCategory ? t(`listing.category_short.${tile.category}`) : t(tile.labelKey);
          const hintKey = isCategory ? `listing.form.category_hint.${tile.category}` : tile.hintKey;
          const href = isCategory
            ? { pathname: cfg.path, query: filterQuery({ category: tile.category }) }
            : { pathname: cfg.path, query: filterQuery(tile.filter) };
          return (
            <li key={isCategory ? tile.category : tile.key} className="flex">
              <Link
                href={href}
                className="group flex min-h-28 flex-1 flex-col items-center gap-1.5 rounded-lg border border-border bg-surface px-2 py-3 text-center shadow-card outline-none transition duration-150 hover:-translate-y-0.5 hover:border-primary/30 focus-visible:ring-3 focus-visible:ring-ring/50 motion-reduce:hover:translate-y-0"
              >
                <span
                  aria-hidden
                  className={cn(
                    'mb-0.5 flex size-12 shrink-0 items-center justify-center rounded-md',
                    isCategory ? cfg.tone.soft : 'bg-primary-light',
                  )}
                >
                  <Icon strokeWidth={1.75} className={cn('size-6', isCategory ? cfg.tone.fg : 'text-primary')} />
                </span>
                <span className="text-sm leading-tight font-semibold text-fg">{label}</span>
                {hintKey && t.has(hintKey) ? <span className="line-clamp-2 text-xs leading-snug text-muted">{t(hintKey)}</span> : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Thẻ nhắc an tâm (Stitch room_home "Thuê trọ an tâm") — cùng kiểu mẹo an toàn (nền warning nhạt). */
async function TrustNote({ cfg }: { cfg: MiniAppConfig }) {
  const trust = cfg.miniApp.trust;
  if (!trust) return null;
  const t = await getTranslations();
  return <SafetyTip title={t(trust.titleKey)} text={t(trust.bodyKey)} />;
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

/**
 * Khối mời đăng tin (Stitch room_home "Chủ trọ có phòng trống cần cho thuê?"): nền gradient mini-app, chữ trắng (on-accent —
 * gradient đậm ở cả sáng / tối), nút nền surface → trang đăng của mini-app chọn sẵn danh mục (khách → proxy /dang-nhap).
 */
async function PromoBanner({ cfg }: { cfg: MiniAppConfig }) {
  const promo = cfg.miniApp.promo;
  if (!promo) return null;
  const t = await getTranslations();
  const id = `${cfg.feature}-mini-promo`;
  return (
    <section
      aria-labelledby={id}
      className="relative overflow-hidden rounded-xl bg-linear-to-r from-app-from to-app-to p-5 text-on-accent shadow-card sm:p-6"
    >
      <div className="relative flex items-center gap-4">
        <div className="flex min-w-0 flex-1 flex-col items-start gap-2">
          <p className="text-xs font-bold tracking-wide text-on-accent/90 uppercase">{t(promo.eyebrowKey)}</p>
          <h2 id={id} className="text-xl leading-snug font-bold">
            {t(promo.titleKey)}
          </h2>
          <p className="text-sm text-on-accent/90 sm:text-md">{t(promo.bodyKey)}</p>
          <Button asChild variant="outline" className="mt-1 border-transparent font-semibold text-primary">
            <Link href={{ pathname: cfg.miniApp.paths.post, query: { category: promo.category } }}>{t(promo.ctaKey)}</Link>
          </Button>
        </div>
        <span aria-hidden className="hidden size-20 shrink-0 items-center justify-center rounded-full bg-on-accent/15 sm:flex sm:size-24">
          <Megaphone strokeWidth={1.75} className="size-10 sm:size-12" />
        </span>
      </div>
    </section>
  );
}
