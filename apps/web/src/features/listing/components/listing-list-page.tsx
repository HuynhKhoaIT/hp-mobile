// Trang danh sách dùng chung cho /tin (tất cả) và 4 tính năng Listing (/pass-do, /tro, /viec-lam, /that-lac).
// Khác biệt theo tính năng chỉ đến từ config.ts (scopeInfo). Style Stitch (khớp màn danh sách của app):
//   1 header xanh (HeaderDecor như trang chủ / "Tôi"; tràn mép + bo đáy trên điện thoại, khối bo xl từ 640px): ô icon dịch vụ,
//     H1 (theo khu khi lọc) + mô tả SEO của trang, nút Đăng tin; form tìm (ô nổi + khu + khoảng cách / giá / sắp xếp) bên trong.
//   2 chip danh mục / tính năng + chip lọc nhanh theo thông số (config.quickFilters) + "Xoá lọc" (ListChips).
//   3 khi chưa lọc: khối mời đăng tin (config.banner — đồ thất lạc "Báo nhặt được / Đăng tin tìm đồ", trọ "Bạn là chủ trọ?")
//     → mẹo an toàn riêng tính năng (config.tipKey) → tiêu đề có vạch cam ("Tin mới đăng" / "Kết quả cho …") → lưới.
// Tính năng có config.home (Pass đồ) và chưa lọc / sắp xếp → trang chủ mini (cùng thứ tự với app): header + ô tìm → lưới danh
// mục → banner → các dải (FeatureHome) → mẹo an toàn → "Tất cả tin {tính năng}" (chip lọc + lưới + Xem thêm). Có lọc → như trên.
// Render (Cache Components):
// - Fallback của <Suspense> = trang đầu KHÔNG lọc (dữ liệu cache 300s) → nằm trong static shell: HTML có tin thật ngay cả khi
//   tắt JS hoặc với bot chỉ đọc HTML (không phải skeleton).
// - Phần đọc searchParams (bộ lọc, H1 theo khu, kết quả lọc) chạy theo request trong <Suspense> và thay fallback khi xong.
//   Không lọc → nội dung giống hệt fallback. Có từ khoá → không cache + ghi từ khoá (log_search) sau khi trả trang (after()).
// - "Xem thêm" đọc trang tiếp ở trình duyệt với đúng bộ lọc + thứ tự (cursor mờ của searchListings).
import { Compass, Inbox, SearchX } from 'lucide-react';
import { getLocale, getTranslations } from 'next-intl/server';
import { after } from 'next/server';
import { Suspense } from 'react';
import { EmptyState } from '@/components/shared/empty-state';
import { HeaderDecor } from '@/components/shared/header-decor';
import { Button } from '@/components/ui/button';
import { getPathname, Link } from '@/i18n/navigation';
import { asLocale } from '../display';
import { filterQuery, isFiltered, type ListFilterState, NO_FILTERS, parseListFilters, searchFiltersOf } from '../filters';
import { getListPage, getPublicSites, LIST_PAGE_SIZE, logSearchTerm } from '../queries';
import { LISTING_FEATURE_CONFIGS } from '../features';
import { type ListScope, scopeInfo } from '../scope';
import { FeatureHome } from './feature-home';
import { ListChips, ListSearchForm } from './list-filters';
import { ListingBanner } from './listing-banner';
import { ListingGrid } from './listing-grid';
import { LoadMore } from './load-more';
import { PostListingButton } from './post-listing-button';
import { BarHeading, SafetyTip } from './safety-tip';

type RawParams = Record<string, string | string[] | undefined>;

export function ListingListPage({ scope, searchParams }: { scope: ListScope; searchParams: Promise<RawParams> }) {
  return (
    <section className="mx-auto flex w-full max-w-6xl flex-col gap-4 pb-6 sm:px-4 sm:pt-6">
      <Suspense fallback={<ListBody scope={scope} filters={NO_FILTERS} />}>
        <ListContent scope={scope} searchParams={searchParams} />
      </Suspense>
    </section>
  );
}

async function ListContent({ scope, searchParams }: { scope: ListScope; searchParams: Promise<RawParams> }) {
  const { categories, filterOptions } = scopeInfo(scope);
  const filters = parseListFilters(await searchParams, categories, filterOptions);
  return <ListBody scope={scope} filters={filters} />;
}

async function ListBody({ scope, filters }: { scope: ListScope; filters: ListFilterState }) {
  const { feature, path, categories, seoKey, cardLayout, distanceKm, filterOptions } = scopeInfo(scope);
  const locale = asLocale(await getLocale());
  const t = await getTranslations();
  // Khoảng cách / giá / cho tặng / thứ tự — giống hệt cho trang đầu và "Xem thêm" (cursor phải đi cùng bộ lọc).
  const extra = searchFiltersOf(filters, filterOptions);
  const listCategories = filters.category ? [filters.category] : categories;

  const [{ page, now }, sites] = await Promise.all([
    getListPage({ categories: listCategories, site: filters.site, query: filters.query, attributes: filters.attributes, ...extra }),
    getPublicSites(),
  ]);
  if (filters.query) {
    const results = page.items.length;
    after(() => logSearchTerm(filters.query, results, filters.category ?? undefined).catch(() => undefined));
  }
  const siteName = sites.find((s) => s.code === filters.site)?.name;
  const heading = siteName ? t(`web.listing.${seoKey}.heading_site`, { site: siteName }) : t(`web.listing.${seoKey}.title`);
  const featureName = feature ? t(`common.feature.${feature}`) : t('listing.list.title_all');
  const filtered = isFiltered(filters);

  const cfg = feature ? LISTING_FEATURE_CONFIGS[feature] : null;
  const HeroIcon = cfg?.Icon ?? Compass;
  // Trang chủ mini (config.home) chỉ khi chưa lọc / sắp xếp.
  const showHome = !!cfg?.home && !filtered;
  const latestTitle = filters.query
    ? t('web.listing.search_results', { query: filters.query })
    : showHome
      ? t('listing.feature_home.latest_title', { feature: featureName })
      : t('listing.hub.latest_title');
  const chips = <ListChips path={path} feature={feature} categories={categories} filters={filters} />;

  return (
    <>
      <div className="relative overflow-hidden rounded-b-xl bg-primary text-on-primary sm:rounded-xl">
        <HeaderDecor />
        <div className="relative flex flex-col gap-4 px-4 pt-4 pb-5 sm:p-6">
          <div className="flex items-start gap-3">
            <span
              aria-hidden
              className={cfg ? `flex size-10 shrink-0 items-center justify-center rounded-md ${cfg.tone.soft}` : 'flex size-10 shrink-0 items-center justify-center rounded-md bg-on-primary/15'}
            >
              <HeroIcon strokeWidth={1.75} className={cfg ? `size-6 ${cfg.tone.fg}` : 'size-6'} />
            </span>
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <h1 className="text-xl font-bold sm:text-2xl">{heading}</h1>
              <p className="line-clamp-2 text-sm text-on-primary/90 sm:text-md">{t(`web.listing.${seoKey}.description`)}</p>
            </div>
            <div className="hidden shrink-0 sm:block">
              <PostListingButton feature={feature} />
            </div>
          </div>
          <ListSearchForm
            action={getPathname({ href: path, locale })}
            filters={filters}
            sites={sites}
            distanceOptions={distanceKm}
            priceRanges={cfg?.priceRanges}
            sortable={cfg?.sortable}
            searchPlaceholder={t('listing.list.search_placeholder', { feature: featureName })}
          />
        </div>
      </div>

      <div className={showHome ? 'flex flex-col gap-6 px-4 sm:px-0' : 'flex flex-col gap-4 px-4 sm:px-0'}>
        {showHome && cfg ? <FeatureHome cfg={cfg} sites={sites} locale={locale} /> : chips}

        {cfg?.banner && !filtered ? <ListingBanner banner={cfg.banner} feature={cfg.feature} /> : null}

        {cfg?.tipKey && !filtered ? <SafetyTip title={t('listing.tip.title')} text={t(cfg.tipKey)} /> : null}

        <section aria-labelledby="list-latest" className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-3">
            <BarHeading id="list-latest">{latestTitle}</BarHeading>
            <div className="sm:hidden">
              <PostListingButton feature={feature} />
            </div>
          </div>

          {/* Trang chủ mini: chip lọc (danh mục, tình trạng, Cho tặng…) thuộc mục "Tất cả tin". */}
          {showHome ? chips : null}

          {page.items.length === 0 ? (
            filtered ? (
              <EmptyState
                icon={SearchX}
                title={t('listing.list.empty_search_title')}
                description={t('listing.list.empty_search_body')}
                action={
                  <Button asChild variant="outline">
                    <Link href={path}>{t('listing.list.clear_filters')}</Link>
                  </Button>
                }
              />
            ) : (
              <EmptyState
                icon={Inbox}
                title={t('listing.list.empty_title')}
                description={t('listing.list.empty_body')}
                action={<PostListingButton feature={feature} />}
              />
            )
          ) : (
            <div className="flex flex-col gap-3">
              <ListingGrid items={page.items} now={now} layout={cardLayout} prioritizeFirst={!showHome} />
              <LoadMore
                // Đổi bộ lọc / thứ tự (điều hướng mềm) → bỏ trang đã tải + cursor cũ (cursor theo giá khác cursor theo ngày).
                key={new URLSearchParams(filterQuery(filters)).toString()}
                categories={listCategories}
                query={filters.query}
                site={filters.site}
                attributes={filters.attributes}
                {...extra}
                pageSize={LIST_PAGE_SIZE}
                initialCursor={page.nextCursor}
                layout={cardLayout}
              />
            </div>
          )}
        </section>
      </div>
    </>
  );
}
